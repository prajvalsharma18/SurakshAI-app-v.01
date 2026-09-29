import { StyleSheet, View } from 'react-native';

import { AppText } from '../../components/common/AppText';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { theme } from '../../theme';

export function SplashScreen() {
  return (
    <ScreenContainer style={styles.container}>
      <View accessible accessibilityLabel="SURAKSHAI" style={styles.brandMark}>
        <View style={styles.brandMarkCenter} />
      </View>
      <AppText variant="display" style={styles.title}>
        SURAKSHAI
      </AppText>
      <View style={styles.divider} />
      <AppText variant="body" style={styles.tagline}>
        Protect Privacy. Detect Early. Support Better.
      </AppText>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    width: 44,
  },
  brandMarkCenter: {
    backgroundColor: theme.colors.accent,
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  title: {
    color: theme.colors.primary,
    textAlign: 'center',
  },
  divider: {
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
    height: 3,
    marginVertical: theme.spacing.md,
    width: 40,
  },
  tagline: {
    color: theme.colors.secondary,
    maxWidth: 280,
    textAlign: 'center',
  },
});
