import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';

interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: 'default' | 'muted' | 'primary' | 'success' | 'danger';
  children: React.ReactNode;
}

export function Text({
  variant = 'body',
  weight = 'normal',
  color = 'default',
  className = '',
  children,
  ...props
}: TextProps) {
  const variantStyles = {
    h1: 'text-3xl',
    h2: 'text-2xl',
    h3: 'text-xl',
    body: 'text-base',
    caption: 'text-sm',
    label: 'text-xs uppercase tracking-wide',
  };

  const weightStyles = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  const colorStyles = {
    default: 'text-gray-900',
    muted: 'text-gray-500',
    primary: 'text-blue-600',
    success: 'text-green-600',
    danger: 'text-red-600',
  };

  return (
    <RNText
      className={`${variantStyles[variant]} ${weightStyles[weight]} ${colorStyles[color]} ${className}`}
      {...props}
    >
      {children}
    </RNText>
  );
}
