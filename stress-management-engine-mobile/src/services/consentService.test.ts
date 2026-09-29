import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';

import { apiClient, ApiError } from '../api/client';
import { endpoints } from '../api/endpoints';
import type {
  ConsentRecordResponse,
  GetConsentResponse,
} from '../api/types';
import { parseConsentResponse, getConsent, setConsent } from './consentService';

const response: GetConsentResponse = {
  user_id: 'user-123',
  consents: [
    {
      consent_type: 'WELLNESS_DATA_PROCESSING',
      granted: true,
      timestamp: '2026-09-28T10:15:00+00:00',
    },
    {
      consent_type: 'DATA_SHARING',
      granted: false,
      timestamp: null,
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

describe('consentService', () => {
  const getSpy = jest.spyOn(apiClient, 'get');
  const postSpy = jest.spyOn(apiClient, 'post');

  beforeEach(() => {
    apiClient.defaults.baseURL = 'https://surakshai.test';
    getSpy.mockReset();
    postSpy.mockReset();
  });

  afterAll(() => {
    getSpy.mockRestore();
    postSpy.mockRestore();
  });

  it('parses only the consent state provided by the backend', () => {
    expect(parseConsentResponse(response)).toEqual({
      userId: 'user-123',
      consents: [
        {
          type: 'WELLNESS_DATA_PROCESSING',
          granted: true,
          updatedAt: '2026-09-28T10:15:00+00:00',
        },
        {
          type: 'DATA_SHARING',
          granted: false,
          updatedAt: null,
        },
      ],
    });
  });

  it.each([
    null,
    {},
    { user_id: 'user-123', consents: [{}] },
    {
      user_id: 'user-123',
      consents: [
        {
          consent_type: 'UNRECOGNIZED',
          granted: true,
          timestamp: null,
        },
      ],
    },
    {
      user_id: 'user-123',
      consents: [
        {
          consent_type: 'DATA_SHARING',
          granted: 'yes',
          timestamp: null,
        },
      ],
    },
    {
      user_id: 'user-123',
      consents: [
        {
          consent_type: 'DATA_SHARING',
          granted: false,
          timestamp: null,
        },
        {
          consent_type: 'DATA_SHARING',
          granted: true,
          timestamp: null,
        },
      ],
    },
  ])('rejects malformed consent response %j', (malformed) => {
    expect(() => parseConsentResponse(malformed)).toThrow(
      'The backend returned an unexpected consent response.',
    );
  });

  it('fetches and transforms GET /consent', async () => {
    getSpy.mockResolvedValue(axiosResponse(response));

    await expect(getConsent()).resolves.toEqual({
      userId: 'user-123',
      consents: [
        {
          type: 'WELLNESS_DATA_PROCESSING',
          granted: true,
          updatedAt: '2026-09-28T10:15:00+00:00',
        },
        { type: 'DATA_SHARING', granted: false, updatedAt: null },
      ],
    });
    expect(getSpy).toHaveBeenCalledWith(endpoints.consent);
  });

  it('normalizes a failed GET /consent request', async () => {
    getSpy.mockRejectedValue(
      new AxiosError('private network detail', 'ERR_NETWORK'),
    );

    await expect(getConsent()).rejects.toMatchObject({
      kind: 'network',
    });
  });

  it('sends the exact backend POST request and validates its result', async () => {
    const record: ConsentRecordResponse = {
      consent_type: 'BIOMETRIC_DATA_PROCESSING',
      granted: true,
      timestamp: '2026-09-28T10:15:00+00:00',
    };
    postSpy.mockResolvedValue(axiosResponse(record));

    await expect(
      setConsent({ type: 'BIOMETRIC_DATA_PROCESSING', granted: true }),
    ).resolves.toEqual(record);
    expect(postSpy).toHaveBeenCalledWith(endpoints.consent, {
      consent_type: 'BIOMETRIC_DATA_PROCESSING',
      granted: true,
    });
  });

  it('rejects a backend response inconsistent with the submitted decision', async () => {
    postSpy.mockResolvedValue(
      axiosResponse({
        consent_type: 'BIOMETRIC_DATA_PROCESSING',
        granted: false,
        timestamp: null,
      }),
    );

    await expect(
      setConsent({ type: 'BIOMETRIC_DATA_PROCESSING', granted: true }),
    ).rejects.toMatchObject({
      kind: 'response',
    });
  });

  it('normalizes a rejected POST /consent transition', async () => {
    postSpy.mockRejectedValue(
      new AxiosError('private backend detail', 'ERR_BAD_REQUEST', undefined, undefined, {
        data: { error: 'transition rejected' },
        status: 400,
        statusText: 'Bad Request',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
      }),
    );

    await expect(
      setConsent({ type: 'WELLNESS_DATA_PROCESSING', granted: false }),
    ).rejects.toMatchObject({
      kind: 'validation',
      statusCode: 400,
    });
  });

  it('preserves the shared unauthorized API error from the client', async () => {
    getSpy.mockRejectedValue(
      new ApiError('unauthorized', 'Your session has expired. Please sign in again.', 401),
    );

    await expect(getConsent()).rejects.toMatchObject({
      kind: 'unauthorized',
      statusCode: 401,
    });
  });
});
