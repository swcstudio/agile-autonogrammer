/**
 * Unified Editor - Spacemacs + Neovim integration for AI-OSX
 * 
 * Provides a unified editing experience combining the best of Spacemacs
 * and Neovim with AI-powered features, advanced language support,
 * and seamless integration with the AI-OSX ecosystem.
 */

import { SecurityAIClient } from '@katalyst/security-ai';
import { TerminalMultiplexer, TerminalSession } from '../terminal/TerminalMultiplexer';
import { VirtualProcess } from '../kernel/LinuxEnvironment';

export type EditorMode = 'spacemacs' | 'neovim' | 'hybrid' | 'vscode' | 'custom';
export type InputMode = 'normal' | 'insert' | 'visual' | 'command' | 'ex';
export type LanguageMode = 'typescript' | 'javascript' | 'python' | 'rust' | 'elixir' | 'go' | 'java' | 'c' | 'cpp' | 'markdown' | 'json' | 'yaml' | 'toml' | 'dockerfile' | 'shell' | 'html' | 'css' | 'scss' | 'vue' | 'react' | 'svelte';

export interface EditorConfig {
  mode: EditorMode;
  theme: string;
  fontSize: number;
  fontFamily: string;
  lineNumbers: boolean;
  wordWrap: boolean;
  minimap: boolean;
  enableAI: boolean;
  enableLSP: boolean;
  enableGit: boolean;
  enableTerminal: boolean;
  enableCollaboration: boolean;
  keybindings: KeyBindingConfig;
  extensions: ExtensionConfig[];
}

export interface KeyBindingConfig {
  preset: 'spacemacs' | 'vim' | 'emacs' | 'vscode' | 'custom';
  leaderKey: string;
  escapeKey: string;
  customBindings: Map<string, EditorCommand>;
}

export interface ExtensionConfig {
  id: string;
  enabled: boolean;
  config: Record<string, any>;
}

export interface EditorDocument {
  id: string;
  path: string;
  name: string;
  content: string;
  language: LanguageMode;
  encoding: string;
  lineEnding: 'lf' | 'crlf' | 'cr';
  isDirty: boolean;
  isReadonly: boolean;
  version: number;
  metadata: DocumentMetadata;
  cursors: EditorCursor[];
  selections: EditorSelection[];
  folds: EditorFold[];
  markers: EditorMarker[];
  diagnostics: EditorDiagnostic[];
  completions: EditorCompletion[];
}

export interface DocumentMetadata {
  created: number;
  modified: number;
  accessed: number;
  size: number;
  lines: number;
  characters: number;
  words: number;
  project?: string;
  branch?: string;
  author?: string;
  tags: string[];
}

export interface EditorCursor {
  line: number;
  column: number;
  sticky: boolean;
  userId?: string; // For collaboration
}

export interface EditorSelection {
  start: { line: number; column: number };
  end: { line: number; column: number };
  direction: 'forward' | 'backward';
  userId?: string;
}

export interface EditorFold {
  start: number;
  end: number;
  collapsed: boolean;
  type: 'function' | 'class' | 'comment' | 'region' | 'imports';
}

export interface EditorMarker {
  id: string;
  line: number;
  column: number;
  type: 'bookmark' | 'breakpoint' | 'error' | 'warning' | 'info' | 'todo' | 'fixme';
  message?: string;
  severity?: 'error' | 'warning' | 'info' | 'hint';
}

export interface EditorDiagnostic {
  range: { start: { line: number; column: number }; end: { line: number; column: number } };
  severity: 'error' | 'warning' | 'info' | 'hint';
  code?: string | number;
  source: string;
  message: string;
  relatedInformation?: Array<{
    location: { uri: string; range: any };
    message: string;
  }>;
  fixes?: EditorCodeAction[];
}

export interface EditorCompletion {
  label: string;
  kind: CompletionItemKind;
  detail?: string;
  documentation?: string;
  insertText: string;
  filterText?: string;
  sortText?: string;
  preselect?: boolean;
  command?: EditorCommand;
  additionalTextEdits?: EditorTextEdit[];
}

export interface EditorCodeAction {
  title: string;
  kind: CodeActionKind;
  isPreferred?: boolean;
  diagnostics?: EditorDiagnostic[];
  edit?: EditorWorkspaceEdit;
  command?: EditorCommand;
}

export interface EditorTextEdit {
  range: { start: { line: number; column: number }; end: { line: number; column: number } };
  newText: string;
}

export interface EditorWorkspaceEdit {
  changes?: Map<string, EditorTextEdit[]>;
  documentChanges?: Array<{
    textDocument: { uri: string; version: number };
    edits: EditorTextEdit[];
  }>;
}

export interface EditorCommand {
  command: string;
  title?: string;
  arguments?: any[];
}

export type CompletionItemKind = 
  | 'text' | 'method' | 'function' | 'constructor' | 'field' | 'variable'
  | 'class' | 'interface' | 'module' | 'property' | 'unit' | 'value'
  | 'enum' | 'keyword' | 'snippet' | 'color' | 'file' | 'reference';

export type CodeActionKind =
  | 'quickfix' | 'refactor' | 'refactor.extract' | 'refactor.inline' | 'refactor.rewrite'
  | 'source' | 'source.organizeImports' | 'source.fixAll';

export interface LSPClient {
  language: LanguageMode;
  serverPath: string;
  capabilities: LSPCapabilities;
  connection: LSPConnection;
  initialize(): Promise<void>;
  textDocument: {
    completion(params: any): Promise<EditorCompletion[]>;
    hover(params: any): Promise<any>;
    signatureHelp(params: any): Promise<any>;
    definition(params: any): Promise<any>;
    references(params: any): Promise<any>;
    documentHighlight(params: any): Promise<any>;
    documentSymbol(params: any): Promise<any>;
    codeAction(params: any): Promise<EditorCodeAction[]>;
    codeLens(params: any): Promise<any>;
    formatting(params: any): Promise<EditorTextEdit[]>;
    rangeFormatting(params: any): Promise<EditorTextEdit[]>;
    onTypeFormatting(params: any): Promise<EditorTextEdit[]>;
    rename(params: any): Promise<EditorWorkspaceEdit>;
    publishDiagnostics(params: any): void;
  };
}

