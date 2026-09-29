import {
  ApiError,
  apiClient,
  ensureApiConfigured,
  normalizeApiError,
} from '../api/client';
import { endpoints } from '../api/endpoints';
import type {
  CreateSupportRequestRequest,
  SupportRequestListResponse,
  SupportRequestRecordResponse,
} from '../api/types';
import type { SupportRequest } from '../types/support';

const categories = [
  'GENERAL_WELFARE',
  'WORKLOAD_FATIGUE',
  'SLEEP_RECOVERY',
  'PERSONAL_SUPPORT',
  'OTHER',
] as const;
const statuses = ['REQUESTED', 'ACKNOWLEDGED', 'SCHEDULED', 'IN_PROGRESS', 'RESOLVED'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isDateTime(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isNullableDateTime(value: unknown): value is string | null {
  return value === null || isDateTime(value);
}

function isSupportRequestRecord(value: unknown): value is SupportRequestRecordResponse {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isString(value.support_request_id) &&
    (value.related_alert_id === null || isString(value.related_alert_id)) &&
    typeof value.category === 'string' && categories.includes(value.category as typeof categories[number]) &&
    isNullableString(value.message) &&
    (value.urgency === 'NORMAL' || value.urgency === 'URGENT') &&
    typeof value.status === 'string' && statuses.includes(value.status as typeof statuses[number]) &&
    isDateTime(value.created_at) &&
    isDateTime(value.updated_at) &&
    isNullableDateTime(value.acknowledged_at) &&
    isNullableDateTime(value.scheduled_follow_up) &&
    isNullableDateTime(value.closed_at)
  );
}

function toSupportRequest(record: SupportRequestRecordResponse): SupportRequest {
  return {
    supportRequestId: record.support_request_id,
    relatedAlertId: record.related_alert_id,
    category: record.category,
    message: record.message,
    urgency: record.urgency,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    acknowledgedAt: record.acknowledged_at,
    scheduledFollowUp: record.scheduled_follow_up,
    closedAt: record.closed_at,
  };
}

export function parseSupportRequest(value: unknown): SupportRequest {
  if (!isSupportRequestRecord(value)) {
    throw new ApiError('response', 'The backend returned an unexpected support request.');
  }
  return toSupportRequest(value);
}

export function parseSupportRequestList(value: unknown): SupportRequest[] {
  if (
    !isRecord(value) ||
    !Array.isArray(value.requests) ||
    !value.requests.every(isSupportRequestRecord) ||
    (value.count !== undefined && value.count !== value.requests.length)
  ) {
    throw new ApiError('response', 'The backend returned an unexpected support request list.');
  }
  return (value.requests as SupportRequestRecordResponse[]).map(toSupportRequest);
}

export async function getMySupportRequests(): Promise<SupportRequest[]> {
  try {
    ensureApiConfigured();
    const { data } = await apiClient.get<SupportRequestListResponse>(endpoints.supportRequests);
    return parseSupportRequestList(data);
  } catch (error: unknown) {
    throw normalizeApiError(error);
  }
}

export async function createSupportRequest(
  request: CreateSupportRequestRequest,
): Promise<SupportRequest> {
  try {
    ensureApiConfigured();
    const { data } = await apiClient.post<unknown>(endpoints.supportRequests, request);
    return parseSupportRequest(data);
  } catch (error: unknown) {
    throw normalizeApiError(error);
  }
}
