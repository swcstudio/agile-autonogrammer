/**
 * Deployment Manifest System
 * Comprehensive platform-specific deployment configurations
 */

import type { PlatformOS, DeviceType } from '../types';

// ============================================================================
// Deployment Types
// ============================================================================

export interface DeploymentManifest {
  version: string;
  lastUpdated: string;
  platforms: {
    android: AndroidDeployment;
    ios: IOSDeployment;
    windows: WindowsDeployment;
    macos: MacOSDeployment;
    linux: LinuxDeployment;
  };
  features: PlatformFeatures;
  requirements: PlatformRequirements;
  analytics: DeploymentAnalytics;
}

export interface AndroidDeployment {
  twa: {
    enabled: boolean;
    packageName: string;
    sha256Fingerprints: string[];
    launcherActivity: string;
    hostName: string;
    defaultUrl: string;
    assetStatements: string;
  };
  playStore: {
    url: string;
    appId: string;
    minVersion: string;
    instantApp?: boolean;
  };
  directDownload: {
    apkUrl: string;
    apkSize: number;
    versionCode: number;
    versionName: string;
    sha256: string;
  };
  amazonAppStore?: {
    url: string;
    asin: string;
  };
  features: string[];
  permissions: string[];
}

export interface IOSDeployment {
  appStore: {
    url: string;
    appId: string;
    bundleId: string;
    teamId: string;
    minIOSVersion: string;
  };
  testFlight?: {
    enabled: boolean;
    publicLink: string;
    betaGroupId: string;
  };
  appClip?: {
    enabled: boolean;
    url: string;
    invocationUrl: string;
    bundleId: string;
    minimumVersion: string;
  };
  enterprise?: {
    enabled: boolean;
    manifestUrl: string;
    bundleId: string;
    provisioningProfile: string;
  };
  features: string[];
  capabilities: string[];
}

export interface WindowsDeployment {
  store: {
    url: string;
    appId: string;
    packageFamilyName: string;
    minVersion: string;
  };
  directDownload: {
    msixUrl: string;
    msixSize: number;
    exeUrl: string;
    exeSize: number;
    version: string;
    sha256: string;
  };
  winget?: {
    enabled: boolean;
    packageId: string;
    moniker: string;
  };
  features: string[];
  protocols: string[];
}

export interface MacOSDeployment {
  appStore: {
    url: string;
    appId: string;
    bundleId: string;
    minMacOSVersion: string;
  };
  directDownload: {
    dmgUrl: string;
    dmgSize: number;
    pkgUrl: string;
    pkgSize: number;
    universalBinary: boolean;
    version: string;
    sha256: string;
  };
  homebrew?: {
    enabled: boolean;
    caskName: string;
    tapUrl: string;
  };
  features: string[];
  entitlements: string[];
}

export interface LinuxDeployment {
  snap?: {
    enabled: boolean;
    url: string;
    snapName: string;
    channel: 'stable' | 'candidate' | 'beta' | 'edge';
  };
  flatpak?: {
    enabled: boolean;
    url: string;
    appId: string;
    remote: string;
  };
  appImage?: {
    enabled: boolean;
    url: string;
    size: number;
    sha256: string;
    updateInformation: string;
  };
  deb?: {
    enabled: boolean;
    url: string;
    size: number;
    sha256: string;
    dependencies: string[];
  };
  rpm?: {
    enabled: boolean;
    url: string;
    size: number;
    sha256: string;
    dependencies: string[];
  };
  aur?: {
    enabled: boolean;
    packageName: string;
    gitUrl: string;
  };
  features: string[];
}

export interface PlatformFeatures {
  biometrics: PlatformOS[];
  ar: PlatformOS[];
  vr: PlatformOS[];
  nfc: PlatformOS[];
  bluetooth: PlatformOS[];
  backgroundSync: PlatformOS[];
  pushNotifications: PlatformOS[];
  fileSystem: PlatformOS[];
  systemTray: PlatformOS[];
  autoUpdate: PlatformOS[];
  deepLinks: PlatformOS[];
  widgets: PlatformOS[];
  shortcuts: PlatformOS[];
}

