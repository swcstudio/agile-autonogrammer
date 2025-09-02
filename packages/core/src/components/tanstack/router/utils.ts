import { AnyRoute, type ParsedLocation, type Router } from '@tanstack/react-router';

// Utility to check if a route is active
export function isRouteActive(
  location: ParsedLocation,
  path: string,
  options?: {
    exact?: boolean;
    includeSearch?: boolean;
    includeHash?: boolean;
  }
): boolean {
  const { exact = false, includeSearch = false, includeHash = false } = options || {};

  const currentPath = location.pathname;
  const currentSearch = includeSearch ? location.search : '';
  const currentHash = includeHash ? location.hash : '';
  const currentFullPath = `${currentPath}${currentSearch}${currentHash}`;

  if (exact) {
    return currentFullPath === path;
  }

  return currentFullPath.startsWith(path);
}

// Utility to build search params string
export function buildSearchParams(
  params: Record<string, any>,
  options?: {
    skipNull?: boolean;
    skipEmpty?: boolean;
    arrayFormat?: 'bracket' | 'index' | 'comma' | 'separator';
    arraySeparator?: string;
  }
): string {
  const {
    skipNull = true,
    skipEmpty = true,
    arrayFormat = 'bracket',
    arraySeparator = ',',
  } = options || {};

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (skipNull && value == null) return;
    if (skipEmpty && value === '') return;

    if (Array.isArray(value)) {
      switch (arrayFormat) {
        case 'bracket':
          value.forEach((v) => searchParams.append(`${key}[]`, String(v)));
          break;
        case 'index':
          value.forEach((v, i) => searchParams.append(`${key}[${i}]`, String(v)));
          break;
        case 'comma':
          searchParams.set(key, value.join(','));
          break;
        case 'separator':
          searchParams.set(key, value.join(arraySeparator));
          break;
      }
    } else {
      searchParams.set(key, String(value));
    }
  });

  return searchParams.toString();
}

// Utility to parse search params
export function parseSearchParams<T extends Record<string, any>>(
  searchString: string,
  schema?: {
    [K in keyof T]?: {
      type: 'string' | 'number' | 'boolean' | 'array';
      default?: T[K];
      transform?: (value: any) => T[K];
    };
  }
): T {
  const searchParams = new URLSearchParams(searchString);
  const result: any = {};

  if (schema) {
    Object.entries(schema).forEach(([key, config]) => {
      const values = searchParams.getAll(key);
      const value = values.length > 1 ? values : values[0];

      if (value === undefined && config.default !== undefined) {
        result[key] = config.default;
        return;
      }

      if (value === undefined) return;

      switch (config.type) {
        case 'number':
          result[key] = config.transform ? config.transform(value) : Number(value);
          break;
        case 'boolean':
          result[key] = config.transform
            ? config.transform(value)
            : value === 'true' || value === '1';
          break;
        case 'array':
          const arrayValue = Array.isArray(value) ? value : [value];
          result[key] = config.transform ? config.transform(arrayValue) : arrayValue;
          break;
        default:
          result[key] = config.transform ? config.transform(value) : value;
      }
    });
  } else {
    // No schema, just return all params as strings
    searchParams.forEach((value, key) => {
      if (result[key]) {
        result[key] = Array.isArray(result[key]) ? [...result[key], value] : [result[key], value];
      } else {
        result[key] = value;
      }
    });
  }

  return result as T;
}

// Utility to create route path with params
export function createRoutePath(
  path: string,
  params?: Record<string, any>,
  search?: Record<string, any>
): string {
  let resultPath = path;

  // Replace path params
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      resultPath = resultPath.replace(new RegExp(`\\$${key}|:${key}`, 'g'), String(value));
    });
  }

  // Add search params
  if (search) {
    const searchString = buildSearchParams(search);
    if (searchString) {
      resultPath += `?${searchString}`;
    }
  }

  return resultPath;
}

// Utility for route matching
export function matchRoute(
  pathname: string,
  pattern: string
): { match: boolean; params: Record<string, string> } {
  const params: Record<string, string> = {};

  // Convert route pattern to regex
  const regexPattern = pattern
    .split('/')
    .map((segment) => {
      if (segment.startsWith('$') || segment.startsWith(':')) {
        const paramName = segment.slice(1);
        return `(?<${paramName}>[^/]+)`;
      }
      return segment;
    })
    .join('/');

  const regex = new RegExp(`^${regexPattern}$`);
  const match = pathname.match(regex);

  if (!match) {
    return { match: false, params };
  }

  if (match.groups) {
    Object.assign(params, match.groups);
  }

  return { match: true, params };
}

// Utility for route generation
export function generateRoutesFromObject<T extends Record<string, any>>(
  routes: T,
  parentPath = ''
): Array<{ path: string; name: keyof T; fullPath: string }> {
  const result: Array<{ path: string; name: keyof T; fullPath: string }> = [];

  Object.entries(routes).forEach(([name, config]) => {
    if (typeof config === 'string') {
      const fullPath = `${parentPath}${config}`;
      result.push({ path: config, name: name as keyof T, fullPath });
    } else if (typeof config === 'object' && config.path) {
      const fullPath = `${parentPath}${config.path}`;
      result.push({ path: config.path, name: name as keyof T, fullPath });

      if (config.children) {
        result.push(...generateRoutesFromObject(config.children, fullPath));
      }
    }
  });

  return result;
}

// Utility for route guards
export interface RouteGuard {
  canActivate?: (context: any) => boolean | Promise<boolean>;
  canDeactivate?: (context: any) => boolean | Promise<boolean>;
  canLoad?: (context: any) => boolean | Promise<boolean>;
}

export function createRouteGuardChain(guards: RouteGuard[]): RouteGuard {
  return {
    canActivate: async (context) => {
      for (const guard of guards) {
        if (guard.canActivate) {
          const result = await guard.canActivate(context);
          if (!result) return false;
        }
      }
      return true;
    },
    canDeactivate: async (context) => {
      for (const guard of guards) {
        if (guard.canDeactivate) {
          const result = await guard.canDeactivate(context);
          if (!result) return false;
        }
      }
      return true;
    },
    canLoad: async (context) => {
      for (const guard of guards) {
        if (guard.canLoad) {
          const result = await guard.canLoad(context);
          if (!result) return false;
        }
      }
      return true;
    },
  };
}

// Utility for route preloading
export function createRoutePreloader(router: Router<any, any>) {
  const preloadedRoutes = new Set<string>();

  return {
    preload: async (to: string, options?: { force?: boolean }) => {
      if (!options?.force && preloadedRoutes.has(to)) {
        return;
      }

      try {
        await router.preloadRoute({ to });
        preloadedRoutes.add(to);
      } catch (error) {
        console.error(`Failed to preload route: ${to}`, error);
      }
    },

    preloadMultiple: async (routes: string[]) => {
      await Promise.all(
        routes.map((route) => router.preloadRoute({ to: route }).catch(console.error))
      );
      routes.forEach((route) => preloadedRoutes.add(route));
    },

    clearCache: () => {
      preloadedRoutes.clear();
    },

    isPreloaded: (to: string) => {
      return preloadedRoutes.has(to);
    },
  };
}

// Utility for route-based code splitting
export function lazyRouteComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T } | { [key: string]: T }>,
  namedExport?: string
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const module = await importFn();
    if (namedExport && namedExport in module) {
      return { default: (module as any)[namedExport] };
    }
    return module as { default: T };
  });
}

// Helper imports
import React from 'react';
