export interface UmiConfig {
  npmClient?: 'npm' | 'yarn' | 'pnpm' | 'bun';
  base?: string;
  publicPath?: string;
  outputPath?: string;
  hash?: boolean;

  // Routing
  routes?: UmiRoute[];
  routeMode?: 'browser' | 'hash' | 'memory';
  conventionRoutes?: {
    base?: string;
    exclude?: RegExp[];
  };

  // Plugins & Presets
  plugins?: string[];
  presets?: string[];

  // Features
  dva?: boolean | DvaConfig;
  antd?: boolean | AntdConfig;
  request?: boolean | RequestConfig;
  layout?: boolean | LayoutConfig;
  qiankun?: boolean | QiankunConfig;
  model?: boolean | ModelConfig;
  locale?: boolean | LocaleConfig;

  // Build
  define?: Record<string, any>;
  devtool?: string;
  externals?: Record<string, string>;
  proxy?: Record<string, any>;
  alias?: Record<string, string>;
  chainWebpack?: (config: any, args: any) => void;

  // Dev Server
  devServer?: {
    port?: number;
    host?: string;
    https?: boolean | { key: string; cert: string };
  };

  // Performance
  mfsu?: boolean | Record<string, any>;
  esbuildMinifyIIFE?: boolean;
  writeToDisk?: boolean;

  // SSR/SSG
  ssr?: boolean | { mode?: 'stream' | 'string' };
  exportStatic?: boolean | { htmlSuffix?: boolean; dynamicRoot?: boolean };
}

export interface UmiRoute {
  path: string;
  component?: string;
  routes?: UmiRoute[];
  redirect?: string;
  wrappers?: string[];
  layout?: boolean;
  exact?: boolean;
  title?: string;
  access?: string;
  [key: string]: any;
}

export interface DvaConfig {
  immer?: boolean | { enableES5?: boolean; enableAllPlugins?: boolean };
  extraModels?: string[];
  skipModelValidate?: boolean;
  disableModelsReExport?: boolean;
  lazyLoad?: boolean;
}

export interface AntdConfig {
  import?: boolean;
  style?: 'less' | 'css' | false;
  theme?: Record<string, any>;
  configProvider?: Record<string, any>;
  compact?: boolean;
  dark?: boolean;
}

export interface RequestConfig {
  dataField?: string;
}

export interface LayoutConfig {
  name?: string;
  logo?: string;
  theme?: 'pro' | 'tech';
  locale?: boolean;
  navTheme?: 'light' | 'dark' | 'realDark';
  primaryColor?: string;
  layout?: 'side' | 'top' | 'mix';
  contentWidth?: 'Fluid' | 'Fixed';
  fixedHeader?: boolean;
  fixSiderbar?: boolean;
  headerHeight?: number;
  siderWidth?: number;
  title?: string;
  [key: string]: any;
}

export interface QiankunConfig {
  master?: {
    apps: Array<{
      name: string;
      entry: string;
      props?: Record<string, any>;
    }>;
    sandbox?: boolean | { strictStyleIsolation?: boolean; experimentalStyleIsolation?: boolean };
    prefetch?: boolean | 'all' | string[];
  };
  slave?: {
    enable?: boolean;
  };
}

export interface ModelConfig {
  extraModels?: string[];
}

export interface LocaleConfig {
  default?: string;
  baseSeparator?: string;
  antd?: boolean;
  title?: boolean;
  baseNavigator?: boolean;
}

export interface UmiPluginAPI {
  // Service
  applyPlugins: (args: { key: string; type?: string; initialValue?: any; args?: any }) => any;
  describe: (args: { key?: string; config?: any; enableBy?: any }) => void;
  register: (args: { key: string; fn: Function; before?: string; stage?: number }) => void;
  registerCommand: (args: { name: string; alias?: string; fn: Function }) => void;
  registerMethod: (args: { name: string; fn?: Function }) => void;
  registerPresets: (presets: string[]) => void;
  registerPlugins: (plugins: string[]) => void;

  // Config
  userConfig: UmiConfig;
  config: UmiConfig;
  modifyConfig: (fn: (config: UmiConfig) => UmiConfig) => void;
  modifyDefaultConfig: (fn: (config: UmiConfig) => UmiConfig) => void;

  // Paths
  paths: {
    cwd: string;
    absSrcPath: string;
    absPagesPath: string;
    absTmpPath: string;
    absOutputPath: string;
    absNodeModulesPath: string;
  };

