declare const process:
  | {
      env: {
        NODE_ENV?: string;
      };
    }
  | undefined;

export interface EsmxConfig {
  importMaps: Record<string, string>;
  moduleResolution: 'node' | 'bundler' | 'classic';
  allowImportingTsExtensions: boolean;
  allowArbitraryExtensions: boolean;
  resolveJsonModule: boolean;
  esModuleInterop: boolean;
  allowSyntheticDefaultImports: boolean;
  moduleDetection: 'auto' | 'legacy' | 'force';
  hmr?: {
    enabled: boolean;
    port: number;
    overlay: boolean;
  };
  preload?: string[];
  security?: {
    sri: boolean;
    permissions: string[];
    sandbox: boolean;
  };
  performance?: {
    profiling: boolean;
    moduleGraph: boolean;
    metrics: boolean;
  };
}

export interface ImportMap {
  imports: Record<string, string>;
  scopes: Record<string, Record<string, string>>;
}

export interface ModuleCache {
  enabled: boolean;
  directory: string;
  maxSize: string;
  ttl: number;
  strategy?: 'lru' | 'lfu' | 'fifo';
  compression?: boolean;
}

export interface ModuleMetrics {
  loadTime: number;
  transformTime: number;
  cacheHit: boolean;
  dependencies: string[];
  size: number;
}

export interface HMRUpdate {
  type: 'update' | 'remove' | 'add';
  module: string;
  timestamp: number;
  dependencies?: string[];
}

export interface ModuleGraph {
  nodes: Map<string, ModuleNode>;
  edges: Map<string, Set<string>>;
}

export interface ModuleNode {
  id: string;
  url: string;
  type: 'js' | 'ts' | 'jsx' | 'tsx' | 'css' | 'json' | 'wasm';
  imports: Set<string>;
  importers: Set<string>;
  lastModified: number;
  transformResult?: any;
}

export class EsmxIntegration {
  private config: EsmxConfig;
  private moduleGraph: ModuleGraph;
  private moduleMetrics: Map<string, ModuleMetrics>;
  private hmrServer?: any;
  private workerPool?: any;

  constructor(config: EsmxConfig) {
    this.config = config;
    this.moduleGraph = {
      nodes: new Map(),
      edges: new Map(),
    };
    this.moduleMetrics = new Map();
  }

  async setupESM() {
    return {
      name: 'esmx-esm',
      setup: () => ({
        importMaps: this.generateImportMaps(),
        moduleCache: this.setupModuleCache(),
        loader: this.setupModuleLoader(),
        resolution: {
          moduleResolution: this.config.moduleResolution || 'bundler',
          allowImportingTsExtensions: this.config.allowImportingTsExtensions || true,
          allowArbitraryExtensions: this.config.allowArbitraryExtensions || false,
          resolveJsonModule: this.config.resolveJsonModule || true,
          esModuleInterop: this.config.esModuleInterop || true,
          allowSyntheticDefaultImports: this.config.allowSyntheticDefaultImports || true,
          moduleDetection: this.config.moduleDetection || 'auto',
        },
        features: {
          nativeESM: true,
          dynamicImports: true,
          topLevelAwait: true,
          importAssertions: true,
          importMeta: true,
          webStreams: true,
          webCrypto: true,
          fetchAPI: true,
        },
      }),
      plugins: ['esmx-loader', 'esmx-resolver', 'esmx-transformer'],
      dependencies: ['esmx', 'esbuild', 'typescript'],
    };
  }

