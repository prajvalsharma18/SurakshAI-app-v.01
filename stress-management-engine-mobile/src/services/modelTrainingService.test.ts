import { AxiosHeaders, type AxiosResponse } from 'axios';

import { ApiError, apiClient } from '../api/client';
import { endpoints } from '../api/endpoints';
import {
  confirmTrainingPlan,
  createTrainingPlan,
  getModelVersions,
  getTrainingJobs,
  promoteModel,
} from './modelTrainingService';
import type {
  ModelTrainingPlan,
  ModelVersionsResponse,
  TrainingJob,
} from '../types/modelTraining';

function axiosResponse<T>(data: T): AxiosResponse<T> {
  const headers = new AxiosHeaders();
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers,
    config: { headers },
  };
}

const plan: ModelTrainingPlan = {
  plan_id: 'plan-1',
  status: 'AWAITING_CONFIRMATION',
  dataset_id: 'surakshai_phase4_synthetic_risk_dataset',
  feature_version: 'surakshai-phase4-feature-v1',
  model_family: 'xgboost',
  training_mode: 'candidate',
  candidate_model_version: 'surakshai-risk-v0.2-candidate',
  confirmation_required: true,
};

const job: TrainingJob = {
  job_id: 'job-1',
  requested_by: 'admin@example',
  model_version: plan.candidate_model_version,
  dataset_id: plan.dataset_id,
  feature_version: plan.feature_version,
  status: 'QUEUED',
  created_at: '2026-09-29T10:00:00Z',
  started_at: null,
  completed_at: null,
  metrics: null,
};

const versions: ModelVersionsResponse = {
  active_model: {
    model_version: 'surakshai-risk-v0.1',
    feature_version: plan.feature_version,
    dataset_id: plan.dataset_id,
    trained_at: '2026-09-28T10:00:00Z',
    status: 'ACTIVE',
    metrics: { accuracy: 0.6 },
    promotion_allowed: false,
  },
  candidate_models: [],
};

describe('modelTrainingService', () => {
  const getSpy = jest.spyOn(apiClient, 'get');
  const postSpy = jest.spyOn(apiClient, 'post');
  const originalBaseUrl = apiClient.defaults.baseURL;

  beforeEach(() => {
    apiClient.defaults.baseURL = 'https://surakshai.test';
    getSpy.mockReset();
    postSpy.mockReset();
  });

  afterAll(() => {
    getSpy.mockRestore();
    postSpy.mockRestore();
    apiClient.defaults.baseURL = originalBaseUrl;
  });

  it('submits natural language to create a plan without starting a job', async () => {
    postSpy.mockResolvedValue(axiosResponse(plan));

    await expect(
      createTrainingPlan('Train a new candidate model.'),
    ).resolves.toEqual(plan);

    expect(postSpy).toHaveBeenCalledWith(endpoints.modelTrainingPlan, {
      request_text: 'Train a new candidate model.',
    });
  });

  it('rejects a malformed plan response before it can be confirmed', async () => {
    postSpy.mockResolvedValue(axiosResponse({ ...plan, training_mode: 'production' }));

    await expect(createTrainingPlan('Train a new candidate model.')).rejects.toBeInstanceOf(ApiError);
  });

  it('sends explicit confirmation to create a job', async () => {
    postSpy.mockResolvedValue(axiosResponse(job));

    await expect(confirmTrainingPlan(plan.plan_id)).resolves.toEqual(job);
    expect(postSpy).toHaveBeenCalledWith(endpoints.modelTrainingJobs, {
      plan_id: plan.plan_id,
      confirmation: true,
    });
  });

  it('parses job history, model versions, and promotion results', async () => {
    getSpy
      .mockResolvedValueOnce(axiosResponse({ jobs: [job] }))
      .mockResolvedValueOnce(axiosResponse(versions));
    postSpy.mockResolvedValue(axiosResponse(versions));

    await expect(getTrainingJobs()).resolves.toEqual([job]);
    await expect(getModelVersions()).resolves.toEqual(versions);
    await expect(promoteModel(plan.candidate_model_version)).resolves.toEqual(versions);
    expect(postSpy).toHaveBeenCalledWith(
      endpoints.promoteModel(plan.candidate_model_version),
      { confirmation: true },
    );
  });
});
