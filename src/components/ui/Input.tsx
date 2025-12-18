import React from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { Text } from './Text';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({ label, error, helperText, className = '', ...props }: InputProps) {
  const baseStyles = 'border rounded-lg px-4 py-3 text-base';
  const stateStyles = error
    ? 'border-red-500 bg-red-50'
    : 'border-gray-300 bg-white focus:border-blue-500';

  return (
    <View className="w-full">
      {label && (
        <Text variant="label" weight="medium" className="mb-2">
          {label}
        </Text>
      )}
      <TextInput
        className={`${baseStyles} ${stateStyles} ${className}`}
        placeholderTextColor="#9CA3AF"
        {...props}
      />
      {error && (
        <Text variant="caption" color="danger" className="mt-1">
          {error}
        </Text>
      )}
      {helperText && !error && (
        <Text variant="caption" color="muted" className="mt-1">
          {helperText}
        </Text>
      )}
    </View>
  );
}
