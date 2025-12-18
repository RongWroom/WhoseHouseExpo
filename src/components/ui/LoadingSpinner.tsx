import React from 'react';
import { ActivityIndicator, View, ViewProps } from 'react-native';
import { Text } from './Text';

interface LoadingSpinnerProps extends ViewProps {
  /**
   * Size of the spinner
   */
  size?: 'small' | 'large';
  /**
   * Color of the spinner (defaults to primary blue)
   */
  color?: string;
  /**
   * Optional loading message
   */
  message?: string;
  /**
   * Center the spinner in the container
   */
  centered?: boolean;
}

/**
 * LoadingSpinner component - Accessible loading indicator
 */
export function LoadingSpinner({
  size = 'large',
  color = '#007AFF',
  message,
  centered = true,
  className = '',
  ...props
}: LoadingSpinnerProps) {
  const containerClass = centered
    ? 'flex-1 items-center justify-center'
    : 'items-center justify-center';

  return (
    <View
      className={`${containerClass} ${className}`}
      accessibilityLabel={message || 'Loading'}
      accessibilityRole="progressbar"
      {...props}
    >
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Text variant="body" color="muted" className="mt-md text-center">
          {message}
        </Text>
      )}
    </View>
  );
}
