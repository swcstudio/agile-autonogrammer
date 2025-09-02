export interface TailwindConfig {
  content: string[];
  theme: TailwindThemeConfig;
  plugins: TailwindPlugin[];
  darkMode: 'media' | 'class' | 'selector' | false;
  important: boolean | string;
  prefix: string;
  separator: string;
  safelist: TailwindSafelist[];
  blocklist: string[];
  corePlugins: Record<string, boolean> | string[];
  future: TailwindFutureConfig;
  experimental: TailwindExperimentalConfig;
}

export interface TailwindThemeConfig {
  screens: Record<string, string>;
  colors: Record<string, any>;
  spacing: Record<string, string>;
  animation: Record<string, string>;
  keyframes: Record<string, Record<string, any>>;
  fontFamily: Record<string, string[]>;
  fontSize: Record<string, [string, any?]>;
  fontWeight: Record<string, string>;
  lineHeight: Record<string, string>;
  letterSpacing: Record<string, string>;
  textColor: Record<string, any>;
  backgroundColor: Record<string, any>;
  borderColor: Record<string, any>;
  borderRadius: Record<string, string>;
  borderWidth: Record<string, string>;
  boxShadow: Record<string, string>;
  opacity: Record<string, string>;
  zIndex: Record<string, string>;
  extend: Partial<TailwindThemeConfig>;
}

export interface TailwindPlugin {
  name: string;
  plugin: any;
  options?: Record<string, any>;
}

export interface TailwindSafelist {
  pattern: RegExp;
  variants?: string[];
}

export interface TailwindFutureConfig {
  hoverOnlyWhenSupported: boolean;
  respectDefaultRingColorOpacity: boolean;
  disableColorOpacityUtilitiesByDefault: boolean;
  relativeContentPathsByDefault: boolean;
}

export interface TailwindExperimentalConfig {
  optimizeUniversalDefaults: boolean;
  matchVariant: boolean;
}

export interface TailwindCSSConfig {
  version: '4.0';
  features: {
    containerQueries: boolean;
    nesting: boolean;
    customMedia: boolean;
    oklab: boolean;
    relativeLuminance: boolean;
    trigonometricFunctions: boolean;
    exponentialFunctions: boolean;
    steppedValueFunctions: boolean;
  };
  performance: {
    jit: boolean;
    purge: boolean;
    optimization: boolean;
    caching: boolean;
  };
}

export class TailwindIntegration {
  private config: TailwindConfig;
  private cssConfig: TailwindCSSConfig;

  constructor(config: TailwindConfig, cssConfig?: TailwindCSSConfig) {
    this.config = config;
    this.cssConfig = cssConfig || this.getDefaultCSSConfig();
  }

  async setupTailwindCSS() {
    return {
      name: 'tailwind-css',
      setup: () => ({
        tailwind: this.config,
        css: this.cssConfig,
        features: {
          utilityFirst: true,
          responsiveDesign: true,
          darkMode: this.config.darkMode !== false,
          customization: true,
          jitMode: true,
          purgeCSS: true,
          prefixing: !!this.config.prefix,
          important: !!this.config.important,
          containerQueries: this.cssConfig.features.containerQueries,
          nesting: this.cssConfig.features.nesting,
          customMedia: this.cssConfig.features.customMedia,
        },
        newFeatures: {
          oklab: this.cssConfig.features.oklab,
          relativeLuminance: this.cssConfig.features.relativeLuminance,
          trigonometricFunctions: this.cssConfig.features.trigonometricFunctions,
          exponentialFunctions: this.cssConfig.features.exponentialFunctions,
          steppedValueFunctions: this.cssConfig.features.steppedValueFunctions,
        },
      }),
      plugins: [
        'tailwindcss',
        '@tailwindcss/typography',
        '@tailwindcss/forms',
        '@tailwindcss/aspect-ratio',
        '@tailwindcss/container-queries',
      ],
      dependencies: ['tailwindcss', 'autoprefixer', 'postcss'],
    };
  }

  async setupJITMode() {
    return {
      name: 'tailwind-jit',
      setup: () => ({
        jit: {
          enabled: true,
          mode: 'jit',
          purge: this.config.content,
          features: {
            onDemandGeneration: true,
            fastBuild: true,
            smallerBundle: true,
            arbitraryValues: true,
            arbitraryProperties: true,
            arbitraryVariants: true,
            stackedVariants: true,
          },
        },
        performance: {
          buildTime: 'significantly faster',
          bundleSize: 'smaller',
          developmentExperience: 'instant',
          hotReload: 'fast',
        },
      }),
    };
  }

