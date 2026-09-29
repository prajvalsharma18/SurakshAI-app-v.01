import { AxiosError, AxiosHeaders } from 'axios';

import {
  apiClient,
  normalizeApiError,
  registerAuthSessionHooks,
} from './client';
import { endpoints } from './endpoints';

describe('apiClient authentication interceptors', () => {
  const originalAdapter = apiClient.defaults.adapter;
  const originalBaseUrl = apiClient.defaults.baseURL;
  const originalAuthorization = apiClient.defaults.headers.common.Authorization;
  let unregister: (() => void) | undefined;

  beforeEach(() => {
    apiClient.defaults.baseURL = 'https://surakshai.test';
  });

  describe('normalizeApiError', () => {
    it.each([
      [400, 'validation'],
      [403, 'forbidden'],
      [404, 'not_found'],
      [409, 'conflict'],
      [500, 'server'],
    ] as const)('maps HTTP %i to %s without losing the status', (status, kind) => {
      const error = new AxiosError(`HTTP ${status}`, 'ERR_BAD_RESPONSE', undefined, undefined, {
        data: {},
        status,
        statusText: 'Error',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
      });

      expect(normalizeApiError(error)).toMatchObject({ kind, statusCode: status });
    });

    it('preserves timeout and network error kinds', () => {
      expect(
        normalizeApiError(new AxiosError('private timeout', 'ECONNABORTED')).kind,
      ).toBe('timeout');
      expect(
        normalizeApiError(new AxiosError('private network detail', 'ERR_NETWORK')).kind,
      ).toBe('network');
    });
  });

  afterEach(() => {
    unregister?.();
    unregister = undefined;
    apiClient.defaults.adapter = originalAdapter;
    apiClient.defaults.baseURL = originalBaseUrl;
    apiClient.defaults.headers.common.Authorization = originalAuthorization;
  });

  it('does not attach credentials to public health or login endpoints', async () => {
    apiClient.defaults.headers.common.Authorization = 'Bearer stale-token';
    unregister = registerAuthSessionHooks({
      getAccessToken: () => 'current-token',
      onUnauthorized: jest.fn(),
    });
    const seenAuthorization: unknown[] = [];
    apiClient.defaults.adapter = async (config) => {
      seenAuthorization.push(config.headers.get('Authorization'));
      const headers = new AxiosHeaders();
      return {
        data: {},
        status: 200,
        statusText: 'OK',
        headers,
        config,
      };
    };

    await apiClient.get('/health');
    await apiClient.post('/auth/login', {
      username: 'personnel.user',
      password: 'not-a-real-password',
    });

    expect(seenAuthorization).toEqual([undefined, undefined]);
  });

  it('adds the bearer token and invalidates the session on a protected 401', async () => {
    const onUnauthorized = jest.fn();
    unregister = registerAuthSessionHooks({
      getAccessToken: () => 'current-token',
      onUnauthorized,
    });
    let seenAuthorization: unknown;
    apiClient.defaults.adapter = async (config) => {
      seenAuthorization = config.headers.get('Authorization');
      throw new AxiosError('unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
        data: { error: 'Unauthorized' },
        status: 401,
        statusText: 'Unauthorized',
        headers: new AxiosHeaders(),
        config,
      });
    };

    await expect(apiClient.get(endpoints.consent)).rejects.toMatchObject({
      kind: 'unauthorized',
      statusCode: 401,
    });
    expect(seenAuthorization).toBe('Bearer current-token');
    expect(onUnauthorized).toHaveBeenCalledWith('current-token');
  });

  it('invalidates the session on a 401 response from POST /consent', async () => {
    const onUnauthorized = jest.fn();
    unregister = registerAuthSessionHooks({
      getAccessToken: () => 'current-token',
      onUnauthorized,
    });
    apiClient.defaults.adapter = async (config) => {
      throw new AxiosError('unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
        data: { error: 'Unauthorized' },
        status: 401,
        statusText: 'Unauthorized',
        headers: new AxiosHeaders(),
        config,
      });
    };

    await expect(
      apiClient.post(endpoints.consent, {
        consent_type: 'WELLNESS_DATA_PROCESSING',
        granted: true,
      }),
    ).rejects.toMatchObject({
      kind: 'unauthorized',
      statusCode: 401,
    });
    expect(onUnauthorized).toHaveBeenCalledWith('current-token');
  });

  it('does not invalidate an existing session for a login 401', async () => {
    const onUnauthorized = jest.fn();
    unregister = registerAuthSessionHooks({
      getAccessToken: () => 'stale-token',
      onUnauthorized,
    });
    apiClient.defaults.adapter = async (config) => {
      throw new AxiosError('invalid credentials', 'ERR_BAD_REQUEST', config, undefined, {
        data: { error: 'Invalid username or password' },
        status: 401,
        statusText: 'Unauthorized',
        headers: new AxiosHeaders(),
        config,
      });
    };

    await expect(
      apiClient.post('/auth/login', {
        username: 'personnel.user',
        password: 'password',
      }),
    ).rejects.toBeInstanceOf(AxiosError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
