// sesmesh — Solvent Excluded Surface meshes for molecules
// Copyright (c) 2026 Ugo Varetto
// SPDX-License-Identifier: MIT OR Apache-2.0

//! Error type shared by every fallible sesmesh operation.

use std::fmt;
use std::path::{Path, PathBuf};

use crate::io::Format;

/// Result alias using [`Error`].
pub type Result<T, E = Error> = std::result::Result<T, E>;

/// Errors returned by sesmesh.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum Error {
    /// Reading a file or stream failed.
    #[error("{}: {source}", display_path(path.as_deref()))]
    Io {
        /// File being read, if any.
        path: Option<PathBuf>,
        /// Underlying I/O error.
        #[source]
        source: std::io::Error,
    },

    /// The input could not be parsed.
    #[error("{}:{line}:{column}: invalid {format} input: {message}", display_path(path.as_deref()))]
    Parse {
        /// Format being parsed.
        format: Format,
        /// File being parsed, if any.
        path: Option<PathBuf>,
        /// 1-based line number.
        line: usize,
        /// 1-based column number (in bytes).
        column: usize,
        /// Description of the problem.
        message: String,
    },

    /// Processing input failed for a reason other than malformed content.
    #[error("{}:{line}:{column}: {format} processing failed: {source}", display_path(path.as_deref()))]
    InputProcessing {
        /// Input format.
        format: Format,
        /// Input path, when available.
        path: Option<PathBuf>,
        /// Source line associated with the operation.
        line: usize,
        /// Source column associated with the operation.
        column: usize,
        /// Original allocator or representation failure.
        #[source]
        source: Box<Error>,
    },

    /// The input format could not be determined or is not supported by this
    /// build (for example gzip input without the `gzip` feature).
    #[error("unsupported input: {0}")]
    Unsupported(String),

    /// An argument or input value is invalid.
    #[error("invalid input: {0}")]
    InvalidInput(String),

    /// An atom selection matched no atoms.
    #[error("no atoms selected: {0}")]
    EmptySelection(String),

    /// The computation was cancelled through its
    /// [`Control`](crate::Control).
    #[error("cancelled")]
    Cancelled,

    /// An internal invariant was violated (a bug in sesmesh; please report
    /// it with the input that triggers it).
    #[error("internal error: {0}")]
    Internal(String),

    /// An allocator refused a requested buffer (including address-space overflow).
    #[error("cannot allocate {what}: {source}")]
    Allocation {
        /// Buffer being allocated.
        what: &'static str,
        /// Actual allocator/capacity failure.
        #[source]
        source: std::collections::TryReserveError,
    },

    /// A size or index cannot be represented by the engine's storage type.
    #[error("{0} cannot be represented by this platform or mesh index type")]
    SizeOverflow(&'static str),
}

/// Allocate actual requested storage, without an estimated-memory policy.
pub(crate) fn capacity<T>(length: usize, what: &'static str) -> Result<Vec<T>> {
    let mut out = Vec::new();
    reserve(&mut out, length, what)?;
    Ok(out)
}

pub(crate) fn reserve<T>(out: &mut Vec<T>, additional: usize, what: &'static str) -> Result<()> {
    out.try_reserve(additional)
        .map_err(|source| Error::Allocation { what, source })
}

pub(crate) fn filled<T: Clone>(length: usize, value: T, what: &'static str) -> Result<Vec<T>> {
    let mut out = capacity(length, what)?;
    out.resize(length, value);
    Ok(out)
}

pub(crate) fn collect<T>(
    values: impl IntoIterator<Item = T>,
    what: &'static str,
) -> Result<Vec<T>> {
    let values = values.into_iter();
    let mut out = capacity(values.size_hint().0, what)?;
    for value in values {
        push(&mut out, value, what)?;
    }
    Ok(out)
}

pub(crate) fn push<T>(out: &mut Vec<T>, value: T, what: &'static str) -> Result<()> {
    if out.len() == out.capacity() {
        reserve(out, 1, what)?;
    }
    out.push(value);
    Ok(())
}

pub(crate) fn extend<T>(
    out: &mut Vec<T>,
    values: impl IntoIterator<Item = T>,
    what: &'static str,
) -> Result<()> {
    let values = values.into_iter();
    reserve(out, values.size_hint().0, what)?;
    for value in values {
        push(out, value, what)?;
    }
    Ok(())
}

fn display_path(path: Option<&Path>) -> String {
    path.map_or_else(|| "<input>".to_owned(), |p| p.display().to_string())
}

/// Parse failure produced by the format readers before the file path and
/// format are attached.
#[derive(Debug)]
pub(crate) struct ParseError {
    pub(crate) line: usize,
    pub(crate) column: usize,
    pub(crate) message: String,
    cause: Option<Error>,
}

impl ParseError {
    pub(crate) fn new(line: usize, column: usize, message: impl Into<String>) -> Self {
        Self {
            line,
            column,
            message: message.into(),
            cause: None,
        }
    }

    pub(crate) fn caused_by(line: usize, column: usize, error: Error) -> Self {
        Self {
            line,
            column,
            message: String::new(),
            cause: Some(error),
        }
    }

    pub(crate) fn into_error(self, format: Format, path: Option<PathBuf>) -> Error {
        if let Some(source) = self.cause {
            return Error::InputProcessing {
                format,
                path,
                line: self.line,
                column: self.column,
                source: Box::new(source),
            };
        }
        Error::Parse {
            format,
            path,
            line: self.line,
            column: self.column,
            message: self.message,
        }
    }
}

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match &self.cause {
            Some(cause) => write!(f, "{}:{}: {}", self.line, self.column, cause),
            None => write!(f, "{}:{}: {}", self.line, self.column, self.message),
        }
    }
}

#[cfg(test)]
mod allocation_tests {
    use super::*;

    #[test]
    fn impossible_capacity_returns_the_allocator_error() {
        let error = capacity::<u8>(usize::MAX, "test buffer").unwrap_err();
        assert!(matches!(
            error,
            Error::Allocation {
                what: "test buffer",
                ..
            }
        ));
        assert!(error.to_string().contains("cannot allocate test buffer"));
    }

    #[test]
    fn failed_growth_preserves_existing_buffer() {
        let mut values = vec![11u64, 13];
        let error = reserve(&mut values, usize::MAX, "test growth").unwrap_err();
        assert!(matches!(error, Error::Allocation { .. }));
        assert_eq!(values, [11, 13]);
    }

    #[test]
    fn parser_context_preserves_the_allocator_error() {
        let source = capacity::<u8>(usize::MAX, "diagnostic examples").unwrap_err();
        let error = ParseError::caused_by(12, 3, source).into_error(Format::Pdb, None);
        assert!(
            error
                .to_string()
                .contains("12:3: PDB processing failed: cannot allocate diagnostic examples")
        );
        match error {
            Error::InputProcessing { source, .. } => {
                assert!(matches!(*source, Error::Allocation { .. }))
            }
            other => panic!("unexpected error: {other}"),
        }
    }
}
