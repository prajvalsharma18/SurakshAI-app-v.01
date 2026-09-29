export type TrainingJobStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'PROMOTED';

export type ModelTrainingPlan = {
  plan_id: string;
  status: 'AWAITING_CONFIRMATION';
  dataset_id: string;
  feature_version: string;
  model_family: 'xgboost';
  training_mode: 'candidate';
  candidate_model_version: string;
  confirmation_required: true;
};

export type TrainingJob = {
  job_id: string;
  requested_by: string | null;
  model_version: string | null;
  dataset_id: string;
  feature_version: string;
  status: TrainingJobStatus;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  metrics: Record<string, unknown> | null;
  error_summary?: string | null;
};

export type ModelVersion = {
  model_version: string;
  feature_version: string;
  dataset_id: string;
  trained_at: string | null;
  status: 'ACTIVE' | 'CANDIDATE' | 'PROMOTED' | 'FAILED';
  metrics: Record<string, unknown> | null;
  promotion_allowed: boolean;
};

export type ModelVersionsResponse = {
  active_model: ModelVersion | null;
  candidate_models: ModelVersion[];
};
