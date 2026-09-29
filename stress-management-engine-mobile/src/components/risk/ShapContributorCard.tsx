import { StyleSheet, View } from 'react-native';

import { AppText } from '../common/AppText';
import { theme } from '../../theme';
import type { ShapContributor } from '../../types/risk';

export function ShapContributorCard({ contributor }: { contributor: ShapContributor }) {
  const isPositive = contributor.direction === 'positive';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <AppText variant="body" style={styles.feature}>{contributor.label}</AppText>
        <AppText variant="bodySmall" style={[styles.direction, isPositive ? styles.positive : styles.negative]}>
          {isPositive ? 'Positive contribution' : 'Negative contribution'}
        </AppText>
      </View>
      <AppText variant="bodySmall" style={styles.meta}>Model contributor</AppText>
      <AppText variant="bodySmall" style={styles.meta}>
        Contribution to the model&apos;s prediction: {contributor.shapValue.toFixed(4)}
      </AppText>
      <AppText variant="bodySmall" style={styles.interpretation}>
        {contributor.interpretation}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feature: {
    flex: 1,
    fontWeight: '600',
  },
  direction: {
    fontWeight: '600',
    textAlign: 'right',
  },
  positive: {
    color: theme.colors.success,
  },
  negative: {
    color: theme.colors.error,
  },
  meta: {
    color: theme.colors.secondary,
  },
  interpretation: {
    color: theme.colors.text,
  },
});
