import React from 'react';
import { Pressable, Text, ActivityIndicator, PressableProps } from 'react-native';

interface ButtonProps extends PressableProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'rounded-lg items-center justify-center flex-row';
  const widthStyles = fullWidth ? 'w-full' : '';

  const variantStyles = {
    primary: 'bg-blue-600 active:bg-blue-700',
    secondary: 'bg-gray-600 active:bg-gray-700',
    outline: 'border-2 border-gray-300 bg-transparent active:bg-gray-100',
    ghost: 'bg-transparent active:bg-gray-100',
    danger: 'bg-red-600 active:bg-red-700',
  };

  const sizeStyles = {
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-6 py-4',
  };

  const textVariantStyles = {
    primary: 'text-white font-semibold',
    secondary: 'text-white font-semibold',
    outline: 'text-gray-700 font-semibold',
    ghost: 'text-gray-700 font-semibold',
    danger: 'text-white font-semibold',
  };

  const textSizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const disabledStyles = disabled || loading ? 'opacity-50' : '';

  return (
    <Pressable
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${disabledStyles} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? '#374151' : '#ffffff'}
        />
      ) : (
        <Text className={`${textVariantStyles[variant]} ${textSizeStyles[size]}`}>{children}</Text>
      )}
    </Pressable>
  );
}
