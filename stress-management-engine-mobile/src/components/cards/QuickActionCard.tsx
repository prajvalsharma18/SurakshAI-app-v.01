import { Pressable, StyleSheet, View } from 'react-native';
import type { PressableProps } from 'react-native';

import { AppText } from '../common/AppText';
import { theme } from '../../theme';

type QuickActionCardProps = {
  title: string;
  description: string;
  onPress: PressableProps['onPress'];
};

export function QuickActionCard({
  title,
  description,
  onPress,
}: QuickActionCardProps) {
  return (
    <Pressable
      accessibilityLabel={`${title}. ${description}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.content}>
        <AppText variant="title" style={styles.title}>
          {title}
        </AppText>
        <AppText variant="bodySmall" style={styles.description}>
          {description}
        </AppText>
      </View>
      <AppText
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        variant="title"
        style={styles.arrow}
      >
        ›
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 76,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  content: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.colors.primary,
  },
  description: {
    color: theme.colors.secondary,
  },
  arrow: {
    color: theme.colors.accent,
    marginLeft: theme.spacing.sm,
  },
  pressed: {
    backgroundColor: theme.colors.background,
  },
});
