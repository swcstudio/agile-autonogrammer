#!/usr/bin/env -S deno run --allow-all

/**
 * Setup script for @swcstudio/multithreading package
 * This script is run during the initial setup to install the private multithreading package
 */

import { exists } from "https://deno.land/std@0.220.0/fs/exists.ts";
import { join } from "https://deno.land/std@0.220.0/path/mod.ts";

const MULTITHREADING_PATH = join(Deno.cwd(), "packages", "multithreading");
const NATIVE_BINARY = "swcstudio-multithreading.darwin-arm64.node";

async function setupMultithreading() {
  console.log("🚀 Setting up @swcstudio/multithreading package...");

  // Check if the package directory exists
  if (!await exists(MULTITHREADING_PATH)) {
    console.error("❌ Multithreading package directory not found");
    Deno.exit(1);
  }

  // Check if Cargo is installed (required for building)
  try {
    await new Deno.Command("cargo", { args: ["--version"] }).output();
  } catch {
    console.error("❌ Cargo is not installed. Please install Rust toolchain first.");
    console.log("Visit: https://rustup.rs/");
    Deno.exit(1);
  }

  // Navigate to the multithreading directory
  Deno.chdir(MULTITHREADING_PATH);

  // Check if the native binary already exists
  const binaryPath = join(MULTITHREADING_PATH, NATIVE_BINARY);
  if (await exists(binaryPath)) {
    console.log("✅ Native binary already exists, skipping build");
    return;
  }

  console.log("🔨 Building native Rust module...");

  // Build the native module
  const buildProcess = new Deno.Command("cargo", {
    args: ["build", "--release"],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await buildProcess.output();

  if (code !== 0) {
    console.error("❌ Failed to build native module");
    console.error(new TextDecoder().decode(stderr));
    Deno.exit(1);
  }

  console.log("✅ Native module built successfully");

  // Run napi build if available
  try {
    const napiProcess = new Deno.Command("npx", {
      args: ["napi", "build", "--platform", "--release"],
      stdout: "piped",
      stderr: "piped",
    });

    const napiResult = await napiProcess.output();
    
    if (napiResult.code === 0) {
      console.log("✅ NAPI bindings generated successfully");
    }
  } catch {
    console.log("⚠️ NAPI CLI not found, skipping binding generation");
    console.log("Run 'npm install -g @napi-rs/cli' to enable NAPI support");
  }

  console.log("🎉 @swcstudio/multithreading setup complete!");
  console.log("");
  console.log("Note: This package is private and protected.");
  console.log("It provides Rust-powered multithreading capabilities including:");
  console.log("  • Tokio async runtime");
  console.log("  • Thread primitives");
  console.log("  • SIMD operations");
  console.log("  • Channel-based communication");
  console.log("  • Memory-efficient resource management");
}

// Run the setup
if (import.meta.main) {
  await setupMultithreading();
}