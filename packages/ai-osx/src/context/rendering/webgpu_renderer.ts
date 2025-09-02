/**
 * WebGPU-Accelerated Rendering Pipeline for AI-OSX
 * 
 * High-performance GPU-accelerated rendering system for the Brain-Braun-Beyond architecture.
 * Handles real-time visualization of cognitive processing states, data flows, and AI interactions.
 */

export interface WebGPURendererConfig {
  canvasId: string;
  width: number;
  height: number;
  devicePixelRatio?: number;
  debugMode?: boolean;
  shaderOptimization?: 'development' | 'production';
  computeShaderSupport?: boolean;
  multiSampleCount?: number;
  preferredFormat?: GPUTextureFormat;
}

export interface RenderFrame {
  timestamp: number;
  cognitiveState: CognitiveState;
  brainActivity: BrainActivityData;
  braunExecutions: BraunExecutionData[];
  beyondTranscendence: BeyondState;
  contextFields: ContextField[];
  performanceMetrics: PerformanceMetrics;
}

export interface CognitiveState {
  reasoningDepth: number;
  patternRecognition: Float32Array;
  semanticEmbeddings: Float32Array;
  attentionWeights: Float32Array;
  memoryActivation: Float32Array;
}

export interface BrainActivityData {
  neuralNetworkState: Float32Array;
  synapticConnections: ConnectionMatrix;
  activationPatterns: ActivationPattern[];
  cognitiveLoad: number;
  processingSpeed: number;
}

export interface BraunExecutionData {
  computationId: string;
  executionState: 'idle' | 'computing' | 'complete' | 'error';
  resourceUtilization: ResourceMetrics;
  dataFlow: DataFlowVisualization;
  performanceProfile: ComputePerformance;
}

export interface BeyondState {
  transcendenceLevel: number;
  emergentPatterns: EmergentPattern[];
  fieldResonance: FieldResonanceData;
  quantumCoherence: number;
  multidimensionalState: Float32Array;
}

export interface ContextField {
  id: string;
  intensity: number;
  gradient: Float32Array;
  resonanceFrequency: number;
  spatialExtent: BoundingBox;
  temporalDuration: number;
}

export class WebGPURenderer {
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;
  private renderPipeline!: GPURenderPipeline;
  private computePipeline!: GPUComputePipeline;
  
  private buffers: Map<string, GPUBuffer> = new Map();
  private textures: Map<string, GPUTexture> = new Map();
  private bindGroups: Map<string, GPUBindGroup> = new Map();
  
  private frameBuffer: RenderFrame[] = [];
  private currentFrame: number = 0;
  private isRendering: boolean = false;
  private animationFrameId: number | null = null;

  constructor(private config: WebGPURendererConfig) {
    this.validateConfig(config);
  }

  public async initialize(): Promise<void> {
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported in this browser');
    }

