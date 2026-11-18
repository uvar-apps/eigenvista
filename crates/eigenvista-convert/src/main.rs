use eigenvista_import::{ImportReport, import_bytes};
use serde::Serialize;
use std::{
    collections::HashSet,
    ffi::OsString,
    fs::{self, File},
    io::{self, Read, Write},
    path::{Path, PathBuf},
    process::ExitCode,
};

const HELP: &str = "EigenVista file converter

Usage: eigenvista-convert [OPTIONS] INPUT...

Read supported Molden, XYZ, PDB, mmCIF/BinaryCIF, cube, or native documents and write .eigenvista.
Explicit .molekel destinations remain accepted for filename compatibility.
Molden is detected by its [Molden Format] header, including .molden.input files.
mmCIF .cif/.mcif/.pdbx inputs retain coordinates and declared pair connections.
BinaryCIF .bcif and gzip-wrapped .bcif.gz inputs use the same mmCIF policies.

  -o, --output FILE     Destination for one input (default: INPUT.eigenvista)
      --output-dir DIR Destination directory, required for multiple inputs
      --force          Replace existing outputs, never input files
      --check          Validate and report without writing any documents
      --json           Print a machine-readable result array to stdout
  -h, --help           Show this help
  -V, --version        Show the converter version
      --               Treat all remaining arguments as input filenames

Output directories must already exist. No external tools or calculation engines
are invoked. Output publication is atomic; existing outputs are protected unless
--force is supplied. Batch failures retain completed outputs and exit nonzero.
Exit codes: 0 success, 1 conversion/write failure, 2 invalid arguments/paths.
";

#[derive(Default)]
struct Options {
    inputs: Vec<PathBuf>,
    output: Option<PathBuf>,
    directory: Option<PathBuf>,
    force: bool,
    check: bool,
    json: bool,
}

enum Command {
    Help,
    Version,
    Convert(Options),
}

fn options(args: impl IntoIterator<Item = OsString>) -> Result<Command, String> {
    let mut args = args.into_iter();
    let mut options = Options::default();
    let mut positional = false;
    while let Some(arg) = args.next() {
        if positional {
            options
                .inputs
                .try_reserve(1)
                .map_err(|_| "Cannot allocate converter input list")?;
            options.inputs.push(arg.into());
            continue;
        }
        match arg.to_str() {
            Some("--") => positional = true,
            Some("-h" | "--help") => return Ok(Command::Help),
            Some("-V" | "--version") => return Ok(Command::Version),
            Some("--force") => options.force = true,
            Some("--check") => options.check = true,
            Some("--json") => options.json = true,
            Some("-o" | "--output") => {
                if options.output.is_some() {
                    return Err("--output may only be specified once".into());
                }
                options.output = Some(args.next().ok_or("--output needs a filename")?.into());
            }
            Some("--output-dir") => {
                if options.directory.is_some() {
                    return Err("--output-dir may only be specified once".into());
                }
                options.directory =
                    Some(args.next().ok_or("--output-dir needs a directory")?.into());
            }
            Some(s) if s.starts_with('-') => return Err(format!("Unknown option {s}; use --help")),
            _ => {
                options
                    .inputs
                    .try_reserve(1)
                    .map_err(|_| "Cannot allocate converter input list")?;
                options.inputs.push(arg.into());
            }
        }
    }
    if options.inputs.is_empty() {
        return Err("Choose at least one input file; use --help".into());
    }
    if options.output.is_some() && options.directory.is_some() {
        return Err("Choose --output or --output-dir, not both".into());
    }
    if options.check && (options.output.is_some() || options.directory.is_some() || options.force) {
        return Err("--check does not accept destination or --force options".into());
    }
    if !options.check && options.inputs.len() > 1 && options.directory.is_none() {
        return Err("Multiple input files require --output-dir".into());
    }
    Ok(Command::Convert(options))
}

fn output_name(input: &Path) -> Result<PathBuf, String> {
    let name = input.file_name().ok_or("Input must name a file")?;
    let mut path = PathBuf::from(name);
    if name
        .to_string_lossy()
        .to_ascii_lowercase()
        .ends_with(".molden.input")
    {
        path.set_extension("");
    }
    path.set_extension("eigenvista");
    Ok(path)
}

