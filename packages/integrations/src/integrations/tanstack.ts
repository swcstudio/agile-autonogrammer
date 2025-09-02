import { z } from 'zod';
import {
  asyncValidators,
  composeValidators,
  createFormSchema,
  customValidators,
} from '../components/tanstack/form';
import {
  QueryProviderProps,
  createApiClient,
  createQueryClient,
  createTypedApi,
  queryKeys,
} from '../components/tanstack/query';
import {
  RouterConfig,
  createAuthenticatedRoute,
  createPrefetchRoute,
  createTypedRootRoute,
  createTypedRoute,
  createTypedRouter,
} from '../components/tanstack/router';
import {
  StoreOptions,
  createAsyncThunk,
  createSlice,
  createStore,
} from '../components/tanstack/store';
import {
  createActionsColumn,
  createDateColumn,
  createNumberColumn,
  createSelectionColumn,
  createStatusColumn,
  createTypedColumns,
} from '../components/tanstack/table';
import type { TanStackConfig } from '../types/index';

export class TanStackIntegration {
  private config: TanStackConfig;
  private queryClient: any;
  private router: any;
  private store: any;
  private apiClient: any;

  constructor(config: TanStackConfig) {
    this.config = config;
  }

  async setupQuery() {
    if (!this.config.query) return null;

    // Create query client with enhanced configuration
    this.queryClient = createQueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,
          gcTime: 10 * 60 * 1000,
          retry: 3,
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          refetchOnWindowFocus: false,
          refetchOnReconnect: true,
        },
        mutations: {
          retry: 1,
          retryDelay: 1000,
        },
      },
    });

    // Create API client with type-safe endpoints
    const api = createTypedApi();

    this.apiClient = createApiClient(
      {
        baseURL: this.config.query.apiBaseUrl || '/api',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      },
      {
        // User endpoints
        users: api.resource('/users', {
          transformItem: (item) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt),
          }),
        }),

        // Products endpoints
        products: api.resource('/products'),

        // Custom endpoints
        auth: {
          login: api.endpoint({
            method: 'POST',
            url: '/auth/login',
            queryKey: ['auth', 'login'],
          }),
          logout: api.endpoint({
            method: 'POST',
            url: '/auth/logout',
            queryKey: ['auth', 'logout'],
            invalidateKeys: [['auth']],
          }),
          profile: api.endpoint({
            method: 'GET',
            url: '/auth/profile',
            queryKey: ['auth', 'profile'],
          }),
        },

        // Marketing content
        content: {
          hero: api.endpoint({
            method: 'GET',
            url: '/content/hero',
            queryKey: ['content', 'hero'],
          }),
          features: api.endpoint({
            method: 'GET',
            url: '/content/features',
            queryKey: ['content', 'features'],
          }),
          testimonials: api.endpoint({
            method: 'GET',
            url: '/content/testimonials',
            queryKey: ['content', 'testimonials'],
          }),
        },
      }
    );

    return {
      name: 'tanstack-query',
      queryClient: this.queryClient,
      apiClient: this.apiClient,
      queryKeys: {
        ...queryKeys,
        content: () => [...queryKeys.all, 'content'] as const,
        marketing: () => [...queryKeys.all, 'marketing'] as const,
      },
      hooks: {
        useAuthStatus: () => 'useQuery(apiClient.api.auth.profile)',
        useProducts: () => 'useQuery(apiClient.api.products.list)',
        useContent: (section: string) => `useQuery(['content', section])`,
      },
      setup: () => ({
        providers: ['QueryProvider'],
        dependencies: ['@tanstack/react-query', '@tanstack/react-query-devtools', 'axios'],
      }),
    };
  }

  async setupRouter() {
    if (!this.config.router) return null;

    // Create root route
    const rootRoute = createTypedRootRoute({
      component: () => 'RootLayout',
    });

    // Create routes
    const indexRoute = createTypedRoute(rootRoute, {
      path: '/',
      component: () => 'HomePage',
      loader: async ({ context }) => {
        const queryClient = context.queryClient;
        await queryClient.prefetchQuery({
          queryKey: ['content', 'hero'],
          queryFn: () => this.apiClient.api.content.hero.queryFn(),
        });
        return { title: 'Welcome' };
      },
    });

    const productsRoute = createTypedRoute(rootRoute, {
      path: '/products',
      component: () => 'ProductsPage',
      searchSchema: z.object({
        category: z.string().optional(),
        page: z.number().optional().default(1),
        sort: z.enum(['name', 'price', 'date']).optional(),
      }).parse,
    });

    const productDetailRoute = createTypedRoute(productsRoute, {
      path: '/$productId',
      component: () => 'ProductDetailPage',
      loader: async ({ params, context }) => {
        const queryClient = context.queryClient;
        return await queryClient.fetchQuery({
          queryKey: ['products', params.productId],
          queryFn: () => this.apiClient.api.products.get.queryFn({ id: params.productId }),
        });
      },
    });

    const authRoute = createAuthenticatedRoute(rootRoute, {
      path: '/dashboard',
      component: () => 'DashboardPage',
      authCheck: async ({ context }) => {
        try {
          const profile = await context.queryClient.fetchQuery({
            queryKey: ['auth', 'profile'],
            queryFn: () => this.apiClient.api.auth.profile.queryFn(),
          });
          return !!profile;
        } catch {
          return false;
        }
      },
      redirectTo: '/login',
    });

    // Create router
    this.router = createTypedRouter({
      routeTree: rootRoute,
      defaultPreload: 'intent',
      defaultPreloadDelay: 50,
      queryClient: this.queryClient,
    });

    return {
      name: 'tanstack-router',
      router: this.router,
      routes: {
        root: rootRoute,
        index: indexRoute,
        products: productsRoute,
        productDetail: productDetailRoute,
        dashboard: authRoute,
      },
      setup: () => ({
        providers: ['RouterProvider'],
        dependencies: ['@tanstack/react-router', '@tanstack/router-devtools', 'zod'],
      }),
    };
  }

  async setupTable() {
    if (!this.config.table) return null;

    // Create typed columns helper
    const columnHelper = createTypedColumns<any>();

    // Define reusable column sets
    const columns = {
      users: [
        createSelectionColumn(),
        columnHelper.accessor('id', {
          header: 'ID',
          size: 80,
        }),
        columnHelper.accessor('name', {
          header: 'Name',
          cell: (info) => `<strong>${info.getValue()}</strong>`,
        }),
        columnHelper.accessor('email', {
          header: 'Email',
        }),
        createStatusColumn('status', [
          { value: 'active', label: 'Active', color: 'success' },
          { value: 'inactive', label: 'Inactive', color: 'default' },
          { value: 'pending', label: 'Pending', color: 'warning' },
        ]),
        createDateColumn('createdAt', {
          header: 'Joined',
          format: 'relative',
        }),
        createActionsColumn([
          {
            label: 'Edit',
            onClick: (row) => console.log('Edit', row.original),
          },
          {
            label: 'Delete',
            onClick: (row) => console.log('Delete', row.original),
            className: 'text-destructive',
          },
        ]),
      ],

      products: [
        createSelectionColumn(),
        columnHelper.accessor('image', {
          header: 'Image',
          cell: (info) => `<img src="${info.getValue()}" class="w-12 h-12 object-cover rounded" />`,
          enableSorting: false,
        }),
        columnHelper.accessor('name', {
          header: 'Product Name',
        }),
        columnHelper.accessor('category', {
          header: 'Category',
          filterFn: 'equals',
        }),
        createNumberColumn('price', {
          header: 'Price',
          format: 'currency',
          currency: 'USD',
        }),
        createNumberColumn('stock', {
          header: 'Stock',
          suffix: ' units',
        }),
        createDateColumn('lastRestocked', {
          header: 'Last Restocked',
          format: 'short',
        }),
      ],
    };

    return {
      name: 'tanstack-table',
      columns,
      features: {
        sorting: true,
        filtering: true,
        pagination: true,
        rowSelection: true,
        columnResizing: true,
        columnOrdering: true,
        export: true,
        virtualScrolling: true,
      },
      setup: () => ({
        components: ['Table', 'VirtualTable'],
        dependencies: ['@tanstack/react-table', '@tanstack/react-virtual'],
      }),
    };
  }

  async setupForm() {
    if (!this.config.form) return null;

    // Define form schemas
    const schemas = {
      contact: z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email address'),
        subject: z.string().min(5, 'Subject must be at least 5 characters'),
        message: z.string().min(10, 'Message must be at least 10 characters'),
        newsletter: z.boolean().optional(),
      }),

      registration: z
        .object({
          firstName: z.string().min(2),
          lastName: z.string().min(2),
          email: z.string().email(),
          password: z
            .string()
            .min(8)
            .regex(
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
              'Password must contain uppercase, lowercase, number and special character'
            ),
          confirmPassword: z.string(),
          acceptTerms: z.literal(true, {
            errorMap: () => ({ message: 'You must accept the terms' }),
          }),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: 'Passwords do not match',
          path: ['confirmPassword'],
        }),

      checkout: z.object({
        billing: z.object({
          firstName: z.string().min(1),
          lastName: z.string().min(1),
          email: z.string().email(),
          phone: z.string().regex(/^[\d\s\-\+\(\)]+$/),
          address: z.string().min(5),
          city: z.string().min(2),
          state: z.string().length(2),
          zip: z.string().regex(/^\d{5}(-\d{4})?$/),
        }),
        shipping: z.object({
          sameAsBilling: z.boolean(),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zip: z.string().optional(),
        }),
        payment: z.object({
          method: z.enum(['card', 'paypal', 'crypto']),
          cardNumber: z.string().optional(),
          expiryDate: z.string().optional(),
          cvv: z.string().optional(),
        }),
      }),
    };

    // Custom validators
    const validators = {
      asyncEmailUnique: asyncValidators.checkEmailAvailable('/api/check-email'),
      asyncUsernameUnique: asyncValidators.checkUsernameAvailable('/api/check-username'),
      phoneNumber: customValidators.pattern(
        /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{4,6}$/,
        'Invalid phone number'
      ),
      strongPassword: customValidators.strongPassword({
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
      }),
    };

    return {
      name: 'tanstack-form',
      schemas,
      validators,
      features: {
        validation: true,
        asyncValidation: true,
        fieldArrays: true,
        conditionalFields: true,
        wizardForms: true,
        autoSave: true,
      },
      setup: () => ({
        components: ['Form', 'Field', 'FieldArray'],
        dependencies: ['@tanstack/react-form', '@tanstack/zod-form-adapter', 'zod'],
      }),
    };
  }

  async setupVirtual() {
    if (!this.config.virtual) return null;

    return {
      name: 'tanstack-virtual',
      configurations: {
        list: {
          overscan: 5,
          estimateSize: () => 50,
          scrollMargin: 0,
        },
        grid: {
          overscan: 5,
          columnCount: 3,
          rowHeight: 200,
        },
        masonry: {
          columnWidth: 250,
          gap: 16,
        },
        table: {
          overscan: 10,
          rowHeight: 50,
          headerHeight: 50,
        },
      },
      features: {
        dynamicHeights: true,
        horizontalScrolling: true,
        infiniteScrolling: true,
        bidirectional: true,
        windowScroller: true,
      },
      setup: () => ({
        components: ['VirtualList', 'VirtualGrid', 'VirtualTable'],
        dependencies: ['@tanstack/react-virtual'],
      }),
    };
  }

  async setupStore() {
    if (!this.config.store) return null;

    // Create app store slices
    const authSlice = createSlice({
      name: 'auth',
      initialState: {
        user: null as any,
        token: null as string | null,
        isAuthenticated: false,
        loading: false,
        error: null as string | null,
      },
      reducers: {
        loginStart: (state) => ({
          ...state,
          loading: true,
          error: null,
        }),
        loginSuccess: (state, payload: { user: any; token: string }) => ({
          ...state,
          user: payload.user,
          token: payload.token,
          isAuthenticated: true,
          loading: false,
          error: null,
        }),
        loginFailure: (state, payload: string) => ({
          ...state,
          loading: false,
          error: payload,
        }),
        logout: () => authSlice.initialState,
      },
    });

    const uiSlice = createSlice({
      name: 'ui',
      initialState: {
        theme: 'light' as 'light' | 'dark',
        sidebarOpen: true,
        modals: {} as Record<string, boolean>,
        notifications: [] as Array<{
          id: string;
          type: 'success' | 'error' | 'warning' | 'info';
          message: string;
        }>,
      },
      reducers: {
        toggleTheme: (state) => ({
          ...state,
          theme: state.theme === 'light' ? 'dark' : 'light',
        }),
        toggleSidebar: (state) => ({
          ...state,
          sidebarOpen: !state.sidebarOpen,
        }),
        openModal: (state, payload: string) => ({
          ...state,
          modals: { ...state.modals, [payload]: true },
        }),
        closeModal: (state, payload: string) => ({
          ...state,
          modals: { ...state.modals, [payload]: false },
        }),
        addNotification: (state, payload: any) => ({
          ...state,
          notifications: [...state.notifications, { ...payload, id: Date.now().toString() }],
        }),
        removeNotification: (state, payload: string) => ({
          ...state,
          notifications: state.notifications.filter((n) => n.id !== payload),
        }),
      },
    });

    // Create store
    this.store = createStore({
      initialState: {
        auth: authSlice.initialState,
        ui: uiSlice.initialState,
      },
      name: 'app-store',
      persist: {
        key: 'tanstack-app',
        storage: localStorage,
      },
      devtools: true,
    });

    return {
      name: 'tanstack-store',
      store: this.store,
      slices: {
        auth: authSlice,
        ui: uiSlice,
      },
      setup: () => ({
        providers: ['StoreProvider'],
        dependencies: ['@tanstack/react-store'],
      }),
    };
  }

  async setupRanger() {
    if (!this.config.ranger) return null;

    return {
      name: 'tanstack-ranger',
      configurations: {
        default: {
          min: 0,
          max: 100,
          step: 1,
          values: [50],
        },
        price: {
          min: 0,
          max: 5000,
          step: 50,
          values: [500, 2500],
          formatter: (value: number) => `$${value.toLocaleString()}`,
        },
        time: {
          min: 0,
          max: 1440,
          step: 15,
          values: [480, 1020],
          formatter: (minutes: number) => {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hours}:${mins.toString().padStart(2, '0')}`;
          },
        },
      },
      features: {
        multiRange: true,
        customStyling: true,
        tooltips: true,
        ticks: true,
        colorPicker: true,
      },
      setup: () => ({
        components: ['RangeSlider', 'MultiRangeSlider', 'ColorRangeSlider'],
        dependencies: ['@tanstack/react-ranger'],
      }),
    };
  }

  async initialize() {
    const integrations = await Promise.all([
      this.setupQuery(),
      this.setupRouter(),
      this.setupTable(),
      this.setupForm(),
      this.setupVirtual(),
      this.setupStore(),
      this.setupRanger(),
    ]);

    return integrations.filter(Boolean);
  }

  // Helper methods
  getQueryClient() {
    return this.queryClient;
  }

  getRouter() {
    return this.router;
  }

  getStore() {
    return this.store;
  }

  getApiClient() {
    return this.apiClient;
  }

  // Type definitions for enhanced TypeScript support
  getTypeDefinitions() {
    return `
      // TanStack Query Types
      export type QueryKeys = typeof queryKeys;
      export type ApiClient = typeof apiClient;
      
      // TanStack Router Types
      export type AppRouter = typeof router;
      export type AppRoutes = typeof routes;
      
      // TanStack Store Types
      export type AppStore = typeof store;
      export type AppState = ReturnType<typeof store.getState>;
      export type AppDispatch = typeof store.setState;
      
      // TanStack Form Types
      export type FormSchemas = typeof schemas;
      export type FormValidators = typeof validators;
      
      // Utility Types
      export type AsyncData<T> = {
        data: T | null;
        loading: boolean;
        error: Error | null;
      };
    `;
  }
}
