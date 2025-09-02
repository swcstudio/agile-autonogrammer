'use client';

/**
 * Next.js Button Component - Katalyst Design System Integration
 *
 * This file now imports and re-exports the shared Katalyst Button component
 * to ensure consistency across all meta frameworks while maintaining
 * backward compatibility with existing Next.js code.
 */

// Import the shared Katalyst Button component
export {
  Button,
  buttonVariants,
  type ButtonProps,
} from '@katalyst-react/shared/components/ui/Button';

// Import for legacy compatibility
import {
  Button as KatalystButton,
  type ButtonProps as KatalystButtonProps,
  buttonVariants as katalystButtonVariants,
} from '@katalyst-react/shared/components/ui/Button';

// Legacy aliases (deprecated - use shared Button directly)
const LegacyButton = KatalystButton;
const legacyButtonVariants = katalystButtonVariants;

export { LegacyButton, legacyButtonVariants, type KatalystButtonProps as LegacyButtonProps };

// Default export for convenience
export default KatalystButton;
