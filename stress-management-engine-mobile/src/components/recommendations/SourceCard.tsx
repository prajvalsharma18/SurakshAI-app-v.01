import { StyleSheet, View } from 'react-native';

import { AppText } from '../common/AppText';
import { theme } from '../../theme';

export function SourceCard({ source }: { source: string }) {
  return (
    <View style={styles.card}>
      <AppText variant="bodySmall" style={styles.label}>
        Supporting source/reference
      </AppText>
      <AppText variant="bodySmall" style={styles.source}>
        {source}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: 10,
    borderWidth: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
  },
  label: {
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  source: {
    color: theme.colors.text,
  },
});
