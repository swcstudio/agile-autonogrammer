#!/bin/bash

# Katalyst WASM Runtimes - Unified Build System
# Builds all WASM modules for the Katalyst framework

set -e

echo "🔧 Building Katalyst WASM Runtimes..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BUILD_DIR="$(pwd)/../../packages/core/wasm"
PUBLIC_DIR="$(pwd)/../../public/wasm"
OPTIMIZE=${OPTIMIZE:-true}
THREADS=${THREADS:-4}

# Create build directories
mkdir -p "$BUILD_DIR"
mkdir -p "$PUBLIC_DIR"

echo -e "${BLUE}📁 Build directory: $BUILD_DIR${NC}"
echo -e "${BLUE}📁 Public directory: $PUBLIC_DIR${NC}"

# Function to check if wasm-pack is installed
check_wasm_pack() {
    if ! command -v wasm-pack &> /dev/null; then
        echo -e "${RED}❌ wasm-pack is not installed. Please install it first:${NC}"
        echo -e "${YELLOW}   curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ wasm-pack found${NC}"
}

# Function to check if wasm-opt is installed (for optimization)
check_wasm_opt() {
    if ! command -v wasm-opt &> /dev/null; then
        echo -e "${YELLOW}⚠️  wasm-opt not found. Install binaryen for size optimization${NC}"
        return 1
    fi
    echo -e "${GREEN}✅ wasm-opt found${NC}"
    return 0
}

# Function to build a single WASM module
build_module() {
    local module_name="$1"
    local module_path="$2"
    local features="${3:-}"
    
    echo -e "\n${BLUE}🔨 Building $module_name...${NC}"
    
    # Check if Cargo.toml exists
    if [ ! -f "$module_path/Cargo.toml" ]; then
        echo -e "${RED}❌ No Cargo.toml found in $module_path${NC}"
        return 1
    fi
    
    cd "$module_path"
    
    # Build with wasm-pack
    local build_cmd="wasm-pack build --target web --out-dir $BUILD_DIR/$module_name"
    
    if [ -n "$features" ]; then
        build_cmd="$build_cmd --features $features"
    fi
    
    if [ "$OPTIMIZE" = "true" ]; then
        build_cmd="$build_cmd --release"
    else
        build_cmd="$build_cmd --dev"
    fi
    
    echo -e "${YELLOW}   Running: $build_cmd${NC}"
    
    if eval "$build_cmd"; then
        echo -e "${GREEN}✅ Successfully built $module_name${NC}"
    else
        echo -e "${RED}❌ Failed to build $module_name${NC}"
        return 1
    fi
    
    # Copy to public directory for direct access
    if [ -d "$BUILD_DIR/$module_name" ]; then
        cp -r "$BUILD_DIR/$module_name/"* "$PUBLIC_DIR/"
        echo -e "${GREEN}📦 Copied $module_name to public directory${NC}"
    fi
    
    cd - > /dev/null
}

