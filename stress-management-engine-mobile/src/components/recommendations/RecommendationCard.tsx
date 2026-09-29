import { StyleSheet, View } from 'react-native';

import { AppText } from '../common/AppText';
import { SourceCard } from './SourceCard';
import { theme } from '../../theme';
import type { WelfareRecommendation } from '../../types/recommendation';

export function RecommendationCard({
  recommendation,
}: {
  recommendation: WelfareRecommendation;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <AppText variant="body" style={styles.category}>
          {recommendation.category.replaceAll('_', ' ')}
        </AppText>
        <AppText variant="bodySmall" style={styles.priority}>
          Priority: {recommendation.priority}
        </AppText>
      </View>
      <AppText variant="body" style={styles.action}>
        {recommendation.action}
      </AppText>
      <AppText variant="bodySmall" style={styles.label}>
        Rationale
      </AppText>
      <AppText variant="bodySmall" style={styles.rationale}>
        {recommendation.rationale}
      </AppText>
      {recommendation.sources.length > 0 ? (
        <View style={styles.sources}>
          {recommendation.sources.map((source, index) => (
            <SourceCard key={`${source}-${index}`} source={source} />
          ))}
        </View>
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
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  category: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  priority: {
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  action: {
    fontWeight: '600',
  },
  label: {
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  rationale: {
    color: theme.colors.text,
  },
  sources: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
});