  async setupResponsiveDesign() {
    return {
      name: 'tailwind-responsive',
      setup: () => ({
        responsive: {
          screens: this.config.theme.screens,
          breakpoints: {
            sm: '640px',
            md: '768px',
            lg: '1024px',
            xl: '1280px',
            '2xl': '1536px',
          },
          features: {
            mobileFirst: true,
            customBreakpoints: true,
            containerQueries: this.cssConfig.features.containerQueries,
            orientationQueries: true,
            printStyles: true,
            motionQueries: true,
          },
        },
        utilities: {
          display: 'block, inline-block, flex, grid, etc.',
          flexbox: 'justify-center, items-center, flex-wrap, etc.',
          grid: 'grid-cols-12, gap-4, etc.',
          spacing: 'p-4, m-2, space-x-4, etc.',
          sizing: 'w-full, h-screen, max-w-md, etc.',
          typography: 'text-lg, font-bold, leading-tight, etc.',
        },
      }),
    };
  }

  async setupDarkMode() {
    return {
      name: 'tailwind-dark-mode',
      setup: () => ({
        darkMode: {
          strategy: this.config.darkMode,
          enabled: this.config.darkMode !== false,
          features: {
            classStrategy: this.config.darkMode === 'class',
            mediaStrategy: this.config.darkMode === 'media',
            selectorStrategy: this.config.darkMode === 'selector',
            systemPreference: true,
            toggle: true,
            persistence: true,
          },
        },
        implementation: {
          class: 'dark:bg-gray-900 dark:text-white',
          media: '@media (prefers-color-scheme: dark)',
          selector: '[data-theme="dark"]',
          javascript: 'document.documentElement.classList.toggle("dark")',
        },
      }),
    };
  }

  async setupCustomization() {
    return {
      name: 'tailwind-customization',
      setup: () => ({
        customization: {
          theme: this.config.theme,
          extend: this.config.theme.extend,
          features: {
            customColors: true,
            customSpacing: true,
            customFonts: true,
            customAnimations: true,
            customComponents: true,
            customUtilities: true,
            customVariants: true,
            customPlugins: true,
          },
        },
        plugins: this.config.plugins,
        extensibility: {
          addUtilities: 'plugin(({ addUtilities }) => { ... })',
          addComponents: 'plugin(({ addComponents }) => { ... })',
          addBase: 'plugin(({ addBase }) => { ... })',
          addVariant: 'plugin(({ addVariant }) => { ... })',
          matchUtilities: 'plugin(({ matchUtilities }) => { ... })',
          matchComponents: 'plugin(({ matchComponents }) => { ... })',
        },
      }),
    };
  }

  async setupPerformanceOptimization() {
    return {
      name: 'tailwind-performance',
      setup: () => ({
        performance: {
          jit: this.cssConfig.performance.jit,
          purge: this.cssConfig.performance.purge,
          optimization: this.cssConfig.performance.optimization,
          caching: this.cssConfig.performance.caching,
          features: {
            treeshaking: true,
            minification: true,
            compression: true,
            bundleSplitting: true,
            lazyLoading: true,
            criticalCSS: true,
            inlining: true,
            prefetching: true,
          },
        },
        strategies: {
          contentPurging: this.config.content,
          safelist: this.config.safelist,
          blocklist: this.config.blocklist,
          dynamicContent: 'regex patterns',
          whitelisting: 'specific classes',
        },
      }),
    };
  }

  async setupIntegrations() {
    return {
      name: 'tailwind-integrations',
      setup: () => ({
        frameworks: {
          react: {
            setup: 'npm install tailwindcss postcss autoprefixer',
            config: 'tailwind.config.js',
            import:
              '@import "tailwindcss/base"; @import "tailwindcss/components"; @import "tailwindcss/utilities";',
          },
          nextjs: {
            setup: 'built-in support',
            config: 'tailwind.config.js',
            css: 'globals.css',
          },
          remix: {
            setup: 'npm install tailwindcss',
            config: 'tailwind.config.js',
            css: 'app/styles/tailwind.css',
          },
          vite: {
            setup: 'npm install tailwindcss postcss autoprefixer',
            config: 'postcss.config.js',
            plugin: '@vitejs/plugin-react',
          },
        },
        buildTools: {
          webpack: 'postcss-loader',
          rollup: 'rollup-plugin-postcss',
          parcel: 'built-in support',
          rspack: 'postcss-loader',
          esbuild: 'esbuild-plugin-postcss',
        },
        editors: {
          vscode: 'Tailwind CSS IntelliSense',
          intellij: 'Tailwind CSS plugin',
          neovim: 'tailwindcss-colorizer-cmp.nvim',
          sublime: 'LSP-tailwindcss',
        },
      }),
    };
  }

