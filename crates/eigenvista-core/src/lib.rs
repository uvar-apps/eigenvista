pub mod allocation;
pub mod bonds;
pub mod compute;
pub mod field_analysis;
pub mod fixtures;
pub mod import;
pub mod inspection;
pub mod model;
pub mod molecular_surface;
pub mod protein;
pub mod structure;
pub use structure::*;

pub use model::*;
pub type Result<T> = std::result::Result<T, String>;
