/**
 * useXRSession - Core WebXR Session Management Hook
 *
 * Provides comprehensive XR session management with platform detection,
 * feature detection, and session lifecycle management
 */

import { useXR } from '@react-three/xr';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useXRStore } from '../stores/xr-store';

export interface XRSessionConfig {
  platform?: 'quest' | 'visionpro' | 'web' | 'auto';
  mode?: 'immersive-vr' | 'immersive-ar' | 'inline';
  features?: {
    handTracking?: boolean;
    eyeTracking?: boolean;
    passthrough?: boolean;
    spatialMapping?: boolean;
    planeDetection?: boolean;
  };
}

export interface XRDeviceInfo {
  platform: string;
  model: string;
  os: string;
  version: string;
  capabilities: string[];
  supportedFeatures: string[];
  refreshRate: number;
  resolution: { width: number; height: number };
  fov: { horizontal: number; vertical: number };
}

export interface UseXRSessionReturn {
  // Session State
  isXRSupported: boolean;
  isXRActive: boolean;
  session: XRSession | null;
  sessionMode: string | null;

  // Device Information
  deviceInfo: XRDeviceInfo | null;
  currentPlatform: string | null;

  // Session Management
  enterXR: (config?: XRSessionConfig) => Promise<void>;
  exitXR: () => Promise<void>;

  // Feature Detection
  checkFeatureSupport: (feature: string) => Promise<boolean>;
  getAvailableFeatures: () => Promise<string[]>;

  // Platform Detection
  detectPlatform: () => Promise<string>;

  // Performance Monitoring
  sessionMetrics: {
    frameRate: number;
    latency: number;
    trackingQuality: 'high' | 'medium' | 'low';
  };

  // Error Handling
  lastError: Error | null;
  clearError: () => void;
}

