import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';

import { apiClient } from '../api/client';
import { endpoints } from '../api/endpoints';
import type { LoginResponse } from '../api/types';
import { AuthServiceError, loginWithCredentials, parseLoginResponse } from './authService';

function backendResponse(
  overrides: Partial<LoginResponse> = {},
): LoginResponse {
  return {
    access_token: 'test-access-token',
    token_type: 'Bearer',
    expires_in: 900,
    expires_at: new Date(Date.now() + 900_000).toISOString(),
    user: {
      user_id: 'user-123',
      username: 'personnel.user',
      role: 'PERSONNEL',
      personnel_id: 'P-123',
    },
    ...overrides,
  };
}

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

describe('authService', () => {
  const postSpy = jest.spyOn(apiClient, 'post');

  beforeEach(() => {
    apiClient.defaults.baseURL = 'https://surakshai.test';
    postSpy.mockReset();
  });

  afterAll(() => {
    postSpy.mockRestore();
  });

  it('parses the backend response into the minimum client session', async () => {
    const response = backendResponse();
    postSpy.mockResolvedValue(axiosResponse(response));

    await expect(
      loginWithCredentials({ username: 'personnel.user', password: 'password' }),
    ).resolves.toEqual({
      accessToken: response.access_token,
      tokenType: 'Bearer',
      expiresAt: response.expires_at,
      user: {
        username: 'personnel.user',
        role: 'PERSONNEL',
        personnelId: 'P-123',
      },
    });
    expect(postSpy).toHaveBeenCalledWith(endpoints.login, {
      username: 'personnel.user',
      password: 'password',
    });
  });

  it('rejects malformed login responses', () => {
    expect(() => parseLoginResponse({ access_token: 'only-a-token' })).toThrow(
      AuthServiceError,
    );
  });

  it('rejects an expired login response', () => {
    try {
      parseLoginResponse(
        backendResponse({
          expires_at: new Date(Date.now() - 1_000).toISOString(),
        }),
      );
      throw new Error('Expected the expired response to be rejected.');
    } catch (error: unknown) {
      expect(error).toMatchObject({ kind: 'response' });
    }
  });

  it('uses a generic message for invalid credentials', async () => {
    postSpy.mockRejectedValue(
      new AxiosError(
        'Invalid username or password',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        {
          data: { error: 'Invalid username or password' },
          status: 401,
          statusText: 'Unauthorized',
          headers: new AxiosHeaders(),
          config: { headers: new AxiosHeaders() },
        },
      ),
    );

    await expect(
      loginWithCredentials({ username: 'private', password: 'private' }),
    ).rejects.toMatchObject({
      kind: 'credentials',
      message: 'Unable to sign in with those credentials.',
    });
  });

  it('maps network failures to a safe connection message', async () => {
    postSpy.mockRejectedValue(
      new AxiosError('private transport details', 'ERR_NETWORK'),
    );

    await expect(
      loginWithCredentials({ username: 'personnel.user', password: 'password' }),
    ).rejects.toMatchObject({
      kind: 'network',
      message: 'Unable to connect to the SURAKSHAI backend.',
    });
  });

  it('accepts an administrator role for the admin-only application branch', async () => {
    postSpy.mockResolvedValue(
      axiosResponse(
        backendResponse({
          user: {
            user_id: 'user-456',
            username: 'admin.user',
            role: 'ADMIN',
          },
        }),
      ),
    );

    await expect(
      loginWithCredentials({ username: 'admin.user', password: 'password' }),
    ).resolves.toMatchObject({
      user: { username: 'admin.user', role: 'ADMIN' },
    });
  });

  it.each(['WELFARE_OFFICER', 'COMMANDER'] as const)(
    'rejects unsupported mobile role %s before creating a session',
    async (role) => {
      postSpy.mockResolvedValue(
        axiosResponse(
          backendResponse({
            user: {
              user_id: 'user-456',
              username: 'unsupported.user',
              role,
            },
          }),
        ),
      );

      await expect(
        loginWithCredentials({ username: 'unsupported.user', password: 'password' }),
      ).rejects.toMatchObject({ kind: 'role' });
    },
  );
});
