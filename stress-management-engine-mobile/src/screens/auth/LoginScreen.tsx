import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '../../auth/AuthContext';
import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { AuthInput } from '../../components/forms/AuthInput';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { OfflineState } from '../../components/states/OfflineState';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { AuthServiceError } from '../../services/authService';
import { theme } from '../../theme';

type FieldErrors = {
  username?: string;
  password?: string;
};

function safeLoginError(error: unknown): string {
  if (!(error instanceof AuthServiceError)) {
    return 'Unable to sign in right now. Please try again.';
  }

  switch (error.kind) {
    case 'credentials':
      return 'Unable to sign in with those credentials.';
    case 'role':
      return 'This app is available to personnel and administrator accounts only.';
    case 'network':
      return 'Unable to connect to the SURAKSHAI backend.';
    case 'configuration':
      return 'The backend connection is not configured.';
    case 'unavailable':
      return 'The sign-in service is unavailable. Please try again.';
    default:
      return 'Unable to sign in right now. Please try again.';
  }
}

export function LoginScreen() {
  const { error: authError, login } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submissionInProgress = useRef(false);

  async function submit() {
    if (submissionInProgress.current || isOnline === false) {
      if (isOnline === false) {
        setSubmitError('You are offline. Connect to the internet to sign in.');
      }
      return;
    }

    const normalizedUsername = username.trim();
    const nextErrors: FieldErrors = {};
    if (!normalizedUsername) {
      nextErrors.username = 'Enter your username.';
    }
    if (!password) {
      nextErrors.password = 'Enter your password.';
    }

    setFieldErrors(nextErrors);
    setSubmitError(null);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    submissionInProgress.current = true;
    setLoading(true);
    try {
      await login(normalizedUsername, password);
    } catch (error: unknown) {
      setSubmitError(safeLoginError(error));
    } finally {
      submissionInProgress.current = false;
      setLoading(false);
    }
  }

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.content}>
        <AppText variant="title" style={styles.brand}>
          SURAKSHAI
        </AppText>
        <AppText variant="heading" style={styles.heading}>
          Account Login
        </AppText>
        <AppText variant="body" style={styles.subtitle}>
          Sign in with your personnel or administrator account.
        </AppText>
        <OfflineState isOnline={isOnline} />

        <View style={styles.form}>
          <AuthInput
            autoCapitalize="none"
            disabled={loading}
            error={fieldErrors.username}
            label="Username"
            onChangeText={(value) => {
              setUsername(value);
              setFieldErrors((current) => ({ ...current, username: undefined }));
              setSubmitError(null);
            }}
            placeholder="Enter username"
            textContentType="username"
            value={username}
          />
          <AuthInput
            disabled={loading}
            error={fieldErrors.password}
            label="Password"
            onChangeText={(value) => {
              setPassword(value);
              setFieldErrors((current) => ({ ...current, password: undefined }));
              setSubmitError(null);
            }}
            placeholder="Enter password"
            secureTextEntry
            textContentType="password"
            value={password}
          />
          {submitError || authError ? (
            <AppText
              accessibilityRole="alert"
              variant="bodySmall"
              style={styles.error}
            >
              {submitError ?? authError}
            </AppText>
          ) : null}
          <AppButton
            accessibilityLabel="Sign in to SURAKSHAI"
            disabled={loading || isOnline === false}
            loading={loading}
            onPress={submit}
            title="Sign In"
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  content: {
    gap: theme.spacing.md,
  },
  brand: {
    color: theme.colors.accent,
  },
  heading: {
    color: theme.colors.primary,
  },
  subtitle: {
    color: theme.colors.secondary,
  },
  form: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  error: {
    color: theme.colors.error,
  },
});
