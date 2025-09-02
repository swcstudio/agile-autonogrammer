/**
 * Re.Pack + RSpeedy Example Components
 *
 * Real-world examples of using Re.Pack with RSpeedy for mobile development
 */

import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { useRspeedy } from '../../../hooks/use-rspeedy';
import { Platform } from '../../index';
import {
  ABTestModuleLoader,
  ConditionalModuleLoader,
  ModuleFederationLoader,
  PerformanceMonitor,
  RepackProvider,
  usePreloadModules,
} from './index';

// Complete example of Re.Pack + RSpeedy mobile app
export function RepackRspeedyMobileApp() {
  const rspeedy = useRspeedy();

  const repackConfig = {
    moduleFederation: {
      name: 'mobileApp',
      remotes: {
        'shared-components': 'http://localhost:3001/remoteEntry.js',
        'analytics-module': 'http://localhost:3002/remoteEntry.js',
        'payment-module': 'http://localhost:3003/remoteEntry.js',
      },
      exposes: {
        './MobileNavigation': './src/components/Navigation',
        './MobileAuth': './src/components/Auth',
        './RSpeedy': './src/hooks/use-rspeedy',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-native': { singleton: true },
        '@tanstack/react-query': { singleton: true },
        '@tanstack/react-router': { singleton: true },
      },
    },
    codesplitting: {
      enabled: true,
      chunkLoadTimeout: 30000,
      maxParallelRequests: 5,
    },
    optimization: {
      bundleAnalyzer: true,
      treeShaking: true,
      minification: Platform.OS !== 'web',
    },
  };

  return (
    <RepackProvider
      config={repackConfig}
      enableDevtools={process.env.NODE_ENV === 'development'}
      onPerformanceData={(metrics) => {
        console.log('Performance metrics:', metrics);
      }}
    >
      <div className="mobile-app min-h-screen bg-gray-50">
        {/* Performance Monitor (development only) */}
        {process.env.NODE_ENV === 'development' && <PerformanceMonitor position="bottom-right" />}

        {/* Main App Content */}
        <MobileAppContent />
      </div>
    </RepackProvider>
  );
}

// Main app content with federated modules
function MobileAppContent() {
  const [currentPage, setCurrentPage] = useState('home');

  // Preload critical modules
  usePreloadModules(
    [
      { remoteName: 'shared-components', moduleName: './Navigation' },
      { remoteName: 'shared-components', moduleName: './Button' },
    ],
    { preloadOnMount: true, priority: 'high' }
  );

  return (
    <div className="flex flex-col h-screen">
      {/* Header with federated navigation */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <ModuleFederationLoader
          remoteName="shared-components"
          moduleName="./Navigation"
          props={{
            currentPage,
            onPageChange: setCurrentPage,
            items: [
              { id: 'home', label: 'Home', icon: '🏠' },
              { id: 'products', label: 'Products', icon: '📦' },
              { id: 'profile', label: 'Profile', icon: '👤' },
            ],
          }}
          fallback={FallbackNavigation}
          loadingComponent={NavigationSkeleton}
        />
      </header>

      {/* Main content area */}
      <main className="flex-1 overflow-hidden">
        <PageRouter currentPage={currentPage} />
      </main>

      {/* Footer with analytics */}
      <footer className="bg-white border-t border-gray-200 p-4">
        <ConditionalModuleLoader
          featureFlag="analytics-enabled"
          remoteName="analytics-module"
          moduleName="./Footer"
          fallbackComponent={SimpleFooter}
        />
      </footer>
    </div>
  );
}

// Page router with federated modules
function PageRouter({ currentPage }: { currentPage: string }) {
  const pageConfig = {
    home: {
      remoteName: 'shared-components',
      moduleName: './HomePage',
      preload: true,
    },
    products: {
      remoteName: 'shared-components',
      moduleName: './ProductsPage',
      preload: false,
    },
    profile: {
      remoteName: 'shared-components',
      moduleName: './ProfilePage',
      preload: false,
    },
  };

  const config = pageConfig[currentPage as keyof typeof pageConfig];

  if (!config) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
          <p className="text-gray-600">The requested page could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      key={currentPage}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <ModuleFederationLoader
        remoteName={config.remoteName}
        moduleName={config.moduleName}
        preload={config.preload}
        props={{
          isActive: true,
          analytics: {
            page: currentPage,
            timestamp: Date.now(),
          },
        }}
        errorComponent={PageErrorFallback}
        loadingComponent={PageLoadingSkeleton}
        timeout={10000}
        retryAttempts={2}
      />
    </motion.div>
  );
}

// Example of A/B testing with payment modules
function PaymentSection() {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Payment Options</h2>

      <ABTestModuleLoader
        testName="payment-flow-v2"
        variants={[
          {
            name: 'control',
            remoteName: 'payment-module',
            moduleName: './PaymentFormV1',
            weight: 0.5,
          },
          {
            name: 'variant',
            remoteName: 'payment-module',
            moduleName: './PaymentFormV2',
            weight: 0.5,
          },
        ]}
        props={{
          onPaymentComplete: (result: any) => {
            console.log('Payment completed:', result);
          },
          currency: 'USD',
          amount: 99.99,
        }}
      />
    </div>
  );
}

