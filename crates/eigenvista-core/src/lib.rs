pub mod bonds;
pub mod compute;
pub mod fixtures;
pub mod import;
pub mod model;
pub mod protein;
pub mod structure;
pub use structure::*;

pub use model::*;
pub type Result<T> = std::result::Result<T, String>;
