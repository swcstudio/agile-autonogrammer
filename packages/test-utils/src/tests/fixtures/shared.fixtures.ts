import type { KatalystConfig } from '../../shared/src/types/index.ts';

// Mock React Elements
export const mockReactElement = {
  $$typeof: Symbol.for('react.element'),
  type: 'div',
  props: { children: 'Mock Component' },
  key: null,
  ref: null,
  _owner: null,
  _store: {},
};

// Mock Katalyst Configuration
export const mockKatalystConfig: KatalystConfig = {
  framework: 'core',
  theme: {
    mode: 'light',
    primaryColor: '#3b82f6',
    borderRadius: '8px',
    fontFamily: 'Inter, sans-serif',
  },
  router: {
    basePath: '/',
    trailingSlash: false,
    caseSensitive: false,
  },
  api: {
    baseUrl: 'https://api.example.com',
    timeout: 5000,
    retries: 3,
  },
  auth: {
    provider: 'clerk',
    signInUrl: '/sign-in',
    signUpUrl: '/sign-up',
    afterSignInUrl: '/dashboard',
    afterSignUpUrl: '/onboarding',
  },
  features: {
    multithreading: true,
    webassembly: true,
    web3: true,
    ai: true,
    offline: false,
  },
  performance: {
    enableCaching: true,
    prefetchRoutes: true,
    virtualScrolling: true,
    lazyLoading: true,
  },
  integrations: {
    analytics: ['google-analytics'],
    monitoring: ['sentry'],
    payments: ['stripe'],
    cms: ['payload'],
  },
};

// Mock Clerk User
export const mockClerkUser = {
  id: 'user_12345',
  firstName: 'John',
  lastName: 'Doe',
  emailAddresses: [
    {
      id: 'email_12345',
      emailAddress: 'john.doe@example.com',
      verification: { status: 'verified' },
    },
  ],
  primaryEmailAddressId: 'email_12345',
  imageUrl: 'https://example.com/avatar.jpg',
  hasImage: true,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-12-01'),
  lastSignInAt: new Date('2023-12-01'),
  publicMetadata: {},
  privateMetadata: {},
  unsafeMetadata: {},
};

// Mock TanStack Router Data
export const mockRouterData = {
  core: {
    location: {
      pathname: '/',
      search: '',
      hash: '',
      state: null,
      key: 'default',
    },
    params: {},
    search: {},
    context: {},
    navigate: () => Promise.resolve(),
    buildLocation: () => ({ pathname: '/', search: '', hash: '' }),
  },
  remix: {
    location: {
      pathname: '/',
      search: '',
      hash: '',
      state: null,
      key: 'default',
    },
    params: {},
    loaderData: {},
    actionData: null,
    navigation: { state: 'idle' },
    submit: () => {},
    navigate: () => Promise.resolve(),
  },
  nextjs: {
    pathname: '/',
    route: '/',
    query: {},
    asPath: '/',
    push: () => Promise.resolve(true),
    replace: () => Promise.resolve(true),
    reload: () => {},
    back: () => {},
    prefetch: () => Promise.resolve(),
    beforePopState: () => {},
    events: {
      on: () => {},
      off: () => {},
      emit: () => {},
    },
  },
};

// Mock TanStack Query Data
export const mockQueryData = {
  queries: new Map(),
  mutations: new Map(),
  queryCache: {
    find: () => null,
    findAll: () => [],
    subscribe: () => () => {},
    clear: () => {},
    getAll: () => [],
  },
  mutationCache: {
    find: () => null,
    findAll: () => [],
    subscribe: () => () => {},
    clear: () => {},
    getAll: () => [],
  },
};

// Mock Component Props
export const mockComponentProps = {
  katalystProvider: {
    config: mockKatalystConfig,
    children: mockReactElement,
  },
  configProvider: {
    theme: mockKatalystConfig.theme,
    router: mockKatalystConfig.router,
    children: mockReactElement,
  },
  integrationProvider: {
    integrations: mockKatalystConfig.integrations,
    children: mockReactElement,
  },
  designSystem: {
    theme: mockKatalystConfig.theme,
    components: ['Button', 'Input', 'Modal'],
    tokens: {
      colors: { primary: '#3b82f6' },
      spacing: { sm: '8px', md: '16px', lg: '24px' },
      typography: { base: '16px', lg: '18px' },
    },
  },
};

// Mock API Responses
export const mockApiResponses = {
  users: {
    success: {
      data: [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
      ],
      meta: { total: 2, page: 1, limit: 10 },
    },
    error: {
      error: 'Internal Server Error',
      message: 'Something went wrong',
      statusCode: 500,
    },
  },
  auth: {
    login: {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      user: mockClerkUser,
      expiresIn: 3600,
    },
    refresh: {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      expiresIn: 3600,
    },
  },
};

// Mock WebAssembly Module
export const mockWasmModule = {
  instance: {
    exports: {
      add: (a: number, b: number) => a + b,
      multiply: (a: number, b: number) => a * b,
      fibonacci: (n: number) => {
        if (n <= 1) return n;
        return (
          mockWasmModule.instance.exports.fibonacci(n - 1) +
          mockWasmModule.instance.exports.fibonacci(n - 2)
        );
      },
      memory: new WebAssembly.Memory({ initial: 1 }),
    },
  },
  module: {} as WebAssembly.Module,
};