// Example of progressive enhancement with shopping cart
function ShoppingCartExample() {
  // Base cart implementation
  const BaseCart = ({ items }: { items: any[] }) => (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="font-semibold mb-2">Shopping Cart</h3>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span>{item.name}</span>
            <span>${item.price}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Shopping Cart</h2>

      {/* Progressive enhancement: try to load enhanced cart, fallback to base */}
      <ProgressiveEnhancementLoader
        baseComponent={BaseCart}
        enhancedRemoteName="shared-components"
        enhancedModuleName="./EnhancedShoppingCart"
        props={{
          items: [
            { id: 1, name: 'Product 1', price: 29.99 },
            { id: 2, name: 'Product 2', price: 49.99 },
          ],
          onUpdateQuantity: (id: number, quantity: number) => {
            console.log('Update quantity:', id, quantity);
          },
          onRemoveItem: (id: number) => {
            console.log('Remove item:', id);
          },
        }}
        timeout={3000}
      />
    </div>
  );
}

// Example of feature flag-based module loading
function FeatureBasedModules() {
  return (
    <div className="space-y-4 p-4">
      {/* Chat support - only load if feature is enabled */}
      <ConditionalModuleLoader
        featureFlag="chat-support"
        remoteName="shared-components"
        moduleName="./ChatWidget"
        fallbackComponent={() => (
          <div className="text-sm text-gray-500">Chat support is not available</div>
        )}
      />

      {/* Advanced analytics - only for premium users */}
      <ConditionalModuleLoader
        featureFlag="premium-analytics"
        remoteName="analytics-module"
        moduleName="./AdvancedDashboard"
        fallbackComponent={() => (
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900">Upgrade for Advanced Analytics</h3>
            <p className="text-sm text-blue-700">
              Get detailed insights with our premium analytics dashboard.
            </p>
          </div>
        )}
      />
    </div>
  );
}

// Fallback components
function FallbackNavigation({ items, currentPage, onPageChange }: any) {
  return (
    <nav className="flex space-x-4 p-4">
      {items.map((item: any) => (
        <button
          key={item.id}
          onClick={() => onPageChange(item.id)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
            currentPage === item.id
              ? 'bg-blue-100 text-blue-900'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function NavigationSkeleton() {
  return (
    <div className="animate-pulse p-4">
      <div className="flex space-x-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-20 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
  );
}

function PageLoadingSkeleton() {
  return (
    <div className="animate-pulse p-4 space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
      </div>
    </div>
  );
}

function PageErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">😵</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Page</h2>
        <p className="text-gray-600 mb-4">
          {error.message || 'An unexpected error occurred while loading this page.'}
        </p>
        <button
          onClick={retry}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

function SimpleFooter() {
  return (
    <div className="text-center text-sm text-gray-500">
      © 2024 Mobile App. Built with Re.Pack + RSpeedy.
    </div>
  );
}

// Import the required component from utils
const { ProgressiveEnhancementLoader } = require('./utils');

// Example of RSpeedy-specific optimizations
export function RSpeedyOptimizedComponents() {
  const { isInitialized, currentPlatform, bridgeToNative } = useRspeedy();

  useEffect(() => {
    if (isInitialized && currentPlatform !== 'web') {
      // Register native modules for federated components
      bridgeToNative('ModuleFederation', 'registerRemotes', {
        remotes: ['shared-components', 'analytics-module', 'payment-module'],
      });
    }
  }, [isInitialized, currentPlatform, bridgeToNative]);

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-xl font-semibold">RSpeedy Optimized Components</h2>

      {/* Native bridge integration example */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-2">Native Integration</h3>
        <p className="text-sm text-gray-600 mb-3">
          These components use RSpeedy's native bridge for optimal performance.
        </p>

        <ModuleFederationLoader
          remoteName="shared-components"
          moduleName="./NativeOptimizedList"
          props={{
            data: Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` })),
            renderItem: ({ item }: any) => (
              <div className="p-2 border-b border-gray-200">{item.name}</div>
            ),
            virtualizeThreshold: 100,
            useNativeScrolling: currentPlatform !== 'web',
          }}
          showLoadTime={process.env.NODE_ENV === 'development'}
        />
      </div>

      {/* Performance-optimized image gallery */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-2">Optimized Media</h3>

        <ModuleFederationLoader
          remoteName="shared-components"
          moduleName="./MediaGallery"
          props={{
            images: [
              { id: 1, url: '/api/images/1.jpg', alt: 'Image 1' },
              { id: 2, url: '/api/images/2.jpg', alt: 'Image 2' },
              { id: 3, url: '/api/images/3.jpg', alt: 'Image 3' },
            ],
            lazyLoad: true,
            webpSupport: true,
            nativeImageCache: currentPlatform !== 'web',
          }}
          preload={false}
        />
      </div>
    </div>
  );
}

// Example configuration for different environments
export const ExampleConfigurations = {
  development: {
    moduleFederation: {
      name: 'mobileApp',
      remotes: {
        'shared-components': 'http://localhost:3001/remoteEntry.js',
        'analytics-module': 'http://localhost:3002/remoteEntry.js',
      },
    },
    codesplitting: { enabled: false },
    optimization: { bundleAnalyzer: true },
  },

  production: {
    moduleFederation: {
      name: 'mobileApp',
      remotes: {
        'shared-components': 'https://cdn.example.com/shared/remoteEntry.js',
        'analytics-module': 'https://cdn.example.com/analytics/remoteEntry.js',
      },
    },
    codesplitting: { enabled: true },
    optimization: {
      bundleAnalyzer: false,
      treeShaking: true,
      minification: true,
    },
  },
};
