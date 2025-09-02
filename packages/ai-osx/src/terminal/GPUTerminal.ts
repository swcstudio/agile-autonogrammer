/**
 * GPU-Accelerated Terminal for AI-OSX
 * 
 * High-performance terminal with WebGPU rendering, AI command completion,
 * and intelligent multiplexing capabilities
 */

import { EventEmitter } from 'events';
import type {
  AITerminal,
  TerminalSession,
  GPUTerminalRenderer,
  TerminalAI,
  TerminalMultiplexer,
  TerminalSecurity,
  TerminalPerformance,
  CommandAnalysis,
  CommandSuggestion,
  OutputExplanation
} from '../types';

// Import our existing security framework for terminal security
import { SecurityAIClient } from '@katalyst/security-ai';

export interface TerminalConfig {
  id: string;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  theme: 'dark' | 'light' | 'custom';
  cursorStyle: 'block' | 'line' | 'underline';
  scrollback: number;
  shell: string;
  env?: Record<string, string>;
  gpu: {
    enabled: boolean;
    preferredAdapter?: string;
    powerPreference?: 'low-power' | 'high-performance';
  };
  ai: {
    enabled: boolean;
    completionDelay: number;
    securityScanning: boolean;
    contextAware: boolean;
  };
  multiplexing: {
    enabled: boolean;
    maxSessions: number;
    sessionPersistence: boolean;
  };
}

export interface TerminalFrame {
  cells: TerminalCell[][];
  cursor: { x: number; y: number; visible: boolean };
  selection?: { start: { x: number; y: number }; end: { x: number; y: number } };
  scrollOffset: number;
  timestamp: number;
}

export interface TerminalCell {
  char: string;
  fg: [number, number, number, number]; // RGBA
  bg: [number, number, number, number]; // RGBA
  flags: number; // bold, italic, underline, etc.
}

export interface TerminalEvent {
  type: 'input' | 'output' | 'resize' | 'scroll' | 'selection' | 'ai_suggestion' | 'security_alert';
  data: any;
  timestamp: number;
}

export class AIGPUTerminal extends EventEmitter implements AITerminal {
  public readonly id: string;
  private _config: TerminalConfig;
  private _canvas: HTMLCanvasElement;
  private _session: TerminalSessionImpl;
  private _renderer: GPUTerminalRendererImpl;
  private _ai: TerminalAIImpl;
  private _multiplexer: TerminalMultiplexerImpl;
  private _security: TerminalSecurityImpl;
  private _performance: TerminalPerformanceImpl;

  private _initialized: boolean = false;
  private _currentFrame: TerminalFrame;
  private _inputBuffer: string = '';
  private _commandHistory: string[] = [];
  private _historyIndex: number = -1;

  constructor(canvas: HTMLCanvasElement, config: TerminalConfig) {
    super();
    
    this.id = config.id;
    this._config = config;
    this._canvas = canvas;

    // Initialize components
    this._session = new TerminalSessionImpl(config);
    this._renderer = new GPUTerminalRendererImpl(canvas, config);
    this._ai = new TerminalAIImpl(config);
    this._multiplexer = new TerminalMultiplexerImpl(config);
    this._security = new TerminalSecurityImpl(config);
    this._performance = new TerminalPerformanceImpl(config);

    this._initializeFrame();
    this._setupEventHandlers();
  }

  // Core Properties
  get session(): TerminalSession {
    return this._session;
  }

  get renderer(): GPUTerminalRenderer {
    return this._renderer;
  }

  get ai(): TerminalAI {
    return this._ai;
  }

  get multiplexer(): TerminalMultiplexer {
    return this._multiplexer;
  }

  get security(): TerminalSecurity {
    return this._security;
  }

  get performance(): TerminalPerformance {
    return this._performance;
  }

  get config(): TerminalConfig {
    return { ...this._config };
  }

  get isInitialized(): boolean {
    return this._initialized;
  }