  async setupDesignSystem() {
    return {
      name: 'tailwind-design-system',
      setup: () => ({
        designSystem: {
          tokens: {
            colors: this.config.theme.colors,
            spacing: this.config.theme.spacing,
            typography: {
              fontFamily: this.config.theme.fontFamily,
              fontSize: this.config.theme.fontSize,
              fontWeight: this.config.theme.fontWeight,
              lineHeight: this.config.theme.lineHeight,
              letterSpacing: this.config.theme.letterSpacing,
            },
            shadows: this.config.theme.boxShadow,
            borders: {
              radius: this.config.theme.borderRadius,
              width: this.config.theme.borderWidth,
              color: this.config.theme.borderColor,
            },
          },
          components: {
            buttons: 'btn, btn-primary, btn-secondary',
            forms: 'input, select, textarea, checkbox, radio',
            navigation: 'nav, breadcrumb, pagination',
            feedback: 'alert, toast, modal, tooltip',
            layout: 'container, grid, flex, stack',
          },
          patterns: {
            cardPattern: 'bg-white rounded-lg shadow-md p-6',
            buttonPattern: 'px-4 py-2 rounded-md font-medium transition-colors',
            inputPattern: 'border border-gray-300 rounded-md px-3 py-2 focus:ring-2',
            modalPattern: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center',
          },
        },
      }),
    };
  }

  private getDefaultCSSConfig(): TailwindCSSConfig {
    return {
      version: '4.0',
      features: {
        containerQueries: true,
        nesting: true,
        customMedia: true,
        oklab: true,
        relativeLuminance: true,
        trigonometricFunctions: true,
        exponentialFunctions: true,
        steppedValueFunctions: true,
      },
      performance: {
        jit: true,
        purge: true,
        optimization: true,
        caching: true,
      },
    };
  }

  async initialize() {
    const integrations = await Promise.all([
      this.setupTailwindCSS(),
      this.setupJITMode(),
      this.setupResponsiveDesign(),
      this.setupDarkMode(),
      this.setupCustomization(),
      this.setupPerformanceOptimization(),
      this.setupIntegrations(),
      this.setupDesignSystem(),
    ]);

    return integrations.filter(Boolean);
  }

