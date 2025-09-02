import type React from 'react';
interface DesignSystemProps {
  children: React.ReactNode;
  className?: string;
}
export declare function DesignSystem({
  children,
  className,
}: DesignSystemProps): import('react/jsx-runtime').JSX.Element;
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}
export declare function Button({
  variant,
  size,
  children,
  onClick,
  disabled,
  className,
}: ButtonProps): import('react/jsx-runtime').JSX.Element;
interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}
export declare function Card({
  children,
  className,
  title,
}: CardProps): import('react/jsx-runtime').JSX.Element;
