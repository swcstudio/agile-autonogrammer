/**
 * Deployment Orchestrator
 * Manages the entire platform-specific deployment flow
 */

import { EventEmitter } from 'events';
import type { PlatformInfo, PlatformOS, DeviceType } from '../types';
import { DeploymentManifestManager, type DeploymentManifest, type InstallMethod } from './manifest';
import { DeviceDetector } from '../detection/device-detector';
import { NativeBridge } from '../bridge/native-bridge';
import { InstallPromptManager } from '../core/install-prompt';
import { PWAAnalytics } from '../analytics/pwa-analytics';

// ============================================================================
// Types
// ============================================================================

export interface DeploymentConfig {
  manifest: DeploymentManifest;
  cdnUrl?: string;
  environment?: 'development' | 'staging' | 'production';
  analytics?: {
    enabled: boolean;
    trackingId?: string;
  };
  ui?: {
    autoPrompt: boolean;
    promptDelay: number;
    theme?: 'light' | 'dark' | 'auto';
  };
  fallback?: {
    toPWA: boolean;
    showAlternatives: boolean;
  };
}

export interface DeploymentState {
  platform: PlatformInfo;
  availableMethods: InstallMethod[];
  optimalMethod: InstallMethod;
  installationStatus: 'idle' | 'detecting' | 'ready' | 'installing' | 'installed' | 'failed';
  error?: Error;
  metrics: DeploymentMetrics;
}

export interface DeploymentMetrics {
  detectionTime: number;
  installationTime?: number;
  method?: string;
  success?: boolean;
  errorCode?: string;
  userChoice?: string;
}

export interface InstallationResult {
  success: boolean;
  method: InstallMethod;
  platform: PlatformOS;
  error?: Error;
  metrics: DeploymentMetrics;
}

// ============================================================================
// Deployment Orchestrator Class
// ============================================================================

export class DeploymentOrchestrator extends EventEmitter {
  private config: DeploymentConfig;
  private manifestManager: DeploymentManifestManager;
  private deviceDetector: DeviceDetector;
  private nativeBridge: NativeBridge;
  private promptManager: InstallPromptManager;
  private analytics: PWAAnalytics | null = null;
  private state: DeploymentState;
  private installInProgress = false;

  constructor(config: DeploymentConfig) {
    super();
    this.config = config;
    
    // Initialize components
    this.manifestManager = new DeploymentManifestManager(
      config.manifest,
      config.cdnUrl,
      config.environment
    );
    this.deviceDetector = new DeviceDetector();
    this.nativeBridge = new NativeBridge();
    this.promptManager = new InstallPromptManager({
      name: config.manifest.name || 'App',
      shortName: config.manifest.shortName || 'App',
      description: config.manifest.description || '',
      version: config.manifest.version,
      theme: 'light',
      themeColor: '#667eea',
      backgroundColor: '#ffffff',
      display: 'standalone',
      orientation: 'any',
      icons: [],
      screenshots: [],
      splashScreens: [],
      detectDevice: true,
      suggestNativeApp: true,
      forceNativePrompt: false,
      nativeAppDelay: 5000,
      offlineStrategy: 'network-first',
      precacheUrls: [],
      runtimeCaching: [],
      enableNotifications: false,
      enableBackgroundSync: false,
      enablePeriodicSync: false,
      enableShare: false,
      enableContacts: false,
      enableFileHandling: false,
      platforms: {},
      analytics: {
        enabled: config.analytics?.enabled || false,
        trackInstalls: true,
        trackEngagement: true,
        trackPerformance: true,
        customEvents: []
      },
      experimentalFeatures: [],
      customHeaders: {},
    } as any);
    
    // Initialize analytics if enabled
    if (config.analytics?.enabled) {
      this.analytics = new PWAAnalytics({
        analytics: {
          enabled: true,
          trackInstalls: true,
          trackEngagement: true,
          trackPerformance: true,
          customEvents: []
        }
      } as any);
    }
    
    // Initialize state
    this.state = {
      platform: null!,
      availableMethods: [],
      optimalMethod: { type: 'pwa', url: null },
      installationStatus: 'idle',
      metrics: {
        detectionTime: 0
      }
    };
  }

