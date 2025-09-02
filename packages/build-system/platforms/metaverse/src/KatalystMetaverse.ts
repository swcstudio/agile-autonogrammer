/**
 * KatalystMetaverse - Main Metaverse Platform Class
 * 
 * Orchestrates WebXR, Three.js, physics, networking, and all metaverse systems
 */

import * as THREE from 'three';
import { EventEmitter } from 'events';

export interface MetaverseConfig {
  // WebXR Configuration
  webxr: {
    enabled: boolean;
    requiredFeatures: string[];
    optionalFeatures: string[];
    referenceSpace: XRReferenceSpaceType;
    framebufferScaleFactor: number;
  };
  
  // Rendering Configuration
  rendering: {
    engine: 'three' | 'babylon' | 'aframe';
    antialias: boolean;
    pixelRatio: number;
    shadowMapEnabled: boolean;
    toneMapping: THREE.ToneMapping;
    physicallyCorrectLights: boolean;
  };
  
  // Physics Configuration
  physics: {
    enabled: boolean;
    engine: 'rapier' | 'cannon' | 'ammo';
    gravity: { x: number; y: number; z: number };
    timestep: number;
    iterations: number;
  };
  
  // Networking Configuration
  networking: {
    enabled: boolean;
    mode: 'p2p' | 'server' | 'hybrid';
    signalingServer?: string;
    iceServers?: RTCIceServer[];
    maxPeers: number;
  };
  
  // World Configuration
  world: {
    size: { width: number; height: number; depth: number };
    origin: { x: number; y: number; z: number };
    skybox?: string;
    fog?: {
      enabled: boolean;
      color: number;
      near: number;
      far: number;
    };
  };
  
  // Performance Configuration
  performance: {
    targetFPS: number;
    adaptiveQuality: boolean;
    maxDrawCalls: number;
    maxTriangles: number;
    lodBias: number;
    instancing: boolean;
  };
}

export class KatalystMetaverse extends EventEmitter {
  private config: MetaverseConfig;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private xrSession: XRSession | null = null;
  private xrReferenceSpace: XRReferenceSpace | null = null;
  private isInitialized = false;
  private isRunning = false;
  private frameId: number = 0;
  
  // Systems
  private worldManager: any;
  private physicsEngine: any;
  private networkManager: any;
  private assetLoader: any;
  private avatarSystem: any;
  private audioSystem: any;
  private inputManager: any;
  private uiSystem: any;
  
  constructor(config: Partial<MetaverseConfig> = {}) {
    super();
    
    // Default configuration
    this.config = {
      webxr: {
        enabled: true,
        requiredFeatures: ['local-floor'],
        optionalFeatures: [
          'bounded-floor',
          'hand-tracking',
          'layers',
          'anchors',
          'plane-detection',
          'mesh-detection',
          'light-estimation',
          'depth-sensing',
          'camera-access',
          'hit-test',
          'dom-overlay'
        ],
        referenceSpace: 'local-floor',
        framebufferScaleFactor: 1.0,
        ...config.webxr
      },
      rendering: {
        engine: 'three',
        antialias: true,
        pixelRatio: window.devicePixelRatio || 1,
        shadowMapEnabled: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        physicallyCorrectLights: true,
        ...config.rendering
      },
      physics: {
        enabled: true,
        engine: 'rapier',
        gravity: { x: 0, y: -9.81, z: 0 },
        timestep: 1/60,
        iterations: 4,
        ...config.physics
      },
      networking: {
        enabled: false,
        mode: 'p2p',
        maxPeers: 32,
        ...config.networking
      },
      world: {
        size: { width: 1000, height: 100, depth: 1000 },
        origin: { x: 0, y: 0, z: 0 },
        fog: {
          enabled: true,
          color: 0xcccccc,
          near: 10,
          far: 100
        },
        ...config.world
      },
      performance: {
        targetFPS: 90,
        adaptiveQuality: true,
        maxDrawCalls: 100,
        maxTriangles: 1000000,
        lodBias: 1.0,
        instancing: true,
        ...config.performance
      }
    };
  }
  
  /**
   * Initialize the metaverse
   */
  async initialize(container?: HTMLElement): Promise<void> {
    if (this.isInitialized) {
      console.warn('Metaverse already initialized');
      return;
    }
    
    try {
      // Initialize renderer
      await this.initializeRenderer(container);
      
      // Initialize scene
      this.initializeScene();
      
      // Initialize camera
      this.initializeCamera();
      
      // Initialize WebXR if enabled
      if (this.config.webxr.enabled) {
        await this.initializeWebXR();
      }
      
      // Initialize systems
      await this.initializeSystems();
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      console.log('🌐 Katalyst Metaverse initialized');
    } catch (error) {
      console.error('Failed to initialize metaverse:', error);
      this.emit('error', error);
      throw error;
    }
  }
  
