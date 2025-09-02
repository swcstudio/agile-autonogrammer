/**
 * XRCanvas - Core WebXR Canvas Component
 *
 * Provides the foundational WebXR context and rendering environment
 * for immersive VR/AR experiences across all supported platforms
 */

import { AdaptiveDpr, AdaptiveEvents, Environment, Stats } from '@react-three/drei';
import { Canvas, type CanvasProps } from '@react-three/fiber';
import { XR, XRStore, createXRStore } from '@react-three/xr';
import type React from 'react';
import { Suspense, useEffect, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { XRPerformanceMonitor } from '../optimization/PerformanceMonitor';
import { useXRStore } from '../stores/xr-store';
import { SpatialAudioProvider } from './SpatialAudio';

export interface XRCanvasProps extends Omit<CanvasProps, 'children'> {
  children: React.ReactNode;

  // XR Configuration
  enableHandTracking?: boolean;
  enableEyeTracking?: boolean;
  enablePassthrough?: boolean;
  frameRate?: 90 | 120 | 72;
  foveatedRendering?: boolean;

  // Platform Detection
  platform?: 'auto' | 'quest' | 'visionpro' | 'web';
  fallbackMode?: '2d' | 'disabled';

  // Performance Settings
  adaptiveQuality?: boolean;
  targetFPS?: number;
  enableLOD?: boolean;
  enableCulling?: boolean;

  // Audio
  spatialAudio?: boolean;
  audioContext?: AudioContext;

  // Development
  showStats?: boolean;
  showInspector?: boolean;
  enableDebugMode?: boolean;

  // Event Handlers
  onXRSessionStart?: (session: XRSession) => void;
  onXRSessionEnd?: () => void;
  onPerformanceChange?: (metrics: PerformanceMetrics) => void;
}

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  drawCalls: number;
}

