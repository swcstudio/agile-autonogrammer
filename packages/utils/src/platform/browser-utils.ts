/**
 * Browser-Specific Utilities
 * Platform detection, feature testing, and browser APIs
 */

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  os: string;
  mobile: boolean;
  tablet: boolean;
  desktop: boolean;
}

export interface FeatureSupport {
  webgl: boolean;
  webgl2: boolean;
  webxr: boolean;
  webassembly: boolean;
  serviceWorker: boolean;
  webWorker: boolean;
  indexedDB: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
  geolocation: boolean;
  camera: boolean;
  microphone: boolean;
  notifications: boolean;
  fullscreen: boolean;
  pointerLock: boolean;
  gamepad: boolean;
  webrtc: boolean;
  webcodecs: boolean;
  offscreenCanvas: boolean;
  sharedArrayBuffer: boolean;
  bigint: boolean;
  es6Modules: boolean;
  intersectionObserver: boolean;
  mutationObserver: boolean;
  resizeObserver: boolean;
  performanceObserver: boolean;
}

/**
 * Browser Detection
 */
export class BrowserDetector {
  private static _info: BrowserInfo | null = null;
  private static _features: FeatureSupport | null = null;

  /**
   * Get browser information
   */
  static getBrowserInfo(): BrowserInfo {
    if (!this._info) {
      this._info = this.detectBrowser();
    }
    return this._info;
  }

  /**
   * Get feature support information
   */
  static getFeatureSupport(): FeatureSupport {
    if (!this._features) {
      this._features = this.detectFeatures();
    }
    return this._features;
  }

  /**
   * Check if specific feature is supported
   */
  static hasFeature(feature: keyof FeatureSupport): boolean {
    return this.getFeatureSupport()[feature];
  }

  /**
   * Check if running in specific browser
   */
  static isBrowser(name: string): boolean {
    return this.getBrowserInfo().name.toLowerCase().includes(name.toLowerCase());
  }

  /**
   * Check if mobile device
   */
  static isMobile(): boolean {
    return this.getBrowserInfo().mobile;
  }

  /**
   * Check if tablet device
   */
  static isTablet(): boolean {
    return this.getBrowserInfo().tablet;
  }

  /**
   * Check if desktop device
   */
  static isDesktop(): boolean {
    return this.getBrowserInfo().desktop;
  }

  private static detectBrowser(): BrowserInfo {
    const ua = navigator.userAgent;
    const mobile = /Mobi|Android/i.test(ua);
    const tablet = /Tablet|iPad/i.test(ua);
    
    let name = 'Unknown';
    let version = 'Unknown';
    let engine = 'Unknown';
    let os = 'Unknown';

    // Browser detection
    if (ua.includes('Chrome')) {
      name = 'Chrome';
      version = this.extractVersion(ua, 'Chrome/');
      engine = 'Blink';
    } else if (ua.includes('Firefox')) {
      name = 'Firefox';
      version = this.extractVersion(ua, 'Firefox/');
      engine = 'Gecko';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      name = 'Safari';
      version = this.extractVersion(ua, 'Version/');
      engine = 'WebKit';
    } else if (ua.includes('Edge')) {
      name = 'Edge';
      version = this.extractVersion(ua, 'Edge/');
      engine = 'EdgeHTML';
    } else if (ua.includes('Opera')) {
      name = 'Opera';
      version = this.extractVersion(ua, 'Opera/');
      engine = 'Blink';
    }

    // OS detection
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS')) os = 'iOS';

    return {
      name,
      version,
      engine,
      os,
      mobile,
      tablet,
      desktop: !mobile && !tablet
    };
  }

  private static extractVersion(ua: string, prefix: string): string {
    const start = ua.indexOf(prefix) + prefix.length;
    const end = ua.indexOf(' ', start);
    return ua.substring(start, end !== -1 ? end : undefined).split('.')[0];
  }

