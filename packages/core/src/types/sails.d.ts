import type {
  SailsConfig,
  SailsController,
  SailsHelper,
  SailsModel,
  SailsPolicy,
  SailsService,
} from '../integrations/sails';

// Core Sails Integration Types for Katalyst

export interface SailsRuntime {
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  config: SailsConfig;
  sailsApp: any;

  // API client for backend communication
  api: SailsAPIClient;

  // WebSocket client (optional)
  socket?: SailsSocketClient;

  // Model helpers
  models: SailsModelRegistry;

  // Katalyst integration status
  katalystIntegration: KatalystSailsIntegration;
}

export interface SailsAPIClient {
  get: (endpoint: string, params?: any) => Promise<any>;
  post: (endpoint: string, data?: any) => Promise<any>;
  put: (endpoint: string, data?: any) => Promise<any>;
  delete: (endpoint: string) => Promise<any>;
}

export interface SailsSocketClient {
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: Function) => void;
  off: (event: string, callback?: Function) => void;
  isConnected: boolean;
}

export interface SailsModelRegistry {
  [modelName: string]: SailsModelClient<any>;
}

export interface SailsModelClient<T = any> {
  find: (criteria?: SailsQueryCriteria) => Promise<T[]>;
  findOne: (id: string | number) => Promise<T | null>;
  create: (data: Partial<T>) => Promise<T>;
  update: (id: string | number, data: Partial<T>) => Promise<T>;
  destroy: (id: string | number) => Promise<boolean>;
}

export interface SailsQueryCriteria {
  where?: Record<string, any>;
  sort?: string | Record<string, 'ASC' | 'DESC'>;
  limit?: number;
  skip?: number;
  select?: string[];
  populate?: string | string[] | Record<string, any>;
}

export interface KatalystSailsIntegration {
  frontendState: 'katalyst-zustand'; // Katalyst state management is superior
  routing: 'katalyst-tanstack'; // Katalyst routing is superior
  components: 'katalyst-react'; // Katalyst components are superior
  apiMode: 'sails-backend-only'; // Sails only provides backend service
}

// Hook return types
export interface UseSailsReturn {
  isConnected: boolean;
  config: SailsConfig;
  api: SailsAPIClient;
  socket?: SailsSocketClient;
  models: SailsModelRegistry;
  integration: {
    frontend: 'katalyst';
    backend: 'sails';
    stateManagement: 'katalyst-zustand';
    routing: 'katalyst-tanstack';
    bridgeMode: true;
  };
  katalyst: any; // Katalyst context
}

export interface UseSailsModelReturn<T = any> {
  data: T[];
  loading: boolean;
  error: Error | null;
  find: (criteria?: SailsQueryCriteria) => Promise<T[]>;
  findOne: (id: string | number) => Promise<T | null>;
  create: (data: Partial<T>) => Promise<T>;
  update: (id: string | number, data: Partial<T>) => Promise<T>;
  destroy: (id: string | number) => Promise<boolean>;
  model: SailsModelClient<T>;
}

export interface UseSailsAPIReturn {
  loading: boolean;
  error: Error | null;
  request: (
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ) => Promise<any>;
  get: (endpoint: string, params?: any) => Promise<any>;
  post: (endpoint: string, data?: any) => Promise<any>;
  put: (endpoint: string, data?: any) => Promise<any>;
  delete: (endpoint: string) => Promise<any>;
  api: SailsAPIClient;
}

export interface UseSailsSocketReturn {
  connected: boolean;
  messages: any[];
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: Function) => void;
  off: (event: string, callback?: Function) => void;
  socket?: SailsSocketClient;
}

export interface UseSailsQueryOptions {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

export interface UseSailsQueryReturn<T = any> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<T | undefined>;
  invalidate: () => void;
  isStale: boolean;
}

export interface UseSailsMutationOptions<T = any, V = any> {
  onSuccess?: (data: T, variables: V) => void;
  onError?: (error: Error, variables: V) => void;
  onSettled?: (data: T | undefined, error: Error | null, variables: V) => void;
}

export interface UseSailsMutationReturn<T = any, V = any> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  mutate: (variables: V) => Promise<T>;
  reset: () => void;
}

