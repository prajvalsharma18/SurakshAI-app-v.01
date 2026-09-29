import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';

import { apiClient } from '../api/client';
import { endpoints } from '../api/endpoints';
import type {
  RiskExplanationResponse,
  RiskHistoryResponse,
  RiskPredictionResponse,
} from '../api/types';
import { getCurrentRiskPrediction, getRiskExplanation, getRiskHistory } from './riskService';

const predictionResponse: RiskPredictionResponse = {
  personnel_id: 'PERSONNEL-42',
  reference_date: '2026-09-29',
  risk_category: 'ELEVATED',
  probabilities: { LOW: 0.1, ELEVATED: 0.8, HIGH: 0.1 },
  model_version: 'surakshai-risk-v1',
  data_mode: 'OPERATIONAL_AND_WELLNESS',
};

const historyResponse: RiskHistoryResponse = {
  items: [
    {
      reference_date: '2026-09-29',
      risk_category: 'ELEVATED',
      model_version: 'surakshai-risk-v1',
      data_mode: 'OPERATIONAL_AND_WELLNESS',
      created_at: '2026-09-29T08:00:00Z',
    },
    {
      reference_date: '2026-09-28',
      risk_category: 'LOW',
      model_version: 'surakshai-risk-v1',
      data_mode: 'OPERATIONAL_AND_WELLNESS',
      created_at: '2026-09-28T08:00:00Z',
    },
  ],
  page: 1,
  page_size: 2,
  total: 2,
};

const explanationResponse: RiskExplanationResponse = {
  explanation: {
    method: 'SHAP',
    predicted_class: 'ELEVATED',
    top_contributors: [
      {
        feature: 'sleep_quality',
        label: 'Sleep quality',
        shap_value: 0.42,
        direction: 'increases_predicted_risk',
      },
      {
        feature: 'support_contact',
        label: 'Support contact',
        shap_value: -0.18,
        direction: 'decreases_predicted_risk',
      },
    ],
  },
};

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

describe('risk service', () => {
  const getSpy = jest.spyOn(apiClient, 'get');

  beforeEach(() => {
    apiClient.defaults.baseURL = 'https://surakshai.test';
    getSpy.mockReset();
  });

  afterAll(() => {
    getSpy.mockRestore();
  });

  it('returns the current risk prediction for the authenticated personnel', async () => {
    getSpy.mockResolvedValue(axiosResponse(predictionResponse));

    await expect(getCurrentRiskPrediction('PERSONNEL-42')).resolves.toMatchObject({
      personnelId: 'PERSONNEL-42',
      referenceDate: '2026-09-29',
      riskCategory: 'ELEVATED',
      modelVersion: 'surakshai-risk-v1',
      dataMode: 'OPERATIONAL_AND_WELLNESS',
    });
    expect(getSpy).toHaveBeenCalledWith(endpoints.riskPrediction('PERSONNEL-42'));
  });

  it('returns normalized risk history entries from the backend response', async () => {
    getSpy.mockResolvedValue(axiosResponse(historyResponse));

    await expect(getRiskHistory('PERSONNEL-42')).resolves.toEqual([
      {
        referenceDate: '2026-09-29',
        riskCategory: 'ELEVATED',
        modelVersion: 'surakshai-risk-v1',
        dataMode: 'OPERATIONAL_AND_WELLNESS',
        createdAt: '2026-09-29T08:00:00Z',
      },
      {
        referenceDate: '2026-09-28',
        riskCategory: 'LOW',
        modelVersion: 'surakshai-risk-v1',
        dataMode: 'OPERATIONAL_AND_WELLNESS',
        createdAt: '2026-09-28T08:00:00Z',
      },
    ]);
    expect(getSpy).toHaveBeenCalledWith(endpoints.riskHistory('PERSONNEL-42'));
  });

  it('returns the explanation model result with SHAP directions mapped safely', async () => {
    getSpy.mockResolvedValue(axiosResponse(explanationResponse));

    await expect(getRiskExplanation('PERSONNEL-42')).resolves.toEqual({
      predictedClass: 'ELEVATED',
      contributors: [
        {
          feature: 'sleep_quality',
          label: 'Sleep quality',
          shapValue: 0.42,
          direction: 'positive',
          interpretation: 'Positive contribution to this prediction.',
        },
        {
          feature: 'support_contact',
          label: 'Support contact',
          shapValue: -0.18,
          direction: 'negative',
          interpretation: 'Negative contribution to this prediction.',
        },
      ],
    });
    expect(getSpy).toHaveBeenCalledWith(endpoints.riskExplanation('PERSONNEL-42'));
  });

  it('rejects malformed prediction payloads with a backend response error', async () => {
    getSpy.mockResolvedValue(axiosResponse({ bad: 'payload' }));

    await expect(getCurrentRiskPrediction('PERSONNEL-42')).rejects.toMatchObject({
      kind: 'response',
      message: 'The backend returned an unexpected risk prediction response.',
    });
  });

  it('normalizes network and unauthorized failures without leaking backend details', async () => {
    getSpy.mockRejectedValue(
      new AxiosError('network detail should not be shown', 'ERR_NETWORK'),
    );

    await expect(getCurrentRiskPrediction('PERSONNEL-42')).rejects.toMatchObject({
      kind: 'network',
      message: 'Unable to reach the backend. Check the API URL and network, then try again.',
    });

    getSpy.mockRejectedValue(
      new AxiosError('unauthorized detail should not be shown', 'ERR_BAD_REQUEST', undefined, undefined, {
        data: { detail: 'Unauthorized' },
        status: 401,
        statusText: 'Unauthorized',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
      }),
    );

    await expect(getCurrentRiskPrediction('PERSONNEL-42')).rejects.toMatchObject({
      kind: 'http',
      statusCode: 401,
      message: 'The backend returned HTTP 401.',
    });
  });
});
