/**
 * Katalyst Metaverse Platform
 * 
 * A comprehensive metaverse development platform built on WebXR
 * Supporting VR, AR, and MR experiences across devices
 * 
 * Architecture:
 * - WebXR: Core technology for immersive web experiences
 * - Three.js: 3D graphics engine
 * - A-Frame: Declarative WebXR framework
 * - Rapier: Physics engine
 * - WebRTC: Real-time networking
 */

// ========================================
// WEBXR CORE - Foundation Technology
// ========================================
export * from './webxr/core/XRCanvas';
export * from './webxr/core/XRSession';
export * from './webxr/core/XRProvider';
export * from './webxr/core/XRRenderer';
export * from './webxr/core/XRCamera';

// WebXR Device APIs
export * from './webxr/devices/XRController';
export * from './webxr/devices/XRHeadset';
export * from './webxr/devices/XRTracker';

// WebXR Input & Interaction
export * from './webxr/input/HandTracking';
export * from './webxr/input/GestureRecognition';
export * from './webxr/input/EyeTracking';
export * from './webxr/input/VoiceCommands';
export * from './webxr/input/HapticFeedback';

// WebXR Spatial Computing
export * from './webxr/spatial/SpatialAnchors';
export * from './webxr/spatial/PlaneDetection';
export * from './webxr/spatial/MeshDetection';
export * from './webxr/spatial/LightEstimation';
export * from './webxr/spatial/Occlusion';

// ========================================
// METAVERSE SYSTEMS - Built on WebXR
// ========================================

// World & Environment
export * from './metaverse/world/WorldManager';
export * from './metaverse/world/SceneGraph';
export * from './metaverse/world/EnvironmentSystem';
export * from './metaverse/world/WeatherSystem';
export * from './metaverse/world/DayNightCycle';
export * from './metaverse/world/TerrainGenerator';

// Avatar & Character System
export * from './metaverse/avatar/AvatarSystem';
export * from './metaverse/avatar/AvatarCustomizer';
export * from './metaverse/avatar/AvatarAnimations';
export * from './metaverse/avatar/FacialExpressions';
export * from './metaverse/avatar/LipSync';
export * from './metaverse/avatar/IKSystem';

// Physics & Simulation
export * from './metaverse/physics/PhysicsEngine';
export * from './metaverse/physics/RigidBodySystem';
export * from './metaverse/physics/SoftBodySystem';
export * from './metaverse/physics/FluidSimulation';
export * from './metaverse/physics/ClothSimulation';
export * from './metaverse/physics/ParticleSystem';

// Networking & Multiplayer
export * from './metaverse/networking/NetworkManager';
export * from './metaverse/networking/RealtimeSync';
export * from './metaverse/networking/VoiceChat';
export * from './metaverse/networking/VideoStreaming';
export * from './metaverse/networking/P2PNetwork';
export * from './metaverse/networking/ServerAuthoritative';

// Asset Management
export * from './metaverse/assets/AssetLoader';
export * from './metaverse/assets/ModelOptimizer';
export * from './metaverse/assets/TextureCompressor';
export * from './metaverse/assets/LODSystem';
export * from './metaverse/assets/StreamingAssets';
export * from './metaverse/assets/NFTIntegration';

// Spatial Audio
export * from './metaverse/audio/SpatialAudio';
export * from './metaverse/audio/AmbisonicAudio';
export * from './metaverse/audio/AudioZones';
export * from './metaverse/audio/ReverbSystem';
export * from './metaverse/audio/AudioOcclusion';

// AI & NPCs
export * from './metaverse/ai/NPCSystem';
export * from './metaverse/ai/PathFinding';
export * from './metaverse/ai/BehaviorTrees';
export * from './metaverse/ai/ConversationalAI';
export * from './metaverse/ai/ProceduralAnimation';

// Economy & Commerce
export * from './metaverse/economy/VirtualEconomy';
export * from './metaverse/economy/ItemSystem';
export * from './metaverse/economy/MarketPlace';
export * from './metaverse/economy/CryptoWallet';
export * from './metaverse/economy/SmartContracts';

// ========================================
// PLATFORM-SPECIFIC IMPLEMENTATIONS
// ========================================

// VR Platforms (using WebXR)
export * from './platforms/vr/MetaQuest';
export * from './platforms/vr/PicoVR';
export * from './platforms/vr/PCVR';
export * from './platforms/vr/PlaystationVR';

// AR Platforms (using WebXR)
export * from './platforms/ar/ARCore';
export * from './platforms/ar/ARKit';
export * from './platforms/ar/VisionPro';
export * from './platforms/ar/MagicLeap';
export * from './platforms/ar/HoloLens';

