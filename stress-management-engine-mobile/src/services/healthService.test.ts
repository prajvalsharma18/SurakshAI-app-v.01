import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';

import { apiClient } from '../api/client';
import { endpoints } from '../api/endpoints';
import type { HealthResponse } from '../api/types';
import { getHealth } from './healthService';

const healthResponse: HealthResponse = {
  status: 'healthy',
  api: 'SURAKSHAI',
  risk_engine: 'surakshai-risk-v0.1',
  timestamp: '2026-09-29T00:00:00',
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

describe('getHealth', () => {
  const getSpy = jest.spyOn(apiClient, 'get');

  beforeEach(() => {
    apiClient.defaults.baseURL = 'https://surakshai.test';
    getSpy.mockReset();
  });

  afterAll(() => {
    getSpy.mockRestore();
  });

  it('requests the configured health endpoint and returns its response', async () => {
    getSpy.mockResolvedValue(axiosResponse(healthResponse));

    await expect(getHealth()).resolves.toEqual(healthResponse);
    expect(getSpy).toHaveBeenCalledWith(endpoints.health);
  });

  it('rejects a response that does not match the backend contract', async () => {
    getSpy.mockResolvedValue(
      axiosResponse({
        status: 'healthy',
        api: 'SURAKSHAI',
      }),
    );

    await expect(getHealth()).rejects.toMatchObject({
      kind: 'response',
      message: 'The backend returned an unexpected health response.',
    });
  });

  it('normalizes network failures without exposing transport details', async () => {
    getSpy.mockRejectedValue(
      new AxiosError('socket detail should not be shown', 'ERR_NETWORK'),
    );

    await expect(getHealth()).rejects.toMatchObject({
      kind: 'network',
      message:
        'Unable to reach the backend. Check the API URL and network, then try again.',
    });
  });

  it('normalizes HTTP failures with their status code', async () => {
    getSpy.mockRejectedValue(
      new AxiosError('server detail should not be shown', 'ERR_BAD_RESPONSE', undefined, undefined, {
        data: { error: 'Internal server error' },
        status: 503,
        statusText: 'Service Unavailable',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
      }),
    );

    await expect(getHealth()).rejects.toMatchObject({
      kind: 'server',
      statusCode: 503,
    });
  });

  it('reports missing API configuration without making a request', async () => {
    apiClient.defaults.baseURL = undefined;

    await expect(getHealth()).rejects.toMatchObject({
      kind: 'configuration',
      message:
        'Configure EXPO_PUBLIC_API_BASE_URL in the mobile app environment before checking the backend.',
    });
    expect(getSpy).not.toHaveBeenCalled();
  });
});
