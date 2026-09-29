import { StyleSheet, View } from 'react-native';

import type { ConsentItem, ConsentType } from '../../types/consent';
import { theme } from '../../theme';
import { AppButton } from '../common/AppButton';
import { AppText } from '../common/AppText';

const categoryDetails: Record<
  ConsentType,
  { title: string; explanation: string }
> = {
  WELLNESS_DATA_PROCESSING: {
    title: 'Wellness Data Processing',
    explanation:
      'Controls processing of information you provide about your wellbeing.',
  },
  BIOMETRIC_DATA_PROCESSING: {
    title: 'Biometric Data Processing',
    explanation:
      'Controls processing of biometric information, if collected and permitted.',
  },
  RECOMMENDATION_PROCESSING: {
    title: 'Recommendation Processing',
    explanation:
      'Controls processing of your information to prepare support recommendations.',
  },
  DATA_SHARING: {
    title: 'Data Sharing',
    explanation:
      'Controls sharing of your information with authorized services.',
  },
};

type ConsentCardProps = {
  consent: ConsentItem;
  disabled: boolean;
  loading: boolean;
  onDecision: (type: ConsentType, granted: boolean) => void;
};

export function ConsentCard({
  consent,
  disabled,
  loading,
  onDecision,
}: ConsentCardProps) {
  const details = categoryDetails[consent.type];
  const timestamp = consent.updatedAt ? new Date(consent.updatedAt) : null;
  const displayTimestamp =
    timestamp && !Number.isNaN(timestamp.getTime())
      ? timestamp.toLocaleString()
      : null;

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <AppText variant="title" style={styles.title}>
          {details.title}
        </AppText>
        <View
          accessibilityLabel={`Consent status: ${consent.granted ? 'Granted' : 'Not granted'}`}
          style={[styles.badge, consent.granted && styles.grantedBadge]}
        >
          <AppText
            variant="caption"
            style={[styles.badgeText, consent.granted && styles.grantedText]}
          >
            {consent.granted ? 'Granted' : 'Not granted'}
          </AppText>
        </View>
      </View>
      <AppText variant="bodySmall" style={styles.explanation}>
        {details.explanation}
      </AppText>
      {displayTimestamp ? (
        <AppText variant="caption" style={styles.timestamp}>
          Updated {displayTimestamp}
        </AppText>
      ) : null}
      <AppButton
        accessibilityLabel={`${consent.granted ? 'Withdraw' : 'Give'} consent for ${details.title}`}
        disabled={disabled}
        loading={loading}
        onPress={() => {
          void onDecision(consent.type, !consent.granted);
        }}
        title={
          loading
            ? 'Updating...'
            : consent.granted
              ? 'Withdraw consent'
              : 'Give consent'
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  titleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  title: {
    color: theme.colors.primary,
    flex: 1,
  },
  explanation: {
    color: theme.colors.secondary,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  grantedBadge: {
    backgroundColor: theme.colors.background,
  },
  badgeText: {
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  grantedText: {
    color: theme.colors.success,
  },
  timestamp: {
    color: theme.colors.mutedText,
  },
});
