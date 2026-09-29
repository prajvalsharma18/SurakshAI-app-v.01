import { StyleSheet, View } from 'react-native';

import { AppButton } from '../common/AppButton';
import { AppText } from '../common/AppText';
import { theme } from '../../theme';

export function ErrorState({
  message,
  onRetry,
  retryLabel = 'Try again',
  retryDisabled = false,
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  retryDisabled?: boolean;
}) {
  return (
    <View accessibilityRole="alert" style={styles.container}>
      <AppText variant="body" style={styles.message}>
        {message}
      </AppText>
      {onRetry ? (
        <AppButton
          accessibilityLabel={retryLabel}
          disabled={retryDisabled}
          onPress={onRetry}
          title={retryLabel}
        />
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
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  message: {
    color: theme.colors.text,
  },
});