  // Lifecycle Management

  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    try {
      console.log(`🖥️ Initializing AI GPU Terminal ${this.id}...`);

      // Initialize GPU renderer first
      await this._renderer.initialize();
      console.log('✅ GPU renderer initialized');

      // Initialize AI capabilities
      if (this._config.ai.enabled) {
        await this._ai.initialize();
        console.log('✅ AI capabilities initialized');
      }

      // Initialize security
      await this._security.initialize();
      console.log('✅ Terminal security initialized');

      // Initialize performance monitoring
      await this._performance.initialize();
      console.log('✅ Performance monitoring initialized');

      // Initialize session
      await this._session.initialize();
      console.log('✅ Terminal session initialized');

      // Initialize multiplexer if enabled
      if (this._config.multiplexing.enabled) {
        await this._multiplexer.initialize();
        console.log('✅ Terminal multiplexer initialized');
      }

      // Start render loop
      this._startRenderLoop();

      this._initialized = true;
      console.log(`🚀 AI GPU Terminal ${this.id} ready!`);

      // Emit initialization complete event
      this._emitEvent({
        type: 'output',
        data: { message: `Welcome to AI-OSX Terminal ${this.id}` },
        timestamp: Date.now()
      });

    } catch (error) {
      console.error(`❌ Failed to initialize AI GPU Terminal ${this.id}:`, error);
      throw error;
    }
  }

  async dispose(): Promise<void> {
    if (!this._initialized) {
      return;
    }

    try {
      console.log(`🛑 Disposing AI GPU Terminal ${this.id}...`);

      // Stop render loop
      this._stopRenderLoop();

      // Dispose components in reverse order
      await this._session.dispose();
      await this._multiplexer.dispose();
      await this._performance.dispose();
      await this._security.dispose();
      await this._ai.dispose();
      await this._renderer.dispose();

      this._initialized = false;
      console.log(`✅ AI GPU Terminal ${this.id} disposed`);

    } catch (error) {
      console.error(`❌ Error disposing AI GPU Terminal ${this.id}:`, error);
      throw error;
    }
  }

  // Terminal Operations

  async write(data: string): Promise<void> {
    if (!this._initialized) {
      throw new Error('Terminal not initialized');
    }

    // Security scan for output
    if (this._config.ai.securityScanning) {
      const securityResult = await this._security.scanOutput(data);
      if (securityResult.blocked) {
        console.warn('🔒 Output blocked by security filter');
        return;
      }
    }

    // Process output through session
    await this._session.processOutput(data);

    // Update frame and trigger render
    this._updateFrame();
    
    // Record performance metrics
    this._performance.recordWrite(data.length);

    // Emit output event
    this._emitEvent({
      type: 'output',
      data: { content: data },
      timestamp: Date.now()
    });
  }

  async sendInput(input: string): Promise<void> {
    if (!this._initialized) {
      throw new Error('Terminal not initialized');
    }

    try {
      // Record input for performance tracking
      this._performance.recordInput(input.length);

      // AI-powered input analysis
      if (this._config.ai.enabled) {
        const analysis = await this._ai.analyzeCommand(input);
        
        if (analysis.suggestions.length > 0) {
          this._emitEvent({
            type: 'ai_suggestion',
            data: { input, analysis },
            timestamp: Date.now()
          });
        }

        // Security analysis
        if (analysis.securityRisk > 0.7) {
          this._emitEvent({
            type: 'security_alert',
            data: { 
              command: input, 
              risk: analysis.securityRisk,
              threats: analysis.threats 
            },
            timestamp: Date.now()
          });
        }
      }

      // Process input through session
      await this._session.processInput(input);

      // Add to command history
      if (input.trim() && !this._commandHistory.includes(input.trim())) {
        this._commandHistory.push(input.trim());
        if (this._commandHistory.length > 1000) {
          this._commandHistory.shift();
        }
      }

      // Reset history index
      this._historyIndex = -1;

      // Emit input event
      this._emitEvent({
        type: 'input',
        data: { content: input },
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ Error processing terminal input:', error);
      throw error;
    }
  }

  async resize(width: number, height: number): Promise<void> {
    if (!this._initialized) {
      throw new Error('Terminal not initialized');
    }

    // Update configuration
    this._config.width = width;
    this._config.height = height;

    // Resize renderer
    await this._renderer.resize(width, height);

    // Resize session
    await this._session.resize(width, height);

    // Update frame
    this._updateFrame();

    // Emit resize event
    this._emitEvent({
      type: 'resize',
      data: { width, height },
      timestamp: Date.now()
    });

    console.log(`📐 Terminal ${this.id} resized to ${width}x${height}`);
  }

  // AI Features

  async getCommandCompletions(partial: string): Promise<CommandSuggestion[]> {
    if (!this._config.ai.enabled) {
      return [];
    }

    return this._ai.suggestCompletions(partial);
  }

  async explainLastOutput(): Promise<OutputExplanation> {
    if (!this._config.ai.enabled) {
      throw new Error('AI features not enabled');
    }

    const lastOutput = this._session.getLastOutput();
    return this._ai.explainOutput(lastOutput);
  }

  async getPerformanceInsights(): Promise<any> {
    return this._performance.getInsights();
  }

  // History Management

  navigateHistory(direction: 'up' | 'down'): string | null {
    if (this._commandHistory.length === 0) {
      return null;
    }

    if (direction === 'up') {
      if (this._historyIndex < this._commandHistory.length - 1) {
        this._historyIndex++;
      }
    } else {
      if (this._historyIndex > -1) {
        this._historyIndex--;
      }
    }

    return this._historyIndex >= 0 ? 
      this._commandHistory[this._commandHistory.length - 1 - this._historyIndex] : 
      '';
  }

  getCommandHistory(): string[] {
    return [...this._commandHistory];
  }

  // Private Implementation

  private _initializeFrame(): void {
    this._currentFrame = {
      cells: Array(this._config.height).fill(null).map(() =>
        Array(this._config.width).fill(null).map(() => ({
          char: ' ',
          fg: [255, 255, 255, 1],
          bg: [0, 0, 0, 1],
          flags: 0
        }))
      ),
      cursor: { x: 0, y: 0, visible: true },
      scrollOffset: 0,
      timestamp: Date.now()
    };
  }

  private _setupEventHandlers(): void {
    // Handle canvas events
    this._canvas.addEventListener('keydown', this._handleKeyDown.bind(this));
    this._canvas.addEventListener('keypress', this._handleKeyPress.bind(this));
    this._canvas.addEventListener('paste', this._handlePaste.bind(this));
    this._canvas.addEventListener('wheel', this._handleWheel.bind(this));
    
    // Handle mouse events
    this._canvas.addEventListener('mousedown', this._handleMouseDown.bind(this));
    this._canvas.addEventListener('mousemove', this._handleMouseMove.bind(this));
    this._canvas.addEventListener('mouseup', this._handleMouseUp.bind(this));
    
    // Handle focus
    this._canvas.addEventListener('focus', this._handleFocus.bind(this));
    this._canvas.addEventListener('blur', this._handleBlur.bind(this));

    // Make canvas focusable
    this._canvas.tabIndex = 0;
  }

  private async _handleKeyDown(event: KeyboardEvent): Promise<void> {
    event.preventDefault();

    switch (event.key) {
      case 'Enter':
        await this.sendInput(this._inputBuffer + '\n');
        this._inputBuffer = '';
        break;
      
      case 'Backspace':
        if (this._inputBuffer.length > 0) {
          this._inputBuffer = this._inputBuffer.slice(0, -1);
          this._updateFrame();
        }
        break;
      
      case 'ArrowUp':
        const upCommand = this.navigateHistory('up');
        if (upCommand !== null) {
          this._inputBuffer = upCommand;
          this._updateFrame();
        }
        break;
      
      case 'ArrowDown':
        const downCommand = this.navigateHistory('down');
        if (downCommand !== null) {
          this._inputBuffer = downCommand;
          this._updateFrame();
        }
        break;
      
      case 'Tab':
        if (this._config.ai.enabled) {
          const completions = await this.getCommandCompletions(this._inputBuffer);
          if (completions.length > 0) {
            this._inputBuffer = completions[0].completion;
            this._updateFrame();
          }
        }
        break;
      
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
          this._inputBuffer += event.key;
          this._updateFrame();
        }
    }
  }

  private _handleKeyPress(event: KeyboardEvent): void {
    // Additional key press handling if needed
  }

  private async _handlePaste(event: ClipboardEvent): Promise<void> {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') || '';
    
    // Security scan pasted content
    if (this._config.ai.securityScanning) {
      const securityResult = await this._security.scanInput(text);
      if (securityResult.blocked) {
        console.warn('🔒 Pasted content blocked by security filter');
        return;
      }
    }

    this._inputBuffer += text;
    this._updateFrame();
  }

  private _handleWheel(event: WheelEvent): void {
    event.preventDefault();
    // Handle scrolling
    const scrollDelta = Math.sign(event.deltaY) * 3;
    this._currentFrame.scrollOffset = Math.max(0, this._currentFrame.scrollOffset + scrollDelta);
    this._updateFrame();
  }

  private _handleMouseDown(event: MouseEvent): void {
    // Handle mouse selection start
  }

  private _handleMouseMove(event: MouseEvent): void {
    // Handle mouse selection update
  }

  private _handleMouseUp(event: MouseEvent): void {
    // Handle mouse selection end
  }

  private _handleFocus(event: FocusEvent): void {
    this._currentFrame.cursor.visible = true;
    this._updateFrame();
  }

  private _handleBlur(event: FocusEvent): void {
    this._currentFrame.cursor.visible = false;
    this._updateFrame();
  }

  private _updateFrame(): void {
    // Update frame with current state
    this._currentFrame.timestamp = Date.now();
    
    // Update cursor position based on input buffer
    // This is a simplified implementation
    this._currentFrame.cursor.x = this._inputBuffer.length % this._config.width;
    this._currentFrame.cursor.y = Math.floor(this._inputBuffer.length / this._config.width);
    
    // Trigger render if needed
    this._needsRender = true;
  }

  private _renderLoop?: number;
  private _needsRender: boolean = true;

  private _startRenderLoop(): void {
    const render = () => {
      if (this._needsRender) {
        this._renderer.render(this._currentFrame);
        this._needsRender = false;
        this._performance.recordFrame();
      }
      
      this._renderLoop = requestAnimationFrame(render);
    };
    
    render();
  }

  private _stopRenderLoop(): void {
    if (this._renderLoop) {
      cancelAnimationFrame(this._renderLoop);
      this._renderLoop = undefined;
    }
  }

  private _emitEvent(event: TerminalEvent): void {
    this.emit('terminal_event', event);
  }
}