fn canonical_destination(path: &Path) -> Result<PathBuf, String> {
    let name = path.file_name().ok_or("Output must name a file")?;
    let parent = path
        .parent()
        .filter(|p| !p.as_os_str().is_empty())
        .unwrap_or(Path::new("."));
    let parent = fs::canonicalize(parent)
        .map_err(|e| format!("Output directory {}: {e}", parent.display()))?;
    if !parent.is_dir() {
        return Err("Output parent is not a directory".into());
    }
    let target = parent.join(name);
    if let Ok(metadata) = fs::symlink_metadata(&target) {
        if !metadata.is_file() || metadata.file_type().is_symlink() {
            return Err(format!(
                "Output must be a regular file, not a directory or symlink: {}",
                target.display()
            ));
        }
        return fs::canonicalize(target).map_err(|e| e.to_string());
    }
    Ok(target)
}

struct Destination {
    path: PathBuf,
    replace: bool,
}

fn destinations(options: &Options) -> Result<Vec<Option<Destination>>, String> {
    let mut inputs = HashSet::new();
    inputs
        .try_reserve(options.inputs.len())
        .map_err(|_| "Cannot allocate converter source identities")?;
    for input in &options.inputs {
        inputs.insert(fs::canonicalize(input).map_err(|e| format!("{}: {e}", input.display()))?);
    }
    let mut output = Vec::new();
    output
        .try_reserve_exact(options.inputs.len())
        .map_err(|_| "Cannot allocate converter destination list")?;
    if options.check {
        output.resize_with(options.inputs.len(), || None);
        return Ok(output);
    }
    let mut destinations = HashSet::new();
    #[cfg(unix)]
    let mut file_identities = HashSet::new();
    destinations
        .try_reserve(options.inputs.len())
        .map_err(|_| "Cannot allocate converter destination identities")?;
    #[cfg(unix)]
    file_identities
        .try_reserve(options.inputs.len())
        .map_err(|_| "Cannot allocate converter file identities")?;
    for input in &options.inputs {
        let destination = match (&options.output, &options.directory) {
            (Some(output), _) => output.clone(),
            (_, Some(directory)) => directory.join(output_name(input)?),
            _ => input.with_file_name(output_name(input)?),
        };
        if !destination.extension().is_some_and(|ext| {
            ext.eq_ignore_ascii_case("eigenvista") || ext.eq_ignore_ascii_case("molekel")
        }) {
            return Err("Output filenames must end in .eigenvista or .molekel".into());
        }
        let destination = canonical_destination(&destination)?;
        if inputs.contains(&destination) {
            return Err(format!(
                "Refusing to replace an input file: {}",
                destination.display()
            ));
        }
        // Case-insensitive aliases must also collide on the macOS target.
        let key = if cfg!(target_os = "macos") || cfg!(target_os = "windows") {
            destination.to_string_lossy().to_lowercase()
        } else {
            destination.to_string_lossy().into_owned()
        };
        if !destinations.insert(key) {
            return Err(format!(
                "Inputs map to the same output: {}",
                destination.display()
            ));
        }
        let exists = destination.exists();
        #[cfg(unix)]
        if exists {
            use std::os::unix::fs::MetadataExt;
            let metadata = fs::metadata(&destination).map_err(|e| e.to_string())?;
            if !file_identities.insert((metadata.dev(), metadata.ino())) {
                return Err(format!(
                    "Inputs map to the same existing output: {}",
                    destination.display()
                ));
            }
        }
        if exists && !options.force {
            return Err(format!(
                "Output already exists: {}; use --force to replace it",
                destination.display()
            ));
        }
        // Even --force must not clobber another batch result or a newly created file.
        output.push(Some(Destination {
            path: destination,
            replace: exists && options.force,
        }));
    }
    Ok(output)
}

fn read_source(input: &Path) -> Result<Vec<u8>, String> {
    let metadata = fs::metadata(input).map_err(|e| e.to_string())?;
    if !metadata.is_file() {
        return Err("Input must be a regular file".into());
    }
    let mut file = File::open(input).map_err(|e| e.to_string())?;
    if !file.metadata().map_err(|e| e.to_string())?.is_file() {
        return Err("Input must be a regular file".into());
    }
    let mut bytes = Vec::new();
    let mut chunk = [0; 8192];
    loop {
        let count = file.read(&mut chunk).map_err(|e| e.to_string())?;
        if count == 0 {
            return Ok(bytes);
        }
        bytes
            .try_reserve(count)
            .map_err(|e| format!("Cannot allocate converter input: {e}"))?;
        bytes.extend_from_slice(&chunk[..count]);
    }
}

