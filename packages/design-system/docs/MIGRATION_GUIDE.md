# Migration Guide: Upgrading to Enhanced Design System

## Quick Start

### 1. Update Imports

```tsx
// Before
import { GlowCard, AnimatedButton } from '@/shared/design-system';

// After - Use new Aceternity components
import { AceternityCard, AceternityButton } from '@/shared/design-system';
```

### 2. Component Mapping

| Old Component | New Component | Key Differences |
|--------------|---------------|-----------------|
| `GlowCard` | `AceternityCard` | More variants, better performance |
| `AnimatedButton` | `AceternityButton` | Richer animations, particle effects |
| Direct Aceternity imports | Design System imports | Integrated with theme system |

### 3. Quick Migration Examples

#### Cards
```tsx
// Before
<GlowCard variant="glow" glowColor="#3b82f6">
  Content
</GlowCard>

// After
<AceternityCard 
  variant="glare"
  glow={{ color: '#3b82f6', size: 40, intensity: 0.5 }}
>
  Content
</AceternityCard>
```

#### Buttons
```tsx
// Before
<AnimatedButton variant="shimmer" animation="pulse">
  Click Me
</AnimatedButton>

// After
<AceternityButton 
  variant="shimmer" 
  animation="pulse"
  gradient={{ from: '#3b82f6', to: '#8b5cf6' }}
>
  Click Me
</AceternityButton>
```

## Advanced Migration

### Integrating Existing Aceternity Components

For your 70+ Aceternity UI components in Next.js:

```tsx
// Create a wrapper component
import { useTheme, useAnimations } from '@/shared/design-system';
import { GlareCard as AceternityGlareCard } from '@/components/ui/glare-card';

export function GlareCard(props) {
  const { resolvedTheme } = useTheme();
  const animationsEnabled = useAnimations();
  
  // Apply design system theming
  return (
    <AceternityGlareCard
      {...props}
      className={cn(
        'katalyst-integrated',
        resolvedTheme === 'dark' && 'dark-mode',
        !animationsEnabled && 'reduced-motion',
        props.className
      )}
    />
  );
}
```

### Performance Optimization

```tsx
// Use new performance hooks
import { hasGoodGPU, prefersReducedMotion } from '@/shared/design-system';

export function OptimizedCard({ children, ...props }) {
  const shouldUse3D = hasGoodGPU() && !prefersReducedMotion();
  
  return (
    <AceternityCard
      variant={shouldUse3D ? '3d' : 'glass'}
      {...props}
    >
      {children}
    </AceternityCard>
  );
}
```

### Animation System

```tsx
// Before - Manual animation
const [isHovered, setIsHovered] = useState(false);

// After - Use built-in hooks
const { ref, x, y } = useMagneticCursor(0.3);
const { rotateX, rotateY } = useTilt(15);
```

## Gradual Migration Strategy

### Phase 1: Core Components (Week 1)
1. Replace high-traffic components first
2. Update shared layouts
3. Test in all frameworks

### Phase 2: Feature Components (Week 2)
1. Migrate feature-specific cards
2. Update interactive elements
3. Add new animation hooks

### Phase 3: Polish (Week 3)
1. Fine-tune animations
2. Optimize performance
3. Update documentation

## Breaking Changes

### Removed
- `hoverable` prop - Now automatic based on variant
- `bordered` prop - Use variant system instead
- Direct color props - Use gradient/glow objects

### Changed
- `glowColor` → `glow.color`
- `gradientFrom/To` → `gradient` object
- `enableTilt` → Built into `3d` variant

### Added
- `effects` prop for particles, grid, noise
- `animation.entrance` for entry animations
- `containerClassName` for wrapper styling

## Framework-Specific Notes

### Next.js App Router
```tsx
// Mark interactive components
'use client';

import { AceternityCard } from '@/shared/design-system';
```

### Remix
```tsx
// Lazy load heavy animations
import { lazy } from 'react';
const AceternityCard = lazy(() => 
  import('@/shared/design-system').then(m => ({ default: m.AceternityCard }))
);
```

### Core React
```tsx
// Initialize on mount
import { initializeKatalystDesignSystem } from '@/shared/design-system';

useEffect(() => {
  initializeKatalystDesignSystem({
    animations: true,
    theme: 'system'
  });
}, []);
```

## Troubleshooting

### Issue: Animations not working
```tsx
// Check animation settings
const animationsEnabled = useAnimations();
console.log('Animations enabled:', animationsEnabled);

// Force enable for testing
<DesignSystemProvider forceAnimations={true}>
```

### Issue: Theme not applying
```tsx
// Ensure ThemeProvider is at root
<ThemeProvider>
  <KatalystDesignSystem>
    <App />
  </KatalystDesignSystem>
</ThemeProvider>
```

### Issue: Performance on mobile
```tsx
// Use mobile-optimized variants
const isMobile = useIsMobile();
const variant = isMobile ? 'glass' : '3d';
```

## Getting Help

- Check examples in `/shared/src/design-system/examples/`
- Review component Storybook stories
- Ask in team Slack channel
- Create GitHub issue for bugs

Remember: You don't need to migrate everything at once. Start with high-impact components and gradually adopt the new system.