/**
 * Device Detection Module
 * Comprehensive device and platform detection
 */

import type { DeviceType, PlatformOS, BrowserType, PlatformInfo, DeviceCapabilities } from '../types';

export class DeviceDetector {
  private userAgent: string;
  private platform: string;
  private vendor: string;
  
  constructor() {
    this.userAgent = navigator.userAgent.toLowerCase();
    this.platform = navigator.platform.toLowerCase();
    this.vendor = navigator.vendor?.toLowerCase() || '';
  }

  /**
   * Detect comprehensive platform information
   */
  async detect(): Promise<PlatformInfo> {
    const device = this.detectDevice();
    const os = this.detectOS();
    const osVersion = this.detectOSVersion(os);
    const browser = this.detectBrowser();
    const browserVersion = this.detectBrowserVersion(browser);
    const isWebView = this.detectWebView();
    const isPWA = this.detectPWA();
    const isStandalone = this.detectStandalone();
    const capabilities = await this.detectCapabilities();

    return {
      device,
      os,
      osVersion,
      browser,
      browserVersion,
      isWebView,
      isPWA,
      isStandalone,
      capabilities
    };
  }

  /**
   * Detect device type
   */
  private detectDevice(): DeviceType {
    // VR/AR Detection
    if ('xr' in navigator || 'getVRDisplays' in navigator) {
      if (this.userAgent.includes('quest') || this.userAgent.includes('oculus')) {
        return 'vr';
      }
      if (this.userAgent.includes('hololens') || this.userAgent.includes('magic leap')) {
        return 'ar';
      }
    }

    // TV Detection
    if (this.userAgent.includes('tv') || this.userAgent.includes('crkey') || 
        this.userAgent.includes('roku') || this.userAgent.includes('appletv')) {
      return 'tv';
    }

    // Watch Detection
    if (this.userAgent.includes('watch')) {
      return 'watch';
    }

    // Mobile/Tablet Detection
    const isMobile = /mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(this.userAgent);
    const isTablet = /tablet|ipad|playbook|silk|kindle|gt-p|gt-n|sch-i|sm-t|sm-p/i.test(this.userAgent);
    
    if (isTablet) {
      return 'tablet';
    }
    
    if (isMobile) {
      // Additional mobile checks
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const screenWidth = window.screen.width;
      const screenHeight = window.screen.height;
      const minDimension = Math.min(screenWidth, screenHeight);
      
      // Tablets typically have min dimension > 600px
      if (hasTouch && minDimension > 600) {
        return 'tablet';
      }
      
      return 'mobile';
    }

    // Desktop is default
    return 'desktop';
  }

  /**
   * Detect operating system
   */
  private detectOS(): PlatformOS {
    // iOS Detection
    if (/iphone|ipad|ipod/.test(this.userAgent) || 
        (this.platform.includes('mac') && 'ontouchend' in document)) {
      return 'ios';
    }

    // Android Detection
    if (/android/.test(this.userAgent)) {
      return 'android';
    }

    // Windows Detection
    if (/windows|win32|win64/.test(this.platform) || /windows/.test(this.userAgent)) {
      return 'windows';
    }

    // macOS Detection
    if (/macintosh|mac os x|macos/.test(this.platform) || /macintosh/.test(this.userAgent)) {
      return 'macos';
    }

    // Linux Detection
    if (/linux/.test(this.platform) || /linux/.test(this.userAgent)) {
      // Chrome OS check
      if (/cros/.test(this.userAgent)) {
        return 'chromeos';
      }
      return 'linux';
    }

    return 'unknown';
  }

