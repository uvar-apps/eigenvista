// sesmesh — Solvent Excluded Surface meshes for molecules
// Copyright (c) 2026 Ugo Varetto
// SPDX-License-Identifier: MIT OR Apache-2.0

//! Non-fatal diagnostics (warnings) collected while reading and processing
//! structures.
//!
//! The library never prints (Spec FR-DIAG-1): warnings are aggregated here and
//! returned to the caller, which decides how to report them.

use crate::error::{self, Error, Result};
use std::fmt;

/// Category of a [`Warning`].
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
#[non_exhaustive]
pub enum WarningKind {
    /// A non-essential field could not be parsed; a default value was used.
    InvalidField,
    /// The element was missing and was inferred from the atom name.
    InferredElement,
    /// The element could not be determined.
    UnknownElement,
    /// Alternate conformations were discarded by the alt-loc policy.
    AltLocResolved,
    /// No radius was found for an atom; the fallback radius was used.
    UnknownRadius,
    /// The chosen radius set does not cover some atoms well (for example
    /// explicit hydrogens with united-atom ProtOr radii).
    RadiusSetMismatch,
}

/// An aggregated warning: one entry per distinct `(kind, message)`, with an
/// occurrence count and every example.
#[derive(Debug, Clone, PartialEq, Eq)]
#[non_exhaustive]
pub struct Warning {
    /// Category.
    pub kind: WarningKind,
    /// Human-readable description shared by all occurrences.
    pub message: String,
    /// Number of occurrences.
    pub count: u64,
    /// Every recorded example location or value, in occurrence order.
    pub examples: Vec<String>,
}

impl fmt::Display for Warning {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message)?;
        if self.count > 1 {
            write!(f, " ({} times)", self.count)?;
        }
        if !self.examples.is_empty() {
            write!(f, "; e.g. ")?;
            for (index, example) in self.examples.iter().enumerate() {
                if index != 0 {
                    write!(f, ", ")?;
                }
                write!(f, "{example}")?;
            }
            if self.count > self.examples.len() as u64 {
                write!(f, ", ...")?;
            }
        }
        Ok(())
    }
}

/// Collection of aggregated warnings.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct Diagnostics {
    warnings: Vec<Warning>,
}

impl Diagnostics {
    /// Creates an empty collection.
    pub fn new() -> Self {
        Self::default()
    }

    /// Records one occurrence and every example, using fallible storage growth.
    /// Allocation/count failure leaves existing diagnostics intact.
    pub fn warn(
        &mut self,
        kind: WarningKind,
        message: &str,
        example: impl FnOnce() -> String,
    ) -> Result<()> {
        if let Some(entry) = self
            .warnings
            .iter_mut()
            .find(|w| w.kind == kind && w.message == message)
        {
            let count = entry
                .count
                .checked_add(1)
                .ok_or(Error::SizeOverflow("diagnostic occurrence count"))?;
            error::reserve(&mut entry.examples, 1, "diagnostic examples")?;
            entry.examples.push(example());
            entry.count = count;
        } else {
            error::reserve(&mut self.warnings, 1, "diagnostic warnings")?;
            let mut description = String::new();
            description
                .try_reserve_exact(message.len())
                .map_err(|source| Error::Allocation {
                    what: "diagnostic message",
                    source,
                })?;
            description.push_str(message);
            let mut examples = error::capacity(1, "diagnostic examples")?;
            examples.push(example());
            self.warnings.push(Warning {
                kind,
                message: description,
                count: 1,
                examples,
            });
        }
        Ok(())
    }

    /// Reports a missing optional field before choosing its documented default.
    pub(crate) fn or_warn<T>(
        &mut self,
        value: Option<T>,
        default: T,
        kind: WarningKind,
        message: &str,
        example: impl FnOnce() -> String,
    ) -> Result<T> {
        match value {
            Some(value) => Ok(value),
            None => {
                self.warn(kind, message, example)?;
                Ok(default)
            }
        }
    }

