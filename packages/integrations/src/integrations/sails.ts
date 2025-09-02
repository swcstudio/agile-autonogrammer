export interface SailsConfig {
  mode: 'mvp' | 'vanilla';
  role: 'backend-service' | 'full-stack' | 'api-only';

  // Core Sails features
  models?: boolean | ModelsConfig;
  controllers?: boolean | ControllersConfig;
  policies?: boolean | PoliciesConfig;
  services?: boolean | ServicesConfig;
  helpers?: boolean | HelpersConfig;

  // Advanced features
  websockets?: boolean | WebSocketsConfig;
  blueprints?: boolean | BlueprintsConfig;
  security?: boolean | SecurityConfig;
  i18n?: boolean | I18nConfig;

  // Database configuration
  datastores?: DatastoresConfig;

  // Server configuration
  server?: ServerConfig;

  // Hooks and lifecycle
  hooks?: HooksConfig;

  // Sessions and middleware
  session?: SessionConfig;
  middleware?: MiddlewareConfig;

  // Development and production
  environments?: EnvironmentsConfig;

  // Integration with Katalyst
  katalystBridge?: {
    preserveKatalystRouting: boolean;
    apiNamespace: string;
    corsConfig: any;
    frontendUrl: string;
  };
}

export interface ModelsConfig {
  directory: string;
  pattern: string;
  waterline: {
    adapters: Record<string, string>;
    defaultAdapter: string;
    migrations: 'alter' | 'drop' | 'safe';
  };
}

export interface ControllersConfig {
  directory: string;
  pattern: string;
  blueprintActions: boolean;
  responseNegotiation: boolean;
}

export interface PoliciesConfig {
  directory: string;
  pattern: string;
  globalPolicies: string[];
}

export interface ServicesConfig {
  directory: string;
  pattern: string;
  globalServices: string[];
}

export interface HelpersConfig {
  directory: string;
  pattern: string;
  globalHelpers: string[];
}

export interface WebSocketsConfig {
  adapter: 'memory' | 'redis' | 'socket.io-redis';
  transports: string[];
  allowUpgrades: boolean;
  cookie: any;
}

export interface BlueprintsConfig {
  actions: boolean;
  rest: boolean;
  shortcuts: boolean;
  prefix: string;
  restPrefix: string;
  pluralize: boolean;
}

export interface SecurityConfig {
  cors: {
    allRoutes: boolean;
    allowOrigins: string[];
    allowCredentials: boolean;
    allowRequestMethods: string[];
    allowRequestHeaders: string[];
  };
  csrf: boolean;
  clickjacking: {
    enabled: boolean;
    frameguard: string;
  };
}

export interface I18nConfig {
  locales: string[];
  defaultLocale: string;
  directory: string;
  updateFiles: boolean;
}

export interface DatastoresConfig {
  default: {
    adapter: string;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    ssl?: boolean;
  };
  [key: string]: any;
}

export interface ServerConfig {
  port: number;
  host: string;
  environment: 'development' | 'production' | 'test';
  ssl?: {
    key: string;
    cert: string;
  };
}

export interface HooksConfig {
  grunt: boolean;
  views: boolean;
  blueprints: boolean;
  i18n: boolean;
  moduleloader: boolean;
  request: boolean;
  responses: boolean;
  orm: boolean;
  http: boolean;
  sockets: boolean;
  pubsub: boolean;
  policies: boolean;
  services: boolean;
  security: boolean;
  session: boolean;
  userhooks: boolean;
}

export interface SessionConfig {
  adapter: 'memory' | 'redis' | 'mongo' | 'connect-session-sequelize';
  secret: string;
  name: string;
  rolling: boolean;
  resave: boolean;
  saveUninitialized: boolean;
}

export interface MiddlewareConfig {
  order: string[];
  [key: string]: any;
}

export interface EnvironmentsConfig {
  development: Partial<SailsConfig>;
  production: Partial<SailsConfig>;
  test: Partial<SailsConfig>;
}

