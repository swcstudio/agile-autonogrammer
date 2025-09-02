/**
 * Katalyst Animation System
 *
 * Advanced animation utilities and hooks for Aceternity-style effects
 * with performance optimization and accessibility support
 */

import {
  MotionValue,
  type SpringOptions,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDesignSystemStore } from './design-system-store';

// =============================================================================
// ANIMATION CONSTANTS
// =============================================================================

export const ANIMATION_EASINGS = {
  // Aceternity signature easings
  smooth: [0.23, 1, 0.32, 1],
  bounce: [0.68, -0.55, 0.265, 1.55],
  elastic: [0.175, 0.885, 0.32, 1.275],
  expo: [0.87, 0, 0.13, 1],

  // Standard easings
  linear: [0, 0, 1, 1],
  easeIn: [0.4, 0, 1, 1],
  easeOut: [0, 0, 0.2, 1],
  easeInOut: [0.4, 0, 0.2, 1],
} as const;

export const ANIMATION_DURATIONS = {
  instant: 0,
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 700,
  slowest: 1000,
} as const;

export const SPRING_CONFIGS = {
  // Aceternity spring presets
  wobbly: { damping: 10, stiffness: 100 },
  stiff: { damping: 30, stiffness: 400 },
  slow: { damping: 40, stiffness: 80 },
  molasses: { damping: 50, stiffness: 20 },

  // Custom presets
  gentle: { damping: 20, stiffness: 150 },
  snappy: { damping: 25, stiffness: 300 },
  bouncy: { damping: 15, stiffness: 200 },
} as const;

// =============================================================================
// PERFORMANCE UTILITIES
// =============================================================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if device has good GPU performance
 */
export function hasGoodGPU(): boolean {
  if (typeof window === 'undefined') return true;

  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

  if (!gl) return false;

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (!debugInfo) return true; // Assume good if can't detect

  const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

  // Check for known low-end GPUs
  const lowEndGPUs = ['Mali', 'Adreno', 'PowerVR', 'Intel HD', 'Intel UHD'];
  return !lowEndGPUs.some((gpu) => renderer.includes(gpu));
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// =============================================================================
// ANIMATION HOOKS
// =============================================================================

/**
 * Hook for parallax scrolling effects
 */
export function useParallax(offset = 50) {
  const scrollY = useMotionValue(0);
  const y = useTransform(scrollY, [0, 1000], [0, offset]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateScrollY = throttle(() => {
      scrollY.set(window.scrollY);
    }, 16); // ~60fps

    window.addEventListener('scroll', updateScrollY, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollY);
  }, [scrollY]);

  return { scrollY, y };
}

/**
 * Hook for mouse position tracking
 */
export function useMousePosition(elementRef?: React.RefObject<HTMLElement>) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateMousePosition = throttle((e: MouseEvent) => {
      if (elementRef?.current) {
        const rect = elementRef.current.getBoundingClientRect();
        mouseX.set((e.clientX - rect.left) / rect.width);
        mouseY.set((e.clientY - rect.top) / rect.height);
      } else {
        mouseX.set(e.clientX / window.innerWidth);
        mouseY.set(e.clientY / window.innerHeight);
      }
    }, 16);

    const target = elementRef?.current || window;
    target.addEventListener('mousemove', updateMousePosition as any);

    return () => {
      target.removeEventListener('mousemove', updateMousePosition as any);
    };
  }, [mouseX, mouseY, elementRef]);

  return { mouseX, mouseY };
}

/**
 * Hook for tilt effect on hover
 */
export function useTilt(maxTilt = 15, springConfig?: SpringOptions) {
  const { mouseX, mouseY } = useMousePosition();

  const rotateX = useSpring(
    useTransform(mouseY, [0, 1], [maxTilt, -maxTilt]),
    springConfig || SPRING_CONFIGS.gentle
  );

  const rotateY = useSpring(
    useTransform(mouseX, [0, 1], [-maxTilt, maxTilt]),
    springConfig || SPRING_CONFIGS.gentle
  );

  const reset = useCallback(() => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  }, [mouseX, mouseY]);

  return { rotateX, rotateY, reset };
}

/**
 * Hook for magnetic cursor effect
 */
export function useMagneticCursor(strength = 0.3) {
  const elementRef = useRef<HTMLElement>(null);
  const { mouseX, mouseY } = useMousePosition(elementRef);

  const x = useSpring(
    useTransform(mouseX, [0, 1], [-strength * 50, strength * 50]),
    SPRING_CONFIGS.snappy
  );

  const y = useSpring(
    useTransform(mouseY, [0, 1], [-strength * 50, strength * 50]),
    SPRING_CONFIGS.snappy
  );

  return { ref: elementRef, x, y };
}

