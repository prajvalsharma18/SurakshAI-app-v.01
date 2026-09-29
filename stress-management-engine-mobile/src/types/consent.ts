export const consentTypes = [
  'WELLNESS_DATA_PROCESSING',
  'BIOMETRIC_DATA_PROCESSING',
  'RECOMMENDATION_PROCESSING',
  'DATA_SHARING',
] as const;

export type ConsentType = (typeof consentTypes)[number];

export type ConsentItem = {
  type: ConsentType;
  granted: boolean;
  updatedAt: string | null;
};

export type ConsentSettings = {
  userId: string;
  consents: ConsentItem[];
};

export type ConsentDecision = {
  type: ConsentType;
  granted: boolean;
};