  // Build
  modifyWebpackConfig: (fn: (config: any) => any) => void;
  modifyBundleConfig: (fn: (config: any, args: any) => any) => void;
  chainWebpack: (fn: (config: any, args: any) => void) => void;

  // HTML
  modifyHTML: (fn: (html: string, args: any) => string) => void;
  addHTMLMetas: (fn: () => any[]) => void;
  addHTMLLinks: (fn: () => any[]) => void;
  addHTMLStyles: (fn: () => any[]) => void;
  addHTMLScripts: (fn: () => any[]) => void;
  addHTMLHeadScripts: (fn: () => any[]) => void;

  // Routes
  modifyRoutes: (fn: (routes: UmiRoute[]) => UmiRoute[]) => void;
  patchRoutes: (fn: (routes: UmiRoute[]) => void) => void;

  // Dev
  addBeforeMiddlewares: (fn: () => any[]) => void;
  addMiddlewares: (fn: () => any[]) => void;

  // Runtime
  addRuntimePlugin: (fn: () => string[]) => void;
  addRuntimePluginKey: (fn: () => string[]) => void;
  addEntryImportsAhead: (fn: () => any[]) => void;
  addEntryImports: (fn: () => any[]) => void;
  addEntryCodeAhead: (fn: () => string[]) => void;
  addEntryCode: (fn: () => string[]) => void;
  addPolyfillImports: (fn: () => any[]) => void;

  // Utils
  writeTmpFile: (args: { path: string; content: string }) => void;
  generateFile: (args: { path: string; content: string }) => void;
  copyTmpFiles: (args: { namespace: string; path: string; ignore?: string[] }) => void;

  // Lifecycle
  onStart: (fn: () => void) => void;
  onBuildComplete: (fn: (args: any) => void) => void;
  onBuildHtmlComplete: (fn: () => void) => void;
  onGenerateFiles: (fn: () => void) => void;
  onPatchRoute: (fn: (args: { route: UmiRoute }) => void) => void;
  onPatchRoutesBefore: (fn: () => void) => void;
  onPatchRoutesLast: (fn: () => void) => void;
  onDevCompileDone: (fn: (args: any) => void) => void;
  onCheck: (fn: () => void) => void;
}

export class UmiIntegration {
  private config: UmiConfig;
  private plugins: Map<string, any> = new Map();
  private runtimeConfig: any = {};
  private api?: UmiPluginAPI;

  constructor(config: UmiConfig) {
    this.config = this.normalizeConfig(config);
  }

  private normalizeConfig(config: UmiConfig): UmiConfig {
    return {
      npmClient: 'pnpm',
      base: '/',
      publicPath: '/',
      outputPath: 'dist',
      hash: true,
      ...config,
      // Ensure plugins array exists
      plugins: [
        ...(config.plugins || []),
        // Add default plugins based on features
        ...(config.dva && !config.plugins?.includes('@umijs/plugins/dist/dva')
          ? ['@umijs/plugins/dist/dva']
          : []),
        ...(config.antd && !config.plugins?.includes('@umijs/plugins/dist/antd')
          ? ['@umijs/plugins/dist/antd']
          : []),
        ...(config.request && !config.plugins?.includes('@umijs/plugins/dist/request')
          ? ['@umijs/plugins/dist/request']
          : []),
        ...(config.model && !config.plugins?.includes('@umijs/plugins/dist/model')
          ? ['@umijs/plugins/dist/model']
          : []),
        ...(config.layout && !config.plugins?.includes('@umijs/plugins/dist/layout')
          ? ['@umijs/plugins/dist/layout']
          : []),
        ...(config.qiankun && !config.plugins?.includes('@umijs/plugins/dist/qiankun')
          ? ['@umijs/plugins/dist/qiankun']
          : []),
        ...(config.locale && !config.plugins?.includes('@umijs/plugins/dist/locale')
          ? ['@umijs/plugins/dist/locale']
          : []),
      ],
      // Default presets
      presets: config.presets || [],
    };
  }

  async setupCore() {
    return {
      name: 'umi-core',
      setup: () => ({
        framework: 'umi',
        version: '4.0.0',
        config: this.config,
        features: {
          conventionRouting: !this.config.routes,
          dva: !!this.config.dva,
          antd: !!this.config.antd,
          qiankun: !!this.config.qiankun,
          locale: !!this.config.locale,
          model: !!this.config.model,
          request: !!this.config.request,
          layout: !!this.config.layout,
          ssr: !!this.config.ssr,
          mfsu: this.config.mfsu !== false,
        },
      }),
    };
  }

