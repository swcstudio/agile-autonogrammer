/**
 * Window Manager - Advanced layout and rendering manager for AI-OSX terminals
 * 
 * Manages complex terminal layouts, GPU-accelerated rendering coordination,
 * window composition, and advanced UI features like tabs, splits, and overlays.
 */

import { TerminalSession, WindowLayout, TerminalMultiplexer } from './TerminalMultiplexer';
import { AIGPUTerminal } from './GPUTerminal';

export interface WindowManagerConfig {
  enableGpuComposition: boolean;
  enableAnimations: boolean;
  enableTransparency: boolean;
  enableBlur: boolean;
  defaultLayout: LayoutType;
  maxWindows: number;
  animationDuration: number;
  transparencyLevel: number;
  blurRadius: number;
  enableVsync: boolean;
  targetFps: number;
}

export type LayoutType = 
  | 'single'
  | 'horizontal'
  | 'vertical'
  | 'grid'
  | 'tabbed'
  | 'floating'
  | 'mosaic';

export interface LayoutNode {
  id: string;
  type: 'container' | 'terminal';
  parent?: LayoutNode;
  children?: LayoutNode[];
  sessionId?: string;
  bounds: Rectangle;
  minSize: { width: number; height: number };
  maxSize?: { width: number; height: number };
  resizable: boolean;
  visible: boolean;
  zIndex: number;
  opacity: number;
  animation?: Animation;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Animation {
  type: 'fade' | 'slide' | 'scale' | 'blur';
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce';
  startValue: number;
  endValue: number;
  startTime: number;
  completed: boolean;
}

export interface Theme {
  name: string;
  colors: {
    background: string;
    foreground: string;
    accent: string;
    border: string;
    shadow: string;
    selection: string;
    cursor: string;
  };
  fonts: {
    family: string;
    size: number;
    weight: number;
    lineHeight: number;
  };
  effects: {
    borderRadius: number;
    shadowBlur: number;
    shadowOffset: { x: number; y: number };
    glowIntensity: number;
  };
}

export interface CompositorState {
  rootNode: LayoutNode;
  activeNode: LayoutNode | null;
  focusedNode: LayoutNode | null;
  dragOperation: DragOperation | null;
  resizeOperation: ResizeOperation | null;
  animations: Animation[];
  theme: Theme;
  renderTargets: Map<string, RenderTarget>;
}

export interface DragOperation {
  node: LayoutNode;
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  dropTarget?: LayoutNode;
  dragImage?: HTMLCanvasElement;
}

export interface ResizeOperation {
  node: LayoutNode;
  handle: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
  startBounds: Rectangle;
  startPosition: { x: number; y: number };
}

export interface RenderTarget {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D | WebGL2RenderingContext;
  framebuffer?: WebGLFramebuffer;
  texture?: WebGLTexture;
  dirty: boolean;
  lastRender: number;
}

export interface WindowManagerMetrics {
  totalWindows: number;
  activeWindows: number;
  renderingPerformance: {
    fps: number;
    frameTime: number;
    gpuUtilization: number;
    compositionTime: number;
    drawCalls: number;
  };
  layoutPerformance: {
    layoutCalculations: number;
    layoutTime: number;
    invalidations: number;
  };
  interactionMetrics: {
    clicks: number;
    drags: number;
    resizes: number;
    keyboardEvents: number;
  };
}

export class WindowManager {
  private config: WindowManagerConfig;
  private multiplexer: TerminalMultiplexer;
  private state: CompositorState;
  private metrics: WindowManagerMetrics;
  private mainCanvas: HTMLCanvasElement;
  private glContext: WebGL2RenderingContext | null;
  private animationFrame?: number;
  private eventHandlers: Map<string, EventListener>;
  private shaderPrograms: Map<string, WebGLProgram>;
  private isInitialized: boolean;

  constructor(config: WindowManagerConfig, multiplexer: TerminalMultiplexer) {
    this.config = config;
    this.multiplexer = multiplexer;
    this.eventHandlers = new Map();
    this.shaderPrograms = new Map();
    this.isInitialized = false;
    
    this.initializeState();
    this.initializeMetrics();
  }