export interface PlatformRequirements {
  android: {
    minSdkVersion: number;
    targetSdkVersion: number;
    minRam: number;
    requiredFeatures: string[];
  };
  ios: {
    minIOSVersion: string;
    requiredDeviceCapabilities: string[];
    supportedDevices: string[];
  };
  windows: {
    minWindowsVersion: string;
    architecture: ('x86' | 'x64' | 'arm64')[];
    minRam: number;
    minDiskSpace: number;
  };
  macos: {
    minMacOSVersion: string;
    architecture: ('intel' | 'apple-silicon' | 'universal')[];
    minRam: number;
    minDiskSpace: number;
  };
  linux: {
    distributions: string[];
    architecture: ('x86_64' | 'aarch64' | 'armhf')[];
    minKernelVersion: string;
    requiredLibraries: string[];
  };
}

export interface DeploymentAnalytics {
  installTracking: boolean;
  platformMetrics: boolean;
  errorReporting: boolean;
  performanceMonitoring: boolean;
  customEvents: string[];
}

// ============================================================================
// Deployment Manifest Class
// ============================================================================

export class DeploymentManifestManager {
  private manifest: DeploymentManifest;
  private cdnBaseUrl: string;
  private environment: 'development' | 'staging' | 'production';

  constructor(
    manifest: DeploymentManifest,
    cdnBaseUrl: string = 'https://cdn.katalyst.dev',
    environment: 'development' | 'staging' | 'production' = 'production'
  ) {
    this.manifest = manifest;
    this.cdnBaseUrl = cdnBaseUrl;
    this.environment = environment;
  }

  /**
   * Get platform-specific deployment configuration
   */
  getPlatformConfig(os: PlatformOS): any {
    switch (os) {
      case 'android':
        return this.manifest.platforms.android;
      case 'ios':
        return this.manifest.platforms.ios;
      case 'windows':
        return this.manifest.platforms.windows;
      case 'macos':
        return this.manifest.platforms.macos;
      case 'linux':
        return this.manifest.platforms.linux;
      default:
        return null;
    }
  }

  /**
   * Get optimal installation method for platform
   */
  getOptimalInstallMethod(os: PlatformOS, capabilities: any): InstallMethod {
    const config = this.getPlatformConfig(os);
    if (!config) {
      return { type: 'pwa', url: null };
    }

    switch (os) {
      case 'android':
        if (config.twa?.enabled && this.supportsTWA()) {
          return { type: 'twa', url: config.playStore.url };
        }
        if (config.playStore?.url) {
          return { type: 'store', url: config.playStore.url };
        }
        if (config.directDownload?.apkUrl) {
          return { type: 'direct', url: this.getFullUrl(config.directDownload.apkUrl) };
        }
        break;

      case 'ios':
        if (config.appClip?.enabled && this.supportsAppClip()) {
          return { type: 'app-clip', url: config.appClip.invocationUrl };
        }
        if (config.testFlight?.enabled && this.environment !== 'production') {
          return { type: 'testflight', url: config.testFlight.publicLink };
        }
        if (config.appStore?.url) {
          return { type: 'store', url: config.appStore.url };
        }
        if (config.enterprise?.enabled) {
          return { type: 'enterprise', url: config.enterprise.manifestUrl };
        }
        break;

      case 'windows':
        if (config.store?.url && this.isWindows10OrLater()) {
          return { type: 'store', url: config.store.url };
        }
        if (config.winget?.enabled) {
          return { type: 'winget', packageId: config.winget.packageId };
        }
        if (config.directDownload?.msixUrl && this.supportsMSIX()) {
          return { type: 'direct', url: this.getFullUrl(config.directDownload.msixUrl) };
        }
        if (config.directDownload?.exeUrl) {
          return { type: 'direct', url: this.getFullUrl(config.directDownload.exeUrl) };
        }
        break;

      case 'macos':
        if (config.appStore?.url) {
          return { type: 'store', url: config.appStore.url };
        }
        if (config.homebrew?.enabled) {
          return { type: 'homebrew', caskName: config.homebrew.caskName };
        }
        if (config.directDownload?.dmgUrl) {
          return { type: 'direct', url: this.getFullUrl(config.directDownload.dmgUrl) };
        }
        break;

      case 'linux':
        // Prefer the package manager that's installed
        if (config.snap?.enabled && this.hasSnapd()) {
          return { type: 'snap', snapName: config.snap.snapName };
        }
        if (config.flatpak?.enabled && this.hasFlatpak()) {
          return { type: 'flatpak', appId: config.flatpak.appId };
        }
        if (config.appImage?.enabled) {
          return { type: 'appimage', url: this.getFullUrl(config.appImage.url) };
        }
        if (config.deb?.enabled && this.isDebianBased()) {
          return { type: 'deb', url: this.getFullUrl(config.deb.url) };
        }
        if (config.rpm?.enabled && this.isRPMBased()) {
          return { type: 'rpm', url: this.getFullUrl(config.rpm.url) };
        }
        if (config.aur?.enabled && this.isArchBased()) {
          return { type: 'aur', packageName: config.aur.packageName };
        }
        break;
    }

    // Fallback to PWA
    return { type: 'pwa', url: null };
  }

