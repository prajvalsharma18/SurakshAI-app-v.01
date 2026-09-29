import type { ReactNode } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { theme } from '../../theme';

export type AppTextVariant =
  | 'display'
  | 'heading'
  | 'title'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'button';

type AppTextProps = TextProps & {
  children: ReactNode;
  variant?: AppTextVariant;
};

export function AppText({
  children,
  style,
  variant = 'body',
  ...textProps
}: AppTextProps) {
  return (
    <Text {...textProps} style={[styles.base, theme.typography[variant], style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: theme.colors.text,
  },
});
