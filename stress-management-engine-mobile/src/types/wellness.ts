export const wellnessScaleOptions = [1, 2, 3, 4, 5] as const;

export type WellnessScaleValue = (typeof wellnessScaleOptions)[number];

export type WellnessFieldKey =
  | 'sleepQuality'
  | 'fatigueLevel'
  | 'perceivedStress'
  | 'moodWellbeing';

export type WellnessAssessment = {
  assessmentId: string;
  personnelId: string;
  assessmentDate: string;
  submittedAt: string;
  sleepQuality: WellnessScaleValue;
  fatigueLevel: WellnessScaleValue;
  perceivedStress: WellnessScaleValue;
  moodWellbeing: WellnessScaleValue;
};

export type WellnessFormState = {
  assessmentDate: string;
  sleepQuality: string;
  fatigueLevel: string;
  perceivedStress: string;
  moodWellbeing: string;
};

export type WellnessFormErrors = Partial<Record<keyof WellnessFormState, string>>;

export type WellnessState =
  | 'INITIAL_LOADING'
  | 'READY'
  | 'EMPTY'
  | 'SUBMITTING'
  | 'SUCCESS'
  | 'ERROR';