// Sails Model Interface
export interface SailsModel {
  identity: string;
  attributes: Record<string, any>;
  tableName?: string;
  primaryKey?: string;
  datastore?: string;
  migrate?: 'alter' | 'drop' | 'safe';
  schema?: boolean;
  beforeCreate?: (values: any, proceed: Function) => void;
  afterCreate?: (record: any, proceed: Function) => void;
  beforeUpdate?: (values: any, proceed: Function) => void;
  afterUpdate?: (record: any, proceed: Function) => void;
  beforeDestroy?: (criteria: any, proceed: Function) => void;
  afterDestroy?: (record: any, proceed: Function) => void;
}

// Sails Controller Interface
export interface SailsController {
  [actionName: string]: (req: any, res: any) => Promise<any> | any;
}

// Sails Service Interface
export interface SailsService {
  [methodName: string]: (...args: any[]) => any;
}

// Sails Policy Interface
export type SailsPolicy = (req: any, res: any, proceed: Function) => any;

// Sails Helper Interface
export interface SailsHelper {
  friendlyName: string;
  description: string;
  inputs: Record<string, any>;
  exits: Record<string, any>;
  fn: (inputs: any, exits: any) => any;
}

export class SailsIntegration {
  private config: SailsConfig;
  private sailsApp: any;
  private models: Map<string, SailsModel> = new Map();
  private controllers: Map<string, SailsController> = new Map();
  private services: Map<string, SailsService> = new Map();
  private policies: Map<string, SailsPolicy> = new Map();
  private helpers: Map<string, SailsHelper> = new Map();
  private hooks: Map<string, any> = new Map();
  private isInitialized = false;

  constructor(config: SailsConfig) {
    this.config = this.normalizeConfig(config);
  }

  private normalizeConfig(config: SailsConfig): SailsConfig {
    return {
      mode: 'vanilla',
      role: 'backend-service',
      models: true,
      controllers: true,
      services: true,
      policies: false,
      helpers: false,
      websockets: false,
      blueprints: false,
      security: true,
      i18n: false,
      ...config,
      // Ensure Katalyst bridge configuration
      katalystBridge: {
        preserveKatalystRouting: true,
        apiNamespace: '/api/v1',
        corsConfig: {
          origin: config.katalystBridge?.frontendUrl || 'http://localhost:20007',
          credentials: true,
        },
        frontendUrl: 'http://localhost:20007',
        ...config.katalystBridge,
      },
      // Default server config
      server: {
        port: 1337,
        host: 'localhost',
        environment: 'development',
        ...config.server,
      },
      // Default datastore config
      datastores: {
        default: {
          adapter: 'sails-disk',
          ...config.datastores?.default,
        },
        ...config.datastores,
      },
    };
  }

  async setupCore() {
    return {
      name: 'sails-core',
      setup: () => ({
        framework: 'sails',
        version: '1.5.0',
        mode: this.config.mode,
        role: this.config.role,
        config: this.config,
        // Core Sails capabilities
        features: {
          mvc: this.config.mode === 'mvp',
          models: !!this.config.models,
          controllers: !!this.config.controllers,
          services: !!this.config.services,
          policies: !!this.config.policies,
          helpers: !!this.config.helpers,
          websockets: !!this.config.websockets,
          blueprints: !!this.config.blueprints,
          orm: true, // Waterline ORM always enabled
          rest: true,
          graphql: false, // Could be added later
        },
        // Integration with Katalyst - VERY IMPORTANT
        katalystIntegration: {
          frontendFramework: 'react',
          stateManagement: 'katalyst-zustand', // Katalyst remains superior
          routing: 'katalyst-tanstack', // Katalyst routing remains superior
          apiLayer: 'sails-backend', // Sails provides backend only
          bridgeMode: true,
        },
      }),
    };
  }

