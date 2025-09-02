// Provider exports
export { RouterProvider, createTypedRouter } from './RouterProvider';
export type { RouterProviderProps, RouterConfig } from './RouterProvider';

// Route creation exports
export {
  createTypedRoute,
  createTypedRootRoute,
  createLazyRoute,
  createRouteGroup,
  createAuthenticatedRoute,
  createPrefetchRoute,
  createBreadcrumbRoute,
  createFileRoute,
  redirect,
  z,
} from './createRoute';
export type { TypedRouteConfig, BreadcrumbItem } from './createRoute';

// Hook exports
export {
  useTypedNavigate,
  useTypedParams,
  useTypedSearch,
  useSearchParams,
  useBreadcrumbs,
  useIsActive,
  useRouteAnnouncer,
  usePrompt,
  useRoutePrefetch,
  useEnhancedLinkProps,
  useRouteTransition,
  // Re-exported hooks
  useParams,
  useSearch,
  useLocation,
  useRouter,
  useRouterState,
  useMatch,
  useMatches,
  useChildMatches,
  useParentMatches,
  useRouteContext,
  useLoaderData,
  useLoaderDeps,
} from './hooks';

// Component exports
export {
  Link,
  NavLink,
  Breadcrumbs,
  ScrollRestoration,
  RouteErrorBoundary,
  NotFound,
  Loading,
  Outlet,
  Navigate,
} from './components';
export type {
  TypedLinkProps,
  NavLinkProps,
  BreadcrumbsProps,
  RouteErrorBoundaryProps,
  NotFoundProps,
  LoadingProps,
  NavigateOptions,
} from './components';

// Utility exports
export * from './utils';

// Re-export core types from @tanstack/react-router
export type {
  Router,
  AnyRoute,
  RouteMatch,
  RouteOptions,
  LoaderContext,
  SearchSchemaInput,
  RouteComponent,
  RootRoute,
  Route,
  ParsedLocation,
  RegisteredRouter,
} from '@tanstack/react-router';

// Example route structure
export const createExampleRoutes = () => {
  const rootRoute = createTypedRootRoute({
    component: () => <Outlet />,
  });

  const indexRoute = createTypedRoute(rootRoute, {
    path: '/',
    component: () => <div>Home</div>,
  });

  const aboutRoute = createTypedRoute(rootRoute, {
    path: '/about',
    component: () => <div>About</div>,
  });

  const productRoute = createTypedRoute(rootRoute, {
    path: '/products/$productId',
    component: () => {
      const { productId } = useParams();
      return <div>Product: productId</div>;
    },
    loader: async ({ params }) => {
      // Fetch product data
      return { id: params.productId, name: 'Product Name' };
    },
  });

  const searchRoute = createTypedRoute(rootRoute, {
    path: '/search',
    validateSearch: z.object({
      q: z.string().optional(),
      category: z.string().optional(),
      page: z.number().optional().default(1),
    }).parse,
    component: () => {
      const { q, category, page } = useSearch();
      return <div>Search: qin category(page page)</div>;
    },
  });

  return {
    rootRoute,
    indexRoute,
    aboutRoute,
    productRoute,
    searchRoute,
  };
};

// Helper imports
import type { Outlet } from './components';
import { z } from './createRoute';
import { createTypedRootRoute, createTypedRoute } from './createRoute';
import { useParams, useSearch } from './hooks';