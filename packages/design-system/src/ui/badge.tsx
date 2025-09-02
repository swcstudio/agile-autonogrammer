'use client';

/**
 * Next.js Badge Component - Katalyst Design System Integration
 *
 * This file now imports and re-exports the shared Katalyst Badge component
 * with optional motion effects for backward compatibility
 */

// Import the shared Katalyst Badge component
export {
  Badge,
  badgeVariants,
  Web3Badge,
  AIBadge,
  BlockchainBadge,
  EnterpriseBadge,
  StatusBadge,
  type BadgeProps,
} from '@katalyst-react/shared/components/ui/Badge';

// Import shared component for enhanced versions
import {
  Badge as KatalystBadge,
  type BadgeProps as KatalystBadgeProps,
} from '@katalyst-react/shared/components/ui/Badge';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import * as React from 'react';

// Enhanced Badge with motion effects (optional)
export interface MotionBadgeProps extends KatalystBadgeProps {
  /**
   * Enable framer-motion animation effects
   */
  enableMotion?: boolean;
}

const MotionBadge = React.forwardRef<HTMLDivElement, MotionBadgeProps>(
  ({ className, enableMotion = false, animated, ...props }, ref) => {
    if (!enableMotion || !animated) {
      return <KatalystBadge ref={ref} className={className} animated={animated} {...props} />;
    }

    return (
      <motion.div
        ref={ref}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="inline-flex"
      >
        <KatalystBadge
          className={className}
          animated={false} // Disable built-in animation since we're using framer-motion
          {...props}
        />
      </motion.div>
    );
  }
);

MotionBadge.displayName = 'MotionBadge';

// Legacy enhanced badge (deprecated - use MotionBadge or shared Badge directly)
const LegacyMotionBadge = MotionBadge;

export { MotionBadge, LegacyMotionBadge, type MotionBadgeProps };

// Default export for convenience
export default KatalystBadge;
