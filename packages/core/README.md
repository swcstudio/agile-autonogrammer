# @katalyst/framework

A production-ready multi-runtime framework with WebAssembly acceleration, AI integration, and unified development experience.

## Features

- 🚀 **Multi-Runtime Support**: Works seamlessly across Node.js, Deno, Browser, and Edge environments
- ⚡ **WebAssembly Acceleration**: High-performance computing with Rust, Elixir, and TypeScript WASM modules
- 🤖 **AI Integration**: Built-in AI capabilities with multiple provider support
- 🧵 **Multithreading**: Advanced multithreading with WebWorkers and SharedArrayBuffer
- 📊 **Performance Monitoring**: Real-time performance tracking and optimization
- 🔧 **Type-Safe**: Full TypeScript support with comprehensive type definitions

## Quick Start

```bash
npm install @katalyst/framework
```

### Basic Usage

```typescript
import { initializeKatalyst } from '@katalyst/framework';

// Initialize the framework
const katalyst = await initializeKatalyst({
  wasm: {
    rust: true,
    elixir: false,
    typescript: true
  },
  ai: {
    provider: 'cloudflare',
    models: ['@cf/meta/llama-3.1-8b-instruct']
  },
  multithreading: {
    enabled: true,
    maxWorkers: 4
  },
  performance: {
    monitoring: true,
    optimization: 'balanced'
  }
});

// Get runtime information
const runtime = katalyst.getRuntime();
const stats = runtime.getStats();
console.log('Runtime stats:', stats);
```

### WebAssembly Usage

```typescript
import { loadRustModule, loadTypeScriptModule } from '@katalyst/framework/wasm';

// Load and use Rust WASM module for high-performance computing
const rustModule = await loadRustModule('compute', '/wasm/katalyst_rust_wasm_bg.wasm');

// Perform matrix multiplication
const result = rustModule.matrixMultiply(
  new Float32Array([1, 2, 3, 4]),
  new Float32Array([5, 6, 7, 8]),
  2, 2, 2
);

// Run benchmarks
const benchmarks = await rustModule.runBenchmark();
console.log('Performance:', benchmarks);

// Load TypeScript runtime for code execution
const tsModule = await loadTypeScriptModule('ts-runtime', '/wasm/katalyst_typescript_wasm_bg.wasm');

// Compile and execute TypeScript
const jsCode = await tsModule.compileTypeScript(`
  interface User {
    name: string;
    age: number;
  }
  
  const user: User = { name: 'Alice', age: 30 };
  console.log('Hello, ' + user.name);
`, JSON.stringify({ strict: true }));

console.log('Compiled JS:', jsCode);
```

### Runtime Detection

```typescript
import { KatalystRuntime } from '@katalyst/framework/runtime';

const runtime = new KatalystRuntime(config);
await runtime.initialize();

// Automatically detects and optimizes for the current environment
const env = runtime.getStats().environment;
console.log(`Running on: ${env.platform} ${env.version}`);
console.log(`Capabilities:`, env.capabilities);
```

## Configuration

### Framework Configuration

```typescript
interface KatalystConfig {
  wasm?: {
    rust?: boolean;
    elixir?: boolean;
    typescript?: boolean;
    customModules?: Array<{
      name: string;
      url: string;
    }>;
  };
  ai?: {
    provider: 'cloudflare' | 'openai' | 'anthropic' | 'local';
    models?: string[];
    features?: string[];
    apiKey?: string;
  };
  multithreading?: {
    enabled?: boolean;
    maxWorkers?: number;
    strategy?: 'aggressive' | 'balanced' | 'conservative';
  };
  performance?: {
    monitoring?: boolean;
    optimization?: 'speed' | 'balanced' | 'memory';
    caching?: boolean;
  };
  integrations?: {
    payments?: boolean;
    analytics?: boolean;
    auth?: boolean;
  };
}
```

### WASM Module Capabilities

The framework includes three specialized WASM runtimes:

#### Rust Runtime (`rust`)
- High-performance matrix operations
- Fast Fourier Transform (FFT)
- K-means clustering
- SIMD acceleration
- Multithreading support

#### Elixir Runtime (`elixir`)
- Phoenix Socket connections
- GenServer-like process management
- LiveView channel management
- Message passing patterns

#### TypeScript Runtime (`typescript`)
- TypeScript compilation to JavaScript
- Code execution sandbox
- Module system support
- Runtime type checking

## Environment Support

| Environment | Status | Features |
|-------------|--------|----------|
| **Node.js** | ✅ Full | All features, WebWorkers, File system |
| **Deno** | ✅ Full | All features, Web APIs, Secure by default |
| **Browser** | ✅ Full | WASM, WebWorkers, SharedArrayBuffer |
| **Edge** | ✅ Partial | WASM, Limited threading |

## Performance

The framework is optimized for production use with:

- **Zero-copy WASM**: Direct memory access between JS and WASM
- **Lazy loading**: Modules loaded on demand
- **Caching**: Intelligent module and result caching
- **Tree shaking**: Only bundle what you use
- **Size optimized**: Minimal runtime overhead

## Advanced Usage

### Custom WASM Modules

```typescript
// Load custom WASM module
await katalyst.getRuntime().loadWasmModule('custom', '/path/to/custom.wasm');
const customModule = katalyst.getRuntime().getModule('custom');
```

### Multithreading

```typescript
// Execute task in worker thread
const result = await runtime.executeTask('heavy-computation', 'process', {
  data: largeDataset,
  algorithm: 'parallel-sort'
});
```

### Performance Monitoring

```typescript
// Get detailed performance metrics
const stats = runtime.getStats();
console.log('WASM modules loaded:', stats.wasmModules);
console.log('Worker pools active:', stats.workerPools);
console.log('Memory usage:', stats.memoryUsage);
```

## Examples

Check out the `/apps/showcase` directory for a complete example application demonstrating:

- Framework initialization
- WASM module usage
- AI integration
- Real-time performance monitoring
- Multi-environment deployment

## Building from Source

```bash
# Install dependencies
npm install

# Build WASM modules
npm run build:wasm

# Build TypeScript
npm run build:ts

# Bundle for distribution
npm run build:bundle

# Run tests
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT © [Katalyst Team](https://katalyst.dev)

## Links

- [Documentation](https://docs.katalyst.dev)
- [Examples](https://github.com/katalyst/framework/tree/main/apps/showcase)
- [Issues](https://github.com/katalyst/framework/issues)
- [Changelog](./CHANGELOG.md)