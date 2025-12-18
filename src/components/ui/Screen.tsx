import React, { useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ViewProps,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

interface ScreenProps extends ViewProps {
  /**
   * Whether the screen should scroll
   */
  scroll?: boolean;
  /**
   * Avoid keyboard (useful for forms)
   */
  keyboardAvoiding?: boolean;
  /**
   * Safe area handling
   */
  safeArea?: boolean;
  /**
   * Custom background color class
   */
  backgroundColor?: string;
  scrollProps?: Omit<ScrollViewProps, 'ref' | 'children'>;
  overlay?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Screen component - Base container for all screens
 * Handles safe areas, scrolling, and keyboard avoidance
 */
export function Screen({
  scroll = false,
  keyboardAvoiding = false,
  safeArea = true,
  backgroundColor = 'bg-white',
  scrollProps,
  overlay,
  children,
  className = '',
  ...props
}: ScreenProps) {
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      if (!scroll) return;

      const g = globalThis as unknown as { requestAnimationFrame?: (cb: () => void) => void };
      const scrollToTop = () => scrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });

      if (g.requestAnimationFrame) {
        g.requestAnimationFrame(scrollToTop);
      } else {
        scrollToTop();
      }
    }, [scroll]),
  );

  const content = scroll ? (
    <ScrollView
      ref={scrollRef}
      className={scrollProps?.className ? `flex-1 ${scrollProps.className}` : 'flex-1'}
      contentContainerClassName={`${className}${
        scrollProps?.contentContainerClassName ? ` ${scrollProps.contentContainerClassName}` : ''
      }`}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View className={`flex-1 ${className}`} {...props}>
      {children}
    </View>
  );

  const wrappedContent = keyboardAvoiding ? (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  const body = (
    <View className="flex-1 relative">
      {wrappedContent}
      {overlay}
    </View>
  );

  return safeArea ? (
    <SafeAreaView className={`flex-1 ${backgroundColor}`} edges={['top', 'bottom']}>
      {body}
    </SafeAreaView>
  ) : (
    <View className={`flex-1 ${backgroundColor}`}>{body}</View>
  );
}

/**
 * Container component - Standard content container with padding
 */
interface ContainerProps extends ViewProps {
  children: React.ReactNode;
}

export function Container({ children, className = '', ...props }: ContainerProps) {
  return (
    <View className={`px-md ${className}`} {...props}>
      {children}
    </View>
  );
}

/**
 * Section component - Content section with consistent spacing
 */
interface SectionProps extends ViewProps {
  title?: string;
  children: React.ReactNode;
}

export function Section({ title, children, className = '', ...props }: SectionProps) {
  return (
    <View className={`mb-lg ${className}`} {...props}>
      {title && (
        <View className="mb-md">
          {/* Title will be rendered as Text component when used */}
          {title}
        </View>
      )}
      {children}
    </View>
  );
}