export const useXRSession = (): UseXRSessionReturn => {
  // State
  const [isXRSupported, setIsXRSupported] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<XRDeviceInfo | null>(null);
  const [currentPlatform, setCurrentPlatform] = useState<string | null>(null);
  const [sessionMetrics, setSessionMetrics] = useState({
    frameRate: 0,
    latency: 0,
    trackingQuality: 'high' as const,
  });
  const [lastError, setLastError] = useState<Error | null>(null);

  // XR Context from react-three/xr
  const { isPresenting, session, player } = useXR();

  // Global XR Store
  const { isXRActive, enterXR: setXRActive, exitXR: setXRInactive } = useXRStore();

  // Refs for cleanup
  const sessionRef = useRef<XRSession | null>(null);
  const metricsInterval = useRef<NodeJS.Timeout>();

  // Initialize XR support detection
  useEffect(() => {
    const checkXRSupport = async () => {
      try {
        if ('xr' in navigator) {
          const isSupported = await navigator.xr.isSessionSupported('immersive-vr');
          setIsXRSupported(isSupported);

          if (isSupported) {
            const platform = await detectPlatform();
            setCurrentPlatform(platform);

            const deviceInfo = await getDeviceInfo();
            setDeviceInfo(deviceInfo);
          }
        }
      } catch (error) {
        console.warn('XR support detection failed:', error);
        setIsXRSupported(false);
      }
    };

    checkXRSupport();
  }, []);

  // Platform detection
  const detectPlatform = useCallback(async (): Promise<string> => {
    const userAgent = navigator.userAgent.toLowerCase();

    // Check for specific VR/AR platforms
    if (userAgent.includes('quest') || userAgent.includes('oculus')) {
      return 'quest';
    }

    if (userAgent.includes('visionos') || userAgent.includes('vision pro')) {
      return 'visionpro';
    }

    if (userAgent.includes('hololens')) {
      return 'hololens';
    }

    // Check for mobile AR capability
    if ('xr' in navigator) {
      try {
        const arSupported = await navigator.xr.isSessionSupported('immersive-ar');
        if (arSupported) return 'mobile-ar';
      } catch (e) {
        // AR not supported
      }
    }

    return 'web';
  }, []);

  // Get detailed device information
  const getDeviceInfo = useCallback(async (): Promise<XRDeviceInfo> => {
    const platform = await detectPlatform();
    const features = await getAvailableFeatures();

    // Platform-specific device info
    const deviceInfo: XRDeviceInfo = {
      platform,
      model: 'Unknown',
      os: 'Unknown',
      version: '1.0.0',
      capabilities: features,
      supportedFeatures: features,
      refreshRate: 90,
      resolution: { width: 1920, height: 1080 },
      fov: { horizontal: 110, vertical: 90 },
    };

    // Platform-specific enhancements
    switch (platform) {
      case 'quest':
        deviceInfo.model = 'Meta Quest';
        deviceInfo.os = 'Android';
        deviceInfo.refreshRate = 90;
        deviceInfo.resolution = { width: 1832, height: 1920 };
        break;

      case 'visionpro':
        deviceInfo.model = 'Apple Vision Pro';
        deviceInfo.os = 'visionOS';
        deviceInfo.refreshRate = 96;
        deviceInfo.resolution = { width: 3660, height: 3200 };
        break;
    }

    return deviceInfo;
  }, [detectPlatform]);

  // Feature support detection
  const checkFeatureSupport = useCallback(async (feature: string): Promise<boolean> => {
    if (!('xr' in navigator)) return false;

    try {
      const session = await navigator.xr.requestSession('inline');
      const supported = session.enabledFeatures?.includes(feature) ?? false;
      session.end();
      return supported;
    } catch (error) {
      return false;
    }
  }, []);

  // Get all available features
  const getAvailableFeatures = useCallback(async (): Promise<string[]> => {
    const commonFeatures = ['viewer', 'local', 'local-floor', 'bounded-floor', 'unbounded'];

    const optionalFeatures = [
      'hand-tracking',
      'eye-tracking',
      'face-tracking',
      'camera-access',
      'depth-sensing',
      'hit-test',
      'plane-detection',
      'mesh-detection',
      'light-estimation',
    ];

    const supportedFeatures: string[] = [...commonFeatures];

    for (const feature of optionalFeatures) {
      const isSupported = await checkFeatureSupport(feature);
      if (isSupported) {
        supportedFeatures.push(feature);
      }
    }

    return supportedFeatures;
  }, [checkFeatureSupport]);

  // Enter XR session
  const enterXR = useCallback(
    async (config: XRSessionConfig = {}) => {
      try {
        setLastError(null);

        if (!isXRSupported) {
          throw new Error('XR not supported on this device');
        }

        const sessionMode = config.mode || 'immersive-vr';
        const features = config.features || {};

        // Build session initialization options
        const sessionInit: XRSessionInit = {
          optionalFeatures: [],
          requiredFeatures: [],
        };

        if (features.handTracking) {
          sessionInit.optionalFeatures!.push('hand-tracking');
        }

        if (features.eyeTracking) {
          sessionInit.optionalFeatures!.push('eye-tracking');
        }

        if (features.passthrough) {
          sessionInit.optionalFeatures!.push('camera-access');
        }

        if (features.planeDetection) {
          sessionInit.optionalFeatures!.push('plane-detection');
        }

        // Request XR session
        const xrSession = await navigator.xr.requestSession(sessionMode, sessionInit);
        sessionRef.current = xrSession;

        // Update global state
        setXRActive(currentPlatform || 'unknown');

        // Start performance monitoring
        startMetricsMonitoring(xrSession);

        // Session event handlers
        xrSession.addEventListener('end', () => {
          setXRInactive();
          stopMetricsMonitoring();
        });
      } catch (error) {
        const xrError = error as Error;
        setLastError(xrError);
        throw xrError;
      }
    },
    [isXRSupported, currentPlatform, setXRActive, setXRInactive]
  );

  // Exit XR session
  const exitXR = useCallback(async () => {
    try {
      if (sessionRef.current) {
        await sessionRef.current.end();
        sessionRef.current = null;
      }

      setXRInactive();
      stopMetricsMonitoring();
    } catch (error) {
      setLastError(error as Error);
    }
  }, [setXRInactive]);

  // Performance metrics monitoring
  const startMetricsMonitoring = useCallback((xrSession: XRSession) => {
    let frameCount = 0;
    let lastTime = performance.now();

    const updateMetrics = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;
      frameCount++;

      if (deltaTime >= 1000) {
        // Update every second
        const fps = Math.round((frameCount * 1000) / deltaTime);
        const latency = deltaTime / frameCount;

        setSessionMetrics((prev) => ({
          ...prev,
          frameRate: fps,
          latency,
          trackingQuality: fps > 85 ? 'high' : fps > 70 ? 'medium' : 'low',
        }));

        frameCount = 0;
        lastTime = currentTime;
      }
    };

    metricsInterval.current = setInterval(updateMetrics, 100);
  }, []);

  const stopMetricsMonitoring = useCallback(() => {
    if (metricsInterval.current) {
      clearInterval(metricsInterval.current);
      metricsInterval.current = undefined;
    }
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMetricsMonitoring();
      if (sessionRef.current) {
        sessionRef.current.end();
      }
    };
  }, [stopMetricsMonitoring]);

  return {
    // Session State
    isXRSupported,
    isXRActive: isPresenting || isXRActive,
    session: session || sessionRef.current,
    sessionMode: session?.mode || null,

    // Device Information
    deviceInfo,
    currentPlatform,

    // Session Management
    enterXR,
    exitXR,

    // Feature Detection
    checkFeatureSupport,
    getAvailableFeatures,

    // Platform Detection
    detectPlatform,

    // Performance Monitoring
    sessionMetrics,

    // Error Handling
    lastError,
    clearError,
  };
};

export default useXRSession;
