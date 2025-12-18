import React from 'react';
import { Pressable, View, type ViewProps, type PressableProps } from 'react-native';

type SunbeamSurfaceBaseProps = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

type SunbeamSurfaceProps = SunbeamSurfaceBaseProps &
  Omit<ViewProps, 'children'> & {
    onPress?: undefined;
  };

type SunbeamSurfacePressableProps = SunbeamSurfaceBaseProps &
  Omit<PressableProps, 'children'> & {
    onPress: PressableProps['onPress'];
  };

export function SunbeamSurface(props: SunbeamSurfaceProps | SunbeamSurfacePressableProps) {
  const {
    children,
    className = '',
    contentClassName = '',
    ...rest
  } = props as SunbeamSurfacePressableProps & SunbeamSurfaceProps;

  const containerClassName = `rounded-xl bg-white border border-black/5 shadow-sm overflow-hidden ${className}`;
  const content = <View className={contentClassName}>{children}</View>;

  if ('onPress' in props && typeof props.onPress === 'function') {
    const pressableProps = rest as PressableProps;
    return (
      <Pressable
        {...pressableProps}
        className={containerClassName}
        accessibilityRole={pressableProps.accessibilityRole ?? 'button'}
      >
        {content}
      </Pressable>
    );
  }

  const viewProps = rest as ViewProps;
  return (
    <View {...viewProps} className={containerClassName}>
      {content}
    </View>
  );
}
