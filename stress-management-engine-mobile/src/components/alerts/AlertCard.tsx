import { Pressable, StyleSheet, View } from 'react-native';
import type { PressableProps } from 'react-native';

import { AlertStatusBadge } from './AlertStatusBadge';
import { AppText } from '../common/AppText';
import { theme } from '../../theme';
import type { WelfareAlert } from '../../types/alert';

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
}

function formatTrigger(trigger: WelfareAlert['triggerType']): string {
  return trigger === 'REPEATED_ELEVATED_RISK'
    ? 'Repeated elevated risk'
    : 'Persistent high risk';
}

function formatSeverity(severity: WelfareAlert['severity']): string {
  switch (severity) {
    case 'INFO':
      return 'Information';
    case 'ATTENTION':
      return 'Attention';
    case 'PRIORITY':
      return 'Priority';
  }
}

type AlertCardProps = {
  alert: WelfareAlert;
  onPress: PressableProps['onPress'];
};

export function AlertCard({ alert, onPress }: AlertCardProps) {
  return (
    <Pressable
      accessibilityLabel={`Open ${formatSeverity(alert.severity)} support alert`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.heading}>
        <AppText variant="title" style={styles.title}>
          Welfare support alert
        </AppText>
        <AppText variant="bodySmall" style={styles.severity}>
          {formatSeverity(alert.severity)}
        </AppText>
      </View>
      <AppText variant="bodySmall" style={styles.context}>
        {formatTrigger(alert.triggerType)}
      </AppText>
      <AppText variant="bodySmall" style={styles.context}>
        Reference date: {formatDate(alert.referenceDate)}
      </AppText>
      <AlertStatusBadge status={alert.status} />
    </Pressable>
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
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: theme.colors.primary,
  },
  severity: {
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  context: {
    color: theme.colors.secondary,
  },
  pressed: {
    backgroundColor: theme.colors.background,
  },
});
