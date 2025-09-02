import { assert, assertEquals, assertExists } from 'https://deno.land/std@0.201.0/assert/mod.ts';
import { type ParetoConfig, ParetoIntegration } from '../pareto.ts';

const mockConfig: ParetoConfig = {
  streaming: true,
  ssr: true,
  criticalCSS: true,
  preload: true,
  compression: true,
  caching: true,
  optimization: true,
  analytics: true,
  edge: {
    enabled: true,
    provider: 'cloudflare',
    regions: ['us-east-1', 'eu-west-1'],
  },
  ai: {
    predictivePrefetch: true,
    dynamicPriority: true,
    performancePrediction: true,
    anomalyDetection: true,
  },
  experimental: {
    resumability: false,
    islandArchitecture: true,
    rsc: true,
    partialPrerendering: true,
  },
};

Deno.test('ParetoIntegration - should initialize with all integrations', async () => {
  const pareto = new ParetoIntegration(mockConfig);
  const integrations = await pareto.initialize();

  assertExists(integrations);
  assert(integrations.length > 0);

  // Check for base integrations
  const integrationNames = integrations.map((i) => i.name);
  assert(integrationNames.includes('pareto-streaming'));
  assert(integrationNames.includes('pareto-progressive-hydration'));
  assert(integrationNames.includes('pareto-selective-hydration'));
  assert(integrationNames.includes('pareto-resource-optimization'));
  assert(integrationNames.includes('pareto-performance-monitoring'));
  assert(integrationNames.includes('pareto-cache-optimization'));

  // Check for advanced integrations
  assert(integrationNames.includes('pareto-edge-ssr'));
  assert(integrationNames.includes('pareto-ai-optimization'));
  assert(integrationNames.includes('pareto-island-architecture'));
  assert(integrationNames.includes('pareto-rsc'));
  assert(integrationNames.includes('pareto-advanced-streaming'));
  assert(integrationNames.includes('pareto-multi-region-cache'));
});

Deno.test('ParetoIntegration - should setup streaming with correct configuration', async () => {
  const pareto = new ParetoIntegration(mockConfig);
  const streamingSetup = pareto.setupStreaming();

  assertEquals(streamingSetup.name, 'pareto-streaming');

  const setup = streamingSetup.setup();
  assertEquals(setup.ssr, true);
  assertEquals(setup.streaming, true);
  assertEquals(setup.criticalCSS, true);

  assert(setup.features.serverSideRendering);
  assert(setup.features.streamingSSR);
  assert(setup.features.progressiveHydration);
  assert(setup.features.selectiveHydration);
});

Deno.test('ParetoIntegration - should setup edge SSR correctly', async () => {
  const pareto = new ParetoIntegration(mockConfig);
  const edgeSetup = await pareto.setupEdgeSSR();

  assertEquals(edgeSetup.name, 'pareto-edge-ssr');

  const setup = edgeSetup.setup();
  assertEquals(setup.provider, 'cloudflare');
  assertEquals(setup.runtime, 'edge');
  assertExists(setup.regions);
  assert(setup.features.geolocation);
  assert(setup.optimization.staticGeneration);
});

Deno.test('ParetoIntegration - should setup AI optimization', async () => {
  const pareto = new ParetoIntegration(mockConfig);
  const aiSetup = await pareto.setupAIPoweredOptimization();

  assertEquals(aiSetup.name, 'pareto-ai-optimization');

  const setup = aiSetup.setup();
  assert(setup.predictivePrefetch.enabled);
  assertEquals(setup.predictivePrefetch.model, 'navigation-predictor-v2');
  assert(setup.dynamicPriority.enabled);
  assert(setup.performanceForecasting.enabled);
  assert(setup.anomalyDetection.enabled);
});

Deno.test('ParetoIntegration - should setup island architecture', async () => {
  const pareto = new ParetoIntegration(mockConfig);
  const islandSetup = await pareto.setupIslandArchitecture();

  assertEquals(islandSetup.name, 'pareto-island-architecture');

  const setup = islandSetup.setup();
  assertExists(setup.islands);
  assert(setup.islands.length > 0);

  const headerIsland = setup.islands.find((i: any) => i.name === 'header');
  assertExists(headerIsland);
  assertEquals(headerIsland.hydration, 'immediate');
  assertEquals(headerIsland.selector, '[data-island="header"]');
});

Deno.test('ParetoIntegration - should setup React Server Components', async () => {
  const pareto = new ParetoIntegration(mockConfig);
  const rscSetup = await pareto.setupReactServerComponents();

  assertEquals(rscSetup.name, 'pareto-rsc');

  const setup = rscSetup.setup();
  assert(setup.streaming);
  assert(setup.flight.enabled);
  assertEquals(setup.flight.serialization, 'binary');
  assert(setup.flight.compression);
  assertExists(setup.boundaries.client);
  assertExists(setup.boundaries.server);
});

Deno.test('ParetoIntegration - should setup advanced streaming', async () => {
  const pareto = new ParetoIntegration(mockConfig);
  const streamingSetup = await pareto.setupAdvancedStreaming();

  assertEquals(streamingSetup.name, 'pareto-advanced-streaming');

  const setup = streamingSetup.setup();
  assert(setup.react18.renderToPipeableStream);
  assert(setup.react18.suspense.boundaries);
  assert(setup.react18.concurrent.enabled);
  assert(setup.react18.concurrent.timeSlicing);
  assertEquals(setup.react18.concurrent.priorityLevels, 5);
});

Deno.test('ParetoIntegration - should provide streaming API', () => {
  const pareto = new ParetoIntegration(mockConfig);
  const api = pareto.getStreamingAPI();

  assertExists(api.renderToReadableStream);
  assertExists(api.renderToString);
  assertExists(api.hydrateRoot);
  assertExists(api.hydrateIsland);
  assertExists(api.renderWithSuspense);
});

Deno.test('ParetoIntegration - should create readable stream', () => {
  const pareto = new ParetoIntegration(mockConfig);
  const api = pareto.getStreamingAPI();

  // Mock React element
  const mockElement = { type: 'div', props: {}, key: null } as any;
  const stream = api.renderToReadableStream(mockElement);

  assertExists(stream);
  assert(stream instanceof ReadableStream);
});

Deno.test('ParetoIntegration - should handle progressive hydration', () => {
  const pareto = new ParetoIntegration(mockConfig);
  const api = pareto.getStreamingAPI();

  // Mock container and element
  const mockContainer = { tagName: 'DIV' } as any;
  const mockElement = { type: 'div', props: {}, key: null } as any;

  const hydration = api.hydrateRoot(mockContainer, mockElement, {
    priority: 'high',
    scheduler: 'priority-based',
  });

  assertExists(hydration.root);
  assertExists(hydration.startHydration);
  assertExists(hydration.root.render);
  assertExists(hydration.root.unmount);
});

Deno.test('ParetoIntegration - should provide type definitions', () => {
  const pareto = new ParetoIntegration(mockConfig);
  const typeDefs = pareto.getTypeDefinitions();

  assert(typeDefs.includes('interface StreamingConfig'));
  assert(typeDefs.includes('interface EdgeConfig'));
  assert(typeDefs.includes('interface AIConfig'));
  assert(typeDefs.includes('interface IslandConfig'));
  assert(typeDefs.includes('interface RSCConfig'));
  assert(typeDefs.includes('declare namespace Pareto'));
});
