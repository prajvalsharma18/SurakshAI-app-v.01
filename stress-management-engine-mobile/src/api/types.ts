import type { UserRole } from '../auth/authTypes';
import type { ConsentType } from '../types/consent';
import type {
  WelfareRecommendationCategory,
  WelfareRecommendationPriority,
} from '../types/recommendation';
import type {
  WelfareAlertSeverity,
  WelfareAlertStatus,
  WelfareAlertTrigger,
} from '../types/alert';

export type HealthResponse = {
  status: 'healthy';
  api: 'SURAKSHAI';
  risk_engine: string;
  timestamp: string;
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type BackendUser = {
  user_id: string;
  username: string;
  role: UserRole;
  personnel_id?: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  expires_at: string;
  user: BackendUser;
};

export type ConsentRecordResponse = {
  consent_type: ConsentType;
  granted: boolean;
  timestamp: string | null;
};

export type GetConsentResponse = {
  user_id: string;
  consents: ConsentRecordResponse[];
};

export type SupportRequestCategory =
  | 'GENERAL_WELFARE'
  | 'WORKLOAD_FATIGUE'
  | 'SLEEP_RECOVERY'
  | 'PERSONAL_SUPPORT'
  | 'OTHER';

export type SupportRequestUrgency = 'NORMAL' | 'URGENT';

export type SupportRequestStatus =
  | 'REQUESTED'
  | 'ACKNOWLEDGED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'RESOLVED';

export type SupportRequestRecordResponse = {
  support_request_id: string;
  related_alert_id: string | null;
  category: SupportRequestCategory;
  message: string | null;
  urgency: SupportRequestUrgency;
  status: SupportRequestStatus;
  created_at: string;
  updated_at: string;
  acknowledged_at: string | null;
  scheduled_follow_up: string | null;
  closed_at: string | null;
};

export type SupportRequestListResponse = {
  requests: SupportRequestRecordResponse[];
  count: number;
};

export type CreateSupportRequestRequest = {
  related_alert_id?: string;
  category: SupportRequestCategory;
  message?: string;
  urgency: SupportRequestUrgency;
};

export type SetConsentRequest = {
  consent_type: ConsentType;
  granted: boolean;
};

export type WellnessAssessmentRequest = {
  assessment_date: string;
  sleep_quality: number;
  fatigue_level: number;
  perceived_stress: number;
  mood_wellbeing: number;
};

export type WellnessAssessmentRecord = {
  assessment_id: string;
  personnel_id: string;
  assessment_date: string;
  submitted_at: string;
  sleep_quality: number;
  fatigue_level: number;
  perceived_stress: number;
  mood_wellbeing: number;
};

export type RiskPredictionResponse = {
  personnel_id: string;
  reference_date: string;
  risk_category: 'LOW' | 'ELEVATED' | 'HIGH';
  probabilities?: Record<string, number>;
  model_version?: string;
  data_mode?: string;
};

export type RiskHistoryItemResponse = {
  reference_date: string;
  risk_category: 'LOW' | 'ELEVATED' | 'HIGH';
  model_version?: string;
  data_mode?: string;
  probabilities?: Record<string, number>;
  created_at?: string;
};

export type RiskHistoryResponse = {
  items: RiskHistoryItemResponse[];
  page: number;
  page_size: number;
  total: number;
};

export type RiskExplanationContributorResponse = {
  feature: string;
  label: string;
  shap_value: number;
  direction: 'increases_predicted_risk' | 'decreases_predicted_risk';
};

export type RiskExplanationResponse = {
  explanation: {
    method: 'SHAP';
    predicted_class: 'LOW' | 'ELEVATED' | 'HIGH';
    top_contributors: RiskExplanationContributorResponse[];
  };
};

export type WelfareRecommendationItemResponse = {
  category: WelfareRecommendationCategory;
  action: string;
  priority: WelfareRecommendationPriority;
  rationale: string;
  sources: string[];
};

export type WelfareRecommendationsResponse = {
  personnel_id: string;
  reference_date: string;
  risk_category: 'LOW' | 'ELEVATED' | 'HIGH';
  model_version: string;
  data_mode: 'OPERATIONAL_AND_WELLNESS' | 'OPERATIONAL_ONLY';
  recommendations: WelfareRecommendationItemResponse[];
};

export type WelfareAlertRecordResponse = {
  alert_id: string;
  personnel_id: string;
  created_at: string;
  reference_date: string;
  severity: WelfareAlertSeverity;
  trigger_type: WelfareAlertTrigger;
  current_risk_category: 'ELEVATED' | 'HIGH';
  model_version: string;
  status: WelfareAlertStatus;
  assigned_to: string | null;
  acknowledged_at: string | null;
  reviewed_at: string | null;
  resolved_at: string | null;
  resolution_type: string | null;
  source: string;
  created_by: string;
  persistence_reason: string;
  seed_batch_id?: string;
};

export type PersonnelAlertsResponse = {
  alerts: WelfareAlertRecordResponse[];
};