#[derive(Serialize)]
struct Outcome {
    input: String,
    output: Option<String>,
    status: &'static str,
    report: Option<ImportReport>,
    atoms: usize,
    orbitals: usize,
    densities: usize,
    error: Option<String>,
}

fn convert(options: Options) -> Result<u8, String> {
    let destinations = destinations(&options)?;
    let mut outcomes = Vec::new();
    outcomes
        .try_reserve_exact(options.inputs.len())
        .map_err(|_| "Cannot allocate conversion results")?;
    for (input, destination) in options.inputs.iter().zip(destinations) {
        let mut outcome = Outcome {
            input: input.to_string_lossy().into_owned(),
            output: destination
                .as_ref()
                .map(|d| d.path.to_string_lossy().into_owned()),
            status: "failed",
            report: None,
            atoms: 0,
            orbitals: 0,
            densities: 0,
            error: None,
        };
        let result = (|| {
            let bytes = read_source(input)?;
            let name = input.file_name().unwrap_or_default().to_string_lossy();
            let imported = import_bytes(&bytes, &name)?;
            outcome.atoms = imported.document.atoms.len();
            outcome.orbitals = imported.document.orbitals.len();
            outcome.densities = imported.document.densities.len();
            outcome.report = Some(imported.report);
            if let Some(destination) = destination {
                let encoded = eigenvista_format::encode(&imported.document)?;
                if destination.replace {
                    eigenvista_format::native::save_atomic(&destination.path, &encoded)?;
                } else {
                    eigenvista_format::native::save_atomic_new(&destination.path, &encoded)?;
                }
            }
            Ok::<_, String>(())
        })();
        match result {
            Ok(()) => {
                outcome.status = if options.check {
                    "validated"
                } else {
                    "converted"
                }
            }
            Err(error) => outcome.error = Some(error),
        }
        if !options.json {
            if let Some(error) = &outcome.error {
                eprintln!("{}: {error}", outcome.input);
            } else {
                eprintln!(
                    "{}: {} ({} atoms, {} orbitals, {} density matrices){}",
                    outcome.input,
                    outcome.status,
                    outcome.atoms,
                    outcome.orbitals,
                    outcome.densities,
                    outcome
                        .output
                        .as_ref()
                        .map(|p| format!(" -> {p}"))
                        .unwrap_or_default()
                );
                for warning in &outcome.report.as_ref().unwrap().warnings {
                    eprintln!("  Warning: {warning}");
                }
            }
        }
        outcomes.push(outcome);
    }
    if options.json {
        let mut stdout = io::stdout().lock();
        serde_json::to_writer_pretty(&mut stdout, &outcomes).map_err(|e| e.to_string())?;
        writeln!(stdout).map_err(|e| e.to_string())?;
    }
    Ok(u8::from(outcomes.iter().any(|o| o.status == "failed")))
}

fn main() -> ExitCode {
    let result = match options(std::env::args_os().skip(1)) {
        Ok(Command::Help) => {
            print!("{HELP}");
            Ok(0)
        }
        Ok(Command::Version) => {
            println!("eigenvista-convert {}", env!("CARGO_PKG_VERSION"));
            Ok(0)
        }
        Ok(Command::Convert(options)) => convert(options),
        Err(error) => Err(error),
    };
    match result {
        Ok(code) => ExitCode::from(code),
        Err(error) => {
            eprintln!("eigenvista-convert: {error}");
            ExitCode::from(2)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn source_reader_accepts_more_than_the_former_128_mib_limit() {
        let directory = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../tmp");
        fs::create_dir_all(&directory).unwrap();
        let path = directory.join(format!("converter-large-source-{}.xyz", std::process::id()));
        let file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&path)
            .unwrap();
        file.set_len(128 * 1024 * 1024 + 1).unwrap();
        let bytes = read_source(&path).unwrap();
        assert_eq!(bytes.len(), 128 * 1024 * 1024 + 1);
        fs::remove_file(path).unwrap();
    }
}