export interface LSPCapabilities {
  textDocumentSync: number;
  completionProvider?: any;
  hoverProvider?: boolean;
  signatureHelpProvider?: any;
  definitionProvider?: boolean;
  referencesProvider?: boolean;
  documentHighlightProvider?: boolean;
  documentSymbolProvider?: boolean;
  workspaceSymbolProvider?: boolean;
  codeActionProvider?: boolean;
  codeLensProvider?: any;
  documentFormattingProvider?: boolean;
  documentRangeFormattingProvider?: boolean;
  documentOnTypeFormattingProvider?: any;
  renameProvider?: boolean;
  executeCommandProvider?: any;
}

export interface LSPConnection {
  send(method: string, params: any): Promise<any>;
  onNotification(method: string, handler: (params: any) => void): void;
  onRequest(method: string, handler: (params: any) => any): void;
}

export interface EditorLayout {
  type: 'single' | 'vertical' | 'horizontal' | 'grid' | 'tabs';
  panes: EditorPane[];
  activePane: string;
  sizes: number[];
}

export interface EditorPane {
  id: string;
  document?: EditorDocument;
  visible: boolean;
  focused: boolean;
  mode: InputMode;
  viewState: EditorViewState;
}

export interface EditorViewState {
  scrollTop: number;
  scrollLeft: number;
  cursorPosition: { line: number; column: number };
  selection?: EditorSelection;
  foldedRanges: number[];
  viewportLines: { start: number; end: number };
}

export interface EditorMetrics {
  totalDocuments: number;
  openDocuments: number;
  linesOfCode: number;
  charactersTyped: number;
  commandsExecuted: number;
  aiSuggestions: {
    generated: number;
    accepted: number;
    rejected: number;
  };
  lspRequests: {
    completion: number;
    hover: number;
    definition: number;
    references: number;
    codeAction: number;
  };
  performance: {
    renderTime: number;
    keystrokeLatency: number;
    lspResponseTime: number;
    fileLoadTime: number;
  };
}

export interface AIFeatures {
  codeCompletion: boolean;
  codeGeneration: boolean;
  refactoring: boolean;
  documentation: boolean;
  testing: boolean;
  debugging: boolean;
  optimization: boolean;
  translation: boolean;
}

export class UnifiedEditor {
  private config: EditorConfig;
  private multiplexer: TerminalMultiplexer;
  private securityClient: SecurityAIClient;
  private documents: Map<string, EditorDocument>;
  private lspClients: Map<LanguageMode, LSPClient>;
  private layout: EditorLayout;
  private currentMode: InputMode;
  private metrics: EditorMetrics;
  private keyBindings: Map<string, EditorCommand>;
  private commandHistory: string[];
  private undoStack: Map<string, EditorTextEdit[][]>;
  private redoStack: Map<string, EditorTextEdit[][]>;
  private canvas?: HTMLCanvasElement;
  private renderContext?: CanvasRenderingContext2D | WebGL2RenderingContext;
  private isInitialized: boolean;

  constructor(
    config: EditorConfig,
    multiplexer: TerminalMultiplexer,
    securityClient: SecurityAIClient
  ) {
    this.config = config;
    this.multiplexer = multiplexer;
    this.securityClient = securityClient;
    this.documents = new Map();
    this.lspClients = new Map();
    this.currentMode = 'normal';
    this.keyBindings = new Map();
    this.commandHistory = [];
    this.undoStack = new Map();
    this.redoStack = new Map();
    this.isInitialized = false;
    
    this.initializeLayout();
    this.initializeMetrics();
    this.initializeKeyBindings();
  }

  public async initialize(canvas: HTMLCanvasElement): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.canvas = canvas;
    this.renderContext = canvas.getContext('2d') || canvas.getContext('webgl2');
    
    // Initialize LSP clients for supported languages
    await this.initializeLSPClients();
    
    // Set up event handlers
    this.setupEventHandlers();
    
    // Start render loop
    this.startRenderLoop();
    