  async setupPluginSystem() {
    return {
      name: 'umi-plugin-system',
      setup: () => ({
        plugins: this.config.plugins || [],
        presets: this.config.presets || [],
        lifecycle: {
          modifyConfig: [],
          modifyRoutes: [],
          modifyHTML: [],
          modifyWebpackConfig: [],
          onGenerateFiles: [],
          onBuildComplete: [],
          onDevCompileDone: [],
        },
        api: this.createPluginAPI(),
      }),
    };
  }

  private createPluginAPI(): Partial<UmiPluginAPI> {
    const api: Partial<UmiPluginAPI> = {
      userConfig: this.config,
      config: this.config,
      paths: {
        cwd: process.cwd(),
        absSrcPath: `${process.cwd()}/src`,
        absPagesPath: `${process.cwd()}/src/pages`,
        absTmpPath: `${process.cwd()}/.umi`,
        absOutputPath: `${process.cwd()}/${this.config.outputPath || 'dist'}`,
        absNodeModulesPath: `${process.cwd()}/node_modules`,
      },
      register: ({ key, fn }) => {
        this.plugins.set(key, fn);
      },
      applyPlugins: ({ key, initialValue, args }) => {
        const fns = this.plugins.get(key) || [];
        return fns.reduce((memo: any, fn: Function) => {
          return fn({ memo, args });
        }, initialValue);
      },
    };

    return api;
  }

  async setupRouting() {
    const routingConfig = {
      mode: this.config.routeMode || 'browser',
      base: this.config.base || '/',
      routes: this.config.routes || [],
      conventionRoutes: this.config.conventionRoutes,
    };

    return {
      name: 'umi-routing-bridge',
      setup: () => ({
        type: this.config.routes ? 'config' : 'convention',
        mode: 'bridge', // Bridge to Katalyst routing, don't replace
        config: routingConfig,
        // Convention routing setup - for UMI compatibility only
        convention: !this.config.routes
          ? {
              base: this.config.conventionRoutes?.base || 'src/umi-pages', // Separate from Katalyst routes
              exclude: this.config.conventionRoutes?.exclude || [
                /\/components\//,
                /\/models\//,
                /\.test\.(j|t)sx?$/,
                /\.spec\.(j|t)sx?$/,
                /__tests__/,
                /\.umi/,
              ],
            }
          : undefined,
        // Route processors - complementary to Katalyst
        processors: [
          'addUmiLayoutRoutes',
          'addUmiWrapperRoutes',
          'collectUmiRouteMeta',
          'patchUmiRoutes',
        ],
        // Integration with Katalyst routing
        katalystBridge: {
          preserveKatalystRoutes: true,
          complementaryRouting: true,
          umiNamespace: '/umi',
        },
      }),
    };
  }

  async setupDvaIntegration() {
    if (!this.config.dva) return null;

    const dvaConfig = typeof this.config.dva === 'object' ? this.config.dva : {};

    return {
      name: 'umi-dva-bridge',
      setup: () => ({
        enabled: true,
        mode: 'bridge', // Bridge to Katalyst state management, don't replace
        config: {
          immer: dvaConfig.immer !== false,
          extraModels: dvaConfig.extraModels || [],
          skipModelValidate: dvaConfig.skipModelValidate || false,
          disableModelsReExport: dvaConfig.disableModelsReExport || false,
          lazyLoad: dvaConfig.lazyLoad !== false,
        },
        // DVA model loading configuration - for UMI compatibility only
        modelLoading: {
          directory: 'src/umi-models', // Separate from Katalyst stores
          pattern: '**/*.{ts,tsx,js,jsx}',
          ignore: ['**/*.d.ts', '**/*.test.{ts,tsx,js,jsx}'],
        },
        // Bridge exports - don't override Katalyst patterns
        exports: {
          connect: false, // Katalyst uses better patterns
          useDispatch: false, // Katalyst has unified state management
          useSelector: false, // Katalyst uses Zustand
          useStore: false, // Katalyst manages this
        },
        // Integration with Katalyst state management
        katalystBridge: {
          mapDvaToZustand: true,
          preserveKatalystStores: true,
          complementaryOnly: true,
        },
      }),
    };
  }

