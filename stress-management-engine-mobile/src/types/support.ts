import type {
  SupportRequestCategory,
  SupportRequestStatus,
  SupportRequestUrgency,
} from '../api/types';

export type {
  SupportRequestCategory,
  SupportRequestStatus,
  SupportRequestUrgency,
};

export type SupportRequest = {
  supportRequestId: string;
  relatedAlertId: string | null;
  category: SupportRequestCategory;
  message: string | null;
  urgency: SupportRequestUrgency;
  status: SupportRequestStatus;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt: string | null;
  scheduledFollowUp: string | null;
  closedAt: string | null;
};

export type SupportRequestDraft = {
  relatedAlertId?: string;
  category: SupportRequestCategory | null;
  message: string;
  urgency: SupportRequestUrgency;
};

export const supportRequestCategories: SupportRequestCategory[] = [
  'GENERAL_WELFARE',
  'WORKLOAD_FATIGUE',
  'SLEEP_RECOVERY',
  'PERSONAL_SUPPORT',
  'OTHER',
];

export const supportRequestCategoryLabels: Record<SupportRequestCategory, string> = {
  GENERAL_WELFARE: 'General welfare',
  WORKLOAD_FATIGUE: 'Workload / fatigue',
  SLEEP_RECOVERY: 'Sleep / recovery',
  PERSONAL_SUPPORT: 'Personal support',
  OTHER: 'Other',
};

export const supportRequestStatuses: SupportRequestStatus[] = [
  'REQUESTED',
  'ACKNOWLEDGED',
  'SCHEDULED',
  'IN_PROGRESS',
  'RESOLVED',
];
