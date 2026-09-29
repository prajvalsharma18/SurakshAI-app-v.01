import {
  ApiError,
  apiClient,
  ensureApiConfigured,
  normalizeApiError,
} from '../api/client';
import { endpoints } from '../api/endpoints';
import type {
  ModelTrainingPlan,
  ModelVersion,
  ModelVersionsResponse,
  TrainingJob,
  TrainingJobStatus,
} from '../types/modelTraining';

const jobStatuses: TrainingJobStatus[] = [
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'PROMOTED',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isDateTime(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isNullableDateTime(value: unknown): value is string | null {
  return value === null || isDateTime(value);
}

function isMetrics(value: unknown): value is Record<string, unknown> | null {
  return value === null || isRecord(value);
}

function isJobStatus(value: unknown): value is TrainingJobStatus {
  return typeof value === 'string' && jobStatuses.some((status) => status === value);
}

function responseError(): ApiError {
  return new ApiError('response', 'The backend returned an unexpected model training response.');
}

function isPlan(value: unknown): value is ModelTrainingPlan {
  return (
    isRecord(value) &&
    isNonEmptyString(value.plan_id) &&
    value.status === 'AWAITING_CONFIRMATION' &&
    isNonEmptyString(value.dataset_id) &&
    isNonEmptyString(value.feature_version) &&
    value.model_family === 'xgboost' &&
    value.training_mode === 'candidate' &&
    isNonEmptyString(value.candidate_model_version) &&
    value.confirmation_required === true
  );
}

function isTrainingJob(value: unknown): value is TrainingJob {
  return (
    isRecord(value) &&
    isNonEmptyString(value.job_id) &&
    (value.requested_by === null || isNonEmptyString(value.requested_by)) &&
    (value.model_version === null || isNonEmptyString(value.model_version)) &&
    isNonEmptyString(value.dataset_id) &&
    isNonEmptyString(value.feature_version) &&
    isJobStatus(value.status) &&
    isDateTime(value.created_at) &&
    (value.started_at === null || isDateTime(value.started_at)) &&
    isNullableDateTime(value.completed_at) &&
    isMetrics(value.metrics) &&
    (value.error_summary === undefined ||
      value.error_summary === null ||
      typeof value.error_summary === 'string')
  );
}

function isModelVersion(value: unknown): value is ModelVersion {
  return (
    isRecord(value) &&
    isNonEmptyString(value.model_version) &&
    isNonEmptyString(value.feature_version) &&
    isNonEmptyString(value.dataset_id) &&
    isNullableDateTime(value.trained_at) &&
    (value.status === 'ACTIVE' ||
      value.status === 'CANDIDATE' ||
      value.status === 'PROMOTED' ||
      value.status === 'FAILED') &&
    isMetrics(value.metrics) &&
    typeof value.promotion_allowed === 'boolean'
  );
}

function parseJobList(value: unknown): TrainingJob[] {
  const jobs = isRecord(value) ? value.jobs : value;
  if (!Array.isArray(jobs) || !jobs.every(isTrainingJob)) {
    throw responseError();
  }
  return jobs;
}

function parseModelVersions(value: unknown): ModelVersionsResponse {
  if (
    !isRecord(value) ||
    (value.active_model !== null && !isModelVersion(value.active_model)) ||
    !Array.isArray(value.candidate_models) ||
    !value.candidate_models.every(isModelVersion)
  ) {
    throw responseError();
  }
  return {
    active_model: value.active_model,
    candidate_models: value.candidate_models,
  };
}

export async function createTrainingPlan(
  requestText: string,
): Promise<ModelTrainingPlan> {
  try {
    ensureApiConfigured();
    const { data } = await apiClient.post<unknown>(
      endpoints.modelTrainingPlan,
      { request_text: requestText },
    );
    if (!isPlan(data)) {
      throw responseError();
    }
    return data;
  } catch (error: unknown) {
    throw normalizeApiError(error);
  }
}

export async function confirmTrainingPlan(
  planId: string,
): Promise<TrainingJob> {
  try {
    ensureApiConfigured();
    const { data } = await apiClient.post<unknown>(
      endpoints.modelTrainingJobs,
      { plan_id: planId, confirmation: true },
    );
    if (!isTrainingJob(data)) {
      throw responseError();
    }
    return data;
  } catch (error: unknown) {
    throw normalizeApiError(error);
  }
}

export async function getTrainingJobs(): Promise<TrainingJob[]> {
  try {
    ensureApiConfigured();
    const { data } = await apiClient.get<unknown>(endpoints.modelTrainingJobs);
    return parseJobList(data);
  } catch (error: unknown) {
    throw normalizeApiError(error);
  }
}

export async function getModelVersions(): Promise<ModelVersionsResponse> {
  try {
    ensureApiConfigured();
    const { data } = await apiClient.get<unknown>(endpoints.modelTrainingModels);
    return parseModelVersions(data);
  } catch (error: unknown) {
    throw normalizeApiError(error);
  }
}

export async function promoteModel(
  modelVersion: string,
): Promise<ModelVersionsResponse> {
  try {
    ensureApiConfigured();
    const { data } = await apiClient.post<unknown>(
      endpoints.promoteModel(modelVersion),
      { confirmation: true },
    );
    return parseModelVersions(data);
  } catch (error: unknown) {
    throw normalizeApiError(error);
  }
}
