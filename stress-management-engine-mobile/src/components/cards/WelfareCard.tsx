import { StyleSheet, View } from 'react-native';

import { AppText } from '../common/AppText';
import { theme } from '../../theme';

type WelfareCardProps = {
  title: string;
  description: string;
};

export function WelfareCard({ title, description }: WelfareCardProps) {
  return (
    <View accessible style={styles.card} accessibilityLabel={`${title}. ${description}`}>
      <View style={styles.accent} />
      <View style={styles.content}>
        <AppText variant="title" style={styles.title}>
          {title}
        </AppText>
        <AppText variant="bodySmall" style={styles.description}>
          {description}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'stretch',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 92,
    overflow: 'hidden',
  },
  accent: {
    backgroundColor: theme.colors.accent,
    width: 4,
  },
  content: {
    flex: 1,
    gap: theme.spacing.xs,
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  title: {
    color: theme.colors.primary,
  },
  description: {
    color: theme.colors.secondary,
  },
});