  /**
   * Detect OS version
   */
  private detectOSVersion(os: PlatformOS): string {
    let version = 'unknown';

    switch (os) {
      case 'ios': {
        const match = this.userAgent.match(/os ([\d_]+)/);
        if (match) {
          version = match[1].replace(/_/g, '.');
        }
        break;
      }
      case 'android': {
        const match = this.userAgent.match(/android ([\d.]+)/);
        if (match) {
          version = match[1];
        }
        break;
      }
      case 'windows': {
        const match = this.userAgent.match(/windows nt ([\d.]+)/);
        if (match) {
          const ntVersion = match[1];
          // Map NT version to Windows version
          const versionMap: Record<string, string> = {
            '10.0': '10/11',
            '6.3': '8.1',
            '6.2': '8',
            '6.1': '7',
            '6.0': 'Vista',
            '5.1': 'XP'
          };
          version = versionMap[ntVersion] || ntVersion;
        }
        break;
      }
      case 'macos': {
        const match = this.userAgent.match(/mac os x ([\d_]+)/);
        if (match) {
          version = match[1].replace(/_/g, '.');
        }
        break;
      }
    }

    return version;
  }

  /**
   * Detect browser type
   */
  private detectBrowser(): BrowserType {
    // Edge Detection (must be before Chrome)
    if (/edg\//.test(this.userAgent)) {
      return 'edge';
    }

    // Opera Detection (must be before Chrome)
    if (/opr\/|opera/.test(this.userAgent)) {
      return 'opera';
    }

    // Samsung Browser Detection
    if (/samsungbrowser/.test(this.userAgent)) {
      return 'samsung';
    }

    // Chrome Detection
    if (/chrome|chromium|crios/.test(this.userAgent) && this.vendor.includes('google')) {
      return 'chrome';
    }

    // Firefox Detection
    if (/firefox|fxios/.test(this.userAgent)) {
      return 'firefox';
    }

    // Safari Detection
    if (/safari/.test(this.userAgent) && this.vendor.includes('apple')) {
      return 'safari';
    }

    return 'unknown';
  }

  /**
   * Detect browser version
   */
  private detectBrowserVersion(browser: BrowserType): string {
    let version = 'unknown';
    let match: RegExpMatchArray | null = null;

    switch (browser) {
      case 'chrome':
        match = this.userAgent.match(/(?:chrome|chromium|crios)\/([\d.]+)/);
        break;
      case 'firefox':
        match = this.userAgent.match(/(?:firefox|fxios)\/([\d.]+)/);
        break;
      case 'safari':
        match = this.userAgent.match(/version\/([\d.]+)/);
        break;
      case 'edge':
        match = this.userAgent.match(/edg\/([\d.]+)/);
        break;
      case 'opera':
        match = this.userAgent.match(/(?:opr|opera)\/([\d.]+)/);
        break;
      case 'samsung':
        match = this.userAgent.match(/samsungbrowser\/([\d.]+)/);
        break;
    }

    if (match && match[1]) {
      version = match[1];
    }

    return version;
  }

  /**
   * Detect if running in WebView
   */
  private detectWebView(): boolean {
    // iOS WebView
    const isIOSWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(this.userAgent);
    
    // Android WebView
    const isAndroidWebView = /; wv\)/.test(this.userAgent) || 
                             (/android/.test(this.userAgent) && /version\/[\d.]+/.test(this.userAgent));
    
    // Facebook/Instagram/Twitter WebView
    const isSocialWebView = /fban|fbav|instagram|twitter/i.test(this.userAgent);
    
