import { AxiosHeaders, type AxiosResponse } from 'axios';

import { apiClient } from '../api/client';
import { endpoints } from '../api/endpoints';
import type { SupportRequestListResponse, SupportRequestRecordResponse } from '../api/types';
import { parseSupportRequest, parseSupportRequestList, getMySupportRequests, createSupportRequest } from './supportService';

const record: SupportRequestRecordResponse = {
  support_request_id: 'support-fixture-1',
  related_alert_id: 'alert-fixture-1',
  category: 'WORKLOAD_FATIGUE',
  message: 'Please contact me privately.',
  urgency: 'URGENT',
  status: 'SCHEDULED',
  created_at: '2026-09-29T08:00:00Z',
  updated_at: '2026-09-29T09:00:00Z',
  acknowledged_at: '2026-09-29T08:30:00Z',
  scheduled_follow_up: '2026-10-01T10:00:00Z',
  closed_at: null,
};

function axiosResponse<T>(data: T): AxiosResponse<T> {
  const headers = new AxiosHeaders();
  return { data, status: 200, statusText: 'OK', headers, config: { headers } };
}

describe('supportService', () => {
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

  it('parses a support request and only the staff-provided follow-up time', () => {
    expect(parseSupportRequest(record)).toMatchObject({
      supportRequestId: 'support-fixture-1',
      relatedAlertId: 'alert-fixture-1',
      category: 'WORKLOAD_FATIGUE',
      urgency: 'URGENT',
      status: 'SCHEDULED',
      scheduledFollowUp: '2026-10-01T10:00:00Z',
    });
    expect(parseSupportRequest({ ...record, scheduled_follow_up: null }).scheduledFollowUp).toBeNull();
  });

  it('rejects malformed request and list payloads', () => {
    expect(() => parseSupportRequest({ ...record, status: 'DISMISSED' })).toThrow(
      expect.objectContaining({ kind: 'response' }),
    );
    expect(() => parseSupportRequestList({ requests: [{ ...record, urgency: 'ASAP' }] })).toThrow(
      expect.objectContaining({ kind: 'response' }),
    );
  });

  it('fetches the authenticated personnel request list', async () => {
    const response: SupportRequestListResponse = { requests: [record], count: 1 };
    getSpy.mockResolvedValue(axiosResponse(response));
    await expect(getMySupportRequests()).resolves.toHaveLength(1);
    expect(getSpy).toHaveBeenCalledWith(endpoints.supportRequests);
  });

  it('submits only the support fields provided by the personnel flow', async () => {
    postSpy.mockResolvedValue(axiosResponse(record));
    await createSupportRequest({
      related_alert_id: 'alert-fixture-1',
      category: 'WORKLOAD_FATIGUE',
      message: 'Please contact me privately.',
      urgency: 'URGENT',
    });
    expect(postSpy).toHaveBeenCalledWith(endpoints.supportRequests, {
      related_alert_id: 'alert-fixture-1',
      category: 'WORKLOAD_FATIGUE',
      message: 'Please contact me privately.',
      urgency: 'URGENT',
    });
  });
});
