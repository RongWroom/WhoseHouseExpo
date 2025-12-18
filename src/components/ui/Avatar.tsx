import React from 'react';
import { View, Image, ViewProps, ImageSourcePropType } from 'react-native';
import { Text } from './Text';

interface AvatarProps extends ViewProps {
  /**
   * Source for avatar image
   */
  source?: ImageSourcePropType;
  /**
   * Fallback initials if no image
   */
  initials?: string;
  /**
   * Size of avatar
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Background color for initials avatar
   */
  backgroundColor?: string;
}

/**
 * Avatar component - User profile picture or initials
 */
export function Avatar({
  source,
  initials,
  size = 'md',
  backgroundColor = 'bg-gray-300',
  className = '',
  ...props
}: AvatarProps) {
  const sizeStyles = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const textSizeStyles: Record<typeof size, 'caption' | 'body' | 'h3' | 'h2'> = {
    sm: 'caption',
    md: 'body',
    lg: 'h3',
    xl: 'h2',
  };

  return (
    <View
      className={`${sizeStyles[size]} rounded-full overflow-hidden items-center justify-center ${backgroundColor} ${className}`}
      accessibilityRole="image"
      {...props}
    >
      {source ? (
        <Image source={source} className="w-full h-full" resizeMode="cover" />
      ) : (
        <Text variant={textSizeStyles[size]} weight="semibold" className="text-white">
          {initials || '?'}
        </Text>
      )}
    </View>
  );
}
