import { ApiError, apiClient, ensureApiConfigured, normalizeApiError } from '../api/client';
import { endpoints } from '../api/endpoints';
import type {
  WellnessAssessmentRecord,
  WellnessAssessmentRequest,
} from '../api/types';
import type {
  WellnessAssessment,
  WellnessFormErrors,
  WellnessFormState,
  WellnessScaleValue,
} from '../types/wellness';

const wellnessFieldKeys = [
  'sleepQuality',
  'fatigueLevel',
  'perceivedStress',
  'moodWellbeing',
] as const;

const fieldDisplayNames: Record<string, string> = {
  assessmentDate: 'Assessment date',
  sleepQuality: 'Sleep quality',
  fatigueLevel: 'Fatigue level',
  perceivedStress: 'Perceived stress',
  moodWellbeing: 'Mood and wellbeing',
};

type ValidatedWellnessAssessmentRecord = Omit<
  WellnessAssessmentRecord,
  | 'sleep_quality'
  | 'fatigue_level'
  | 'perceived_stress'
  | 'mood_wellbeing'
> & {
  sleep_quality: WellnessScaleValue;
  fatigue_level: WellnessScaleValue;
  perceived_stress: WellnessScaleValue;
  mood_wellbeing: WellnessScaleValue;
};

function isWellnessScaleValue(value: unknown): value is WellnessScaleValue {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isWellnessAssessmentRecord(
  value: unknown,
): value is ValidatedWellnessAssessmentRecord {
  if (!isRecord(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.assessment_id === 'string' &&
    record.assessment_id.length > 0 &&
    typeof record.personnel_id === 'string' &&
    record.personnel_id.length > 0 &&
    typeof record.assessment_date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(record.assessment_date) &&
    typeof record.submitted_at === 'string' &&
    record.submitted_at.length > 0 &&
    isWellnessScaleValue(record.sleep_quality) &&
    isWellnessScaleValue(record.fatigue_level) &&
    isWellnessScaleValue(record.perceived_stress) &&
    isWellnessScaleValue(record.mood_wellbeing)
  );
}

export function parseWellnessAssessment(
  value: unknown,
): WellnessAssessment {
  if (!isWellnessAssessmentRecord(value)) {
    throw new ApiError(
      'response',
      'The backend returned an unexpected wellness response.',
    );
  }

  return {
    assessmentId: value.assessment_id,
    personnelId: value.personnel_id,
    assessmentDate: value.assessment_date,
    submittedAt: value.submitted_at,
    sleepQuality: value.sleep_quality,
    fatigueLevel: value.fatigue_level,
    perceivedStress: value.perceived_stress,
    moodWellbeing: value.mood_wellbeing,
  };
}

export function parseWellnessListResponse(data: unknown): WellnessAssessment[] {
  if (!isRecord(data)) {
    throw new ApiError(
      'response',
      'The backend returned an unexpected wellness response.',
    );
  }

  const response = data as Record<string, unknown>;
  if (!Array.isArray(response.assessments)) {
    throw new ApiError(
      'response',
      'The backend returned an unexpected wellness response.',
    );
  }

  return response.assessments.map((entry) => parseWellnessAssessment(entry));
}

export function validateWellnessForm(
  form: WellnessFormState,
): WellnessFormErrors {
  const errors: WellnessFormErrors = {};

  const assessmentDate = form.assessmentDate.trim();
  if (!assessmentDate) {
    errors.assessmentDate = 'Assessment date is required.';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(assessmentDate)) {
    errors.assessmentDate = 'Assessment date must use YYYY-MM-DD format.';
  } else {
    const parsed = new Date(`${assessmentDate}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      errors.assessmentDate = 'Assessment date must use YYYY-MM-DD format.';
    } else if (parsed > new Date()) {
      errors.assessmentDate = 'Assessment date cannot be in the future.';
    }
  }

  for (const key of wellnessFieldKeys) {
    const value = form[key].trim();
    const numericValue = Number(value);
    if (!value) {
      errors[key] = `${fieldDisplayNames[key]} is required.`;
      continue;
    }
    if (!Number.isInteger(numericValue) || numericValue < 1 || numericValue > 5) {
      errors[key] = `${fieldDisplayNames[key]} must be a whole number from 1 to 5.`;
    }
  }

  return errors;
}

export function buildWellnessRequest(
  form: WellnessFormState,
): WellnessAssessmentRequest {
  const validation = validateWellnessForm(form);
  if (Object.keys(validation).length > 0) {
    throw new ApiError('response', 'Please review the highlighted responses.');
  }

  return {
    assessment_date: form.assessmentDate,
    sleep_quality: Number(form.sleepQuality),
    fatigue_level: Number(form.fatigueLevel),
    perceived_stress: Number(form.perceivedStress),
    mood_wellbeing: Number(form.moodWellbeing),
  };
}

export async function getWellnessAssessments(): Promise<WellnessAssessment[]> {
  try {
    ensureApiConfigured();
    const { data } = await apiClient.get<unknown>(endpoints.wellness);
    return parseWellnessListResponse(data);
  } catch (error: unknown) {
    throw normalizeApiError(error, { unauthorized: true });
  }
}

export async function submitWellnessAssessment(
  request: WellnessAssessmentRequest,
): Promise<WellnessAssessment> {
  try {
    ensureApiConfigured();
    const { data } = await apiClient.post<unknown>(
      endpoints.wellness,
      request,
    );
    return parseWellnessAssessment(data);
  } catch (error: unknown) {
    throw normalizeApiError(error, { unauthorized: true });
  }
}
