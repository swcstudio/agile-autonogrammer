declare const process:
  | {
      env: {
        NODE_ENV?: string;
      };
      cwd(): string;
    }
  | undefined;

declare const require:
  | {
      resolve(id: string): string;
    }
  | undefined;

export interface RePackConfig {
  platforms: Array<'ios' | 'android' | 'web' | 'windows' | 'macos'>;
  bundler: 'webpack' | 'rspack' | 'metro';
  devServer: boolean;
  hotReload: boolean;
  codeGeneration: boolean;
  nativeModules: boolean;
  bridgeless: boolean;
  hermes: boolean;
}

export interface PlatformConfig {
  name: string;
  extensions: string[];
  bundler: string;
  devServer: boolean;
  nativeModules: string[];
}

export interface BundlerConfig {
  name: string;
  entry: string;
  output: string;
  resolve: Record<string, any>;
  module: Record<string, any>;
  plugins: any[];
}

export class RePackIntegration {
  private config: RePackConfig;

  constructor(config: RePackConfig) {
    this.config = config;
  }

  async setupReactNative() {
    return {
      name: 'repack-react-native',
      setup: () => ({
        platforms: this.config.platforms || ['ios', 'android', 'web'],
        bundler: this.config.bundler || 'webpack',
        devServer: this.config.devServer || true,
        hotReload: this.config.hotReload || true,
        codeGeneration: this.config.codeGeneration || true,
        nativeModules: this.config.nativeModules || true,
        bridgeless: this.config.bridgeless || false,
        hermes: this.config.hermes || true,
        platformConfigs: this.generatePlatformConfigs(),
        bundlerConfig: this.generateBundlerConfig(),
        features: {
          crossPlatform: true,
          webCompatibility: true,
          nativePerformance: true,
          hotReloading: true,
          codeGeneration: true,
          bridgelessMode: true,
          hermesEngine: true,
          fabricRenderer: true,
        },
      }),
      plugins: [
        '@callstack/repack/webpack-plugin',
        'react-native-webpack-plugin',
        'metro-react-native-babel-preset',
      ],
      dependencies: [
        '@callstack/repack',
        'react-native',
        'react-native-web',
        '@react-native/metro-config',
        'metro-react-native-babel-preset',
      ],
    };
  }

  private generatePlatformConfigs(): PlatformConfig[] {
    return this.config.platforms.map((platform) => ({
      name: platform,
      extensions: this.getPlatformExtensions(platform),
      bundler: this.config.bundler,
      devServer: this.config.devServer,
      nativeModules: this.getPlatformNativeModules(platform),
    }));
  }

  private getPlatformExtensions(platform: string): string[] {
    const baseExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
    const platformExtensions = [
      `.${platform}.ts`,
      `.${platform}.tsx`,
      `.${platform}.js`,
      `.${platform}.jsx`,
      `.native.ts`,
      `.native.tsx`,
      `.native.js`,
      `.native.jsx`,
    ];
    return [...platformExtensions, ...baseExtensions];
  }

  private getPlatformNativeModules(platform: string): string[] {
    const commonModules = [
      'react-native-gesture-handler',
      'react-native-reanimated',
      'react-native-safe-area-context',
      'react-native-screens',
    ];

    const platformSpecific: Record<string, string[]> = {
      ios: ['react-native-ios-context-menu', 'react-native-haptic-feedback'],
      android: ['react-native-android-keyboard-adjust', 'react-native-android-open-settings'],
      web: ['react-native-web', 'react-native-web-hooks'],
    };

    return [...commonModules, ...(platformSpecific[platform] || [])];
  }

