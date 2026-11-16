use crate::RpcError;
use serde::Serialize;

pub const MAX_FILE_BYTES: usize = 128 * 1024 * 1024;
pub const MAX_PNG_DATA_URL_BYTES: usize = 16 * 1024 * 1024;

#[derive(Clone, Debug, Serialize)]
pub struct FileReceipt {
    pub path: String,
    pub bytes: usize,
}

#[cfg(unix)]
pub use unix::ScopedFiles;

#[cfg(not(unix))]
pub struct ScopedFiles;
#[cfg(not(unix))]
impl ScopedFiles {
    pub fn new(_: &[std::path::PathBuf]) -> Result<Self, RpcError> {
        Err(RpcError::new(
            -32010,
            "unsupported",
            "Scoped control files are currently qualified on Unix only",
        ))
    }
    pub fn read(&self, _: &std::path::Path) -> Result<Vec<u8>, RpcError> {
        unreachable!()
    }
    pub fn read_with_limit(&self, _: &std::path::Path, _: usize) -> Result<Vec<u8>, RpcError> {
        unreachable!()
    }
    pub fn save_document(
        &self,
        _: &std::path::Path,
        _: &[u8],
        _: &[String],
        _: bool,
    ) -> Result<FileReceipt, RpcError> {
        unreachable!()
    }
    pub fn write_image(
        &self,
        _: &std::path::Path,
        _: &str,
        _: bool,
    ) -> Result<FileReceipt, RpcError> {
        unreachable!()
    }
}

#[cfg(unix)]
mod unix {
    use super::*;
    use base64::Engine;
    use std::{
        collections::HashSet,
        ffi::{CString, OsStr},
        fs::File,
        io::{Read, Write},
        os::{
            fd::{AsRawFd, FromRawFd},
            unix::{
                ffi::OsStrExt,
                fs::{MetadataExt, OpenOptionsExt},
            },
        },
        path::{Component, Path, PathBuf},
        sync::Mutex,
    };

    struct Root {
        path: PathBuf,
        directory: File,
    }
    #[derive(Default)]
    struct Protected {
        paths: HashSet<PathBuf>,
        identities: HashSet<(u64, u64)>,
    }
    impl Protected {
        fn insert(&mut self, path: PathBuf, identity: Option<(u64, u64)>) -> Result<(), RpcError> {
            if (self.paths.len() >= 4096 && !self.paths.contains(&path))
                || identity.is_some_and(|id| {
                    self.identities.len() >= 4096 && !self.identities.contains(&id)
                })
            {
                return Err(RpcError::new(
                    -32005,
                    "limit_exceeded",
                    "Control source history reached its 4096-file limit; restart control mode",
                ));
            }
            self.paths.insert(path);
            if let Some(id) = identity {
                self.identities.insert(id);
            }
            Ok(())
        }
    }
    pub struct ScopedFiles {
        roots: Vec<Root>,
        protected: Mutex<Protected>,
    }
    struct Parent {
        directory: File,
        name: CString,
        path: PathBuf,
    }

    fn denied(message: &str) -> RpcError {
        RpcError::new(-32007, "scope_denied", message)
    }
    fn invalid(message: &str) -> RpcError {
        RpcError::new(-32602, "invalid_params", message)
    }
    fn path_name(name: &OsStr) -> Result<CString, RpcError> {
        CString::new(name.as_bytes()).map_err(|_| invalid("Paths cannot contain NUL bytes"))
    }
    fn absolute(path: &Path) -> Result<(), RpcError> {
        if !path.is_absolute()
            || path.as_os_str().len() > 4096
            || path.components().any(|c| matches!(c, Component::ParentDir))
        {
            return Err(invalid(
                "Use an absolute path without parent traversal, at most 4096 bytes",
            ));
        }
        Ok(())
    }
    fn open_at(parent: &File, name: &CString, flags: i32) -> Result<File, RpcError> {
        // SAFETY: the directory descriptor is live and the NUL-terminated name is valid.
        let fd = unsafe {
            libc::openat(
                parent.as_raw_fd(),
                name.as_ptr(),
                flags | libc::O_CLOEXEC | libc::O_NOFOLLOW,
                0o600,
            )
        };
        if fd < 0 {
            return Err(denied(
                "Path is unavailable, not a regular file/directory, or contains a symlink",
            ));
        }
        // SAFETY: openat returned a new owned descriptor, transferred exactly once.
        Ok(unsafe { File::from_raw_fd(fd) })
    }

