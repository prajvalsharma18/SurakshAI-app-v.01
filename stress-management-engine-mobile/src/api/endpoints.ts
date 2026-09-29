export const endpoints = {
  health: '/health',
  login: '/auth/login',
  consent: '/consent',
  wellness: '/personnel/me/wellness',
  supportRequests: '/personnel/me/support-requests',
  supportRequest: (supportRequestId: string) =>
    `/personnel/me/support-requests/${encodeURIComponent(supportRequestId)}`,
  riskPrediction: (personnelId: string) => `/personnel/${personnelId}/risk-prediction`,
  riskHistory: (personnelId: string) => `/personnel/${personnelId}/risk-history`,
  riskExplanation: (personnelId: string) => `/personnel/${personnelId}/risk-explanation`,
  welfareRecommendations: (personnelId: string) =>
    `/personnel/${personnelId}/welfare-recommendations`,
  personnelAlerts: (personnelId: string) => `/personnel/${personnelId}/alerts`,
  welfareAlertDetail: (alertId: string) => `/welfare/alerts/${alertId}`,
  modelTrainingPlan: '/admin/model-training/plan',
  modelTrainingJobs: '/admin/model-training/jobs',
  modelTrainingJob: (jobId: string) =>
    `/admin/model-training/jobs/${encodeURIComponent(jobId)}`,
  modelTrainingModels: '/admin/model-training/models',
  promoteModel: (modelVersion: string) =>
    `/admin/model-training/models/${encodeURIComponent(modelVersion)}/promote`,
} as const;