    return isIOSWebView || isAndroidWebView || isSocialWebView;
  }

  /**
   * Detect if running as PWA
   */
  private detectPWA(): boolean {
    // Check display mode
    const displayMode = window.matchMedia('(display-mode: standalone)').matches ||
                       window.matchMedia('(display-mode: fullscreen)').matches ||
                       window.matchMedia('(display-mode: minimal-ui)').matches;
    
    // Check navigator.standalone (iOS)
    const isStandalone = (window.navigator as any).standalone === true;
    
    // Check referrer (Android)
    const fromHomeScreen = document.referrer.includes('android-app://');
    
    return displayMode || isStandalone || fromHomeScreen;
  }

  /**
   * Detect if running in standalone mode
   */
  private detectStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  /**
   * Detect device capabilities
   */
  private async detectCapabilities(): Promise<DeviceCapabilities> {
    const capabilities: DeviceCapabilities = {
      // Display
      touchScreen: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      multiTouch: navigator.maxTouchPoints > 1,
      pressure: 'PointerEvent' in window && 'pressure' in PointerEvent.prototype,
      screenSize: {
        width: window.screen.width * (window.devicePixelRatio || 1),
        height: window.screen.height * (window.devicePixelRatio || 1)
      },
      pixelDensity: window.devicePixelRatio || 1,
      colorGamut: this.detectColorGamut(),
      hdr: this.detectHDR(),
      refreshRate: await this.detectRefreshRate(),
      
      // Input
      keyboard: !('ontouchstart' in window) || window.innerWidth > 768,
      mouse: window.matchMedia('(pointer: fine)').matches,
      stylus: window.matchMedia('(pointer: fine) and (hover: none)').matches,
      gamepad: 'getGamepads' in navigator,
      
      // Sensors
      accelerometer: 'Accelerometer' in window,
      gyroscope: 'Gyroscope' in window,
      magnetometer: 'Magnetometer' in window,
      ambientLight: 'AmbientLightSensor' in window,
      proximity: 'ProximitySensor' in window,
      
      // Connectivity
      bluetooth: 'bluetooth' in navigator,
      nfc: 'NDEFReader' in window,
      usb: 'usb' in navigator,
      wifi: (navigator as any).connection?.type === 'wifi',
      cellular: (navigator as any).connection?.type === 'cellular',
      
      // Media
      camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      microphone: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      speaker: 'speechSynthesis' in window,
      
      // Performance
      cores: navigator.hardwareConcurrency || 1,
      ram: (navigator as any).deviceMemory || 0,
      gpu: await this.detectGPU(),
      
      // Features
      biometrics: this.detectBiometrics(),
      ar: 'xr' in navigator && await this.checkXRSupport('immersive-ar'),
      vr: 'xr' in navigator && await this.checkXRSupport('immersive-vr'),
      ml: 'ml' in navigator || 'neuralNetwork' in window
    };

    return capabilities;
  }

  /**
   * Detect color gamut support
   */
  private detectColorGamut(): 'srgb' | 'p3' | 'rec2020' {
    if (window.matchMedia('(color-gamut: rec2020)').matches) {
      return 'rec2020';
    }
    if (window.matchMedia('(color-gamut: p3)').matches) {
      return 'p3';
    }
    return 'srgb';
  }

  /**
   * Detect HDR support
   */
  private detectHDR(): boolean {
    return window.matchMedia('(dynamic-range: high)').matches ||
           window.matchMedia('(video-dynamic-range: high)').matches;
  }

  /**
   * Detect refresh rate
   */
  private async detectRefreshRate(): Promise<number> {
    return new Promise((resolve) => {
      let frames = 0;
      let startTime = performance.now();
      
      const countFrames = () => {
        frames++;
        const elapsed = performance.now() - startTime;
        
        if (elapsed >= 1000) {
          resolve(Math.round(frames));
        } else {
          requestAnimationFrame(countFrames);
        }
      };
      
      requestAnimationFrame(countFrames);
    });
  }

  /**
   * Detect GPU information
   */
  private async detectGPU(): Promise<string> {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (gl) {
        const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          return (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }
    } catch (e) {
      // Silent fail
    }
    
    return 'unknown';
  }

  /**
   * Detect biometric capabilities
   */
  private detectBiometrics(): 'none' | 'fingerprint' | 'face' | 'iris' {
    // Check for WebAuthn support
    if ('credentials' in navigator && 'create' in navigator.credentials) {
      // iOS Face ID
      if (/iphone|ipad/.test(this.userAgent) && parseFloat(this.detectOSVersion('ios')) >= 11) {
        return 'face';
      }
      
      // Android with fingerprint
      if (/android/.test(this.userAgent)) {
        return 'fingerprint';
      }
      
      // Windows Hello
      if (/windows/.test(this.userAgent)) {
        return 'face';
      }
    }
    
    return 'none';
  }

  /**
   * Check WebXR support
   */
  private async checkXRSupport(mode: string): Promise<boolean> {
    if ('xr' in navigator && 'isSessionSupported' in (navigator as any).xr) {
      try {
        return await (navigator as any).xr.isSessionSupported(mode);
      } catch {
        return false;
      }
    }
    return false;
  }
}