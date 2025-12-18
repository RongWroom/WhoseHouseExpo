import React from 'react';
import { View, ViewProps, TouchableOpacity, GestureResponderEvent } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'outlined';
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
}

export function Card({
  variant = 'default',
  children,
  className = '',
  onPress,
  style,
  testID,
  accessibilityLabel,
  ...props
}: CardProps) {
  const baseStyles = 'rounded-lg p-4';

  const variantStyles = {
    default: 'bg-white',
    elevated: 'bg-white shadow-md',
    outlined: 'bg-white border border-gray-200',
  };

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${className}`;

  if (onPress) {
    return (
      <TouchableOpacity
        className={combinedClassName}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={style}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View
      className={combinedClassName}
      style={style}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      {...props}
    >
      {children}
    </View>
  );
}

export function CardHeader({ children, className = '', ...props }: ViewProps) {
  return (
    <View className={`mb-3 ${className}`} {...props}>
      {children}
    </View>
  );
}

export function CardTitle({
  children,
  className = '',
  ...props
}: ViewProps & { children: React.ReactNode }) {
  return (
    <View className={`${className}`} {...props}>
      {children}
    </View>
  );
}

export function CardContent({ children, className = '', ...props }: ViewProps) {
  return (
    <View className={`${className}`} {...props}>
      {children}
    </View>
  );
}

export function CardFooter({ children, className = '', ...props }: ViewProps) {
  return (
    <View className={`mt-3 ${className}`} {...props}>
      {children}
    </View>
  );
}
