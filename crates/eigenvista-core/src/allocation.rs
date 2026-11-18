//! Allocation requests have no application policy ceiling. These helpers report
//! the allocator's failure (including an unrepresentable capacity) to callers.
use crate::Result;

pub fn buffer<T>(count: usize, label: &str) -> Result<Vec<T>> {
    let mut values = Vec::new();
    values
        .try_reserve_exact(count)
        .map_err(|error| format!("Cannot allocate {label} ({count} elements): {error}"))?;
    Ok(values)
}

pub fn filled<T: Clone>(count: usize, value: T, label: &str) -> Result<Vec<T>> {
    let mut values = buffer(count, label)?;
    values.resize(count, value);
    Ok(values)
}

pub fn push<T>(values: &mut Vec<T>, value: T, label: &str) -> Result<()> {
    values
        .try_reserve(1)
        .map_err(|error| format!("Cannot allocate {label}: {error}"))?;
    values.push(value);
    Ok(())
}

pub fn append(text: &mut String, value: &str, label: &str) -> Result<()> {
    text.try_reserve(value.len())
        .map_err(|error| format!("Cannot allocate {label}: {error}"))?;
    text.push_str(value);
    Ok(())
}
