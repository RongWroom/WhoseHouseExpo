import React from 'react';
import { View, Pressable, type ImageSourcePropType } from 'react-native';
import { Bell } from 'lucide-react-native';
import { Avatar } from '../ui/Avatar';
import { Text } from '../ui/Text';

interface SunbeamHeaderProps {
  title: string;
  subtitle: string;
  avatarSource?: ImageSourcePropType;
  initials: string;
  onBellPress: () => void;
  showBellDot?: boolean;
  showStatusDot?: boolean;
}

export function SunbeamHeader({
  title,
  subtitle,
  avatarSource,
  initials,
  onBellPress,
  showBellDot = true,
  showStatusDot = true,
}: SunbeamHeaderProps) {
  return (
    <View className="flex-row items-center justify-between mb-6">
      <View className="flex-row items-center gap-3 flex-1">
        <View className="relative">
          <View className="rounded-full border-2 border-white shadow-sm overflow-hidden">
            <Avatar
              source={avatarSource}
              initials={initials}
              size="sm"
              backgroundColor="bg-foster-carer-500"
            />
          </View>
          {showStatusDot && (
            <View className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          )}
        </View>

        <View>
          <Text className="text-lg font-bold text-[#181811] leading-tight">{title}</Text>
          <Text className="text-xs font-medium text-[#8C8B5F]">{subtitle}</Text>
        </View>
      </View>

      <Pressable
        onPress={onBellPress}
        className="relative w-10 h-10 rounded-full items-center justify-center active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel="Notifications"
      >
        <Bell size={20} color="#181811" />
        {showBellDot && (
          <View className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#F9F506] border border-white" />
        )}
      </Pressable>
    </View>
  );
}
