import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';

import {
  apiClient,
  ApiError,
  registerAuthSessionHooks,
} from '../api/client';
import { endpoints } from '../api/endpoints';
import type {
  PersonnelAlertsResponse,
  WelfareAlertRecordResponse,
} from '../api/types';
import {
  getPersonnelAlerts,
  getWelfareAlertDetail,
  parsePersonnelAlerts,
  parseWelfareAlertDetail,
} from './alertService';

const alertRecord: WelfareAlertRecordResponse = {
  alert_id: 'alert-fixture-1',
  personnel_id: 'personnel-fixture',
  created_at: '2026-09-29T08:00:00Z',
  reference_date: '2026-09-29',
  severity: 'ATTENTION',
  trigger_type: 'REPEATED_ELEVATED_RISK',
  current_risk_category: 'ELEVATED',
  model_version: 'fixture-model',
  status: 'OPEN',
  assigned_to: null,
  acknowledged_at: null,
  reviewed_at: null,
  resolved_at: null,
  resolution_type: null,
  source: 'welfare_workflow_service.evaluate',
  created_by: 'welfare_workflow_service.evaluate',
  persistence_reason: 'fixture-only',
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

describe('alertService', () => {
  const getSpy = jest.spyOn(apiClient, 'get');
  const originalAdapter = apiClient.defaults.adapter;

  beforeEach(() => {
    apiClient.defaults.baseURL = 'https://surakshai.test';
    getSpy.mockReset();
  });

  afterAll(() => {
    getSpy.mockRestore();
    apiClient.defaults.adapter = originalAdapter;
  });

  it('parses only personnel-facing alert details', () => {
    expect(parseWelfareAlertDetail(alertRecord)).toEqual({
      alertId: 'alert-fixture-1',
      referenceDate: '2026-09-29',
      createdAt: '2026-09-29T08:00:00Z',
      severity: 'ATTENTION',
      triggerType: 'REPEATED_ELEVATED_RISK',
      currentRiskCategory: 'ELEVATED',
      status: 'OPEN',
      acknowledgedAt: null,
      reviewedAt: null,
      resolvedAt: null,
    });
  });

  it('rejects malformed alert records and list responses', () => {
    const malformedRecords: unknown[] = [
      null,
      {},
      { ...alertRecord, severity: 'CRITICAL' },
      { ...alertRecord, trigger_type: 'UNKNOWN_TRIGGER' },
      { ...alertRecord, status: 'NEW' },
      { ...alertRecord, reference_date: '2026-02-30' },
      { ...alertRecord, acknowledged_at: 'not-a-date' },
      { ...alertRecord, assigned_to: 42 },
      { ...alertRecord, persistence_reason: null },
    ];

    for (const malformed of malformedRecords) {
      expect(() => parseWelfareAlertDetail(malformed)).toThrow(
        expect.objectContaining({ kind: 'response' }),
      );
    }
    expect(() => parsePersonnelAlerts({ alerts: [alertRecord, {}] })).toThrow(
      expect.objectContaining({ kind: 'response' }),
    );
    expect(() => parsePersonnelAlerts({})).toThrow(
      expect.objectContaining({ kind: 'response' }),
    );
  });

  it('accepts the backend empty-list response', () => {
    expect(parsePersonnelAlerts({ alerts: [] })).toEqual([]);
  });

  it('fetches personnel alerts from the exact backend endpoint', async () => {
    const response: PersonnelAlertsResponse = { alerts: [alertRecord] };
    getSpy.mockResolvedValue(axiosResponse(response));

    await expect(getPersonnelAlerts('personnel-fixture')).resolves.toHaveLength(1);
    expect(getSpy).toHaveBeenCalledWith(
      endpoints.personnelAlerts('personnel-fixture'),
    );
  });

  it('fetches alert detail by backend alert ID', async () => {
    getSpy.mockResolvedValue(axiosResponse(alertRecord));

    await expect(
      getWelfareAlertDetail('alert-fixture-1'),
    ).resolves.toMatchObject({
      alertId: 'alert-fixture-1',
      status: 'OPEN',
    });
    expect(getSpy).toHaveBeenCalledWith(
      endpoints.welfareAlertDetail('alert-fixture-1'),
    );
  });

  it('normalizes backend, network, and session errors without exposing details', async () => {
    getSpy.mockRejectedValue(
      new AxiosError(
        'private workflow detail',
        'ERR_BAD_RESPONSE',
        undefined,
        undefined,
        {
          data: { error: 'private workflow detail' },
          status: 503,
          statusText: 'Service Unavailable',
          headers: new AxiosHeaders(),
          config: { headers: new AxiosHeaders() },
        },
      ),
    );
    await expect(getPersonnelAlerts('personnel-fixture')).rejects.toMatchObject({
      kind: 'server',
      statusCode: 503,
    });

    getSpy.mockRejectedValue(new AxiosError('private network detail', 'ERR_NETWORK'));
    await expect(getPersonnelAlerts('personnel-fixture')).rejects.toMatchObject({
      kind: 'network',
    });

    getSpy.mockRejectedValue(
      new ApiError('unauthorized', 'Your session has expired. Please sign in again.', 401),
    );
    await expect(
      getWelfareAlertDetail('alert-fixture-1'),
    ).rejects.toMatchObject({
      kind: 'unauthorized',
      statusCode: 401,
    });
  });

  it('uses the shared authenticated 401 session invalidation flow', async () => {
    getSpy.mockRestore();
    const onUnauthorized = jest.fn();
    const unregister = registerAuthSessionHooks({
      getAccessToken: () => 'alerts-fixture-token',
      onUnauthorized,
    });
    apiClient.defaults.adapter = async (config) => {
      throw new AxiosError('private authorization detail', 'ERR_BAD_REQUEST', config, undefined, {
        data: { error: 'private authorization detail' },
        status: 401,
        statusText: 'Unauthorized',
        headers: new AxiosHeaders(),
        config,
      });
    };

    try {
      await expect(
        getPersonnelAlerts('personnel-fixture'),
      ).rejects.toMatchObject({
        kind: 'unauthorized',
        statusCode: 401,
      });
      expect(onUnauthorized).toHaveBeenCalledWith('alerts-fixture-token');
    } finally {
      unregister();
      apiClient.defaults.adapter = originalAdapter;
    }
  });
});