  async setupModels() {
    if (!this.config.models) return null;

    const modelsConfig = typeof this.config.models === 'object' ? this.config.models : {};

    return {
      name: 'sails-models',
      setup: () => ({
        enabled: true,
        config: {
          directory: modelsConfig.directory || 'api/models',
          pattern: modelsConfig.pattern || '**/*.js',
          waterline: {
            adapters: {
              'sails-disk': 'sails-disk',
              'sails-mysql': 'sails-mysql',
              'sails-postgresql': 'sails-postgresql',
              'sails-mongo': 'sails-mongo',
              ...modelsConfig.waterline?.adapters,
            },
            defaultAdapter: modelsConfig.waterline?.defaultAdapter || 'sails-disk',
            migrations: modelsConfig.waterline?.migrations || 'alter',
          },
        },
        // Model discovery and registration
        discovery: {
          directory: modelsConfig.directory || 'api/models',
          pattern: '**/*.{js,ts}',
          ignore: ['**/*.d.ts', '**/*.test.{js,ts}'],
        },
        // Auto-generate REST APIs for models (if blueprints enabled)
        restAPI: this.config.blueprints
          ? {
              prefix: this.config.katalystBridge?.apiNamespace || '/api/v1',
              pluralize: true,
              actions: ['find', 'findOne', 'create', 'update', 'destroy'],
              shortcuts: false, // Disable shortcuts for security
            }
          : false,
      }),
    };
  }

  async setupControllers() {
    if (!this.config.controllers) return null;

    const controllersConfig =
      typeof this.config.controllers === 'object' ? this.config.controllers : {};

    return {
      name: 'sails-controllers',
      setup: () => ({
        enabled: true,
        config: {
          directory: controllersConfig.directory || 'api/controllers',
          pattern: controllersConfig.pattern || '**/*Controller.js',
          blueprintActions: controllersConfig.blueprintActions || false,
          responseNegotiation: controllersConfig.responseNegotiation !== false,
        },
        // Controller discovery
        discovery: {
          directory: controllersConfig.directory || 'api/controllers',
          pattern: '**/*Controller.{js,ts}',
          ignore: ['**/*.d.ts', '**/*.test.{js,ts}'],
        },
        // Route binding - respects Katalyst routing superiority
        routing: {
          mode: 'api-only', // Don't interfere with Katalyst frontend routing
          prefix: this.config.katalystBridge?.apiNamespace || '/api/v1',
          middleware: ['cors', 'security', 'session'],
          katalystBridge: true,
        },
      }),
    };
  }

  async setupServices() {
    if (!this.config.services) return null;

    const servicesConfig = typeof this.config.services === 'object' ? this.config.services : {};

    return {
      name: 'sails-services',
      setup: () => ({
        enabled: true,
        config: {
          directory: servicesConfig.directory || 'api/services',
          pattern: servicesConfig.pattern || '**/*.js',
          globalServices: servicesConfig.globalServices || [],
        },
        // Service discovery
        discovery: {
          directory: servicesConfig.directory || 'api/services',
          pattern: '**/*.{js,ts}',
          ignore: ['**/*.d.ts', '**/*.test.{js,ts}'],
        },
        // Global service injection
        globals: {
          enabled: true,
          services: servicesConfig.globalServices || [],
        },
      }),
    };
  }

  async setupPolicies() {
    if (!this.config.policies) return null;

    const policiesConfig = typeof this.config.policies === 'object' ? this.config.policies : {};

    return {
      name: 'sails-policies',
      setup: () => ({
        enabled: true,
        config: {
          directory: policiesConfig.directory || 'api/policies',
          pattern: policiesConfig.pattern || '**/*.js',
          globalPolicies: policiesConfig.globalPolicies || [],
        },
        // Policy discovery
        discovery: {
          directory: policiesConfig.directory || 'api/policies',
          pattern: '**/*.{js,ts}',
          ignore: ['**/*.d.ts', '**/*.test.{js,ts}'],
        },
        // Policy application order
        order: ['cors', 'security', 'session', ...(policiesConfig.globalPolicies || [])],
      }),
    };
  }

