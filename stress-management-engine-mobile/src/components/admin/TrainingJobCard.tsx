import { StyleSheet, View } from 'react-native';

import { AppText } from '../common/AppText';
import type { TrainingJob } from '../../types/modelTraining';
import { theme } from '../../theme';

function displayMetrics(metrics: Record<string, unknown> | null): string[] {
  if (!metrics) {
    return [];
  }
  return Object.entries(metrics)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
    .map(([name, value]) => `${name}: ${Number(value).toFixed(4)}`);
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : 'Not available';
}

export function TrainingJobCard({ job }: { job: TrainingJob }) {
  const metrics = displayMetrics(job.metrics);
  return (
    <View style={styles.card}>
      <AppText variant="heading" style={styles.heading}>{job.status}</AppText>
      <AppText variant="bodySmall">Job: {job.job_id}</AppText>
      <AppText variant="bodySmall">Requested By: {job.requested_by ?? 'Not available'}</AppText>
      <AppText variant="bodySmall">Model: {job.model_version ?? 'Pending'}</AppText>
      <AppText variant="bodySmall">Dataset: {job.dataset_id}</AppText>
      <AppText variant="bodySmall">Feature Version: {job.feature_version}</AppText>
      <AppText variant="bodySmall">Created: {formatDate(job.created_at)}</AppText>
      <AppText variant="bodySmall">Started: {formatDate(job.started_at)}</AppText>
      <AppText variant="bodySmall">Completed: {formatDate(job.completed_at)}</AppText>
      {metrics.length > 0 ? (
        <View style={styles.metrics}>
          <AppText variant="bodySmall" style={styles.heading}>Metrics</AppText>
          {metrics.map((metric) => <AppText key={metric} variant="bodySmall">{metric}</AppText>)}
        </View>
      ) : null}
      {job.status === 'FAILED' ? (
        <AppText variant="bodySmall" style={styles.failure}>
          {job.error_summary ?? 'Training failed. Review the job details with your system administrator.'}
        </AppText>
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
  failure: {
    color: theme.colors.error,
  },
});
