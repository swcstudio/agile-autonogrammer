import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/hooks/index.ts', 'src/providers/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: [
    'react',
    '@agile/core',
    '@anthropic-ai/sdk',
    'openai',
    '@google-ai/generativelanguage',
    '@huggingface/inference',
  ],
  splitting: true,
  treeshake: true,
});