import React from 'react';
import { View, ViewProps } from 'react-native';

interface DividerProps extends ViewProps {
  /**
   * Vertical or horizontal divider
   */
  orientation?: 'horizontal' | 'vertical';
  /**
   * Spacing around divider
   */
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * Divider component - Visual separator
 */
export function Divider({
  orientation = 'horizontal',
  spacing = 'md',
  className = '',
  ...props
}: DividerProps) {
  const spacingStyles = {
    none: '',
    sm: orientation === 'horizontal' ? 'my-sm' : 'mx-sm',
    md: orientation === 'horizontal' ? 'my-md' : 'mx-md',
    lg: orientation === 'horizontal' ? 'my-lg' : 'mx-lg',
  };

  const orientationStyles = orientation === 'horizontal' ? 'h-[1px] w-full' : 'w-[1px] h-full';

  return (
    <View
      className={`bg-gray-200 ${orientationStyles} ${spacingStyles[spacing]} ${className}`}
      {...props}
    />
  );
}
