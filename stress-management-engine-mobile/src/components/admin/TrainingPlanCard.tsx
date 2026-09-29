import { StyleSheet, View } from 'react-native';

import { AppButton } from '../common/AppButton';
import { AppText } from '../common/AppText';
import type { ModelTrainingPlan } from '../../types/modelTraining';
import { theme } from '../../theme';

export function TrainingPlanCard({
  plan,
  busy,
  disabled,
  onCancel,
  onConfirm,
}: {
  plan: ModelTrainingPlan;
  busy: boolean;
  disabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <View style={styles.card}>
      <AppText variant="heading" style={styles.title}>Training Plan</AppText>
      <AppText variant="bodySmall">Dataset: {plan.dataset_id}</AppText>
      <AppText variant="bodySmall">Feature Version: {plan.feature_version}</AppText>
      <AppText variant="bodySmall">Model: XGBoost</AppText>
      <AppText variant="bodySmall">Mode: Candidate</AppText>
      <AppText variant="bodySmall">Candidate Model: {plan.candidate_model_version}</AppText>
      <AppText variant="bodySmall">Confirmation: Required</AppText>
      <AppText variant="bodySmall" style={styles.notice}>
        Training creates a candidate model. It will not replace the current active
        model until you explicitly promote it.
      </AppText>
      <View style={styles.actions}>
        <AppButton
          title="Cancel"
          accessibilityLabel="Cancel training plan"
          disabled={busy}
          onPress={onCancel}
        />
        <AppButton
          title="Confirm Training"
          accessibilityLabel="Confirm candidate model training"
          disabled={disabled || busy}
          loading={busy}
          onPress={onConfirm}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  title: {
    color: theme.colors.primary,
  },
  notice: {
    color: theme.colors.secondary,
  },
  actions: {
    gap: theme.spacing.sm,
  },
});
