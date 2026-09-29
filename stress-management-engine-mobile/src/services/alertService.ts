import {
  ApiError,
  apiClient,
  ensureApiConfigured,
  normalizeApiError,
} from '../api/client';
import { endpoints } from '../api/endpoints';
import type {
  PersonnelAlertsResponse,
  WelfareAlertRecordResponse,
} from '../api/types';
import type { WelfareAlert } from '../types/alert';

const alertSeverities = ['INFO', 'ATTENTION', 'PRIORITY'] as const;
const alertTriggers = [
  'REPEATED_ELEVATED_RISK',
  'PERSISTENT_HIGH_RISK',
] as const;
const alertStatuses = [
  'OPEN',
  'ACKNOWLEDGED',
  'UNDER_REVIEW',
  'ACTION_PLANNED',
  'FOLLOW_UP',
  'RESOLVED',
  'DISMISSED',
] as const;
const riskCategories = ['ELEVATED', 'HIGH'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isNonEmptyString(value);
}

function isOneOf<const T extends readonly string[]>(
  value: unknown,
  options: T,
): value is T[number] {
  return typeof value === 'string' && options.some((option) => option === value);
}

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isDateTime(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function isNullableDateTime(value: unknown): value is string | null {
  return value === null || isDateTime(value);
}

function isWelfareAlertRecord(
  value: unknown,
): value is WelfareAlertRecordResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.alert_id) &&
    isNonEmptyString(value.personnel_id) &&
    isDateTime(value.created_at) &&
    isDate(value.reference_date) &&
    isOneOf(value.severity, alertSeverities) &&
    isOneOf(value.trigger_type, alertTriggers) &&
    isOneOf(value.current_risk_category, riskCategories) &&
    isNonEmptyString(value.model_version) &&
    isOneOf(value.status, alertStatuses) &&
    isNullableString(value.assigned_to) &&
    isNullableDateTime(value.acknowledged_at) &&
    isNullableDateTime(value.reviewed_at) &&
    isNullableDateTime(value.resolved_at) &&
    isNullableString(value.resolution_type) &&
    isNonEmptyString(value.source) &&
    isNonEmptyString(value.created_by) &&
    isNonEmptyString(value.persistence_reason) &&
    (value.seed_batch_id === undefined || isNonEmptyString(value.seed_batch_id))
  );
}

function isPersonnelAlertsResponse(
  value: unknown,
): value is PersonnelAlertsResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.alerts) &&
    value.alerts.every(isWelfareAlertRecord)
  );
}

function toWelfareAlert(record: WelfareAlertRecordResponse): WelfareAlert {
  return {
    alertId: record.alert_id,
    referenceDate: record.reference_date,
    createdAt: record.created_at,
    severity: record.severity,
    triggerType: record.trigger_type,
    currentRiskCategory: record.current_risk_category,
    status: record.status,
    acknowledgedAt: record.acknowledged_at,
    reviewedAt: record.reviewed_at,
    resolvedAt: record.resolved_at,
  };
}

export function parsePersonnelAlerts(value: unknown): WelfareAlert[] {
  if (!isPersonnelAlertsResponse(value)) {
    throw new ApiError(
      'response',
      'The backend returned an unexpected welfare alerts response.',
    );
  }

  return value.alerts.map(toWelfareAlert);
}

export function parseWelfareAlertDetail(value: unknown): WelfareAlert {
  if (!isWelfareAlertRecord(value)) {
    throw new ApiError(
      'response',
      'The backend returned an unexpected welfare alert response.',
    );
  }
  return toWelfareAlert(value);
}

export async function getPersonnelAlerts(
  personnelId: string,
): Promise<WelfareAlert[]> {
  try {
    ensureApiConfigured();
    const { data } = await apiClient.get<unknown>(
      endpoints.personnelAlerts(encodeURIComponent(personnelId)),
    );
    return parsePersonnelAlerts(data);
  } catch (error: unknown) {
    throw normalizeApiError(error);
  }
}

export async function getWelfareAlertDetail(
  alertId: string,
): Promise<WelfareAlert> {
  try {
    ensureApiConfigured();
    const { data } = await apiClient.get<unknown>(
      endpoints.welfareAlertDetail(encodeURIComponent(alertId)),
    );
    return parseWelfareAlertDetail(data);
  } catch (error: unknown) {
    throw normalizeApiError(error);
  }
}
