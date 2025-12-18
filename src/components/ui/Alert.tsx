import React from 'react';
import { View, ViewProps } from 'react-native';
import { Text } from './Text';

interface AlertProps extends ViewProps {
  /**
   * Alert variant
   */
  variant?: 'info' | 'success' | 'warning' | 'danger';
  /**
   * Alert title
   */
  title?: string;
  /**
   * Alert message
   */
  message: string;
  /**
   * Optional icon
   */
  icon?: React.ReactNode;
}

/**
 * Alert component - Informational message display
 */
export function Alert({
  variant = 'info',
  title,
  message,
  icon,
  className = '',
  ...props
}: AlertProps) {
  const variantStyles = {
    info: 'bg-blue-50 border-blue-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    danger: 'bg-red-50 border-red-200',
  };

  const textColorStyles = {
    info: 'text-blue-900',
    success: 'text-green-900',
    warning: 'text-yellow-900',
    danger: 'text-red-900',
  };

  return (
    <View
      className={`rounded-lg border p-md ${variantStyles[variant]} ${className}`}
      role="alert"
      {...props}
    >
      <View className="flex-row items-start">
        {icon && <View className="mr-sm">{icon}</View>}
        <View className="flex-1">
          {title && (
            <Text variant="body" weight="semibold" className={`mb-1 ${textColorStyles[variant]}`}>
              {title}
            </Text>
          )}
          <Text variant="body" className={textColorStyles[variant]}>
            {message}
          </Text>
        </View>
      </View>
    </View>
  );
}
