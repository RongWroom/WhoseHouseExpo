import React from 'react';
import { View, ViewProps } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';

interface EmptyStateProps extends ViewProps {
  /**
   * Icon component to display
   */
  icon?: React.ReactNode;
  /**
   * Title text
   */
  title: string;
  /**
   * Description text
   */
  description?: string;
  /**
   * Optional action button
   */
  actionLabel?: string;
  /**
   * Action button handler
   */
  onAction?: () => void;
}

/**
 * EmptyState component - Displayed when lists or views are empty
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
  ...props
}: EmptyStateProps) {
  return (
    <View className={`flex-1 items-center justify-center px-lg py-2xl ${className}`} {...props}>
      {icon && <View className="mb-lg">{icon}</View>}

      <Text variant="h3" weight="semibold" className="text-center mb-sm">
        {title}
      </Text>

      {description && (
        <Text variant="body" color="muted" className="text-center mb-lg max-w-sm">
          {description}
        </Text>
      )}

      {actionLabel && onAction && (
        <Button onPress={onAction} size="md">
          {actionLabel}
        </Button>
      )}
    </View>
  );
}
