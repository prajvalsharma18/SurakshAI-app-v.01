import { StyleSheet, View } from 'react-native';

import { AppButton } from '../common/AppButton';
import { AppText } from '../common/AppText';
import type { ModelVersion } from '../../types/modelTraining';
import { theme } from '../../theme';

function metricLines(metrics: Record<string, unknown> | null): string[] {
  if (!metrics) {
    return [];
  }
  return Object.entries(metrics)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
    .map(([name, value]) => `${name}: ${Number(value).toFixed(4)}`);
}

export function ModelVersionCard({
  model,
  title,
  busy,
  onPromote,
}: {
  model: ModelVersion;
  title: string;
  busy?: boolean;
  onPromote?: () => void;
}) {
  const metrics = metricLines(model.metrics);
  return (
    <View style={styles.card}>
      <AppText variant="heading" style={styles.heading}>{title}</AppText>
      <AppText variant="bodySmall">Version: {model.model_version}</AppText>
      <AppText variant="bodySmall">Feature Version: {model.feature_version}</AppText>
      <AppText variant="bodySmall">Dataset: {model.dataset_id}</AppText>
      <AppText variant="bodySmall">Status: {model.status}</AppText>
      <AppText variant="bodySmall">
        Trained: {model.trained_at ? new Date(model.trained_at).toLocaleString() : 'Not available'}
      </AppText>
      {metrics.length > 0 ? (
        <View style={styles.metrics}>
          <AppText variant="bodySmall" style={styles.heading}>Metrics</AppText>
          {metrics.map((metric) => <AppText key={metric} variant="bodySmall">{metric}</AppText>)}
        </View>
      ) : null}
      {model.status === 'CANDIDATE' && model.promotion_allowed && onPromote ? (
        <AppButton
          title="Promote"
          accessibilityLabel={`Promote model ${model.model_version}`}
          loading={busy}
          disabled={busy}
          onPress={onPromote}
        />
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
    color: theme.colors.primary,
    fontWeight: '600',
  },
  metrics: {
    gap: theme.spacing.xs,
  },
});
