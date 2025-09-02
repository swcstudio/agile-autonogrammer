/**
 * SailsJS Integration Example for Katalyst Core
 * 
 * This example demonstrates how to integrate SailsJS backend MVC patterns
 * with Katalyst's superior React 19 frontend framework.
 * 
 * IMPORTANT: This integration preserves Katalyst's superiority:
 * - Frontend: React 19 + TanStack Router + Zustand (Katalyst)
 * - Backend: SailsJS MVC patterns (API service layer)
 * - Bridge: RESTful APIs between layers
 */

import React, { useState, useEffect } from 'react';
import { 
  SailsHealthCheck, 
  SailsRuntimeProvider, 
  useSails, 
  useSailsAPI, 
  useSailsBlueprint,
  useSailsModel, 
  withSails 
} from '../components/SailsRuntimeProvider.tsx';
import { 
  useSailsMutation, 
  useSailsQuery 
} from '../hooks/use-sails.ts';
import type { SailsConfig } from '../integrations/sails.ts';

// Example SailsJS Configuration
const sailsConfig: SailsConfig = {
  // Mode: 'mvp' for full MVC, 'vanilla' for API-only
  mode: 'vanilla', // Start simple with API-only backend service
  role: 'backend-service', // Sails provides backend APIs only
  
  // Core features
  models: {
    directory: 'api/models',
    pattern: '**/*.js',
    waterline: {
      adapters: {
        'sails-disk': 'sails-disk',
        'sails-postgresql': 'sails-postgresql'
      },
      defaultAdapter: 'sails-disk',
      migrations: 'alter'
    }
  },
  controllers: {
    directory: 'api/controllers',
    pattern: '**/*Controller.js',
    blueprintActions: false,
    responseNegotiation: true
  },
  services: {
    directory: 'api/services',
    pattern: '**/*.js',
    globalServices: ['EmailService', 'AuthService']
  },
  
  // Advanced features (optional)
  websockets: {
    adapter: 'memory',
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
    cookie: false
  },
  blueprints: {
    actions: true,
    rest: true,
    shortcuts: false, // Security: disabled
    prefix: '',
    restPrefix: '/api/v1',
    pluralize: true
  },
  security: {
    cors: {
      allRoutes: true,
      allowOrigins: ['http://localhost:20007'], // Katalyst Core
      allowCredentials: true,
      allowRequestMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowRequestHeaders: ['content-type', 'authorization']
    },
    csrf: false,
    clickjacking: {
      enabled: true,
      frameguard: 'deny'
    }
  },
  
  // Database configuration
  datastores: {
    default: {
      adapter: 'sails-disk',
      // For production: use PostgreSQL, MySQL, or MongoDB
      // adapter: 'sails-postgresql',
      // host: 'localhost',
      // port: 5432,
      // user: 'postgres',
      // password: 'password',
      // database: 'katalyst_sails'
    }
  },
  
  // Server configuration
  server: {
    port: 1337,
    host: 'localhost',
    environment: 'development'
  },
  
  // Critical: Katalyst bridge configuration
  katalystBridge: {
    preserveKatalystRouting: true, // Never interfere with Katalyst routing
    apiNamespace: '/api/v1',
    corsConfig: {
      origin: 'http://localhost:20007',
      credentials: true
    },
    frontendUrl: 'http://localhost:20007'
  }
};

// Example User Model (for Sails backend)
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: number;
  updatedAt: number;
}

// Example Product Model (for Sails backend)
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  createdAt: number;
  updatedAt: number;
}

