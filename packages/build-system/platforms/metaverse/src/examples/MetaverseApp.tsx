/**
 * MetaverseApp - Complete WebXR Application Example
 *
 * Demonstrates the full capabilities of Katalyst WebXR including
 * spatial UI, hand tracking, multi-user collaboration, and integration
 * with the existing Aceternity design system
 */

import type React from 'react';
import { Suspense, useEffect, useState } from 'react';
import {
  AceternityButton,
  AceternityCard,
  useCountUp,
  useInView,
  useTypewriter,
} from '../../design-system';
import { SpatialCard, XRCanvas, useSpatialInteraction, useXRSession, useXRStore } from '../index';

// Main Metaverse Application
export const MetaverseApp: React.FC = () => {
  const { isXRSupported, isXRActive, enterXR, exitXR } = useXRSession();
  const [showXRContent, setShowXRContent] = useState(false);

  // Initialize XR when component mounts
  useEffect(() => {
    if (isXRSupported && !isXRActive) {
      setShowXRContent(true);
    }
  }, [isXRSupported, isXRActive]);

  // Fallback for non-XR environments
  if (!isXRSupported) {
    return <WebFallbackApp />;
  }

  return (
    <div className="metaverse-app w-full h-screen">
      {/* 2D UI Overlay for XR Entry */}
      {!isXRActive && (
        <div className="xr-entry-overlay absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          <AceternityCard variant="aurora" className="max-w-md p-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-4">Enter the Metaverse</h1>
            <p className="text-gray-300 mb-6">
              Experience Katalyst in immersive VR/AR. Compatible with Meta Quest, Apple Vision Pro,
              and web browsers.
            </p>

            <div className="space-y-4">
              <AceternityButton
                variant="shimmer"
                onClick={() => enterXR({ platform: 'auto', mode: 'immersive-vr' })}
                className="w-full"
              >
                Enter VR Mode
              </AceternityButton>

              <AceternityButton
                variant="border-magic"
                onClick={() => enterXR({ platform: 'auto', mode: 'immersive-ar' })}
                className="w-full"
              >
                Enter AR Mode
              </AceternityButton>

              <button
                onClick={() => setShowXRContent(true)}
                className="w-full px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Continue in 2D Mode
              </button>
            </div>
          </AceternityCard>
        </div>
      )}

      {/* XR Content */}
      {(isXRActive || showXRContent) && (
        <XRCanvas
          enableHandTracking={true}
          enableEyeTracking={true}
          spatialAudio={true}
          adaptiveQuality={true}
          showStats={process.env.NODE_ENV === 'development'}
        >
          <Suspense fallback={<XRLoadingScene />}>
            <MetaverseScene />
          </Suspense>
        </XRCanvas>
      )}
    </div>
  );
};

// Main 3D Scene Content
const MetaverseScene: React.FC = () => {
  const { spatialUI, addSpatialComponent, updateSpatialComponent } = useXRStore();
  const [currentScene, setCurrentScene] = useState<'welcome' | 'workspace' | 'collaboration'>(
    'welcome'
  );

  useEffect(() => {
    // Add spatial components to the store
    addSpatialComponent('welcome-card', {
      position: [0, 1.6, -2],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      visible: true,
      interactive: true,
    });

    addSpatialComponent('navigation-panel', {
      position: [-2, 2, -1],
      rotation: [0, 0.3, 0],
      scale: [0.8, 0.8, 0.8],
      visible: true,
      interactive: true,
    });
  }, [addSpatialComponent]);

  return (
    <group>
      {/* Environment Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      <pointLight position={[-5, 3, 2]} intensity={0.3} color="#4f46e5" />

      {/* Scene Switcher */}
      {currentScene === 'welcome' && <WelcomeScene onNavigate={setCurrentScene} />}
      {currentScene === 'workspace' && <WorkspaceScene onNavigate={setCurrentScene} />}
      {currentScene === 'collaboration' && <CollaborationScene onNavigate={setCurrentScene} />}

      {/* Always visible navigation */}
      <NavigationPanel currentScene={currentScene} onNavigate={setCurrentScene} />

      {/* Floating Help System */}
      <FloatingHelp />
    </group>
  );
};

