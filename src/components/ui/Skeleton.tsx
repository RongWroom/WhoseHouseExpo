/**
 * Skeleton Loading Components
 * Provides contextual loading placeholders with shimmer animation
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | `${number}%` | 'auto';
  height?: number | `${number}%` | 'auto';
  borderRadius?: number;
  className?: string;
  style?: ViewStyle;
}

/**
 * Base Skeleton component with shimmer animation
 */
export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 4,
  className = '',
  style,
}: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      className={`bg-gray-200 ${className}`}
      style={[
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Text line skeleton
 */
export function SkeletonText({
  lines = 1,
  lastLineWidth = '60%' as const,
  className = '',
}: {
  lines?: number;
  lastLineWidth?: number | `${number}%`;
  className?: string;
}) {
  return (
    <View className={`gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 && lines > 1 ? lastLineWidth : '100%'}
          height={16}
        />
      ))}
    </View>
  );
}

/**
 * Avatar skeleton
 */
export function SkeletonAvatar({
  size = 48,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return <Skeleton width={size} height={size} borderRadius={size / 2} className={className} />;
}

/**
 * Card skeleton - mimics a typical card layout
 */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <View className={`bg-white rounded-xl p-4 shadow-sm ${className}`}>
      <View className="flex-row items-center mb-4">
        <SkeletonAvatar size={40} />
        <View className="ml-3 flex-1">
          <Skeleton width="60%" height={16} className="mb-2" />
          <Skeleton width="40%" height={12} />
        </View>
      </View>
      <SkeletonText lines={2} lastLineWidth="80%" />
    </View>
  );
}

/**
 * Message skeleton - mimics a chat message
 */
export function SkeletonMessage({
  isOwnMessage = false,
  className = '',
}: {
  isOwnMessage?: boolean;
  className?: string;
}) {
  return (
    <View
      className={`flex-row mb-3 ${isOwnMessage ? 'justify-end' : 'justify-start'} ${className}`}
    >
      {!isOwnMessage && <SkeletonAvatar size={32} className="mr-2" />}
      <View
        className={`rounded-2xl p-3 ${isOwnMessage ? 'bg-blue-100' : 'bg-gray-100'}`}
        style={{ maxWidth: '70%' }}
      >
        <Skeleton width={150} height={14} className="mb-1" />
        <Skeleton width={100} height={14} />
      </View>
    </View>
  );
}

/**
 * Message list skeleton
 */
export function SkeletonMessageList({ count = 5 }: { count?: number }) {
  return (
    <View className="p-4">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonMessage key={index} isOwnMessage={index % 3 === 0} />
      ))}
    </View>
  );
}

/**
 * Case card skeleton
 */
export function SkeletonCaseCard({ className = '' }: { className?: string }) {
  return (
    <View className={`bg-white rounded-xl p-4 shadow-sm ${className}`}>
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Skeleton width="50%" height={18} className="mb-2" />
          <Skeleton width="70%" height={14} />
        </View>
        <Skeleton width={60} height={24} borderRadius={12} />
      </View>
      <View className="flex-row items-center">
        <SkeletonAvatar size={32} />
        <View className="ml-2 flex-1">
          <Skeleton width="40%" height={14} />
        </View>
      </View>
    </View>
  );
}

/**
 * Dashboard stats skeleton
 */
export function SkeletonStats({ className = '' }: { className?: string }) {
  return (
    <View className={`flex-row flex-wrap gap-3 ${className}`}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} className="flex-1 min-w-[45%] bg-white rounded-xl p-4 shadow-sm">
          <Skeleton width={40} height={40} borderRadius={8} className="mb-2" />
          <Skeleton width="60%" height={24} className="mb-1" />
          <Skeleton width="80%" height={14} />
        </View>
      ))}
    </View>
  );
}

/**
 * Photo grid skeleton
 */
export function SkeletonPhotoGrid({
  count = 6,
  columns = 3,
  className = '',
}: {
  count?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <View className={`flex-row flex-wrap gap-2 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton
          key={index}
          width={`${100 / columns - 2}%`}
          height={100}
          borderRadius={8}
          style={{ aspectRatio: 1 }}
        />
      ))}
    </View>
  );
}

/**
 * User list skeleton
 */
export function SkeletonUserList({ count = 5 }: { count?: number }) {
  return (
    <View className="gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} className="flex-row items-center bg-white rounded-xl p-3 shadow-sm">
          <SkeletonAvatar size={48} />
          <View className="ml-3 flex-1">
            <Skeleton width="50%" height={16} className="mb-2" />
            <Skeleton width="70%" height={12} />
          </View>
          <Skeleton width={24} height={24} borderRadius={12} />
        </View>
      ))}
    </View>
  );
}

/**
 * Form skeleton
 */
export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <View className="gap-4">
      {Array.from({ length: fields }).map((_, index) => (
        <View key={index}>
          <Skeleton width="30%" height={14} className="mb-2" />
          <Skeleton width="100%" height={44} borderRadius={8} />
        </View>
      ))}
      <Skeleton width="100%" height={48} borderRadius={8} className="mt-4" />
    </View>
  );
}

/**
 * Profile skeleton
 */
export function SkeletonProfile({ className = '' }: { className?: string }) {
  return (
    <View className={`items-center ${className}`}>
      <SkeletonAvatar size={100} className="mb-4" />
      <Skeleton width={150} height={24} className="mb-2" />
      <Skeleton width={100} height={16} className="mb-4" />
      <View className="w-full">
        <SkeletonText lines={3} />
      </View>
    </View>
  );
}