  async setupWebSockets() {
    if (!this.config.websockets) return null;

    const wsConfig = typeof this.config.websockets === 'object' ? this.config.websockets : {};

    return {
      name: 'sails-websockets',
      setup: () => ({
        enabled: true,
        config: {
          adapter: wsConfig.adapter || 'memory',
          transports: wsConfig.transports || ['websocket', 'polling'],
          allowUpgrades: wsConfig.allowUpgrades !== false,
          cookie: wsConfig.cookie || false,
        },
        // Socket.io configuration
        socketio: {
          cors: {
            origin: this.config.katalystBridge?.frontendUrl || 'http://localhost:20007',
            credentials: true,
          },
          transports: wsConfig.transports || ['websocket', 'polling'],
        },
        // Real-time features
        realtime: {
          enabled: true,
          rooms: true,
          resourceful: true,
        },
      }),
    };
  }

  async setupSecurity() {
    if (!this.config.security) return null;

    const securityConfig = typeof this.config.security === 'object' ? this.config.security : {};

    return {
      name: 'sails-security',
      setup: () => ({
        enabled: true,
        config: {
          cors: {
            allRoutes: true,
            allowOrigins: [
              this.config.katalystBridge?.frontendUrl || 'http://localhost:20007',
              'http://localhost:20008', // Remix
              'http://localhost:20009', // Next
            ],
            allowCredentials: true,
            allowRequestMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
            allowRequestHeaders: ['content-type', 'authorization', 'x-requested-with'],
            ...securityConfig.cors,
          },
          csrf: securityConfig.csrf || false,
          clickjacking: {
            enabled: true,
            frameguard: 'deny',
            ...securityConfig.clickjacking,
          },
        },
        // Security middleware order
        middleware: ['cors', 'helmet', 'session', 'bodyParser', 'compress', 'methodOverride'],
      }),
    };
  }

  async setupBlueprints() {
    if (!this.config.blueprints) return null;

    const blueprintsConfig =
      typeof this.config.blueprints === 'object' ? this.config.blueprints : {};

    return {
      name: 'sails-blueprints',
      setup: () => ({
        enabled: true,
        config: {
          actions: blueprintsConfig.actions !== false,
          rest: blueprintsConfig.rest !== false,
          shortcuts: blueprintsConfig.shortcuts || false, // Disabled for security
          prefix: blueprintsConfig.prefix || '',
          restPrefix: blueprintsConfig.restPrefix || '/api/v1',
          pluralize: blueprintsConfig.pluralize !== false,
        },
        // Auto-generated REST API routes
        restAPI: {
          enabled: true,
          prefix: this.config.katalystBridge?.apiNamespace || '/api/v1',
          actions: ['find', 'findOne', 'create', 'update', 'destroy'],
          populate: true,
          select: true,
          where: true,
          limit: true,
          skip: true,
          sort: true,
        },
      }),
    };
  }

  async setupI18n() {
    if (!this.config.i18n) return null;

    const i18nConfig = typeof this.config.i18n === 'object' ? this.config.i18n : {};

    return {
      name: 'sails-i18n',
      setup: () => ({
        enabled: true,
        config: {
          locales: i18nConfig.locales || ['en', 'es', 'fr', 'de'],
          defaultLocale: i18nConfig.defaultLocale || 'en',
          directory: i18nConfig.directory || 'config/locales',
          updateFiles: i18nConfig.updateFiles !== false,
        },
        // Locale file discovery
        discovery: {
          directory: i18nConfig.directory || 'config/locales',
          pattern: '*.json',
        },
        // Request locale detection
        detection: {
          header: 'accept-language',
          query: 'lang',
          cookie: 'locale',
        },
      }),
    };
  }

  async setupServer() {
    const serverConfig = this.config.server || {};

    return {
      name: 'sails-server',
      setup: () => ({
        enabled: true,
        config: {
          port: serverConfig.port || 1337,
          host: serverConfig.host || 'localhost',
          environment: serverConfig.environment || 'development',
          ssl: serverConfig.ssl || false,
        },
        // Express.js configuration
        express: {
          bodyParser: {
            json: { limit: '50mb' },
            urlencoded: { limit: '50mb', extended: true },
          },
          session: {
            secret: process.env.SESSION_SECRET || 'katalyst-sails-secret',
            resave: false,
            saveUninitialized: false,
          },
        },
        // Production optimizations
        production: {
          ssl: true,
          compress: true,
          cache: {
            maxAge: 31557600000,
          },
        },
      }),
    };
  }

