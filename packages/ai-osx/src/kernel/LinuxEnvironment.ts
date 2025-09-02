/**
 * Linux Environment - WebAssembly-based POSIX-compatible runtime
 * 
 * Provides comprehensive Linux syscall emulation, file system virtualization,
 * and process management within the browser environment using WebAssembly.
 */

import { WasmRuntimeManager, WasmInstance, WasmResult } from './WasmRuntimeManager';
import { SecurityAIClient } from '@katalyst/security-ai';

// Linux syscall constants
export const SYSCALLS = {
  // File operations
  SYS_READ: 0,
  SYS_WRITE: 1,
  SYS_OPEN: 2,
  SYS_CLOSE: 3,
  SYS_STAT: 4,
  SYS_FSTAT: 5,
  SYS_LSTAT: 6,
  
  // Process management
  SYS_FORK: 57,
  SYS_EXECVE: 59,
  SYS_EXIT: 60,
  SYS_WAIT4: 61,
  SYS_KILL: 62,
  SYS_GETPID: 110,
  SYS_GETPPID: 111,
  
  // Memory management
  SYS_BRK: 12,
  SYS_MMAP: 9,
  SYS_MUNMAP: 11,
  SYS_MPROTECT: 10,
  
  // Networking
  SYS_SOCKET: 41,
  SYS_CONNECT: 42,
  SYS_BIND: 49,
  SYS_LISTEN: 50,
  SYS_ACCEPT: 43,
  
  // Threading
  SYS_CLONE: 56,
  SYS_FUTEX: 202,
  SYS_SET_THREAD_AREA: 205,
  
  // Time
  SYS_TIME: 201,
  SYS_GETTIMEOFDAY: 96,
  SYS_CLOCK_GETTIME: 228
} as const;

export interface LinuxEnvironmentConfig {
  maxProcesses: number;
  maxOpenFiles: number;
  maxMemoryMB: number;
  enableNetworking: boolean;
  enableThreading: boolean;
  filesystemRoot: string;
  securityLevel: 'strict' | 'normal' | 'permissive';
  enableAuditLogging: boolean;
}

export interface VirtualFileSystem {
  root: VFSNode;
  openFiles: Map<number, FileDescriptor>;
  nextFd: number;
  mountPoints: Map<string, VFSMount>;
}

export interface VFSNode {
  name: string;
  type: 'file' | 'directory' | 'symlink' | 'device';
  permissions: number;
  owner: number;
  group: number;
  size: number;
  content?: Uint8Array;
  children?: Map<string, VFSNode>;
  target?: string; // For symlinks
  device?: VirtualDevice; // For device files
  created: number;
  modified: number;
  accessed: number;
}

export interface FileDescriptor {
  fd: number;
  node: VFSNode;
  path: string;
  flags: number;
  position: number;
  mode: string;
}

export interface VirtualProcess {
  pid: number;
  ppid: number;
  command: string;
  args: string[];
  env: Map<string, string>;
  workingDirectory: string;
  uid: number;
  gid: number;
  state: 'running' | 'sleeping' | 'stopped' | 'zombie' | 'dead';
  wasmInstance: WasmInstance;
  memory: WebAssembly.Memory;
  fdTable: Map<number, FileDescriptor>;
  signalHandlers: Map<number, number>; // signal -> handler address
  exitCode?: number;
  startTime: number;
  cpuTime: number;
  threads: VirtualThread[];
}

export interface VirtualThread {
  tid: number;
  pid: number;
  state: 'running' | 'sleeping' | 'blocked';
  stack: WebAssembly.Memory;
  registers: Map<string, number>;
  signalMask: number;
}

export interface NetworkSocket {
  fd: number;
  family: number; // AF_INET, AF_UNIX, etc.
  type: number; // SOCK_STREAM, SOCK_DGRAM, etc.
  protocol: number;
  localAddress?: string;
  localPort?: number;
  remoteAddress?: string;
  remotePort?: number;
  state: 'closed' | 'listen' | 'connecting' | 'connected' | 'closing';
  buffer: Uint8Array[];
}