    impl ScopedFiles {
        pub fn new(paths: &[PathBuf]) -> Result<Self, RpcError> {
            if paths.is_empty() || paths.len() > 16 {
                return Err(invalid(
                    "Control mode needs between one and sixteen explicit roots",
                ));
            }
            let mut roots = Vec::new();
            for path in paths {
                let path = path.canonicalize().map_err(RpcError::io)?;
                if roots.iter().any(|root: &Root| root.path == path) {
                    continue;
                }
                let directory = std::fs::OpenOptions::new()
                    .read(true)
                    .custom_flags(libc::O_DIRECTORY | libc::O_NOFOLLOW | libc::O_CLOEXEC)
                    .open(&path)
                    .map_err(RpcError::io)?;
                roots.push(Root { path, directory });
            }
            roots.sort_by_key(|root| std::cmp::Reverse(root.path.components().count()));
            Ok(Self {
                roots,
                protected: Mutex::new(Protected::default()),
            })
        }
        fn parent(&self, path: &Path) -> Result<Parent, RpcError> {
            absolute(path)?;
            let root = self
                .roots
                .iter()
                .find(|root| path.starts_with(&root.path))
                .ok_or_else(|| denied("Path is outside the configured control roots"))?;
            let relative = path.strip_prefix(&root.path).map_err(RpcError::io)?;
            let parts: Vec<_> = relative.components().collect();
            if parts.is_empty() || parts.iter().any(|c| !matches!(c, Component::Normal(_))) {
                return Err(invalid(
                    "A regular filename within a control root is required",
                ));
            }
            let mut directory = root.directory.try_clone().map_err(RpcError::io)?;
            for part in &parts[..parts.len() - 1] {
                directory = open_at(
                    &directory,
                    &path_name(part.as_os_str())?,
                    libc::O_RDONLY | libc::O_DIRECTORY,
                )?;
            }
            Ok(Parent {
                directory,
                name: path_name(parts.last().unwrap().as_os_str())?,
                path: path.to_owned(),
            })
        }
        pub fn read(&self, path: &Path) -> Result<Vec<u8>, RpcError> {
            self.read_with_limit(path, MAX_FILE_BYTES)
        }
        /// Read an authorized regular source with a caller-specific allocation bound.
        pub fn read_with_limit(&self, path: &Path, max_bytes: usize) -> Result<Vec<u8>, RpcError> {
            if max_bytes == 0 || max_bytes > MAX_FILE_BYTES {
                return Err(invalid(
                    "Read limit must be within the 128 MiB import bound",
                ));
            }
            let parent = self.parent(path)?;
            // Nonblocking open is essential before fstat: a FIFO must not hold a
            // native task forever while waiting for a writer. Regular files
            // retain ordinary read behavior with O_NONBLOCK.
            let mut file = open_at(
                &parent.directory,
                &parent.name,
                libc::O_RDONLY | libc::O_NONBLOCK,
            )?;
            let metadata = file.metadata().map_err(RpcError::io)?;
            if !metadata.is_file() {
                return Err(denied("Only regular molecular files can be read"));
            }
            if metadata.len() > max_bytes as u64 {
                return Err(RpcError::new(
                    -32005,
                    "limit_exceeded",
                    "Source file exceeds the requested read limit",
                ));
            }
            let mut bytes = Vec::new();
            bytes.try_reserve(metadata.len() as usize).map_err(|_| {
                RpcError::new(
                    -32005,
                    "limit_exceeded",
                    "Could not allocate the import buffer",
                )
            })?;
            std::io::Read::by_ref(&mut file)
                .take((max_bytes + 1) as u64)
                .read_to_end(&mut bytes)
                .map_err(RpcError::io)?;
            if bytes.is_empty() || bytes.len() > max_bytes {
                return Err(RpcError::new(
                    -32005,
                    "limit_exceeded",
                    "Empty or oversized molecular file",
                ));
            }
            let mut protected = self
                .protected
                .lock()
                .map_err(|_| RpcError::io("Source protection state unavailable"))?;
            protected.insert(parent.path, Some((metadata.dev(), metadata.ino())))?;
            Ok(bytes)
        }
        fn protect_hints(&self, paths: &[String]) -> Result<(), RpcError> {
            if paths.len() > 256 {
                return Err(invalid("Too many protected source paths"));
            }
            let mut protected = self
                .protected
                .lock()
                .map_err(|_| RpcError::io("Source protection state unavailable"))?;
            for value in paths {
                let path = Path::new(value);
                absolute(path)?;
                let canonical = path.canonicalize().unwrap_or_else(|_| path.to_owned());
                let identity = path
                    .metadata()
                    .ok()
                    .map(|metadata| (metadata.dev(), metadata.ino()));
                protected.insert(canonical, identity)?;
            }
            Ok(())
        }
        fn write_new(&self, path: &Path, bytes: &[u8]) -> Result<FileReceipt, RpcError> {
            let parent = self.parent(path)?;
            {
                let protected = self
                    .protected
                    .lock()
                    .map_err(|_| RpcError::io("Source protection state unavailable"))?;
                if protected.paths.contains(&parent.path) {
                    return Err(RpcError::new(
                        -32008,
                        "source_protected",
                        "The imported source cannot be replaced",
                    ));
                }
                // Opening through the pinned parent prevents a leaf/ancestor symlink escape.
                if let Ok(existing) = open_at(
                    &parent.directory,
                    &parent.name,
                    libc::O_RDONLY | libc::O_NONBLOCK,
                ) {
                    let metadata = existing.metadata().map_err(RpcError::io)?;
                    if !metadata.is_file() {
                        return Err(denied("Only regular files are valid export destinations"));
                    }
                    if protected
                        .identities
                        .contains(&(metadata.dev(), metadata.ino()))
                    {
                        return Err(RpcError::new(
                            -32008,
                            "source_protected",
                            "The destination aliases a protected source",
                        ));
                    }
                    return Err(RpcError::new(
                        -32009,
                        "destination_exists",
                        "The destination already exists",
                    ));
                }
            }
            let temporary = CString::new(format!(
                ".eigenvista-control-save-{}",
                crate::random_hex(16)?
            ))
            .unwrap();
            let mut file = open_at(
                &parent.directory,
                &temporary,
                libc::O_WRONLY | libc::O_CREAT | libc::O_EXCL,
            )?;
            let result = (|| {
                file.write_all(bytes).map_err(RpcError::io)?;
                file.sync_all().map_err(RpcError::io)?;
                drop(file);
                // SAFETY: both names and the pinned directory descriptor remain live.
                let linked = unsafe {
                    libc::linkat(
                        parent.directory.as_raw_fd(),
                        temporary.as_ptr(),
                        parent.directory.as_raw_fd(),
                        parent.name.as_ptr(),
                        0,
                    )
                };
                if linked != 0 {
                    let error = std::io::Error::last_os_error();
                    return Err(if error.raw_os_error() == Some(libc::EEXIST) {
                        RpcError::new(
                            -32009,
                            "destination_exists",
                            "The destination already exists",
                        )
                    } else {
                        RpcError::io("Atomic no-clobber publication failed")
                    });
                }
                Ok(FileReceipt {
                    path: parent.path.to_string_lossy().into_owned(),
                    bytes: bytes.len(),
                })
            })();
            // SAFETY: remove only this operation's newly created temporary name, relative to its owned parent.
            unsafe { libc::unlinkat(parent.directory.as_raw_fd(), temporary.as_ptr(), 0) };
            result
        }
        pub fn save_document(
            &self,
            path: &Path,
            bytes: &[u8],
            protected_paths: &[String],
            overwrite: bool,
        ) -> Result<FileReceipt, RpcError> {
            if overwrite {
                return Err(invalid(
                    "Control saves are no-clobber; choose a new filename",
                ));
            }
            if !path.extension().is_some_and(|e| {
                e.eq_ignore_ascii_case("eigenvista") || e.eq_ignore_ascii_case("molekel")
            }) {
                return Err(invalid("Save requires a .eigenvista filename"));
            }
            if bytes.is_empty() || bytes.len() > MAX_FILE_BYTES {
                return Err(RpcError::new(
                    -32005,
                    "limit_exceeded",
                    "Encoded document exceeds 128 MiB",
                ));
            }
            eigenvista_format::decode(bytes)
                .map_err(|message| RpcError::new(-32602, "validation_error", message))?;
            self.protect_hints(protected_paths)?;
            self.write_new(path, bytes)
        }
        pub fn write_image(
            &self,
            path: &Path,
            data_url: &str,
            overwrite: bool,
        ) -> Result<FileReceipt, RpcError> {
            if overwrite {
                return Err(invalid(
                    "Control image exports are no-clobber; choose a new filename",
                ));
            }
            if !path
                .extension()
                .is_some_and(|e| e.eq_ignore_ascii_case("png"))
            {
                return Err(invalid("Image export requires a .png filename"));
            }
            if data_url.len() > MAX_PNG_DATA_URL_BYTES {
                return Err(RpcError::new(
                    -32005,
                    "limit_exceeded",
                    "PNG data URL exceeds 16 MiB",
                ));
            }
            let encoded = data_url
                .strip_prefix("data:image/png;base64,")
                .ok_or_else(|| invalid("Expected a PNG data URL"))?;
            let bytes = base64::engine::general_purpose::STANDARD
                .decode(encoded)
                .map_err(|_| invalid("Invalid PNG base64"))?;
            validate_png(&bytes)?;
            self.write_new(path, &bytes)
        }
    }