  private static detectFeatures(): FeatureSupport {
    return {
      webgl: this.hasWebGL(),
      webgl2: this.hasWebGL2(),
      webxr: 'xr' in navigator,
      webassembly: typeof WebAssembly !== 'undefined',
      serviceWorker: 'serviceWorker' in navigator,
      webWorker: typeof Worker !== 'undefined',
      indexedDB: 'indexedDB' in window,
      localStorage: this.hasStorage('localStorage'),
      sessionStorage: this.hasStorage('sessionStorage'),
      geolocation: 'geolocation' in navigator,
      camera: this.hasMediaDevice('videoinput'),
      microphone: this.hasMediaDevice('audioinput'),
      notifications: 'Notification' in window,
      fullscreen: 'requestFullscreen' in document.documentElement,
      pointerLock: 'requestPointerLock' in document.documentElement,
      gamepad: 'getGamepads' in navigator,
      webrtc: 'RTCPeerConnection' in window,
      webcodecs: 'VideoEncoder' in window,
      offscreenCanvas: 'OffscreenCanvas' in window,
      sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      bigint: typeof BigInt !== 'undefined',
      es6Modules: 'noModule' in document.createElement('script'),
      intersectionObserver: 'IntersectionObserver' in window,
      mutationObserver: 'MutationObserver' in window,
      resizeObserver: 'ResizeObserver' in window,
      performanceObserver: 'PerformanceObserver' in window
    };
  }

  private static hasWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  private static hasWebGL2(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!canvas.getContext('webgl2');
    } catch {
      return false;
    }
  }

  private static hasStorage(type: 'localStorage' | 'sessionStorage'): boolean {
    try {
      const storage = window[type];
      const test = '__storage_test__';
      storage.setItem(test, 'test');
      storage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private static hasMediaDevice(kind: string): boolean {
    return 'mediaDevices' in navigator && 'enumerateDevices' in navigator.mediaDevices;
  }
}

/**
 * Performance Utilities
 */
export class PerformanceUtils {
  /**
   * Get memory information
   */
  static getMemoryInfo(): {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  } {
    const memory = (performance as any).memory;
    return memory ? {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit
    } : {};
  }

  /**
   * Measure function execution time
   */
  static measure<T>(fn: () => T, label?: string): { result: T; duration: number } {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    if (label) {
      console.log(`${label}: ${duration.toFixed(2)}ms`);
    }
    
    return { result, duration };
  }

  /**
   * Measure async function execution time
   */
  static async measureAsync<T>(
    fn: () => Promise<T>,
    label?: string
  ): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    if (label) {
      console.log(`${label}: ${duration.toFixed(2)}ms`);
    }
    
    return { result, duration };
  }

  /**
   * Get frame rate
   */
  static measureFPS(duration = 1000): Promise<number> {
    return new Promise(resolve => {
      let frames = 0;
      const startTime = performance.now();
      
      function frame() {
        frames++;
        const elapsed = performance.now() - startTime;
        
        if (elapsed < duration) {
          requestAnimationFrame(frame);
        } else {
          resolve((frames * 1000) / elapsed);
        }
      }
      
      requestAnimationFrame(frame);
    });
  }
}

/**
 * DOM Utilities
 */
