import React from 'react';
import { Pressable as NativePressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme';
export function Button({ style, children, ...props }: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> }) {
  const [focused, setFocused] = React.useState(false);
  return <NativePressable accessibilityRole="button" {...props} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ pressed }) => [style, { opacity: props.disabled ? 0.45 : pressed ? 0.7 : 1 }, focused && { outlineColor: colors.blue, outlineStyle: 'solid', outlineWidth: 2 }]}>{children}</NativePressable>;
}