  private generateBundlerConfig(): BundlerConfig {
    return {
      name: this.config.bundler,
      entry: './src/index.tsx',
      output: './dist',
      resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: {
          'react-native$': 'react-native-web',
          '@katalyst-react/shared': '../shared/src/index.ts',
          '@katalyst-react/components': '../shared/src/components/index.ts',
          '@katalyst-react/hooks': '../shared/src/hooks/index.ts',
          '@katalyst-react/stores': '../shared/src/stores/index.ts',
          '@katalyst-react/utils': '../shared/src/utils/index.ts',
        },
        fallback: {
          crypto: false,
          stream: false,
          path: false,
          fs: false,
        },
      },
      module: {
        rules: [
          {
            test: /\.(ts|tsx)$/,
            use: [
              {
                loader: 'babel-loader',
                options: {
                  presets: ['module:metro-react-native-babel-preset', '@babel/preset-typescript'],
                  plugins: [
                    'react-native-reanimated/plugin',
                    ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
                  ],
                },
              },
            ],
          },
          {
            test: /\.(js|jsx)$/,
            use: [
              {
                loader: 'babel-loader',
                options: {
                  presets: ['module:metro-react-native-babel-preset'],
                },
              },
            ],
          },
          {
            test: /\.(png|jpg|jpeg|gif|svg)$/,
            type: 'asset/resource',
          },
        ],
      },
      plugins: [],
    };
  }

  async setupWebpackIntegration() {
    return {
      name: 'repack-webpack',
      setup: () => ({
        mode:
          typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'
            ? 'production'
            : 'development',
        entry: {
          index: './src/index.tsx',
        },
        output: {
          path: './dist',
          filename: '[name].[contenthash:8].js',
          chunkFilename: '[name].[contenthash:8].chunk.js',
          publicPath: '/',
          clean: true,
        },
        resolve: {
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
          alias: {
            'react-native$': 'react-native-web',
          },
        },
        module: {
          rules: [
            {
              test: /\.(ts|tsx)$/,
              use: 'babel-loader',
            },
            {
              test: /\.css$/,
              use: ['style-loader', 'css-loader', 'postcss-loader'],
            },
          ],
        },
        plugins: [
          {
            name: 'RepackPlugin',
            options: {
              context: (typeof process !== 'undefined' && process.cwd()) || '.',
              mode:
                typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'
                  ? 'production'
                  : 'development',
              platform: 'web',
              minimize:
                (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') || false,
              devServer: this.config.devServer
                ? {
                    port: 8081,
                    host: 'localhost',
                  }
                : undefined,
            },
          },
        ],
        devServer: this.config.devServer
          ? {
              port: 8081,
              host: 'localhost',
              hot: this.config.hotReload,
              liveReload: true,
              historyApiFallback: true,
            }
          : undefined,
      }),
    };
  }

  async setupMetroIntegration() {
    return {
      name: 'repack-metro',
      setup: () => ({
        transformer: {
          getTransformOptions: async () => ({
            transform: {
              experimentalImportSupport: false,
              inlineRequires: true,
            },
          }),
        },
        resolver: {
          alias: {
            '@katalyst-react/shared': '../shared/src/index.ts',
            '@katalyst-react/components': '../shared/src/components/index.ts',
            '@katalyst-react/hooks': '../shared/src/hooks/index.ts',
            '@katalyst-react/stores': '../shared/src/stores/index.ts',
            '@katalyst-react/utils': '../shared/src/utils/index.ts',
          },
          sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json'],
          assetExts: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'ttf', 'otf', 'woff', 'woff2'],
        },
        serializer: {
          getModulesRunBeforeMainModule: () => [
            (typeof require !== 'undefined' &&
              require.resolve('react-native/Libraries/Core/InitializeCore')) ||
              'react-native/Libraries/Core/InitializeCore',
          ],
        },
        server: {
          port: 8081,
          host: 'localhost',
        },
        watchFolders: [
          './katalyst/shared',
          './katalyst/core',
          './katalyst/remix',
          './katalyst/nextjs',
        ],
      }),
    };
  }

  async setupCodeGeneration() {
    return {
      name: 'repack-codegen',
      setup: () => ({
        enabled: this.config.codeGeneration,
        outputDir: './src/generated',
        generators: {
          components: {
            enabled: true,
            template: 'functional',
            typescript: true,
            props: true,
            styles: true,
          },
          screens: {
            enabled: true,
            navigation: 'react-navigation',
            typescript: true,
            hooks: true,
          },
          services: {
            enabled: true,
            api: 'fetch',
            typescript: true,
            validation: 'typia',
          },
        },
        templates: {
          component: `
            import React from 'react';
            import { View, Text, StyleSheet } from 'react-native';

            interface {{ComponentName}}Props {
            }

            export const {{ComponentName}}: React.FC<{{ComponentName}}Props> = (props) => {
              return (
                <View style={styles.container}>
                  <Text>{{ComponentName}}</Text>
                </View>
              );
            };

            const styles = StyleSheet.create({
              container: {
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center'
              }
            });
          `,
          screen: `
            import React from 'react';
            import { View, Text, StyleSheet } from 'react-native';
            import { useNavigation } from '@react-navigation/native';

            export const {{ScreenName}}Screen: React.FC = () => {
              const navigation = useNavigation();

              return (
                <View style={styles.container}>
                  <Text>{{ScreenName}} Screen</Text>
                </View>
              );
            };

            const styles = StyleSheet.create({
              container: {
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center'
              }
            });
          `,
        },
      }),
    };
  }

  async initialize() {
    const integrations = await Promise.all([
      this.setupReactNative(),
      this.setupWebpackIntegration(),
      this.setupMetroIntegration(),
      this.setupCodeGeneration(),
    ]);

    return integrations.filter(Boolean);
  }

  getCliCommands() {
    return {
      start: 'npx react-native start',
      'start:web': 'npx webpack serve --config webpack.config.js',
      'build:ios': 'npx react-native run-ios',
      'build:android': 'npx react-native run-android',
      'build:web': 'npx webpack --config webpack.config.js',
      bundle: 'npx react-native bundle',
      codegen: 'npx react-native codegen',
    };
  }

  getTypeDefinitions() {
    return `
      interface PlatformConfig {
        name: string;
        extensions: string[];
        bundler: string;
        devServer: boolean;
        nativeModules: string[];
      }

      interface BundlerConfig {
        name: string;
        entry: string;
        output: string;
        resolve: Record<string, any>;
        module: Record<string, any>;
        plugins: any[];
      }

      declare module 'react-native' {
        export * from 'react-native/types';
      }

      declare module '@callstack/repack' {
        export const RepackPlugin: any;
        export const DevServerPlugin: any;
        export const OutputPlugin: any;
      }

      declare module 'react-native-web' {
        export * from 'react-native';
      }
    `;
  }
}
