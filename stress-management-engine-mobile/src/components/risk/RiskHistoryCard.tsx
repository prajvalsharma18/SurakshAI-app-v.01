import { StyleSheet, View } from 'react-native';

import { AppText } from '../common/AppText';
import { theme } from '../../theme';
import type { RiskHistoryItem } from '../../types/risk';

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function RiskHistoryCard({ item }: { item: RiskHistoryItem }) {
  return (
    <View style={styles.card}>
      <AppText variant="bodySmall" style={styles.label}>Reference date</AppText>
      <AppText variant="body" style={styles.value}>{formatDate(item.referenceDate)}</AppText>
      <View style={styles.row}>
        <AppText variant="bodySmall" style={styles.label}>Risk category</AppText>
        <AppText variant="body" style={styles.category}>{item.riskCategory}</AppText>
      </View>
      {item.modelVersion ? (
        <AppText variant="bodySmall" style={styles.meta}>Model version: {item.modelVersion}</AppText>
      ) : null}
      {item.dataMode ? (
        <AppText variant="bodySmall" style={styles.meta}>Data source: {item.dataMode}</AppText>
      ) : null}
      {item.createdAt ? (
        <AppText variant="bodySmall" style={styles.meta}>Recorded: {formatDate(item.createdAt)}</AppText>
      ) : null}
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
  label: {
    color: theme.colors.secondary,
  },
  value: {
    fontWeight: '600',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  category: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  meta: {
    color: theme.colors.secondary,
  },
});
