'use client';

/**
 * Next.js Input Component - Katalyst Design System Integration
 *
 * This file now imports and re-exports the shared Katalyst Input component
 * with optional motion effects for backward compatibility
 */

// Import the shared Katalyst Input component
export {
  Input,
  inputVariants,
  type InputProps,
} from '@katalyst-react/shared/components/ui/Input';

// Import shared component for enhanced versions
import {
  Input as KatalystInput,
  type InputProps as KatalystInputProps,
} from '@katalyst-react/shared/components/ui/Input';

import { cn } from '@/lib/utils';
import { motion, useMotionTemplate, useMotionValue } from 'motion/react';
import * as React from 'react';

// Enhanced Input with motion effects (optional)
export interface MotionInputProps extends KatalystInputProps {
  /**
   * Enable motion hover effects
   */
  enableMotion?: boolean;
  /**
   * Motion hover radius
   */
  motionRadius?: number;
  /**
   * Motion color
   */
  motionColor?: string;
}

const MotionInput = React.forwardRef<HTMLInputElement, MotionInputProps>(
  (
    {
      className,
      enableMotion = false,
      motionRadius = 100,
      motionColor = '#3b82f6',
      containerClassName,
      ...props
    },
    ref
  ) => {
    const [visible, setVisible] = React.useState(false);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }: any) {
      if (!enableMotion) return;

      const { left, top } = currentTarget.getBoundingClientRect();
      mouseX.set(clientX - left);
      mouseY.set(clientY - top);
    }

    if (!enableMotion) {
      return <KatalystInput ref={ref} className={className} {...props} />;
    }

    return (
      <motion.div
        style={{
          background: useMotionTemplate`
            radial-gradient(
              ${visible ? motionRadius + 'px' : '0px'} circle at ${mouseX}px ${mouseY}px,
              ${motionColor},
              transparent 80%
            )
          `,
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className={cn('group/input rounded-lg p-[2px] transition duration-300', containerClassName)}
      >
        <KatalystInput
          ref={ref}
          className={cn('group-hover/input:shadow-none transition duration-400', className)}
          {...props}
        />
      </motion.div>
    );
  }
);

MotionInput.displayName = 'MotionInput';

// Legacy enhanced input (deprecated - use MotionInput or shared Input directly)
const LegacyMotionInput = MotionInput;

export { MotionInput, LegacyMotionInput, type MotionInputProps };

// Default export for convenience
export default KatalystInput;