    try {
      // Request GPU adapter with high performance preference
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance',
        forceFallbackAdapter: false
      });

      if (!adapter) {
        throw new Error('Failed to get WebGPU adapter');
      }

      // Request device with required features
      const requiredFeatures: GPUFeatureName[] = ['timestamp-query'];
      if (this.config.computeShaderSupport) {
        requiredFeatures.push('indirect-first-instance');
      }

      this.device = await adapter.requestDevice({
        requiredFeatures: requiredFeatures.filter(feature => 
          adapter.features.has(feature)
        ),
        requiredLimits: {
          maxTextureDimension2D: 8192,
          maxBufferSize: 256 * 1024 * 1024, // 256MB
          maxStorageBufferBindingSize: 128 * 1024 * 1024, // 128MB
          maxComputeWorkgroupsPerDimension: 65535
        }
      });

      // Setup canvas context
      const canvas = document.getElementById(this.config.canvasId) as HTMLCanvasElement;
      if (!canvas) {
        throw new Error(`Canvas with id '${this.config.canvasId}' not found`);
      }

      canvas.width = this.config.width * (this.config.devicePixelRatio || 1);
      canvas.height = this.config.height * (this.config.devicePixelRatio || 1);
      canvas.style.width = `${this.config.width}px`;
      canvas.style.height = `${this.config.height}px`;

      this.context = canvas.getContext('webgpu')!;
      this.format = this.config.preferredFormat || navigator.gpu.getPreferredCanvasFormat();
      
      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST
      });

      // Initialize rendering pipeline
      await this.createRenderPipeline();
      
      // Initialize compute pipeline for AI processing visualization
      if (this.config.computeShaderSupport) {
        await this.createComputePipeline();
      }

      // Create buffers and textures
      await this.createBuffers();
      await this.createTextures();

      console.log('WebGPU Renderer initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize WebGPU renderer:', error);
      throw error;
    }
  }

  private async createRenderPipeline(): Promise<void> {
    const vertexShader = this.device.createShaderModule({
      label: 'Brain-Braun-Beyond Vertex Shader',
      code: this.getVertexShaderSource()
    });

    const fragmentShader = this.device.createShaderModule({
      label: 'Brain-Braun-Beyond Fragment Shader', 
      code: this.getFragmentShaderSource()
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Render Bind Group Layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'read-only-storage' }
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: 'float', viewDimension: '2d' }
        },
        {
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {}
        }
      ]
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Render Pipeline Layout',
      bindGroupLayouts: [bindGroupLayout]
    });

    this.renderPipeline = this.device.createRenderPipeline({
      label: 'Brain-Braun-Beyond Render Pipeline',
      layout: pipelineLayout,
      vertex: {
        module: vertexShader,
        entryPoint: 'main',
        buffers: [
          {
            arrayStride: 3 * 4, // 3 floats * 4 bytes
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: 'float32x3'
              }
            ]
          }
        ]
      },
      fragment: {
        module: fragmentShader,
        entryPoint: 'main',
        targets: [
          {
            format: this.format,
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha'
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha'
              }
            }
          }
        ]
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'back',
        frontFace: 'ccw'
      },
      multisample: {
        count: this.config.multiSampleCount || 4
      }
    });
  }

  private async createComputePipeline(): Promise<void> {
    const computeShader = this.device.createShaderModule({
      label: 'Cognitive Processing Compute Shader',
      code: this.getComputeShaderSource()
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Compute Bind Group Layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' }
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'uniform' }
        }
      ]
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Compute Pipeline Layout',
      bindGroupLayouts: [bindGroupLayout]
    });

    this.computePipeline = this.device.createComputePipeline({
      label: 'Cognitive Processing Pipeline',
      layout: pipelineLayout,
      compute: {
        module: computeShader,
        entryPoint: 'main'
      }
    });
  }

  private async createBuffers(): Promise<void> {
    // Uniform buffer for view/projection matrices and time
    const uniformBuffer = this.device.createBuffer({
      label: 'Uniform Buffer',
      size: 16 * 4 + 16 * 4 + 4 * 4, // view matrix + projection matrix + time/params
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    this.buffers.set('uniform', uniformBuffer);

    // Storage buffer for cognitive state data
    const cognitiveStateBuffer = this.device.createBuffer({
      label: 'Cognitive State Buffer',
      size: 4 * 1024 * 1024, // 4MB for cognitive data
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    this.buffers.set('cognitiveState', cognitiveStateBuffer);

    // Storage buffer for brain activity
    const brainActivityBuffer = this.device.createBuffer({
      label: 'Brain Activity Buffer',
      size: 2 * 1024 * 1024, // 2MB for brain data
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    this.buffers.set('brainActivity', brainActivityBuffer);

    // Storage buffer for braun execution data
    const braunExecutionBuffer = this.device.createBuffer({
      label: 'Braun Execution Buffer',
      size: 1024 * 1024, // 1MB for execution data
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    this.buffers.set('braunExecution', braunExecutionBuffer);

    // Vertex buffer for geometry
    const vertices = new Float32Array([
      // Full screen quad
      -1.0, -1.0, 0.0,
       1.0, -1.0, 0.0,
       1.0,  1.0, 0.0,
      -1.0, -1.0, 0.0,
       1.0,  1.0, 0.0,
      -1.0,  1.0, 0.0
    ]);

    const vertexBuffer = this.device.createBuffer({
      label: 'Vertex Buffer',
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    this.device.queue.writeBuffer(vertexBuffer, 0, vertices);
    this.buffers.set('vertices', vertexBuffer);
  }

  private async createTextures(): Promise<void> {
    // Context field visualization texture
    const contextTexture = this.device.createTexture({
      label: 'Context Field Texture',
      size: { width: 512, height: 512 },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    });
    this.textures.set('contextField', contextTexture);

    // Neural network visualization texture
    const neuralTexture = this.device.createTexture({
      label: 'Neural Network Texture',
      size: { width: 256, height: 256 },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING
    });
    this.textures.set('neuralNetwork', neuralTexture);

    // Sampler for textures
    const sampler = this.device.createSampler({
      label: 'Linear Sampler',
      magFilter: 'linear',
      minFilter: 'linear',
      mipmapFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge'
    });
    this.buffers.set('sampler', sampler as any); // Store in buffers map for convenience
  }

  public renderFrame(frame: RenderFrame): void {
    if (!this.device || this.isRendering) return;

    this.isRendering = true;

    try {
      // Update buffers with frame data
      this.updateBuffers(frame);

      // Create command encoder
      const commandEncoder = this.device.createCommandEncoder({
        label: 'Render Command Encoder'
      });

      // Compute pass for AI processing visualization
      if (this.computePipeline) {
        this.executeComputePass(commandEncoder, frame);
      }

      // Render pass for final visualization
      this.executeRenderPass(commandEncoder, frame);

      // Submit commands
      this.device.queue.submit([commandEncoder.finish()]);

    } catch (error) {
      console.error('Error rendering frame:', error);
    } finally {
      this.isRendering = false;
    }
  }

  private updateBuffers(frame: RenderFrame): void {
    // Update uniform buffer with time and view parameters
    const uniformData = new Float32Array(20);
    
    // View matrix (identity for now)
    uniformData.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], 0);
    
    // Time and parameters
    uniformData[16] = frame.timestamp;
    uniformData[17] = frame.cognitiveState.reasoningDepth;
    uniformData[18] = frame.beyondState.transcendenceLevel;
    uniformData[19] = frame.beyondState.quantumCoherence;

    this.device.queue.writeBuffer(
      this.buffers.get('uniform')!,
      0,
      uniformData
    );

    // Update cognitive state buffer
    const cognitiveData = new Float32Array(
      frame.cognitiveState.patternRecognition.length +
      frame.cognitiveState.semanticEmbeddings.length +
      frame.cognitiveState.attentionWeights.length +
      frame.cognitiveState.memoryActivation.length + 4
    );

    let offset = 0;
    cognitiveData[offset++] = frame.cognitiveState.reasoningDepth;
    cognitiveData[offset++] = frame.cognitiveState.patternRecognition.length;
    cognitiveData[offset++] = frame.cognitiveState.semanticEmbeddings.length;
    cognitiveData[offset++] = frame.cognitiveState.attentionWeights.length;

    cognitiveData.set(frame.cognitiveState.patternRecognition, offset);
    offset += frame.cognitiveState.patternRecognition.length;
    
    cognitiveData.set(frame.cognitiveState.semanticEmbeddings, offset);
    offset += frame.cognitiveState.semanticEmbeddings.length;
    
    cognitiveData.set(frame.cognitiveState.attentionWeights, offset);
    offset += frame.cognitiveState.attentionWeights.length;
    
    cognitiveData.set(frame.cognitiveState.memoryActivation, offset);

    this.device.queue.writeBuffer(
      this.buffers.get('cognitiveState')!,
      0,
      cognitiveData
    );
  }

  private executeComputePass(commandEncoder: GPUCommandEncoder, frame: RenderFrame): void {
    if (!this.computePipeline) return;

    const computePass = commandEncoder.beginComputePass({
      label: 'Cognitive Processing Compute Pass'
    });

    // Create bind group for compute shader
    const computeBindGroup = this.device.createBindGroup({
      label: 'Compute Bind Group',
      layout: this.computePipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.buffers.get('cognitiveState')! }
        },
        {
          binding: 1,
          resource: { buffer: this.buffers.get('brainActivity')! }
        },
        {
          binding: 2,
          resource: { buffer: this.buffers.get('uniform')! }
        }
      ]
    });

    computePass.setPipeline(this.computePipeline);
    computePass.setBindGroup(0, computeBindGroup);
    
    // Dispatch compute workgroups
    const workgroupSize = Math.ceil(Math.sqrt(frame.cognitiveState.patternRecognition.length));
    computePass.dispatchWorkgroups(workgroupSize, workgroupSize);
    
    computePass.end();
  }

  private executeRenderPass(commandEncoder: GPUCommandEncoder, frame: RenderFrame): void {
    const renderPass = commandEncoder.beginRenderPass({
      label: 'Brain-Braun-Beyond Render Pass',
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0.05, g: 0.05, b: 0.1, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store'
        }
      ]
    });

    // Create bind group for rendering
    const renderBindGroup = this.device.createBindGroup({
      label: 'Render Bind Group',
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.buffers.get('uniform')! }
        },
        {
          binding: 1,
          resource: { buffer: this.buffers.get('cognitiveState')! }
        },
        {
          binding: 2,
          resource: this.textures.get('contextField')!.createView()
        },
        {
          binding: 3,
          resource: this.buffers.get('sampler')! as GPUSampler
        }
      ]
    });

    renderPass.setPipeline(this.renderPipeline);
    renderPass.setBindGroup(0, renderBindGroup);
    renderPass.setVertexBuffer(0, this.buffers.get('vertices')!);
    renderPass.draw(6); // Draw full screen quad
    renderPass.end();
  }

  private getVertexShaderSource(): string {
    return `
      @vertex
      fn main(@location(0) position: vec3<f32>) -> @builtin(position) vec4<f32> {
        return vec4<f32>(position, 1.0);
      }
    `;
  }

  private getFragmentShaderSource(): string {
    return `
      struct Uniforms {
        view_matrix: mat4x4<f32>,
        time: f32,
        reasoning_depth: f32,
        transcendence_level: f32,
        quantum_coherence: f32,
      }

      @group(0) @binding(0) var<uniform> uniforms: Uniforms;
      @group(0) @binding(1) var<storage, read> cognitive_state: array<f32>;
      @group(0) @binding(2) var context_texture: texture_2d<f32>;
      @group(0) @binding(3) var texture_sampler: sampler;

      @fragment
      fn main(@builtin(position) coord: vec4<f32>) -> @location(0) vec4<f32> {
        let uv = coord.xy / vec2<f32>(${this.config.width}.0, ${this.config.height}.0);
        
        // Sample context field texture
        let context_field = textureSample(context_texture, texture_sampler, uv);
        
        // Generate cognitive visualization based on reasoning depth
        let cognitive_intensity = sin(uniforms.time * 0.001 + uv.x * 10.0) * 
                                 cos(uniforms.time * 0.0015 + uv.y * 8.0) * 
                                 uniforms.reasoning_depth * 0.1;
        
        // Brain activity visualization (neural network-like patterns)
        let brain_pattern = length(uv - 0.5) * 2.0;
        let brain_activity = smoothstep(0.3, 0.7, 
          sin(brain_pattern * 20.0 + uniforms.time * 0.002) * 0.5 + 0.5
        );
        
        // Beyond state visualization (transcendent effects)
        let beyond_field = pow(uniforms.transcendence_level, 2.0) * 
                          sin(length(uv - 0.5) * 50.0 - uniforms.time * 0.01);
        
        // Quantum coherence effects
        let quantum_shimmer = uniforms.quantum_coherence * 
                             sin(uv.x * 100.0 + uniforms.time * 0.005) *
                             cos(uv.y * 80.0 + uniforms.time * 0.003);
        
        // Combine all visualization layers
        var final_color = vec3<f32>(0.0);
        
        // Brain layer (blue-green)
        final_color += brain_activity * vec3<f32>(0.2, 0.6, 0.8) * 0.7;
        
        // Braun layer (orange-red computational visualization)
        final_color += cognitive_intensity * vec3<f32>(1.0, 0.5, 0.2) * 0.5;
        
        // Beyond layer (purple-magenta transcendence)
        final_color += beyond_field * vec3<f32>(0.8, 0.3, 0.9) * 0.3;
        
        // Quantum effects (white shimmer)
        final_color += quantum_shimmer * vec3<f32>(1.0, 1.0, 1.0) * 0.2;
        
        // Context field overlay
        final_color = mix(final_color, context_field.rgb, context_field.a * 0.3);
        
        // Apply gamma correction
        final_color = pow(final_color, vec3<f32>(1.0 / 2.2));
        
        return vec4<f32>(final_color, 1.0);
      }
    `;
  }

  private getComputeShaderSource(): string {
    return `
      struct Uniforms {
        view_matrix: mat4x4<f32>,
        time: f32,
        reasoning_depth: f32,
        transcendence_level: f32,
        quantum_coherence: f32,
      }

      @group(0) @binding(0) var<storage, read> cognitive_input: array<f32>;
      @group(0) @binding(1) var<storage, read_write> brain_activity: array<f32>;
      @group(0) @binding(2) var<uniform> uniforms: Uniforms;

      @compute @workgroup_size(16, 16)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let index = global_id.y * 16u + global_id.x;
        
        if (index >= arrayLength(&brain_activity)) {
          return;
        }
        
        // Simulate neural network processing
        let input_activation = cognitive_input[index % arrayLength(&cognitive_input)];
        let time_factor = sin(uniforms.time * 0.001 + f32(index) * 0.1);
        let coherence_factor = uniforms.quantum_coherence;
        
        // Apply cognitive processing transformation
        let processed_value = input_activation * time_factor * coherence_factor * 
                            uniforms.reasoning_depth * 0.01;
        
        // Update brain activity with processed value
        brain_activity[index] = processed_value;
      }
    `;
  }

  private validateConfig(config: WebGPURendererConfig): void {
    if (!config.canvasId) {
      throw new Error('Canvas ID is required');
    }
    if (config.width <= 0 || config.height <= 0) {
      throw new Error('Width and height must be positive');
    }
    if (config.multiSampleCount && ![1, 4].includes(config.multiSampleCount)) {
      throw new Error('Multi-sample count must be 1 or 4');
    }
  }

  public startRenderLoop(frameCallback?: (frame: RenderFrame) => void): void {
    const renderLoop = (timestamp: number) => {
      if (this.frameBuffer.length > 0) {
        const frame = this.frameBuffer.shift()!;
        
        if (frameCallback) {
          frameCallback(frame);
        }
        
        this.renderFrame(frame);
      }
      
      this.animationFrameId = requestAnimationFrame(renderLoop);
    };

    this.animationFrameId = requestAnimationFrame(renderLoop);
  }

  public stopRenderLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public queueFrame(frame: RenderFrame): void {
    this.frameBuffer.push(frame);
    
    // Limit buffer size to prevent memory issues
    if (this.frameBuffer.length > 60) { // ~1 second at 60 FPS
      this.frameBuffer.shift();
    }
  }

  public async captureFrame(): Promise<ImageData> {
    const canvas = document.getElementById(this.config.canvasId) as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    return {
      frameRate: 60, // TODO: Calculate actual frame rate
      gpuUtilization: 0.75, // TODO: Get from GPU performance APIs
      memoryUsage: this.calculateMemoryUsage(),
      renderTime: 16.67, // TODO: Measure actual render time
      computeTime: 2.5 // TODO: Measure compute shader time
    };
  }

  private calculateMemoryUsage(): number {
    let totalBytes = 0;
    
    for (const buffer of this.buffers.values()) {
      if (buffer && 'size' in buffer) {
        totalBytes += (buffer as GPUBuffer).size;
      }
    }
    
    for (const texture of this.textures.values()) {
      // Estimate texture memory usage
      totalBytes += 512 * 512 * 4; // RGBA * dimensions
    }
    
    return totalBytes;
  }

  public dispose(): void {
    this.stopRenderLoop();
    
    // Destroy all buffers
    for (const buffer of this.buffers.values()) {
      if (buffer && 'destroy' in buffer) {
        (buffer as GPUBuffer).destroy();
      }
    }
    
    // Destroy all textures
    for (const texture of this.textures.values()) {
      texture.destroy();
    }
    
    this.buffers.clear();
    this.textures.clear();
    this.bindGroups.clear();
    this.frameBuffer = [];
    
    if (this.device) {
      this.device.destroy();
    }
  }
}