export interface VirtualDevice {
  major: number;
  minor: number;
  read?: (offset: number, length: number) => Promise<Uint8Array>;
  write?: (offset: number, data: Uint8Array) => Promise<number>;
  ioctl?: (request: number, arg: any) => Promise<number>;
}

export interface SyscallContext {
  process: VirtualProcess;
  syscallNumber: number;
  args: number[];
  returnValue: number;
  errno: number;
  timestamp: number;
}

export interface LinuxMetrics {
  totalProcesses: number;
  activeProcesses: number;
  totalSyscalls: number;
  syscallsPerSecond: number;
  memoryUsage: number;
  filesystemOperations: number;
  networkConnections: number;
  securityViolations: number;
}

export class LinuxEnvironment {
  private config: LinuxEnvironmentConfig;
  private wasmManager: WasmRuntimeManager;
  private securityClient: SecurityAIClient;
  private vfs: VirtualFileSystem;
  private processes: Map<number, VirtualProcess>;
  private nextPid: number;
  private sockets: Map<number, NetworkSocket>;
  private metrics: LinuxMetrics;
  private syscallHandlers: Map<number, (ctx: SyscallContext) => Promise<number>>;
  private auditLog: SyscallContext[];
  private isInitialized: boolean;

  constructor(
    config: LinuxEnvironmentConfig,
    wasmManager: WasmRuntimeManager,
    securityClient: SecurityAIClient
  ) {
    this.config = config;
    this.wasmManager = wasmManager;
    this.securityClient = securityClient;
    this.nextPid = 1;
    this.auditLog = [];
    this.isInitialized = false;
    
    this.initializeFileSystem();
    this.initializeProcessManagement();
    this.initializeNetworking();
    this.initializeSyscallHandlers();
    this.initializeMetrics();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Initialize virtual file system with standard Linux directories
    await this.createStandardDirectories();
    
    // Initialize standard devices
    await this.createStandardDevices();
    
    // Initialize init process (PID 1)
    await this.createInitProcess();
    
    // Start system monitoring
    this.startSystemMonitoring();
    
    this.isInitialized = true;
    console.log('🐧 Linux Environment initialized successfully');
  }

  private initializeFileSystem(): void {
    this.vfs = {
      root: {
        name: '/',
        type: 'directory',
        permissions: 0o755,
        owner: 0,
        group: 0,
        size: 4096,
        children: new Map(),
        created: Date.now(),
        modified: Date.now(),
        accessed: Date.now()
      },
      openFiles: new Map(),
      nextFd: 3, // 0, 1, 2 are reserved for stdin, stdout, stderr
      mountPoints: new Map()
    };
  }

  private initializeProcessManagement(): void {
    this.processes = new Map();
    this.sockets = new Map();
  }

  private initializeNetworking(): void {
    if (!this.config.enableNetworking) {
      return;
    }

    // Initialize virtual network interfaces
    // This would integrate with WebRTC for peer-to-peer networking
    // and WebSocket for server connections
  }