// Implementation Classes

class TerminalSessionImpl implements TerminalSession {
  private _config: TerminalConfig;
  private _initialized: boolean = false;
  private _outputBuffer: string = '';

  constructor(config: TerminalConfig) {
    this._config = config;
  }

  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    // Initialize terminal session
    console.log('🔧 Initializing terminal session...');
    this._initialized = true;
  }

  async dispose(): Promise<void> {
    if (this._initialized) {
      console.log('🔧 Disposing terminal session...');
      this._initialized = false;
    }
  }

  async processInput(input: string): Promise<void> {
    // Process input through shell/command processor
    console.log('📝 Processing input:', input.trim());
    
    // Simulate command execution
    setTimeout(() => {
      this.processOutput(`Command output for: ${input.trim()}\n`);
    }, 100);
  }

  async processOutput(output: string): Promise<void> {
    // Process output from shell/command
    this._outputBuffer += output;
    console.log('📤 Processing output:', output);
  }

  async resize(width: number, height: number): Promise<void> {
    // Handle session resize
    console.log(`📐 Session resize: ${width}x${height}`);
  }

  getLastOutput(): string {
    return this._outputBuffer.split('\n').pop() || '';
  }
}

class GPUTerminalRendererImpl implements GPUTerminalRenderer {
  private _canvas: HTMLCanvasElement;
  private _config: TerminalConfig;
  private _device?: GPUDevice;
  private _context?: GPUCanvasContext;
  private _pipeline?: GPURenderPipeline;
  private _initialized: boolean = false;

