use molekel_core::{fixtures,compute};
fn main() {
 let out=std::env::args().nth(1).expect("output directory");
 std::fs::create_dir_all(&out).unwrap();
 let mut doc=fixtures::hydrogen_pair();
 for field in ["bonding","antibonding"] {
  let grid=compute::sample(&doc,field,16).unwrap();
  let hash=compute::source_hash(&doc,field).unwrap();
  for iso in [0.08,-0.08] {
   let s=compute::mesh(&grid,iso,field,&hash,"#259d86",0.6).unwrap();
   if !s.indices.is_empty() {doc.surfaces.push(s);}
  }
  if field=="bonding" {doc.grids.push(grid);}
 }
 let bytes=molekel_format::encode(&doc).unwrap();
 std::fs::write(format!("{out}/hydrogen-0.3.2.molekel"),bytes).unwrap();
 std::fs::write(format!("{out}/hydrogen-0.3.2.json"),serde_json::to_vec(&doc).unwrap()).unwrap();
 println!("surfaces={} grids={} orbitals={} densities={}",doc.surfaces.len(),doc.grids.len(),doc.orbitals.len(),doc.densities.len());
}
