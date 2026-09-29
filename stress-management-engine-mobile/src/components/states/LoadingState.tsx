import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '../common/AppText';
import { theme } from '../../theme';

export function LoadingState({
  message = 'Loading...',
  label = 'Loading',
}: {
  message?: string;
  label?: string;
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityLabel={label}
      style={styles.container}
    >
      <ActivityIndicator color={theme.colors.accent} />
      <AppText variant="bodySmall" style={styles.message}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  message: {
    color: theme.colors.secondary,
  },
});
