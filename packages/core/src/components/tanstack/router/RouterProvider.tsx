import type { QueryClient } from '@tanstack/react-query';
import {
  type AnyRoute,
  type RouteMatch,
  type Router,
  type RouterOptions,
  RouterProvider as TanStackRouterProvider,
  createBrowserHistory,
  createHashHistory,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router';
import React, { type ReactNode } from 'react';

export interface RouterProviderProps {
  router: Router<any, any>;
  children?: ReactNode;
}

export interface RouterConfig {
  routeTree: AnyRoute;
  basepath?: string;
  defaultPreload?: 'intent' | 'render' | false;
  defaultPreloadDelay?: number;
  defaultPreloadStaleTime?: number;
  defaultErrorComponent?: React.ComponentType<any>;
  defaultPendingComponent?: React.ComponentType<any>;
  defaultNotFoundComponent?: React.ComponentType<any>;
  queryClient?: QueryClient;
  context?: any;
  historyType?: 'browser' | 'memory' | 'hash';
  initialEntries?: string[];
}

// Default components
const DefaultErrorComponent: React.FC<{ error: Error; reset: () => void }> = ({ error, reset }) => (
  <div className="flex items-center justify-center min-h-screen p-4">
    <div className="max-w-md w-full bg-destructive/10 border border-destructive/20 rounded-lg p-6">
      <h1 className="text-2xl font-bold text-destructive mb-2">Route Error</h1>
      <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
      {process.env.NODE_ENV === 'development' && (
        <details className="mb-4">
          <summary className="cursor-pointer text-xs text-muted-foreground">Stack Trace</summary>
          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">{error.stack}</pre>
        </details>
      )}
      <button
        onClick={reset}
        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
      >
        Try Again
      </button>
    </div>
  </div>
);

const DefaultPendingComponent: React.FC = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Loading route...</p>
    </div>
  </div>
);

const DefaultNotFoundComponent: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen p-4">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-muted-foreground mb-4">404</h1>
      <p className="text-xl mb-2">Page Not Found</p>
      <p className="text-muted-foreground mb-6">The page you're looking for doesn't exist.</p>
      <a
        href="/"
        className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded hover:bg-primary/90"
      >
        Go Home
      </a>
    </div>
  </div>
);

export function createTypedRouter<TRouteTree extends AnyRoute>(
  config: RouterConfig
): Router<TRouteTree, 'never'> {
  // Create history based on type
  const history = (() => {
    switch (config.historyType) {
      case 'memory':
        return createMemoryHistory({
          initialEntries: config.initialEntries || ['/'],
        });
      case 'hash':
        return createHashHistory();
      case 'browser':
      default:
        return createBrowserHistory();
    }
  })();

  // Create router options
  const routerOptions: RouterOptions<TRouteTree, 'never'> = {
    routeTree: config.routeTree as TRouteTree,
    history,
    basepath: config.basepath,
    defaultPreload: config.defaultPreload || 'intent',
    defaultPreloadDelay: config.defaultPreloadDelay || 50,
    defaultPreloadStaleTime: config.defaultPreloadStaleTime || 30_000,
    defaultErrorComponent: config.defaultErrorComponent || DefaultErrorComponent,
    defaultPendingComponent: config.defaultPendingComponent || DefaultPendingComponent,
    defaultNotFoundComponent: config.defaultNotFoundComponent || DefaultNotFoundComponent,
    context: {
      queryClient: config.queryClient,
      ...config.context,
    },
  };

  return createRouter(routerOptions);
}

export const RouterProvider: React.FC<RouterProviderProps> = ({ router, children }) => {
  return <TanStackRouterProvider router={router}>{children}</TanStackRouterProvider>;
};

// Utility hooks for router functionality
export function useRouterState<T = unknown>(selector: (state: Router['state']) => T): T {
  const router = useRouter();
  return React.useSyncExternalStore(
    router.subscribe,
    () => selector(router.state),
    () => selector(router.state)
  );
}

export function useRouter(): Router<any, any> {
  const router = React.useContext(RouterContext);
  if (!router) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return router;
}

// Context for router
const RouterContext = React.createContext<Router<any, any> | null>(null);

// Navigation guards
export interface NavigationGuard {
  canActivate?: (match: RouteMatch) => boolean | Promise<boolean>;
  canDeactivate?: (match: RouteMatch) => boolean | Promise<boolean>;
  redirectTo?: string | ((match: RouteMatch) => string);
}

export function createNavigationGuard(guard: NavigationGuard) {
  return {
    beforeLoad: async ({ location, params }: any) => {
      if (guard.canActivate) {
        const canActivate = await guard.canActivate({ location, params } as any);
        if (!canActivate) {
          if (guard.redirectTo) {
            const redirectPath =
              typeof guard.redirectTo === 'function'
                ? guard.redirectTo({ location, params } as any)
                : guard.redirectTo;
            throw redirect({ to: redirectPath });
          }
          throw new Error('Navigation blocked');
        }
      }
    },
  };
}

// Route meta helpers
export interface RouteMeta {
  title?: string;
  description?: string;
  keywords?: string[];
  requiresAuth?: boolean;
  roles?: string[];
  breadcrumb?: string | ((params: any) => string);
}

export function createRouteMeta(meta: RouteMeta) {
  return {
    meta,
    onLoad: ({ params }: any) => {
      if (meta.title) {
        document.title = meta.title;
      }
      if (meta.description) {
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
          metaDescription.setAttribute('content', meta.description);
        }
      }
      if (meta.keywords) {
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        if (metaKeywords) {
          metaKeywords.setAttribute('content', meta.keywords.join(', '));
        }
      }
    },
  };
}

// Search params utilities
export function createSearchParamsSchema<T extends Record<string, any>>(
  schema: T
): {
  parse: (searchParams: URLSearchParams) => Partial<T>;
  stringify: (params: Partial<T>) => string;
} {
  return {
    parse: (searchParams: URLSearchParams) => {
      const result: any = {};
      for (const [key, value] of searchParams.entries()) {
        if (key in schema) {
          result[key] = value;
        }
      }
      return result;
    },
    stringify: (params: Partial<T>) => {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      }
      return searchParams.toString();
    },
  };
}

// Re-export redirect for guards
export { redirect } from '@tanstack/react-router';
