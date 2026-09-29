import type { ReactNode } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import {
  SafeAreaView,
  type Edge,
} from 'react-native-safe-area-context';

import { theme } from '../../theme';

type ScreenContainerProps = {
  children: ReactNode;
  edges?: Edge[];
  style?: ViewStyle;
};

export function ScreenContainer({
  children,
  edges = ['top', 'right', 'bottom', 'left'],
  style,
}: ScreenContainerProps) {
  return (
    <SafeAreaView edges={edges} style={[styles.container, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
});