  /**
   * Get all available installation methods for platform
   */
  getAllInstallMethods(os: PlatformOS): InstallMethod[] {
    const methods: InstallMethod[] = [];
    const config = this.getPlatformConfig(os);
    
    if (!config) {
      return [{ type: 'pwa', url: null }];
    }

    // Always include PWA as an option
    methods.push({ type: 'pwa', url: null });

    switch (os) {
      case 'android':
        if (config.playStore?.url) {
          methods.push({ type: 'store', url: config.playStore.url });
        }
        if (config.directDownload?.apkUrl) {
          methods.push({ type: 'direct', url: this.getFullUrl(config.directDownload.apkUrl) });
        }
        if (config.amazonAppStore?.url) {
          methods.push({ type: 'amazon', url: config.amazonAppStore.url });
        }
        break;

      case 'ios':
        if (config.appStore?.url) {
          methods.push({ type: 'store', url: config.appStore.url });
        }
        if (config.testFlight?.enabled) {
          methods.push({ type: 'testflight', url: config.testFlight.publicLink });
        }
        if (config.appClip?.enabled) {
          methods.push({ type: 'app-clip', url: config.appClip.invocationUrl });
        }
        break;

      case 'windows':
        if (config.store?.url) {
          methods.push({ type: 'store', url: config.store.url });
        }
        if (config.directDownload?.msixUrl) {
          methods.push({ type: 'direct', url: this.getFullUrl(config.directDownload.msixUrl), format: 'msix' });
        }
        if (config.directDownload?.exeUrl) {
          methods.push({ type: 'direct', url: this.getFullUrl(config.directDownload.exeUrl), format: 'exe' });
        }
        if (config.winget?.enabled) {
          methods.push({ type: 'winget', packageId: config.winget.packageId });
        }
        break;

      case 'macos':
        if (config.appStore?.url) {
          methods.push({ type: 'store', url: config.appStore.url });
        }
        if (config.directDownload?.dmgUrl) {
          methods.push({ type: 'direct', url: this.getFullUrl(config.directDownload.dmgUrl), format: 'dmg' });
        }
        if (config.directDownload?.pkgUrl) {
          methods.push({ type: 'direct', url: this.getFullUrl(config.directDownload.pkgUrl), format: 'pkg' });
        }
        if (config.homebrew?.enabled) {
          methods.push({ type: 'homebrew', caskName: config.homebrew.caskName });
        }
        break;

      case 'linux':
        if (config.snap?.enabled) {
          methods.push({ type: 'snap', snapName: config.snap.snapName });
        }
        if (config.flatpak?.enabled) {
          methods.push({ type: 'flatpak', appId: config.flatpak.appId });
        }
        if (config.appImage?.enabled) {
          methods.push({ type: 'appimage', url: this.getFullUrl(config.appImage.url) });
        }
        if (config.deb?.enabled) {
          methods.push({ type: 'deb', url: this.getFullUrl(config.deb.url) });
        }
        if (config.rpm?.enabled) {
          methods.push({ type: 'rpm', url: this.getFullUrl(config.rpm.url) });
        }
        if (config.aur?.enabled) {
          methods.push({ type: 'aur', packageName: config.aur.packageName });
        }
        break;
    }

    return methods;
  }

  /**
   * Get platform features
   */
  getPlatformFeatures(os: PlatformOS): string[] {
    const config = this.getPlatformConfig(os);
    return config?.features || [];
  }

  /**
   * Check if platform supports feature
   */
  supportsFeature(os: PlatformOS, feature: keyof PlatformFeatures): boolean {
    return this.manifest.features[feature]?.includes(os) || false;
  }

