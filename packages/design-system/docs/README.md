# Katalyst Design Token System

A comprehensive, framework-agnostic design token system for SWC Studio's marketing platform. Provides unified theming across Core React, Next.js, and Remix applications while keeping component architectures separate.

## 🎯 Philosophy

**"Unified tokens, separate components"** - We maintain consistent visual design through shared tokens while allowing each framework to implement components optimally for their specific use cases.

## 📚 Table of Contents

- [Quick Start](#quick-start)
- [Token Architecture](#token-architecture)
- [Theme System](#theme-system)
- [Framework Integration](#framework-integration)
- [Component Tokens](#component-tokens)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)
- [Migration Guide](#migration-guide)

## 🚀 Quick Start

### Installation

The design system is already included in your shared package. Import what you need:

```typescript
import { 
  ThemeProvider, 
  useTheme, 
  primitiveTokens, 
  semanticTokens 
} from '@/shared/design-system';
```

### Basic Setup

```tsx
// app.tsx - Wrap your app with ThemeProvider
import { ThemeProvider } from '@/shared/design-system';

function App() {
  return (
    <ThemeProvider defaultTheme="system" framework="nextjs">
      <YourApp />
    </ThemeProvider>
  );
}
```

### CSS Import

```css
/* Import base theme styles */
@import '@/shared/design-system/themes.css';
```

## 🏗️ Token Architecture

### Primitive Tokens (Base Values)

Raw design values that rarely change:

```typescript
primitiveTokens.colors.neutral[500]     // "215 16% 57%"
primitiveTokens.spacing[4]              // "1rem"  
primitiveTokens.typography.fontSize.lg  // { size: "1.125rem", lineHeight: "1.75rem" }
primitiveTokens.borderRadius.md         // "0.375rem"
```

### Semantic Tokens (Contextual)

Purpose-driven tokens that reference CSS variables:

```typescript
semanticTokens.color.text.primary       // "var(--katalyst-color-text-primary)"
semanticTokens.color.background.primary // "var(--katalyst-color-background)"
semanticTokens.component.button.padding // "var(--katalyst-component-button-padding-x)"
```

### Token Hierarchy

```
Primitive Tokens (Raw values)
    ↓
CSS Custom Properties (--katalyst-*)
    ↓  
Semantic Tokens (var() references)
    ↓
Component Usage
```

## 🎨 Theme System

### Supported Themes

- **Light** - Default light theme
- **Dark** - Dark theme with high contrast
- **System** - Automatically follows OS preference

### Theme Variables

All themes use CSS custom properties with the `--katalyst-` prefix:

```css
:root {
  --katalyst-color-background: hsl(0 0% 100%);
  --katalyst-color-text-primary: hsl(222 84% 5%);
  --katalyst-component-button-border-radius: 0.375rem;
}

[data-theme="dark"] {
  --katalyst-color-background: hsl(222 84% 5%);
  --katalyst-color-text-primary: hsl(0 0% 100%);
}
```

### Using the Theme System

```tsx
import { useTheme, ThemeToggle } from '@/shared/design-system';

function MyComponent() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  
  return (
    <div>
      <p>Current theme: {theme}</p>
      <p>Resolved to: {resolvedTheme}</p>
      <ThemeToggle />
      <button onClick={() => setTheme('dark')}>Force Dark</button>
    </div>
  );
}
```

## ⚙️ Framework Integration

### Next.js Setup

```tsx
// _app.tsx or layout.tsx
import { ThemeProvider } from '@/shared/design-system';
import '@/shared/design-system/themes.css';

export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider 
          defaultTheme="system" 
          framework="nextjs"
          storageKey="swc-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Remix Setup

```tsx
// root.tsx
import { ThemeProvider } from '@/shared/design-system';
import themeStyles from '@/shared/design-system/themes.css';

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: themeStyles },
];

export default function App() {
  return (
    <html>
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <ThemeProvider defaultTheme="system" framework="remix">
          <Outlet />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
```

### Core React Setup

```tsx
// main.tsx
import { ThemeProvider } from '@/shared/design-system';
import '@/shared/design-system/themes.css';

function App() {
  return (
    <ThemeProvider defaultTheme="system" framework="core">
      <Router />
    </ThemeProvider>
  );
}
```

### Tailwind Integration

Generate Tailwind config from tokens:

```typescript
// tailwind.config.ts
import { toTailwindConfig } from '@/shared/design-system';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: toTailwindConfig('nextjs'), // or 'core', 'remix'
  },
  plugins: [],
};
```

## 🧩 Component Tokens

### Button Tokens

```css
--katalyst-component-button-border-radius: 0.375rem;
--katalyst-component-button-font-size: 0.875rem;
--katalyst-component-button-font-weight: 500;
--katalyst-component-button-padding-x: 1rem;
--katalyst-component-button-padding-y: 0.5rem;
--katalyst-component-button-min-height: 2.5rem;
```

### Card Tokens

```css
--katalyst-component-card-border-radius: 0.5rem;
--katalyst-component-card-padding: 1.5rem;
--katalyst-component-card-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
--katalyst-component-card-background: hsl(0 0% 100%);
--katalyst-component-card-border: 1px solid hsl(214 13% 91%);
```

### Input Tokens

```css
--katalyst-component-input-border-radius: 0.375rem;
--katalyst-component-input-font-size: 0.875rem;
--katalyst-component-input-padding-x: 0.75rem;
--katalyst-component-input-padding-y: 0.5rem;
--katalyst-component-input-min-height: 2.5rem;
```

## 💡 Usage Examples

### Creating a Custom Component

```tsx
// Using semantic tokens
import { semanticTokens } from '@/shared/design-system';

const CustomButton = styled.button`
  background: ${semanticTokens.color.interactive.primary.default};
  color: ${semanticTokens.color.text.inverse};
  border-radius: ${semanticTokens.component.button.borderRadius};
  padding: ${semanticTokens.component.button.paddingY} ${semanticTokens.component.button.paddingX};
  
  &:hover {
    background: ${semanticTokens.color.interactive.primary.hover};
  }
`;
```

### Using CSS Custom Properties

```css
.my-button {
  background: var(--katalyst-color-interactive-primary);
  color: var(--katalyst-color-text-inverse);
  border-radius: var(--katalyst-component-button-border-radius);
  padding: var(--katalyst-component-button-padding-y) var(--katalyst-component-button-padding-x);
  min-height: var(--katalyst-component-button-min-height);
  
  transition: all var(--katalyst-animation-duration-fast) var(--katalyst-animation-easing-ease);
}

.my-button:hover {
  background: var(--katalyst-color-interactive-primary-hover);
}
```

### Using Utility Classes

```tsx
function MyComponent() {
  return (
    <div className="katalyst-card">
      <h2 className="katalyst-text-primary">Title</h2>
      <p className="katalyst-text-secondary">Description</p>
      <button className="katalyst-button katalyst-animate-fadeIn">
        Action
      </button>
    </div>
  );
}
```

### Responsive Design

```css
.my-component {
  padding: var(--katalyst-layout-container-padding);
  max-width: var(--katalyst-layout-container-max-width);
  margin: 0 auto;
}

@media (min-width: 768px) {
  .my-component {
    --katalyst-layout-container-padding: 2rem;
  }
}
```

### Animation Utilities

```tsx
import { animationPresets, generateKeyframes } from '@/shared/design-system';

// Use predefined animations
<div className="katalyst-animate-fadeIn">Fade in content</div>
<div className="katalyst-animate-slideUp">Slide up content</div>

// Or generate custom keyframes
const slideLeftKeyframes = generateKeyframes('slideUp');
```

## 📖 API Reference

### ThemeProvider Props

```typescript
interface ThemeProviderProps {
  defaultTheme?: 'light' | 'dark' | 'system';
  storageKey?: string;                    // Default: 'katalyst-theme'
  disableTransitions?: boolean;          // Default: false
  themeOverrides?: Record<string, string>;
  framework?: 'core' | 'nextjs' | 'remix';
  debug?: boolean;                       // Default: false
  children: ReactNode;
}
```

### useTheme Hook

```typescript
interface ThemeContextValue {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  systemPrefersDark: boolean;
  framework: Framework;
  themeVars: Record<string, string>;
  refreshTheme: () => void;
}
```

### Utility Functions

```typescript
// Generate CSS for a theme
generateThemeCSS(theme: 'light' | 'dark'): string

// Create CSS variable reference
cssVar(name: string, fallback?: string): string

// Get component-specific tokens
getComponentTokens(component: 'button' | 'card' | 'input'): object

// Convert to Tailwind config
toTailwindConfig(framework?: Framework): object

// Validate theme completeness
validateTheme(theme: Record<string, string>): boolean
```

## 🔄 Migration Guide

### From Existing Tailwind Config

1. **Replace hardcoded colors:**
   ```diff
   - className="bg-gray-100 text-gray-900"
   + className="katalyst-bg-secondary katalyst-text-primary"
   ```

2. **Use CSS variables:**
   ```diff
   - background: '#f3f4f6'
   + background: var(--katalyst-color-background-secondary)
   ```

3. **Update component styles:**
   ```diff
   - border-radius: 0.5rem;
   + border-radius: var(--katalyst-component-card-border-radius);
   ```

### From Aceternity UI

The design token system complements your existing Aceternity UI components. Keep your components separate but use Katalyst tokens for consistency:

```tsx
// Aceternity component using Katalyst tokens
const AceternityCard = ({ children }) => (
  <div 
    className="rounded-xl bg-white dark:bg-black border border-neutral-200 dark:border-white/[0.2]"
    style={{
      backgroundColor: 'var(--katalyst-component-card-background)',
      borderColor: 'var(--katalyst-color-border)',
      borderRadius: 'var(--katalyst-component-card-border-radius)',
    }}
  >
    {children}
  </div>
);
```

## 🛠️ Development Tools

### Debug Mode

Enable debug mode to visualize component boundaries:

```tsx
<ThemeProvider debug={true}>
  <App />
</ThemeProvider>
```

### Theme Validation

Validate your custom themes:

```typescript
import { validateTheme, lightTheme } from '@/shared/design-system';

const customTheme = { ...lightTheme, '--my-custom-token': 'blue' };
const isValid = validateTheme(customTheme);
```

### Browser DevTools

Inspect CSS custom properties in DevTools:
1. Open DevTools → Elements
2. Select `<html>` element  
3. Check Computed styles for `--katalyst-*` variables

## 🎨 Customization

### Theme Overrides

```tsx
const customOverrides = {
  '--katalyst-color-interactive-primary': 'hsl(271 81% 56%)', // Purple primary
  '--katalyst-component-button-border-radius': '1rem',       // More rounded buttons
};

<ThemeProvider themeOverrides={customOverrides}>
  <App />
</ThemeProvider>
```

### Custom Animations

```typescript
import { primitiveTokens } from '@/shared/design-system';

const customAnimations = {
  wiggle: {
    keyframes: {
      '0%, 100%': { transform: 'rotate(-3deg)' },
      '50%': { transform: 'rotate(3deg)' },
    },
    duration: primitiveTokens.animation.duration[500],
    easing: primitiveTokens.animation.easing['in-out'],
  },
};
```

## 🔗 Related Documentation

- [Katalyst Framework Guide](../README.md)
- [Component Architecture](../components/README.md)
- [Aceternity UI Integration](../../next/src/components/ui/README.md)
- [Tailwind Configuration](../../../docs/tailwind.md)

## 🆘 Troubleshooting

### Common Issues

**Hydration Mismatch:**
```tsx
// ✅ Correct: Theme provider handles SSR
<ThemeProvider defaultTheme="system">

// ❌ Wrong: Direct theme access before mount
const theme = useTheme(); // May cause hydration issues
```

**Missing CSS Variables:**
```css
/* Ensure themes.css is imported */
@import '@/shared/design-system/themes.css';
```

**TypeScript Errors:**
```typescript
// Ensure proper imports
import type { Theme, Framework } from '@/shared/design-system';
```

### Performance Tips

1. **Use semantic tokens** over primitive tokens in components
2. **Minimize theme overrides** - they disable some optimizations  
3. **Enable theme persistence** to avoid flash of wrong theme
4. **Use CSS custom properties** instead of JavaScript theme switches when possible

---

## 📞 Support

For questions or issues with the design token system:

1. Check this documentation
2. Review existing component implementations
3. Open an issue in the project repository
4. Contact the design system team

**Happy theming! 🎨**