  // Generate Sails configuration file
  generateSailsConfig(): string {
    return `/**
 * Sails.js Configuration
 * Generated by Katalyst SailsJS Integration
 * 
 * This configuration bridges Sails.js with Katalyst's superior frontend framework.
 * Sails provides backend MVC patterns while Katalyst handles the React frontend.
 */

module.exports = {
  // Server configuration
  port: ${this.config.server?.port || 1337},
  environment: '${this.config.server?.environment || 'development'}',
  
  // Models and ORM
  models: {
    migrate: '${this.config.models && typeof this.config.models === 'object' ? this.config.models.waterline?.migrations || 'alter' : 'alter'}',
    attributes: {
      createdAt: { type: 'number', autoCreatedAt: true },
      updatedAt: { type: 'number', autoUpdatedAt: true },
      id: { type: 'number', autoIncrement: true }
    },
    dataEncryptionKeys: {
      default: process.env.DEFAULT_DATA_ENCRYPTION_KEY || 'default-key'
    }
  },
  
  // Datastores
  datastores: ${JSON.stringify(this.config.datastores, null, 4)},
  
  // Security and CORS - configured for Katalyst integration
  security: {
    cors: {
      allRoutes: true,
      allowOrigins: [
        '${this.config.katalystBridge?.frontendUrl || 'http://localhost:20007'}', // Katalyst Core
        'http://localhost:20008', // Remix
        'http://localhost:20009'  // Next
      ],
      allowCredentials: true,
      allowRequestMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
      allowRequestHeaders: ['content-type', 'authorization', 'x-requested-with']
    }
  },
  
  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || 'katalyst-sails-session-secret',
    adapter: '${this.config.session?.adapter || 'memory'}',
    name: '${this.config.session?.name || 'sails.sid'}'
  },
  
  // Sockets (WebSockets)
  sockets: {
    adapter: '${this.config.websockets && typeof this.config.websockets === 'object' ? this.config.websockets.adapter || 'memory' : 'memory'}',
    transports: ${JSON.stringify(this.config.websockets && typeof this.config.websockets === 'object' ? this.config.websockets.transports || ['websocket'] : ['websocket'])}
  },
  
  // Blueprints (Auto-generated REST APIs)
  blueprints: {
    actions: ${this.config.blueprints && typeof this.config.blueprints === 'object' ? this.config.blueprints.actions !== false : false},
    rest: ${this.config.blueprints && typeof this.config.blueprints === 'object' ? this.config.blueprints.rest !== false : false},
    shortcuts: false, // Disabled for security
    prefix: '${this.config.katalystBridge?.apiNamespace || '/api/v1'}',
    pluralize: ${this.config.blueprints && typeof this.config.blueprints === 'object' ? this.config.blueprints.pluralize !== false : true}
  },
  
  // Internationalization
  i18n: {
    locales: ${JSON.stringify(this.config.i18n && typeof this.config.i18n === 'object' ? this.config.i18n.locales || ['en'] : ['en'])},
    defaultLocale: '${this.config.i18n && typeof this.config.i18n === 'object' ? this.config.i18n.defaultLocale || 'en' : 'en'}'
  },
  
  // Hooks configuration
  hooks: {
    grunt: false, // Disabled - Katalyst uses RSBuild
    views: ${this.config.mode === 'mvp'}, // Only enable views in MVP mode
    blueprints: ${!!this.config.blueprints},
    i18n: ${!!this.config.i18n},
    orm: true,
    http: true,
    sockets: ${!!this.config.websockets},
    policies: ${!!this.config.policies},
    services: ${!!this.config.services},
    security: ${!!this.config.security},
    session: true
  },
  
  // Custom middleware order
  http: {
    middleware: {
      order: [
        'cookieParser',
        'session',
        'bodyParser',
        'compress',
        'poweredBy',
        'router',
        'www',
        'favicon'
      ]
    }
  },
  
  // Log configuration
  log: {
    level: '${this.config.server?.environment === 'production' ? 'info' : 'debug'}'
  }
};
`;
  }