export const XRCanvas: React.FC<XRCanvasProps> = ({
  children,
  enableHandTracking = true,
  enableEyeTracking = false,
  enablePassthrough = false,
  frameRate = 90,
  foveatedRendering = true,
  platform = 'auto',
  fallbackMode = '2d',
  adaptiveQuality = true,
  targetFPS = 90,
  enableLOD = true,
  enableCulling = true,
  spatialAudio = true,
  showStats = false,
  showInspector = false,
  enableDebugMode = false,
  onXRSessionStart,
  onXRSessionEnd,
  onPerformanceChange,
  ...canvasProps
}) => {
  const { enterXR, exitXR, updateSpatialMode } = useXRStore();

  // Create XR store with platform-specific configuration
  const xrStore = useMemo(() => {
    const features: XRSessionInit['requiredFeatures'] = [];
    const optionalFeatures: XRSessionInit['optionalFeatures'] = [];

    if (enableHandTracking) {
      optionalFeatures.push('hand-tracking');
    }

    if (enableEyeTracking) {
      optionalFeatures.push('eye-tracking');
    }

    if (enablePassthrough) {
      optionalFeatures.push('camera-access');
    }

    return createXRStore({
      frameRate,
      foveation: foveatedRendering ? 1 : 0,
      referenceSpace: 'local-floor',
      sessionInit: {
        optionalFeatures,
        requiredFeatures: features,
      },
    });
  }, [enableHandTracking, enableEyeTracking, enablePassthrough, frameRate, foveatedRendering]);

  // Platform detection and optimization
  const platformConfig = useMemo(() => {
    if (platform !== 'auto') return { platform };

    // Auto-detect platform based on user agent
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('quest')) {
      return { platform: 'quest', optimizations: ['aggressive-batching', 'reduced-effects'] };
    }

    if (userAgent.includes('visionos')) {
      return { platform: 'visionpro', optimizations: ['high-fidelity', 'spatial-computing'] };
    }

    return { platform: 'web', optimizations: ['adaptive-quality', 'fallback-ready'] };
  }, [platform]);

  // XR session event handlers
  useEffect(() => {
    const handleSessionStart = (session: XRSession) => {
      enterXR(platformConfig.platform);
      updateSpatialMode('3d');
      onXRSessionStart?.(session);
    };

    const handleSessionEnd = () => {
      exitXR();
      updateSpatialMode('2d');
      onXRSessionEnd?.();
    };

    // Subscribe to XR store events
    const unsubscribe = xrStore.subscribe(
      (state) => state.session,
      (session) => {
        if (session) {
          handleSessionStart(session);
        } else {
          handleSessionEnd();
        }
      }
    );

    return unsubscribe;
  }, [
    xrStore,
    enterXR,
    exitXR,
    updateSpatialMode,
    onXRSessionStart,
    onXRSessionEnd,
    platformConfig.platform,
  ]);

  // Error fallback component
  const XRErrorFallback = ({ error, resetErrorBoundary }: any) => (
    <div className="xr-error-fallback p-4 bg-red-100 border border-red-400 rounded">
      <h2 className="text-lg font-bold text-red-800 mb-2">XR Error</h2>
      <p className="text-red-700 mb-4">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Retry XR Session
      </button>
    </div>
  );

  // Performance monitoring callback
  const handlePerformanceUpdate = (metrics: PerformanceMetrics) => {
    onPerformanceChange?.(metrics);

    // Auto-adjust quality based on performance
    if (adaptiveQuality && metrics.fps < targetFPS * 0.8) {
      // Reduce quality to maintain target FPS
      console.log('XR: Reducing quality to maintain performance');
    }
  };

  return (
    <ErrorBoundary FallbackComponent={XRErrorFallback}>
      <Canvas
        {...canvasProps}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false,
        }}
        camera={{
          position: [0, 1.6, 3],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        dpr={adaptiveQuality ? [1, 2] : 1}
      >
        <XR store={xrStore}>
          {/* Adaptive Performance Components */}
          {adaptiveQuality && <AdaptiveDpr pixelated />}
          {adaptiveQuality && <AdaptiveEvents />}

          {/* Performance Monitoring */}
          <XRPerformanceMonitor
            onUpdate={handlePerformanceUpdate}
            targetFPS={targetFPS}
            enabled={enableDebugMode}
          />

          {/* Spatial Audio Context */}
          {spatialAudio && (
            <SpatialAudioProvider>
              {/* Audio will be handled by child components */}
            </SpatialAudioProvider>
          )}

          {/* Default Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 5, 5]}
            intensity={0.6}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />

          {/* Environment */}
          <Environment
            preset={platformConfig.platform === 'visionpro' ? 'studio' : 'city'}
            background={!enablePassthrough}
          />

          {/* XR Content */}
          <Suspense fallback={<XRLoadingFallback />}>{children}</Suspense>

          {/* Development Tools */}
          {showStats && <Stats />}

          {/* Platform-Specific Optimizations */}
          <PlatformOptimizations platform={platformConfig.platform} />
        </XR>
      </Canvas>
    </ErrorBoundary>
  );
};

// Loading fallback for XR content
const XRLoadingFallback: React.FC = () => (
  <mesh position={[0, 1.6, -2]}>
    <boxGeometry args={[1, 0.5, 0.1]} />
    <meshStandardMaterial color="#4f46e5" transparent opacity={0.8} />
    <mesh position={[0, 0, 0.06]}>
      <planeGeometry args={[0.8, 0.3]} />
      <meshBasicMaterial color="white" />
    </mesh>
  </mesh>
);

// Platform-specific optimization component
const PlatformOptimizations: React.FC<{ platform: string }> = ({ platform }) => {
  switch (platform) {
    case 'quest':
      return (
        <>
          {/* Quest-specific optimizations */}
          <primitive object={{ foveatedRendering: true }} />
          <primitive object={{ fixedFrameRate: 90 }} />
        </>
      );

    case 'visionpro':
      return (
        <>
          {/* Vision Pro optimizations */}
          <primitive object={{ spatialComputing: true }} />
          <primitive object={{ passthrough: true }} />
        </>
      );

    default:
      return null;
  }
};

export default XRCanvas;
