/**
 * Katalyst PWA Module
 * 
 * A comprehensive Progressive Web App module that intelligently deploys
 * platform-specific applications and provides native app suggestions
 * while maintaining a fully-featured PWA experience.
 */

export * from './core/pwa-manager';
export * from './core/manifest-generator';
export * from './core/service-worker';
export * from './core/install-prompt';
export * from './detection/device-detector';
export * from './detection/capability-checker';
export * from './platforms/mobile-adapter';
export * from './platforms/desktop-adapter';
export * from './platforms/metaverse-adapter';
export * from './bridge/native-bridge';
export * from './bridge/platform-api';
export * from './offline/offline-manager';
export * from './offline/sync-manager';
export * from './notifications/push-manager';
export * from './notifications/notification-handler';
export * from './storage/cache-strategies';
export * from './storage/indexed-db-manager';
export * from './analytics/pwa-analytics';
export * from './utils/pwa-utils';
export * from './types';

// Main PWA initialization
export { initializeKatalystPWA } from './initialize';