export interface UseSailsBlueprintReturn<T = any> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  create: (data: Partial<T>) => Promise<T>;
  update: (params: { id: string | number; data: Partial<T> }) => Promise<T>;
  delete: (id: string | number) => Promise<boolean>;
  mutations: {
    create: UseSailsMutationReturn<T, Partial<T>>;
    update: UseSailsMutationReturn<T, { id: string | number; data: Partial<T> }>;
    delete: UseSailsMutationReturn<boolean, string | number>;
  };
}

export interface UseSailsStatusReturn {
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  mode: 'mvp' | 'vanilla';
  role: 'backend-service' | 'full-stack' | 'api-only';
  features: {
    models: boolean;
    controllers: boolean;
    services: boolean;
    policies: boolean;
    helpers: boolean;
    websockets: boolean;
    blueprints: boolean;
    security: boolean;
    i18n: boolean;
  };
  integration: {
    katalystBridge: any;
    frontendFramework: 'katalyst';
    backendFramework: 'sails';
  };
}

// Waterline ORM Types (Sails database layer)
export interface WaterlineModel<T = any> {
  find: (criteria?: SailsQueryCriteria) => Promise<T[]>;
  findOne: (criteria: string | number | SailsQueryCriteria) => Promise<T | null>;
  create: (data: Partial<T>) => SailsModelQuery<T>;
  createEach: (data: Partial<T>[]) => SailsModelQuery<T[]>;
  update: (criteria: SailsQueryCriteria) => SailsModelUpdateQuery<T>;
  updateOne: (criteria: SailsQueryCriteria) => SailsModelUpdateQuery<T>;
  destroy: (criteria: SailsQueryCriteria) => Promise<T[]>;
  destroyOne: (criteria: SailsQueryCriteria) => Promise<T | null>;
  count: (criteria?: SailsQueryCriteria) => Promise<number>;
  sum: (field: string, criteria?: SailsQueryCriteria) => Promise<number>;
  avg: (field: string, criteria?: SailsQueryCriteria) => Promise<number>;
  stream: (criteria?: SailsQueryCriteria) => NodeJS.ReadableStream;
}

export interface SailsModelQuery<T> {
  fetch(): Promise<T>;
  exec(callback: (err: any, result: T) => void): void;
  populate(association: string): SailsModelQuery<T>;
  where(criteria: Record<string, any>): SailsModelQuery<T>;
  limit(limit: number): SailsModelQuery<T>;
  skip(skip: number): SailsModelQuery<T>;
  sort(sort: string | Record<string, 'ASC' | 'DESC'>): SailsModelQuery<T>;
  select(fields: string[]): SailsModelQuery<T>;
}

export interface SailsModelUpdateQuery<T> extends SailsModelQuery<T> {
  set(data: Partial<T>): SailsModelUpdateQuery<T>;
}

// Sails Request/Response Types
export interface SailsRequest {
  allParams(): any;
  param(name: string, defaultValue?: any): any;
  body: any;
  query: any;
  params: any;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  session: any;
  user?: any;
  file(field: string): any;
  files: any[];
  ip: string;
  protocol: string;
  host: string;
  url: string;
  path: string;
  method: string;
  xhr: boolean;
  isSocket: boolean;
  wantsJSON: boolean;
  accepts(type: string): boolean;
  is(type: string): boolean;
}

export interface SailsResponse {
  json(data: any): void;
  send(data: any): void;
  ok(data?: any): void;
  created(data?: any): void;
  notFound(data?: any): void;
  badRequest(data?: any): void;
  forbidden(data?: any): void;
  serverError(error?: any): void;
  status(code: number): SailsResponse;
  set(headers: Record<string, string>): SailsResponse;
  cookie(name: string, value: string, options?: any): SailsResponse;
  clearCookie(name: string, options?: any): SailsResponse;
  redirect(url: string): void;
  view(template: string, data?: any): void;
  attachment(filename?: string): SailsResponse;
  download(path: string, filename?: string): void;
}

// Sails Action Types (Sails 1.x actions)
export interface SailsActionDef {
  friendlyName?: string;
  description?: string;
  inputs?: Record<string, SailsActionInput>;
  exits?: Record<string, SailsActionExit>;
  fn: (inputs: any, exits: any) => any;
}

