import { StyleSheet, View } from 'react-native';

import { AppText } from '../common/AppText';
import { theme } from '../../theme';
import type { SupportRequestStatus } from '../../types/support';

const labels: Record<SupportRequestStatus, string> = {
  REQUESTED: 'Requested',
  ACKNOWLEDGED: 'Acknowledged',
  SCHEDULED: 'Follow-up scheduled',
  IN_PROGRESS: 'Follow-up in progress',
  RESOLVED: 'Resolved',
};

export function SupportRequestStatusBadge({ status }: { status: SupportRequestStatus }) {
  const resolved = status === 'RESOLVED';
  return (
    <View accessibilityLabel={`Request status: ${labels[status]}`} style={[styles.badge, resolved && styles.resolved]}>
      <AppText variant="caption" style={[styles.label, resolved && styles.resolvedLabel]}>
        {labels[status]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F3F2',
    borderRadius: 16,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  resolved: {
    backgroundColor: '#EAF3ED',
  },
  label: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  resolvedLabel: {
    color: theme.colors.success,
  },
});
