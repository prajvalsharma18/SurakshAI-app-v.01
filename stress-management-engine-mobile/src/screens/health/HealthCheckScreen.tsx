import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { HealthResponse } from '../../api/types';
import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { OfflineState } from '../../components/states/OfflineState';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { getHealth } from '../../services/healthService';
import { theme } from '../../theme';
import { apiErrorMessage } from '../../utils/apiErrorMessage';

type CheckState = 'idle' | 'loading' | 'success' | 'error';

export function HealthCheckScreen() {
  const { isOnline } = useNetworkStatus();
  const [checkState, setCheckState] = useState<CheckState>('idle');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function checkBackend() {
    if (isOnline === false || checkState === 'loading') {
      return;
    }
    setCheckState('loading');
    setHealth(null);
    setErrorMessage(null);

    try {
      const response = await getHealth();
      setHealth(response);
      setCheckState('success');
    } catch (error: unknown) {
      setErrorMessage(apiErrorMessage(error, 'An unexpected error occurred while checking the backend.'));
      setCheckState('error');
    }
  }

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.content}>
        <AppText variant="title" style={styles.brand}>
          SURAKSHAI
        </AppText>
        <AppText variant="heading" style={styles.heading}>
          Backend Connection
        </AppText>
        <AppText variant="body" style={styles.description}>
          Check whether the SURAKSHAI backend is reachable.
        </AppText>
        <OfflineState isOnline={isOnline} />

        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.result,
            checkState === 'success' && styles.successResult,
            checkState === 'error' && styles.errorResult,
          ]}
        >
          {checkState === 'idle' && (
            <AppText variant="bodySmall" style={styles.resultText}>
              No connection check has been run.
            </AppText>
          )}
          {checkState === 'loading' && (
            <View style={styles.loading}>
              <ActivityIndicator
                accessibilityLabel="Checking backend"
                color={theme.colors.accent}
              />
              <AppText variant="bodySmall" style={styles.resultText}>
                Checking backend…
              </AppText>
            </View>
          )}
          {checkState === 'success' && health && (
            <View>
              <AppText variant="title" style={styles.successText}>
                Backend reachable
              </AppText>
              <AppText variant="bodySmall" style={styles.resultText}>
                Status: {health.status}
              </AppText>
              <AppText variant="bodySmall" style={styles.resultText}>
                API: {health.api}
              </AppText>
              <AppText variant="bodySmall" style={styles.resultText}>
                Risk engine: {health.risk_engine}
              </AppText>
              <AppText variant="bodySmall" style={styles.resultText}>
                Timestamp: {health.timestamp}
              </AppText>
            </View>
          )}
          {checkState === 'error' && errorMessage && (
            <AppText
              accessibilityRole="alert"
              variant="bodySmall"
              style={styles.errorText}
            >
              {errorMessage}
            </AppText>
          )}
        </View>

        <AppButton
          accessibilityLabel={
            checkState === 'error' ? 'Retry backend check' : 'Check backend'
          }
          disabled={checkState === 'loading' || isOnline === false}
          onPress={checkBackend}
          title={checkState === 'error' ? 'Try Again' : 'Check Backend'}
        />
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
  description: {
    color: theme.colors.secondary,
  },
  result: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  successResult: {
    borderColor: theme.colors.success,
  },
  errorResult: {
    borderColor: theme.colors.error,
  },
  loading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  resultText: {
    color: theme.colors.secondary,
    marginTop: theme.spacing.xs,
  },
  successText: {
    color: theme.colors.success,
  },
  errorText: {
    color: theme.colors.error,
  },
});
