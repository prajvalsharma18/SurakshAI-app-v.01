import { StyleSheet, View } from 'react-native';

import { AppText } from '../common/AppText';
import { theme } from '../../theme';
import type { WelfareAlert } from '../../types/alert';

const statusLabels: Record<WelfareAlert['status'], string> = {
  OPEN: 'Open',
  ACKNOWLEDGED: 'Acknowledged',
  UNDER_REVIEW: 'Under review',
  ACTION_PLANNED: 'Action planned',
  FOLLOW_UP: 'Follow-up',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
};

export function AlertStatusBadge({
  status,
}: {
  status: WelfareAlert['status'];
}) {
  return (
    <View
      accessibilityLabel={`Alert status: ${statusLabels[status]}`}
      style={styles.badge}
    >
      <AppText variant="bodySmall" style={styles.label}>
        {statusLabels[status]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  label: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