// Component using Sails Model Hook
function UsersList() {
  const { 
    data: users, 
    loading, 
    error, 
    find, 
    create, 
    update, 
    destroy 
  } = useSailsModel<User>('user');

  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'user' as const });

  useEffect(() => {
    // Load users on component mount
    find();
  }, [find]);

  const handleCreateUser = async () => {
    try {
      await create(newUser);
      setNewUser({ name: '', email: '', role: 'user' });
    } catch (err) {
      console.error('Failed to create user:', err);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await destroy(userId);
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  if (loading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Users (via Sails Backend)</h2>
      
      {/* Create User Form */}
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Create New User</h3>
        <input
          type=\"text\"
          placeholder=\"Name\"
          value={newUser.name}
          onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
          style={{ marginRight: '10px', padding: '8px' }}
        />
        <input
          type=\"email\"
          placeholder=\"Email\"
          value={newUser.email}
          onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
          style={{ marginRight: '10px', padding: '8px' }}
        />
        <select
          value={newUser.role}
          onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
          style={{ marginRight: '10px', padding: '8px' }}
        >
          <option value=\"user\">User</option>
          <option value=\"admin\">Admin</option>
        </select>
        <button 
          onClick={handleCreateUser}
          style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Create User
        </button>
      </div>

      {/* Users List */}
      <div>
        {users.map(user => (
          <div key={user.id} style={{ 
            padding: '10px', 
            margin: '10px 0', 
            border: '1px solid #eee', 
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <strong>{user.name}</strong> ({user.email}) - {user.role}
              <br />
              <small>Created: {new Date(user.createdAt).toLocaleDateString()}</small>
            </div>
            <button
              onClick={() => handleDeleteUser(user.id)}
              style={{ 
                padding: '4px 8px', 
                backgroundColor: '#dc3545', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Component using Sails Blueprint Hook (auto-generated REST APIs)
function ProductsManager() {
  const {
    data: products,
    loading,
    error,
    create,
    update,
    delete: deleteProduct
  } = useSailsBlueprint<Product>('product');

  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    inStock: true
  });

  const handleCreateProduct = async () => {
    try {
      await create(newProduct);
      setNewProduct({ name: '', description: '', price: 0, category: '', inStock: true });
    } catch (err) {
      console.error('Failed to create product:', err);
    }
  };

  if (loading) return <div>Loading products...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Products (via Sails Blueprints)</h2>
      
      {/* Create Product Form */}
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Create New Product</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <input
            type=\"text\"
            placeholder=\"Product Name\"
            value={newProduct.name}
            onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
            style={{ padding: '8px' }}
          />
          <input
            type=\"text\"
            placeholder=\"Category\"
            value={newProduct.category}
            onChange={(e) => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
            style={{ padding: '8px' }}
          />
          <textarea
            placeholder=\"Description\"
            value={newProduct.description}
            onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
            style={{ padding: '8px', gridColumn: '1 / -1' }}
          />
          <input
            type=\"number\"
            placeholder=\"Price\"
            value={newProduct.price}
            onChange={(e) => setNewProduct(prev => ({ ...prev, price: Number.parseFloat(e.target.value) || 0 }))}
            style={{ padding: '8px' }}
          />
          <label style={{ display: 'flex', alignItems: 'center', padding: '8px' }}>
            <input
              type=\"checkbox\"
              checked={newProduct.inStock}
              onChange={(e) => setNewProduct(prev => ({ ...prev, inStock: e.target.checked }))}
              style={{ marginRight: '8px' }}
            />
            In Stock
          </label>
        </div>
        <button 
          onClick={handleCreateProduct}
          style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Create Product
        </button>
      </div>

      {/* Products Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {products?.map(product => (
          <div key={product.id} style={{ 
            padding: '15px', 
            border: '1px solid #ddd', 
            borderRadius: '8px',
            backgroundColor: '#f9f9f9'
          }}>
            <h3 style={{ margin: '0 0 10px 0' }}>{product.name}</h3>
            <p style={{ margin: '5px 0' }}>{product.description}</p>
            <p style={{ margin: '5px 0' }}>
              <strong>Price:</strong> ${product.price}
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>Category:</strong> {product.category}
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>Stock:</strong> {product.inStock ? '✅ Available' : '❌ Out of Stock'}
            </p>
            <div style={{ marginTop: '10px' }}>
              <button
                onClick={() => deleteProduct(product.id)}
                style={{ 
                  padding: '4px 8px', 
                  backgroundColor: '#dc3545', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Component using Sails Query Hook
function SailsAPIExample() {
  const { get, post, loading, error } = useSailsAPI();
  
  // Use Sails Query for caching and automatic refetching
  const { data: stats, refetch } = useSailsQuery(
    'dashboard-stats',
    async () => {
      const users = await get('/api/v1/user');
      const products = await get('/api/v1/product');
      
      return {
        totalUsers: users.length,
        totalProducts: products.length,
        lastUpdated: new Date().toISOString()
      };
    },
    {
      staleTime: 30000, // 30 seconds
      refetchOnWindowFocus: true
    }
  );

  const { mutate: createTestData } = useSailsMutation(
    async () => {
      // Create test users
      await post('/api/v1/user', { name: 'Test User', email: 'test@example.com', role: 'user' });
      
      // Create test products
      await post('/api/v1/product', {
        name: 'Test Product',
        description: 'A test product created via Sails API',
        price: 99.99,
        category: 'Test',
        inStock: true
      });
      
      return true;
    },
    {
      onSuccess: () => {
        refetch(); // Refresh stats after creating test data
      }
    }
  );

  return (
    <div style={{ padding: '20px' }}>
      <h2>Sails API Integration Dashboard</h2>
      
      {stats && (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#e9f7ef', 
          border: '1px solid #28a745', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3>Statistics</h3>
          <p><strong>Total Users:</strong> {stats.totalUsers}</p>
          <p><strong>Total Products:</strong> {stats.totalProducts}</p>
          <p><strong>Last Updated:</strong> {new Date(stats.lastUpdated).toLocaleString()}</p>
          <button 
            onClick={() => refetch()}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              marginRight: '10px'
            }}
          >
            Refresh Stats
          </button>
          <button 
            onClick={() => createTestData()}
            disabled={loading}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#ffc107', 
              color: 'black', 
              border: 'none', 
              borderRadius: '4px'
            }}
          >
            {loading ? 'Creating...' : 'Create Test Data'}
          </button>
        </div>
      )}
      
      {error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8d7da', 
          border: '1px solid #dc3545', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {error.message}
        </div>
      )}
    </div>
  );
}

// Main integration status component
function SailsIntegrationStatus() {
  const { isConnected, integration, config } = useSails();
  
  return (
    <div style={{ 
      padding: '15px', 
      backgroundColor: isConnected ? '#d4edda' : '#f8d7da',
      border: `1px solid ${isConnected ? '#c3e6cb' : '#f5c6cb'}`,
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <h3>Sails Integration Status</h3>
      <p><strong>Backend Connection:</strong> {isConnected ? '✅ Connected' : '❌ Disconnected'}</p>
      <p><strong>Frontend Framework:</strong> {integration.frontend} (Superior)</p>
      <p><strong>Backend Framework:</strong> {integration.backend}</p>
      <p><strong>State Management:</strong> {integration.stateManagement} (Katalyst Superior)</p>
      <p><strong>Routing:</strong> {integration.routing} (Katalyst Superior)</p>
      <p><strong>Mode:</strong> {config.mode}</p>
      <p><strong>Role:</strong> {config.role}</p>
      <p><strong>Bridge Mode:</strong> {integration.bridgeMode ? '✅ Active' : '❌ Inactive'}</p>
    </div>
  );
}

// Main Example App Component
export function SailsKatalystExample() {
  return (
    <SailsRuntimeProvider 
      config={sailsConfig}
      onError={(error) => console.error('Sails Runtime Error:', error)}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <h1>🚢 ⚛️ Sails + Katalyst Integration Example</h1>
        
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <strong>🎯 Architecture:</strong> Katalyst (React 19 + TanStack + Zustand) frontend with SailsJS backend MVC API layer.
          <br />
          <strong>✨ Key Principle:</strong> Katalyst remains superior for frontend - Sails only provides backend services.
        </div>
        
        <SailsHealthCheck 
          fallback={
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#f8d7da', 
              border: '1px solid #dc3545', 
              borderRadius: '8px'
            }}>
              <h3>🚢 Sails Backend Required</h3>
              <p>To use this example, start the Sails backend server:</p>
              <code style={{ 
                display: 'block', 
                padding: '10px', 
                backgroundColor: '#f1f1f1', 
                borderRadius: '4px',
                margin: '10px 0'
              }}>
                cd backend && sails lift
              </code>
              <p>The Sails server should run on port 1337 (default).</p>
            </div>
          }
        >
          <SailsIntegrationStatus />
          <SailsAPIExample />
          <UsersList />
          <ProductsManager />
        </SailsHealthCheck>
      </div>
    </SailsRuntimeProvider>
  );
}

// HOC Example - Enhanced component with Sails
const EnhancedUserComponent = withSails<{ title: string }>(({ title, sails }) => {
  return (
    <div>
      <h2>{title}</h2>
      <p>Sails Backend Connected: {sails.isConnected ? 'Yes' : 'No'}</p>
      <p>Integration Mode: {sails.integration.bridgeMode ? 'Bridge' : 'Replace'}</p>
      <p>Frontend: {sails.integration.frontend} (Katalyst Superior)</p>
    </div>
  );
});

export default SailsKatalystExample;