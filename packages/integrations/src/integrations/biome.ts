export interface BiomeConfig {
  formatter: BiomeFormatterConfig;
  linter: BiomeLinterConfig;
  organizeImports: BiomeOrganizeImportsConfig;
  javascript: BiomeJavaScriptConfig;
  typescript: BiomeTypeScriptConfig;
  json: BiomeJsonConfig;
  css: BiomeCssConfig;
  files: BiomeFilesConfig;
  vcs: BiomeVcsConfig;
}

export interface BiomeFormatterConfig {
  enabled: boolean;
  formatWithErrors: boolean;
  indentStyle: 'tab' | 'space';
  indentWidth: number;
  lineEnding: 'lf' | 'crlf' | 'cr';
  lineWidth: number;
  attributePosition: 'auto' | 'multiline';
  ignore: string[];
}

export interface BiomeLinterConfig {
  enabled: boolean;
  rules: BiomeLinterRules;
  ignore: string[];
}

export interface BiomeLinterRules {
  recommended: boolean;
  all: boolean;
  a11y: Record<string, 'error' | 'warn' | 'info' | 'off'>;
  complexity: Record<string, 'error' | 'warn' | 'info' | 'off'>;
  correctness: Record<string, 'error' | 'warn' | 'info' | 'off'>;
  nursery: Record<string, 'error' | 'warn' | 'info' | 'off'>;
  performance: Record<string, 'error' | 'warn' | 'info' | 'off'>;
  security: Record<string, 'error' | 'warn' | 'info' | 'off'>;
  style: Record<string, 'error' | 'warn' | 'info' | 'off'>;
  suspicious: Record<string, 'error' | 'warn' | 'info' | 'off'>;
}

export interface BiomeOrganizeImportsConfig {
  enabled: boolean;
  ignore: string[];
}

export interface BiomeJavaScriptConfig {
  formatter: {
    enabled: boolean;
    quoteStyle: 'double' | 'single';
    jsxQuoteStyle: 'double' | 'single';
    quoteProperties: 'asNeeded' | 'preserve';
    trailingCommas: 'all' | 'es5' | 'none';
    semicolons: 'always' | 'asNeeded';
    arrowParentheses: 'always' | 'asNeeded';
    bracketSpacing: boolean;
    bracketSameLine: boolean;
  };
  globals: string[];
}

export interface BiomeTypeScriptConfig {
  formatter: {
    enabled: boolean;
    quoteStyle: 'double' | 'single';
    jsxQuoteStyle: 'double' | 'single';
    quoteProperties: 'asNeeded' | 'preserve';
    trailingCommas: 'all' | 'es5' | 'none';
    semicolons: 'always' | 'asNeeded';
    arrowParentheses: 'always' | 'asNeeded';
    bracketSpacing: boolean;
    bracketSameLine: boolean;
  };
}

export interface BiomeJsonConfig {
  formatter: {
    enabled: boolean;
    indentStyle: 'tab' | 'space';
    indentWidth: number;
    lineEnding: 'lf' | 'crlf' | 'cr';
    lineWidth: number;
    trailingCommas: 'none' | 'all';
  };
  parser: {
    allowComments: boolean;
    allowTrailingCommas: boolean;
  };
}

export interface BiomeCssConfig {
  formatter: {
    enabled: boolean;
    indentStyle: 'tab' | 'space';
    indentWidth: number;
    lineEnding: 'lf' | 'crlf' | 'cr';
    lineWidth: number;
    quoteStyle: 'double' | 'single';
  };
  parser: {
    cssModules: boolean;
  };
}

export interface BiomeFilesConfig {
  maxSize: number;
  ignore: string[];
  ignoreUnknown: boolean;
  include: string[];
}

export interface BiomeVcsConfig {
  enabled: boolean;
  clientKind: 'git';
  useIgnoreFile: boolean;
  root: string;
}

export class BiomeIntegration {
  private config: BiomeConfig;

  constructor(config: BiomeConfig) {
    this.config = config;
  }

