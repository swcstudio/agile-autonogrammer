import { QueryClient } from '@tanstack/react-query';
import {
  type AnyRoute,
  type LoaderContext,
  type RootRoute,
  type Route,
  type RouteComponent,
  type RouteOptions,
  SearchSchemaInput,
  createFileRoute,
  createRootRoute as createTanStackRootRoute,
  createRoute as createTanStackRoute,
} from '@tanstack/react-router';
import type { z } from 'zod';

export interface TypedRouteConfig<
  TParentRoute extends AnyRoute = RootRoute,
  TPath extends string = string,
  TSearchSchema extends Record<string, any> = {},
  TLoaderData = unknown,
  TContext = {},
> {
  path: TPath;
  component?: RouteComponent;
  errorComponent?: RouteComponent<{ error: Error; reset: () => void }>;
  pendingComponent?: RouteComponent;
  notFoundComponent?: RouteComponent;
  loader?: (ctx: LoaderContext<AnyRoute, TSearchSchema, TContext>) => Promise<TLoaderData>;
  beforeLoad?: (ctx: LoaderContext<AnyRoute, TSearchSchema, TContext>) => void | Promise<void>;
  searchSchema?: z.ZodType<TSearchSchema>;
  validateSearch?: (search: Record<string, unknown>) => TSearchSchema;
  preload?: 'intent' | 'render' | false;
  preloadDelay?: number;
  gcTime?: number;
  shouldReload?: boolean | ((ctx: LoaderContext<AnyRoute, TSearchSchema, TContext>) => boolean);
  caseSensitive?: boolean;
  wrapInSuspense?: boolean;
}

// Helper to create typed routes
export function createTypedRoute<
  TParentRoute extends AnyRoute = RootRoute,
  TPath extends string = string,
  TSearchSchema extends Record<string, any> = {},
  TLoaderData = unknown,
  TContext = {},
>(
  parentRoute: TParentRoute,
  config: TypedRouteConfig<TParentRoute, TPath, TSearchSchema, TLoaderData, TContext>
): Route<
  TParentRoute,
  TPath,
  TPath,
  string,
  TSearchSchema,
  TSearchSchema,
  TLoaderData,
  AnyRoute,
  any,
  any,
  any
> {
  const routeOptions: RouteOptions = {
    path: config.path,
    component: config.component,
    errorComponent: config.errorComponent,
    pendingComponent: config.pendingComponent,
    notFoundComponent: config.notFoundComponent,
    loader: config.loader as any,
    beforeLoad: config.beforeLoad as any,
    validateSearch: config.validateSearch || (config.searchSchema?.parse as any),
    preload: config.preload,
    preloadDelay: config.preloadDelay,
    gcTime: config.gcTime,
    shouldReload: config.shouldReload as any,
    caseSensitive: config.caseSensitive,
    wrapInSuspense: config.wrapInSuspense,
  };

  return createTanStackRoute({
    getParentRoute: () => parentRoute,
    ...routeOptions,
  } as any) as any;
}

// Helper to create root route with context
export function createTypedRootRoute<TContext = {}>(config?: {
  component?: RouteComponent;
  errorComponent?: RouteComponent<{ error: Error; reset: () => void }>;
  pendingComponent?: RouteComponent;
  notFoundComponent?: RouteComponent;
  context?: TContext;
}): RootRoute<TContext> {
  return createTanStackRootRoute({
    component: config?.component,
    errorComponent: config?.errorComponent,
    pendingComponent: config?.pendingComponent,
    notFoundComponent: config?.notFoundComponent,
  }) as RootRoute<TContext>;
}

// Helper for lazy routes
export function createLazyRoute<
  TParentRoute extends AnyRoute = RootRoute,
  TPath extends string = string,
  TSearchSchema extends Record<string, any> = {},
  TLoaderData = unknown,
>(
  parentRoute: TParentRoute,
  config: {
    path: TPath;
    importFn: () => Promise<{
      component: RouteComponent;
      loader?: (ctx: LoaderContext<AnyRoute>) => Promise<TLoaderData>;
    }>;
  } & Omit<
    TypedRouteConfig<TParentRoute, TPath, TSearchSchema, TLoaderData>,
    'component' | 'loader'
  >
) {
  return createTypedRoute(parentRoute, {
    ...config,
    component: React.lazy(async () => {
      const module = await config.importFn();
      return { default: module.component };
    }),
    loader: async (ctx) => {
      const module = await config.importFn();
      if (module.loader) {
        return module.loader(ctx);
      }
      return undefined as any;
    },
  });
}

