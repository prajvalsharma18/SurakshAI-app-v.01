import {
  apiClient,
  ApiError,
  ensureApiConfigured,
  normalizeApiError,
} from '../api/client';
import { endpoints } from '../api/endpoints';
import type { HealthResponse } from '../api/types';

function isHealthResponse(data: unknown): data is HealthResponse {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const response = data as Record<string, unknown>;
  return (
    response.status === 'healthy' &&
    response.api === 'SURAKSHAI' &&
    typeof response.risk_engine === 'string' &&
    typeof response.timestamp === 'string'
  );
}

export async function getHealth(): Promise<HealthResponse> {
  try {
    ensureApiConfigured();
    const { data } = await apiClient.get<unknown>(endpoints.health);

    if (!isHealthResponse(data)) {
      throw new ApiError(
        'response',
        'The backend returned an unexpected health response.',
      );
    }

    return data;
  } catch (error: unknown) {
    throw normalizeApiError(error);
  }
}