  async setupAntDesignIntegration() {
    if (!this.config.antd) return null;

    const antdConfig = typeof this.config.antd === 'object' ? this.config.antd : {};

    return {
      name: 'umi-antd',
      setup: () => ({
        enabled: true,
        config: {
          import: antdConfig.import !== false,
          style: antdConfig.style || false, // Use CSS-in-JS by default in Ant Design 5
          theme: antdConfig.theme || {},
          configProvider: {
            prefixCls: 'ant',
            ...antdConfig.configProvider,
          },
          compact: antdConfig.compact || false,
          dark: antdConfig.dark || false,
        },
        // Ant Design Pro components
        proComponents: this.config.layout
          ? {
              ProLayout: true,
              ProTable: true,
              ProForm: true,
              ProCard: true,
              ProDescriptions: true,
              ProSkeleton: true,
            }
          : false,
      }),
    };
  }

  async setupQiankunIntegration() {
    if (!this.config.qiankun) return null;

    const qiankunConfig = typeof this.config.qiankun === 'object' ? this.config.qiankun : {};

    return {
      name: 'umi-qiankun',
      setup: () => ({
        enabled: true,
        role: qiankunConfig.master ? 'master' : 'slave',
        master: qiankunConfig.master
          ? {
              apps: qiankunConfig.master.apps || [],
              sandbox: qiankunConfig.master.sandbox !== false,
              prefetch: qiankunConfig.master.prefetch !== false,
              // Runtime configuration
              runtime: {
                registerMicroApps: true,
                start: true,
                setDefaultMountApp: true,
                runAfterFirstMounted: true,
              },
            }
          : undefined,
        slave: qiankunConfig.slave || { enable: true },
      }),
    };
  }

  async setupRequestIntegration() {
    if (!this.config.request) return null;

    const requestConfig = typeof this.config.request === 'object' ? this.config.request : {};

    return {
      name: 'umi-request',
      setup: () => ({
        enabled: true,
        config: {
          dataField: requestConfig.dataField || 'data',
          // Default request configuration
          requestConfig: {
            timeout: 30000,
            errorConfig: {
              errorPage: '/error',
              adaptor: (resData: any) => {
                return {
                  ...resData,
                  success: resData.success,
                  errorMessage: resData.errorMessage || 'Request failed',
                };
              },
            },
            middlewares: [],
            requestInterceptors: [],
            responseInterceptors: [],
          },
        },
        // Export useRequest hook
        exports: {
          useRequest: true,
          request: true,
        },
      }),
    };
  }

  async setupDevelopmentServer() {
    const devServer = this.config.devServer || {};

    return {
      name: 'umi-dev-server',
      setup: () => ({
        port: devServer.port || 8000,
        host: devServer.host || 'localhost',
        https: devServer.https || false,
        proxy: this.config.proxy || {},
        // Umi specific dev server features
        writeToDisk: this.config.writeToDisk || false,
        // MFSU (Module Federation Speed Up)
        mfsu:
          this.config.mfsu !== false
            ? {
                development: {
                  output: './.mfsu-dev',
                },
                production: {
                  output: './.mfsu-prod',
                },
                shared: {
                  react: {
                    singleton: true,
                    requiredVersion: '^18.0.0',
                  },
                },
              }
            : false,
      }),
    };
  }

