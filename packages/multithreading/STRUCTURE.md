# Multithreading Package Structure

## Correct Project Layout

This is a Rust/Node.js NAPI project with the following structure:

```
multithreading/
├── Cargo.toml                        # Rust package manifest
├── Cargo.lock                        # Rust dependency lock file
├── package.json                      # Node.js package manifest
├── package-lock.json                 # Node.js dependency lock file
├── build.rs                          # Rust build script
├── README.md                         # Documentation
├── STRUCTURE.md                      # This file
├── turbo.json                        # Turborepo configuration
│
├── src/                              # Rust source files ONLY
│   ├── lib.rs                        # Main Rust library entry point
│   ├── crossbeam.rs                  # Crossbeam concurrency utilities
│   ├── rayon.rs                      # Rayon parallel processing
│   ├── tokio.rs                      # Tokio async runtime
│   ├── parking_lot.rs                # Parking lot synchronization
│   ├── dashmap.rs                    # Concurrent hashmap
│   ├── flume.rs                      # Channel implementation
│   ├── simd.rs                       # SIMD operations
│   ├── thread_local.rs               # Thread-local storage
│   └── memory_pool.rs                # Memory pool management
│
├── index.js                          # Node.js entry point
├── index.d.ts                        # TypeScript definitions
├── wrapper.js                        # NAPI wrapper
├── wrapper.d.ts                      # NAPI wrapper types
│
├── adaptive-resource-manager.ts      # TypeScript resource management
├── intelligent-scheduler.ts          # TypeScript scheduler
├── thread-primitives.ts              # TypeScript thread primitives
├── bridge.ts                         # TypeScript bridge to Rust
│
├── test.js                           # Test file
├── examples.js                       # Usage examples
└── *.node                            # Compiled native module (platform-specific)

```

## File Organization Rules

1. **Rust files** (`.rs`) belong ONLY in the `src/` directory
2. **TypeScript/JavaScript files** (`.ts`, `.js`, `.d.ts`) belong in the root directory
3. **Configuration files** (`Cargo.toml`, `package.json`, etc.) belong in the root directory
4. **Compiled artifacts** (`.node` files) are generated in the root directory

## Build Process

1. Rust code in `src/` is compiled to a native module
2. The native module is exposed through NAPI bindings
3. TypeScript/JavaScript files provide high-level APIs that interact with the native module
4. The final package can be imported in Node.js/React applications

## Important Notes

- Never duplicate the `src/` directory structure
- The `src/` directory should contain ONLY Rust source files
- TypeScript files in the root provide the JavaScript API layer
- The `.node` file is platform-specific and should not be committed to git (add to .gitignore)