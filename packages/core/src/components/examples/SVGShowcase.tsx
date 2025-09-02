/**
 * SVG Showcase - Demonstration of SVGR Integration
 *
 * Shows various ways to use SVG files with SVGR, including:
 * - Direct imports as React components
 * - Icon component system
 * - Custom styling and theming
 * - Accessibility features
 */

import { motion } from 'framer-motion';
import type React from 'react';
import { useState } from 'react';
import { cn } from '../../utils';

import ArrowRight from '../../assets/icons/arrow-right.svg';
import Check from '../../assets/icons/check.svg';
import Heart from '../../assets/icons/heart.svg';
// Direct SVG imports (SVGR transforms these to React components)
import KatalystLogo from '../../assets/icons/katalyst-logo.svg';
import Star from '../../assets/icons/star.svg';

// Icon component system
import { Icon, type IconName, availableIcons } from '../ui/Icon';

export interface SVGShowcaseProps {
  className?: string;
}

export const SVGShowcase: React.FC<SVGShowcaseProps> = ({ className }) => {
  const [selectedColor, setSelectedColor] = useState('#165DFF');
  const [selectedSize, setSelectedSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [isAnimated, setIsAnimated] = useState(false);

  const colors = [
    { name: 'Primary', value: '#165DFF' },
    { name: 'Success', value: '#00B42A' },
    { name: 'Warning', value: '#FF7D00' },
    { name: 'Error', value: '#F53F3F' },
    { name: 'Purple', value: '#722ED1' },
  ];

  return (
    <div className={cn('space-y-8 p-6', className)}>
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">SVGR Integration Showcase</h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Demonstration of SVG files transformed into React components using SVGR. All icons are
          optimized, accessible, and fully customizable.
        </p>
      </div>

      {/* Direct SVG Usage */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Direct SVG Imports</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Import SVG files directly as React components with full TypeScript support.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="text-center">
            <KatalystLogo
              className="mx-auto mb-2 hover:scale-110 transition-transform"
              style={{ color: selectedColor }}
            />
            <code className="text-xs">KatalystLogo</code>
          </div>

          <div className="text-center">
            <ArrowRight
              className="mx-auto mb-2 hover:scale-110 transition-transform"
              style={{ color: selectedColor }}
            />
            <code className="text-xs">ArrowRight</code>
          </div>

          <div className="text-center">
            <Heart
              className="mx-auto mb-2 hover:scale-110 transition-transform hover:fill-current"
              style={{ color: selectedColor }}
            />
            <code className="text-xs">Heart</code>
          </div>

          <div className="text-center">
            <Star
              className="mx-auto mb-2 hover:scale-110 transition-transform hover:fill-current"
              style={{ color: selectedColor }}
            />
            <code className="text-xs">Star</code>
          </div>

          <div className="text-center">
            <Check
              className="mx-auto mb-2 hover:scale-110 transition-transform"
              style={{ color: selectedColor }}
            />
            <code className="text-xs">Check</code>
          </div>
        </div>
      </section>

      {/* Icon Component System */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Icon Component System</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Use the unified Icon component for consistent sizing, theming, and accessibility.
        </p>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div>
            <label className="block text-sm font-medium mb-2">Color:</label>
            <div className="flex gap-2">
              {colors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className={cn(
                    'w-8 h-8 rounded-full border-2 transition-all',
                    selectedColor === color.value
                      ? 'border-gray-900 dark:border-white scale-110'
                      : 'border-gray-300 dark:border-gray-600'
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Size:</label>
            <div className="flex gap-2">
              {(['sm', 'md', 'lg'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={cn(
                    'px-3 py-1 rounded text-sm transition-colors',
                    selectedSize === size
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Animation:</label>
            <button
              onClick={() => setIsAnimated(!isAnimated)}
              className={cn(
                'px-3 py-1 rounded text-sm transition-colors',
                isAnimated
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              )}
            >
              {isAnimated ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        {/* Icon Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          {availableIcons.map((iconName) => (
            <motion.div
              key={iconName}
              className="text-center"
              animate={isAnimated ? { rotate: [0, 5, -5, 0] } : {}}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            >
              <Icon
                name={iconName}
                size={selectedSize}
                className="mx-auto mb-2 hover:scale-110 transition-transform"
                style={{ color: selectedColor }}
                title={`${iconName} icon`}
              />
              <code className="text-xs">{iconName}</code>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Advanced Features */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Advanced Features</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Accessibility */}
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-medium mb-2">Accessibility</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              All icons include proper ARIA attributes and can be used with screen readers.
            </p>
            <div className="space-y-2">
              <Icon
                name="check"
                size="md"
                className="text-green-500"
                title="Task completed successfully"
                aria-label="Completion status indicator"
              />
              <p className="text-xs">
                <code>title="Task completed successfully"</code>
                <br />
                <code>aria-label="Completion status indicator"</code>
              </p>
            </div>
          </div>

          {/* Theming */}
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-medium mb-2">CSS Theming</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Icons inherit text color and can be styled with CSS classes.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon name="heart" className="text-red-500 hover:fill-current" />
                <code className="text-xs">text-red-500 hover:fill-current</code>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="star" className="text-yellow-500 hover:fill-current" />
                <code className="text-xs">text-yellow-500 hover:fill-current</code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage Examples</h2>

        <div className="grid gap-4">
          <div className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto">
            <h3 className="text-sm font-medium mb-2 text-gray-300">Direct Import</h3>
            <pre className="text-sm">
              {`import Logo from './assets/icons/katalyst-logo.svg';

function Header() {
  return (
    <Logo 
      className="w-8 h-8 text-blue-500"
      title="Katalyst Logo"
    />
  );
}`}
            </pre>
          </div>

          <div className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto">
            <h3 className="text-sm font-medium mb-2 text-gray-300">Icon Component</h3>
            <pre className="text-sm">
              {`import { Icon } from '@katalyst/shared';

function Button() {
  return (
    <button>
      Get Started
      <Icon 
        name="arrow-right" 
        size="sm" 
        className="ml-2"
      />
    </button>
  );
}`}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
};
