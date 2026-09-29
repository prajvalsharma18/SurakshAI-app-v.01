import { StyleSheet, View } from 'react-native';

import { AppText } from '../common/AppText';
import { theme } from '../../theme';

export function TrainingMessageBubble({
  message,
  sender,
}: {
  message: string;
  sender: 'admin' | 'assistant';
}) {
  const isAdmin = sender === 'admin';
  return (
    <View style={[styles.bubble, isAdmin ? styles.admin : styles.assistant]}>
      <AppText variant="bodySmall" style={styles.sender}>
        {isAdmin ? 'You' : 'SURAKSHAI'}
      </AppText>
      <AppText variant="body">{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignSelf: 'stretch',
    borderRadius: 14,
    borderWidth: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
  },
  admin: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.accent,
  },
  assistant: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  sender: {
    color: theme.colors.secondary,
    fontWeight: '600',
  },
});
