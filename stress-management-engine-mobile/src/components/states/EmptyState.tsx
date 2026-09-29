import { StyleSheet, View } from 'react-native';

import { AppText } from '../common/AppText';
import { theme } from '../../theme';

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.container}>
      <AppText variant="body" style={styles.title}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="bodySmall" style={styles.message}>
          {message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  title: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  message: {
    color: theme.colors.secondary,
  },
});
