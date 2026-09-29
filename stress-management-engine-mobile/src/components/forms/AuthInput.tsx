import { StyleSheet, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { AppText } from '../common/AppText';
import { theme } from '../../theme';

type AuthInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  disabled?: boolean;
  error?: string;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  textContentType?: TextInputProps['textContentType'];
};

export function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  disabled = false,
  error,
  autoCapitalize = 'none',
  textContentType,
}: AuthInputProps) {
  const inputId = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <View style={styles.field}>
      <AppText variant="bodySmall" style={styles.label}>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        editable={!disabled}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.mutedText}
        secureTextEntry={secureTextEntry}
        style={[styles.input, error && styles.inputError]}
        textContentType={textContentType}
        value={value}
        nativeID={inputId}
      />
      {error ? (
        <AppText accessibilityRole="alert" variant="caption" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: theme.spacing.xs,
  },
  label: {
    color: theme.colors.text,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  error: {
    color: theme.colors.error,
  },
});