  constructor(canvas: HTMLCanvasElement, config: TerminalConfig) {
    this._canvas = canvas;
    this._config = config;
  }

  get device(): GPUDevice {
    if (!this._device) {
      throw new Error('GPU device not initialized');
    }
    return this._device;
  }

  get pipeline(): GPURenderPipeline {
    if (!this._pipeline) {
      throw new Error('GPU pipeline not initialized');
    }
    return this._pipeline;
  }

  get buffers(): any {
    return {}; // TODO: Implement GPU buffers
  }

  get textures(): any {
    return {}; // TODO: Implement GPU textures
  }

  async initialize(): Promise<void> {
    if (this._initialized || !this._config.gpu.enabled) {
      return;
    }

    try {
      // Initialize WebGPU
      if (!navigator.gpu) {
        throw new Error('WebGPU not supported');
      }

      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: this._config.gpu.powerPreference
      });

      if (!adapter) {
        throw new Error('Failed to get GPU adapter');
      }

      this._device = await adapter.requestDevice();
      
      this._context = this._canvas.getContext('webgpu');
      if (!this._context) {
        throw new Error('Failed to get WebGPU context');
      }

      // Configure context
      this._context.configure({
        device: this._device,
        format: 'bgra8unorm',
        alphaMode: 'premultiplied'
      });

