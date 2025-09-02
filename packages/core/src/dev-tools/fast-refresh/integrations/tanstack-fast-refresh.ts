/**
 * TanStack Fast Refresh Integration
 *
 * Provides intelligent Fast Refresh for TanStack components:
 * - Query cache preservation during component refresh
 * - Router state maintenance
 * - Table state preservation
 * - Form state handling
 */

import type { FastRefreshIntegration, RefreshUpdate } from '../KatalystFastRefreshProvider';

export interface TanStackFastRefreshConfig {
  refreshQueries?: boolean;
  preserveRouterState?: boolean;
  refreshTables?: boolean;
  refreshForms?: boolean;
  debugMode?: boolean;
}

export class TanStackFastRefresh implements FastRefreshIntegration {
  name = 'tanstack';
  private config: TanStackFastRefreshConfig;
  private queryClient: any = null;
  private router: any = null;
  private preservedState: Map<string, any> = new Map();

  constructor(config: TanStackFastRefreshConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Detect TanStack instances
    if (typeof window !== 'undefined') {
      // Look for QueryClient instance
      this.queryClient = (window as any).__tanstack_query_client__;

      // Look for Router instance
      this.router = (window as any).__tanstack_router__;

      if (this.config.debugMode) {
        console.log('🔍 TanStack Fast Refresh initialized', {
          queryClient: !!this.queryClient,
          router: !!this.router,
        });
      }
    }
  }

  async refresh(moduleId: string, exports: any): Promise<void> {
    const isQueryComponent = this.isQueryComponent(exports);
    const isRouterComponent = this.isRouterComponent(exports);
    const isTableComponent = this.isTableComponent(exports);
    const isFormComponent = this.isFormComponent(exports);

    if (isQueryComponent && this.config.refreshQueries) {
      await this.refreshQueryComponents(moduleId, exports);
    }

    if (isRouterComponent && this.config.preserveRouterState) {
      await this.refreshRouterComponents(moduleId, exports);
    }

    if (isTableComponent && this.config.refreshTables) {
      await this.refreshTableComponents(moduleId, exports);
    }

    if (isFormComponent && this.config.refreshForms) {
      await this.refreshFormComponents(moduleId, exports);
    }
  }

  async cleanup(): Promise<void> {
    this.preservedState.clear();
  }

  // Query Components
  private isQueryComponent(exports: any): boolean {
    return Object.values(exports).some(
      (value: any) =>
        typeof value === 'function' &&
        (value.toString().includes('useQuery') ||
          value.toString().includes('useMutation') ||
          value.toString().includes('useInfiniteQuery'))
    );
  }

  private async refreshQueryComponents(moduleId: string, exports: any): Promise<void> {
    if (!this.queryClient) return;

    // Preserve query cache
    const queryCache = this.queryClient.getQueryCache();
    const queries = queryCache.getAll();

    // Store current query states
    const queryStates = queries.map((query: any) => ({
      queryKey: query.queryKey,
      state: query.state,
    }));

    this.preservedState.set(`${moduleId}:queries`, queryStates);

    // After component refresh, restore relevant queries
    setTimeout(() => {
      this.restoreQueryStates(queryStates);
    }, 100);

    if (this.config.debugMode) {
      console.log(`🔄 Preserved ${queries.length} query states for refresh`);
    }
  }

  private restoreQueryStates(queryStates: any[]): void {
    if (!this.queryClient) return;

    queryStates.forEach(({ queryKey, state }) => {
      const existingQuery = this.queryClient.getQueryCache().find({ queryKey });

      if (existingQuery && state.data) {
        // Restore data without triggering refetch
        existingQuery.setData(state.data);

        if (this.config.debugMode) {
          console.log(`✅ Restored query state:`, queryKey);
        }
      }
    });
  }

  // Router Components
  private isRouterComponent(exports: any): boolean {
    return Object.values(exports).some(
      (value: any) =>
        typeof value === 'function' &&
        (value.toString().includes('useRouter') ||
          value.toString().includes('useNavigate') ||
          value.toString().includes('useLocation'))
    );
  }

  private async refreshRouterComponents(moduleId: string, exports: any): Promise<void> {
    if (!this.router) return;

    // Preserve router state
    const currentLocation = this.router.state.location;
    const currentMatches = this.router.state.matches;

    this.preservedState.set(`${moduleId}:router`, {
      location: currentLocation,
      matches: currentMatches,
    });

    if (this.config.debugMode) {
      console.log(`🧭 Preserved router state:`, currentLocation.pathname);
    }
  }

  // Table Components
  private isTableComponent(exports: any): boolean {
    return Object.values(exports).some(
      (value: any) =>
        typeof value === 'function' &&
        (value.toString().includes('useReactTable') ||
          value.toString().includes('createColumnHelper') ||
          value.toString().includes('getCoreRowModel'))
    );
  }

  private async refreshTableComponents(moduleId: string, exports: any): Promise<void> {
    // Preserve table state (sorting, pagination, selection, etc.)
    if (typeof window !== 'undefined') {
      const tables = (window as any).__tanstack_tables__ || [];

      const tableStates = tables.map((table: any) => ({
        id: table.options?.meta?.id,
        state: table.getState(),
      }));

      this.preservedState.set(`${moduleId}:tables`, tableStates);

      if (this.config.debugMode) {
        console.log(`📊 Preserved ${tables.length} table states`);
      }
    }
  }

  // Form Components
  private isFormComponent(exports: any): boolean {
    return Object.values(exports).some(
      (value: any) =>
        typeof value === 'function' &&
        (value.toString().includes('useForm') ||
          value.toString().includes('Controller') ||
          value.toString().includes('FormProvider'))
    );
  }

  private async refreshFormComponents(moduleId: string, exports: any): Promise<void> {
    // Preserve form state (values, errors, touched fields, etc.)
    if (typeof window !== 'undefined') {
      const forms = (window as any).__tanstack_forms__ || [];

      const formStates = forms.map((form: any) => ({
        id: form.options?.meta?.id,
        values: form.getValues(),
        errors: form.getErrors(),
        touched: form.getTouched(),
      }));

      this.preservedState.set(`${moduleId}:forms`, formStates);

      if (this.config.debugMode) {
        console.log(`📝 Preserved ${forms.length} form states`);
      }
    }
  }

  async broadcastUpdate(update: RefreshUpdate): Promise<void> {
    if (update.type === 'component-refresh') {
      // Notify other TanStack instances about the refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('tanstack:fast-refresh', {
            detail: update,
          })
        );
      }
    }
  }
}

// Helper hooks for preserving state during Fast Refresh
export function useQueryStatePreservation() {
  return {
    preserve: (key: string, data: any) => {
      if (typeof window !== 'undefined') {
        (window as any).__tanstack_preserved_queries__ = {
          ...(window as any).__tanstack_preserved_queries__,
          [key]: data,
        };
      }
    },
    restore: (key: string) => {
      if (typeof window !== 'undefined') {
        return (window as any).__tanstack_preserved_queries__?.[key];
      }
      return null;
    },
  };
}

export function useRouterStatePreservation() {
  return {
    preserve: (state: any) => {
      if (typeof window !== 'undefined') {
        (window as any).__tanstack_preserved_router_state__ = state;
      }
    },
    restore: () => {
      if (typeof window !== 'undefined') {
        return (window as any).__tanstack_preserved_router_state__;
      }
      return null;
    },
  };
}