  /**
   * Get download size for platform
   */
  getDownloadSize(os: PlatformOS, method: string): number {
    const config = this.getPlatformConfig(os);
    if (!config) return 0;

    switch (os) {
      case 'android':
        return config.directDownload?.apkSize || 0;
      case 'ios':
        return 0; // App Store handles this
      case 'windows':
        return method === 'msix' 
          ? config.directDownload?.msixSize || 0
          : config.directDownload?.exeSize || 0;
      case 'macos':
        return method === 'dmg'
          ? config.directDownload?.dmgSize || 0
          : config.directDownload?.pkgSize || 0;
      case 'linux':
        if (method === 'appimage') return config.appImage?.size || 0;
        if (method === 'deb') return config.deb?.size || 0;
        if (method === 'rpm') return config.rpm?.size || 0;
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Get integrity hash for download
   */
  getIntegrityHash(os: PlatformOS, method: string): string | null {
    const config = this.getPlatformConfig(os);
    if (!config) return null;

    switch (os) {
      case 'android':
        return config.directDownload?.sha256 || null;
      case 'windows':
        return config.directDownload?.sha256 || null;
      case 'macos':
        return config.directDownload?.sha256 || null;
      case 'linux':
        if (method === 'appimage') return config.appImage?.sha256 || null;
        if (method === 'deb') return config.deb?.sha256 || null;
        if (method === 'rpm') return config.rpm?.sha256 || null;
        return null;
      default:
        return null;
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private getFullUrl(path: string): string {
    if (path.startsWith('http')) {
      return path;
    }
    return `${this.cdnBaseUrl}/${path}`;
  }

  private supportsTWA(): boolean {
    // Check if browser supports TWA
    return /chrome|chromium/i.test(navigator.userAgent);
  }

  private supportsAppClip(): boolean {
    // Check iOS version for App Clip support (iOS 14+)
    const match = navigator.userAgent.match(/OS (\d+)_/);
    if (match) {
      return parseInt(match[1]) >= 14;
    }
    return false;
  }

  private isWindows10OrLater(): boolean {
    const match = navigator.userAgent.match(/Windows NT (\d+\.\d+)/);
    if (match) {
      return parseFloat(match[1]) >= 10.0;
    }
    return false;
  }

  private supportsMSIX(): boolean {
    // MSIX requires Windows 10 1709 or later
    return this.isWindows10OrLater();
  }

  private hasSnapd(): boolean {
    // This would need to be detected via a system call or user agent
    return /ubuntu|debian|fedora/i.test(navigator.userAgent);
  }

  private hasFlatpak(): boolean {
    // This would need to be detected via a system call or user agent
    return /linux/i.test(navigator.userAgent);
  }

  private isDebianBased(): boolean {
    return /ubuntu|debian|mint/i.test(navigator.userAgent);
  }

  private isRPMBased(): boolean {
    return /fedora|centos|rhel|opensuse/i.test(navigator.userAgent);
  }

  private isArchBased(): boolean {
    return /arch|manjaro/i.test(navigator.userAgent);
  }
}

// ============================================================================
// Types
// ============================================================================

export interface InstallMethod {
  type: 'pwa' | 'store' | 'direct' | 'twa' | 'app-clip' | 'testflight' | 
        'enterprise' | 'winget' | 'homebrew' | 'snap' | 'flatpak' | 
        'appimage' | 'deb' | 'rpm' | 'aur' | 'amazon';
  url?: string | null;
  packageId?: string;
  appId?: string;
  snapName?: string;
  caskName?: string;
  packageName?: string;
  format?: string;
}

// ============================================================================
// Default Manifest Template
// ============================================================================

export const createDefaultManifest = (config: any): DeploymentManifest => ({
  version: config.version || '1.0.0',
  lastUpdated: new Date().toISOString(),
  platforms: {
    android: {
      twa: {
        enabled: false,
        packageName: config.android?.packageName || 'com.katalyst.app',
        sha256Fingerprints: config.android?.sha256Fingerprints || [],
        launcherActivity: config.android?.launcherActivity || 'LauncherActivity',
        hostName: config.android?.hostName || 'app.katalyst.dev',
        defaultUrl: config.android?.defaultUrl || 'https://app.katalyst.dev',
        assetStatements: config.android?.assetStatements || '[]'
      },
      playStore: {
        url: config.android?.playStoreUrl || '',
        appId: config.android?.appId || '',
        minVersion: config.android?.minVersion || '5.0'
      },
      directDownload: {
        apkUrl: config.android?.apkUrl || '',
        apkSize: config.android?.apkSize || 0,
        versionCode: config.android?.versionCode || 1,
        versionName: config.android?.versionName || '1.0.0',
        sha256: config.android?.sha256 || ''
      },
      features: config.android?.features || [],
      permissions: config.android?.permissions || []
    },
    ios: {
      appStore: {
        url: config.ios?.appStoreUrl || '',
        appId: config.ios?.appId || '',
        bundleId: config.ios?.bundleId || 'com.katalyst.app',
        teamId: config.ios?.teamId || '',
        minIOSVersion: config.ios?.minIOSVersion || '13.0'
      },
      features: config.ios?.features || [],
      capabilities: config.ios?.capabilities || []
    },
    windows: {
      store: {
        url: config.windows?.storeUrl || '',
        appId: config.windows?.appId || '',
        packageFamilyName: config.windows?.packageFamilyName || '',
        minVersion: config.windows?.minVersion || '10.0.17763.0'
      },
      directDownload: {
        msixUrl: config.windows?.msixUrl || '',
        msixSize: config.windows?.msixSize || 0,
        exeUrl: config.windows?.exeUrl || '',
        exeSize: config.windows?.exeSize || 0,
        version: config.windows?.version || '1.0.0',
        sha256: config.windows?.sha256 || ''
      },
      features: config.windows?.features || [],
      protocols: config.windows?.protocols || []
    },
    macos: {
      appStore: {
        url: config.macos?.appStoreUrl || '',
        appId: config.macos?.appId || '',
        bundleId: config.macos?.bundleId || 'com.katalyst.app',
        minMacOSVersion: config.macos?.minMacOSVersion || '10.14'
      },
      directDownload: {
        dmgUrl: config.macos?.dmgUrl || '',
        dmgSize: config.macos?.dmgSize || 0,
        pkgUrl: config.macos?.pkgUrl || '',
        pkgSize: config.macos?.pkgSize || 0,
        universalBinary: config.macos?.universalBinary || false,
        version: config.macos?.version || '1.0.0',
        sha256: config.macos?.sha256 || ''
      },
      features: config.macos?.features || [],
      entitlements: config.macos?.entitlements || []
    },
    linux: {
      snap: config.linux?.snap || { enabled: false, url: '', snapName: '', channel: 'stable' },
      flatpak: config.linux?.flatpak || { enabled: false, url: '', appId: '', remote: '' },
      appImage: config.linux?.appImage || { enabled: false, url: '', size: 0, sha256: '', updateInformation: '' },
      features: config.linux?.features || []
    }
  },
  features: {
    biometrics: config.features?.biometrics || [],
    ar: config.features?.ar || [],
    vr: config.features?.vr || [],
    nfc: config.features?.nfc || [],
    bluetooth: config.features?.bluetooth || [],
    backgroundSync: config.features?.backgroundSync || [],
    pushNotifications: config.features?.pushNotifications || [],
    fileSystem: config.features?.fileSystem || [],
    systemTray: config.features?.systemTray || [],
    autoUpdate: config.features?.autoUpdate || [],
    deepLinks: config.features?.deepLinks || [],
    widgets: config.features?.widgets || [],
    shortcuts: config.features?.shortcuts || []
  },
  requirements: {
    android: {
      minSdkVersion: 21,
      targetSdkVersion: 33,
      minRam: 1024,
      requiredFeatures: []
    },
    ios: {
      minIOSVersion: '13.0',
      requiredDeviceCapabilities: [],
      supportedDevices: []
    },
    windows: {
      minWindowsVersion: '10.0.17763.0',
      architecture: ['x64'],
      minRam: 2048,
      minDiskSpace: 500
    },
    macos: {
      minMacOSVersion: '10.14',
      architecture: ['universal'],
      minRam: 2048,
      minDiskSpace: 500
    },
    linux: {
      distributions: ['ubuntu', 'debian', 'fedora', 'arch'],
      architecture: ['x86_64'],
      minKernelVersion: '4.15',
      requiredLibraries: []
    }
  },
  analytics: {
    installTracking: true,
    platformMetrics: true,
    errorReporting: true,
    performanceMonitoring: true,
    customEvents: []
  }
});

export default DeploymentManifestManager;