  getDefaultConfig(): TailwindConfig {
    return {
      content: [
        './src/**/*.{js,ts,jsx,tsx}',
        './app/**/*.{js,ts,jsx,tsx}',
        './pages/**/*.{js,ts,jsx,tsx}',
        './components/**/*.{js,ts,jsx,tsx}',
      ],
      theme: {
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1536px',
        },
        colors: {
          transparent: 'transparent',
          current: 'currentColor',
          white: '#ffffff',
          black: '#000000',
          gray: {
            50: '#f9fafb',
            100: '#f3f4f6',
            200: '#e5e7eb',
            300: '#d1d5db',
            400: '#9ca3af',
            500: '#6b7280',
            600: '#4b5563',
            700: '#374151',
            800: '#1f2937',
            900: '#111827',
          },
        },
        spacing: {
          px: '1px',
          0: '0px',
          0.5: '0.125rem',
          1: '0.25rem',
          1.5: '0.375rem',
          2: '0.5rem',
          2.5: '0.625rem',
          3: '0.75rem',
          3.5: '0.875rem',
          4: '1rem',
          5: '1.25rem',
          6: '1.5rem',
          7: '1.75rem',
          8: '2rem',
          9: '2.25rem',
          10: '2.5rem',
          11: '2.75rem',
          12: '3rem',
          14: '3.5rem',
          16: '4rem',
          20: '5rem',
          24: '6rem',
          28: '7rem',
          32: '8rem',
          36: '9rem',
          40: '10rem',
          44: '11rem',
          48: '12rem',
          52: '13rem',
          56: '14rem',
          60: '15rem',
          64: '16rem',
          72: '18rem',
          80: '20rem',
          96: '24rem',
        },
        animation: {
          none: 'none',
          spin: 'spin 1s linear infinite',
          ping: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
          pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          bounce: 'bounce 1s infinite',
        },
        keyframes: {
          spin: {
            to: { transform: 'rotate(360deg)' },
          },
          ping: {
            '75%, 100%': { transform: 'scale(2)', opacity: '0' },
          },
          pulse: {
            '50%': { opacity: '.5' },
          },
          bounce: {
            '0%, 100%': {
              transform: 'translateY(-25%)',
              animationTimingFunction: 'cubic-bezier(0.8,0,1,1)',
            },
            '50%': {
              transform: 'none',
              animationTimingFunction: 'cubic-bezier(0,0,0.2,1)',
            },
          },
        },
        fontFamily: {
          sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
          serif: ['ui-serif', 'Georgia', 'serif'],
          mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
        },
        fontSize: {
          xs: ['0.75rem', { lineHeight: '1rem' }],
          sm: ['0.875rem', { lineHeight: '1.25rem' }],
          base: ['1rem', { lineHeight: '1.5rem' }],
          lg: ['1.125rem', { lineHeight: '1.75rem' }],
          xl: ['1.25rem', { lineHeight: '1.75rem' }],
          '2xl': ['1.5rem', { lineHeight: '2rem' }],
          '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
          '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
          '5xl': ['3rem', { lineHeight: '1' }],
          '6xl': ['3.75rem', { lineHeight: '1' }],
          '7xl': ['4.5rem', { lineHeight: '1' }],
          '8xl': ['6rem', { lineHeight: '1' }],
          '9xl': ['8rem', { lineHeight: '1' }],
        },
        fontWeight: {
          thin: '100',
          extralight: '200',
          light: '300',
          normal: '400',
          medium: '500',
          semibold: '600',
          bold: '700',
          extrabold: '800',
          black: '900',
        },
        lineHeight: {
          3: '.75rem',
          4: '1rem',
          5: '1.25rem',
          6: '1.5rem',
          7: '1.75rem',
          8: '2rem',
          9: '2.25rem',
          10: '2.5rem',
          none: '1',
          tight: '1.25',
          snug: '1.375',
          normal: '1.5',
          relaxed: '1.625',
          loose: '2',
        },
        letterSpacing: {
          tighter: '-0.05em',
          tight: '-0.025em',
          normal: '0em',
          wide: '0.025em',
          wider: '0.05em',
          widest: '0.1em',
        },
        textColor: {},
        backgroundColor: {},
        borderColor: {},
        borderRadius: {
          none: '0px',
          sm: '0.125rem',
          DEFAULT: '0.25rem',
          md: '0.375rem',
          lg: '0.5rem',
          xl: '0.75rem',
          '2xl': '1rem',
          '3xl': '1.5rem',
          full: '9999px',
        },
        borderWidth: {
          DEFAULT: '1px',
          0: '0px',
          2: '2px',
          4: '4px',
          8: '8px',
        },
        boxShadow: {
          sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
          xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
          none: 'none',
        },
        opacity: {
          0: '0',
          5: '0.05',
          10: '0.1',
          20: '0.2',
          25: '0.25',
          30: '0.3',
          40: '0.4',
          50: '0.5',
          60: '0.6',
          70: '0.7',
          75: '0.75',
          80: '0.8',
          90: '0.9',
          95: '0.95',
          100: '1',
        },
        zIndex: {
          0: '0',
          10: '10',
          20: '20',
          30: '30',
          40: '40',
          50: '50',
          auto: 'auto',
        },
        extend: {},
      },
      plugins: [],
      darkMode: 'class',
      important: false,
      prefix: '',
      separator: ':',
      safelist: [],
      blocklist: [],
      corePlugins: {},
      future: {
        hoverOnlyWhenSupported: false,
        respectDefaultRingColorOpacity: false,
        disableColorOpacityUtilitiesByDefault: false,
        relativeContentPathsByDefault: false,
      },
      experimental: {
        optimizeUniversalDefaults: false,
        matchVariant: false,
      },
    };
  }

  getTypeDefinitions() {
    return `
      interface TailwindConfig {
        content: string[];
        theme: TailwindThemeConfig;
        plugins: TailwindPlugin[];
        darkMode: 'media' | 'class' | 'selector' | false;
        important: boolean | string;
        prefix: string;
        separator: string;
        safelist: TailwindSafelist[];
        blocklist: string[];
        corePlugins: Record<string, boolean> | string[];
        future: TailwindFutureConfig;
        experimental: TailwindExperimentalConfig;
      }

      declare namespace Tailwind {
        function config(config: TailwindConfig): void;
        function plugin(plugin: (api: any) => void, config?: any): any;
      }
    `;
  }
}