/**
 * Hook for intersection observer with animation
 */
export function useInView(options: IntersectionObserverInit = { threshold: 0.1 }) {
  const ref = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (!ref.current || typeof window === 'undefined') return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsInView(entry.isIntersecting);
      if (entry.isIntersecting && !hasAnimated) {
        setHasAnimated(true);
      }
    }, options);

    observer.observe(ref.current);

    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [options, hasAnimated]);

  return { ref, isInView, hasAnimated };
}

/**
 * Hook for typewriter effect
 */
export function useTypewriter(text: string, speed = 50, startDelay = 0) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let currentIndex = 0;

    const startTyping = () => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
        timeout = setTimeout(startTyping, speed);
      } else {
        setIsComplete(true);
      }
    };

    timeout = setTimeout(startTyping, startDelay);

    return () => clearTimeout(timeout);
  }, [text, speed, startDelay]);

  return { displayedText, isComplete };
}

/**
 * Hook for count-up animation
 */
export function useCountUp(end: number, duration = 2000, startFrom = 0) {
  const [count, setCount] = useState(startFrom);
  const { hasAnimated, ref } = useInView();

  useEffect(() => {
    if (!hasAnimated) return;

    const startTime = Date.now();
    const endTime = startTime + duration;

    const updateCount = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentCount = Math.floor(startFrom + (end - startFrom) * eased);

      setCount(currentCount);

      if (now < endTime) {
        requestAnimationFrame(updateCount);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(updateCount);
  }, [hasAnimated, end, duration, startFrom]);

  return { count, ref };
}

// =============================================================================
// ANIMATION UTILITIES
// =============================================================================

/**
 * Generate stagger delays for children
 */
export function getStaggerDelay(index: number, baseDelay = 0.05, maxDelay = 0.5): number {
  return Math.min(index * baseDelay, maxDelay);
}

/**
 * Create a gradient animation string
 */
export function createGradientAnimation(colors: string[], duration = 5, size = '400%'): string {
  const gradient = `linear-gradient(90deg, ${colors.join(', ')})`;
  return `
    background: ${gradient};
    background-size: ${size} 100%;
    animation: gradient-shift ${duration}s ease infinite;
  `;
}

/**
 * Get safe animation duration based on user preferences
 */
export function getSafeDuration(duration: number): number {
  const { reducedMotion, animations } = useDesignSystemStore.getState();

  if (!animations || reducedMotion || prefersReducedMotion()) {
    return 0;
  }

  return duration;
}

/**
 * Get safe spring config based on user preferences
 */
export function getSafeSpring(config: SpringOptions): SpringOptions {
  const { reducedMotion, animations } = useDesignSystemStore.getState();

  if (!animations || reducedMotion || prefersReducedMotion()) {
    return { damping: 100, stiffness: 1000 }; // Instant
  }

  return config;
}

// =============================================================================
// ANIMATION PRESETS
// =============================================================================

export const animationPresets = {
  // Entrance animations
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },

  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },

  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },

  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },

  scale: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
  },

  rotate: {
    initial: { opacity: 0, rotate: -10 },
    animate: { opacity: 1, rotate: 0 },
    exit: { opacity: 0, rotate: 10 },
  },

  // Hover animations
  lift: {
    hover: { y: -5, transition: { duration: 0.2 } },
  },

  glow: {
    hover: { scale: 1.02, transition: { duration: 0.2 } },
  },

  tilt: {
    hover: { rotateZ: 2, transition: { duration: 0.2 } },
  },
};

// Add global animation styles
if (typeof window !== 'undefined' && !document.getElementById('katalyst-animations')) {
  const style = document.createElement('style');
  style.id = 'katalyst-animations';
  style.textContent = `
    @keyframes gradient-shift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    
    @keyframes pulse-ring {
      0% { transform: scale(0.8); opacity: 1; }
      100% { transform: scale(1.2); opacity: 0; }
    }
    
    @keyframes meteor {
      0% { transform: rotate(215deg) translateX(0); opacity: 1; }
      70% { opacity: 1; }
      100% { transform: rotate(215deg) translateX(-500px); opacity: 0; }
    }
    
    @keyframes aurora {
      0%, 100% { opacity: 0.3; transform: translateX(-50%) translateY(0); }
      50% { opacity: 0.5; transform: translateX(-50%) translateY(-20px); }
    }
    
    /* Reduced motion overrides */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `;
  document.head.appendChild(style);
}
