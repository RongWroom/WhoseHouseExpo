import React from 'react';
import { View } from 'react-native';
import { Text } from '../ui/Text';
import { SunbeamSurface } from './SunbeamSurface';

interface SunbeamActionTileProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  iconContainerClassName: string;
}

export function SunbeamActionTile({
  icon,
  title,
  subtitle,
  onPress,
  iconContainerClassName,
}: SunbeamActionTileProps) {
  return (
    <SunbeamSurface onPress={onPress} className="flex-1" contentClassName="p-4">
      <View
        className={`w-10 h-10 rounded-full items-center justify-center ${iconContainerClassName}`}
      >
        {icon}
      </View>
      <Text className="text-base font-bold text-[#181811] mt-3">{title}</Text>
      <Text className="text-xs text-[#8C8B5F] mt-1">{subtitle}</Text>
    </SunbeamSurface>
  );
}
