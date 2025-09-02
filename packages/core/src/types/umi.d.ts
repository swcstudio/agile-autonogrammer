/// <reference types="react" />
/// <reference types="@umijs/max" />

declare global {
  interface Window {
    __UMI_ROUTE_LOADER__: any;
    __UMI_RUNTIME__: {
      version: string;
      plugins: Record<string, any>;
      routes: any[];
      history: any;
    };
    dva?: any;
    g_routes?: any[];
    g_plugin?: any;
    g_history?: any;
    g_app?: any;
  }

  namespace NodeJS {
    interface ProcessEnv {
      UMI_ENV?: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

// Core UMI Types
export interface UmiApp {
  router?: any;
  render?: (Element: React.ComponentType) => void;
  getRoutes?: () => UmiRoute[];
  plugin?: any;
  history?: any;
}

export interface UmiContext {
  route: UmiRoute;
  location: {
    pathname: string;
    search: string;
    hash: string;
    state?: any;
  };
  params: Record<string, string>;
  query: Record<string, string>;
}

// Plugin System Types
export interface UmiPlugin {
  key: string;
  apply: UmiPluginApply;
  config?: any;
}

export type UmiPluginApply = (api: UmiPluginAPI) => void;

export interface UmiRuntimePlugin {
  onRouteChange?: (route: UmiRoute) => void;
  modifyClientRenderOpts?: (memo: any) => any;
  modifyRoutes?: (routes: UmiRoute[]) => UmiRoute[];
  render?: (oldRender: () => void) => void;
  onAppCreated?: (opts: { app: any; router: any }) => void;
  rootContainer?: (LastRootContainer: React.ComponentType) => React.ComponentType;
  innerProvider?: (container: React.ComponentType) => React.ComponentType;
  i18nProvider?: (container: React.ComponentType) => React.ComponentType;
  accessProvider?: (container: React.ComponentType) => React.ComponentType;
  dataflowProvider?: (container: React.ComponentType) => React.ComponentType;
  outerProvider?: (container: React.ComponentType) => React.ComponentType;
}

// DVA Types
export interface DvaModel {
  namespace: string;
  state?: any;
  effects?: {
    [key: string]: any;
  };
  reducers?: {
    [key: string]: (state: any, action: any) => any;
  };
  subscriptions?: {
    [key: string]: (api: { dispatch: any; history: any }) => void;
  };
}

export interface DvaEffectAPI {
  call: (fn: any, ...args: any[]) => any;
  put: (action: any) => any;
  select: (selector?: (state: any) => any) => any;
  take: (type: string) => any;
  cancel: (task: any) => any;
  cancelled: () => boolean;
  fork: (fn: any, ...args: any[]) => any;
  spawn: (fn: any, ...args: any[]) => any;
  delay: (ms: number) => Promise<void>;
}

export interface DvaAction<T = any> {
  type: string;
  payload?: T;
  [key: string]: any;
}

export type DvaConnect = <T = any, U = any>(
  mapStateToProps?: (state: any) => T,
  mapDispatchToProps?: (dispatch: (action: DvaAction) => void) => U
) => (component: React.ComponentType<T & U>) => React.ComponentType;

// Request Types
export interface RequestConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer';
  withCredentials?: boolean;
  auth?: {
    username: string;
    password: string;
  };
  xsrfCookieName?: string;
  xsrfHeaderName?: string;
  validateStatus?: (status: number) => boolean;
  maxRedirects?: number;
  socketPath?: string;
  httpAgent?: any;
  httpsAgent?: any;
  proxy?: any;
  decompress?: boolean;
}

export interface RequestResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: RequestConfig;
  request?: any;
}

export interface RequestError {
  message: string;
  name: string;
  config: RequestConfig;
  code?: string;
  request?: any;
  response?: RequestResponse;
  isAxiosError: boolean;
  toJSON: () => object;
}

export interface UseRequestOptions<T = any> {
  manual?: boolean;
  defaultParams?: any[];
  onBefore?: (params: any[]) => void;
  onSuccess?: (data: T, params: any[]) => void;
  onError?: (error: RequestError, params: any[]) => void;
  onFinally?: (params: any[], data?: T, error?: RequestError) => void;
  defaultLoading?: boolean;
  refreshDeps?: React.DependencyList;
  refreshDepsAction?: () => void;
  loadingDelay?: number;
  pollingInterval?: number;
  pollingWhenHidden?: boolean;
  pollingErrorRetryCount?: number;
  debounceWait?: number;
  debounceLeading?: boolean;
  debounceTrailing?: boolean;
  debounceMaxWait?: number;
  throttleWait?: number;
  throttleLeading?: boolean;
  throttleTrailing?: boolean;
  cacheKey?: string;
  cacheTime?: number;
  staleTime?: number;
  setCache?: (data: T) => void;
  getCache?: () => T | undefined;
  retryCount?: number;
  retryInterval?: number;
  ready?: boolean;
}

export interface UseRequestResult<T = any> {
  data?: T;
  error?: RequestError;
  loading: boolean;
  run: (...params: any[]) => Promise<T>;
  runAsync: (...params: any[]) => Promise<T>;
  refresh: () => Promise<T>;
  refreshAsync: () => Promise<T>;
  mutate: (data?: T | ((oldData?: T) => T)) => void;
  cancel: () => void;
}

// Ant Design Pro Layout Types
export interface ProLayoutProps {
  title?: React.ReactNode;
  logo?: React.ReactNode | (() => React.ReactNode);
  loading?: boolean;
  navTheme?: 'light' | 'dark' | 'realDark';
  layout?: 'side' | 'top' | 'mix';
  contentWidth?: 'Fluid' | 'Fixed';
  primaryColor?: string;
  fixedHeader?: boolean;
  fixSiderbar?: boolean;
  breakpoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  menu?: {
    locale?: boolean;
    defaultOpenAll?: boolean;
    ignoreFlatMenu?: boolean;
    type?: 'sub' | 'group';
    autoClose?: boolean;
  };
  iconfontUrl?: string;
  locale?: 'zh-CN' | 'zh-TW' | 'en-US' | 'it-IT' | 'ko-KR';
  settings?: ProSettings;
  siderWidth?: number;
  headerHeight?: number;
  headerRender?: (props: ProLayoutProps) => React.ReactNode;
  headerTitleRender?: (
    logo: React.ReactNode,
    title: React.ReactNode,
    props: ProLayoutProps
  ) => React.ReactNode;
  headerContentRender?: (props: ProLayoutProps) => React.ReactNode;
  rightContentRender?: (props: ProLayoutProps) => React.ReactNode;
  collapsedButtonRender?: (collapsed?: boolean) => React.ReactNode;
  footerRender?: (props: ProLayoutProps) => React.ReactNode;
  pageTitleRender?: (props: ProLayoutProps, pageName?: string, info?: PageInfo) => string;
  menuRender?: (props: ProLayoutProps, defaultDom: React.ReactNode) => React.ReactNode;
  postMenuData?: (menusData?: MenuDataItem[]) => MenuDataItem[];
  menuItemRender?: (
    itemProps: MenuDataItem,
    defaultDom: React.ReactNode,
    props: ProLayoutProps
  ) => React.ReactNode;
  subMenuItemRender?: (
    itemProps: MenuDataItem,
    defaultDom: React.ReactNode,
    props: ProLayoutProps
  ) => React.ReactNode;
  menuDataRender?: (menusData: MenuDataItem[]) => MenuDataItem[];
  breadcrumbRender?: (routers: AntdBreadcrumbProps['routes']) => AntdBreadcrumbProps['routes'];
  itemRender?: AntdBreadcrumbProps['itemRender'];
  formatMessage?: (message: MessageDescriptor) => string;
  disableMobile?: boolean;
  links?: React.ReactNode[];
  menuProps?: MenuProps;
  waterMarkProps?: WaterMarkProps;
  onCollapse?: (collapsed: boolean) => void;
  onMenuHeaderClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  menuHeaderRender?: (
    logo: React.ReactNode,
    title: React.ReactNode,
    props: ProLayoutProps
  ) => React.ReactNode;
  onOpenKeys?: (openKeys: string[]) => void;
  onSelect?: (selectedKeys: string[]) => void;
  children?: React.ReactNode;
}

export interface ProSettings {
  navTheme?: 'light' | 'dark' | 'realDark';
  layout?: 'side' | 'top' | 'mix';
  contentWidth?: 'Fluid' | 'Fixed';
  fixedHeader?: boolean;
  fixSiderbar?: boolean;
  menu?: {
    locale?: boolean;
    defaultOpenAll?: boolean;
  };
  title?: string;
  primaryColor?: string;
  colorWeak?: boolean;
  splitMenus?: boolean;
  headerRender?: boolean;
  footerRender?: boolean;
  menuRender?: boolean;
  menuHeaderRender?: boolean;
}

export interface MenuDataItem {
  children?: MenuDataItem[];
  routes?: MenuDataItem[];
  hideChildrenInMenu?: boolean;
  hideInMenu?: boolean;
  hideInBreadcrumb?: boolean;
  icon?: React.ReactNode;
  locale?: string | false;
  name?: string;
  key?: string;
  pro_layout_parentKeys?: string[];
  path?: string;
  [key: string]: any;
}

export interface PageInfo {
  title: string;
  pageName: string;
}

// Qiankun Types
export interface QiankunApp {
  name: string;
  entry: string | { scripts?: string[]; styles?: string[]; html?: string };
  container?: string | HTMLElement;
  activeRule?:
    | string
    | ((location: Location) => boolean)
    | Array<string | ((location: Location) => boolean)>;
  props?: any;
  loader?: (loading: boolean) => void;
}

export interface QiankunOptions {
  sandbox?: boolean | { strictStyleIsolation?: boolean; experimentalStyleIsolation?: boolean };
  singular?: boolean;
  fetch?: typeof window.fetch;
  getPublicPath?: (entry: Entry) => string;
  getTemplate?: (tpl: string) => string;
  excludeAssetFilter?: (assetUrl: string) => boolean;
  insertBefore?: HTMLElement;
}

export interface QiankunLifecycle {
  beforeLoad?: (app: LoadableApp) => Promise<any> | any;
  beforeMount?: (app: LoadableApp) => Promise<any> | any;
  afterMount?: (app: LoadableApp) => Promise<any> | any;
  beforeUnmount?: (app: LoadableApp) => Promise<any> | any;
  afterUnmount?: (app: LoadableApp) => Promise<any> | any;
}

// Model (useModel) Types
export interface ModelAPI {
  namespace: string;
  state: any;
  dispatch: (action: any) => void;
  [key: string]: any;
}

// Locale Types
export interface LocaleAPI {
  locale: string;
  setLocale: (locale: string) => void;
  formatMessage: (descriptor: MessageDescriptor, values?: any) => string;
  getAllLocales: () => string[];
}

export interface MessageDescriptor {
  id: string;
  defaultMessage?: string;
  values?: Record<string, any>;
}

// Access Types
export interface AccessAPI {
  [key: string]: boolean | undefined;
}

// Utils Types
export interface UmiHistory {
  push: (path: string | { pathname: string; search?: string; hash?: string; state?: any }) => void;
  replace: (
    path: string | { pathname: string; search?: string; hash?: string; state?: any }
  ) => void;
  go: (delta: number) => void;
  goBack: () => void;
  goForward: () => void;
  block: (prompt?: any) => () => void;
  listen: (listener: any) => () => void;
  location: {
    pathname: string;
    search: string;
    state: any;
    hash: string;
    key?: string;
  };
  length: number;
  action: 'PUSH' | 'POP' | 'REPLACE';
  createHref: (location: any) => string;
}

// Plugin Hooks Types
export interface UmiHooks {
  useModel: <T = any>(namespace: string) => T;
  useRequest: <T = any>(
    service: (...args: any[]) => Promise<T>,
    options?: UseRequestOptions<T>
  ) => UseRequestResult<T>;
  useAccess: () => AccessAPI;
  useIntl: () => LocaleAPI;
  getLocale: () => string;
  setLocale: (locale: string) => void;
  getAllLocales: () => string[];
  history: UmiHistory;
  connect?: DvaConnect;
  getDvaApp?: () => any;
  request: (url: string, options?: RequestConfig) => Promise<any>;
}

// Build-time Types
export interface UmiBuildConfig {
  publicPath?: string;
  outputPath?: string;
  hash?: boolean;
  chunks?: string[];
  externals?: Record<string, string>;
  headScripts?: any[];
  scripts?: any[];
  styles?: any[];
  links?: any[];
  metas?: any[];
  title?: string;
  favicons?: string[];
  manifest?: any;
  mountElementId?: string;
}

// TypeScript Declaration Merging
declare module 'umi' {
  export * from './umi';
  export const connect: DvaConnect;
  export const getDvaApp: () => any;
  export const useModel: <T = any>(namespace: string) => T;
  export const useRequest: <T = any>(
    service: (...args: any[]) => Promise<T>,
    options?: UseRequestOptions<T>
  ) => UseRequestResult<T>;
  export const useAccess: () => AccessAPI;
  export const useIntl: () => LocaleAPI;
  export const getLocale: () => string;
  export const setLocale: (locale: string) => void;
  export const getAllLocales: () => string[];
  export const history: UmiHistory;
  export const request: (url: string, options?: RequestConfig) => Promise<any>;
}

declare module '@umijs/max' {
  export * from 'umi';
}

// CSS Modules
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.sass' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.less' {
  const classes: { [key: string]: string };
  export default classes;
}

// Asset imports
declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.bmp' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}
