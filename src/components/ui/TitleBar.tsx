import React from 'react';
import { View, ViewProps } from 'react-native';
import { Text } from './Text';
import { THEME } from '../../lib/theme';

interface TitleBarProps extends ViewProps {
  title: string;
  subtitle?: string;
  accentColor?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export function TitleBar({
  title,
  subtitle,
  accentColor = THEME.colors.background.secondary,
  action,
  children,
  className = '',
  ...props
}: TitleBarProps) {
  return (
    <View className={`bg-white border border-gray-100 px-5 py-5 shadow-sm ${className}`} {...props}>
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text variant="h2" weight="bold">
            {title}
          </Text>
          {subtitle && (
            <Text variant="body" color="muted" className="mt-1">
              {subtitle}
            </Text>
          )}
          {children && <View className="mt-3">{children}</View>}
        </View>
        {action && <View className="pt-1">{action}</View>}
      </View>
      <View className="mt-4 h-1 w-full rounded-full bg-gray-100">
        <View className="h-full rounded-full" style={{ backgroundColor: accentColor }} />
      </View>
    </View>
  );
}
