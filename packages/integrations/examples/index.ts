/**
 * Katalyst Integration Examples
 * 
 * This directory contains comprehensive examples for all integrations
 * supported by the Katalyst framework.
 */

// UI Frameworks & Libraries
export { ArcoExample } from './arco-example';
export { TailwindExample } from './tailwind-example';
export { StorybookExample } from './storybook-example';

// State Management
export { ZustandExample } from './zustand-example';

// Data Fetching
export { TanStackExample } from './tanstack-example';

// Authentication
export { ClerkExample } from './clerk-example';

// Build Tools & Bundlers
export { RspackExample } from './rspack-example';
export { EmpExample } from './emp-example';

// Testing
export { PlaywrightExample } from './playwright-example';

// Component Development
export { InspectorExample } from './inspector-example';

// Advanced Features
export { TapableExample } from './tapable-example';
export { TypiaExample } from './typia-example';
export { SailsExample } from './sails-example';

// Example categories for documentation
export const exampleCategories = {
  'UI & Styling': ['arco', 'tailwind', 'storybook'],
  'State Management': ['zustand'],
  'Data Fetching': ['tanstack'],
  'Authentication': ['clerk'],
  'Build Tools': ['rspack', 'emp', 'umi', 'nx', 'repack', 'zephyr'],
  'Testing': ['playwright'],
  'Developer Tools': ['inspector', 'tapable'],
  'Type Safety': ['typia'],
  'Mobile & XR': ['webxr', 'sails'],
  'Performance': ['multithreading', 'rspeedy'],
  'Code Quality': ['biome', 'esmx'],
  'Module Systems': ['cosmos', 'virtual-modules'],
  'Backend Integration': ['nitro', 'pareto'],
  'Asset Management': ['asset-manifest', 'svgr'],
  'Development Features': ['fast-refresh', 'ngrok'],
  'CSS Solutions': ['stylex'],
};

// Helper function to load example dynamically
export async function loadExample(name: string) {
  try {
    const module = await import(`./${name}-example`);
    return module.default || module[`${name.charAt(0).toUpperCase()}${name.slice(1)}Example`];
  } catch (error) {
    console.error(`Failed to load example for ${name}:`, error);
    return null;
  }
}