// Welcome Scene
const WelcomeScene: React.FC<{ onNavigate: (scene: string) => void }> = ({ onNavigate }) => {
  const { displayedText } = useTypewriter('Welcome to Katalyst Metaverse', 100);
  const { count } = useCountUp(100, 2000);
  const { ref, isInView } = useInView();

  return (
    <group ref={ref}>
      {/* Main Welcome Card */}
      <SpatialCard
        variant="aurora"
        position={[0, 1.6, -2]}
        width={3}
        height={1.8}
        interactive={true}
        animation={{ hover: 'lift', entrance: 'fade', idle: 'float' }}
        followGaze={false}
      >
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white mb-4">{displayedText}</h1>
          <p className="text-xl text-gray-300">The future of immersive development</p>
          <div className="text-6xl font-bold text-purple-400">{count}%</div>
          <p className="text-sm text-gray-400">Performance Optimization</p>
        </div>
      </SpatialCard>

      {/* Feature Cards */}
      {isInView && (
        <group>
          <SpatialCard
            variant="holographic"
            position={[-2.5, 1.2, -1.5]}
            width={2}
            height={1.2}
            interactive={true}
            onSelect={() => onNavigate('workspace')}
          >
            <div className="text-center">
              <h3 className="text-2xl font-bold text-cyan-400 mb-2">🏗️ Workspace</h3>
              <p className="text-gray-300">Immersive development environment</p>
            </div>
          </SpatialCard>

          <SpatialCard
            variant="meteors"
            position={[2.5, 1.2, -1.5]}
            width={2}
            height={1.2}
            interactive={true}
            onSelect={() => onNavigate('collaboration')}
          >
            <div className="text-center">
              <h3 className="text-2xl font-bold text-green-400 mb-2">👥 Collaborate</h3>
              <p className="text-gray-300">Multi-user shared spaces</p>
            </div>
          </SpatialCard>

          {/* Interactive Demo Elements */}
          <HandTrackingDemo position={[0, 0.8, -1]} />
          <GestureDemo position={[3, 0.8, -2]} />
        </group>
      )}
    </group>
  );
};

