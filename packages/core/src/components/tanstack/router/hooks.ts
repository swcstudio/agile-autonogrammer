import {
  type LinkProps,
  type NavigateOptions,
  RouteMatch,
  useChildMatches,
  useLinkProps,
  useLoaderData,
  useLoaderDeps,
  useLocation,
  useMatch,
  useMatches,
  useNavigate,
  useParams,
  useParentMatches,
  useRouteContext,
  useRouter,
  useRouterState,
  useSearch,
} from '@tanstack/react-router';
import React from 'react';

// Enhanced navigation hook with history tracking
export function useTypedNavigate() {
  const navigate = useNavigate();
  const [navigationHistory, setNavigationHistory] = React.useState<string[]>([]);

  const enhancedNavigate = React.useCallback(
    (options: NavigateOptions) => {
      const currentPath = window.location.pathname;
      setNavigationHistory((prev) => [...prev.slice(-9), currentPath]);
      return navigate(options);
    },
    [navigate]
  );

  return {
    navigate: enhancedNavigate,
    goBack: () => {
      if (navigationHistory.length > 0) {
        const previousPath = navigationHistory[navigationHistory.length - 1];
        setNavigationHistory((prev) => prev.slice(0, -1));
        navigate({ to: previousPath });
      } else {
        window.history.back();
      }
    },
    canGoBack: navigationHistory.length > 0,
    history: navigationHistory,
  };
}

// Type-safe params hook
export function useTypedParams<T extends Record<string, any>>(): T {
  return useParams({ strict: false }) as T;
}

// Type-safe search params hook
export function useTypedSearch<T extends Record<string, any>>(): T {
  return useSearch({ strict: false }) as T;
}

// Enhanced search params with setters
export function useSearchParams<T extends Record<string, any>>() {
  const search = useTypedSearch<T>();
  const navigate = useNavigate();
  const location = useLocation();

  const setSearchParams = React.useCallback(
    (updater: Partial<T> | ((prev: T) => Partial<T>)) => {
      const newSearch = typeof updater === 'function' ? updater(search) : updater;

      navigate({
        to: location.pathname,
        search: {
          ...search,
          ...newSearch,
        },
        replace: true,
      });
    },
    [search, navigate, location.pathname]
  );

  const clearSearchParams = React.useCallback(
    (keys?: (keyof T)[]) => {
      if (keys) {
        const newSearch = { ...search };
        keys.forEach((key) => delete newSearch[key]);
        navigate({
          to: location.pathname,
          search: newSearch,
          replace: true,
        });
      } else {
        navigate({
          to: location.pathname,
          search: {},
          replace: true,
        });
      }
    },
    [search, navigate, location.pathname]
  );

  return {
    searchParams: search,
    setSearchParams,
    clearSearchParams,
  };
}

// Breadcrumb hook
export interface BreadcrumbItem {
  label: string;
  path: string;
  params?: Record<string, any>;
}

export function useBreadcrumbs(): BreadcrumbItem[] {
  const matches = useMatches();

  return React.useMemo(() => {
    const breadcrumbs: BreadcrumbItem[] = [];

    matches.forEach((match) => {
      const context = match.context as any;
      if (context?.breadcrumb) {
        breadcrumbs.push({
          label:
            typeof context.breadcrumb === 'function'
              ? context.breadcrumb(match.params)
              : context.breadcrumb,
          path: match.pathname,
          params: match.params,
        });
      }
    });

    return breadcrumbs;
  }, [matches]);
}

// Active link hook
export function useIsActive(
  to: string,
  options?: {
    exact?: boolean;
    includeSearch?: boolean;
    includeHash?: boolean;
  }
): boolean {
  const location = useLocation();
  const { exact = false, includeSearch = false, includeHash = false } = options || {};

  return React.useMemo(() => {
    const currentPath = location.pathname;
    const currentSearch = includeSearch ? location.search : '';
    const currentHash = includeHash ? location.hash : '';
    const currentFullPath = `${currentPath}${currentSearch}${currentHash}`;

    if (exact) {
      return currentFullPath === to;
    }

    return currentFullPath.startsWith(to);
  }, [location, to, exact, includeSearch, includeHash]);
}

// Route announcer for accessibility
export function useRouteAnnouncer() {
  const location = useLocation();

  React.useEffect(() => {
    const announcer =
      document.getElementById('route-announcer') ||
      (() => {
        const el = document.createElement('div');
        el.id = 'route-announcer';
        el.setAttribute('aria-live', 'assertive');
        el.setAttribute('aria-atomic', 'true');
        el.style.position = 'absolute';
        el.style.left = '-10000px';
        el.style.width = '1px';
        el.style.height = '1px';
        el.style.overflow = 'hidden';
        document.body.appendChild(el);
        return el;
      })();

    const title = document.title || 'New page';
    announcer.textContent = `Navigated to ${title}`;

    return () => {
      announcer.textContent = '';
    };
  }, [location]);
}

// Prompt hook for unsaved changes
export function usePrompt(message: string | ((location: any) => string | boolean), when = true) {
  const router = useRouter();

  React.useEffect(() => {
    if (!when) return;

    const unblock = router.history.block((tx) => {
      const response = typeof message === 'function' ? message(tx.location) : message;

      if (response === true) {
        return;
      }

      const confirmMessage =
        typeof response === 'string' ? response : 'Are you sure you want to leave?';

      if (window.confirm(confirmMessage)) {
        unblock();
        tx.retry();
      }
    });

    return unblock;
  }, [router, message, when]);
}

// Route prefetch hook
export function useRoutePrefetch() {
  const router = useRouter();

  return React.useCallback(
    (to: string, options?: { delay?: number }) => {
      const timeoutId = setTimeout(() => {
        router.preloadRoute({ to }).catch(console.error);
      }, options?.delay || 0);

      return () => clearTimeout(timeoutId);
    },
    [router]
  );
}

// Enhanced link props with prefetch
export function useEnhancedLinkProps<T extends string | undefined = undefined>(
  props: LinkProps<T> & {
    prefetch?: boolean;
    prefetchDelay?: number;
  }
) {
  const { prefetch = true, prefetchDelay = 50, ...linkProps } = props;
  const baseLinkProps = useLinkProps(linkProps);
  const routePrefetch = useRoutePrefetch();

  const enhancedProps = React.useMemo(() => {
    if (!prefetch) return baseLinkProps;

    return {
      ...baseLinkProps,
      onMouseEnter: (e: React.MouseEvent) => {
        baseLinkProps.onMouseEnter?.(e);
        if (!e.defaultPrevented && linkProps.to) {
          routePrefetch(linkProps.to as string, { delay: prefetchDelay });
        }
      },
      onFocus: (e: React.FocusEvent) => {
        baseLinkProps.onFocus?.(e);
        if (!e.defaultPrevented && linkProps.to) {
          routePrefetch(linkProps.to as string, { delay: prefetchDelay });
        }
      },
    };
  }, [baseLinkProps, prefetch, prefetchDelay, linkProps.to, routePrefetch]);

  return enhancedProps;
}

// Route transition hook
export function useRouteTransition() {
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const location = useLocation();
  const previousLocation = React.useRef(location);

  React.useEffect(() => {
    if (previousLocation.current.pathname !== location.pathname) {
      setIsTransitioning(true);
      const timeout = setTimeout(() => setIsTransitioning(false), 300);
      previousLocation.current = location;
      return () => clearTimeout(timeout);
    }
  }, [location]);

  return {
    isTransitioning,
    location,
    previousLocation: previousLocation.current,
  };
}

// Re-export commonly used hooks
export {
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
};
