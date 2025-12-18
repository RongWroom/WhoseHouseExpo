import React from 'react';
import { View, ViewProps } from 'react-native';
import { Text } from './Text';

interface BadgeProps extends ViewProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
}

export function Badge({ variant = 'default', children, className = '', ...props }: BadgeProps) {
  const baseStyles = 'rounded-full px-2.5 py-1 self-start';

  const variantStyles = {
    default: 'bg-gray-100',
    primary: 'bg-blue-100',
    success: 'bg-green-100',
    warning: 'bg-yellow-100',
    danger: 'bg-red-100',
  };

  const textColorStyles = {
    default: 'text-gray-700',
    primary: 'text-blue-700',
    success: 'text-green-700',
    warning: 'text-yellow-700',
    danger: 'text-red-700',
  };

  return (
    <View className={`${baseStyles} ${variantStyles[variant]} ${className}`} {...props}>
      <Text variant="caption" weight="medium" className={textColorStyles[variant]}>
        {children}
      </Text>
    </View>
  );
}
