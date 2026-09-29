import {
  apiClient,
  ApiError,
  ensureApiConfigured,
  normalizeApiError,
} from '../api/client';
import { endpoints } from '../api/endpoints';
import type {
  ConsentRecordResponse,
  SetConsentRequest,
} from '../api/types';
import {
  consentTypes,
  type ConsentDecision,
  type ConsentSettings,
  type ConsentType,
} from '../types/consent';

function isConsentType(value: unknown): value is ConsentType {
  return (
    typeof value === 'string' &&
    consentTypes.some((consentType) => consentType === value)
  );
}

function isConsentRecordResponse(
  value: unknown,
): value is ConsentRecordResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    isConsentType(record.consent_type) &&
    typeof record.granted === 'boolean' &&
    (typeof record.timestamp === 'string' || record.timestamp === null)
  );
}

export function parseConsentResponse(data: unknown): ConsentSettings {
  if (typeof data !== 'object' || data === null) {
    throw new ApiError('response', 'The backend returned an unexpected consent response.');
  }

  const response = data as Record<string, unknown>;
  if (
    typeof response.user_id !== 'string' ||
    !response.user_id ||
    !Array.isArray(response.consents) ||
    !response.consents.every(isConsentRecordResponse)
  ) {
    throw new ApiError('response', 'The backend returned an unexpected consent response.');
  }

  const records = response.consents as ConsentRecordResponse[];
  if (new Set(records.map((record) => record.consent_type)).size !== records.length) {
    throw new ApiError('response', 'The backend returned an unexpected consent response.');
  }

  return {
    userId: response.user_id,
    consents: records.map((record) => ({
      type: record.consent_type,
      granted: record.granted,
      updatedAt: record.timestamp,
    })),
  };
}

function parseConsentRecord(data: unknown): ConsentRecordResponse {
  if (!isConsentRecordResponse(data)) {
    throw new ApiError('response', 'The backend returned an unexpected consent response.');
  }
  return data;
}

export async function getConsent(): Promise<ConsentSettings> {
  try {
    ensureApiConfigured();
    const { data } = await apiClient.get<unknown>(endpoints.consent);
    return parseConsentResponse(data);
  } catch (error: unknown) {
    throw normalizeApiError(error);
  }
}

export async function setConsent(
  decision: ConsentDecision,
): Promise<ConsentRecordResponse> {
  try {
    ensureApiConfigured();
    const request: SetConsentRequest = {
      consent_type: decision.type,
      granted: decision.granted,
    };
    const { data } = await apiClient.post<unknown>(endpoints.consent, request);
    const record = parseConsentRecord(data);
    if (
      record.consent_type !== decision.type ||
      record.granted !== decision.granted
    ) {
      throw new ApiError('response', 'The backend returned an unexpected consent response.');
    }
    return record;
  } catch (error: unknown) {
    throw normalizeApiError(error);
  }
}
