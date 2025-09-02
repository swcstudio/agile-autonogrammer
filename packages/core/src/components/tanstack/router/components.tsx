import {
  type LinkProps,
  Navigate,
  type NavigateOptions,
  Outlet,
  Link as TanStackLink,
} from '@tanstack/react-router';
import React from 'react';
import { cn } from '../../../utils/cn';
import { useEnhancedLinkProps, useIsActive } from './hooks';

// Enhanced Link component with prefetching and styling
export interface TypedLinkProps extends LinkProps {
  className?: string;
  activeClassName?: string;
  inactiveClassName?: string;
  prefetch?: boolean;
  prefetchDelay?: number;
  children: React.ReactNode;
  disabled?: boolean;
}

export const Link = React.forwardRef<HTMLAnchorElement, TypedLinkProps>(
  (
    {
      className,
      activeClassName,
      inactiveClassName,
      prefetch = true,
      prefetchDelay = 50,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isActive = useIsActive(props.to as string, { exact: props.activeOptions?.exact });
    const enhancedProps = useEnhancedLinkProps({ ...props, prefetch, prefetchDelay });

    if (disabled) {
      return (
        <span
          className={cn(
            className,
            'cursor-not-allowed opacity-50',
            isActive && activeClassName,
            !isActive && inactiveClassName
          )}
        >
          {children}
        </span>
      );
    }

    return (
      <TanStackLink
        {...enhancedProps}
        ref={ref}
        className={cn(className, isActive && activeClassName, !isActive && inactiveClassName)}
      >
        {children}
      </TanStackLink>
    );
  }
);

Link.displayName = 'Link';

// NavLink component with active state styling
export interface NavLinkProps extends TypedLinkProps {
  activeProps?: {
    className?: string;
    style?: React.CSSProperties;
    'aria-current'?: 'page' | 'step' | 'location' | 'date' | 'time' | 'true' | 'false';
  };
  pendingProps?: {
    className?: string;
    style?: React.CSSProperties;
  };
}

export const NavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ activeProps, pendingProps, ...props }, ref) => {
    const isActive = useIsActive(props.to as string, { exact: props.activeOptions?.exact });

    return (
      <Link
        {...props}
        ref={ref}
        className={cn(props.className, isActive && activeProps?.className)}
        style={{
          ...props.style,
          ...(isActive && activeProps?.style),
        }}
        aria-current={isActive ? activeProps?.['aria-current'] || 'page' : undefined}
      />
    );
  }
);

NavLink.displayName = 'NavLink';

// Breadcrumbs component
export interface BreadcrumbsProps {
  className?: string;
  separator?: React.ReactNode;
  homeLabel?: string;
  homePath?: string;
  maxItems?: number;
  itemClassName?: string;
  separatorClassName?: string;
  currentClassName?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  className,
  separator = '/',
  homeLabel = 'Home',
  homePath = '/',
  maxItems,
  itemClassName,
  separatorClassName,
  currentClassName,
}) => {
  const matches = useMatches();

  const breadcrumbs = React.useMemo(() => {
    const items = [
      { label: homeLabel, path: homePath },
      ...matches
        .filter((match) => (match.context as any)?.breadcrumb)
        .map((match) => ({
          label:
            typeof (match.context as any).breadcrumb === 'function'
              ? (match.context as any).breadcrumb(match.params)
              : (match.context as any).breadcrumb,
          path: match.pathname,
        })),
    ];

    if (maxItems && items.length > maxItems) {
      const firstItem = items[0];
      const lastItems = items.slice(-(maxItems - 2));
      return [firstItem, { label: '...', path: null }, ...lastItems];
    }

    return items;
  }, [matches, homeLabel, homePath, maxItems]);

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center space-x-2">
        {breadcrumbs.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <span className={cn('mx-2', separatorClassName)} aria-hidden="true">
                {separator}
              </span>
            )}
            {index === breadcrumbs.length - 1 || !item.path ? (
              <span className={cn(itemClassName, currentClassName)} aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link to={item.path} className={itemClassName}>
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

// ScrollRestoration component
export const ScrollRestoration: React.FC<{
  getKey?: (location: any) => string;
}> = ({ getKey }) => {
  const location = useLocation();
  const scrollPositions = React.useRef<Record<string, number>>({});

  React.useEffect(() => {
    const key = getKey ? getKey(location) : location.pathname;

    // Save scroll position before navigating away
    const handleScroll = () => {
      scrollPositions.current[key] = window.scrollY;
    };

    window.addEventListener('scroll', handleScroll);

    // Restore scroll position
    const savedPosition = scrollPositions.current[key];
    if (savedPosition !== undefined) {
      window.scrollTo(0, savedPosition);
    } else {
      window.scrollTo(0, 0);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location, getKey]);

  return null;
};

// RouteErrorBoundary component
export interface RouteErrorBoundaryProps {
  error: Error;
  reset: () => void;
  className?: string;
}

export const RouteErrorBoundary: React.FC<RouteErrorBoundaryProps> = ({
  error,
  reset,
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-center min-h-[400px] p-4', className)}>
      <div className="max-w-md w-full bg-destructive/10 border border-destructive/20 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-destructive mb-2">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={reset}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

// NotFound component
export interface NotFoundProps {
  className?: string;
  title?: string;
  message?: string;
  homeLabel?: string;
  homePath?: string;
}

export const NotFound: React.FC<NotFoundProps> = ({
  className,
  title = '404 - Page Not Found',
  message = "The page you're looking for doesn't exist.",
  homeLabel = 'Go Home',
  homePath = '/',
}) => {
  return (
    <div className={cn('flex items-center justify-center min-h-screen p-4', className)}>
      <div className="text-center">
        <h1 className="text-6xl font-bold text-muted-foreground mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">{title}</h2>
        <p className="text-muted-foreground mb-6">{message}</p>
        <Link
          to={homePath}
          className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          {homeLabel}
        </Link>
      </div>
    </div>
  );
};

// Loading component
export interface LoadingProps {
  className?: string;
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Loading: React.FC<LoadingProps> = ({
  className,
  text = 'Loading...',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 border-2',
    md: 'w-12 h-12 border-4',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <div
        className={cn(
          'border-primary border-t-transparent rounded-full animate-spin',
          sizeClasses[size]
        )}
      />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
};

// Re-export core components
export { Outlet, Navigate };
export type { NavigateOptions };

// Import hooks
import { useLocation, useMatches } from '@tanstack/react-router';
