import React from 'react';
import { View } from 'react-native';
import { Text } from '../ui/Text';
import { SunbeamSurface } from './SunbeamSurface';

interface SunbeamActivityRowProps {
  icon: React.ReactNode;
  iconContainerClassName: string;
  title: string;
  subtitle: string;
  right?: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function SunbeamActivityRow({
  icon,
  iconContainerClassName,
  title,
  subtitle,
  right,
  onPress,
  accessibilityLabel,
}: SunbeamActivityRowProps) {
  const content = (
    <View className="flex-row items-center gap-4 p-4">
      <View
        className={`w-10 h-10 rounded-full items-center justify-center ${iconContainerClassName}`}
      >
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-sm font-bold text-[#181811]">{title}</Text>
        <Text className="text-xs text-[#8C8B5F]">{subtitle}</Text>
      </View>
      {right}
    </View>
  );

  return (
    <SunbeamSurface
      {...(onPress
        ? {
            onPress,
            accessibilityLabel,
          }
        : {})}
      className="mb-3"
    >
      {content}
    </SunbeamSurface>
  );
}