    fn validate_png(bytes: &[u8]) -> Result<(), RpcError> {
        if !bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
            return Err(invalid("Invalid PNG signature"));
        }
        let mut offset = 8;
        let mut ihdr = false;
        let mut data = false;
        while offset < bytes.len() {
            let header = bytes
                .get(offset..offset + 8)
                .ok_or_else(|| invalid("Truncated PNG chunk"))?;
            let length = u32::from_be_bytes(header[..4].try_into().unwrap()) as usize;
            let end = offset
                .checked_add(12)
                .and_then(|x| x.checked_add(length))
                .filter(|x| *x <= bytes.len())
                .ok_or_else(|| invalid("Truncated PNG data"))?;
            let kind = &header[4..8];
            let payload = &bytes[offset + 8..end - 4];
            if crc32fast::hash(&bytes[offset + 4..end - 4])
                != u32::from_be_bytes(bytes[end - 4..end].try_into().unwrap())
            {
                return Err(invalid("Invalid PNG checksum"));
            }
            if !ihdr {
                if kind != b"IHDR" || length != 13 {
                    return Err(invalid("Missing PNG header"));
                }
                let width = u32::from_be_bytes(payload[..4].try_into().unwrap());
                let height = u32::from_be_bytes(payload[4..8].try_into().unwrap());
                if width == 0
                    || height == 0
                    || width > 16384
                    || height > 16384
                    || u64::from(width) * u64::from(height) > 64 * 1024 * 1024
                {
                    return Err(RpcError::new(
                        -32005,
                        "limit_exceeded",
                        "PNG dimensions exceed the export bound",
                    ));
                }
                ihdr = true;
            } else if kind == b"IHDR" {
                return Err(invalid("Repeated PNG header"));
            }
            if kind == b"IDAT" && length > 0 {
                data = true;
            }
            if kind == b"IEND" {
                return if length == 0 && end == bytes.len() && data {
                    Ok(())
                } else {
                    Err(invalid("Incomplete PNG or trailing data"))
                };
            }
            offset = end;
        }
        Err(invalid("PNG is missing its end marker"))
    }
}
