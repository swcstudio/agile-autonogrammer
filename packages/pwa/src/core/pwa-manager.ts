/**
 * Core PWA Manager
 * Orchestrates all PWA functionality and platform detection
 */

import { EventEmitter } from 'events';
import type { 
  PWAConfig, 
  PlatformInfo, 
  PWAInstallState, 
  PWAMetrics,
  InstallPromptEvent,
  ServiceWorkerMessage,
  PWAUpdateInfo
} from '../types';
import { DeviceDetector } from '../detection/device-detector';
import { CapabilityChecker } from '../detection/capability-checker';
import { ManifestGenerator } from './manifest-generator';
import { ServiceWorkerManager } from './service-worker';
import { InstallPromptManager } from './install-prompt';
import { NativeBridge } from '../bridge/native-bridge';
import { OfflineManager } from '../offline/offline-manager';
import { PushManager } from '../notifications/push-manager';
import { PWAAnalytics } from '../analytics/pwa-analytics';
import { MobileAdapter } from '../platforms/mobile-adapter';
import { DesktopAdapter } from '../platforms/desktop-adapter';
import { MetaverseAdapter } from '../platforms/metaverse-adapter';

export class PWAManager extends EventEmitter {
  private config: PWAConfig;
  private deviceDetector: DeviceDetector;
  private capabilityChecker: CapabilityChecker;
  private manifestGenerator: ManifestGenerator;
  private serviceWorker: ServiceWorkerManager;
  private installPrompt: InstallPromptManager;
  private nativeBridge: NativeBridge;
  private offlineManager: OfflineManager;
  private pushManager: PushManager;
  private analytics: PWAAnalytics;
  private platformAdapter: MobileAdapter | DesktopAdapter | MetaverseAdapter | null = null;
  
  private platformInfo: PlatformInfo | null = null;
  private installState: PWAInstallState = {
    canInstall: false,
    isInstalled: false,
    isStandalone: false,
    nativeAppAvailable: false
  };
  
  private metrics: PWAMetrics = {
    launchCount: 0,
    sessionDuration: 0,
    totalUsageTime: 0,
    offlineUsageTime: 0,
    dataUsage: { cached: 0, network: 0, total: 0 },
    performance: { loadTime: 0, renderTime: 0, interactionTime: 0 },
    engagement: { 
      pushOptIn: false, 
      notificationInteractions: 0, 
      shareCount: 0, 
      addToHomeScreen: false 
    }
  };

  constructor(config: PWAConfig) {
    super();
    this.config = config;
    
    // Initialize core components
    this.deviceDetector = new DeviceDetector();
    this.capabilityChecker = new CapabilityChecker();
    this.manifestGenerator = new ManifestGenerator(config);
    this.serviceWorker = new ServiceWorkerManager(config);
    this.installPrompt = new InstallPromptManager(config);
    this.nativeBridge = new NativeBridge();
    this.offlineManager = new OfflineManager(config);
    this.pushManager = new PushManager(config);
    this.analytics = new PWAAnalytics(config);
  }

  /**
   * Initialize the PWA
   */
  async initialize(): Promise<void> {
    try {
      // Detect platform and capabilities
      await this.detectPlatform();
      
      // Generate and inject manifest
      await this.setupManifest();
      
      // Register service worker
      await this.registerServiceWorker();
      
      // Setup platform-specific adapter
      await this.setupPlatformAdapter();
      
      // Initialize install prompt handling
      await this.setupInstallPrompt();
      
      // Setup offline functionality
      await this.setupOfflineSupport();
      
      // Initialize push notifications if enabled
      if (this.config.enableNotifications) {
        await this.setupPushNotifications();
      }
      
      // Start analytics tracking
      if (this.config.analytics.enabled) {
        await this.startAnalytics();
      }
      
      // Check for native app availability
      await this.checkNativeApp();
      
      // Handle app updates
      await this.checkForUpdates();
      
      // Emit ready event
      this.emit('ready', {
        platform: this.platformInfo,
        installState: this.installState,
        metrics: this.metrics
      });
      
      console.log('🚀 Katalyst PWA initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PWA:', error);
      this.emit('error', error);
    }
  }

