import { ApiError, apiClient, ensureApiConfigured, normalizeApiError } from '../api/client';
import { endpoints } from '../api/endpoints';
import type {
  WelfareRecommendationItemResponse,
  WelfareRecommendationsResponse,
} from '../api/types';
import type { RiskCategory } from '../types/risk';
import type {
  WelfareRecommendationCategory,
  WelfareRecommendationPriority,
  WelfareRecommendations,
} from '../types/recommendation';

const recommendationCategories = [
  'WORKLOAD',
  'RECOVERY',
  'SLEEP',
  'DUTY_SCHEDULING',
  'LEAVE',
  'SOCIAL_SUPPORT',
  'REFERRAL',
  'GENERAL',
] as const satisfies readonly WelfareRecommendationCategory[];

const recommendationPriorities = ['LOW', 'MEDIUM', 'HIGH'] as const satisfies readonly WelfareRecommendationPriority[];
const riskCategories = ['LOW', 'ELEVATED', 'HIGH'] as const satisfies readonly RiskCategory[];
const dataModes = ['OPERATIONAL_AND_WELLNESS', 'OPERATIONAL_ONLY'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOneOf<const T extends readonly string[]>(
  value: unknown,
  options: T,
): value is T[number] {
  return typeof value === 'string' && options.some((option) => option === value);
}

function isRecommendation(
  value: unknown,
): value is WelfareRecommendationItemResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isOneOf(value.category, recommendationCategories) &&
    isNonEmptyString(value.action) &&
    isOneOf(value.priority, recommendationPriorities) &&
    isNonEmptyString(value.rationale) &&
    Array.isArray(value.sources) &&
    value.sources.length > 0 &&
    value.sources.every(isNonEmptyString)
  );
}

function isWelfareRecommendationsResponse(
  value: unknown,
): value is WelfareRecommendationsResponse {
  return (
    isRecord(value) &&
    isNonEmptyString(value.personnel_id) &&
    isValidReferenceDate(value.reference_date) &&
    isOneOf(value.risk_category, riskCategories) &&
    isNonEmptyString(value.model_version) &&
    isOneOf(value.data_mode, dataModes) &&
    Array.isArray(value.recommendations) &&
    value.recommendations.every(isRecommendation)
  );
}

function isValidReferenceDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function parseWelfareRecommendations(
  value: unknown,
): WelfareRecommendations {
  if (!isWelfareRecommendationsResponse(value)) {
    throw new ApiError(
      'response',
      'The backend returned an unexpected welfare recommendations response.',
    );
  }

  return {
    personnelId: value.personnel_id,
    referenceDate: value.reference_date,
    riskCategory: value.risk_category,
    modelVersion: value.model_version,
    dataMode: value.data_mode,
    recommendations: value.recommendations.map((recommendation) => ({
      category: recommendation.category,
      action: recommendation.action,
      priority: recommendation.priority,
      rationale: recommendation.rationale,
      sources: [...recommendation.sources],
    })),
  };
}

export async function getWelfareRecommendations(
  personnelId: string,
): Promise<WelfareRecommendations> {
  try {
    ensureApiConfigured();
    const { data } = await apiClient.get<unknown>(
      endpoints.welfareRecommendations(encodeURIComponent(personnelId)),
    );
    return parseWelfareRecommendations(data);
  } catch (error: unknown) {
    throw normalizeApiError(error);
  }
}
