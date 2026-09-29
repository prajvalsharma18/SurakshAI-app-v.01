import type { RiskCategory } from './risk';

export type WelfareRecommendationCategory =
  | 'WORKLOAD'
  | 'RECOVERY'
  | 'SLEEP'
  | 'DUTY_SCHEDULING'
  | 'LEAVE'
  | 'SOCIAL_SUPPORT'
  | 'REFERRAL'
  | 'GENERAL';

export type WelfareRecommendationPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type WelfareRecommendation = {
  category: WelfareRecommendationCategory;
  action: string;
  priority: WelfareRecommendationPriority;
  rationale: string;
  sources: string[];
};

export type WelfareRecommendations = {
  personnelId: string;
  referenceDate: string;
  riskCategory: RiskCategory;
  modelVersion: string;
  dataMode: string;
  recommendations: WelfareRecommendation[];
};