  private generateImportMaps(): ImportMap {
    return {
      imports: {
        react: 'https://esm.sh/react@18',
        'react-dom': 'https://esm.sh/react-dom@18',
        'react-dom/client': 'https://esm.sh/react-dom@18/client',
        '@tanstack/react-query': 'https://esm.sh/@tanstack/react-query@5',
        '@tanstack/react-router': 'https://esm.sh/@tanstack/react-router@1',
        zustand: 'https://esm.sh/zustand@4',
        tailwindcss: 'https://esm.sh/tailwindcss@4',
        '@arco-design/web-react': 'https://esm.sh/@arco-design/web-react@2',
        typia: 'https://esm.sh/typia@6',
        ...this.config.importMaps,
      },
      scopes: {
        '/katalyst/core/': {
          '@katalyst-react/shared': '/katalyst/shared/src/index.ts',
          '@katalyst-react/components': '/katalyst/shared/src/components/index.ts',
          '@katalyst-react/hooks': '/katalyst/shared/src/hooks/index.ts',
          '@katalyst-react/stores': '/katalyst/shared/src/stores/index.ts',
          '@katalyst-react/utils': '/katalyst/shared/src/utils/index.ts',
        },
        '/katalyst/remix/': {
          '@katalyst-react/shared': '/katalyst/shared/src/index.ts',
          '@katalyst-react/components': '/katalyst/shared/src/components/index.ts',
          '@katalyst-react/hooks': '/katalyst/shared/src/hooks/index.ts',
          '@katalyst-react/stores': '/katalyst/shared/src/stores/index.ts',
          '@katalyst-react/utils': '/katalyst/shared/src/utils/index.ts',
        },
        '/katalyst/nextjs/': {
          '@katalyst-react/shared': '/katalyst/shared/src/index.ts',
          '@katalyst-react/components': '/katalyst/shared/src/components/index.ts',
          '@katalyst-react/hooks': '/katalyst/shared/src/hooks/index.ts',
          '@katalyst-react/stores': '/katalyst/shared/src/stores/index.ts',
          '@katalyst-react/utils': '/katalyst/shared/src/utils/index.ts',
        },
      },
    };
  }

  private setupModuleCache(): ModuleCache {
    return {
      enabled: true,
      directory: '.esmx/cache',
      maxSize: '500MB',
      ttl: 86400000, // 24 hours
      strategy: 'lru',
      compression: true,
    };
  }

