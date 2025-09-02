import { assert, assertEquals, assertExists } from 'https://deno.land/std@0.201.0/assert/mod.ts';
import { type EsmxConfig, EsmxIntegration } from '../esmx.ts';

const mockConfig: EsmxConfig = {
  importMaps: {
    'test-module': 'https://esm.sh/test-module',
  },
  moduleResolution: 'bundler',
  allowImportingTsExtensions: true,
  allowArbitraryExtensions: false,
  resolveJsonModule: true,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  moduleDetection: 'auto',
  hmr: {
    enabled: true,
    port: 3333,
    overlay: true,
  },
  preload: ['/test/module.js'],
  security: {
    sri: true,
    permissions: ['net'],
    sandbox: false,
  },
  performance: {
    profiling: true,
    moduleGraph: true,
    metrics: true,
  },
};

Deno.test('EsmxIntegration - should initialize with all integrations', async () => {
  const esmx = new EsmxIntegration(mockConfig);
  const integrations = await esmx.initialize();

  assertExists(integrations);
  assert(integrations.length > 0);

  // Check for base integrations
  const integrationNames = integrations.map((i) => i.name);
  assert(integrationNames.includes('esmx-esm'));
  assert(integrationNames.includes('esmx-deno'));
  assert(integrationNames.includes('esmx-bun'));
  assert(integrationNames.includes('esmx-web-streams'));

  // Check for advanced integrations
  assert(integrationNames.includes('esmx-hmr'));
  assert(integrationNames.includes('esmx-worker-pool'));
  assert(integrationNames.includes('esmx-module-federation'));
  assert(integrationNames.includes('esmx-wasm'));
  assert(integrationNames.includes('esmx-security'));
  assert(integrationNames.includes('esmx-inspector'));
});

Deno.test('EsmxIntegration - should setup ESM with correct configuration', async () => {
  const esmx = new EsmxIntegration(mockConfig);
  const esmSetup = await esmx.setupESM();

  assertEquals(esmSetup.name, 'esmx-esm');
  assert(esmSetup.plugins.includes('esmx-loader'));
  assert(esmSetup.plugins.includes('esmx-resolver'));
  assert(esmSetup.plugins.includes('esmx-transformer'));
  assert(esmSetup.dependencies.includes('esmx'));
  assert(esmSetup.dependencies.includes('esbuild'));
  assert(esmSetup.dependencies.includes('typescript'));
});

Deno.test('EsmxIntegration - should generate import maps correctly', async () => {
  const esmx = new EsmxIntegration(mockConfig);
  const esmSetup = await esmx.setupESM();
  const { importMaps } = esmSetup.setup();

  assertExists(importMaps.imports);
  assertEquals(importMaps.imports['react'], 'https://esm.sh/react@18');
  assertEquals(importMaps.imports['test-module'], 'https://esm.sh/test-module');
  assertExists(importMaps.scopes);
});

Deno.test('EsmxIntegration - should track module metrics', async () => {
  const esmx = new EsmxIntegration(mockConfig);
  await esmx.initialize();

  // Initially no metrics
  const metrics = esmx.getModuleMetrics('/test/module.js');
  assertEquals(metrics, undefined);

  // Module graph should be initialized
  const graph = esmx.getModuleGraph();
  assertExists(graph.nodes);
  assertExists(graph.edges);
});

Deno.test('EsmxIntegration - should generate Deno config', () => {
  const esmx = new EsmxIntegration(mockConfig);
  const denoConfig = esmx.getDenoConfig();

  assertEquals(denoConfig.compilerOptions.jsx, 'react-jsx');
  assertEquals(denoConfig.compilerOptions.jsxImportSource, 'react');
  assertExists(denoConfig.imports);
  assert(denoConfig.tasks.dev.includes('deno run'));
  assert(denoConfig.exclude.includes('node_modules'));
});

Deno.test('EsmxIntegration - should generate Bun config', () => {
  const esmx = new EsmxIntegration(mockConfig);
  const bunConfig = esmx.getBunConfig();

  assertEquals(bunConfig.name, 'katalyst');
  assertEquals(bunConfig.module, 'index.ts');
  assertEquals(bunConfig.type, 'module');
  assertEquals(bunConfig.devDependencies['bun-types'], 'latest');
});

Deno.test('EsmxIntegration - should provide correct type definitions', () => {
  const esmx = new EsmxIntegration(mockConfig);
  const typeDefs = esmx.getTypeDefinitions();

  assert(typeDefs.includes('interface ImportMap'));
  assert(typeDefs.includes('interface ModuleCache'));
  assert(typeDefs.includes('interface HMRApi'));
  assert(typeDefs.includes('interface ModuleGraph'));
  assert(typeDefs.includes('interface ImportMeta'));
});