// Supporting interfaces and types
interface ConnectionMatrix {
  connections: Float32Array;
  weights: Float32Array;
  dimensions: [number, number];
}

interface ActivationPattern {
  pattern: Float32Array;
  timestamp: number;
  intensity: number;
}

interface ResourceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  gpuUsage: number;
  networkIO: number;
}

interface DataFlowVisualization {
  flowPaths: FlowPath[];
  dataVolume: number;
  throughput: number;
}

interface FlowPath {
  source: [number, number];
  destination: [number, number];
  intensity: number;
  color: [number, number, number];
}

interface ComputePerformance {
  executionTime: number;
  throughput: number;
  efficiency: number;
  parallelization: number;
}

interface EmergentPattern {
  patternId: string;
  complexity: number;
  emergence_strength: number;
  spatial_extent: BoundingBox;
  temporal_signature: Float32Array;
}

interface FieldResonanceData {
  frequency: number;
  amplitude: number;
  phase: number;
  harmonics: Float32Array;
}

interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
}

interface PerformanceMetrics {
  frameRate: number;
  gpuUtilization: number;
  memoryUsage: number;
  renderTime: number;
  computeTime: number;
}

export {
  WebGPURenderer,
  type WebGPURendererConfig,
  type RenderFrame,
  type CognitiveState,
  type BrainActivityData,
  type BraunExecutionData,
  type BeyondState,
  type ContextField,
  type PerformanceMetrics
};