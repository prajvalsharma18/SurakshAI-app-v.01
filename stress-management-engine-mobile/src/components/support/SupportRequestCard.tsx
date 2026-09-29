import { StyleSheet, View } from 'react-native';

import { AppText } from '../common/AppText';
import { theme } from '../../theme';
import {
  supportRequestCategoryLabels,
  type SupportRequest,
} from '../../types/support';
import { SupportRequestStatusBadge } from './SupportRequestStatusBadge';

function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
}

export function SupportRequestCard({ request }: { request: SupportRequest }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AppText variant="title" style={styles.title}>
          {supportRequestCategoryLabels[request.category]}
        </AppText>
        <AppText variant="bodySmall" style={request.urgency === 'URGENT' ? styles.urgent : styles.urgency}>
          {request.urgency === 'URGENT' ? 'Urgent' : 'Normal'}
        </AppText>
      </View>
      <SupportRequestStatusBadge status={request.status} />
      <AppText variant="bodySmall" style={styles.metadata}>
        Request ID: {request.supportRequestId}
      </AppText>
      <AppText variant="bodySmall" style={styles.metadata}>
        Submitted: {formatDate(request.createdAt)}
      </AppText>
      {request.relatedAlertId ? (
        <AppText variant="bodySmall" style={styles.metadata}>
          Linked to a welfare alert
        </AppText>
      ) : null}
      {request.message ? (
        <AppText variant="bodySmall" style={styles.message}>
          {request.message}
        </AppText>
      ) : null}
      {request.scheduledFollowUp ? (
        <AppText variant="bodySmall" style={styles.metadata}>
          Scheduled follow-up: {formatDate(request.scheduledFollowUp)}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: theme.colors.primary,
    flex: 1,
  },
  urgency: {
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  urgent: {
    color: theme.colors.error,
    fontWeight: '700',
  },
  metadata: {
    color: theme.colors.secondary,
  },
  message: {
    color: theme.colors.text,
  },
});