  async setupBuildConfiguration() {
    return {
      name: 'umi-build',
      setup: () => ({
        define: this.config.define || {},
        externals: this.config.externals || {},
        alias: {
          '@': './src',
          '@@': './.umi',
          ...this.config.alias,
        },
        // Output configuration
        output: {
          path: this.config.outputPath || 'dist',
          publicPath: this.config.publicPath || '/',
          filename: this.config.hash ? '[name].[contenthash].js' : '[name].js',
          chunkFilename: this.config.hash ? '[name].[contenthash].chunk.js' : '[name].chunk.js',
        },
        // Optimization
        optimization: {
          minimize: true,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                priority: 10,
              },
              antd: {
                test: /[\\/]node_modules[\\/]antd/,
                name: 'antd',
                priority: 20,
              },
              umi: {
                test: /[\\/]node_modules[\\/]@umijs/,
                name: 'umi',
                priority: 30,
              },
            },
          },
        },
        // ESBuild for minification
        esbuildMinifyIIFE: this.config.esbuildMinifyIIFE !== false,
      }),
    };
  }

  async setupSSRSupport() {
    if (!this.config.ssr) return null;

    const ssrConfig = typeof this.config.ssr === 'object' ? this.config.ssr : {};

    return {
      name: 'umi-ssr',
      setup: () => ({
        enabled: true,
        mode: ssrConfig.mode || 'stream',
        // SSR specific configuration
        forceInitial: false,
        devServerRender: true,
        // Export static HTML
        exportStatic: this.config.exportStatic
          ? {
              htmlSuffix:
                this.config.exportStatic === true ? false : this.config.exportStatic.htmlSuffix,
              dynamicRoot:
                this.config.exportStatic === true ? false : this.config.exportStatic.dynamicRoot,
              extraRoutePaths: async () => {
                // Return extra paths to generate
                return [];
              },
            }
          : false,
      }),
    };
  }

  async setupModelIntegration() {
    if (!this.config.model) return null;

    const modelConfig = typeof this.config.model === 'object' ? this.config.model : {};

    return {
      name: 'umi-model',
      setup: () => ({
        enabled: true,
        config: {
          extraModels: modelConfig.extraModels || [],
        },
        // Model discovery
        discovery: {
          directory: 'src/models',
          pattern: '**/*.{ts,tsx,js,jsx}',
          ignore: ['**/*.d.ts', '**/*.test.{ts,tsx,js,jsx}'],
        },
        // Auto-generate model exports
        exports: {
          useModel: true,
        },
      }),
    };
  }

  async setupLocaleIntegration() {
    if (!this.config.locale) return null;

    const localeConfig = typeof this.config.locale === 'object' ? this.config.locale : {};

    return {
      name: 'umi-locale',
      setup: () => ({
        enabled: true,
        config: {
          default: localeConfig.default || 'en-US',
          baseSeparator: localeConfig.baseSeparator || '-',
          antd: localeConfig.antd !== false,
          title: localeConfig.title !== false,
          baseNavigator: localeConfig.baseNavigator !== false,
        },
        // Locale file discovery
        discovery: {
          directory: 'src/locales',
          pattern: '*.{ts,js,json}',
        },
        // Auto-generate locale exports
        exports: {
          useIntl: true,
          getLocale: true,
          setLocale: true,
          getAllLocales: true,
        },
      }),
    };
  }

  // Generate UMI configuration file content
  generateConfigFile(): string {
    return `import { defineConfig } from '@umijs/max';

export default defineConfig({
  npmClient: '${this.config.npmClient || 'pnpm'}',
  ${this.config.base ? `base: '${this.config.base}',` : ''}
  ${this.config.publicPath ? `publicPath: '${this.config.publicPath}',` : ''}
  ${this.config.outputPath ? `outputPath: '${this.config.outputPath}',` : ''}
  ${this.config.hash !== undefined ? `hash: ${this.config.hash},` : ''}
  
  ${this.config.routes ? `routes: ${JSON.stringify(this.config.routes, null, 2)},` : ''}
  
  ${this.config.dva ? `dva: ${JSON.stringify(this.config.dva, null, 2)},` : ''}
  ${this.config.antd ? `antd: ${JSON.stringify(this.config.antd, null, 2)},` : ''}
  ${this.config.request ? `request: ${JSON.stringify(this.config.request, null, 2)},` : ''}
  ${this.config.layout ? `layout: ${JSON.stringify(this.config.layout, null, 2)},` : ''}
  ${this.config.qiankun ? `qiankun: ${JSON.stringify(this.config.qiankun, null, 2)},` : ''}
  ${this.config.locale ? `locale: ${JSON.stringify(this.config.locale, null, 2)},` : ''}
  ${this.config.model ? `model: ${JSON.stringify(this.config.model, null, 2)},` : ''}
  
  ${this.config.mfsu !== undefined ? `mfsu: ${JSON.stringify(this.config.mfsu)},` : ''}
  ${this.config.proxy ? `proxy: ${JSON.stringify(this.config.proxy, null, 2)},` : ''}
  
  plugins: [
    ${(this.config.plugins || []).map((p) => `'${p}'`).join(',\n    ')}
  ],
  ${this.config.presets?.length ? `presets: [${this.config.presets.map((p) => `'${p}'`).join(', ')}],` : ''}
});`;
  }

  // Generate app.tsx runtime configuration
  generateRuntimeConfig(): string {
    const imports: string[] = [];
    const exports: string[] = [];

    if (this.config.dva) {
      imports.push("import { getDvaApp } from 'umi';");
      exports.push(`export const dva = {
  config: {
    onError(err: any) {
      console.error('DVA Error:', err);
    },
  },
};`);
    }

    if (this.config.request) {
      exports.push(`export const request = {
  timeout: 30000,
  errorConfig: {
    errorHandler: (error: any) => {
      console.error('Request Error:', error);
    },
    errorThrower: (res: any) => {
      if (!res.success) {
        throw new Error(res.errorMessage || 'Request failed');
      }
    },
  },
};`);
    }

    if (this.config.layout) {
      exports.push(`export const layout = () => {
  return {
    logo: '${this.config.layout === true ? '' : this.config.layout.logo || ''}',
    title: '${this.config.layout === true ? 'Umi App' : this.config.layout.title || 'Umi App'}',
    navTheme: '${this.config.layout === true ? 'dark' : this.config.layout.navTheme || 'dark'}',
    primaryColor: '${this.config.layout === true ? '#1890ff' : this.config.layout.primaryColor || '#1890ff'}',
    layout: '${this.config.layout === true ? 'side' : this.config.layout.layout || 'side'}',
    contentWidth: '${this.config.layout === true ? 'Fluid' : this.config.layout.contentWidth || 'Fluid'}',
    fixedHeader: ${this.config.layout === true ? false : this.config.layout.fixedHeader || false},
    fixSiderbar: ${this.config.layout === true ? true : this.config.layout.fixSiderbar || true},
  };
};`);
    }

    if (this.config.qiankun?.master) {
      exports.push(`export const qiankun = {
  apps: ${JSON.stringify(this.config.qiankun.master.apps)},
  sandbox: ${this.config.qiankun.master.sandbox !== false},
  prefetch: ${this.config.qiankun.master.prefetch !== false},
};`);
    }

    return `${imports.join('\n')}

${exports.join('\n\n')}`;
  }

  async initialize() {
    const integrations = await Promise.all([
      this.setupCore(),
      this.setupPluginSystem(),
      this.setupRouting(),
      this.setupDvaIntegration(),
      this.setupAntDesignIntegration(),
      this.setupQiankunIntegration(),
      this.setupRequestIntegration(),
      this.setupModelIntegration(),
      this.setupLocaleIntegration(),
      this.setupDevelopmentServer(),
      this.setupBuildConfiguration(),
      this.setupSSRSupport(),
    ]);

    return integrations.filter(Boolean);
  }

  // Plugin management methods
  registerPlugin(name: string, plugin: any) {
    this.plugins.set(name, plugin);
  }

  getPlugin(name: string) {
    return this.plugins.get(name);
  }

  // Runtime configuration management
  setRuntimeConfig(key: string, value: any) {
    this.runtimeConfig[key] = value;
  }

  getRuntimeConfig() {
    return this.runtimeConfig;
  }

  // Helper methods for common UMI patterns
  createModel(namespace: string, model: any) {
    return {
      namespace,
      state: model.state || {},
      effects: model.effects || {},
      reducers: model.reducers || {},
      subscriptions: model.subscriptions || {},
    };
  }

  createRoute(path: string, component: string, options: Partial<UmiRoute> = {}): UmiRoute {
    return {
      path,
      component,
      ...options,
    };
  }

  createProLayoutConfig(config: Partial<LayoutConfig> = {}): LayoutConfig {
    return {
      name: 'Umi App',
      logo: '/logo.svg',
      theme: 'pro',
      locale: true,
      navTheme: 'dark',
      primaryColor: '#1890ff',
      layout: 'side',
      contentWidth: 'Fluid',
      fixedHeader: false,
      fixSiderbar: true,
      headerHeight: 48,
      siderWidth: 208,
      ...config,
    };
  }

  // Get CLI commands for UMI
  getCliCommands() {
    return {
      dev: 'umi dev',
      build: 'umi build',
      setup: 'umi setup',
      generate: 'umi generate',
      plugin: 'umi plugin',
      help: 'umi help',
      version: 'umi version',
      config: 'umi config',
      preview: 'umi preview',
    };
  }

  // Generate convention-based file structure
  generateFileStructure() {
    return {
      'src/pages': 'Convention-based routing pages',
      'src/layouts': 'Layout components',
      'src/models': 'DVA models',
      'src/locales': 'i18n locale files',
      'src/services': 'API service files',
      'src/utils': 'Utility functions',
      'src/components': 'Shared components',
      'src/wrappers': 'Route wrappers',
      'src/access.ts': 'Access control configuration',
      'src/app.tsx': 'Runtime configuration',
      '.umirc.ts': 'UMI configuration',
      mock: 'Mock API data',
    };
  }
}