// Helper for route groups
export function createRouteGroup<TParentRoute extends AnyRoute = RootRoute>(
  parentRoute: TParentRoute,
  config: {
    id: string;
    component?: RouteComponent;
  },
  routes: ((parent: Route) => Route)[]
): Route[] {
  const layoutRoute = createTanStackRoute({
    getParentRoute: () => parentRoute,
    id: config.id,
    component: config.component,
  });

  return [layoutRoute, ...routes.map((routeFn) => routeFn(layoutRoute))];
}

// Helper for authenticated routes
export function createAuthenticatedRoute<
  TParentRoute extends AnyRoute = RootRoute,
  TPath extends string = string,
  TSearchSchema extends Record<string, any> = {},
  TLoaderData = unknown,
>(
  parentRoute: TParentRoute,
  config: TypedRouteConfig<TParentRoute, TPath, TSearchSchema, TLoaderData> & {
    authCheck: (ctx: LoaderContext<AnyRoute>) => boolean | Promise<boolean>;
    redirectTo?: string;
  }
) {
  return createTypedRoute(parentRoute, {
    ...config,
    beforeLoad: async (ctx) => {
      const isAuthenticated = await config.authCheck(ctx);
      if (!isAuthenticated) {
        throw redirect({
          to: config.redirectTo || '/login',
          search: {
            redirect: ctx.location.pathname,
          },
        });
      }
      await config.beforeLoad?.(ctx);
    },
  });
}

// Helper for data prefetching
export function createPrefetchRoute<
  TParentRoute extends AnyRoute = RootRoute,
  TPath extends string = string,
  TSearchSchema extends Record<string, any> = {},
  TLoaderData = unknown,
>(
  parentRoute: TParentRoute,
  config: TypedRouteConfig<TParentRoute, TPath, TSearchSchema, TLoaderData> & {
    prefetchQueries?: Array<{
      queryKey: unknown[];
      queryFn: () => Promise<unknown>;
      staleTime?: number;
    }>;
  }
) {
  const queryClient = config.loader ? undefined : new QueryClient();

  return createTypedRoute(parentRoute, {
    ...config,
    loader: async (ctx) => {
      // Prefetch queries if provided
      if (config.prefetchQueries && ctx.context.queryClient) {
        await Promise.all(
          config.prefetchQueries.map((query) =>
            ctx.context.queryClient.prefetchQuery({
              queryKey: query.queryKey,
              queryFn: query.queryFn,
              staleTime: query.staleTime,
            })
          )
        );
      }

      // Run original loader
      if (config.loader) {
        return config.loader(ctx);
      }

      return undefined as any;
    },
  });
}

// Helper for breadcrumb routes
export interface BreadcrumbItem {
  label: string;
  path: string;
  params?: Record<string, any>;
}

export function createBreadcrumbRoute<
  TParentRoute extends AnyRoute = RootRoute,
  TPath extends string = string,
  TSearchSchema extends Record<string, any> = {},
  TLoaderData = unknown,
>(
  parentRoute: TParentRoute,
  config: TypedRouteConfig<TParentRoute, TPath, TSearchSchema, TLoaderData> & {
    breadcrumb: string | ((params: any) => string);
  }
) {
  return createTypedRoute(parentRoute, {
    ...config,
    loader: async (ctx) => {
      // Set breadcrumb in context
      const breadcrumbLabel =
        typeof config.breadcrumb === 'function' ? config.breadcrumb(ctx.params) : config.breadcrumb;

      ctx.context.breadcrumbs = [
        ...(ctx.context.breadcrumbs || []),
        {
          label: breadcrumbLabel,
          path: ctx.location.pathname,
          params: ctx.params,
        },
      ];

      // Run original loader
      if (config.loader) {
        return config.loader(ctx);
      }

      return undefined as any;
    },
  });
}

// Re-export utilities
export { redirect } from '@tanstack/react-router';
export { z } from 'zod';

// Re-export for creating file-based routes
export { createFileRoute };

import React from 'react';
