import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

/**
 * Storybook Integration Example
 * Demonstrates component documentation with Storybook in Katalyst
 */

// Example component to be documented
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  children,
  onClick,
}) => {
  const baseStyles = {
    border: 'none',
    borderRadius: '4px',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    fontWeight: 500,
    transition: 'all 0.3s ease',
    opacity: disabled ? 0.6 : 1,
  };
  
  const sizeStyles = {
    small: { padding: '6px 12px', fontSize: '12px' },
    medium: { padding: '10px 20px', fontSize: '14px' },
    large: { padding: '14px 28px', fontSize: '16px' },
  };
  
  const variantStyles = {
    primary: { backgroundColor: '#007bff', color: 'white' },
    secondary: { backgroundColor: '#6c757d', color: 'white' },
    danger: { backgroundColor: '#dc3545', color: 'white' },
    success: { backgroundColor: '#28a745', color: 'white' },
  };
  
  return (
    <button
      style={{
        ...baseStyles,
        ...sizeStyles[size],
        ...variantStyles[variant],
      }}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};

// Storybook meta configuration
export const ButtonMeta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile button component with multiple variants and sizes.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'success'],
      description: 'The visual style variant of the button',
    },
    size: {
      control: 'radio',
      options: ['small', 'medium', 'large'],
      description: 'The size of the button',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
    loading: {
      control: 'boolean',
      description: 'Whether the button is in a loading state',
    },
    children: {
      control: 'text',
      description: 'The content of the button',
    },
  },
};

// Story examples
type Story = StoryObj<typeof ButtonMeta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="success">Success</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      <Button size="small">Small</Button>
      <Button size="medium">Medium</Button>
      <Button size="large">Large</Button>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '10px' }}>
      <Button>Normal</Button>
      <Button disabled>Disabled</Button>
      <Button loading>Loading</Button>
    </div>
  ),
};

// Component showcase
export const StorybookExample: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Storybook Component Documentation</h2>
      
      <div style={{ marginBottom: '30px' }}>
        <h3>Features</h3>
        <ul>
          <li>📚 Interactive component documentation</li>
          <li>🎨 Visual testing and development</li>
          <li>🔍 Component explorer with controls</li>
          <li>📝 Auto-generated documentation</li>
          <li>🧪 Story-based testing</li>
          <li>📱 Responsive viewport testing</li>
        </ul>
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h3>Button Component Showcase</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <h4>Variants</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="success">Success</Button>
          </div>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <h4>Sizes</h4>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Button size="small">Small</Button>
            <Button size="medium">Medium</Button>
            <Button size="large">Large</Button>
          </div>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <h4>States</h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button>Normal</Button>
            <Button disabled>Disabled</Button>
            <Button loading>Loading</Button>
          </div>
        </div>
      </div>
      
      <div>
        <h3>Storybook Configuration</h3>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '4px', overflow: 'auto' }}>
{`// .storybook/main.js
export default {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-links',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};`}
        </pre>
      </div>
    </div>
  );
};

export default StorybookExample;