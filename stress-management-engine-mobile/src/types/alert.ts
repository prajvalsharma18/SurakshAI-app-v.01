export type WelfareAlertSeverity = 'INFO' | 'ATTENTION' | 'PRIORITY';

export type WelfareAlertTrigger =
  | 'REPEATED_ELEVATED_RISK'
  | 'PERSISTENT_HIGH_RISK';

export type WelfareAlertStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'UNDER_REVIEW'
  | 'ACTION_PLANNED'
  | 'FOLLOW_UP'
  | 'RESOLVED'
  | 'DISMISSED';

export type WelfareAlert = {
  alertId: string;
  referenceDate: string;
  createdAt: string;
  severity: WelfareAlertSeverity;
  triggerType: WelfareAlertTrigger;
  currentRiskCategory: 'ELEVATED' | 'HIGH';
  status: WelfareAlertStatus;
  acknowledgedAt: string | null;
  reviewedAt: string | null;
  resolvedAt: string | null;
};
