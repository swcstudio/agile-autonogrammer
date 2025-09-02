/**
 * Type definitions for Katalyst PWA Module
 */

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'tv' | 'watch' | 'vr' | 'ar' | 'unknown';
export type PlatformOS = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'chromeos' | 'unknown';
export type BrowserType = 'chrome' | 'safari' | 'firefox' | 'edge' | 'opera' | 'samsung' | 'unknown';
export type InstallSource = 'browser' | 'app-store' | 'play-store' | 'microsoft-store' | 'manual';

export interface DeviceCapabilities {
  // Display
  touchScreen: boolean;
  multiTouch: boolean;
  pressure: boolean;
  screenSize: { width: number; height: number };
  pixelDensity: number;
  colorGamut: 'srgb' | 'p3' | 'rec2020';
  hdr: boolean;
  refreshRate: number;
  
  // Input
  keyboard: boolean;
  mouse: boolean;
  stylus: boolean;
  gamepad: boolean;
  
  // Sensors
  accelerometer: boolean;
  gyroscope: boolean;
  magnetometer: boolean;
  ambientLight: boolean;
  proximity: boolean;
  
  // Connectivity
  bluetooth: boolean;
  nfc: boolean;
  usb: boolean;
  wifi: boolean;
  cellular: boolean;
  
  // Media
  camera: boolean;
  microphone: boolean;
  speaker: boolean;
  
  // Performance
  cores: number;
  ram: number;
  gpu: string;
  
  // Features
  biometrics: 'none' | 'fingerprint' | 'face' | 'iris';
  ar: boolean;
  vr: boolean;
  ml: boolean;
}

export interface PlatformInfo {
  device: DeviceType;
  os: PlatformOS;
  osVersion: string;
  browser: BrowserType;
  browserVersion: string;
  isWebView: boolean;
  isPWA: boolean;
  isStandalone: boolean;
  capabilities: DeviceCapabilities;
}

export interface NativeAppInfo {
  available: boolean;
  appId: string;
  appName: string;
  storeUrl: string;
  deepLink: string;
  version: string;
  minOSVersion: string;
  features: string[];
  size: number;
  rating?: number;
  downloads?: number;
}

export interface PWAConfig {
  // Basic Info
  name: string;
  shortName: string;
  description: string;
  version: string;
  
  // Display
  theme: 'light' | 'dark' | 'auto';
  themeColor: string;
  backgroundColor: string;
  display: 'fullscreen' | 'standalone' | 'minimal-ui' | 'browser';
  orientation: 'any' | 'portrait' | 'landscape';
  
  // Icons & Branding
  icons: PWAIcon[];
  screenshots: PWAScreenshot[];
  splashScreens: SplashScreen[];
  
  // Platform Detection
  detectDevice: boolean;
  suggestNativeApp: boolean;
  forceNativePrompt: boolean;
  nativeAppDelay: number;
  
  // Offline Strategy
  offlineStrategy: 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'cache-only' | 'network-only';
  precacheUrls: string[];
  runtimeCaching: RuntimeCacheConfig[];
  
  // Features
  enableNotifications: boolean;
  enableBackgroundSync: boolean;
  enablePeriodicSync: boolean;
  enableShare: boolean;
  enableContacts: boolean;
  enableFileHandling: boolean;
  
  // Platform-Specific
  platforms: {
    mobile?: MobilePWAConfig;
    desktop?: DesktopPWAConfig;
    metaverse?: MetaversePWAConfig;
  };
  
  // Analytics
  analytics: {
    enabled: boolean;
    trackInstalls: boolean;
    trackEngagement: boolean;
    trackPerformance: boolean;
    customEvents: string[];
  };
  
  // Advanced
  experimentalFeatures: string[];
  customHeaders: Record<string, string>;
  cspPolicy?: string;
}

export interface PWAIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: 'any' | 'maskable' | 'monochrome';
  platform?: PlatformOS;
}

export interface PWAScreenshot {
  src: string;
  sizes: string;
  type: string;
  label?: string;
  platform?: DeviceType;
}