  private setupModuleLoader() {
    return {
      name: 'esmx-loader',
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
      transformers: {
        typescript: {
          enabled: true,
          target: 'es2022',
          jsx: 'react-jsx',
          jsxImportSource: 'react',
          allowJs: true,
          declaration: false,
          sourceMap: true,
        },
        jsx: {
          enabled: true,
          runtime: 'automatic',
          importSource: 'react',
          development:
            (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') || false,
        },
        css: {
          enabled: true,
          modules: true,
          postcss: true,
        },
      },
      resolvers: [
        {
          name: 'node-modules',
          priority: 1,
          resolve: (specifier: string, context: any) => {
            if (specifier.startsWith('node:')) {
              return { url: specifier };
            }
            return null;
          },
        },
        {
          name: 'import-maps',
          priority: 2,
          resolve: (specifier: string, context: any) => {
            const importMaps = this.generateImportMaps();
            if (importMaps.imports[specifier]) {
              return { url: importMaps.imports[specifier] };
            }
            return null;
          },
        },
        {
          name: 'relative',
          priority: 3,
          resolve: (specifier: string, context: any) => {
            if (specifier.startsWith('./') || specifier.startsWith('../')) {
              return { url: new URL(specifier, context.parentURL).href };
            }
            return null;
          },
        },
      ],
    };
  }

  async setupDenoIntegration() {
    return {
      name: 'esmx-deno',
      setup: () => ({
        runtime: 'deno',
        permissions: {
          net: ['esm.sh', 'deno.land', 'cdn.skypack.dev'],
          read: ['.', './katalyst'],
          write: ['./.esmx', './dist'],
          env: ['NODE_ENV', 'DENO_ENV'],
          run: ['deno', 'bun'],
        },
        importMap: './deno.json',
        tasks: {
          dev: 'deno run --allow-all --watch ./scripts/dev.ts',
          build: 'deno run --allow-all ./scripts/build.ts',
          test: 'deno test --allow-all',
          lint: 'deno lint',
          fmt: 'deno fmt',
        },
        compilerOptions: {
          allowJs: true,
          allowUnreachableCode: false,
          allowUnusedLabels: false,
          checkJs: false,
          experimentalDecorators: false,
          jsx: 'react-jsx',
          jsxImportSource: 'react',
          keyofStringsOnly: false,
          lib: ['deno.window', 'dom', 'dom.iterable', 'es2022'],
          noFallthroughCasesInSwitch: false,
          noImplicitAny: true,
          noImplicitOverride: false,
          noImplicitReturns: false,
          noImplicitThis: true,
          noStrictGenericChecks: false,
          noUncheckedIndexedAccess: false,
          noUnusedLocals: false,
          noUnusedParameters: false,
          strict: true,
          strictBindCallApply: true,
          strictFunctionTypes: true,
          strictNullChecks: true,
          strictPropertyInitialization: true,
          suppressExcessPropertyErrors: false,
          suppressImplicitAnyIndexErrors: false,
          useUnknownInCatchVariables: false,
        },
      }),
    };
  }

  async setupBunIntegration() {
    return {
      name: 'esmx-bun',
      setup: () => ({
        runtime: 'bun',
        target: 'bun',
        format: 'esm',
        splitting: true,
        treeshaking: true,
        minify: false,
        sourcemap: 'external',
        external: ['react', 'react-dom'],
        define: {
          'process.env.NODE_ENV': '"development"',
          'import.meta.env.DEV': 'true',
        },
        loader: {
          '.ts': 'ts',
          '.tsx': 'tsx',
          '.js': 'js',
          '.jsx': 'jsx',
          '.css': 'css',
          '.json': 'json',
        },
        plugins: [
          {
            name: 'katalyst-resolver',
            setup: (build: any) => {
              build.onResolve({ filter: /^@katalyst-react\// }, (args: any) => {
                const path = args.path.replace('@katalyst-react/', './katalyst/shared/src/');
                return { path, namespace: 'katalyst' };
              });
            },
          },
        ],
      }),
    };
  }

  async setupWebStreams() {
    return {
      name: 'esmx-web-streams',
      setup: () => ({
        streams: {
          ReadableStream: true,
          WritableStream: true,
          TransformStream: true,
          ReadableStreamDefaultReader: true,
          ReadableStreamBYOBReader: true,
          WritableStreamDefaultWriter: true,
          TransformStreamDefaultController: true,
          ReadableByteStreamController: true,
          ReadableStreamDefaultController: true,
        },
        apis: {
          fetch: true,
          Request: true,
          Response: true,
          Headers: true,
          URL: true,
          URLSearchParams: true,
          AbortController: true,
          AbortSignal: true,
          FormData: true,
          Blob: true,
          File: true,
        },
        crypto: {
          subtle: true,
          getRandomValues: true,
          randomUUID: true,
        },
      }),
    };
  }

  async initialize() {
    const baseIntegrations = await Promise.all([
      this.setupESM(),
      this.setupDenoIntegration(),
      this.setupBunIntegration(),
      this.setupWebStreams(),
    ]);

    const advancedIntegrations = [];

    if (this.config.hmr?.enabled) {
      advancedIntegrations.push(await this.setupHMR());
    }

    if (this.config.performance?.profiling) {
      this.setupPerformanceProfiling();
    }

    if (this.config.performance?.moduleGraph) {
      advancedIntegrations.push(await this.setupModuleInspector());
    }

    if (this.config.security?.sri || this.config.security?.sandbox) {
      advancedIntegrations.push(await this.setupSecurityFeatures());
    }

    // Always include these advanced features
    advancedIntegrations.push(
      await this.setupWorkerPool(),
      await this.setupModuleFederation(),
      await this.setupWASMIntegration()
    );

    if (this.config.preload?.length) {
      await this.preloadModules(this.config.preload);
    }

    return [...baseIntegrations, ...advancedIntegrations].filter(Boolean);
  }

  async setupHMR() {
    const port = this.config.hmr?.port || 3333;
    return {
      name: 'esmx-hmr',
      setup: () => ({
        server: {
          port,
          websocket: true,
          middleware: [
            {
              name: 'hmr-client-injection',
              transform: (code: string, id: string) => {
                if (id.endsWith('.html')) {
                  return code.replace(
                    '</head>',
                    `<script type="module">
                      const ws = new WebSocket('ws://localhost:${port}');
                      ws.onmessage = (e) => {
                        const update = JSON.parse(e.data);
                        if (update.type === 'update') {
                          import(update.module + '?t=' + update.timestamp)
                            .then(() => console.log('HMR update applied:', update.module));
                        }
                      };
                    </script></head>`
                  );
                }
                return code;
              },
            },
          ],
        },
        api: {
          accept: (deps?: string[]) => {
            // HMR accept API
          },
          dispose: (cb: () => void) => {
            // HMR dispose API
          },
          invalidate: () => {
            // Force full reload
          },
        },
      }),
    };
  }

  async setupWorkerPool() {
    return {
      name: 'esmx-worker-pool',
      setup: () => ({
        workers: {
          count: (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : null) || 4,
          type: 'module',
          options: {
            type: 'module',
            credentials: 'same-origin',
          },
        },
        loadBalancer: 'round-robin',
        api: {
          run: async (moduleId: string, args: any[]) => {
            // Execute module in worker
          },
          terminate: () => {
            // Cleanup workers
          },
        },
      }),
    };
  }

  async setupModuleFederation() {
    return {
      name: 'esmx-module-federation',
      setup: () => ({
        remotes: {
          '@katalyst/shared': 'http://localhost:3001/remoteEntry.js',
          '@katalyst/components': 'http://localhost:3002/remoteEntry.js',
        },
        exposes: {
          './Button': './src/components/Button',
          './hooks': './src/hooks/index',
        },
        shared: {
          react: { singleton: true, requiredVersion: '^18.0.0' },
          'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
          '@tanstack/react-query': { singleton: true },
          zustand: { singleton: true },
        },
      }),
    };
  }

  async setupWASMIntegration() {
    return {
      name: 'esmx-wasm',
      setup: () => ({
        instantiate: async (wasmModule: string) => {
          const response = await fetch(wasmModule);
          const buffer = await response.arrayBuffer();
          const module = await WebAssembly.compile(buffer);
          return new WebAssembly.Instance(module);
        },
        streaming: true,
        imports: {
          env: {
            memory: new WebAssembly.Memory({ initial: 256, maximum: 512 }),
            table: new WebAssembly.Table({ initial: 0, element: 'anyfunc' }),
          },
        },
      }),
    };
  }

  setupPerformanceProfiling() {
    if (typeof PerformanceObserver !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure' && entry.name.startsWith('esmx-')) {
            this.moduleMetrics.set(entry.name, {
              loadTime: entry.duration,
              transformTime: 0,
              cacheHit: false,
              dependencies: [],
              size: 0,
            });
          }
        }
      });
      observer.observe({ entryTypes: ['measure', 'resource'] });
    }
  }

  async preloadModules(modules: string[]) {
    if (typeof document !== 'undefined') {
      const preloadPromises = modules.map(async (module) => {
        const link = document.createElement('link');
        link.rel = 'modulepreload';
        link.href = module;
        document.head.appendChild(link);

        // Track preload in module graph
        this.moduleGraph.nodes.set(module, {
          id: module,
          url: module,
          type: 'js',
          imports: new Set(),
          importers: new Set(),
          lastModified: Date.now(),
        });
      });

      await Promise.all(preloadPromises);
    } else {
      // For non-browser environments, just track in module graph
      modules.forEach((module) => {
        this.moduleGraph.nodes.set(module, {
          id: module,
          url: module,
          type: 'js',
          imports: new Set(),
          importers: new Set(),
          lastModified: Date.now(),
        });
      });
    }
  }

  getModuleGraph(): ModuleGraph {
    return this.moduleGraph;
  }

  getModuleMetrics(moduleId: string): ModuleMetrics | undefined {
    return this.moduleMetrics.get(moduleId);
  }

  async setupSecurityFeatures() {
    return {
      name: 'esmx-security',
      setup: () => ({
        sri: {
          enabled: this.config.security?.sri || false,
          algorithm: 'sha384',
          generate: async (content: string) => {
            if (typeof crypto !== 'undefined' && crypto.subtle) {
              const encoder = new TextEncoder();
              const data = encoder.encode(content);
              const hashBuffer = await crypto.subtle.digest('SHA-384', data);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              const hashBase64 = btoa(String.fromCharCode(...hashArray));
              return `sha384-${hashBase64}`;
            }
            return '';
          },
        },
        csp: {
          directives: {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://esm.sh'],
            'style-src': ["'self'", "'unsafe-inline'"],
            'img-src': ["'self'", 'data:', 'https:'],
            'connect-src': ["'self'", 'https://esm.sh', 'wss:'],
          },
        },
        sandbox: {
          enabled: this.config.security?.sandbox || false,
          permissions: this.config.security?.permissions || [],
        },
      }),
    };
  }

  async setupModuleInspector() {
    return {
      name: 'esmx-inspector',
      setup: () => ({
        ui: {
          enabled: this.config.performance?.moduleGraph || false,
          port: 3334,
          route: '/__esmx_inspector__',
        },
        api: {
          getGraph: () => this.getModuleGraph(),
          getMetrics: (id: string) => this.getModuleMetrics(id),
          invalidate: (id: string) => {
            this.moduleGraph.nodes.delete(id);
            this.moduleMetrics.delete(id);
          },
        },
      }),
    };
  }

  getDenoConfig() {
    return {
      compilerOptions: {
        allowJs: true,
        jsx: 'react-jsx',
        jsxImportSource: 'react',
        lib: ['deno.window', 'dom', 'dom.iterable', 'es2022'],
        strict: true,
      },
      imports: this.generateImportMaps().imports,
      tasks: {
        dev: 'deno run --allow-all --watch ./scripts/dev.ts',
        build: 'deno run --allow-all ./scripts/build.ts',
        test: 'deno test --allow-all',
        lint: 'deno lint',
        fmt: 'deno fmt',
      },
      exclude: ['node_modules', 'dist', '.next', '.remix'],
    };
  }

  getBunConfig() {
    return {
      name: 'katalyst',
      module: 'index.ts',
      type: 'module',
      devDependencies: {
        'bun-types': 'latest',
      },
      peerDependencies: {
        typescript: '^5.0.0',
      },
      trustedDependencies: ['esbuild'],
    };
  }

  getTypeDefinitions() {
    return `
      interface ImportMap {
        imports: Record<string, string>;
        scopes: Record<string, Record<string, string>>;
      }

      interface ModuleCache {
        enabled: boolean;
        directory: string;
        maxSize: string;
        ttl: number;
        strategy?: 'lru' | 'lfu' | 'fifo';
        compression?: boolean;
      }

      interface EsmxLoader {
        name: string;
        extensions: string[];
        transformers: Record<string, any>;
        resolvers: Array<{
          name: string;
          priority: number;
          resolve: (specifier: string, context: any) => any;
        }>;
      }

      interface ModuleMetrics {
        loadTime: number;
        transformTime: number;
        cacheHit: boolean;
        dependencies: string[];
        size: number;
      }

      interface HMRApi {
        accept: (deps?: string[]) => void;
        dispose: (cb: () => void) => void;
        invalidate: () => void;
        data: any;
      }

      interface ModuleGraph {
        nodes: Map<string, ModuleNode>;
        edges: Map<string, Set<string>>;
      }

      interface ModuleNode {
        id: string;
        url: string;
        type: 'js' | 'ts' | 'jsx' | 'tsx' | 'css' | 'json' | 'wasm';
        imports: Set<string>;
        importers: Set<string>;
        lastModified: number;
        transformResult?: any;
      }

      declare namespace Deno {
        export interface CompilerOptions {
          allowJs?: boolean;
          jsx?: string;
          jsxImportSource?: string;
          lib?: string[];
          strict?: boolean;
        }
      }

      declare namespace Bun {
        export interface BuildConfig {
          entrypoints: string[];
          outdir: string;
          target: string;
          format: string;
          splitting: boolean;
          treeshaking: boolean;
          minify: boolean;
          sourcemap: string;
        }
      }

      declare global {
        interface ImportMeta {
          hot?: HMRApi;
          url: string;
          resolve: (specifier: string) => string;
        }
      }
    `;
  }
}