# Function to optimize WASM files
optimize_wasm() {
    if check_wasm_opt; then
        echo -e "\n${BLUE}⚡ Optimizing WASM files...${NC}"
        
        for wasm_file in "$PUBLIC_DIR"/*.wasm; do
            if [ -f "$wasm_file" ]; then
                echo -e "${YELLOW}   Optimizing $(basename "$wasm_file")...${NC}"
                wasm-opt -Oz "$wasm_file" -o "${wasm_file}.tmp" && mv "${wasm_file}.tmp" "$wasm_file"
                echo -e "${GREEN}✅ Optimized $(basename "$wasm_file")${NC}"
            fi
        done
    else
        echo -e "${YELLOW}⚠️  Skipping optimization (wasm-opt not available)${NC}"
    fi
}

# Function to generate TypeScript bindings
generate_bindings() {
    echo -e "\n${BLUE}📝 Generating TypeScript bindings...${NC}"
    
    # Create unified TypeScript definitions
    cat > "$BUILD_DIR/katalyst-wasm.d.ts" << 'EOF'
/* tslint:disable */
/* eslint-disable */

/**
 * Katalyst WASM Runtime Bindings
 * Generated TypeScript definitions for all Katalyst WASM modules
 */

// Rust WASM Module
export class KatalystCompute {
  constructor();
  matrix_multiply(a_data: Float32Array, b_data: Float32Array, rows_a: number, cols_a: number, cols_b: number): Float32Array;
  fft(real: Float32Array, imag: Float32Array, inverse: boolean): void;
  k_means_clustering(data: Float32Array, dimensions: number, k: number, max_iterations: number): Uint32Array;
  run_benchmark_suite(): string;
  get_performance_stats(): string;
  get_capabilities(): string;
  set_thread_count(threads: number): void;
}

// Elixir WASM Module
export class PhoenixSocket {
  constructor(endpoint: string, params: string);
  connect(): void;
  disconnect(): void;
  channel(topic: string): Channel;
  push(topic: string, event: string, payload: string): void;
  is_connected(): boolean;
}

export class Channel {
  constructor(topic: string);
  join(payload: string): void;
  leave(): void;
  push(event: string, payload: string): void;
  on(event: string, callback: string): void;
  get_topic(): string;
  is_joined(): boolean;
}

export class GenServerClient {
  constructor();
  start_link(name: string, initial_state: string): string;
  call(name: string, message: string): string;
  cast(name: string, message: string): void;
  stop(name: string): void;
  list_processes(): string[];
}

export class LiveViewChannel {
  constructor(topic: string, socket_id: string);
  handle_event(event: string, payload: string): string;
  get_state(): string;
  push_update(key: string, value: string): string;
}

// TypeScript WASM Module
export class TypeScriptRuntime {
  constructor();
  compile_typescript(code: string, options: string): string;
  execute_typescript(code: string, context: string): string;
  execute_javascript(code: string, context: object): string;
  add_module(name: string, code: string): void;
  get_modules(): string[];
  set_compiler_options(options: string): void;
  get_runtime_info(): string;
}

// Utility Functions
export function get_wasm_capabilities(): string;
export function get_elixir_runtime_info(): string;
export function compile_typescript_standalone(code: string, options: string): string;
export function execute_javascript_standalone(code: string, context: string): string;
export function allocate_buffer(size: number): number;
export function deallocate_buffer(ptr: number, size: number): void;
export function get_version(): string;
export function get_build_info(): string;

// Memory management
export const memory: WebAssembly.Memory;

// Module initialization
export default function init(input?: RequestInfo | URL | Response | BufferSource | WebAssembly.Module): Promise<void>;
EOF

    # Copy to public directory
    cp "$BUILD_DIR/katalyst-wasm.d.ts" "$PUBLIC_DIR/"
    
    echo -e "${GREEN}✅ Generated unified TypeScript bindings${NC}"
}