      // Create render pipeline
      await this._createRenderPipeline();

      this._initialized = true;
      console.log('✅ WebGPU terminal renderer initialized');

    } catch (error) {
      console.warn('⚠️ WebGPU initialization failed, falling back to Canvas 2D:', error);
      await this._initializeCanvas2D();
    }
  }

  async render(frame: TerminalFrame): Promise<void> {
    if (!this._initialized) {
      return;
    }

    if (this._device && this._context && this._pipeline) {
      await this._renderWebGPU(frame);
    } else {
      await this._renderCanvas2D(frame);
    }
  }

  async resize(width: number, height: number): Promise<void> {
    this._canvas.width = width;
    this._canvas.height = height;
    
    if (this._context) {
      // Reconfigure WebGPU context if needed
    }
  }

  async dispose(): Promise<void> {
    if (this._initialized) {
      this._device?.destroy();
      this._initialized = false;
    }
  }

  private async _createRenderPipeline(): Promise<void> {
    if (!this._device) {
      return;
    }

    // Create WebGPU render pipeline for terminal rendering
    const shaderModule = this._device.createShaderModule({
      code: `
        @vertex
        fn vs_main(@location(0) position: vec2<f32>) -> @builtin(position) vec4<f32> {
          return vec4<f32>(position, 0.0, 1.0);
        }

        @fragment
        fn fs_main() -> @location(0) vec4<f32> {
          return vec4<f32>(1.0, 1.0, 1.0, 1.0);
        }
      `
    });

    this._pipeline = this._device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: []
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{
          format: 'bgra8unorm'
        }]
      }
    });
  }

  private async _renderWebGPU(frame: TerminalFrame): Promise<void> {
    if (!this._device || !this._context || !this._pipeline) {
      return;
    }

    const commandEncoder = this._device.createCommandEncoder();
    const textureView = this._context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store'
      }]
    });

    renderPass.setPipeline(this._pipeline);
    renderPass.draw(3); // Simple triangle for now
    renderPass.end();

    this._device.queue.submit([commandEncoder.finish()]);
  }

  private async _initializeCanvas2D(): Promise<void> {
    // Fallback to Canvas 2D rendering
    console.log('🔧 Initializing Canvas 2D fallback...');
    this._initialized = true;
  }

  private async _renderCanvas2D(frame: TerminalFrame): Promise<void> {
    const ctx = this._canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);

    // Render terminal content
    ctx.font = `${this._config.fontSize}px ${this._config.fontFamily}`;
    ctx.fillStyle = '#ffffff';
    
    // Simple text rendering
    ctx.fillText('AI-OSX Terminal (Canvas 2D)', 10, 30);
    ctx.fillText('WebGPU not available, using fallback renderer', 10, 60);
  }
}