  setupFormatter() {
    return {
      name: 'biome-formatter',
      setup: () => ({
        formatter: this.config.formatter,
        commands: {
          format: 'biome format',
          formatWrite: 'biome format --write',
          formatStdin: 'biome format --stdin-file-path',
          check: 'biome check',
          checkWrite: 'biome check --write',
        },
        features: {
          fastFormatting: true,
          rustBased: true,
          zeroConfig: true,
          incrementalFormatting: true,
          parallelProcessing: true,
          memoryEfficient: true,
          crossPlatform: true,
          editorIntegration: true,
        },
      }),
      plugins: [
        'biome-formatter-plugin',
        'biome-vscode-extension',
        'biome-intellij-plugin',
        'biome-zed-extension',
      ],
      dependencies: ['@biomejs/biome'],
    };
  }

  setupLinter() {
    return {
      name: 'biome-linter',
      setup: () => ({
        linter: this.config.linter,
        commands: {
          lint: 'biome lint',
          lintWrite: 'biome lint --write',
          check: 'biome check',
          checkWrite: 'biome check --write',
        },
        rules: {
          a11y: this.config.linter.rules.a11y,
          complexity: this.config.linter.rules.complexity,
          correctness: this.config.linter.rules.correctness,
          nursery: this.config.linter.rules.nursery,
          performance: this.config.linter.rules.performance,
          security: this.config.linter.rules.security,
          style: this.config.linter.rules.style,
          suspicious: this.config.linter.rules.suspicious,
        },
        features: {
          fastLinting: true,
          rustBased: true,
          incrementalLinting: true,
          parallelProcessing: true,
          memoryEfficient: true,
          crossPlatform: true,
          editorIntegration: true,
          autoFix: true,
        },
      }),
    };
  }

  setupOrganizeImports() {
    return {
      name: 'biome-organize-imports',
      setup: () => ({
        organizeImports: this.config.organizeImports,
        commands: {
          organize: 'biome check --write',
          organizeStdin: 'biome check --stdin-file-path',
        },
        features: {
          automaticImportSorting: true,
          removeUnusedImports: true,
          groupImports: true,
          sortImports: true,
          mergeImports: true,
        },
      }),
    };
  }

  setupLanguageSupport() {
    return {
      name: 'biome-language-support',
      setup: () => ({
        javascript: this.config.javascript,
        typescript: this.config.typescript,
        json: this.config.json,
        css: this.config.css,
        supportedExtensions: [
          '.js',
          '.jsx',
          '.mjs',
          '.cjs',
          '.ts',
          '.tsx',
          '.mts',
          '.cts',
          '.json',
          '.jsonc',
          '.css',
          '.scss',
          '.sass',
        ],
        features: {
          syntaxHighlighting: true,
          errorReporting: true,
          autoCompletion: true,
          gotoDefinition: true,
          findReferences: true,
          renameSymbol: true,
          codeActions: true,
          diagnostics: true,
        },
      }),
    };
  }

  setupEditorIntegration() {
    return {
      name: 'biome-editor-integration',
      setup: () => ({
        vscode: {
          extension: 'biomejs.biome',
          settings: {
            'biome.enabled': true,
            'biome.rename': true,
            'biome.requireConfigFile': false,
            'editor.defaultFormatter': 'biomejs.biome',
            'editor.formatOnSave': true,
            'editor.codeActionsOnSave': {
              'quickfix.biome': 'explicit',
              'source.organizeImports.biome': 'explicit',
            },
          },
        },
        intellij: {
          plugin: 'com.github.biomejs.intellijbiome',
          settings: {
            enableFormatting: true,
            enableLinting: true,
            enableOrganizeImports: true,
          },
        },
        zed: {
          extension: 'biome',
          settings: {
            formatter: 'biome',
            linter: 'biome',
          },
        },
        neovim: {
          plugin: 'nvim-biome',
          lspConfig: {
            cmd: ['biome', 'lsp-proxy'],
            filetypes: ['javascript', 'typescript', 'json', 'css'],
          },
        },
      }),
    };
  }