# Function to create manifest
create_manifest() {
    echo -e "\n${BLUE}📄 Creating WASM manifest...${NC}"
    
    local manifest_file="$PUBLIC_DIR/manifest.json"
    local build_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S+00:00")
    
    # Get file sizes
    local rust_size=0
    local elixir_size=0
    local typescript_size=0
    
    [ -f "$PUBLIC_DIR/katalyst_rust_wasm_bg.wasm" ] && rust_size=$(wc -c < "$PUBLIC_DIR/katalyst_rust_wasm_bg.wasm")
    [ -f "$PUBLIC_DIR/katalyst_elixir_wasm_bg.wasm" ] && elixir_size=$(wc -c < "$PUBLIC_DIR/katalyst_elixir_wasm_bg.wasm")
    [ -f "$PUBLIC_DIR/katalyst_typescript_wasm_bg.wasm" ] && typescript_size=$(wc -c < "$PUBLIC_DIR/katalyst_typescript_wasm_bg.wasm")
    
    cat > "$manifest_file" << EOF
{
  "name": "Katalyst WASM Modules",
  "version": "1.0.0",
  "description": "High-performance WebAssembly modules for the Katalyst framework",
  "modules": {
    "rust": {
      "file": "katalyst_rust_wasm_bg.wasm",
      "size": $rust_size,
      "type": "rust-compiled",
      "features": ["simd", "threads", "bulk-memory", "multivalue"],
      "exports": ["KatalystCompute", "get_wasm_capabilities", "allocate_buffer", "deallocate_buffer"]
    },
    "elixir": {
      "file": "katalyst_elixir_wasm_bg.wasm", 
      "size": $elixir_size,
      "type": "elixir-runtime",
      "features": ["websockets", "channels", "live-view"],
      "exports": ["PhoenixSocket", "GenServerClient", "LiveViewChannel", "get_elixir_runtime_info"]
    },
    "typescript": {
      "file": "katalyst_typescript_wasm_bg.wasm",
      "size": $typescript_size,
      "type": "typescript-compiler",
      "features": ["compilation", "execution", "modules"],
      "exports": ["TypeScriptRuntime", "compile_typescript_standalone", "execute_javascript_standalone"]
    }
  },
  "capabilities": {
    "simd": true,
    "threads": true,
    "bulk_memory": true,
    "multivalue": true,
    "tail_calls": false
  },
  "build": {
    "timestamp": "$build_timestamp",
    "rust_version": "$(rustc --version | cut -d' ' -f2)",
    "optimization_level": "$([ "$OPTIMIZE" = "true" ] && echo "O3" || echo "O0")"
  }
}
EOF

    echo -e "${GREEN}✅ Created WASM manifest${NC}"
}

# Function to print build summary
print_summary() {
    echo -e "\n${GREEN}🎉 Build Summary${NC}"
    echo -e "${BLUE}==================${NC}"
    
    if [ -d "$PUBLIC_DIR" ]; then
        local total_size=0
        for wasm_file in "$PUBLIC_DIR"/*.wasm; do
            if [ -f "$wasm_file" ]; then
                local size=$(wc -c < "$wasm_file")
                local size_kb=$((size / 1024))
                echo -e "${GREEN}📦 $(basename "$wasm_file"): ${size_kb}KB${NC}"
                total_size=$((total_size + size))
            fi
        done
        
        local total_kb=$((total_size / 1024))
        echo -e "${BLUE}📊 Total WASM size: ${total_kb}KB${NC}"
    fi
    
    echo -e "\n${GREEN}✅ All WASM modules built successfully!${NC}"
    echo -e "${BLUE}📁 Output directory: $PUBLIC_DIR${NC}"
    echo -e "${BLUE}📄 TypeScript bindings: $PUBLIC_DIR/katalyst-wasm.d.ts${NC}"
    echo -e "${BLUE}📄 Manifest: $PUBLIC_DIR/manifest.json${NC}"
}

# Main build process
main() {
    echo -e "${BLUE}🚀 Starting Katalyst WASM build process...${NC}"
    
    # Pre-flight checks
    check_wasm_pack
    
    # Clean previous builds
    echo -e "\n${YELLOW}🧹 Cleaning previous builds...${NC}"
    rm -rf "$BUILD_DIR"
    rm -rf "$PUBLIC_DIR"
    mkdir -p "$BUILD_DIR"
    mkdir -p "$PUBLIC_DIR"
    
    # Build each module
    build_module "rust" "$(pwd)/rust" "simd,threads"
    build_module "elixir" "$(pwd)/elixir"
    build_module "typescript" "$(pwd)/typescript"
    
    # Post-processing
    [ "$OPTIMIZE" = "true" ] && optimize_wasm
    generate_bindings
    create_manifest
    
    # Summary
    print_summary
}

# Run main function
main "$@"