export class DOMUtils {
  /**
   * Wait for DOM to be ready
   */
  static ready(): Promise<void> {
    return new Promise(resolve => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => resolve());
      } else {
        resolve();
      }
    });
  }

  /**
   * Wait for window to be loaded
   */
  static loaded(): Promise<void> {
    return new Promise(resolve => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', () => resolve());
      }
    });
  }

  /**
   * Create element with attributes
   */
  static createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    attributes?: Record<string, any>,
    textContent?: string
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName);
    
    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        if (key === 'style' && typeof value === 'object') {
          Object.assign(element.style, value);
        } else if (key.startsWith('data-')) {
          element.setAttribute(key, value);
        } else if (key in element) {
          (element as any)[key] = value;
        } else {
          element.setAttribute(key, value);
        }
      }
    }
    
    if (textContent) {
      element.textContent = textContent;
    }
    
    return element;
  }

  /**
   * Query selector with type safety
   */
  static querySelector<T extends Element = Element>(
    selector: string,
    context: Document | Element = document
  ): T | null {
    return context.querySelector<T>(selector);
  }

  /**
   * Query all selectors with type safety
   */
  static querySelectorAll<T extends Element = Element>(
    selector: string,
    context: Document | Element = document
  ): NodeListOf<T> {
    return context.querySelectorAll<T>(selector);
  }

  /**
   * Get element by ID with type safety
   */
  static getElementById<T extends HTMLElement = HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
  }

  /**
   * Animate element with CSS transitions
   */
  static animate(
    element: HTMLElement,
    styles: Partial<CSSStyleDeclaration>,
    duration = 300,
    easing = 'ease'
  ): Promise<void> {
    return new Promise(resolve => {
      const originalTransition = element.style.transition;
      
      element.style.transition = `all ${duration}ms ${easing}`;
      
      Object.assign(element.style, styles);
      
      const cleanup = () => {
        element.style.transition = originalTransition;
        element.removeEventListener('transitionend', cleanup);
        resolve();
      };
      
      element.addEventListener('transitionend', cleanup);
      
      // Fallback timeout
      setTimeout(cleanup, duration + 50);
    });
  }

  /**
   * Load script dynamically
   */
  static loadScript(src: string, async = true): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = async;
      
      script.onload = () => resolve();
      script.onerror = reject;
      
      document.head.appendChild(script);
    });
  }

  /**
   * Load CSS dynamically
   */
  static loadCSS(href: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      
      link.onload = () => resolve();
      link.onerror = reject;
      
      document.head.appendChild(link);
    });
  }

  /**
   * Get viewport dimensions
   */
  static getViewport(): { width: number; height: number } {
    return {
      width: window.innerWidth || document.documentElement.clientWidth,
      height: window.innerHeight || document.documentElement.clientHeight
    };
  }

  /**
   * Check if element is in viewport
   */
  static isInViewport(element: Element, threshold = 0): boolean {
    const rect = element.getBoundingClientRect();
    const viewport = this.getViewport();
    
    return (
      rect.top >= -threshold &&
      rect.left >= -threshold &&
      rect.bottom <= viewport.height + threshold &&
      rect.right <= viewport.width + threshold
    );
  }
}

/**
 * Storage Utilities
 */
export class StorageUtils {
  /**
   * Enhanced localStorage wrapper
   */
  static localStorage = {
    get<T>(key: string, defaultValue?: T): T | null {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue || null;
      } catch {
        return defaultValue || null;
      }
    },
    
    set(key: string, value: any): boolean {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    
    remove(key: string): boolean {
      try {
        localStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
    
    clear(): boolean {
      try {
        localStorage.clear();
        return true;
      } catch {
        return false;
      }
    }
  };

  /**
   * Enhanced sessionStorage wrapper
   */
  static sessionStorage = {
    get<T>(key: string, defaultValue?: T): T | null {
      try {
        const item = sessionStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue || null;
      } catch {
        return defaultValue || null;
      }
    },
    
    set(key: string, value: any): boolean {
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    
    remove(key: string): boolean {
      try {
        sessionStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
    
    clear(): boolean {
      try {
        sessionStorage.clear();
        return true;
      } catch {
        return false;
      }
    }
  };
}

/**
 * URL Utilities
 */
export class URLUtils {
  /**
   * Parse query string to object
   */
  static parseQuery(search: string = window.location.search): Record<string, string> {
    const params = new URLSearchParams(search);
    const result: Record<string, string> = {};
    
    for (const [key, value] of params) {
      result[key] = value;
    }
    
    return result;
  }

  /**
   * Build query string from object
   */
  static buildQuery(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    
    return searchParams.toString();
  }

  /**
   * Update URL without page reload
   */
  static updateURL(url: string, replace = false): void {
    if (replace) {
      history.replaceState(null, '', url);
    } else {
      history.pushState(null, '', url);
    }
  }

  /**
   * Get base URL
   */
  static getBaseURL(): string {
    return `${location.protocol}//${location.host}`;
  }

  /**
   * Check if URL is external
   */
  static isExternal(url: string): boolean {
    try {
      const urlObj = new URL(url, window.location.href);
      return urlObj.origin !== window.location.origin;
    } catch {
      return false;
    }
  }
}

// Export all utilities
export const browser = {
  detector: BrowserDetector,
  performance: PerformanceUtils,
  dom: DOMUtils,
  storage: StorageUtils,
  url: URLUtils
};