import {
  ApiError,
  apiClient,
  ensureApiConfigured,
  normalizeApiError,
} from '../api/client';
import { endpoints } from '../api/endpoints';
import type {
  RiskExplanationResponse,
  RiskHistoryResponse,
  RiskPredictionResponse,
} from '../api/types';
import type {
  CurrentRisk,
  RiskCategory,
  RiskExplanation,
  RiskHistoryItem,
  ShapContributor,
} from '../types/risk';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRiskCategory(value: unknown): value is RiskCategory {
  return value === 'LOW' || value === 'ELEVATED' || value === 'HIGH';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseRiskPredictionResponse(data: unknown): CurrentRisk {
  if (!isRecord(data)) {
    throw new ApiError(
      'response',
      'The backend returned an unexpected risk prediction response.',
    );
  }

  const record = data as Record<string, unknown>;
  if (
    typeof record.personnel_id !== 'string' ||
    record.personnel_id.length === 0 ||
    !isDateString(record.reference_date) ||
    !isRiskCategory(record.risk_category)
  ) {
    throw new ApiError(
      'response',
      'The backend returned an unexpected risk prediction response.',
    );
  }

  if (record.probabilities !== undefined && record.probabilities !== null) {
    const probabilities = record.probabilities;
    if (!isRecord(probabilities)) {
      throw new ApiError(
        'response',
        'The backend returned an unexpected risk prediction response.',
      );
    }

    const values = Object.values(probabilities);
    if (
      values.length === 0 ||
      values.some((value) => !isFiniteNumber(value))
    ) {
      throw new ApiError(
        'response',
        'The backend returned an unexpected risk prediction response.',
      );
    }
  }

  if (
    (record.model_version !== undefined &&
      record.model_version !== null &&
      typeof record.model_version !== 'string') ||
    (record.data_mode !== undefined &&
      record.data_mode !== null &&
      typeof record.data_mode !== 'string')
  ) {
    throw new ApiError(
      'response',
      'The backend returned an unexpected risk prediction response.',
    );
  }

  return {
    personnelId: record.personnel_id,
    referenceDate: record.reference_date,
    riskCategory: record.risk_category,
    ...(typeof record.model_version === 'string' ? { modelVersion: record.model_version } : {}),
    ...(typeof record.data_mode === 'string' ? { dataMode: record.data_mode } : {}),
  };
}

export function parseRiskHistoryResponse(data: unknown): RiskHistoryItem[] {
  if (!isRecord(data)) {
    throw new ApiError(
      'response',
      'The backend returned an unexpected risk history response.',
    );
  }

  const response = data as Record<string, unknown>;
  if (!Array.isArray(response.items)) {
    throw new ApiError(
      'response',
      'The backend returned an unexpected risk history response.',
    );
  }

  return response.items.map((entry) => {
    if (!isRecord(entry)) {
      throw new ApiError(
        'response',
        'The backend returned an unexpected risk history response.',
      );
    }

    const record = entry as Record<string, unknown>;
    if (
      !isDateString(record.reference_date) ||
      !isRiskCategory(record.risk_category)
    ) {
      throw new ApiError(
        'response',
        'The backend returned an unexpected risk history response.',
      );
    }

    if (
      (record.model_version !== undefined &&
        record.model_version !== null &&
        typeof record.model_version !== 'string') ||
      (record.data_mode !== undefined &&
        record.data_mode !== null &&
        typeof record.data_mode !== 'string') ||
      (record.created_at !== undefined &&
        record.created_at !== null &&
        typeof record.created_at !== 'string')
    ) {
      throw new ApiError(
        'response',
        'The backend returned an unexpected risk history response.',
      );
    }

    return {
      referenceDate: record.reference_date,
      riskCategory: record.risk_category,
      ...(typeof record.model_version === 'string' ? { modelVersion: record.model_version } : {}),
      ...(typeof record.data_mode === 'string' ? { dataMode: record.data_mode } : {}),
      ...(typeof record.created_at === 'string' ? { createdAt: record.created_at } : {}),
    };
  });
}

function toDirection(value: unknown): ShapContributor['direction'] {
  if (value === 'increases_predicted_risk') {
    return 'positive';
  }
  if (value === 'decreases_predicted_risk') {
    return 'negative';
  }
  throw new ApiError(
    'response',
    'The backend returned an unexpected SHAP explanation response.',
  );
}

export function parseRiskExplanationResponse(data: unknown): RiskExplanation {
  if (!isRecord(data)) {
    throw new ApiError(
      'response',
      'The backend returned an unexpected SHAP explanation response.',
    );
  }

  const response = data as Record<string, unknown>;
  if (!isRecord(response.explanation)) {
    throw new ApiError(
      'response',
      'The backend returned an unexpected SHAP explanation response.',
    );
  }

  const explanation = response.explanation as Record<string, unknown>;
  if (!isRiskCategory(explanation.predicted_class)) {
    throw new ApiError(
      'response',
      'The backend returned an unexpected SHAP explanation response.',
    );
  }

  if (!Array.isArray(explanation.top_contributors)) {
    throw new ApiError(
      'response',
      'The backend returned an unexpected SHAP explanation response.',
    );
  }

  const contributors = explanation.top_contributors.map((entry) => {
    if (!isRecord(entry)) {
      throw new ApiError(
        'response',
        'The backend returned an unexpected SHAP explanation response.',
      );
    }

    const contributor = entry as Record<string, unknown>;
    if (
      typeof contributor.feature !== 'string' ||
      contributor.feature.length === 0 ||
      typeof contributor.label !== 'string' ||
      contributor.label.length === 0 ||
      !isFiniteNumber(contributor.shap_value) ||
      (typeof contributor.direction !== 'string' && contributor.direction !== undefined)
    ) {
      throw new ApiError(
        'response',
        'The backend returned an unexpected SHAP explanation response.',
      );
    }

    const direction = toDirection(contributor.direction);
    const interpretation =
      direction === 'positive'
        ? 'Positive contribution to this prediction.'
        : 'Negative contribution to this prediction.';

    return {
      feature: contributor.feature,
      label: contributor.label,
      shapValue: contributor.shap_value,
      direction,
      interpretation,
    } satisfies ShapContributor;
  });

  return {
    predictedClass: explanation.predicted_class,
    contributors,
  };
}

export async function getCurrentRiskPrediction(
  personnelId: string,
): Promise<CurrentRisk> {
  try {
    ensureApiConfigured();
    const { data } = await apiClient.get<unknown>(
      endpoints.riskPrediction(personnelId),
    );
    return parseRiskPredictionResponse(data);
  } catch (error: unknown) {
    throw normalizeApiError(error);
  }
}

export const getCurrentRisk = getCurrentRiskPrediction;
export const fetchCurrentRisk = getCurrentRiskPrediction;

export async function getRiskHistory(
  personnelId: string,
): Promise<RiskHistoryItem[]> {
  try {
    ensureApiConfigured();
    const { data } = await apiClient.get<unknown>(endpoints.riskHistory(personnelId));
    return parseRiskHistoryResponse(data);
  } catch (error: unknown) {
    throw normalizeApiError(error);
  }
}

export const fetchRiskHistory = getRiskHistory;

export async function getRiskExplanation(
  personnelId: string,
): Promise<RiskExplanation> {
  try {
    ensureApiConfigured();
    const { data } = await apiClient.get<unknown>(
      endpoints.riskExplanation(personnelId),
    );
    return parseRiskExplanationResponse(data);
  } catch (error: unknown) {
    throw normalizeApiError(error);
  }
}

export const fetchRiskExplanation = getRiskExplanation;

export type RiskPrediction = CurrentRisk;
export type RiskHistory = RiskHistoryItem[];
export type RiskExplanationResult = RiskExplanation;

export const riskPredictionResponseShape = null as unknown as RiskPredictionResponse;
export const riskHistoryResponseShape = null as unknown as RiskHistoryResponse;
export const riskExplanationResponseShape = null as unknown as RiskExplanationResponse;
