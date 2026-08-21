use std::io::Result;

fn main() -> Result<()> {
    // Proto files are compiled manually to Rust types in src/generated/
    // to avoid requiring protoc at build time.
    // When protoc is available, re-generate with:
    //   prost_build::Config::new()
    //       .out_dir("src/generated")
    //       .compile_protos(&[...], &["../../specs/"])?;

    // Watch proto files for changes (documentation only)
    println!("cargo:rerun-if-changed=../../specs/audio-engine.proto");
    println!("cargo:rerun-if-changed=../../specs/midi-2.0.proto");
    println!("cargo:rerun-if-changed=../../specs/state-sync.proto");
    println!("cargo:rerun-if-changed=../../specs/visual-engine.proto");
    println!("cargo:rerun-if-changed=../../specs/local-ai.proto");

    Ok(())
}