  // Generate app.js (Sails application entry point)
  generateAppFile(): string {
    return `/**
 * Sails.js Application Entry Point
 * Generated by Katalyst SailsJS Integration
 * 
 * This starts the Sails.js backend server that provides MVC patterns
 * while working alongside Katalyst's superior React 19 frontend.
 */

const Sails = require('sails').constructor;
const sailsApp = new Sails();

// Lift Sails with the configuration
sailsApp.lift({
  // Environment variables
  port: process.env.SAILS_PORT || ${this.config.server?.port || 1337},
  environment: process.env.NODE_ENV || '${this.config.server?.environment || 'development'}',
  
  // Database connection from environment
  datastores: {
    default: {
      adapter: 'sails-disk',
      ...(
        process.env.DATABASE_URL ? {
          adapter: 'sails-postgresql',
          url: process.env.DATABASE_URL
        } : {}
      )
    }
  },
  
  // Production security
  ...(process.env.NODE_ENV === 'production' ? {
    session: {
      adapter: 'connect-redis',
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    },
    sockets: {
      adapter: 'socket.io-redis',
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    }
  } : {})

}, (err) => {
  if (err) {
    console.error('\\n❌ Failed to start Sails backend server:');
    console.error(err);
    process.exit(1);
  }
  
  console.log('\\n🚢 Sails backend server lifted successfully!');
  console.log('\\n⚓ Backend API running at: http://localhost:' + sailsApp.config.port);
  console.log('🔗 Katalyst frontend at: ${this.config.katalystBridge?.frontendUrl || 'http://localhost:20007'}');
  console.log('🌊 Mode: ${this.config.mode.toUpperCase()}');
  console.log('🎯 Role: ${this.config.role}');
  
  if (${!!this.config.blueprints}) {
    console.log('📋 Blueprint APIs available at: ${this.config.katalystBridge?.apiNamespace || '/api/v1'}');
  }
  
  if (${!!this.config.websockets}) {
    console.log('🔌 WebSocket support enabled');
  }
  
  console.log('\\n✨ Katalyst + Sails integration active!\\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\\n🛑 Received SIGTERM, shutting down gracefully...');
  sailsApp.lower(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\\n🛑 Received SIGINT, shutting down gracefully...');
  sailsApp.lower(() => {
    process.exit(0);
  });
});

module.exports = sailsApp;
`;
  }

  // Initialize the complete Sails integration
  async initialize() {
    const integrations = await Promise.all([
      this.setupCore(),
      this.setupModels(),
      this.setupControllers(),
      this.setupServices(),
      this.setupPolicies(),
      this.setupWebSockets(),
      this.setupSecurity(),
      this.setupBlueprints(),
      this.setupI18n(),
      this.setupServer(),
    ]);

    this.isInitialized = true;
    return integrations.filter(Boolean);
  }