    /// Adds all occurrences/examples in first-warning/example order.
    /// Reserve before consuming `other`, so failure cannot publish a partial merge.
    pub fn merge(&mut self, other: Diagnostics) -> Result<()> {
        let new_warnings = other
            .warnings
            .iter()
            .filter(|w| {
                !self
                    .warnings
                    .iter()
                    .any(|x| x.kind == w.kind && x.message == w.message)
            })
            .count();
        error::reserve(
            &mut self.warnings,
            new_warnings,
            "merged diagnostic warnings",
        )?;
        for w in &other.warnings {
            if let Some(existing) = self
                .warnings
                .iter_mut()
                .find(|x| x.kind == w.kind && x.message == w.message)
            {
                existing
                    .count
                    .checked_add(w.count)
                    .ok_or(Error::SizeOverflow("merged diagnostic occurrence count"))?;
                error::reserve(
                    &mut existing.examples,
                    w.examples.len(),
                    "merged diagnostic examples",
                )?;
            }
        }
        for w in other.warnings {
            if let Some(existing) = self
                .warnings
                .iter_mut()
                .find(|x| x.kind == w.kind && x.message == w.message)
            {
                existing.count += w.count;
                existing.examples.extend(w.examples);
            } else {
                self.warnings.push(w);
            }
        }
        Ok(())
    }

    /// The aggregated warnings in first-occurrence order.
    pub fn warnings(&self) -> &[Warning] {
        &self.warnings
    }

    /// `true` when no warning was recorded.
    pub fn is_empty(&self) -> bool {
        self.warnings.is_empty()
    }

    /// Total number of occurrences of warnings of `kind`.
    pub fn count(&self, kind: WarningKind) -> u64 {
        self.warnings
            .iter()
            .filter(|w| w.kind == kind)
            .map(|w| w.count)
            .sum()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn aggregates_by_kind_and_message() {
        let mut d = Diagnostics::new();
        for i in 0..7 {
            d.warn(WarningKind::InvalidField, "bad serial", || {
                format!("line {i}")
            })
            .unwrap();
        }
        d.warn(WarningKind::UnknownElement, "unknown element", || {
            "X1".into()
        })
        .unwrap();
        assert_eq!(d.warnings().len(), 2);
        assert_eq!(d.warnings()[0].count, 7);
        assert_eq!(d.warnings()[0].examples.len(), 7);
        assert_eq!(d.count(WarningKind::UnknownElement), 1);
        let text = d.warnings()[0].to_string();
        assert!(
            text.starts_with("bad serial (7 times); e.g. line 0"),
            "{text}"
        );
        assert!(text.ends_with("line 6"));
    }

    #[test]
    fn merge_combines_counts() {
        let mut a = Diagnostics::new();
        a.warn(WarningKind::InvalidField, "m", || "a".into())
            .unwrap();
        let mut b = Diagnostics::new();
        b.warn(WarningKind::InvalidField, "m", || "b".into())
            .unwrap();
        b.warn(WarningKind::InferredElement, "n", || "c".into())
            .unwrap();
        a.merge(b).unwrap();
        assert_eq!(a.count(WarningKind::InvalidField), 2);
        assert_eq!(a.warnings()[0].examples, ["a", "b"]);
        assert_eq!(a.warnings().len(), 2);
    }
    #[test]
    fn merge_retains_every_example_beyond_the_former_ceiling() {
        let mut a = Diagnostics::new();
        let mut b = Diagnostics::new();
        for i in 0..20 {
            let target = if i < 9 { &mut a } else { &mut b };
            target
                .warn(WarningKind::InvalidField, "all", || format!("example {i}"))
                .unwrap();
        }
        a.merge(b).unwrap();
        assert_eq!(a.warnings()[0].count, 20);
        assert_eq!(
            a.warnings()[0].examples,
            (0..20).map(|i| format!("example {i}")).collect::<Vec<_>>()
        );
    }

    #[test]
    fn occurrence_overflow_preserves_existing_diagnostics() {
        let mut a = Diagnostics::new();
        a.warn(WarningKind::InvalidField, "all", || "first".into())
            .unwrap();
        a.warnings[0].count = u64::MAX;
        let before = a.clone();
        assert!(matches!(
            a.warn(WarningKind::InvalidField, "all", || "unused".into()),
            Err(Error::SizeOverflow(_))
        ));
        assert_eq!(a, before);
        let mut b = Diagnostics::new();
        b.warn(WarningKind::InvalidField, "all", || "unused".into())
            .unwrap();
        assert!(matches!(a.merge(b), Err(Error::SizeOverflow(_))));
        assert_eq!(a, before);
    }
}
