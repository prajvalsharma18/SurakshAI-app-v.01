import { StyleSheet, View } from 'react-native';

import { AppText } from '../common/AppText';
import { theme } from '../../theme';

export function OfflineState({
  isOnline,
}: {
  isOnline: boolean | null;
}) {
  if (isOnline !== false) {
    return null;
  }

  return (
    <View accessibilityLiveRegion="assertive" style={styles.container}>
      <AppText variant="bodySmall" style={styles.message}>
        You&apos;re offline. Connect to the internet to refresh your welfare
        information.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF7E6',
    borderColor: '#D89D2E',
    borderRadius: 10,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  message: {
    color: theme.colors.text,
  },
});