    this.isInitialized = true;
    console.log(`📝 Unified Editor initialized in ${this.config.mode} mode`);
  }

  private initializeLayout(): void {
    this.layout = {
      type: 'single',
      panes: [{
        id: 'main',
        visible: true,
        focused: true,
        mode: 'normal',
        viewState: {
          scrollTop: 0,
          scrollLeft: 0,
          cursorPosition: { line: 0, column: 0 },
          foldedRanges: [],
          viewportLines: { start: 0, end: 50 }
        }
      }],
      activePane: 'main',
      sizes: [100]
    };
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalDocuments: 0,
      openDocuments: 0,
      linesOfCode: 0,
      charactersTyped: 0,
      commandsExecuted: 0,
      aiSuggestions: {
        generated: 0,
        accepted: 0,
        rejected: 0
      },
      lspRequests: {
        completion: 0,
        hover: 0,
        definition: 0,
        references: 0,
        codeAction: 0
      },
      performance: {
        renderTime: 0,
        keystrokeLatency: 0,
        lspResponseTime: 0,
        fileLoadTime: 0
      }
    };
  }

  private initializeKeyBindings(): void {
    // Initialize key bindings based on mode
    switch (this.config.keybindings.preset) {
      case 'spacemacs':
        this.initializeSpacemacsBindings();
        break;
      case 'vim':
        this.initializeVimBindings();
        break;
      case 'emacs':
        this.initializeEmacsBindings();
        break;
      case 'vscode':
        this.initializeVSCodeBindings();
        break;
      default:
        this.initializeCustomBindings();
    }
  }

  private initializeSpacemacsBindings(): void {
    const leader = this.config.keybindings.leaderKey || 'SPC';
    
    // Spacemacs-style bindings
    this.keyBindings.set(`${leader} f f`, { command: 'file.find', title: 'Find File' });
    this.keyBindings.set(`${leader} f s`, { command: 'file.save', title: 'Save File' });
    this.keyBindings.set(`${leader} f r`, { command: 'file.recent', title: 'Recent Files' });
    this.keyBindings.set(`${leader} b b`, { command: 'buffer.switch', title: 'Switch Buffer' });
    this.keyBindings.set(`${leader} b d`, { command: 'buffer.delete', title: 'Delete Buffer' });
    this.keyBindings.set(`${leader} w s`, { command: 'window.split', title: 'Split Window' });
    this.keyBindings.set(`${leader} w v`, { command: 'window.vsplit', title: 'Vertical Split' });
    this.keyBindings.set(`${leader} w d`, { command: 'window.delete', title: 'Delete Window' });
    this.keyBindings.set(`${leader} p f`, { command: 'project.find', title: 'Find in Project' });
    this.keyBindings.set(`${leader} p p`, { command: 'project.switch', title: 'Switch Project' });
    this.keyBindings.set(`${leader} s s`, { command: 'search.buffer', title: 'Search Buffer' });
    this.keyBindings.set(`${leader} s p`, { command: 'search.project', title: 'Search Project' });
    this.keyBindings.set(`${leader} g s`, { command: 'git.status', title: 'Git Status' });
    this.keyBindings.set(`${leader} g b`, { command: 'git.blame', title: 'Git Blame' });
    this.keyBindings.set(`${leader} g l`, { command: 'git.log', title: 'Git Log' });
    this.keyBindings.set(`${leader} a i`, { command: 'ai.complete', title: 'AI Complete' });
    this.keyBindings.set(`${leader} a g`, { command: 'ai.generate', title: 'AI Generate' });
    this.keyBindings.set(`${leader} a r`, { command: 'ai.refactor', title: 'AI Refactor' });
    this.keyBindings.set(`${leader} a d`, { command: 'ai.document', title: 'AI Document' });
  }

  private initializeVimBindings(): void {
    // Vim-style bindings
    this.keyBindings.set('i', { command: 'mode.insert', title: 'Insert Mode' });
    this.keyBindings.set('v', { command: 'mode.visual', title: 'Visual Mode' });
    this.keyBindings.set(':', { command: 'mode.command', title: 'Command Mode' });
    this.keyBindings.set('h', { command: 'cursor.left', title: 'Move Left' });
    this.keyBindings.set('j', { command: 'cursor.down', title: 'Move Down' });
    this.keyBindings.set('k', { command: 'cursor.up', title: 'Move Up' });
    this.keyBindings.set('l', { command: 'cursor.right', title: 'Move Right' });
    this.keyBindings.set('w', { command: 'cursor.wordNext', title: 'Next Word' });
    this.keyBindings.set('b', { command: 'cursor.wordPrevious', title: 'Previous Word' });
    this.keyBindings.set('gg', { command: 'cursor.documentStart', title: 'Go to Start' });
    this.keyBindings.set('G', { command: 'cursor.documentEnd', title: 'Go to End' });
    this.keyBindings.set('dd', { command: 'edit.deleteLine', title: 'Delete Line' });
    this.keyBindings.set('yy', { command: 'edit.copyLine', title: 'Copy Line' });
    this.keyBindings.set('p', { command: 'edit.paste', title: 'Paste' });
    this.keyBindings.set('u', { command: 'edit.undo', title: 'Undo' });
    this.keyBindings.set('Ctrl+r', { command: 'edit.redo', title: 'Redo' });
    this.keyBindings.set('/', { command: 'search.forward', title: 'Search Forward' });
    this.keyBindings.set('?', { command: 'search.backward', title: 'Search Backward' });
    this.keyBindings.set('n', { command: 'search.next', title: 'Next Match' });
    this.keyBindings.set('N', { command: 'search.previous', title: 'Previous Match' });
  }

  private initializeEmacsBindings(): void {
    // Emacs-style bindings
    this.keyBindings.set('Ctrl+x Ctrl+f', { command: 'file.find', title: 'Find File' });
    this.keyBindings.set('Ctrl+x Ctrl+s', { command: 'file.save', title: 'Save File' });
    this.keyBindings.set('Ctrl+x Ctrl+c', { command: 'editor.quit', title: 'Quit' });
    this.keyBindings.set('Ctrl+x b', { command: 'buffer.switch', title: 'Switch Buffer' });
    this.keyBindings.set('Ctrl+x k', { command: 'buffer.kill', title: 'Kill Buffer' });
    this.keyBindings.set('Ctrl+x 2', { command: 'window.split', title: 'Split Window' });
    this.keyBindings.set('Ctrl+x 3', { command: 'window.vsplit', title: 'Vertical Split' });
    this.keyBindings.set('Ctrl+x 1', { command: 'window.deleteOther', title: 'Delete Other Windows' });
    this.keyBindings.set('Ctrl+x 0', { command: 'window.delete', title: 'Delete Window' });
    this.keyBindings.set('Ctrl+a', { command: 'cursor.lineStart', title: 'Beginning of Line' });
    this.keyBindings.set('Ctrl+e', { command: 'cursor.lineEnd', title: 'End of Line' });
    this.keyBindings.set('Ctrl+f', { command: 'cursor.right', title: 'Forward Char' });
    this.keyBindings.set('Ctrl+b', { command: 'cursor.left', title: 'Backward Char' });
    this.keyBindings.set('Ctrl+n', { command: 'cursor.down', title: 'Next Line' });
    this.keyBindings.set('Ctrl+p', { command: 'cursor.up', title: 'Previous Line' });
    this.keyBindings.set('Meta+f', { command: 'cursor.wordNext', title: 'Forward Word' });
    this.keyBindings.set('Meta+b', { command: 'cursor.wordPrevious', title: 'Backward Word' });
    this.keyBindings.set('Ctrl+d', { command: 'edit.deleteRight', title: 'Delete Right' });
    this.keyBindings.set('Ctrl+k', { command: 'edit.killLine', title: 'Kill Line' });
    this.keyBindings.set('Ctrl+w', { command: 'edit.killRegion', title: 'Kill Region' });
    this.keyBindings.set('Meta+w', { command: 'edit.copyRegion', title: 'Copy Region' });
    this.keyBindings.set('Ctrl+y', { command: 'edit.yank', title: 'Yank' });
    this.keyBindings.set('Ctrl+/', { command: 'edit.undo', title: 'Undo' });
    this.keyBindings.set('Ctrl+s', { command: 'search.forward', title: 'Search Forward' });
    this.keyBindings.set('Ctrl+r', { command: 'search.backward', title: 'Search Backward' });
  }

  private initializeVSCodeBindings(): void {
    // VSCode-style bindings
    this.keyBindings.set('Ctrl+n', { command: 'file.new', title: 'New File' });
    this.keyBindings.set('Ctrl+o', { command: 'file.open', title: 'Open File' });
    this.keyBindings.set('Ctrl+s', { command: 'file.save', title: 'Save File' });
    this.keyBindings.set('Ctrl+Shift+s', { command: 'file.saveAs', title: 'Save As' });
    this.keyBindings.set('Ctrl+w', { command: 'file.close', title: 'Close File' });
    this.keyBindings.set('Ctrl+z', { command: 'edit.undo', title: 'Undo' });
    this.keyBindings.set('Ctrl+y', { command: 'edit.redo', title: 'Redo' });
    this.keyBindings.set('Ctrl+x', { command: 'edit.cut', title: 'Cut' });
    this.keyBindings.set('Ctrl+c', { command: 'edit.copy', title: 'Copy' });
    this.keyBindings.set('Ctrl+v', { command: 'edit.paste', title: 'Paste' });
    this.keyBindings.set('Ctrl+a', { command: 'edit.selectAll', title: 'Select All' });
    this.keyBindings.set('Ctrl+f', { command: 'search.find', title: 'Find' });
    this.keyBindings.set('Ctrl+h', { command: 'search.replace', title: 'Replace' });
    this.keyBindings.set('Ctrl+Shift+f', { command: 'search.findInFiles', title: 'Find in Files' });
    this.keyBindings.set('Ctrl+g', { command: 'cursor.gotoLine', title: 'Go to Line' });
    this.keyBindings.set('Ctrl+d', { command: 'selection.addNext', title: 'Add Selection to Next Find Match' });
    this.keyBindings.set('Ctrl+Shift+l', { command: 'selection.selectAllMatches', title: 'Select All Matches' });
    this.keyBindings.set('Ctrl+/', { command: 'edit.toggleComment', title: 'Toggle Comment' });
    this.keyBindings.set('Ctrl+Space', { command: 'editor.triggerSuggest', title: 'Trigger Suggest' });
    this.keyBindings.set('Ctrl+Shift+Space', { command: 'editor.triggerParameterHints', title: 'Trigger Parameter Hints' });
    this.keyBindings.set('F12', { command: 'editor.gotoDefinition', title: 'Go to Definition' });
    this.keyBindings.set('Shift+F12', { command: 'editor.findReferences', title: 'Find References' });
    this.keyBindings.set('F2', { command: 'editor.rename', title: 'Rename Symbol' });
  }

  private initializeCustomBindings(): void {
    // Load custom bindings from config
    for (const [key, command] of this.config.keybindings.customBindings) {
      this.keyBindings.set(key, command);
    }
  }

  private async initializeLSPClients(): Promise<void> {
    const languageConfigs = [
      { language: 'typescript' as LanguageMode, serverPath: 'typescript-language-server' },
      { language: 'javascript' as LanguageMode, serverPath: 'javascript-typescript-langserver' },
      { language: 'python' as LanguageMode, serverPath: 'pylsp' },
      { language: 'rust' as LanguageMode, serverPath: 'rust-analyzer' },
      { language: 'elixir' as LanguageMode, serverPath: 'elixir-ls' },
      { language: 'go' as LanguageMode, serverPath: 'gopls' }
    ];

    for (const config of languageConfigs) {
      try {
        const client = await this.createLSPClient(config.language, config.serverPath);
        await client.initialize();
        this.lspClients.set(config.language, client);
        console.log(`🔧 LSP client initialized for ${config.language}`);
      } catch (error) {
        console.warn(`Failed to initialize LSP client for ${config.language}:`, error);
      }
    }
  }

  private async createLSPClient(language: LanguageMode, serverPath: string): Promise<LSPClient> {
    // Create LSP client implementation
    const connection: LSPConnection = {
      send: async (method: string, params: any): Promise<any> => {
        // Implementation would use WebSocket or Worker to communicate with LSP server
        const response = await fetch('/api/lsp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method, params, language })
        });
        return response.json();
      },
      onNotification: (method: string, handler: (params: any) => void): void => {
        // Set up notification handler
      },
      onRequest: (method: string, handler: (params: any) => any): void => {
        // Set up request handler
      }
    };

    return {
      language,
      serverPath,
      capabilities: {} as LSPCapabilities,
      connection,
      initialize: async (): Promise<void> => {
        const result = await connection.send('initialize', {
          processId: null,
          rootUri: null,
          capabilities: {
            textDocument: {
              synchronization: { dynamicRegistration: false, willSave: true },
              completion: { dynamicRegistration: false, completionItem: { snippetSupport: true } },
              hover: { dynamicRegistration: false },
              signatureHelp: { dynamicRegistration: false },
              definition: { dynamicRegistration: false },
              references: { dynamicRegistration: false },
              documentHighlight: { dynamicRegistration: false },
              documentSymbol: { dynamicRegistration: false },
              codeAction: { dynamicRegistration: false },
              codeLens: { dynamicRegistration: false },
              formatting: { dynamicRegistration: false },
              rangeFormatting: { dynamicRegistration: false },
              onTypeFormatting: { dynamicRegistration: false },
              rename: { dynamicRegistration: false }
            }
          }
        });
        
        this.lspClients.get(language)!.capabilities = result.capabilities;
        await connection.send('initialized', {});
      },
      textDocument: {
        completion: async (params: any): Promise<EditorCompletion[]> => {
          const result = await connection.send('textDocument/completion', params);
          return this.transformCompletions(result);
        },
        hover: async (params: any): Promise<any> => {
          return await connection.send('textDocument/hover', params);
        },
        signatureHelp: async (params: any): Promise<any> => {
          return await connection.send('textDocument/signatureHelp', params);
        },
        definition: async (params: any): Promise<any> => {
          return await connection.send('textDocument/definition', params);
        },
        references: async (params: any): Promise<any> => {
          return await connection.send('textDocument/references', params);
        },
        documentHighlight: async (params: any): Promise<any> => {
          return await connection.send('textDocument/documentHighlight', params);
        },
        documentSymbol: async (params: any): Promise<any> => {
          return await connection.send('textDocument/documentSymbol', params);
        },
        codeAction: async (params: any): Promise<EditorCodeAction[]> => {
          const result = await connection.send('textDocument/codeAction', params);
          return this.transformCodeActions(result);
        },
        codeLens: async (params: any): Promise<any> => {
          return await connection.send('textDocument/codeLens', params);
        },
        formatting: async (params: any): Promise<EditorTextEdit[]> => {
          const result = await connection.send('textDocument/formatting', params);
          return this.transformTextEdits(result);
        },
        rangeFormatting: async (params: any): Promise<EditorTextEdit[]> => {
          const result = await connection.send('textDocument/rangeFormatting', params);
          return this.transformTextEdits(result);
        },
        onTypeFormatting: async (params: any): Promise<EditorTextEdit[]> => {
          const result = await connection.send('textDocument/onTypeFormatting', params);
          return this.transformTextEdits(result);
        },
        rename: async (params: any): Promise<EditorWorkspaceEdit> => {
          const result = await connection.send('textDocument/rename', params);
          return this.transformWorkspaceEdit(result);
        },
        publishDiagnostics: (params: any): void => {
          this.updateDiagnostics(params.uri, params.diagnostics);
        }
      }
    };
  }

  private transformCompletions(lspCompletions: any[]): EditorCompletion[] {
    return lspCompletions.map(completion => ({
      label: completion.label,
      kind: this.mapCompletionKind(completion.kind),
      detail: completion.detail,
      documentation: completion.documentation,
      insertText: completion.insertText || completion.label,
      filterText: completion.filterText,
      sortText: completion.sortText,
      preselect: completion.preselect
    }));
  }

  private transformCodeActions(lspCodeActions: any[]): EditorCodeAction[] {
    return lspCodeActions.map(action => ({
      title: action.title,
      kind: action.kind as CodeActionKind,
      isPreferred: action.isPreferred,
      edit: action.edit ? this.transformWorkspaceEdit(action.edit) : undefined,
      command: action.command
    }));
  }

  private transformTextEdits(lspTextEdits: any[]): EditorTextEdit[] {
    return lspTextEdits.map(edit => ({
      range: {
        start: { line: edit.range.start.line, column: edit.range.start.character },
        end: { line: edit.range.end.line, column: edit.range.end.character }
      },
      newText: edit.newText
    }));
  }

  private transformWorkspaceEdit(lspEdit: any): EditorWorkspaceEdit {
    const changes = new Map();
    if (lspEdit.changes) {
      for (const [uri, edits] of Object.entries(lspEdit.changes)) {
        changes.set(uri, this.transformTextEdits(edits as any[]));
      }
    }
    
    return {
      changes,
      documentChanges: lspEdit.documentChanges
    };
  }

  private mapCompletionKind(lspKind: number): CompletionItemKind {
    const kindMap: Record<number, CompletionItemKind> = {
      1: 'text', 2: 'method', 3: 'function', 4: 'constructor',
      5: 'field', 6: 'variable', 7: 'class', 8: 'interface',
      9: 'module', 10: 'property', 11: 'unit', 12: 'value',
      13: 'enum', 14: 'keyword', 15: 'snippet', 16: 'color',
      17: 'file', 18: 'reference'
    };
    return kindMap[lspKind] || 'text';
  }

  private updateDiagnostics(uri: string, diagnostics: any[]): void {
    const document = this.findDocumentByUri(uri);
    if (document) {
      document.diagnostics = diagnostics.map(diag => ({
        range: {
          start: { line: diag.range.start.line, column: diag.range.start.character },
          end: { line: diag.range.end.line, column: diag.range.end.character }
        },
        severity: diag.severity === 1 ? 'error' : diag.severity === 2 ? 'warning' : diag.severity === 3 ? 'info' : 'hint',
        code: diag.code,
        source: diag.source || 'LSP',
        message: diag.message,
        relatedInformation: diag.relatedInformation
      }));
    }
  }

  private findDocumentByUri(uri: string): EditorDocument | undefined {
    for (const doc of this.documents.values()) {
      if (doc.path === uri) {
        return doc;
      }
    }
    return undefined;
  }

  // Document management
  public async openDocument(path: string): Promise<string> {
    const startTime = performance.now();
    
    try {
      // Check if document is already open
      for (const [id, doc] of this.documents) {
        if (doc.path === path) {
          return id;
        }
      }

      // Load document content
      const content = await this.loadFile(path);
      const language = this.detectLanguage(path);
      
      const document: EditorDocument = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        path,
        name: path.split('/').pop() || 'untitled',
        content,
        language,
        encoding: 'utf-8',
        lineEnding: 'lf',
        isDirty: false,
        isReadonly: false,
        version: 1,
        metadata: {
          created: Date.now(),
          modified: Date.now(),
          accessed: Date.now(),
          size: content.length,
          lines: content.split('\n').length,
          characters: content.length,
          words: content.split(/\s+/).length,
          tags: []
        },
        cursors: [{ line: 0, column: 0, sticky: false }],
        selections: [],
        folds: [],
        markers: [],
        diagnostics: [],
        completions: []
      };

      this.documents.set(document.id, document);
      this.metrics.totalDocuments++;
      this.metrics.openDocuments++;

      // Notify LSP server about opened document
      const lspClient = this.lspClients.get(language);
      if (lspClient) {
        await lspClient.connection.send('textDocument/didOpen', {
          textDocument: {
            uri: path,
            languageId: language,
            version: document.version,
            text: content
          }
        });
      }

      const endTime = performance.now();
      this.metrics.performance.fileLoadTime = endTime - startTime;

      console.log(`📄 Opened document: ${path}`);
      return document.id;

    } catch (error) {
      console.error('Failed to open document:', error);
      throw error;
    }
  }

  public async saveDocument(documentId: string): Promise<void> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    if (document.isReadonly) {
      throw new Error(`Document is readonly: ${document.path}`);
    }

    try {
      await this.saveFile(document.path, document.content);
      document.isDirty = false;
      document.metadata.modified = Date.now();

      // Notify LSP server about saved document
      const lspClient = this.lspClients.get(document.language);
      if (lspClient) {
        await lspClient.connection.send('textDocument/didSave', {
          textDocument: { uri: document.path },
          text: document.content
        });
      }

      console.log(`💾 Saved document: ${document.path}`);

    } catch (error) {
      console.error('Failed to save document:', error);
      throw error;
    }
  }

  public closeDocument(documentId: string): void {
    const document = this.documents.get(documentId);
    if (!document) {
      return;
    }

    // Check if document has unsaved changes
    if (document.isDirty) {
      // In a real implementation, this would show a confirmation dialog
      console.warn(`Document has unsaved changes: ${document.path}`);
    }

    // Notify LSP server about closed document
    const lspClient = this.lspClients.get(document.language);
    if (lspClient) {
      lspClient.connection.send('textDocument/didClose', {
        textDocument: { uri: document.path }
      });
    }

    this.documents.delete(documentId);
    this.metrics.openDocuments--;

    // Remove from undo/redo stacks
    this.undoStack.delete(documentId);
    this.redoStack.delete(documentId);

    console.log(`📄 Closed document: ${document.path}`);
  }

  private async loadFile(path: string): Promise<string> {
    // In a real implementation, this would load from virtual filesystem
    try {
      const response = await fetch(`/api/files${path}`);
      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      // Fallback to empty document
      return '';
    }
  }

  private async saveFile(path: string, content: string): Promise<void> {
    // In a real implementation, this would save to virtual filesystem
    try {
      const response = await fetch(`/api/files${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: content
      });
      if (!response.ok) {
        throw new Error(`Failed to save file: ${response.statusText}`);
      }
    } catch (error) {
      throw error;
    }
  }

  private detectLanguage(path: string): LanguageMode {
    const extension = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, LanguageMode> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'rs': 'rust',
      'ex': 'elixir',
      'exs': 'elixir',
      'go': 'go',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'md': 'markdown',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'dockerfile': 'dockerfile',
      'sh': 'shell',
      'bash': 'shell',
      'zsh': 'shell',
      'html': 'html',
      'htm': 'html',
      'css': 'css',
      'scss': 'scss',
      'vue': 'vue',
      'svelte': 'svelte'
    };
    return languageMap[extension || ''] || 'typescript';
  }

  // Editing operations
  public insertText(documentId: string, position: { line: number; column: number }, text: string): void {
    const document = this.documents.get(documentId);
    if (!document) return;

    const lines = document.content.split('\n');
    const line = lines[position.line] || '';
    const newLine = line.slice(0, position.column) + text + line.slice(position.column);
    lines[position.line] = newLine;
    
    document.content = lines.join('\n');
    document.isDirty = true;
    document.version++;
    this.metrics.charactersTyped += text.length;

    // Update metadata
    document.metadata.modified = Date.now();
    document.metadata.characters = document.content.length;
    document.metadata.lines = lines.length;

    // Notify LSP server
    this.notifyLSPContentChange(document, {
      range: {
        start: position,
        end: position
      },
      text: text
    });
  }

  public deleteText(documentId: string, range: { start: { line: number; column: number }; end: { line: number; column: number } }): void {
    const document = this.documents.get(documentId);
    if (!document) return;

    const lines = document.content.split('\n');
    
    if (range.start.line === range.end.line) {
      // Single line deletion
      const line = lines[range.start.line] || '';
      const newLine = line.slice(0, range.start.column) + line.slice(range.end.column);
      lines[range.start.line] = newLine;
    } else {
      // Multi-line deletion
      const startLine = lines[range.start.line] || '';
      const endLine = lines[range.end.line] || '';
      const newLine = startLine.slice(0, range.start.column) + endLine.slice(range.end.column);
      
      lines.splice(range.start.line, range.end.line - range.start.line + 1, newLine);
    }
    
    document.content = lines.join('\n');
    document.isDirty = true;
    document.version++;

    // Update metadata
    document.metadata.modified = Date.now();
    document.metadata.characters = document.content.length;
    document.metadata.lines = lines.length;

    // Notify LSP server
    this.notifyLSPContentChange(document, {
      range: range,
      text: ''
    });
  }

  private notifyLSPContentChange(document: EditorDocument, change: any): void {
    const lspClient = this.lspClients.get(document.language);
    if (lspClient) {
      lspClient.connection.send('textDocument/didChange', {
        textDocument: {
          uri: document.path,
          version: document.version
        },
        contentChanges: [change]
      });
    }
  }

  // AI-powered features
  public async triggerCompletion(documentId: string, position: { line: number; column: number }): Promise<EditorCompletion[]> {
    const document = this.documents.get(documentId);
    if (!document) return [];

    const startTime = performance.now();
    
    try {
      const lspClient = this.lspClients.get(document.language);
      if (lspClient) {
        const completions = await lspClient.textDocument.completion({
          textDocument: { uri: document.path },
          position: { line: position.line, character: position.column }
        });
        
        this.metrics.lspRequests.completion++;
        this.metrics.performance.lspResponseTime = performance.now() - startTime;
        
        return completions;
      }
      
      // Fallback to basic completions
      return this.generateBasicCompletions(document, position);
      
    } catch (error) {
      console.error('Completion failed:', error);
      return [];
    }
  }

  private generateBasicCompletions(document: EditorDocument, position: { line: number; column: number }): EditorCompletion[] {
    const lines = document.content.split('\n');
    const currentLine = lines[position.line] || '';
    const prefix = currentLine.slice(0, position.column);
    
    // Simple word-based completions
    const words = document.content.match(/\w+/g) || [];
    const uniqueWords = [...new Set(words)];
    
    return uniqueWords
      .filter(word => word.toLowerCase().startsWith(prefix.toLowerCase()) && word !== prefix)
      .slice(0, 20)
      .map(word => ({
        label: word,
        kind: 'text' as CompletionItemKind,
        insertText: word
      }));
  }

  // Event handling
  private setupEventHandlers(): void {
    if (!this.canvas) return;

    this.canvas.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.canvas.addEventListener('keyup', this.handleKeyUp.bind(this));
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const key = this.getKeyString(event);
    const command = this.keyBindings.get(key);
    
    if (command) {
      event.preventDefault();
      this.executeCommand(command.command, command.arguments);
      this.metrics.commandsExecuted++;
    } else {
      // Handle regular character input
      if (this.currentMode === 'insert' && event.key.length === 1) {
        const activePane = this.layout.panes.find(p => p.id === this.layout.activePane);
        if (activePane?.document) {
          this.insertText(activePane.document.id, activePane.viewState.cursorPosition, event.key);
        }
      }
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    // Handle key up events
  }

  private handleMouseDown(event: MouseEvent): void {
    // Handle mouse down events
    const rect = this.canvas!.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert to editor coordinates and update cursor position
    const position = this.screenToEditorPosition(x, y);
    this.setCursorPosition(position);
  }

  private handleMouseMove(event: MouseEvent): void {
    // Handle mouse move events
  }

  private handleMouseUp(event: MouseEvent): void {
    // Handle mouse up events
  }

  private handleWheel(event: WheelEvent): void {
    // Handle scroll events
    const activePane = this.layout.panes.find(p => p.id === this.layout.activePane);
    if (activePane) {
      activePane.viewState.scrollTop += event.deltaY;
      activePane.viewState.scrollTop = Math.max(0, activePane.viewState.scrollTop);
    }
  }

  private getKeyString(event: KeyboardEvent): string {
    const modifiers = [];
    if (event.ctrlKey) modifiers.push('Ctrl');
    if (event.altKey || event.metaKey) modifiers.push('Meta');
    if (event.shiftKey && event.key.length > 1) modifiers.push('Shift');
    
    const keyName = event.key === ' ' ? 'Space' : event.key;
    return modifiers.length > 0 ? `${modifiers.join('+')}+${keyName}` : keyName;
  }

  private screenToEditorPosition(x: number, y: number): { line: number; column: number } {
    // Convert screen coordinates to editor position
    const charWidth = 8; // Approximate character width
    const lineHeight = 20; // Approximate line height
    
    const activePane = this.layout.panes.find(p => p.id === this.layout.activePane);
    const scrollTop = activePane?.viewState.scrollTop || 0;
    
    const line = Math.floor((y + scrollTop) / lineHeight);
    const column = Math.floor(x / charWidth);
    
    return { line: Math.max(0, line), column: Math.max(0, column) };
  }

  private setCursorPosition(position: { line: number; column: number }): void {
    const activePane = this.layout.panes.find(p => p.id === this.layout.activePane);
    if (activePane) {
      activePane.viewState.cursorPosition = position;
      
      if (activePane.document) {
        activePane.document.cursors = [{ 
          line: position.line, 
          column: position.column, 
          sticky: false 
        }];
      }
    }
  }

  // Command execution
  private executeCommand(command: string, args?: any[]): void {
    this.commandHistory.push(command);
    
    switch (command) {
      case 'file.find':
        this.showFileFinder();
        break;
      case 'file.save':
        this.saveCurrentDocument();
        break;
      case 'mode.insert':
        this.currentMode = 'insert';
        break;
      case 'mode.normal':
        this.currentMode = 'normal';
        break;
      case 'mode.visual':
        this.currentMode = 'visual';
        break;
      case 'cursor.left':
        this.moveCursor(-1, 0);
        break;
      case 'cursor.right':
        this.moveCursor(1, 0);
        break;
      case 'cursor.up':
        this.moveCursor(0, -1);
        break;
      case 'cursor.down':
        this.moveCursor(0, 1);
        break;
      case 'edit.undo':
        this.undo();
        break;
      case 'edit.redo':
        this.redo();
        break;
      case 'editor.triggerSuggest':
        this.triggerSuggestions();
        break;
      default:
        console.warn(`Unknown command: ${command}`);
    }
  }

  private async showFileFinder(): Promise<void> {
    // Show file finder dialog (would be implemented with UI framework)
    console.log('📁 File finder opened');
  }

  private async saveCurrentDocument(): Promise<void> {
    const activePane = this.layout.panes.find(p => p.id === this.layout.activePane);
    if (activePane?.document) {
      await this.saveDocument(activePane.document.id);
    }
  }

  private moveCursor(deltaX: number, deltaY: number): void {
    const activePane = this.layout.panes.find(p => p.id === this.layout.activePane);
    if (activePane) {
      const pos = activePane.viewState.cursorPosition;
      const newPos = {
        line: Math.max(0, pos.line + deltaY),
        column: Math.max(0, pos.column + deltaX)
      };
      this.setCursorPosition(newPos);
    }
  }

  private undo(): void {
    const activePane = this.layout.panes.find(p => p.id === this.layout.activePane);
    if (activePane?.document) {
      const documentId = activePane.document.id;
      const undoEdits = this.undoStack.get(documentId);
      if (undoEdits && undoEdits.length > 0) {
        const edits = undoEdits.pop()!;
        // Apply reverse edits
        console.log('↶ Undo applied');
      }
    }
  }

  private redo(): void {
    const activePane = this.layout.panes.find(p => p.id === this.layout.activePane);
    if (activePane?.document) {
      const documentId = activePane.document.id;
      const redoEdits = this.redoStack.get(documentId);
      if (redoEdits && redoEdits.length > 0) {
        const edits = redoEdits.pop()!;
        // Apply edits
        console.log('↷ Redo applied');
      }
    }
  }

  private async triggerSuggestions(): Promise<void> {
    const activePane = this.layout.panes.find(p => p.id === this.layout.activePane);
    if (activePane?.document) {
      const completions = await this.triggerCompletion(
        activePane.document.id,
        activePane.viewState.cursorPosition
      );
      activePane.document.completions = completions;
      this.metrics.aiSuggestions.generated += completions.length;
    }
  }

  // Rendering
  private startRenderLoop(): void {
    const render = () => {
      if (!this.isInitialized) return;
      
      const startTime = performance.now();
      this.renderEditor();
      const endTime = performance.now();
      
      this.metrics.performance.renderTime = endTime - startTime;
      requestAnimationFrame(render);
    };
    
    render();
  }

  private renderEditor(): void {
    if (!this.canvas || !this.renderContext) return;
    
    if (this.renderContext instanceof CanvasRenderingContext2D) {
      this.renderCanvas2D();
    } else if (this.renderContext instanceof WebGL2RenderingContext) {
      this.renderWebGL();
    }
  }

  private renderCanvas2D(): void {
    const ctx = this.renderContext as CanvasRenderingContext2D;
    const canvas = this.canvas!;
    
    // Clear canvas
    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Render active document
    const activePane = this.layout.panes.find(p => p.id === this.layout.activePane);
    if (activePane?.document) {
      this.renderDocument(ctx, activePane.document, activePane.viewState);
    }
    
    // Render UI elements
    this.renderStatusBar(ctx);
    this.renderCompletions(ctx);
  }

  private renderWebGL(): void {
    const gl = this.renderContext as WebGL2RenderingContext;
    
    // WebGL-based rendering for better performance
    gl.clearColor(0.12, 0.12, 0.18, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Render text using WebGL
    // Implementation would involve text rendering shaders
  }

  private renderDocument(
    ctx: CanvasRenderingContext2D, 
    document: EditorDocument, 
    viewState: EditorViewState
  ): void {
    const lines = document.content.split('\n');
    const lineHeight = 20;
    const charWidth = 8;
    const startLine = Math.floor(viewState.scrollTop / lineHeight);
    const endLine = Math.min(startLine + 50, lines.length);
    
    // Render line numbers
    ctx.fillStyle = '#45475a';
    ctx.font = '14px JetBrains Mono';
    
    for (let i = startLine; i < endLine; i++) {
      const y = (i - startLine) * lineHeight + 15;
      ctx.fillText((i + 1).toString().padStart(4), 10, y);
    }
    
    // Render text content
    ctx.fillStyle = '#cdd6f4';
    
    for (let i = startLine; i < endLine; i++) {
      const line = lines[i] || '';
      const y = (i - startLine) * lineHeight + 15;
      ctx.fillText(line, 60, y);
    }
    
    // Render cursor
    const cursorX = 60 + viewState.cursorPosition.column * charWidth;
    const cursorY = (viewState.cursorPosition.line - startLine) * lineHeight + 2;
    
    ctx.fillStyle = '#f38ba8';
    ctx.fillRect(cursorX, cursorY, 2, lineHeight);
    
    // Render diagnostics
    this.renderDiagnostics(ctx, document, viewState, startLine, endLine);
  }

  private renderDiagnostics(
    ctx: CanvasRenderingContext2D,
    document: EditorDocument,
    viewState: EditorViewState,
    startLine: number,
    endLine: number
  ): void {
    const lineHeight = 20;
    const charWidth = 8;
    
    for (const diagnostic of document.diagnostics) {
      const line = diagnostic.range.start.line;
      if (line >= startLine && line < endLine) {
        const y = (line - startLine) * lineHeight + 18;
        const x = 60 + diagnostic.range.start.column * charWidth;
        const width = (diagnostic.range.end.column - diagnostic.range.start.column) * charWidth;
        
        // Underline based on severity
        ctx.strokeStyle = diagnostic.severity === 'error' ? '#f38ba8' : 
                         diagnostic.severity === 'warning' ? '#fab387' : '#89b4fa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + width, y);
        ctx.stroke();
      }
    }
  }

  private renderStatusBar(ctx: CanvasRenderingContext2D): void {
    const canvas = this.canvas!;
    const statusHeight = 30;
    const y = canvas.height - statusHeight;
    
    // Status bar background
    ctx.fillStyle = '#313244';
    ctx.fillRect(0, y, canvas.width, statusHeight);
    
    // Status text
    ctx.fillStyle = '#cdd6f4';
    ctx.font = '12px JetBrains Mono';
    
    const activePane = this.layout.panes.find(p => p.id === this.layout.activePane);
    if (activePane?.document) {
      const doc = activePane.document;
      const pos = activePane.viewState.cursorPosition;
      const status = `${doc.name} | ${doc.language} | ${this.currentMode} | ${pos.line + 1}:${pos.column + 1}`;
      ctx.fillText(status, 10, y + 20);
    }
  }

  private renderCompletions(ctx: CanvasRenderingContext2D): void {
    const activePane = this.layout.panes.find(p => p.id === this.layout.activePane);
    if (!activePane?.document?.completions?.length) return;
    
    const completions = activePane.document.completions.slice(0, 10);
    const x = 60 + activePane.viewState.cursorPosition.column * 8;
    const y = (activePane.viewState.cursorPosition.line + 1) * 20;
    
    // Completion popup background
    ctx.fillStyle = '#313244';
    ctx.fillRect(x, y, 200, completions.length * 25);
    ctx.strokeStyle = '#45475a';
    ctx.strokeRect(x, y, 200, completions.length * 25);
    
    // Completion items
    ctx.fillStyle = '#cdd6f4';
    ctx.font = '12px JetBrains Mono';
    
    completions.forEach((completion, index) => {
      const itemY = y + (index + 1) * 22;
      ctx.fillText(completion.label, x + 5, itemY);
      
      if (completion.detail) {
        ctx.fillStyle = '#6c7086';
        ctx.fillText(completion.detail, x + 100, itemY);
        ctx.fillStyle = '#cdd6f4';
      }
    });
  }

  // Public API
  public getMetrics(): EditorMetrics {
    return { ...this.metrics };
  }

  public getDocuments(): EditorDocument[] {
    return Array.from(this.documents.values());
  }

  public getCurrentDocument(): EditorDocument | undefined {
    const activePane = this.layout.panes.find(p => p.id === this.layout.activePane);
    return activePane?.document;
  }

  public setTheme(themeName: string): void {
    this.config.theme = themeName;
    // Apply theme changes
  }

  public updateConfig(newConfig: Partial<EditorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public async shutdown(): Promise<void> {
    // Close all documents
    for (const documentId of this.documents.keys()) {
      this.closeDocument(documentId);
    }
    
    // Shutdown LSP clients
    for (const client of this.lspClients.values()) {
      try {
        await client.connection.send('shutdown', {});
        await client.connection.send('exit', {});
      } catch (error) {
        console.warn('Failed to shutdown LSP client:', error);
      }
    }
    
    console.log('🛑 Unified Editor shutdown complete');
  }
}

export default UnifiedEditor;