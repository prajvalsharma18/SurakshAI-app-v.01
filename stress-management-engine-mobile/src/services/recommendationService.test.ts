import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';

import { apiClient, ApiError } from '../api/client';
import { endpoints } from '../api/endpoints';
import type { WelfareRecommendationsResponse } from '../api/types';
import {
  getWelfareRecommendations,
  parseWelfareRecommendations,
} from './recommendationService';

const response: WelfareRecommendationsResponse = {
  personnel_id: 'personnel-test',
  reference_date: '2026-09-29',
  risk_category: 'ELEVATED',
  model_version: 'test-model-version',
  data_mode: 'OPERATIONAL_ONLY',
  recommendations: [
    {
      category: 'RECOVERY',
      action: 'Consider discussing a recovery break with the welfare team.',
      priority: 'MEDIUM',
      rationale: 'The backend identified recovery as a relevant support area.',
      sources: ['test-guidance.md::section-1'],
    },
  ],
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

describe('recommendationService', () => {
  const getSpy = jest.spyOn(apiClient, 'get');

  beforeEach(() => {
    apiClient.defaults.baseURL = 'https://surakshai.test';
    getSpy.mockReset();
  });

  afterAll(() => {
    getSpy.mockRestore();
  });

  it('parses the backend response and its source references', () => {
    expect(parseWelfareRecommendations(response)).toEqual({
      personnelId: 'personnel-test',
      referenceDate: '2026-09-29',
      riskCategory: 'ELEVATED',
      modelVersion: 'test-model-version',
      dataMode: 'OPERATIONAL_ONLY',
      recommendations: [
        {
          category: 'RECOVERY',
          action: 'Consider discussing a recovery break with the welfare team.',
          priority: 'MEDIUM',
          rationale: 'The backend identified recovery as a relevant support area.',
          sources: ['test-guidance.md::section-1'],
        },
      ],
    });
  });

  it('rejects malformed recommendation and metadata fields', () => {
    const malformedResponses: unknown[] = [
      null,
      {},
      { ...response, reference_date: 'not-a-date' },
      { ...response, risk_category: 'UNKNOWN' },
      { ...response, data_mode: 'UNKNOWN' },
      { ...response, recommendations: [{}] },
      {
        ...response,
        recommendations: [{ ...response.recommendations[0], sources: [] }],
      },
      {
        ...response,
        recommendations: [
          { ...response.recommendations[0], priority: 'URGENT' },
        ],
      },
    ];

    for (const malformed of malformedResponses) {
      expect(() => parseWelfareRecommendations(malformed)).toThrow(
        expect.objectContaining({ kind: 'response' }),
      );
    }
  });

  it('preserves a structurally valid empty recommendation list', () => {
    expect(
      parseWelfareRecommendations({ ...response, recommendations: [] })
        .recommendations,
    ).toEqual([]);
  });

  it('fetches the current recommendations from the centralized endpoint', async () => {
    getSpy.mockResolvedValue(axiosResponse(response));

    await expect(
      getWelfareRecommendations('personnel-test'),
    ).resolves.toMatchObject({
      personnelId: 'personnel-test',
      recommendations: response.recommendations,
    });
    expect(getSpy).toHaveBeenCalledWith(
      endpoints.welfareRecommendations('personnel-test'),
    );
  });

  it('normalizes backend failure without exposing internal details', async () => {
    getSpy.mockRejectedValue(
      new AxiosError(
        'private provider and database details',
        'ERR_BAD_RESPONSE',
        undefined,
        undefined,
        {
          data: { error: 'private provider and database details' },
          status: 503,
          statusText: 'Service Unavailable',
          headers: new AxiosHeaders(),
          config: { headers: new AxiosHeaders() },
        },
      ),
    );

    await expect(
      getWelfareRecommendations('personnel-test'),
    ).rejects.toMatchObject({
      kind: 'server',
      statusCode: 503,
    });
  });

  it('normalizes network failures without exposing transport details', async () => {
    getSpy.mockRejectedValue(
      new AxiosError('private network detail', 'ERR_NETWORK'),
    );

    await expect(
      getWelfareRecommendations('personnel-test'),
    ).rejects.toMatchObject({
      kind: 'network',
      message:
        'Unable to reach the backend. Check the API URL and network, then try again.',
    });
  });

  it('preserves centralized unauthorized errors', async () => {
    getSpy.mockRejectedValue(
      new ApiError(
        'unauthorized',
        'Your session has expired. Please sign in again.',
        401,
      ),
    );

    await expect(
      getWelfareRecommendations('personnel-test'),
    ).rejects.toMatchObject({
      kind: 'unauthorized',
      statusCode: 401,
    });
  });
});
