export type RootStackParamList = {
  Login: undefined;
  Authenticated: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  Wellness: undefined;
  Risk: undefined;
  RiskHistory: undefined;
  RiskExplanation: undefined;
  Recommendations: undefined;
  Alerts: undefined;
  AlertDetail: { alertId: string };
  Support: { relatedAlertId?: string } | undefined;
  Consent: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Profile: undefined;
};

export type AdminTrainingStackParamList = {
  Console: undefined;
  TrainingChat: undefined;
  TrainingJobs: undefined;
  ModelVersions: undefined;
};