// Workspace Scene - Immersive Development Environment
const WorkspaceScene: React.FC<{ onNavigate: (scene: string) => void }> = ({ onNavigate }) => {
  const [selectedFile, setSelectedFile] = useState('App.tsx');
  const [code, setCode] = useState(
    `
import React from 'react';
import { MetaverseApp } from '@katalyst/webxr';

export default function App() {
  return <MetaverseApp />;
}
  `.trim()
  );

  return (
    <group>
      {/* Floating IDE */}
      <SpatialCard
        variant="glass"
        position={[-2, 1.6, -1]}
        width={2.5}
        height={2}
        interactive={true}
        htmlContent={
          <div className="p-4 bg-gray-900 rounded text-white text-sm font-mono">
            <div className="mb-2 text-green-400">{selectedFile}</div>
            <pre className="whitespace-pre-wrap text-xs leading-relaxed">{code}</pre>
          </div>
        }
      />

      {/* File Explorer */}
      <SpatialCard
        variant="holographic"
        position={[-3.5, 1.6, -1]}
        width={1.5}
        height={2}
        interactive={true}
      >
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-cyan-400 mb-4">Files</h3>
          {['App.tsx', 'components/', 'hooks/', 'stores/'].map((file) => (
            <div
              key={file}
              className={`p-2 rounded cursor-pointer transition-colors ${
                selectedFile === file ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
              onClick={() => setSelectedFile(file)}
            >
              {file}
            </div>
          ))}
        </div>
      </SpatialCard>

      {/* Live Preview */}
      <SpatialCard
        variant="aurora"
        position={[2, 1.6, -1]}
        width={2.5}
        height={1.8}
        interactive={true}
      >
        <div className="text-center">
          <h3 className="text-xl font-bold text-purple-400 mb-4">Live Preview</h3>
          <div className="space-y-2">
            <div className="w-full h-2 bg-purple-600 rounded animate-pulse" />
            <div className="w-3/4 h-2 bg-blue-600 rounded animate-pulse" />
            <div className="w-1/2 h-2 bg-green-600 rounded animate-pulse" />
          </div>
          <p className="text-sm text-gray-400 mt-4">Hot reload in 3D space</p>
        </div>
      </SpatialCard>

      {/* Terminal */}
      <SpatialCard
        variant="evervault"
        position={[0, 0.8, -1]}
        width={3}
        height={1}
        interactive={true}
        htmlContent={
          <div className="p-4 bg-black rounded text-green-400 font-mono text-sm">
            <div className="mb-2">$ katalyst xr dev --immersive</div>
            <div className="text-gray-500">Building for WebXR...</div>
            <div className="text-green-400">✓ Ready in 1.2s</div>
            <div className="animate-pulse">_</div>
          </div>
        }
      />

      {/* Back Button */}
      <SpatialCard
        variant="spotlight"
        position={[3.5, 2.5, -0.5]}
        width={1}
        height={0.5}
        interactive={true}
        onSelect={() => onNavigate('welcome')}
      >
        ← Back
      </SpatialCard>
    </group>
  );
};

// Collaboration Scene - Multi-User Environment
const CollaborationScene: React.FC<{ onNavigate: (scene: string) => void }> = ({ onNavigate }) => {
  const { multiUser, joinMultiUserSession } = useXRStore();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Simulate joining a multi-user session
    if (!isConnected) {
      joinMultiUserSession('demo-session', 'user-123', 'Developer');
      setIsConnected(true);
    }
  }, [isConnected, joinMultiUserSession]);

  return (
    <group>
      {/* Shared Whiteboard */}
      <SpatialCard variant="glass" position={[0, 2, -3]} width={4} height={2.5} interactive={true}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Shared Whiteboard</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="w-full h-1 bg-red-500 rounded" />
              <div className="w-3/4 h-1 bg-blue-500 rounded" />
              <div className="w-1/2 h-1 bg-green-500 rounded" />
            </div>
            <div className="space-y-2">
              <div className="w-2/3 h-1 bg-yellow-500 rounded" />
              <div className="w-full h-1 bg-purple-500 rounded" />
              <div className="w-1/3 h-1 bg-pink-500 rounded" />
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-4">Draw with your hands to collaborate</p>
        </div>
      </SpatialCard>

      {/* User Avatars */}
      <group>
        {Object.values(multiUser.connectedUsers).map((user, index) => (
          <SpatialCard
            key={user.id}
            variant="holographic"
            position={[index * 1.5 - 2, 1.6, -1]}
            width={1}
            height={1.5}
            interactive={false}
          >
            <div className="text-center">
              <div className="text-4xl mb-2">👤</div>
              <div className="text-sm font-bold text-cyan-400">{user.name}</div>
              <div className="text-xs text-gray-400 mt-1">{user.isActive ? 'Active' : 'Away'}</div>
            </div>
          </SpatialCard>
        ))}
      </group>

      {/* Voice Chat Visualizer */}
      <SpatialCard
        variant="aurora"
        position={[-3, 1, -1]}
        width={1.5}
        height={1}
        interactive={true}
      >
        <div className="text-center">
          <h4 className="text-lg font-bold text-green-400 mb-2">🎤 Voice</h4>
          <div className="flex justify-center space-x-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-green-500 rounded animate-pulse"
                style={{
                  height: `${Math.random() * 20 + 10}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>
      </SpatialCard>

      {/* Back Button */}
      <SpatialCard
        variant="spotlight"
        position={[3.5, 2.5, -0.5]}
        width={1}
        height={0.5}
        interactive={true}
        onSelect={() => onNavigate('welcome')}
      >
        ← Back
      </SpatialCard>
    </group>
  );
};

// Navigation Panel
const NavigationPanel: React.FC<{
  currentScene: string;
  onNavigate: (scene: string) => void;
}> = ({ currentScene, onNavigate }) => (
  <SpatialCard
    variant="glass"
    position={[-2, 2.5, -1]}
    width={1.5}
    height={1.2}
    interactive={true}
    billboarding={true}
  >
    <div className="space-y-2">
      <h4 className="text-sm font-bold text-white text-center mb-3">Navigation</h4>
      {[
        { id: 'welcome', label: '🏠 Home', icon: '🏠' },
        { id: 'workspace', label: '🏗️ IDE', icon: '🏗️' },
        { id: 'collaboration', label: '👥 Team', icon: '👥' },
      ].map((scene) => (
        <div
          key={scene.id}
          className={`p-2 rounded text-center cursor-pointer transition-colors ${
            currentScene === scene.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          onClick={() => onNavigate(scene.id)}
        >
          <div className="text-lg">{scene.icon}</div>
          <div className="text-xs">{scene.label.split(' ')[1]}</div>
        </div>
      ))}
    </div>
  </SpatialCard>
);

// Hand Tracking Demo
const HandTrackingDemo: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const { handPositions, handGestures } = useSpatialInteraction();

  return (
    <SpatialCard variant="evervault" position={position} width={2} height={1} interactive={false}>
      <div className="text-center">
        <h4 className="text-lg font-bold text-purple-400 mb-2">✋ Hand Tracking</h4>
        <div className="space-y-1 text-xs">
          <div>Hands Detected: {handPositions.length}</div>
          {Object.entries(handGestures).map(([index, gesture]) => (
            <div key={index} className="text-cyan-300">
              Hand {index}: {gesture}
            </div>
          ))}
        </div>
      </div>
    </SpatialCard>
  );
};

// Gesture Demo
const GestureDemo: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const [lastGesture, setLastGesture] = useState('none');

  const { onPointerDown } = useSpatialInteraction({
    onSelect: () => setLastGesture('select'),
    onGrab: () => setLastGesture('grab'),
  });

  return (
    <SpatialCard
      variant="spotlight"
      position={position}
      width={1.5}
      height={1}
      interactive={true}
      onSelect={onPointerDown}
    >
      <div className="text-center">
        <h4 className="text-lg font-bold text-yellow-400 mb-2">👆 Gestures</h4>
        <div className="text-sm">
          <div>Try pointing or pinching!</div>
          <div className="text-cyan-300 mt-1">Last: {lastGesture}</div>
        </div>
      </div>
    </SpatialCard>
  );
};

// Floating Help System
const FloatingHelp: React.FC = () => (
  <SpatialCard
    variant="holographic"
    position={[3, 3, -0.5]}
    width={1.2}
    height={0.8}
    interactive={true}
    followGaze={true}
    billboarding={true}
  >
    <div className="text-center text-xs">
      <div className="text-lg mb-1">❓</div>
      <div className="space-y-1">
        <div>👆 Point to hover</div>
        <div>🤏 Pinch to select</div>
        <div>✊ Grab to move</div>
      </div>
    </div>
  </SpatialCard>
);

// Loading Scene
const XRLoadingScene: React.FC = () => (
  <group>
    <SpatialCard variant="aurora" position={[0, 1.6, -2]} width={2} height={1} interactive={false}>
      <div className="text-center">
        <div className="text-2xl mb-2">🌌</div>
        <div>Loading Metaverse...</div>
        <div className="mt-2 flex justify-center space-x-1">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </SpatialCard>
  </group>
);

// Web Fallback for non-XR devices
const WebFallbackApp: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
    <AceternityCard variant="aurora" className="max-w-lg p-8 text-center">
      <h1 className="text-3xl font-bold text-white mb-4">WebXR Not Supported</h1>
      <p className="text-gray-300 mb-6">
        Your device doesn't support WebXR. Try using a VR headset, AR device, or compatible browser.
      </p>
      <div className="space-y-2 text-sm text-gray-400">
        <div>✓ Meta Quest Browser</div>
        <div>✓ Chrome with WebXR flag</div>
        <div>✓ Apple Vision Pro Safari</div>
        <div>✓ Firefox Reality</div>
      </div>
    </AceternityCard>
  </div>
);

export default MetaverseApp;
