export type RiskCategory = 'LOW' | 'ELEVATED' | 'HIGH';

export type RiskContributionDirection = 'positive' | 'negative';

export type CurrentRisk = {
  personnelId: string;
  referenceDate: string;
  riskCategory: RiskCategory;
  modelVersion?: string;
  dataMode?: string;
};

export type RiskHistoryItem = {
  referenceDate: string;
  riskCategory: RiskCategory;
  modelVersion?: string;
  dataMode?: string;
  createdAt?: string;
};

export type ShapContributor = {
  feature: string;
  label: string;
  shapValue: number;
  direction: RiskContributionDirection;
  interpretation: string;
};

export type RiskExplanation = {
  predictedClass: RiskCategory;
  contributors: ShapContributor[];
};
