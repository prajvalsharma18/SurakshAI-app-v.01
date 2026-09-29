import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
} from 'react-native';

import { AppText } from './AppText';
import { theme } from '../../theme';

type AppButtonProps = {
  title: string;
  onPress: PressableProps['onPress'];
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
};

export function AppButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  accessibilityLabel = title,
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        {loading && <ActivityIndicator color={theme.colors.surface} />}
        <AppText style={styles.label} variant="button">
          {title}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: theme.spacing.lg,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.82,
  },
  label: {
    color: theme.colors.surface,
  },
});