  public async initialize(canvas: HTMLCanvasElement): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.mainCanvas = canvas;
    
    // Initialize WebGL context if GPU composition is enabled
    if (this.config.enableGpuComposition) {
      this.glContext = canvas.getContext('webgl2');
      if (this.glContext) {
        await this.initializeWebGL();
      } else {
        console.warn('WebGL2 not available, falling back to Canvas 2D');
        this.config.enableGpuComposition = false;
      }
    }

    // Set up event handlers
    this.setupEventHandlers();
    
    // Create root layout
    this.createRootLayout();
    
    // Start render loop
    this.startRenderLoop();
    
    this.isInitialized = true;
    console.log('🪟 Window Manager initialized with GPU composition:', this.config.enableGpuComposition);
  }

  private initializeState(): void {
    this.state = {
      rootNode: {
        id: 'root',
        type: 'container',
        children: [],
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        minSize: { width: 320, height: 200 },
        resizable: false,
        visible: true,
        zIndex: 0,
        opacity: 1.0
      },
      activeNode: null,
      focusedNode: null,
      dragOperation: null,
      resizeOperation: null,
      animations: [],
      theme: this.createDefaultTheme(),
      renderTargets: new Map()
    };
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalWindows: 0,
      activeWindows: 0,
      renderingPerformance: {
        fps: 0,
        frameTime: 0,
        gpuUtilization: 0,
        compositionTime: 0,
        drawCalls: 0
      },
      layoutPerformance: {
        layoutCalculations: 0,
        layoutTime: 0,
        invalidations: 0
      },
      interactionMetrics: {
        clicks: 0,
        drags: 0,
        resizes: 0,
        keyboardEvents: 0
      }
    };
  }

  private createDefaultTheme(): Theme {
    return {
      name: 'AI-OSX Dark',
      colors: {
        background: '#1e1e2e',
        foreground: '#cdd6f4',
        accent: '#89b4fa',
        border: '#45475a',
        shadow: '#11111b',
        selection: '#313244',
        cursor: '#f38ba8'
      },
      fonts: {
        family: 'JetBrains Mono, monospace',
        size: 14,
        weight: 400,
        lineHeight: 1.4
      },
      effects: {
        borderRadius: 8,
        shadowBlur: 16,
        shadowOffset: { x: 0, y: 4 },
        glowIntensity: 0.3
      }
    };
  }

  private async initializeWebGL(): Promise<void> {
    if (!this.glContext) return;

    const gl = this.glContext;
    
    // Create shader programs
    const vertexShaderSource = `#version 300 es
      in vec2 a_position;
      in vec2 a_texCoord;
      
      uniform mat3 u_transform;
      uniform vec2 u_resolution;
      
      out vec2 v_texCoord;
      
      void main() {
        vec3 position = u_transform * vec3(a_position, 1.0);
        vec2 clipSpace = (position.xy / u_resolution) * 2.0 - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        v_texCoord = a_texCoord;
      }
    `;

    const fragmentShaderSource = `#version 300 es
      precision highp float;
      
      in vec2 v_texCoord;
      
      uniform sampler2D u_texture;
      uniform float u_opacity;
      uniform float u_blur;
      uniform vec4 u_color;
      
      out vec4 fragColor;
      
      vec4 blur9(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
        vec4 color = vec4(0.0);
        vec2 off1 = vec2(1.3846153846) * direction;
        vec2 off2 = vec2(3.2307692308) * direction;
        color += texture(image, uv) * 0.2270270270;
        color += texture(image, uv + (off1 / resolution)) * 0.3162162162;
        color += texture(image, uv - (off1 / resolution)) * 0.3162162162;
        color += texture(image, uv + (off2 / resolution)) * 0.0702702703;
        color += texture(image, uv - (off2 / resolution)) * 0.0702702703;
        return color;
      }
      
      void main() {
        vec4 texColor = texture(u_texture, v_texCoord);
        
        if (u_blur > 0.0) {
          vec2 resolution = vec2(textureSize(u_texture, 0));
          texColor = blur9(u_texture, v_texCoord, resolution, vec2(u_blur, 0.0));
          texColor = blur9(u_texture, v_texCoord, resolution, vec2(0.0, u_blur));
        }
        
        fragColor = mix(texColor, u_color, 0.0) * u_opacity;
      }
    `;

    const compositorProgram = this.createShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
    if (compositorProgram) {
      this.shaderPrograms.set('compositor', compositorProgram);
    }

    // Set up framebuffers and textures for off-screen rendering
    this.setupRenderTargets();
  }

  private createShaderProgram(
    gl: WebGL2RenderingContext, 
    vertexSource: string, 
    fragmentSource: string
  ): WebGLProgram | null {
    const vertexShader = this.compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    
    if (!vertexShader || !fragmentShader) {
      return null;
    }
    
    const program = gl.createProgram();
    if (!program) return null;
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Shader program linking failed:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    
    return program;
  }

  private compileShader(
    gl: WebGL2RenderingContext, 
    type: number, 
    source: string
  ): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }

  private setupRenderTargets(): void {
    // Create render targets for each terminal session
    const sessions = this.multiplexer.listSessions();
    for (const session of sessions) {
      this.createRenderTarget(session.id);
    }
  }

  private createRenderTarget(sessionId: string): RenderTarget | null {
    if (!this.config.enableGpuComposition || !this.glContext) {
      return null;
    }

    const gl = this.glContext;
    
    // Create texture
    const texture = gl.createTexture();
    if (!texture) return null;
    
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    // Create framebuffer
    const framebuffer = gl.createFramebuffer();
    if (!framebuffer) return null;
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    
    // Create canvas for 2D fallback
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const context = canvas.getContext('2d');
    
    if (!context) return null;
    
    const renderTarget: RenderTarget = {
      canvas,
      context,
      framebuffer,
      texture,
      dirty: true,
      lastRender: 0
    };
    
    this.state.renderTargets.set(sessionId, renderTarget);
    return renderTarget;
  }

  private setupEventHandlers(): void {
    const canvas = this.mainCanvas;
    
    // Mouse events
    const mouseDown = this.handleMouseDown.bind(this);
    const mouseMove = this.handleMouseMove.bind(this);
    const mouseUp = this.handleMouseUp.bind(this);
    const wheel = this.handleWheel.bind(this);
    
    canvas.addEventListener('mousedown', mouseDown);
    canvas.addEventListener('mousemove', mouseMove);
    canvas.addEventListener('mouseup', mouseUp);
    canvas.addEventListener('wheel', wheel);
    
    this.eventHandlers.set('mousedown', mouseDown);
    this.eventHandlers.set('mousemove', mouseMove);
    this.eventHandlers.set('mouseup', mouseUp);
    this.eventHandlers.set('wheel', wheel);
    
    // Keyboard events
    const keyDown = this.handleKeyDown.bind(this);
    const keyUp = this.handleKeyUp.bind(this);
    
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    
    this.eventHandlers.set('keydown', keyDown);
    this.eventHandlers.set('keyup', keyUp);
    
    // Window resize
    const resize = this.handleResize.bind(this);
    window.addEventListener('resize', resize);
    this.eventHandlers.set('resize', resize);
  }

  private createRootLayout(): void {
    this.state.rootNode.bounds = {
      x: 0,
      y: 0,
      width: this.mainCanvas.width,
      height: this.mainCanvas.height
    };
  }

  private startRenderLoop(): void {
    const render = () => {
      if (!this.isInitialized) return;
      
      const startTime = performance.now();
      
      // Update animations
      this.updateAnimations();
      
      // Perform layout if needed
      this.performLayout();
      
      // Render frame
      if (this.config.enableGpuComposition && this.glContext) {
        this.renderWebGL();
      } else {
        this.renderCanvas2D();
      }
      
      const endTime = performance.now();
      this.metrics.renderingPerformance.frameTime = endTime - startTime;
      this.metrics.renderingPerformance.fps = 1000 / (endTime - startTime);
      
      if (this.config.enableVsync) {
        this.animationFrame = requestAnimationFrame(render);
      } else {
        setTimeout(() => {
          this.animationFrame = requestAnimationFrame(render);
        }, 1000 / this.config.targetFps);
      }
    };
    
    render();
  }

  // Layout management
  public createWindow(
    layoutType: LayoutType, 
    sessionId?: string,
    bounds?: Rectangle
  ): string {
    const windowId = `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const windowNode: LayoutNode = {
      id: windowId,
      type: 'container',
      parent: this.state.rootNode,
      children: [],
      bounds: bounds || {
        x: 100,
        y: 100,
        width: 800,
        height: 600
      },
      minSize: { width: 320, height: 200 },
      resizable: true,
      visible: true,
      zIndex: this.metrics.totalWindows + 1,
      opacity: 1.0
    };
    
    // Add session terminal if provided
    if (sessionId) {
      const terminalNode: LayoutNode = {
        id: `terminal-${sessionId}`,
        type: 'terminal',
        parent: windowNode,
        sessionId,
        bounds: { ...windowNode.bounds },
        minSize: { width: 320, height: 200 },
        resizable: false,
        visible: true,
        zIndex: 0,
        opacity: 1.0
      };
      
      windowNode.children = [terminalNode];
    }
    
    this.state.rootNode.children?.push(windowNode);
    this.metrics.totalWindows++;
    this.metrics.activeWindows++;
    
    // Create render target if using GPU composition
    if (sessionId && this.config.enableGpuComposition) {
      this.createRenderTarget(sessionId);
    }
    
    // Set as active and focused
    this.state.activeNode = windowNode;
    this.state.focusedNode = sessionId ? windowNode.children![0] : windowNode;
    
    // Invalidate layout
    this.invalidateLayout();
    
    console.log(`🪟 Created window ${windowId} with layout ${layoutType}`);
    return windowId;
  }

  public splitWindow(
    windowId: string, 
    direction: 'horizontal' | 'vertical',
    ratio: number = 0.5
  ): void {
    const windowNode = this.findNode(windowId);
    if (!windowNode || windowNode.type !== 'container') {
      throw new Error(`Window not found or not a container: ${windowId}`);
    }

    // Convert to split layout
    const originalChildren = windowNode.children || [];
    const containerA: LayoutNode = {
      id: `split-a-${Date.now()}`,
      type: 'container',
      parent: windowNode,
      children: originalChildren,
      bounds: { ...windowNode.bounds },
      minSize: { width: 160, height: 100 },
      resizable: true,
      visible: true,
      zIndex: 0,
      opacity: 1.0
    };
    
    const containerB: LayoutNode = {
      id: `split-b-${Date.now()}`,
      type: 'container',
      parent: windowNode,
      children: [],
      bounds: { ...windowNode.bounds },
      minSize: { width: 160, height: 100 },
      resizable: true,
      visible: true,
      zIndex: 0,
      opacity: 1.0
    };

    // Update parent references
    for (const child of originalChildren) {
      child.parent = containerA;
    }
    
    // Apply split layout
    if (direction === 'horizontal') {
      const splitX = windowNode.bounds.x + windowNode.bounds.width * ratio;
      containerA.bounds.width = splitX - windowNode.bounds.x;
      containerB.bounds.x = splitX;
      containerB.bounds.width = windowNode.bounds.x + windowNode.bounds.width - splitX;
    } else {
      const splitY = windowNode.bounds.y + windowNode.bounds.height * ratio;
      containerA.bounds.height = splitY - windowNode.bounds.y;
      containerB.bounds.y = splitY;
      containerB.bounds.height = windowNode.bounds.y + windowNode.bounds.height - splitY;
    }
    
    windowNode.children = [containerA, containerB];
    
    this.invalidateLayout();
    console.log(`✂️ Split window ${windowId} ${direction}ly`);
  }

  public closeWindow(windowId: string): void {
    const windowNode = this.findNode(windowId);
    if (!windowNode) {
      throw new Error(`Window not found: ${windowId}`);
    }

    // Remove from parent
    if (windowNode.parent && windowNode.parent.children) {
      const index = windowNode.parent.children.indexOf(windowNode);
      if (index !== -1) {
        windowNode.parent.children.splice(index, 1);
      }
    }
    
    // Clean up render targets
    this.cleanupRenderTargets(windowNode);
    
    this.metrics.activeWindows--;
    this.invalidateLayout();
    
    console.log(`❌ Closed window ${windowId}`);
  }

  private findNode(nodeId: string): LayoutNode | null {
    const search = (node: LayoutNode): LayoutNode | null => {
      if (node.id === nodeId) {
        return node;
      }
      
      if (node.children) {
        for (const child of node.children) {
          const result = search(child);
          if (result) return result;
        }
      }
      
      return null;
    };
    
    return search(this.state.rootNode);
  }

  private cleanupRenderTargets(node: LayoutNode): void {
    if (node.sessionId) {
      const renderTarget = this.state.renderTargets.get(node.sessionId);
      if (renderTarget && this.glContext) {
        this.glContext.deleteFramebuffer(renderTarget.framebuffer || null);
        this.glContext.deleteTexture(renderTarget.texture || null);
        this.state.renderTargets.delete(node.sessionId);
      }
    }
    
    if (node.children) {
      for (const child of node.children) {
        this.cleanupRenderTargets(child);
      }
    }
  }

  // Layout calculation
  private performLayout(): void {
    if (!this.state.rootNode.children) return;
    
    const startTime = performance.now();
    this.layoutNode(this.state.rootNode);
    const endTime = performance.now();
    
    this.metrics.layoutPerformance.layoutTime = endTime - startTime;
    this.metrics.layoutPerformance.layoutCalculations++;
  }

  private layoutNode(node: LayoutNode): void {
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        this.layoutNode(child);
      }
    }
  }

  private invalidateLayout(): void {
    this.metrics.layoutPerformance.invalidations++;
  }

  // Animation system
  private updateAnimations(): void {
    const now = performance.now();
    
    for (let i = this.state.animations.length - 1; i >= 0; i--) {
      const animation = this.state.animations[i];
      const elapsed = now - animation.startTime;
      const progress = Math.min(elapsed / animation.duration, 1);
      
      // Apply easing
      const easedProgress = this.applyEasing(progress, animation.easing);
      
      // Update animated value
      const currentValue = animation.startValue + 
        (animation.endValue - animation.startValue) * easedProgress;
      
      // Apply animation based on type
      this.applyAnimation(animation, currentValue);
      
      // Remove completed animations
      if (progress >= 1) {
        animation.completed = true;
        this.state.animations.splice(i, 1);
      }
    }
  }

  private applyEasing(progress: number, easing: Animation['easing']): number {
    switch (easing) {
      case 'ease-in':
        return progress * progress;
      case 'ease-out':
        return 1 - (1 - progress) * (1 - progress);
      case 'ease-in-out':
        return progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      case 'bounce':
        const n1 = 7.5625;
        const d1 = 2.75;
        if (progress < 1 / d1) {
          return n1 * progress * progress;
        } else if (progress < 2 / d1) {
          return n1 * (progress -= 1.5 / d1) * progress + 0.75;
        } else if (progress < 2.5 / d1) {
          return n1 * (progress -= 2.25 / d1) * progress + 0.9375;
        } else {
          return n1 * (progress -= 2.625 / d1) * progress + 0.984375;
        }
      default:
        return progress;
    }
  }

  private applyAnimation(animation: Animation, value: number): void {
    // This would apply the animation value to the appropriate property
    // Implementation would depend on the animation type
  }

  // Rendering
  private renderWebGL(): void {
    if (!this.glContext) return;
    
    const gl = this.glContext;
    
    // Clear the canvas
    gl.clearColor(0.12, 0.12, 0.18, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Render each terminal session to its render target
    this.renderSessions();
    
    // Composite all render targets
    this.compositeScene();
    
    this.metrics.renderingPerformance.drawCalls++;
  }

  private renderCanvas2D(): void {
    const context = this.mainCanvas.getContext('2d');
    if (!context) return;
    
    // Clear canvas
    context.fillStyle = this.state.theme.colors.background;
    context.fillRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    
    // Render layout tree
    this.renderNode(context, this.state.rootNode);
  }

  private renderSessions(): void {
    for (const [sessionId, renderTarget] of this.state.renderTargets) {
      if (!renderTarget.dirty) continue;
      
      const session = this.multiplexer.getSession(sessionId);
      if (!session) continue;
      
      // Render terminal to render target
      // This would integrate with the terminal's rendering system
      renderTarget.dirty = false;
      renderTarget.lastRender = performance.now();
    }
  }

  private compositeScene(): void {
    if (!this.glContext) return;
    
    const gl = this.glContext;
    const program = this.shaderPrograms.get('compositor');
    
    if (!program) return;
    
    gl.useProgram(program);
    
    // Composite all render targets according to layout
    this.compositeNode(this.state.rootNode);
  }

  private compositeNode(node: LayoutNode): void {
    if (!node.visible || node.opacity <= 0) return;
    
    if (node.type === 'terminal' && node.sessionId) {
      const renderTarget = this.state.renderTargets.get(node.sessionId);
      if (renderTarget) {
        this.renderRenderTarget(renderTarget, node);
      }
    }
    
    if (node.children) {
      for (const child of node.children) {
        this.compositeNode(child);
      }
    }
  }

  private renderRenderTarget(renderTarget: RenderTarget, node: LayoutNode): void {
    // Render the render target to the main canvas with transforms
    // This would involve WebGL texture rendering with proper transforms
  }

  private renderNode(context: CanvasRenderingContext2D, node: LayoutNode): void {
    if (!node.visible || node.opacity <= 0) return;
    
    context.save();
    
    // Apply transforms
    context.globalAlpha = node.opacity;
    
    // Draw node content
    if (node.type === 'terminal' && node.sessionId) {
      this.renderTerminalNode(context, node);
    } else if (node.type === 'container') {
      this.renderContainerNode(context, node);
    }
    
    // Render children
    if (node.children) {
      for (const child of node.children) {
        this.renderNode(context, child);
      }
    }
    
    context.restore();
  }

  private renderTerminalNode(context: CanvasRenderingContext2D, node: LayoutNode): void {
    const { x, y, width, height } = node.bounds;
    
    // Draw terminal background
    context.fillStyle = this.state.theme.colors.background;
    context.fillRect(x, y, width, height);
    
    // Draw border if focused
    if (node === this.state.focusedNode) {
      context.strokeStyle = this.state.theme.colors.accent;
      context.lineWidth = 2;
      context.strokeRect(x, y, width, height);
    }
  }

  private renderContainerNode(context: CanvasRenderingContext2D, node: LayoutNode): void {
    const { x, y, width, height } = node.bounds;
    
    // Draw container background
    context.fillStyle = this.state.theme.colors.shadow;
    context.fillRect(x, y, width, height);
  }

  // Event handling
  private handleMouseDown(event: MouseEvent): void {
    this.metrics.interactionMetrics.clicks++;
    
    const rect = this.mainCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Hit test to find clicked node
    const hitNode = this.hitTest(x, y);
    if (hitNode) {
      this.state.focusedNode = hitNode;
      
      // Start drag operation if applicable
      if (event.button === 0 && hitNode.type === 'container') {
        this.startDragOperation(hitNode, x, y);
      }
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    const rect = this.mainCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Update drag operation
    if (this.state.dragOperation) {
      this.updateDragOperation(x, y);
      this.metrics.interactionMetrics.drags++;
    }
    
    // Update resize operation
    if (this.state.resizeOperation) {
      this.updateResizeOperation(x, y);
      this.metrics.interactionMetrics.resizes++;
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    // End drag operation
    if (this.state.dragOperation) {
      this.endDragOperation();
    }
    
    // End resize operation
    if (this.state.resizeOperation) {
      this.endResizeOperation();
    }
  }

  private handleWheel(event: WheelEvent): void {
    // Handle zoom or scroll
    event.preventDefault();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    this.metrics.interactionMetrics.keyboardEvents++;
    
    // Handle keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 't':
          // New terminal
          event.preventDefault();
          this.createWindow('single');
          break;
        case 'w':
          // Close window
          event.preventDefault();
          if (this.state.focusedNode) {
            this.closeWindow(this.state.focusedNode.id);
          }
          break;
      }
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    // Handle key up events
  }

  private handleResize(): void {
    this.mainCanvas.width = window.innerWidth;
    this.mainCanvas.height = window.innerHeight;
    
    this.state.rootNode.bounds.width = window.innerWidth;
    this.state.rootNode.bounds.height = window.innerHeight;
    
    this.invalidateLayout();
  }

  private hitTest(x: number, y: number): LayoutNode | null {
    const test = (node: LayoutNode): LayoutNode | null => {
      if (!node.visible) return null;
      
      const { bounds } = node;
      if (x >= bounds.x && x <= bounds.x + bounds.width &&
          y >= bounds.y && y <= bounds.y + bounds.height) {
        
        // Check children first (reverse order for z-index)
        if (node.children) {
          for (let i = node.children.length - 1; i >= 0; i--) {
            const result = test(node.children[i]);
            if (result) return result;
          }
        }
        
        return node;
      }
      
      return null;
    };
    
    return test(this.state.rootNode);
  }

  private startDragOperation(node: LayoutNode, x: number, y: number): void {
    this.state.dragOperation = {
      node,
      startPosition: { x, y },
      currentPosition: { x, y }
    };
  }

  private updateDragOperation(x: number, y: number): void {
    if (!this.state.dragOperation) return;
    
    this.state.dragOperation.currentPosition = { x, y };
    
    const dx = x - this.state.dragOperation.startPosition.x;
    const dy = y - this.state.dragOperation.startPosition.y;
    
    // Update node position
    this.state.dragOperation.node.bounds.x += dx;
    this.state.dragOperation.node.bounds.y += dy;
    
    this.state.dragOperation.startPosition = { x, y };
  }

  private endDragOperation(): void {
    this.state.dragOperation = null;
  }

  private updateResizeOperation(x: number, y: number): void {
    // Implementation for resize operation
  }

  private endResizeOperation(): void {
    this.state.resizeOperation = null;
  }

  // Public API
  public getMetrics(): WindowManagerMetrics {
    return { ...this.metrics };
  }

  public setTheme(theme: Theme): void {
    this.state.theme = theme;
  }

  public getTheme(): Theme {
    return { ...this.state.theme };
  }

  public updateConfig(newConfig: Partial<WindowManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public async shutdown(): Promise<void> {
    // Stop render loop
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    // Remove event handlers
    for (const [event, handler] of this.eventHandlers) {
      if (event.startsWith('mouse') || event === 'wheel') {
        this.mainCanvas.removeEventListener(event, handler as EventListener);
      } else {
        window.removeEventListener(event, handler as EventListener);
      }
    }
    
    // Clean up WebGL resources
    if (this.glContext) {
      for (const program of this.shaderPrograms.values()) {
        this.glContext.deleteProgram(program);
      }
      
      for (const renderTarget of this.state.renderTargets.values()) {
        if (renderTarget.framebuffer) {
          this.glContext.deleteFramebuffer(renderTarget.framebuffer);
        }
        if (renderTarget.texture) {
          this.glContext.deleteTexture(renderTarget.texture);
        }
      }
    }
    
    console.log('🛑 Window Manager shutdown complete');
  }
}

export default WindowManager;