// MR Platforms (using WebXR)
export * from './platforms/mr/MixedReality';
export * from './platforms/mr/PassThrough';
export * from './platforms/mr/SpatialComputing';

// ========================================
// UI & INTERACTION SYSTEMS
// ========================================

// Spatial UI Components (WebXR-based)
export * from './components/spatial/SpatialCard';
export * from './components/spatial/SpatialButton';
export * from './components/spatial/SpatialText';
export * from './components/spatial/SpatialLayout';
export * from './components/spatial/SpatialMenu';
export * from './components/spatial/SpatialPanel';
export * from './components/spatial/SpatialKeyboard';

// 3D UI Extensions
export * from './components/3d/FloatingUI';
export * from './components/3d/HolographicUI';
export * from './components/3d/WorldSpaceUI';
export * from './components/3d/ScreenSpaceUI';
export * from './components/3d/DiegeticUI';

// Interaction Systems
export * from './interaction/RaycastSystem';
export * from './interaction/GrabSystem';
export * from './interaction/TeleportSystem';
export * from './interaction/SnapZones';
export * from './interaction/InteractableObjects';
export * from './interaction/ProximityTriggers';

// Locomotion
export * from './locomotion/TeleportLocomotion';
export * from './locomotion/SmoothLocomotion';
export * from './locomotion/FlyingLocomotion';
export * from './locomotion/ClimbingSystem';
export * from './locomotion/VehicleSystem';

// ========================================
// DEVELOPMENT TOOLS
// ========================================

// WebXR Debugging
export * from './devtools/XRInspector';
export * from './devtools/SpatialDebugger';
export * from './devtools/PerformanceProfiler';
export * from './devtools/NetworkMonitor';
export * from './devtools/PhysicsDebugger';

// Scene Building
export * from './builders/SceneBuilder';
export * from './builders/WorldBuilder';
export * from './builders/LevelEditor';
export * from './builders/MaterialEditor';
export * from './builders/LightingEditor';

// ========================================
// HOOKS & STATE MANAGEMENT
// ========================================

// WebXR Hooks
export * from './hooks/useXRSession';
export * from './hooks/useXRFrame';
export * from './hooks/useXRController';
export * from './hooks/useHandTracking';
export * from './hooks/useSpatialInteraction';
export * from './hooks/useXRPerformance';
export * from './hooks/useGestureRecognition';

// Metaverse Hooks
export * from './hooks/useAvatar';
export * from './hooks/useWorld';
export * from './hooks/useNetworking';
export * from './hooks/useSpatialAudio';
export * from './hooks/usePhysics';
export * from './hooks/useAssets';

// State Stores
export * from './stores/xr-store';
export * from './stores/world-store';
export * from './stores/avatar-store';
export * from './stores/network-store';
export * from './stores/asset-store';

// ========================================
// INTEGRATIONS & BRIDGES
// ========================================

// Three.js Integration
export * from './integrations/three/ThreeRenderer';
export * from './integrations/three/ThreeLoader';
export * from './integrations/three/ThreeEffects';

// A-Frame Integration
export * from './integrations/aframe/AFrameComponents';
export * from './integrations/aframe/AFrameSystems';
export * from './integrations/aframe/AFramePrimitives';

// Babylon.js Integration
export * from './integrations/babylon/BabylonRenderer';
export * from './integrations/babylon/BabylonXR';

// Unity WebGL Bridge
export * from './bridges/unity/UnityBridge';
export * from './bridges/unity/UnityMessaging';

// Unreal Engine Bridge
export * from './bridges/unreal/UnrealBridge';
export * from './bridges/unreal/PixelStreaming';

// ========================================
// UTILITIES & HELPERS
// ========================================

// WebXR Utilities
export * from './utils/webxr-utils';
export * from './utils/xr-math';
export * from './utils/xr-helpers';

// 3D Math & Geometry
export * from './utils/vector-math';
export * from './utils/quaternion-math';
export * from './utils/matrix-math';
export * from './utils/geometry-utils';

// Performance Optimization
export * from './optimization/Instancing';
export * from './optimization/Culling';
export * from './optimization/LODSystem';
export * from './optimization/TextureAtlas';
export * from './optimization/DrawCallBatching';

// ========================================
// EXAMPLES & TEMPLATES
// ========================================

// Complete Applications
export * from './examples/MetaverseApp';
export * from './examples/VirtualStore';
export * from './examples/VirtualClassroom';
export * from './examples/SocialVR';
export * from './examples/VRGame';
export * from './examples/ARNavigation';
export * from './examples/MRCollaboration';

// ========================================
// MAIN EXPORTS
// ========================================

// Main Metaverse Class
export { KatalystMetaverse } from './KatalystMetaverse';

// Configuration
export { MetaverseConfig } from './config/MetaverseConfig';

// Types
export * from './types';