  // Runtime management methods
  async startSailsServer() {
    if (!this.sailsApp) {
      const Sails = require('sails').constructor;
      this.sailsApp = new Sails();
    }

    return new Promise((resolve, reject) => {
      this.sailsApp.lift(
        {
          port: this.config.server?.port || 1337,
          environment: this.config.server?.environment || 'development',
        },
        (err: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(this.sailsApp);
          }
        }
      );
    });
  }

  async stopSailsServer() {
    if (this.sailsApp) {
      return new Promise((resolve) => {
        this.sailsApp.lower(() => {
          resolve(true);
        });
      });
    }
    return true;
  }

  // Model management
  registerModel(name: string, model: SailsModel) {
    this.models.set(name, model);
  }

  getModel(name: string): SailsModel | undefined {
    return this.models.get(name);
  }

  // Controller management
  registerController(name: string, controller: SailsController) {
    this.controllers.set(name, controller);
  }

  getController(name: string): SailsController | undefined {
    return this.controllers.get(name);
  }

  // Service management
  registerService(name: string, service: SailsService) {
    this.services.set(name, service);
  }

  getService(name: string): SailsService | undefined {
    return this.services.get(name);
  }

  // Policy management
  registerPolicy(name: string, policy: SailsPolicy) {
    this.policies.set(name, policy);
  }

  getPolicy(name: string): SailsPolicy | undefined {
    return this.policies.get(name);
  }

  // Helper management
  registerHelper(name: string, helper: SailsHelper) {
    this.helpers.set(name, helper);
  }

  getHelper(name: string): SailsHelper | undefined {
    return this.helpers.get(name);
  }

  // CLI commands for Sails development
  getCliCommands() {
    return {
      lift: 'sails lift',
      generate: {
        model: 'sails generate model',
        controller: 'sails generate controller',
        service: 'sails generate service',
        policy: 'sails generate policy',
        helper: 'sails generate helper',
        action: 'sails generate action',
        hook: 'sails generate hook',
        adapter: 'sails generate adapter',
      },
      console: 'sails console',
      version: 'sails version',
      help: 'sails help',
    };
  }

  // Generate MVC file structure
  generateFileStructure() {
    return {
      'api/models': 'Waterline models for data persistence',
      'api/controllers': 'Controller actions for handling requests',
      'api/services': 'Reusable business logic services',
      'api/policies': 'Security and access control policies',
      'api/helpers': 'Utility functions and helpers',
      'api/hooks': 'Custom Sails hooks for extending functionality',
      'config/routes.js': 'Route configuration mapping URLs to actions',
      'config/policies.js': 'Policy configuration for protecting routes',
      'config/datastores.js': 'Database connection configuration',
      'config/models.js': 'Global model settings',
      'config/security.js': 'Security settings including CORS',
      'config/session.js': 'Session configuration',
      'config/sockets.js': 'WebSocket configuration',
      'config/blueprints.js': 'Auto-generated REST API configuration',
      'config/i18n.js': 'Internationalization settings',
      'config/env/development.js': 'Development environment settings',
      'config/env/production.js': 'Production environment settings',
      'config/locales': 'Translation files for i18n',
      views: 'View templates (if using MVP mode)',
      assets: 'Static assets (if using MVP mode)',
      tasks: 'Grunt tasks for asset compilation (if enabled)',
      'app.js': 'Application entry point',
      '.sailsrc': 'Sails configuration file',
    };
  }

  // Helper methods for common Sails patterns
  createRESTController(modelName: string): SailsController {
    return {
      find: async (req, res) => {
        try {
          const records = await sails.models[modelName].find(req.allParams());
          return res.json(records);
        } catch (err) {
          return res.serverError(err);
        }
      },
      findOne: async (req, res) => {
        try {
          const record = await sails.models[modelName].findOne({ id: req.param('id') });
          if (!record) {
            return res.notFound();
          }
          return res.json(record);
        } catch (err) {
          return res.serverError(err);
        }
      },
      create: async (req, res) => {
        try {
          const record = await sails.models[modelName].create(req.allParams()).fetch();
          return res.json(record);
        } catch (err) {
          return res.serverError(err);
        }
      },
      update: async (req, res) => {
        try {
          const record = await sails.models[modelName]
            .updateOne({ id: req.param('id') })
            .set(req.allParams());
          if (!record) {
            return res.notFound();
          }
          return res.json(record);
        } catch (err) {
          return res.serverError(err);
        }
      },
      destroy: async (req, res) => {
        try {
          const record = await sails.models[modelName].destroyOne({ id: req.param('id') });
          if (!record) {
            return res.notFound();
          }
          return res.json(record);
        } catch (err) {
          return res.serverError(err);
        }
      },
    };
  }

  createBasicModel(attributes: Record<string, any>): SailsModel {
    return {
      identity: '',
      attributes: {
        ...attributes,
        createdAt: { type: 'number', autoCreatedAt: true },
        updatedAt: { type: 'number', autoUpdatedAt: true },
      },
      datastore: 'default',
      migrate: 'alter',
    };
  }

  // Status and health checks
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      sailsApp: !!this.sailsApp,
      mode: this.config.mode,
      role: this.config.role,
      features: {
        models: this.models.size,
        controllers: this.controllers.size,
        services: this.services.size,
        policies: this.policies.size,
        helpers: this.helpers.size,
      },
      katalystBridge: this.config.katalystBridge,
    };
  }
}