export interface SplashScreen {
  src: string;
  sizes: string;
  type: string;
  orientation?: 'portrait' | 'landscape';
  platform?: PlatformOS;
}

export interface RuntimeCacheConfig {
  urlPattern: string | RegExp;
  handler: 'CacheFirst' | 'NetworkFirst' | 'StaleWhileRevalidate' | 'NetworkOnly' | 'CacheOnly';
  options?: {
    cacheName?: string;
    expiration?: {
      maxEntries?: number;
      maxAgeSeconds?: number;
      purgeOnQuotaError?: boolean;
    };
    networkTimeoutSeconds?: number;
    plugins?: any[];
  };
}

export interface MobilePWAConfig {
  enableHapticFeedback: boolean;
  enableSwipeGestures: boolean;
  enablePullToRefresh: boolean;
  statusBarStyle: 'default' | 'light' | 'dark';
  navigationBarColor: string;
  enableSafeArea: boolean;
  iosConfig?: {
    appId: string;
    teamId: string;
    bundleId: string;
    itunesId?: string;
  };
  androidConfig?: {
    packageName: string;
    playStoreId?: string;
    enableTWA: boolean;
    fallbackUrl?: string;
  };
}

export interface DesktopPWAConfig {
  enableTitleBar: boolean;
  enableMenuBar: boolean;
  windowControls: boolean;
  protocol?: string;
  fileHandlers?: FileHandler[];
  shortcuts?: AppShortcut[];
  windowsConfig?: {
    appId: string;
    storeId?: string;
  };
  macConfig?: {
    bundleId: string;
    appStoreId?: string;
  };
  linuxConfig?: {
    desktopEntry: string;
    snapId?: string;
  };
}

export interface MetaversePWAConfig {
  enable3D: boolean;
  enableWebXR: boolean;
  enableHandTracking: boolean;
  enableEyeTracking: boolean;
  vrConfig?: {
    defaultEnvironment: string;
    locomotion: 'teleport' | 'smooth' | 'both';
    comfortMode: boolean;
  };
  arConfig?: {
    enablePlaneDetection: boolean;
    enableImageTracking: boolean;
    enableFaceTracking: boolean;
  };
}

export interface FileHandler {
  action: string;
  accept: Record<string, string[]>;
  icons?: PWAIcon[];
  launchType?: 'single-client' | 'multiple-clients';
}

export interface AppShortcut {
  name: string;
  shortName?: string;
  description?: string;
  url: string;
  icons?: PWAIcon[];
}

export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWAInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  installSource?: InstallSource;
  deferredPrompt?: InstallPromptEvent;
  nativeAppAvailable: boolean;
  nativeAppInfo?: NativeAppInfo;
  suggestedPlatform?: 'pwa' | 'native';
  installInstructions?: string[];
}

export interface PWAMetrics {
  installTime?: number;
  lastLaunchTime?: number;
  launchCount: number;
  sessionDuration: number;
  totalUsageTime: number;
  offlineUsageTime: number;
  dataUsage: {
    cached: number;
    network: number;
    total: number;
  };
  performance: {
    loadTime: number;
    renderTime: number;
    interactionTime: number;
  };
  engagement: {
    pushOptIn: boolean;
    notificationInteractions: number;
    shareCount: number;
    addToHomeScreen: boolean;
  };
}

export interface ServiceWorkerMessage {
  type: string;
  data?: any;
  timestamp: number;
  id?: string;
}

export interface CacheStrategy {
  name: string;
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
  delete(request: Request): Promise<boolean>;
  keys(): Promise<Request[]>;
  clear(): Promise<void>;
}

export interface OfflineQueue {
  add(request: Request): Promise<void>;
  getAll(): Promise<Request[]>;
  remove(request: Request): Promise<void>;
  clear(): Promise<void>;
  replay(): Promise<void>;
}

export interface PWAUpdateInfo {
  available: boolean;
  version?: string;
  size?: number;
  releaseNotes?: string;
  critical?: boolean;
  autoUpdate?: boolean;
}