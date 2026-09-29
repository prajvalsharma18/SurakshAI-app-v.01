import { TrainingPlanCard } from '../../components/admin/TrainingPlanCard';
import type { ModelTrainingPlan } from '../../types/modelTraining';

export function TrainingPlanScreen({
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
    <TrainingPlanCard
      plan={plan}
      busy={busy}
      disabled={disabled}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
