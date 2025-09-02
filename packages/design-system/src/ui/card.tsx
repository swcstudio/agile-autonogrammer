'use client';

/**
 * Next.js Card Component - Katalyst Design System Integration
 *
 * This file imports and re-exports the shared Katalyst Card component
 * to ensure consistency across all meta frameworks
 */

// Import the shared Katalyst Card components
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
  type CardProps,
} from '@katalyst-react/shared/components/ui/Card';

// Import for enhanced versions and legacy compatibility
import {
  Card as KatalystCard,
  CardContent as KatalystCardContent,
  CardDescription as KatalystCardDescription,
  CardFooter as KatalystCardFooter,
  CardHeader as KatalystCardHeader,
  type CardProps as KatalystCardProps,
  CardTitle as KatalystCardTitle,
} from '@katalyst-react/shared/components/ui/Card';

// Default exports for convenience
export default KatalystCard;

// Legacy aliases (deprecated - use shared Card components directly)
const LegacyCard = KatalystCard;
const LegacyCardHeader = KatalystCardHeader;
const LegacyCardTitle = KatalystCardTitle;
const LegacyCardDescription = KatalystCardDescription;
const LegacyCardContent = KatalystCardContent;
const LegacyCardFooter = KatalystCardFooter;

export {
  LegacyCard,
  LegacyCardHeader,
  LegacyCardTitle,
  LegacyCardDescription,
  LegacyCardContent,
  LegacyCardFooter,
  type KatalystCardProps as LegacyCardProps,
};
