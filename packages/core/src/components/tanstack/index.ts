// TanStack Query exports
export * from './query';
export * as TanStackQuery from './query';

// TanStack Router exports
export * from './router';
export * as TanStackRouter from './router';

// TanStack Table exports
export * from './table';
export * as TanStackTable from './table';

// TanStack Form exports
export * from './form';
export * as TanStackForm from './form';

// TanStack Virtual exports
export * from './virtual';
export * as TanStackVirtual from './virtual';

// TanStack Store exports
export * from './store';
export * as TanStackStore from './store';

// TanStack Ranger exports
export * from './ranger';
export * as TanStackRanger from './ranger';

import { QueryClient } from '@tanstack/react-query';
import type { Router } from '@tanstack/react-router';
// Combined provider for all TanStack products
import type React from 'react';
import type { QueryProvider, QueryProviderProps } from './query';
import { RouterProvider, RouterProviderProps } from './router';

export interface TanStackProviderProps {
  children: React.ReactNode;
  queryConfig?: QueryProviderProps['config'];
  router?: Router<any, any>;
  enableDevtools?: boolean;
}

export const TanStackProvider: React.FC<TanStackProviderProps> = ({
  children,
  queryConfig,
  router,
  enableDevtools = true,
}) => {
  // If router is provided, use its context for QueryClient
  const queryClient = router?.options.context?.queryClient || new QueryClient();

  return (
    <QueryProvider 
      config={queryConfig} 
      enableDevtools={enableDevtools}
    >
      {router ? (
        <RouterProvider router={router}>
          {children}
        </RouterProvider>
      ) : (
        children
      )}
    </QueryProvider>
  );
};

// Utility to create a fully configured TanStack setup
export function createTanStackApp<TRouteTree = any>(config: {
  queryConfig?: QueryProviderProps['config'];
  routerConfig?: Parameters<typeof createTypedRouter>[0];
}) {
  const queryClient = new QueryClient(config.queryConfig);
  
  const router = config.routerConfig 
    ? createTypedRouter({
        ...config.routerConfig,
        context: {
          ...config.routerConfig.context,
          queryClient,
        },
      })
    : undefined;

  return {
    queryClient,
    router,
    Provider: ({ children }: { children: React.ReactNode }) => (
      <TanStackProvider
        queryConfig={config.queryConfig}
        router={router}
      >
        {children}
      </TanStackProvider>
    ),
  };
}

// Helper imports
import { createTypedRouter } from './router';