  /**
   * Initialize Three.js renderer
   */
  private async initializeRenderer(container?: HTMLElement): Promise<void> {
    const canvas = document.createElement('canvas');
    
    if (container) {
      container.appendChild(canvas);
    } else {
      document.body.appendChild(canvas);
    }
    
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.config.rendering.antialias,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    
    this.renderer.setPixelRatio(this.config.rendering.pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = this.config.rendering.shadowMapEnabled;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = this.config.rendering.toneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.physicallyCorrectLights = this.config.rendering.physicallyCorrectLights;
    
    // Enable XR
    this.renderer.xr.enabled = this.config.webxr.enabled;
    
    this.emit('renderer-initialized', this.renderer);
  }
  
  /**
   * Initialize Three.js scene
   */
  private initializeScene(): void {
    this.scene = new THREE.Scene();
    
    // Add fog if configured
    if (this.config.world.fog?.enabled) {
      this.scene.fog = new THREE.Fog(
        this.config.world.fog.color,
        this.config.world.fog.near,
        this.config.world.fog.far
      );
    }
    
    // Add basic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
    
    // Add ground plane
    const groundGeometry = new THREE.PlaneGeometry(
      this.config.world.size.width,
      this.config.world.size.depth
    );
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    
    // Add grid helper
    const gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x222222);
    this.scene.add(gridHelper);
    
    this.emit('scene-initialized', this.scene);
  }
  
  /**
   * Initialize camera
   */
  private initializeCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    
    this.camera.position.set(0, 1.6, 3);
    this.camera.lookAt(0, 0, 0);
    
