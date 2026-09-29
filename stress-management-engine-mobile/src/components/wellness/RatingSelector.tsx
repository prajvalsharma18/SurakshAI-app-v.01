import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../common/AppText';
import { theme } from '../../theme';

type RatingSelectorProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

const options = ['1', '2', '3', '4', '5'];

export function RatingSelector({
  label,
  value,
  onChange,
}: RatingSelectorProps) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const selected = value === option;
        return (
          <Pressable
            key={option}
            accessibilityLabel={`${label} option ${option}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            style={({ pressed }) => [
              styles.option,
              selected && styles.selected,
              pressed && !selected && styles.pressed,
            ]}
          >
            <AppText
              variant="bodySmall"
              style={[styles.optionText, selected && styles.selectedText]}
            >
              {option}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  option: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 42,
    paddingHorizontal: theme.spacing.sm,
  },
  selected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  pressed: {
    opacity: 0.8,
  },
  optionText: {
    color: theme.colors.primary,
  },
  selectedText: {
    color: theme.colors.surface,
  },
});