export interface SailsActionInput {
  type?: string;
  required?: boolean;
  defaultsTo?: any;
  allowNull?: boolean;
  description?: string;
  example?: any;
  whereToGet?: {
    path?: string;
    description?: string;
  };
}

export interface SailsActionExit {
  description?: string;
  responseType?: string;
  statusCode?: number;
  outputFriendlyName?: string;
  outputDescription?: string;
  outputExample?: any;
}

// Blueprint API Types
export interface BlueprintConfig {
  actions: boolean;
  rest: boolean;
  shortcuts: boolean;
  prefix: string;
  restPrefix: string;
  pluralize: boolean;
}

export interface BlueprintFindOptions {
  where?: Record<string, any>;
  limit?: number;
  skip?: number;
  sort?: string | Record<string, 'ASC' | 'DESC'>;
  select?: string[];
  populate?: string | string[];
}

// WebSocket Types
export interface SailsSocket {
  id: string;
  join(roomName: string, callback?: Function): void;
  leave(roomName: string, callback?: Function): void;
  broadcast: {
    to(roomName: string): {
      emit(event: string, data?: any): void;
    };
  };
  emit(event: string, data?: any): void;
  on(event: string, callback: Function): void;
  off(event: string, callback?: Function): void;
  request(options: any, callback?: Function): void;
}

// Policy Types
export interface PolicyContext {
  req: SailsRequest;
  res: SailsResponse;
  proceed: (err?: any) => void;
}

// Service Types - global services available in Sails
export interface SailsServices {
  [serviceName: string]: any;
}

// Helper Types - global helpers available in Sails
export interface SailsHelpers {
  [helperName: string]: {
    with(inputs: any): {
      exec(callback: (err: any, result: any) => void): void;
      execSync(): any;
    };
  };
}

// Hook Types
export interface SailsHook {
  configure?(): any;
  defaults?: any;
  initialize?(callback: (err?: any) => void): void;
  routes?: {
    before?: Record<string, string | Function>;
    after?: Record<string, string | Function>;
  };
}

// Configuration Environment Types
export interface SailsEnvironmentConfig {
  port?: number;
  environment?: 'development' | 'production' | 'test';
  hookTimeout?: number;
  keepResponseErrors?: boolean;
  explicitHost?: string;
  ssl?: {
    key: string;
    cert: string;
  };
}

// Global Sails Types
declare global {
  var sails: {
    models: Record<string, WaterlineModel>;
    services: SailsServices;
    helpers: SailsHelpers;
    config: SailsConfig;
    hooks: Record<string, SailsHook>;
    log: {
      error: (message: string, ...args: any[]) => void;
      warn: (message: string, ...args: any[]) => void;
      info: (message: string, ...args: any[]) => void;
      debug: (message: string, ...args: any[]) => void;
      verbose: (message: string, ...args: any[]) => void;
      silly: (message: string, ...args: any[]) => void;
    };
    sockets: {
      join: (socket: any, roomName: string, callback?: Function) => void;
      leave: (socket: any, roomName: string, callback?: Function) => void;
      broadcast: (roomName: string, event: string, data?: any) => void;
      emit: (event: string, data?: any) => void;
    };
    after: (event: string, callback: Function) => void;
    on: (event: string, callback: Function) => void;
    once: (event: string, callback: Function) => void;
    lift: (options?: any, callback?: Function) => void;
    lower: (callback?: Function) => void;
    load: (options?: any, callback?: Function) => void;
    reload: (callback?: Function) => void;
    getRouteFor: (target: string) => string;
    request: (url: string, data?: any, callback?: Function) => any;
  };
}

// Re-export main types from sails integration
export {
  SailsConfig,
  SailsModel,
  SailsController,
  SailsService,
  SailsPolicy,
  SailsHelper,
  ModelsConfig,
  ControllersConfig,
  PoliciesConfig,
  ServicesConfig,
  HelpersConfig,
  WebSocketsConfig,
  BlueprintsConfig,
  SecurityConfig,
  I18nConfig,
  DatastoresConfig,
  ServerConfig,
  HooksConfig,
  SessionConfig,
  MiddlewareConfig,
  EnvironmentsConfig,
} from '../integrations/sails';