  /**
   * Initialize the deployment orchestrator
   */
  async initialize(): Promise<DeploymentState> {
    try {
      this.updateStatus('detecting');
      const startTime = performance.now();
      
      // Detect platform
      this.state.platform = await this.deviceDetector.detect();
      
      // Get available installation methods
      this.state.availableMethods = this.manifestManager.getAllInstallMethods(
        this.state.platform.os
      );
      
      // Determine optimal method
      this.state.optimalMethod = this.manifestManager.getOptimalInstallMethod(
        this.state.platform.os,
        this.state.platform.capabilities
      );
      
      // Calculate detection time
      this.state.metrics.detectionTime = performance.now() - startTime;
      
      // Check if native app is installed
      await this.checkNativeAppStatus();
      
      // Update status
      this.updateStatus('ready');
      
      // Emit ready event
      this.emit('ready', this.state);
      
      // Track detection analytics
      this.trackEvent('deployment_initialized', {
        platform: this.state.platform.os,
        device: this.state.platform.device,
        optimal_method: this.state.optimalMethod.type,
        available_methods: this.state.availableMethods.length,
        detection_time: this.state.metrics.detectionTime
      });
      
      // Auto-prompt if configured
      if (this.config.ui?.autoPrompt) {
        setTimeout(() => {
          this.showInstallPrompt();
        }, this.config.ui.promptDelay || 5000);
      }
      
      return this.state;
    } catch (error) {
      this.state.error = error as Error;
      this.updateStatus('failed');
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Show installation prompt
   */
  async showInstallPrompt(): Promise<void> {
    if (this.state.installationStatus !== 'ready') {
      console.warn('Deployment not ready for installation prompt');
      return;
    }
    
    // Check if already installed
    if (await this.isAppInstalled()) {
      console.log('App already installed');
      return;
    }
    
    const { platform, optimalMethod, availableMethods } = this.state;
    
    // Emit prompt event
    this.emit('prompt-shown', {
      platform,
      optimalMethod,
      availableMethods
    });
    
    // Track prompt shown
    this.trackEvent('install_prompt_shown', {
      platform: platform.os,
      method: optimalMethod.type
    });
    
    // Show appropriate prompt based on optimal method
    if (optimalMethod.type === 'pwa') {
      this.showPWAPrompt();
    } else if (this.config.fallback?.showAlternatives) {
      this.showPlatformChoicePrompt();
    } else {
      this.showNativePrompt();
    }
  }

  /**
   * Install using specified method
   */
  async install(method?: InstallMethod): Promise<InstallationResult> {
    if (this.installInProgress) {
      throw new Error('Installation already in progress');
    }
    
    this.installInProgress = true;
    this.updateStatus('installing');
    
    const installMethod = method || this.state.optimalMethod;
    const startTime = performance.now();
    
    try {
      // Track installation start
      this.trackEvent('installation_started', {
        platform: this.state.platform.os,
        method: installMethod.type
      });
      
      let success = false;
      
      switch (installMethod.type) {
        case 'pwa':
          success = await this.installPWA();
          break;
          
        case 'store':
          success = await this.installFromStore(installMethod);
          break;
          
        case 'direct':
          success = await this.installDirect(installMethod);
          break;
          
        case 'twa':
          success = await this.installTWA(installMethod);
          break;
          
        case 'app-clip':
          success = await this.installAppClip(installMethod);
          break;
          
        case 'testflight':
          success = await this.installTestFlight(installMethod);
          break;
          
        case 'winget':
          success = await this.installWinget(installMethod);
          break;
          
        case 'homebrew':
          success = await this.installHomebrew(installMethod);
          break;
          
        case 'snap':
          success = await this.installSnap(installMethod);
          break;
          
        case 'flatpak':
          success = await this.installFlatpak(installMethod);
          break;
          
        case 'appimage':
          success = await this.installAppImage(installMethod);
          break;
          
        default:
          throw new Error(`Unsupported installation method: ${installMethod.type}`);
      }
      
      const installationTime = performance.now() - startTime;
      
      // Update metrics
      this.state.metrics = {
        ...this.state.metrics,
        installationTime,
        method: installMethod.type,
        success
      };
      
      // Update status
      this.updateStatus(success ? 'installed' : 'failed');
      
      // Track installation result
      this.trackEvent('installation_completed', {
        platform: this.state.platform.os,
        method: installMethod.type,
        success,
        duration: installationTime
      });
      
      const result: InstallationResult = {
        success,
        method: installMethod,
        platform: this.state.platform.os,
        metrics: this.state.metrics
      };
      
      // Emit result
      this.emit('install-complete', result);
      
      return result;
    } catch (error) {
      // Update metrics
      this.state.metrics = {
        ...this.state.metrics,
        installationTime: performance.now() - startTime,
        method: installMethod.type,
        success: false,
        errorCode: (error as any).code || 'UNKNOWN_ERROR'
      };
      
      // Update status
      this.updateStatus('failed');
      this.state.error = error as Error;
      
      // Track error
      this.trackEvent('installation_failed', {
        platform: this.state.platform.os,
        method: installMethod.type,
        error: (error as Error).message
      });
      
      const result: InstallationResult = {
        success: false,
        method: installMethod,
        platform: this.state.platform.os,
        error: error as Error,
        metrics: this.state.metrics
      };
      
      // Emit error
      this.emit('install-failed', result);
      
      // Fallback to PWA if configured
      if (this.config.fallback?.toPWA && installMethod.type !== 'pwa') {
        console.log('Falling back to PWA installation');
        return this.install({ type: 'pwa', url: null });
      }
      
      throw error;
    } finally {
      this.installInProgress = false;
    }
  }

  /**
   * Get current deployment state
   */
  getState(): DeploymentState {
    return { ...this.state };
  }

  /**
   * Get platform configuration
   */
  getPlatformConfig() {
    return this.manifestManager.getPlatformConfig(this.state.platform?.os);
  }

  /**
   * Get installation instructions
   */
  getInstallInstructions(method?: InstallMethod): string[] {
    const installMethod = method || this.state.optimalMethod;
    const instructions: string[] = [];
    
    switch (installMethod.type) {
      case 'pwa':
        if (this.state.platform?.os === 'ios') {
          instructions.push('Tap the Share button');
          instructions.push('Scroll down and tap "Add to Home Screen"');
          instructions.push('Tap "Add" to install');
        } else if (this.state.platform?.os === 'android') {
          instructions.push('Tap the menu button (⋮)');
          instructions.push('Select "Install app"');
          instructions.push('Tap "Install" to confirm');
        } else {
          instructions.push('Click the install button in the address bar');
          instructions.push('Click "Install" to add to your device');
        }
        break;
        
      case 'store':
        instructions.push('You will be redirected to the app store');
        instructions.push('Click "Get" or "Install" to download');
        instructions.push('Open the app after installation');
        break;
        
      case 'direct':
        instructions.push('Download will start automatically');
        instructions.push('Open the downloaded file');
        instructions.push('Follow the installation wizard');
        break;
        
      default:
        instructions.push('Follow the platform-specific instructions');
    }
    
    return instructions;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private updateStatus(status: DeploymentState['installationStatus']): void {
    this.state.installationStatus = status;
    this.emit('status-changed', status);
  }

  private async checkNativeAppStatus(): Promise<void> {
    try {
      const nativeAppInfo = await this.nativeBridge.checkNativeApp(this.state.platform);
      
      if (nativeAppInfo?.available) {
        this.emit('native-app-available', nativeAppInfo);
      }
    } catch (error) {
      console.warn('Failed to check native app status:', error);
    }
  }

  private async isAppInstalled(): Promise<boolean> {
    // Check if PWA is installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }
    
    // Check if native app is installed
    try {
      return await this.nativeBridge.isNativeAppInstalled(this.state.platform);
    } catch {
      return false;
    }
  }

  private showPWAPrompt(): void {
    this.promptManager.showPWAPrompt(
      this.state.platform,
      this.getInstallInstructions(),
      () => this.install({ type: 'pwa', url: null }),
      () => this.emit('prompt-dismissed')
    );
  }

  private showNativePrompt(): void {
    const config = this.getPlatformConfig();
    if (!config) return;
    
    this.promptManager.showNativeAppPrompt(
      {
        available: true,
        appId: config.appId || '',
        appName: this.config.manifest.name || 'App',
        storeUrl: this.state.optimalMethod.url || '',
        deepLink: '',
        version: config.version || '1.0.0',
        minOSVersion: config.minVersion || '',
        features: config.features || [],
        size: this.manifestManager.getDownloadSize(this.state.platform.os, this.state.optimalMethod.type) || 0
      },
      this.state.platform,
      () => this.install({ type: 'pwa', url: null }),
      () => this.install(this.state.optimalMethod)
    );
  }

  private showPlatformChoicePrompt(): void {
    // This would show a UI with all available installation methods
    // For now, we'll just use the optimal method
    this.showNativePrompt();
  }

  private async installPWA(): Promise<boolean> {
    // Trigger PWA installation
    const event = (window as any).deferredPrompt;
    if (event) {
      event.prompt();
      const { outcome } = await event.userChoice;
      return outcome === 'accepted';
    }
    return false;
  }

  private async installFromStore(method: InstallMethod): Promise<boolean> {
    if (!method.url) return false;
    window.open(method.url, '_blank');
    return true; // Assume success since we can't track store installation
  }

  private async installDirect(method: InstallMethod): Promise<boolean> {
    if (!method.url) return false;
    
    // Create download link
    const link = document.createElement('a');
    link.href = method.url;
    link.download = method.url.split('/').pop() || 'app';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true; // Assume success since we can't track download completion
  }

  private async installTWA(method: InstallMethod): Promise<boolean> {
    // TWA installation is handled through Play Store
    return this.installFromStore(method);
  }

  private async installAppClip(method: InstallMethod): Promise<boolean> {
    if (!method.url) return false;
    window.location.href = method.url;
    return true;
  }

  private async installTestFlight(method: InstallMethod): Promise<boolean> {
    if (!method.url) return false;
    window.open(method.url, '_blank');
    return true;
  }

  private async installWinget(method: InstallMethod): Promise<boolean> {
    // Show winget command
    const command = `winget install ${method.packageId}`;
    await navigator.clipboard.writeText(command);
    alert(`Command copied to clipboard:\n${command}\n\nOpen Terminal/PowerShell and paste to install.`);
    return true;
  }

  private async installHomebrew(method: InstallMethod): Promise<boolean> {
    // Show homebrew command
    const command = `brew install --cask ${method.caskName}`;
    await navigator.clipboard.writeText(command);
    alert(`Command copied to clipboard:\n${command}\n\nOpen Terminal and paste to install.`);
    return true;
  }

  private async installSnap(method: InstallMethod): Promise<boolean> {
    // Show snap command
    const command = `sudo snap install ${method.snapName}`;
    await navigator.clipboard.writeText(command);
    alert(`Command copied to clipboard:\n${command}\n\nOpen Terminal and paste to install.`);
    return true;
  }

  private async installFlatpak(method: InstallMethod): Promise<boolean> {
    // Show flatpak command
    const command = `flatpak install ${method.appId}`;
    await navigator.clipboard.writeText(command);
    alert(`Command copied to clipboard:\n${command}\n\nOpen Terminal and paste to install.`);
    return true;
  }

  private async installAppImage(method: InstallMethod): Promise<boolean> {
    if (!method.url) return false;
    
    // Download AppImage
    const link = document.createElement('a');
    link.href = method.url;
    link.download = method.url.split('/').pop() || 'app.AppImage';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('AppImage downloaded. Make it executable with: chmod +x <filename>.AppImage');
    return true;
  }

  private trackEvent(event: string, data: any): void {
    if (this.analytics) {
      this.analytics.trackEvent(event, data);
    }
    
    this.emit('analytics', { event, data });
  }
}

export default DeploymentOrchestrator;