  private initializeSyscallHandlers(): void {
    this.syscallHandlers = new Map([
      // File I/O
      [SYSCALLS.SYS_READ, this.handleRead.bind(this)],
      [SYSCALLS.SYS_WRITE, this.handleWrite.bind(this)],
      [SYSCALLS.SYS_OPEN, this.handleOpen.bind(this)],
      [SYSCALLS.SYS_CLOSE, this.handleClose.bind(this)],
      [SYSCALLS.SYS_STAT, this.handleStat.bind(this)],
      [SYSCALLS.SYS_FSTAT, this.handleFstat.bind(this)],
      
      // Process management
      [SYSCALLS.SYS_FORK, this.handleFork.bind(this)],
      [SYSCALLS.SYS_EXECVE, this.handleExecve.bind(this)],
      [SYSCALLS.SYS_EXIT, this.handleExit.bind(this)],
      [SYSCALLS.SYS_GETPID, this.handleGetpid.bind(this)],
      [SYSCALLS.SYS_GETPPID, this.handleGetppid.bind(this)],
      
      // Memory management
      [SYSCALLS.SYS_BRK, this.handleBrk.bind(this)],
      [SYSCALLS.SYS_MMAP, this.handleMmap.bind(this)],
      [SYSCALLS.SYS_MUNMAP, this.handleMunmap.bind(this)],
      
      // Networking
      [SYSCALLS.SYS_SOCKET, this.handleSocket.bind(this)],
      [SYSCALLS.SYS_CONNECT, this.handleConnect.bind(this)],
      [SYSCALLS.SYS_BIND, this.handleBind.bind(this)],
      [SYSCALLS.SYS_LISTEN, this.handleListen.bind(this)],
      [SYSCALLS.SYS_ACCEPT, this.handleAccept.bind(this)],
      
      // Time
      [SYSCALLS.SYS_TIME, this.handleTime.bind(this)],
      [SYSCALLS.SYS_GETTIMEOFDAY, this.handleGettimeofday.bind(this)],
      [SYSCALLS.SYS_CLOCK_GETTIME, this.handleClockGettime.bind(this)]
    ]);
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalProcesses: 0,
      activeProcesses: 0,
      totalSyscalls: 0,
      syscallsPerSecond: 0,
      memoryUsage: 0,
      filesystemOperations: 0,
      networkConnections: 0,
      securityViolations: 0
    };
  }

  public async handleSyscall(
    process: VirtualProcess,
    syscallNumber: number,
    args: number[]
  ): Promise<number> {
    const context: SyscallContext = {
      process,
      syscallNumber,
      args,
      returnValue: 0,
      errno: 0,
      timestamp: Date.now()
    };

    try {
      // Security check for syscall
      await this.performSecurityCheck(context);
      
      const handler = this.syscallHandlers.get(syscallNumber);
      if (!handler) {
        console.warn(`🚨 Unimplemented syscall: ${syscallNumber}`);
        context.returnValue = -1;
        context.errno = 38; // ENOSYS
        return -1;
      }

      const result = await handler(context);
      context.returnValue = result;
      
      this.updateMetrics(context);
      
      if (this.config.enableAuditLogging) {
        this.auditLog.push(context);
        if (this.auditLog.length > 10000) {
          this.auditLog.shift(); // Keep only last 10k entries
        }
      }

      return result;
    } catch (error) {
      console.error('💥 Syscall execution failed:', error);
      context.returnValue = -1;
      context.errno = 5; // EIO
      return -1;
    }
  }

  // File I/O syscall implementations
  private async handleRead(ctx: SyscallContext): Promise<number> {
    const [fd, bufPtr, count] = ctx.args;
    const file = ctx.process.fdTable.get(fd);
    
    if (!file) {
      ctx.errno = 9; // EBADF
      return -1;
    }

    try {
      const data = await this.readFromFile(file, count);
      if (data.length === 0) {
        return 0; // EOF
      }

      // Write data to WASM memory
      const memory = ctx.process.memory;
      const buffer = new Uint8Array(memory.buffer, bufPtr, data.length);
      buffer.set(data);

      file.position += data.length;
      this.metrics.filesystemOperations++;
      
      return data.length;
    } catch (error) {
      ctx.errno = 5; // EIO
      return -1;
    }
  }

  private async handleWrite(ctx: SyscallContext): Promise<number> {
    const [fd, bufPtr, count] = ctx.args;
    const file = ctx.process.fdTable.get(fd);
    
    if (!file) {
      ctx.errno = 9; // EBADF
      return -1;
    }

    try {
      // Read data from WASM memory
      const memory = ctx.process.memory;
      const data = new Uint8Array(memory.buffer, bufPtr, count);

      const written = await this.writeToFile(file, data);
      file.position += written;
      this.metrics.filesystemOperations++;
      
      return written;
    } catch (error) {
      ctx.errno = 5; // EIO
      return -1;
    }
  }

  private async handleOpen(ctx: SyscallContext): Promise<number> {
    const [pathnamePtr, flags, mode] = ctx.args;
    const memory = ctx.process.memory;
    const pathname = this.readCString(memory, pathnamePtr);
    
    try {
      const node = await this.resolvePathToNode(pathname, ctx.process.workingDirectory);
      if (!node && !(flags & 64)) { // O_CREAT
        ctx.errno = 2; // ENOENT
        return -1;
      }

      const fd = this.vfs.nextFd++;
      const fileDescriptor: FileDescriptor = {
        fd,
        node: node || await this.createFile(pathname, mode),
        path: pathname,
        flags,
        position: 0,
        mode: flags & 1 ? 'w' : 'r' // Simplified mode detection
      };

      ctx.process.fdTable.set(fd, fileDescriptor);
      this.vfs.openFiles.set(fd, fileDescriptor);
      
      return fd;
    } catch (error) {
      ctx.errno = 13; // EACCES
      return -1;
    }
  }

  private async handleClose(ctx: SyscallContext): Promise<number> {
    const [fd] = ctx.args;
    const file = ctx.process.fdTable.get(fd);
    
    if (!file) {
      ctx.errno = 9; // EBADF
      return -1;
    }

    ctx.process.fdTable.delete(fd);
    this.vfs.openFiles.delete(fd);
    
    return 0;
  }

  private async handleStat(ctx: SyscallContext): Promise<number> {
    const [pathnamePtr, statBufPtr] = ctx.args;
    const memory = ctx.process.memory;
    const pathname = this.readCString(memory, pathnamePtr);
    
    try {
      const node = await this.resolvePathToNode(pathname, ctx.process.workingDirectory);
      if (!node) {
        ctx.errno = 2; // ENOENT
        return -1;
      }

      this.writeStatStruct(memory, statBufPtr, node);
      return 0;
    } catch (error) {
      ctx.errno = 13; // EACCES
      return -1;
    }
  }

  // Process management syscall implementations
  private async handleFork(ctx: SyscallContext): Promise<number> {
    if (this.processes.size >= this.config.maxProcesses) {
      ctx.errno = 12; // ENOMEM
      return -1;
    }

    try {
      const childPid = this.nextPid++;
      const parentProcess = ctx.process;
      
      // Clone the parent process
      const childProcess: VirtualProcess = {
        pid: childPid,
        ppid: parentProcess.pid,
        command: parentProcess.command,
        args: [...parentProcess.args],
        env: new Map(parentProcess.env),
        workingDirectory: parentProcess.workingDirectory,
        uid: parentProcess.uid,
        gid: parentProcess.gid,
        state: 'running',
        wasmInstance: await this.cloneWasmInstance(parentProcess.wasmInstance),
        memory: parentProcess.memory, // Share memory initially (COW)
        fdTable: new Map(parentProcess.fdTable),
        signalHandlers: new Map(parentProcess.signalHandlers),
        startTime: Date.now(),
        cpuTime: 0,
        threads: []
      };

      this.processes.set(childPid, childProcess);
      this.metrics.totalProcesses++;
      this.metrics.activeProcesses++;

      // Return child PID to parent, 0 to child
      return childPid;
    } catch (error) {
      ctx.errno = 12; // ENOMEM
      return -1;
    }
  }

  private async handleExecve(ctx: SyscallContext): Promise<number> {
    const [programPtr, argvPtr, envpPtr] = ctx.args;
    const memory = ctx.process.memory;
    const program = this.readCString(memory, programPtr);
    const argv = this.readStringArray(memory, argvPtr);
    const envp = this.readStringArray(memory, envpPtr);

    try {
      // Load and execute new program
      const wasmModule = await this.loadProgram(program);
      if (!wasmModule) {
        ctx.errno = 2; // ENOENT
        return -1;
      }

      // Replace current process image
      ctx.process.command = program;
      ctx.process.args = argv;
      ctx.process.env = new Map(envp.map(env => {
        const [key, value] = env.split('=', 2);
        return [key, value || ''];
      }));
      
      ctx.process.wasmInstance = await this.wasmManager.createInstance('native', wasmModule);
      
      // This syscall doesn't return on success
      return 0;
    } catch (error) {
      ctx.errno = 8; // ENOEXEC
      return -1;
    }
  }

  private async handleExit(ctx: SyscallContext): Promise<number> {
    const [exitCode] = ctx.args;
    ctx.process.state = 'dead';
    ctx.process.exitCode = exitCode;
    
    // Clean up process resources
    await this.cleanupProcess(ctx.process);
    
    this.metrics.activeProcesses--;
    
    // This syscall never returns
    return 0;
  }

  private async handleGetpid(ctx: SyscallContext): Promise<number> {
    return ctx.process.pid;
  }

  private async handleGetppid(ctx: SyscallContext): Promise<number> {
    return ctx.process.ppid;
  }

  // Memory management syscall implementations
  private async handleBrk(ctx: SyscallContext): Promise<number> {
    const [addr] = ctx.args;
    
    // Simplified brk implementation
    // In a real implementation, this would manage the heap
    if (addr === 0) {
      // Return current break
      return 0x40000000; // Arbitrary heap start
    }
    
    // Set new break
    return addr;
  }

  private async handleMmap(ctx: SyscallContext): Promise<number> {
    const [addr, length, prot, flags, fd, offset] = ctx.args;
    
    try {
      // Simplified mmap - just allocate memory
      // Real implementation would handle file mapping, permissions, etc.
      const pages = Math.ceil(length / 4096);
      const memory = new WebAssembly.Memory({ 
        initial: pages, 
        maximum: pages,
        shared: false 
      });
      
      // Return virtual address
      return 0x50000000 + (pages * 4096);
    } catch (error) {
      ctx.errno = 12; // ENOMEM
      return -1;
    }
  }

  private async handleMunmap(ctx: SyscallContext): Promise<number> {
    const [addr, length] = ctx.args;
    
    // Simplified munmap - just acknowledge
    // Real implementation would free memory pages
    return 0;
  }

  // Networking syscall implementations
  private async handleSocket(ctx: SyscallContext): Promise<number> {
    if (!this.config.enableNetworking) {
      ctx.errno = 1; // EPERM
      return -1;
    }

    const [family, type, protocol] = ctx.args;
    
    try {
      const fd = this.vfs.nextFd++;
      const socket: NetworkSocket = {
        fd,
        family,
        type,
        protocol,
        state: 'closed',
        buffer: []
      };

      this.sockets.set(fd, socket);
      this.metrics.networkConnections++;
      
      return fd;
    } catch (error) {
      ctx.errno = 12; // ENOMEM
      return -1;
    }
  }

  private async handleConnect(ctx: SyscallContext): Promise<number> {
    const [sockfd, addrPtr, addrlen] = ctx.args;
    const socket = this.sockets.get(sockfd);
    
    if (!socket) {
      ctx.errno = 9; // EBADF
      return -1;
    }

    try {
      // Parse socket address and connect
      // This would integrate with WebSocket or WebRTC
      socket.state = 'connecting';
      
      // Simulate async connection
      setTimeout(() => {
        socket.state = 'connected';
      }, 100);
      
      return 0;
    } catch (error) {
      ctx.errno = 111; // ECONNREFUSED
      return -1;
    }
  }

  private async handleBind(ctx: SyscallContext): Promise<number> {
    const [sockfd, addrPtr, addrlen] = ctx.args;
    const socket = this.sockets.get(sockfd);
    
    if (!socket) {
      ctx.errno = 9; // EBADF
      return -1;
    }

    // Bind socket to address
    return 0;
  }

  private async handleListen(ctx: SyscallContext): Promise<number> {
    const [sockfd, backlog] = ctx.args;
    const socket = this.sockets.get(sockfd);
    
    if (!socket) {
      ctx.errno = 9; // EBADF
      return -1;
    }

    socket.state = 'listen';
    return 0;
  }

  private async handleAccept(ctx: SyscallContext): Promise<number> {
    const [sockfd, addrPtr, addrlenPtr] = ctx.args;
    const socket = this.sockets.get(sockfd);
    
    if (!socket || socket.state !== 'listen') {
      ctx.errno = 22; // EINVAL
      return -1;
    }

    // Simplified accept - would normally block until connection arrives
    const newFd = this.vfs.nextFd++;
    const newSocket: NetworkSocket = {
      fd: newFd,
      family: socket.family,
      type: socket.type,
      protocol: socket.protocol,
      state: 'connected',
      buffer: []
    };

    this.sockets.set(newFd, newSocket);
    
    return newFd;
  }

  // Time syscall implementations
  private async handleTime(ctx: SyscallContext): Promise<number> {
    const [tloc] = ctx.args;
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (tloc !== 0) {
      // Write time to memory location
      const memory = ctx.process.memory;
      const view = new DataView(memory.buffer);
      view.setUint32(tloc, currentTime, true);
    }
    
    return currentTime;
  }

  private async handleGettimeofday(ctx: SyscallContext): Promise<number> {
    const [tvPtr, tzPtr] = ctx.args;
    const memory = ctx.process.memory;
    const view = new DataView(memory.buffer);
    
    const now = Date.now();
    const seconds = Math.floor(now / 1000);
    const microseconds = (now % 1000) * 1000;
    
    // Write timeval struct
    view.setUint32(tvPtr, seconds, true);
    view.setUint32(tvPtr + 4, microseconds, true);
    
    return 0;
  }

  private async handleClockGettime(ctx: SyscallContext): Promise<number> {
    const [clockId, timespecPtr] = ctx.args;
    const memory = ctx.process.memory;
    const view = new DataView(memory.buffer);
    
    const now = Date.now();
    const seconds = Math.floor(now / 1000);
    const nanoseconds = (now % 1000) * 1000000;
    
    // Write timespec struct
    view.setUint32(timespecPtr, seconds, true);
    view.setUint32(timespecPtr + 4, nanoseconds, true);
    
    return 0;
  }

  // Helper methods
  private async performSecurityCheck(ctx: SyscallContext): Promise<void> {
    try {
      const result = await this.securityClient.scanSystemCall({
        syscallNumber: ctx.syscallNumber,
        processId: ctx.process.pid,
        args: ctx.args,
        process: {
          command: ctx.process.command,
          uid: ctx.process.uid,
          gid: ctx.process.gid
        }
      });

      if (result.severity === 'high' || result.severity === 'critical') {
        this.metrics.securityViolations++;
        console.warn(`🔒 Blocked suspicious syscall: ${ctx.syscallNumber} by PID ${ctx.process.pid}`);
        throw new Error('Security violation');
      }
    } catch (error) {
      if (this.config.securityLevel === 'strict') {
        throw error;
      }
      console.warn('⚠️ Security check failed, allowing syscall in permissive mode');
    }
  }

  private async createStandardDirectories(): Promise<void> {
    const directories = [
      '/bin', '/sbin', '/usr', '/usr/bin', '/usr/sbin', '/usr/local',
      '/etc', '/var', '/tmp', '/dev', '/proc', '/sys', '/home', '/root',
      '/lib', '/lib64', '/opt', '/mnt', '/media', '/run'
    ];

    for (const dir of directories) {
      await this.createDirectory(dir, 0o755);
    }
  }

  private async createStandardDevices(): Promise<void> {
    const devices = [
      { path: '/dev/null', major: 1, minor: 3 },
      { path: '/dev/zero', major: 1, minor: 5 },
      { path: '/dev/random', major: 1, minor: 8 },
      { path: '/dev/urandom', major: 1, minor: 9 },
      { path: '/dev/stdin', major: 5, minor: 0 },
      { path: '/dev/stdout', major: 5, minor: 1 },
      { path: '/dev/stderr', major: 5, minor: 2 }
    ];

    for (const device of devices) {
      await this.createDeviceNode(device.path, device.major, device.minor);
    }
  }

  private async createInitProcess(): Promise<void> {
    const initProcess: VirtualProcess = {
      pid: 1,
      ppid: 0,
      command: '/sbin/init',
      args: ['init'],
      env: new Map([['PATH', '/bin:/sbin:/usr/bin:/usr/sbin']]),
      workingDirectory: '/',
      uid: 0,
      gid: 0,
      state: 'running',
      wasmInstance: {} as WasmInstance, // Minimal init
      memory: new WebAssembly.Memory({ initial: 1, maximum: 1 }),
      fdTable: new Map([
        [0, { fd: 0, node: await this.resolvePathToNode('/dev/stdin'), path: '/dev/stdin', flags: 0, position: 0, mode: 'r' } as FileDescriptor],
        [1, { fd: 1, node: await this.resolvePathToNode('/dev/stdout'), path: '/dev/stdout', flags: 1, position: 0, mode: 'w' } as FileDescriptor],
        [2, { fd: 2, node: await this.resolvePathToNode('/dev/stderr'), path: '/dev/stderr', flags: 1, position: 0, mode: 'w' } as FileDescriptor]
      ]),
      signalHandlers: new Map(),
      startTime: Date.now(),
      cpuTime: 0,
      threads: []
    };

    this.processes.set(1, initProcess);
    this.metrics.totalProcesses++;
    this.metrics.activeProcesses++;
  }

  private startSystemMonitoring(): void {
    setInterval(() => {
      this.updateSystemMetrics();
    }, 1000);
  }

  private updateSystemMetrics(): void {
    this.metrics.activeProcesses = Array.from(this.processes.values())
      .filter(p => p.state === 'running' || p.state === 'sleeping').length;
    
    this.metrics.memoryUsage = Array.from(this.processes.values())
      .reduce((total, p) => total + (p.memory?.buffer?.byteLength || 0), 0);
    
    this.metrics.syscallsPerSecond = this.calculateSyscallRate();
  }

  private calculateSyscallRate(): number {
    const now = Date.now();
    const recentSyscalls = this.auditLog.filter(entry => 
      now - entry.timestamp < 1000
    );
    return recentSyscalls.length;
  }

  private updateMetrics(ctx: SyscallContext): void {
    this.metrics.totalSyscalls++;
  }

  public getMetrics(): LinuxMetrics {
    return { ...this.metrics };
  }

  public getProcessList(): VirtualProcess[] {
    return Array.from(this.processes.values());
  }

  public getAuditLog(): SyscallContext[] {
    return [...this.auditLog];
  }

  // Additional helper methods for file system operations, string handling, etc.
  private readCString(memory: WebAssembly.Memory, ptr: number): string {
    const buffer = new Uint8Array(memory.buffer);
    let end = ptr;
    while (buffer[end] !== 0 && end < buffer.length) {
      end++;
    }
    return new TextDecoder().decode(buffer.slice(ptr, end));
  }

  private readStringArray(memory: WebAssembly.Memory, ptr: number): string[] {
    const result: string[] = [];
    const view = new DataView(memory.buffer);
    let offset = 0;
    
    while (true) {
      const strPtr = view.getUint32(ptr + offset, true);
      if (strPtr === 0) break;
      
      result.push(this.readCString(memory, strPtr));
      offset += 4;
    }
    
    return result;
  }

  private async resolvePathToNode(path: string, cwd: string = '/'): Promise<VFSNode | null> {
    // Implement path resolution logic
    // This would handle absolute/relative paths, symlinks, etc.
    return null; // Placeholder
  }

  private async createFile(path: string, mode: number): Promise<VFSNode> {
    // Create a new file node
    return {
      name: path.split('/').pop() || '',
      type: 'file',
      permissions: mode,
      owner: 0,
      group: 0,
      size: 0,
      content: new Uint8Array(0),
      created: Date.now(),
      modified: Date.now(),
      accessed: Date.now()
    };
  }

  private async createDirectory(path: string, mode: number): Promise<VFSNode> {
    // Create a new directory node
    return {
      name: path.split('/').pop() || '',
      type: 'directory',
      permissions: mode,
      owner: 0,
      group: 0,
      size: 4096,
      children: new Map(),
      created: Date.now(),
      modified: Date.now(),
      accessed: Date.now()
    };
  }

  private async createDeviceNode(path: string, major: number, minor: number): Promise<VFSNode> {
    // Create a device node
    return {
      name: path.split('/').pop() || '',
      type: 'device',
      permissions: 0o666,
      owner: 0,
      group: 0,
      size: 0,
      device: { major, minor },
      created: Date.now(),
      modified: Date.now(),
      accessed: Date.now()
    };
  }

  private async readFromFile(fd: FileDescriptor, count: number): Promise<Uint8Array> {
    // Read data from file
    if (!fd.node.content) {
      return new Uint8Array(0);
    }
    
    const start = fd.position;
    const end = Math.min(start + count, fd.node.content.length);
    return fd.node.content.slice(start, end);
  }

  private async writeToFile(fd: FileDescriptor, data: Uint8Array): Promise<number> {
    // Write data to file
    if (!fd.node.content) {
      fd.node.content = new Uint8Array(0);
    }
    
    // Extend file if necessary
    const newSize = Math.max(fd.node.content.length, fd.position + data.length);
    const newContent = new Uint8Array(newSize);
    newContent.set(fd.node.content);
    newContent.set(data, fd.position);
    
    fd.node.content = newContent;
    fd.node.size = newSize;
    fd.node.modified = Date.now();
    
    return data.length;
  }

  private writeStatStruct(memory: WebAssembly.Memory, ptr: number, node: VFSNode): void {
    const view = new DataView(memory.buffer);
    let offset = 0;
    
    // struct stat simplified
    view.setUint32(ptr + offset, 0, true); offset += 4; // st_dev
    view.setUint32(ptr + offset, 0, true); offset += 4; // st_ino
    view.setUint32(ptr + offset, node.permissions, true); offset += 4; // st_mode
    view.setUint32(ptr + offset, 1, true); offset += 4; // st_nlink
    view.setUint32(ptr + offset, node.owner, true); offset += 4; // st_uid
    view.setUint32(ptr + offset, node.group, true); offset += 4; // st_gid
    view.setUint32(ptr + offset, 0, true); offset += 4; // st_rdev
    view.setUint32(ptr + offset, node.size, true); offset += 4; // st_size
    view.setUint32(ptr + offset, Math.floor(node.accessed / 1000), true); offset += 4; // st_atime
    view.setUint32(ptr + offset, Math.floor(node.modified / 1000), true); offset += 4; // st_mtime
    view.setUint32(ptr + offset, Math.floor(node.created / 1000), true); // st_ctime
  }

  private async loadProgram(path: string): Promise<WebAssembly.Module | null> {
    // Load WASM program from virtual filesystem
    const node = await this.resolvePathToNode(path);
    if (!node || !node.content) {
      return null;
    }
    
    try {
      return await WebAssembly.compile(node.content);
    } catch (error) {
      console.error('Failed to load program:', error);
      return null;
    }
  }

  private async cloneWasmInstance(instance: WasmInstance): Promise<WasmInstance> {
    // Clone WASM instance for fork()
    // This would involve copying the instance state
    return { ...instance }; // Simplified
  }

  private async cleanupProcess(process: VirtualProcess): Promise<void> {
    // Clean up process resources
    for (const [fd] of process.fdTable) {
      this.vfs.openFiles.delete(fd);
    }
    
    this.processes.delete(process.pid);
  }
}

// Export for use in AI-OSX kernel
export default LinuxEnvironment;