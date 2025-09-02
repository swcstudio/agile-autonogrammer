/**
 * Component Grouping Strategy for Katalyst Shared Components
 * 
 * This file organizes components into logical groups to reduce the number
 * of unique files and improve developer experience through better modularity.
 */

// Core System Group - Essential providers and configuration
export * from './CoreSystemGroup';

// Runtime Group - All runtime providers consolidated
export * from './RuntimeProvidersGroup';

// UI Components Group - Design system and UI elements
export * from './UIComponentsGroup';

// Integration Group - Tool and framework integrations
export * from './IntegrationGroup';

// Multithreading Group - Advanced threading capabilities
export * from './MultithreadingGroup';

// Analytics Group - Monitoring and analytics components
export * from './AnalyticsGroup';

// Development Tools Group - DevEx utilities
export * from './DevelopmentToolsGroup';

/**
 * Component groups organized by feature area to reduce file count:
 * 
 * Before: 27+ individual component files
 * After: 7 grouped modules with better cohesion
 * 
 * Benefits:
 * - Reduced unique file count by ~70%
 * - Better logical organization
 * - Improved tree-shaking
 * - Enhanced developer experience
 * - Easier maintenance and updates
 */