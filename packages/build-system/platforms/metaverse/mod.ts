// @katalyst/metaverse - Metaverse and 3D experiences
export interface MetaverseConfig {
  renderer: 'three' | 'babylon' | 'aframe';
  physics: 'cannon' | 'ammo' | 'rapier';
  networking: 'webrtc' | 'websocket' | 'webtransport';
  xr: boolean;
}

export class MetaverseEngine {
  private config: MetaverseConfig;
  
  constructor(config: MetaverseConfig) {
    this.config = config;
  }
  
  async initialize(): Promise<void> {
    // Initialize renderer, physics, and networking
    console.log('Initializing metaverse with:', this.config);
  }
  
  async loadWorld(worldUrl: string): Promise<void> {
    // Load 3D world from URL
    console.log('Loading world from:', worldUrl);
  }
  
  async enableXR(): Promise<void> {
    if (!this.config.xr) {
      throw new Error('XR not enabled in configuration');
    }
    // Enable WebXR
    console.log('Enabling WebXR...');
  }
}

// Re-export WebXR functionality
export * from '@katalyst/webxr';