class TerminalAIImpl implements TerminalAI {
  private _config: TerminalConfig;
  private _securityClient: SecurityAIClient;
  private _initialized: boolean = false;

  constructor(config: TerminalConfig) {
    this._config = config;
    this._securityClient = new SecurityAIClient({
      baseUrl: '/api/security',
      enableCache: true
    });
  }

  get commandCompletion(): any {
    return {}; // TODO: Implement command completion engine
  }

  get syntaxHighlighting(): any {
    return {}; // TODO: Implement AI syntax highlighter
  }

  get errorAnalysis(): any {
    return {}; // TODO: Implement error analysis engine
  }

  get performanceSuggestions(): any {
    return {}; // TODO: Implement performance suggestion engine
  }

  get securityScanning(): any {
    return {}; // TODO: Implement terminal security scanner
  }

  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    console.log('🧠 Initializing terminal AI...');
    this._initialized = true;
  }

  async dispose(): Promise<void> {
    if (this._initialized) {
      console.log('🧠 Disposing terminal AI...');
      this._initialized = false;
    }
  }

  async analyzeCommand(command: string): Promise<CommandAnalysis> {
    // Analyze command using AI
    return {
      command,
      type: 'shell',
      risk: 0.1,
      suggestions: [],
      securityRisk: 0.1,
      threats: [],
      performance: {
        estimatedTime: 100,
        resources: 'low'
      }
    };
  }

  async suggestCompletions(partial: string): Promise<CommandSuggestion[]> {
    // AI-powered command completion
    const common = ['ls', 'cd', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'grep', 'find'];
    return common
      .filter(cmd => cmd.startsWith(partial))
      .map(cmd => ({
        completion: cmd,
        type: 'command',
        confidence: 0.9,
        description: `Execute ${cmd} command`
      }));
  }

  async explainOutput(output: string): Promise<OutputExplanation> {
    // AI explanation of command output
    return {
      output,
      explanation: 'This is the output from your command.',
      suggestions: [],
      nextSteps: []
    };
  }
}

class TerminalMultiplexerImpl implements TerminalMultiplexer {
  private _config: TerminalConfig;
  private _sessions: TerminalSession[] = [];
  private _initialized: boolean = false;

  constructor(config: TerminalConfig) {
    this._config = config;
  }

  get sessions(): TerminalSession[] {
    return [...this._sessions];
  }

  get layout(): any {
    return {}; // TODO: Implement terminal layout
  }

  get switching(): any {
    return {}; // TODO: Implement session switching
  }

  get sharing(): any {
    return {}; // TODO: Implement session sharing
  }

  get persistence(): any {
    return {}; // TODO: Implement session persistence
  }

  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    console.log('🔀 Initializing terminal multiplexer...');
    this._initialized = true;
  }

  async dispose(): Promise<void> {
    if (this._initialized) {
      console.log('🔀 Disposing terminal multiplexer...');
      this._initialized = false;
    }
  }

  async createSession(config: any): Promise<TerminalSession> {
    const session = new TerminalSessionImpl(this._config);
    await session.initialize();
    this._sessions.push(session);
    return session;
  }

  async attachSession(sessionId: string): Promise<void> {
    // Attach to existing session
  }

  async detachSession(): Promise<void> {
    // Detach from current session
  }

  async splitPane(direction: 'horizontal' | 'vertical'): Promise<TerminalSession> {
    // Create split pane session
    return this.createSession({});
  }
}

