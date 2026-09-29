import { render } from '@testing-library/react-native';

import { TrainingJobCard } from './TrainingJobCard';
import type { TrainingJob, TrainingJobStatus } from '../../types/modelTraining';

function makeJob(status: TrainingJobStatus): TrainingJob {
  return {
    job_id: 'job-fixture',
    requested_by: 'admin-fixture',
    model_version: 'surakshai-risk-candidate-fixture',
    dataset_id: 'approved-dataset',
    feature_version: 'supported-feature-v1',
    status,
    created_at: '2026-09-29T10:00:00Z',
    started_at: status === 'QUEUED' ? null : '2026-09-29T10:01:00Z',
    completed_at: status === 'SUCCEEDED' || status === 'FAILED'
      ? '2026-09-29T10:02:00Z'
      : null,
    metrics: status === 'SUCCEEDED' ? { accuracy: 0.75, macro_f1: 0.71 } : null,
    error_summary: status === 'FAILED' ? 'Candidate training failed validation.' : null,
  };
}

describe('TrainingJobCard', () => {
  it.each(['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED'] as const)(
    'renders backend state and details for %s',
    async (status) => {
      const view = await render(<TrainingJobCard job={makeJob(status)} />);
      expect(view.getByText(status)).toBeTruthy();
      expect(view.getByText('Requested By: admin-fixture')).toBeTruthy();
      expect(view.getByText('Dataset: approved-dataset')).toBeTruthy();
      expect(view.getByText('Feature Version: supported-feature-v1')).toBeTruthy();
      if (status === 'SUCCEEDED') {
        expect(view.getByText('accuracy: 0.7500')).toBeTruthy();
        expect(view.getByText('macro_f1: 0.7100')).toBeTruthy();
      }
      if (status === 'FAILED') {
        expect(view.getByText('Candidate training failed validation.')).toBeTruthy();
      }
    },
  );
});
