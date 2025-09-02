// Build script for Katalyst Tauri
// Handles code generation, asset processing, and build-time configuration

use std::env;

fn main() {
    // Tauri build script
    tauri_build::build();
    
    // Set build-time environment variables
    println!("cargo:rerun-if-env-changed=TAURI_PLATFORM");
    println!("cargo:rerun-if-env-changed=TAURI_TARGET");
    println!("cargo:rerun-if-env-changed=NODE_ENV");
    
    // Platform-specific build configuration
    let platform = env::var("TAURI_PLATFORM").unwrap_or_else(|_| "desktop".to_string());
    println!("cargo:rustc-cfg=platform=\"{}\"", platform);
    
    match platform.as_str() {
        "mobile" => {
            println!("cargo:rustc-cfg=mobile");
            println!("cargo:rustc-cfg=feature=\"mobile\"");
        }
        "webxr" => {
            println!("cargo:rustc-cfg=webxr");
            println!("cargo:rustc-cfg=feature=\"webxr\"");
        }
        _ => {
            println!("cargo:rustc-cfg=desktop");
        }
    }
    
    // Enable optimizations for release builds
    if env::var("PROFILE").unwrap_or_default() == "release" {
        println!("cargo:rustc-link-arg=-s"); // Strip symbols
    }
    
    // Git information for version tracking
    if let Ok(output) = std::process::Command::new("git")
        .args(&["rev-parse", "HEAD"])
        .output()
    {
        let git_hash = String::from_utf8_lossy(&output.stdout);
        println!("cargo:rustc-env=GIT_HASH={}", git_hash.trim());
    }
    
    if let Ok(output) = std::process::Command::new("git")
        .args(&["rev-parse", "--abbrev-ref", "HEAD"])
        .output()
    {
        let git_branch = String::from_utf8_lossy(&output.stdout);
        println!("cargo:rustc-env=GIT_BRANCH={}", git_branch.trim());
    }
    
    // Build timestamp
    let build_time = chrono::Utc::now().to_rfc3339();
    println!("cargo:rustc-env=BUILD_TIME={}", build_time);
    
    // Rust version
    let rust_version = rustc_version::version().unwrap().to_string();
    println!("cargo:rustc-env=RUST_VERSION={}", rust_version);
}