class TerminalSecurityImpl implements TerminalSecurity {
  private _config: TerminalConfig;
  private _securityClient: SecurityAIClient;
  private _initialized: boolean = false;

  constructor(config: TerminalConfig) {
    this._config = config;
    this._securityClient = new SecurityAIClient({
      baseUrl: '/api/security',
      enableCache: true
    });
  }

  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    console.log('🔒 Initializing terminal security...');
    this._initialized = true;
  }

  async dispose(): Promise<void> {
    if (this._initialized) {
      console.log('🔒 Disposing terminal security...');
      this._initialized = false;
    }
  }

  async scanInput(input: string): Promise<{ blocked: boolean; reason?: string }> {
    if (!this._config.ai.securityScanning) {
      return { blocked: false };
    }

    // Use our existing security AI to scan input
    try {
      const threatResult = await this._securityClient.detectThreats({
        source: 'terminal_input',
        data: { command: input },
        context: { timestamp: Date.now() }
      });

      const blocked = threatResult.threatLevel === 'Critical' || threatResult.threatLevel === 'High';
      return {
        blocked,
        reason: blocked ? `Threat detected: ${threatResult.threatLevel}` : undefined
      };

    } catch (error) {
      console.warn('Security scan failed:', error);
      return { blocked: false };
    }
  }

  async scanOutput(output: string): Promise<{ blocked: boolean; reason?: string }> {
    if (!this._config.ai.securityScanning) {
      return { blocked: false };
    }

    // Scan output for sensitive information
    const sensitivePatterns = [
      /(?:password|pwd|pass)\s*[:=]\s*\S+/i,
      /(?:api[_-]?key|token)\s*[:=]\s*\S+/i,
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/
    ];

    const blocked = sensitivePatterns.some(pattern => pattern.test(output));
    return {
      blocked,
      reason: blocked ? 'Sensitive information detected in output' : undefined
    };
  }
}

class TerminalPerformanceImpl implements TerminalPerformance {
  private _config: TerminalConfig;
  private _metrics: {
    frameCount: number;
    inputCount: number;
    outputCount: number;
    averageFrameTime: number;
    lastFrameTime: number;
  };
  private _initialized: boolean = false;

  constructor(config: TerminalConfig) {
    this._config = config;
    this._metrics = {
      frameCount: 0,
      inputCount: 0,
      outputCount: 0,
      averageFrameTime: 0,
      lastFrameTime: 0
    };
  }

  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    console.log('📊 Initializing terminal performance monitoring...');
    this._initialized = true;
  }

  async dispose(): Promise<void> {
    if (this._initialized) {
      console.log('📊 Disposing terminal performance monitoring...');
      this._initialized = false;
    }
  }

  recordFrame(): void {
    const now = performance.now();
    if (this._metrics.lastFrameTime > 0) {
      const frameTime = now - this._metrics.lastFrameTime;
      this._metrics.averageFrameTime = 
        (this._metrics.averageFrameTime * this._metrics.frameCount + frameTime) / 
        (this._metrics.frameCount + 1);
    }
    this._metrics.frameCount++;
    this._metrics.lastFrameTime = now;
  }

  recordInput(length: number): void {
    this._metrics.inputCount += length;
  }

  recordWrite(length: number): void {
    this._metrics.outputCount += length;
  }

  async getInsights(): Promise<any> {
    const fps = this._metrics.averageFrameTime > 0 ? 1000 / this._metrics.averageFrameTime : 0;
    
    return {
      fps: Math.round(fps),
      frameCount: this._metrics.frameCount,
      inputCharacters: this._metrics.inputCount,
      outputCharacters: this._metrics.outputCount,
      averageFrameTime: Math.round(this._metrics.averageFrameTime * 100) / 100,
      performance: fps > 30 ? 'excellent' : fps > 15 ? 'good' : 'poor'
    };
  }
}

export default AIGPUTerminal;