  /**
   * Detect platform and device capabilities
   */
  private async detectPlatform(): Promise<void> {
    this.platformInfo = await this.deviceDetector.detect();
    
    // Check if running as installed PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone ||
                        document.referrer.includes('android-app://');
    
    this.installState.isStandalone = isStandalone;
    this.installState.isInstalled = isStandalone;
    
    // Emit platform detected event
    this.emit('platform-detected', this.platformInfo);
  }

  /**
   * Setup and inject manifest
   */
  private async setupManifest(): Promise<void> {
    const manifest = await this.manifestGenerator.generate(this.platformInfo!);
    
    // Create manifest blob and URL
    const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: 'application/manifest+json'
    });
    const manifestUrl = URL.createObjectURL(manifestBlob);
    
    // Inject manifest link
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = manifestUrl;
    document.head.appendChild(link);
    
    // Set theme color
    const themeColorMeta = document.createElement('meta');
    themeColorMeta.name = 'theme-color';
    themeColorMeta.content = this.config.themeColor;
    document.head.appendChild(themeColorMeta);
    
    // Set viewport for mobile
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      viewportMeta.content = 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes';
      document.head.appendChild(viewportMeta);
    }
    
    // Apple-specific meta tags
    if (this.platformInfo?.os === 'ios') {
      this.setupAppleMeta();
    }
  }

  /**
   * Setup Apple-specific meta tags
   */
  private setupAppleMeta(): void {
    // Apple touch icon
    const appleTouchIcon = document.createElement('link');
    appleTouchIcon.rel = 'apple-touch-icon';
    appleTouchIcon.href = this.config.icons.find(i => i.sizes === '180x180')?.src || this.config.icons[0].src;
    document.head.appendChild(appleTouchIcon);
    
    // Apple mobile web app capable
    const appleWebApp = document.createElement('meta');
    appleWebApp.name = 'apple-mobile-web-app-capable';
    appleWebApp.content = 'yes';
    document.head.appendChild(appleWebApp);
    
    // Apple status bar style
    const appleStatusBar = document.createElement('meta');
    appleStatusBar.name = 'apple-mobile-web-app-status-bar-style';
    appleStatusBar.content = this.config.platforms?.mobile?.statusBarStyle || 'default';
    document.head.appendChild(appleStatusBar);
    
    // Apple title
    const appleTitle = document.createElement('meta');
    appleTitle.name = 'apple-mobile-web-app-title';
    appleTitle.content = this.config.shortName;
    document.head.appendChild(appleTitle);
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }
    
    try {
      const registration = await this.serviceWorker.register();
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        this.handleServiceWorkerUpdate(registration);
      });
      
      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data);
      });
      
      console.log('Service Worker registered successfully');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  /**
   * Setup platform-specific adapter
   */
  private async setupPlatformAdapter(): Promise<void> {
    if (!this.platformInfo) return;
    
    switch (this.platformInfo.device) {
      case 'mobile':
      case 'tablet':
        this.platformAdapter = new MobileAdapter(this.config, this.platformInfo);
        break;
      case 'desktop':
        this.platformAdapter = new DesktopAdapter(this.config, this.platformInfo);
        break;
      case 'vr':
      case 'ar':
        this.platformAdapter = new MetaverseAdapter(this.config, this.platformInfo);
        break;
    }
    
    if (this.platformAdapter) {
      await this.platformAdapter.initialize();
      
      // Apply platform-specific optimizations
      await this.platformAdapter.optimize();
    }
  }

  /**
   * Setup install prompt handling
   */
  private async setupInstallPrompt(): Promise<void> {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault();
      const promptEvent = event as InstallPromptEvent;
      
      this.installState.canInstall = true;
      this.installState.deferredPrompt = promptEvent;
      
      // Check if we should suggest native app instead
      if (this.config.suggestNativeApp && this.installState.nativeAppAvailable) {
        this.suggestNativeApp();
      } else {
        this.emit('install-available', this.installState);
      }
    });
    
    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      this.installState.isInstalled = true;
      this.installState.canInstall = false;
      this.metrics.engagement.addToHomeScreen = true;
      
      this.emit('app-installed');
      this.analytics.trackEvent('pwa_installed');
    });
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.installState.isInstalled = true;
      this.installState.isStandalone = true;
    }
  }

  /**
   * Setup offline support
   */
  private async setupOfflineSupport(): Promise<void> {
    await this.offlineManager.initialize();
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.emit('online');
      this.offlineManager.syncQueue();
    });
    
    window.addEventListener('offline', () => {
      this.emit('offline');
    });
  }

  /**
   * Setup push notifications
   */
  private async setupPushNotifications(): Promise<void> {
    const permission = await this.pushManager.requestPermission();
    
    if (permission === 'granted') {
      const subscription = await this.pushManager.subscribe();
      this.metrics.engagement.pushOptIn = true;
      
      this.emit('push-subscribed', subscription);
    }
  }

  /**
   * Start analytics tracking
   */
  private async startAnalytics(): Promise<void> {
    await this.analytics.initialize();
    
    // Track launch
    this.metrics.launchCount++;
    this.metrics.lastLaunchTime = Date.now();
    this.analytics.trackEvent('pwa_launch', {
      platform: this.platformInfo,
      installState: this.installState
    });
    
    // Track session
    const sessionStart = Date.now();
    window.addEventListener('beforeunload', () => {
      const sessionDuration = Date.now() - sessionStart;
      this.metrics.sessionDuration = sessionDuration;
      this.metrics.totalUsageTime += sessionDuration;
      
      this.analytics.trackEvent('pwa_session', {
        duration: sessionDuration,
        metrics: this.metrics
      });
    });
  }

  /**
   * Check for native app availability
   */
  private async checkNativeApp(): Promise<void> {
    if (!this.config.detectDevice || !this.platformInfo) return;
    
    const nativeAppInfo = await this.nativeBridge.checkNativeApp(this.platformInfo);
    
    if (nativeAppInfo?.available) {
      this.installState.nativeAppAvailable = true;
      this.installState.nativeAppInfo = nativeAppInfo;
      
      // Determine suggested platform
      if (this.shouldSuggestNative()) {
        this.installState.suggestedPlatform = 'native';
        
        // Show native app prompt after delay
        if (this.config.forceNativePrompt) {
          setTimeout(() => {
            this.suggestNativeApp();
          }, this.config.nativeAppDelay || 5000);
        }
      } else {
        this.installState.suggestedPlatform = 'pwa';
      }
    }
  }

  /**
   * Determine if native app should be suggested
   */
  private shouldSuggestNative(): boolean {
    if (!this.platformInfo || !this.installState.nativeAppInfo) return false;
    
    // Check platform-specific criteria
    const { device, os, capabilities } = this.platformInfo;
    const nativeFeatures = this.installState.nativeAppInfo.features || [];
    
    // Prefer native on mobile for better performance
    if (device === 'mobile' || device === 'tablet') {
      // Check if native app has features PWA can't provide
      if (nativeFeatures.includes('biometrics') && capabilities.biometrics !== 'none') {
        return true;
      }
      if (nativeFeatures.includes('ar') && capabilities.ar) {
        return true;
      }
      if (nativeFeatures.includes('background-location')) {
        return true;
      }
    }
    
    // Prefer native on desktop for better integration
    if (device === 'desktop') {
      if (nativeFeatures.includes('file-system')) {
        return true;
      }
      if (nativeFeatures.includes('system-tray')) {
        return true;
      }
    }
    
    // Prefer native for VR/AR
    if (device === 'vr' || device === 'ar') {
      return true;
    }
    
    return false;
  }

  /**
   * Suggest native app installation
   */
  private suggestNativeApp(): void {
    if (!this.installState.nativeAppInfo) return;
    
    this.emit('suggest-native', {
      appInfo: this.installState.nativeAppInfo,
      platform: this.platformInfo,
      installInstructions: this.getInstallInstructions()
    });
  }

  /**
   * Get platform-specific install instructions
   */
  private getInstallInstructions(): string[] {
    const instructions: string[] = [];
    const { os } = this.platformInfo!;
    const { nativeAppInfo } = this.installState;
    
    if (!nativeAppInfo) {
      // PWA install instructions
      if (os === 'ios') {
        instructions.push('Tap the Share button');
        instructions.push('Scroll down and tap "Add to Home Screen"');
        instructions.push('Tap "Add" to install');
      } else if (os === 'android') {
        instructions.push('Tap the menu button (⋮)');
        instructions.push('Select "Install app" or "Add to Home Screen"');
        instructions.push('Tap "Install" to confirm');
      } else {
        instructions.push('Click the install button in the address bar');
        instructions.push('Click "Install" to add to your device');
      }
    } else {
      // Native app install instructions
      if (os === 'ios') {
        instructions.push('Tap "View in App Store"');
        instructions.push('Tap "Get" to download');
        instructions.push('Open the app after installation');
      } else if (os === 'android') {
        instructions.push('Tap "View in Play Store"');
        instructions.push('Tap "Install" to download');
        instructions.push('Tap "Open" after installation');
      } else if (os === 'windows') {
        instructions.push('Click "Get from Microsoft Store"');
        instructions.push('Click "Get" to install');
        instructions.push('Launch from Start menu');
      } else if (os === 'macos') {
        instructions.push('Click "View in Mac App Store"');
        instructions.push('Click "Get" to download');
        instructions.push('Open from Applications');
      }
    }
    
    this.installState.installInstructions = instructions;
    return instructions;
  }

  /**
   * Check for app updates
   */
  private async checkForUpdates(): Promise<void> {
    // Check service worker for updates
    const swUpdate = await this.serviceWorker.checkForUpdate();
    
    if (swUpdate) {
      const updateInfo: PWAUpdateInfo = {
        available: true,
        version: this.config.version,
        critical: false,
        autoUpdate: true
      };
      
      this.emit('update-available', updateInfo);
    }
    
    // Check native app for updates if available
    if (this.installState.nativeAppInfo) {
      const nativeUpdate = await this.nativeBridge.checkForUpdate(
        this.installState.nativeAppInfo
      );
      
      if (nativeUpdate) {
        this.emit('native-update-available', nativeUpdate);
      }
    }
  }

  /**
   * Handle service worker update
   */
  private handleServiceWorkerUpdate(registration: ServiceWorkerRegistration): void {
    const newWorker = registration.installing;
    
    if (newWorker) {
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available
          this.emit('update-ready');
        }
      });
    }
  }

  /**
   * Handle service worker messages
   */
  private handleServiceWorkerMessage(message: ServiceWorkerMessage): void {
    switch (message.type) {
      case 'cache-updated':
        this.metrics.dataUsage.cached = message.data.size;
        break;
      case 'network-request':
        this.metrics.dataUsage.network += message.data.size;
        break;
      case 'offline-ready':
        this.emit('offline-ready');
        break;
      case 'sync-complete':
        this.emit('sync-complete', message.data);
        break;
      default:
        this.emit('sw-message', message);
    }
  }

  /**
   * Prompt for PWA installation
   */
  async promptInstall(): Promise<boolean> {
    if (!this.installState.canInstall || !this.installState.deferredPrompt) {
      return false;
    }
    
    try {
      await this.installState.deferredPrompt.prompt();
      const { outcome } = await this.installState.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        this.analytics.trackEvent('pwa_install_accepted');
        return true;
      } else {
        this.analytics.trackEvent('pwa_install_dismissed');
        return false;
      }
    } catch (error) {
      console.error('Install prompt failed:', error);
      return false;
    }
  }

  /**
   * Open native app or store
   */
  async openNativeApp(): Promise<void> {
    if (!this.installState.nativeAppInfo) return;
    
    try {
      // Try deep link first
      await this.nativeBridge.openDeepLink(this.installState.nativeAppInfo.deepLink);
    } catch {
      // Fallback to store URL
      window.open(this.installState.nativeAppInfo.storeUrl, '_blank');
    }
    
    this.analytics.trackEvent('native_app_opened');
  }

  /**
   * Get current PWA state
   */
  getState(): {
    platform: PlatformInfo | null;
    install: PWAInstallState;
    metrics: PWAMetrics;
  } {
    return {
      platform: this.platformInfo,
      install: this.installState,
      metrics: this.metrics
    };
  }

  /**
   * Update PWA configuration
   */
  updateConfig(config: Partial<PWAConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config-updated', this.config);
  }

  /**
   * Destroy PWA manager
   */
  destroy(): void {
    this.serviceWorker.unregister();
    this.offlineManager.destroy();
    this.pushManager.unsubscribe();
    this.analytics.destroy();
    this.removeAllListeners();
  }
}