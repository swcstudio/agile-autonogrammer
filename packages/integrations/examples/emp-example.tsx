import React from 'react';
import { EMPRuntimeProvider, RemoteComponent, useEMP } from '../components/EMPRuntimeProvider.tsx';
import { KatalystProvider } from '../components/KatalystProvider.tsx';
import { EMPIntegration } from './emp.ts';
import type { EMPConfig } from './emp.ts';

// Example EMP configuration for a marketing website with micro-frontends
const empConfig: EMPConfig = {
  name: 'marketing-host',
  port: 8080,
  framework: 'react',
  mode: 'development',
  remotes: {
    header: 'http://localhost:8001/emp.js',
    footer: 'http://localhost:8002/emp.js',
    products: 'http://localhost:8003/emp.js',
    blog: 'http://localhost:8004/emp.js',
    analytics: 'http://localhost:8005/emp.js',
  },
  exposes: {
    './Layout': './src/components/Layout',
    './Theme': './src/components/Theme',
    './Utils': './src/utils/index',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^19.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
    '@tanstack/react-query': { singleton: true },
    zustand: { singleton: true },
  },
  runtime: {
    errorBoundary: true,
    preload: ['header', 'footer'],
    timeout: 5000,
    retries: 3,
    fallback: {
      Header: './src/components/fallback/Header',
      Footer: './src/components/fallback/Footer',
    },
  },
  optimization: {
    splitChunks: true,
    treeshaking: true,
    minify: true,
  },
};

// Example: Loading component for micro-frontends
const MicroFrontendLoader = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100px',
      background: '#f0f0f0',
    }}
  >
    <div>Loading micro-frontend...</div>
  </div>
);

// Example: Marketing website shell application
export function MarketingShellApp() {
  const katalystConfig = {
    variant: 'core' as const,
    features: [],
    plugins: [],
    integrations: [
      {
        name: 'emp',
        type: 'framework' as const,
        enabled: true,
        config: empConfig,
      },
    ],
  };

  return (
    <KatalystProvider config={katalystConfig}>
      <EMPRuntimeProvider
        config={empConfig}
        loadingComponent={MicroFrontendLoader}
        errorBoundary={true}
      >
        <MarketingLayout />
      </EMPRuntimeProvider>
    </KatalystProvider>
  );
}

// Example: Layout with remote components
function MarketingLayout() {
  return (
    <div className="marketing-app">
      {/* Remote header component */}
      <RemoteComponent
        remoteName="header"
        moduleName="./Header"
        fallback={() => <div>Default Header</div>}
        props={{
          logo: '/logo.png',
          links: ['Products', 'Blog', 'About', 'Contact'],
        }}
      />

      <main className="main-content">
        {/* Remote product showcase */}
        <RemoteComponent
          remoteName="products"
          moduleName="./ProductGrid"
          props={{
            category: 'featured',
            limit: 8,
          }}
        />

        {/* Remote blog section */}
        <RemoteComponent
          remoteName="blog"
          moduleName="./LatestPosts"
          props={{
            count: 3,
            showThumbnails: true,
          }}
        />
      </main>

      {/* Remote footer component */}
      <RemoteComponent
        remoteName="footer"
        moduleName="./Footer"
        fallback={() => <div>Default Footer</div>}
        props={{
          copyright: '2024 Marketing Inc.',
          socialLinks: ['twitter', 'linkedin', 'github'],
        }}
      />
    </div>
  );
}

// Example: Dynamic remote loading with hooks
export function DynamicRemoteExample() {
  const { loadRemoteComponent, isInitialized } = useEMP({
    enableMetrics: true,
    onError: (error) => {
      console.error('EMP Error:', error);
    },
  });

  const [DynamicComponent, setDynamicComponent] = React.useState<React.ComponentType | null>(null);

  React.useEffect(() => {
    if (isInitialized) {
      loadRemoteComponent('products', './ProductDetail')
        .then((module) => setDynamicComponent(() => module.default))
        .catch(console.error);
    }
  }, [isInitialized, loadRemoteComponent]);

  if (!DynamicComponent) {
    return <div>Loading dynamic component...</div>;
  }

  return <DynamicComponent productId="123" />;
}

// Example: Team-based micro-frontend configuration
export function createTeamConfig(teamName: string, port: number, modules: string[]) {
  const empIntegration = new EMPIntegration({
    name: `team-${teamName}`,
    port,
    framework: 'react',
    mode: 'production',
    remotes: {},
    exposes: modules.reduce(
      (acc, module) => {
        acc[`./${module}`] = `./src/components/${module}`;
        return acc;
      },
      {} as Record<string, string>
    ),
    shared: {
      react: { singleton: true, requiredVersion: '^19.0.0' },
      'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
    },
  });

  return empIntegration.getEMPConfig();
}

// Example: Multi-team workspace setup
export async function setupMarketingWorkspace() {
  const teams = [
    {
      name: 'branding',
      path: './teams/branding',
      port: 8001,
      modules: ['Header', 'Footer', 'Theme'],
    },
    {
      name: 'products',
      path: './teams/products',
      port: 8003,
      modules: ['ProductGrid', 'ProductDetail', 'Search'],
    },
    {
      name: 'content',
      path: './teams/content',
      port: 8004,
      modules: ['BlogList', 'BlogPost', 'Author'],
    },
    { name: 'analytics', path: './teams/analytics', port: 8005, modules: ['Tracker', 'Dashboard'] },
  ];

  const empIntegration = new EMPIntegration(empConfig);
  const workspace = empIntegration.configureMarketingTeamsWorkspace(teams);

  return workspace;
}

// Example: Server-side rendering with EMP
export function EMPSSRExample() {
  // This would be used in a Next.js or Remix application
  const empConfig: EMPConfig = {
    name: 'ssr-host',
    port: 3000,
    framework: 'react',
    mode: 'production',
    remotes: {
      components: 'https://cdn.example.com/components/emp.js',
    },
    exposes: {},
    shared: {
      react: { singleton: true, eager: true },
      'react-dom': { singleton: true, eager: true },
    },
    runtime: {
      errorBoundary: false, // Handle errors at SSR level
      timeout: 2000, // Faster timeout for SSR
    },
  };

  return empConfig;
}
