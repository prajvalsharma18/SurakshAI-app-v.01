import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../common/AppText';
import { theme } from '../../theme';

type WellnessQuestionProps = {
  label: string;
  description?: string;
  error?: string;
  children: ReactNode;
};

export function WellnessQuestion({
  label,
  description,
  error,
  children,
}: WellnessQuestionProps) {
  return (
    <View style={styles.container}>
      <AppText variant="bodySmall" style={styles.label}>
        {label}
      </AppText>
      {description ? (
        <AppText variant="caption" style={styles.description}>
          {description}
        </AppText>
      ) : null}
      {children}
      {error ? (
        <AppText variant="caption" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  label: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  description: {
    color: theme.colors.secondary,
  },
  error: {
    color: theme.colors.error,
  },
});