// Mock Worker Messages
export const mockWorkerMessages = {
  compute: {
    type: 'COMPUTE',
    payload: { operation: 'factorial', value: 10 },
    id: 'msg_12345',
  },
  result: {
    type: 'RESULT',
    payload: { result: 3628800 },
    id: 'msg_12345',
  },
  error: {
    type: 'ERROR',
    payload: { error: 'Computation failed' },
    id: 'msg_12345',
  },
};

// Mock Web3 Data
export const mockWeb3Data = {
  provider: {
    isConnected: true,
    chainId: 1,
    accounts: ['0x742d35Cc6634C0532925a3b8D4021C4aA6e8E1f6'],
  },
  wallet: {
    address: '0x742d35Cc6634C0532925a3b8D4021C4aA6e8E1f6',
    balance: '1.5',
    network: 'ethereum',
  },
  transaction: {
    hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    from: '0x742d35Cc6634C0532925a3b8D4021C4aA6e8E1f6',
    to: '0x456789abcdef1234567890abcdef1234567890ab',
    value: '0.1',
    gas: 21000,
    gasPrice: '20000000000',
  },
};

// Mock AI Integration Data
export const mockAiData = {
  completion: {
    choices: [
      {
        message: {
          role: 'assistant',
          content: 'This is a mock AI response for testing purposes.',
        },
        finish_reason: 'stop',
        index: 0,
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 15,
      total_tokens: 25,
    },
  },
  embedding: {
    data: [
      {
        object: 'embedding',
        embedding: Array(1536)
          .fill(0)
          .map(() => Math.random() - 0.5),
        index: 0,
      },
    ],
    usage: {
      prompt_tokens: 8,
      total_tokens: 8,
    },
  },
};

// Mock Performance Metrics
export const mockPerformanceMetrics = {
  renderTime: 16.7, // 60fps target
  memoryUsage: 15.5, // MB
  bundleSize: 245.3, // KB
  lighthouse: {
    performance: 95,
    accessibility: 100,
    bestPractices: 95,
    seo: 100,
  },
  webVitals: {
    CLS: 0.05,
    FID: 45,
    LCP: 1200,
    FCP: 800,
    TTFB: 200,
  },
};

// Mock Error Scenarios
export const mockErrors = {
  network: new Error('Network request failed'),
  validation: new Error('Validation failed: required field missing'),
  auth: new Error('Authentication required'),
  permission: new Error('Insufficient permissions'),
  notFound: new Error('Resource not found'),
  serverError: new Error('Internal server error'),
  timeout: new Error('Request timeout'),
  webAssembly: new Error('WebAssembly compilation failed'),
  worker: new Error('Worker thread crashed'),
};

// Mock Form Data
export const mockFormData = {
  userRegistration: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!',
    agreeToTerms: true,
  },
  userLogin: {
    email: 'john.doe@example.com',
    password: 'SecurePassword123!',
    rememberMe: true,
  },
  contactForm: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    subject: 'Test Subject',
    message: 'This is a test message for the contact form.',
  },
};

// Mock Table Data
export const mockTableData = {
  users: [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin', status: 'active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user', status: 'active' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'user', status: 'inactive' },
  ],
  columns: [
    { id: 'id', header: 'ID', accessorKey: 'id' },
    { id: 'name', header: 'Name', accessorKey: 'name' },
    { id: 'email', header: 'Email', accessorKey: 'email' },
    { id: 'role', header: 'Role', accessorKey: 'role' },
    { id: 'status', header: 'Status', accessorKey: 'status' },
  ],
};

// Mock Event Data
export const mockEvents = {
  click: {
    type: 'click',
    target: { tagName: 'BUTTON', textContent: 'Submit' },
    preventDefault: () => {},
    stopPropagation: () => {},
  },
  submit: {
    type: 'submit',
    target: { tagName: 'FORM' },
    preventDefault: () => {},
    stopPropagation: () => {},
  },
  change: {
    type: 'change',
    target: { tagName: 'INPUT', value: 'test value' },
    preventDefault: () => {},
    stopPropagation: () => {},
  },
  keydown: {
    type: 'keydown',
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    preventDefault: () => {},
    stopPropagation: () => {},
  },
};

// Test Environment Variables
export const mockEnvVars = {
  NODE_ENV: 'test',
  DENO_ENV: 'test',
  CLERK_PUBLISHABLE_KEY: 'pk_test_12345',
  CLERK_SECRET_KEY: 'sk_test_12345',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/katalyst_test',
  REDIS_URL: 'redis://localhost:6379',
  API_BASE_URL: 'http://localhost:3000/api',
  WEB3_PROVIDER_URL: 'https://mainnet.infura.io/v3/test12345',
  AI_API_KEY: 'sk-test12345',
  STRIPE_PUBLISHABLE_KEY: 'pk_test_12345',
  STRIPE_SECRET_KEY: 'sk_test_12345',
};

// Export all fixtures
export const fixtures = {
  config: mockKatalystConfig,
  user: mockClerkUser,
  router: mockRouterData,
  query: mockQueryData,
  components: mockComponentProps,
  api: mockApiResponses,
  wasm: mockWasmModule,
  worker: mockWorkerMessages,
  web3: mockWeb3Data,
  ai: mockAiData,
  performance: mockPerformanceMetrics,
  errors: mockErrors,
  forms: mockFormData,
  tables: mockTableData,
  events: mockEvents,
  env: mockEnvVars,
  react: { element: mockReactElement },
};

export default fixtures;
