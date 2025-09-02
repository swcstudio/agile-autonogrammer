import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

export default [
  // ESM build
  {
    input: 'src/framework.ts',
    output: {
      file: pkg.module,
      format: 'es',
      sourcemap: true
    },
    plugins: [
      resolve({ 
        preferBuiltins: false,
        browser: true 
      }),
      commonjs(),
      typescript({ 
        tsconfig: './tsconfig.build.json',
        declaration: true,
        declarationDir: './dist',
        rootDir: 'src'
      })
    ],
    external: [
      'uuid',
      ...Object.keys(pkg.peerDependencies || {})
    ]
  },
  // CommonJS build
  {
    input: 'src/framework.ts',
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    plugins: [
      resolve({ 
        preferBuiltins: false,
        browser: true 
      }),
      commonjs(),
      typescript({ 
        tsconfig: './tsconfig.build.json',
        declaration: false
      })
    ],
    external: [
      'uuid',
      ...Object.keys(pkg.peerDependencies || {})
    ]
  },
  // WASM Module
  {
    input: 'src/wasm/index.ts',
    output: {
      file: 'dist/wasm/index.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      resolve({ preferBuiltins: false, browser: true }),
      commonjs(),
      typescript({ 
        tsconfig: './tsconfig.build.json',
        declaration: true,
        declarationDir: './dist',
        rootDir: 'src'
      })
    ],
    external: ['uuid']
  },
  // Runtime Module  
  {
    input: 'src/runtime/index.ts',
    output: {
      file: 'dist/runtime/index.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      resolve({ preferBuiltins: false, browser: true }),
      commonjs(),
      typescript({ 
        tsconfig: './tsconfig.build.json',
        declaration: true,
        declarationDir: './dist',
        rootDir: 'src'
      })
    ],
    external: ['uuid']
  }
];