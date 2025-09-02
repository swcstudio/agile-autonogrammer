// @katalyst/desktop - Desktop application with Tauri
export * from './src-tauri/src/commands.rs';
export * from './src-tauri/src/desktop/mod.rs';
export * from './src-tauri/src/store/mod.rs';
export * from './src-tauri/src/utils/mod.rs';
export * from './src-tauri/src/webxr/mod.rs';

// TypeScript exports for Tauri API
export interface TauriCommands {
  invoke: (cmd: string, args?: any) => Promise<any>;
  listen: (event: string, handler: (payload: any) => void) => Promise<() => void>;
  emit: (event: string, payload?: any) => Promise<void>;
}

export interface DesktopAPI {
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    setFullscreen: (fullscreen: boolean) => Promise<void>;
  };
  fs: {
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, contents: string) => Promise<void>;
    exists: (path: string) => Promise<boolean>;
  };
  shell: {
    open: (path: string) => Promise<void>;
    execute: (command: string, args?: string[]) => Promise<string>;
  };
}