    this.emit('camera-initialized', this.camera);
  }
  
  /**
   * Initialize WebXR
   */
  private async initializeWebXR(): Promise<void> {
    if (!('xr' in navigator)) {
      console.warn('WebXR not supported');
      return;
    }
    
    // Check for support
    const isVRSupported = await (navigator as any).xr.isSessionSupported('immersive-vr');
    const isARSupported = await (navigator as any).xr.isSessionSupported('immersive-ar');
    
    console.log('VR Support:', isVRSupported);
    console.log('AR Support:', isARSupported);
    
    // Create VR button
    const vrButton = this.createVRButton();
    document.body.appendChild(vrButton);
    
    // Setup XR session listeners
    if (this.renderer) {
      this.renderer.xr.addEventListener('sessionstart', () => {
        this.onXRSessionStart();
      });
      
      this.renderer.xr.addEventListener('sessionend', () => {
        this.onXRSessionEnd();
      });
    }
    
    this.emit('webxr-initialized', { isVRSupported, isARSupported });
  }
  
  /**
   * Create VR button
   */
  private createVRButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = 'Enter VR';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      z-index: 999;
      transition: transform 0.2s;
    `;
    
    button.addEventListener('click', async () => {
      await this.enterXR('immersive-vr');
    });
    
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateX(-50%) scale(1.05)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateX(-50%)';
    });
    
    return button;
  }
  
  /**
   * Enter XR session
   */
  async enterXR(mode: 'immersive-vr' | 'immersive-ar' = 'immersive-vr'): Promise<void> {
    if (!('xr' in navigator) || !this.renderer) {
      console.error('WebXR not available');
      return;
    }
    
    try {
      const sessionInit: XRSessionInit = {
        requiredFeatures: this.config.webxr.requiredFeatures,
        optionalFeatures: this.config.webxr.optionalFeatures
      };
      
      this.xrSession = await (navigator as any).xr.requestSession(mode, sessionInit);
      
      // Set renderer XR session
      await this.renderer.xr.setSession(this.xrSession);
      
      // Get reference space
      this.xrReferenceSpace = await this.xrSession.requestReferenceSpace(
        this.config.webxr.referenceSpace
      );
      
      this.emit('xr-session-started', this.xrSession);
    } catch (error) {
      console.error('Failed to enter XR:', error);
      this.emit('xr-error', error);
    }
  }
  
  /**
   * Exit XR session
   */
  async exitXR(): Promise<void> {
    if (this.xrSession) {
      await this.xrSession.end();
      this.xrSession = null;
      this.xrReferenceSpace = null;
    }
  }
  
  /**
   * Handle XR session start
   */
  private onXRSessionStart(): void {
    console.log('XR session started');
    this.emit('xr-session-active');
  }
  
  /**
   * Handle XR session end
   */
  private onXRSessionEnd(): void {
    console.log('XR session ended');
    this.xrSession = null;
    this.xrReferenceSpace = null;
    this.emit('xr-session-ended');
  }
  
  /**
   * Initialize metaverse systems
   */
  private async initializeSystems(): Promise<void> {
    // Initialize in dependency order
    
    // Asset loader
    // this.assetLoader = new AssetLoader(this.scene);
    // await this.assetLoader.initialize();
    
    // Physics engine
    if (this.config.physics.enabled) {
      // this.physicsEngine = new PhysicsEngine(this.config.physics);
      // await this.physicsEngine.initialize();
    }
    
    // World manager
    // this.worldManager = new WorldManager(this.scene, this.config.world);
    // await this.worldManager.initialize();
    
    // Avatar system
    // this.avatarSystem = new AvatarSystem(this.scene);
    // await this.avatarSystem.initialize();
    
    // Audio system
    // this.audioSystem = new SpatialAudioSystem(this.camera);
    // await this.audioSystem.initialize();
    
    // Networking
    if (this.config.networking.enabled) {
      // this.networkManager = new NetworkManager(this.config.networking);
      // await this.networkManager.initialize();
    }
    
    // Input manager
    // this.inputManager = new InputManager(this.renderer, this.camera);
    // await this.inputManager.initialize();
    
    // UI system
    // this.uiSystem = new UISystem(this.scene, this.camera);
    // await this.uiSystem.initialize();
    
    this.emit('systems-initialized');
  }
  
  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Window resize
    window.addEventListener('resize', () => {
      this.onWindowResize();
    });
    
    // Visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });
  }
  
  /**
   * Handle window resize
   */
  private onWindowResize(): void {
    if (!this.camera || !this.renderer) return;
    
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    this.emit('resize', {
      width: window.innerWidth,
      height: window.innerHeight
    });
  }
  
  /**
   * Start the metaverse
   */
  start(): void {
    if (!this.isInitialized) {
      console.error('Metaverse not initialized');
      return;
    }
    
    if (this.isRunning) {
      console.warn('Metaverse already running');
      return;
    }
    
    this.isRunning = true;
    this.animate();
    
    this.emit('started');
    console.log('🚀 Metaverse started');
  }
  
  /**
   * Stop the metaverse
   */
  stop(): void {
    this.isRunning = false;
    
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
    }
    
    this.emit('stopped');
    console.log('🛑 Metaverse stopped');
  }
  
  /**
   * Pause the metaverse
   */
  pause(): void {
    this.isRunning = false;
    this.emit('paused');
  }
  
  /**
   * Resume the metaverse
   */
  resume(): void {
    if (!this.isInitialized) return;
    
    this.isRunning = true;
    this.animate();
    this.emit('resumed');
  }
  
  /**
   * Animation loop
   */
  private animate(): void {
    if (!this.isRunning) return;
    
    // Use XR animation loop if in XR
    if (this.renderer?.xr.isPresenting) {
      this.renderer.setAnimationLoop(() => {
        this.render();
      });
    } else {
      this.frameId = requestAnimationFrame(() => {
        this.animate();
      });
      this.render();
    }
  }
  
  /**
   * Render frame
   */
  private render(): void {
    if (!this.renderer || !this.scene || !this.camera) return;
    
    // Update systems
    const deltaTime = 1/60; // TODO: Calculate actual delta
    
    // Update physics
    if (this.physicsEngine) {
      this.physicsEngine.step(deltaTime);
    }
    
    // Update avatars
    if (this.avatarSystem) {
      this.avatarSystem.update(deltaTime);
    }
    
    // Update networking
    if (this.networkManager) {
      this.networkManager.update(deltaTime);
    }
    
    // Update UI
    if (this.uiSystem) {
      this.uiSystem.update(deltaTime);
    }
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
    
    this.emit('frame', { deltaTime });
  }
  
  /**
   * Destroy the metaverse
   */
  destroy(): void {
    this.stop();
    
    // Cleanup systems
    if (this.worldManager) this.worldManager.destroy();
    if (this.physicsEngine) this.physicsEngine.destroy();
    if (this.networkManager) this.networkManager.destroy();
    if (this.assetLoader) this.assetLoader.destroy();
    if (this.avatarSystem) this.avatarSystem.destroy();
    if (this.audioSystem) this.audioSystem.destroy();
    if (this.inputManager) this.inputManager.destroy();
    if (this.uiSystem) this.uiSystem.destroy();
    
    // Cleanup Three.js
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
    
    if (this.scene) {
      this.scene.traverse((object) => {
        if ((object as any).geometry) {
          (object as any).geometry.dispose();
        }
        if ((object as any).material) {
          if (Array.isArray((object as any).material)) {
            (object as any).material.forEach((material: any) => material.dispose());
          } else {
            (object as any).material.dispose();
          }
        }
      });
    }
    
    // Remove event listeners
    window.removeEventListener('resize', this.onWindowResize);
    
    this.isInitialized = false;
    this.emit('destroyed');
    
    console.log('💥 Metaverse destroyed');
  }
  
  /**
   * Get current state
   */
  getState(): any {
    return {
      initialized: this.isInitialized,
      running: this.isRunning,
      xrActive: !!this.xrSession,
      config: this.config
    };
  }
}