  setupContinuousIntegration() {
    return {
      name: 'biome-ci',
      setup: () => ({
        github: {
          workflow: {
            name: 'Biome CI',
            on: ['push', 'pull_request'],
            jobs: {
              biome: {
                'runs-on': 'ubuntu-latest',
                steps: [
                  { uses: 'actions/checkout@v4' },
                  { uses: 'oven-sh/setup-bun@v1' },
                  { run: 'bun install' },
                  { run: 'bunx @biomejs/biome ci' },
                ],
              },
            },
          },
        },
        gitlab: {
          pipeline: {
            stages: ['lint', 'format'],
            biome_check: {
              stage: 'lint',
              script: ['npx @biomejs/biome ci'],
            },
          },
        },
        commands: {
          ci: 'biome ci',
          ciWrite: 'biome ci --write',
          ciChanged: 'biome ci --changed',
        },
      }),
    };
  }

  async initialize() {
    const integrations = await Promise.all([
      this.setupFormatter(),
      this.setupLinter(),
      this.setupOrganizeImports(),
      this.setupLanguageSupport(),
      this.setupEditorIntegration(),
      this.setupContinuousIntegration(),
    ]);

    return integrations.filter(Boolean);
  }

  getDefaultConfig(): BiomeConfig {
    return {
      formatter: {
        enabled: true,
        formatWithErrors: false,
        indentStyle: 'space',
        indentWidth: 2,
        lineEnding: 'lf',
        lineWidth: 80,
        attributePosition: 'auto',
        ignore: ['node_modules/**', 'dist/**', 'build/**'],
      },
      linter: {
        enabled: true,
        rules: {
          recommended: true,
          all: false,
          a11y: {},
          complexity: {},
          correctness: {},
          nursery: {},
          performance: {},
          security: {},
          style: {},
          suspicious: {},
        },
        ignore: ['node_modules/**', 'dist/**', 'build/**'],
      },
      organizeImports: {
        enabled: true,
        ignore: ['node_modules/**'],
      },
      javascript: {
        formatter: {
          enabled: true,
          quoteStyle: 'single',
          jsxQuoteStyle: 'double',
          quoteProperties: 'asNeeded',
          trailingCommas: 'es5',
          semicolons: 'always',
          arrowParentheses: 'always',
          bracketSpacing: true,
          bracketSameLine: false,
        },
        globals: [],
      },
      typescript: {
        formatter: {
          enabled: true,
          quoteStyle: 'single',
          jsxQuoteStyle: 'double',
          quoteProperties: 'asNeeded',
          trailingCommas: 'es5',
          semicolons: 'always',
          arrowParentheses: 'always',
          bracketSpacing: true,
          bracketSameLine: false,
        },
      },
      json: {
        formatter: {
          enabled: true,
          indentStyle: 'space',
          indentWidth: 2,
          lineEnding: 'lf',
          lineWidth: 80,
          trailingCommas: 'none',
        },
        parser: {
          allowComments: true,
          allowTrailingCommas: true,
        },
      },
      css: {
        formatter: {
          enabled: true,
          indentStyle: 'space',
          indentWidth: 2,
          lineEnding: 'lf',
          lineWidth: 80,
          quoteStyle: 'double',
        },
        parser: {
          cssModules: true,
        },
      },
      files: {
        maxSize: 1048576,
        ignore: ['node_modules/**', 'dist/**', 'build/**', '.git/**'],
        ignoreUnknown: false,
        include: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx', '**/*.json', '**/*.css'],
      },
      vcs: {
        enabled: true,
        clientKind: 'git',
        useIgnoreFile: true,
        root: '.',
      },
    };
  }

  getTypeDefinitions() {
    return `
      interface BiomeConfig {
        formatter: BiomeFormatterConfig;
        linter: BiomeLinterConfig;
        organizeImports: BiomeOrganizeImportsConfig;
        javascript: BiomeJavaScriptConfig;
        typescript: BiomeTypeScriptConfig;
        json: BiomeJsonConfig;
        css: BiomeCssConfig;
        files: BiomeFilesConfig;
        vcs: BiomeVcsConfig;
      }

      declare namespace Biome {
        function format(code: string, options?: Record<string, unknown>): Promise<string>;
        function lint(code: string, options?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
        function check(code: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
        function organizeImports(code: string, options?: Record<string, unknown>): Promise<string>;
      }
    `;
  }
}
