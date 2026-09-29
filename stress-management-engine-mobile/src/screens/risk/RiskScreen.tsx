import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { RiskStatusCard } from '../../components/risk/RiskStatusCard';
import { useAuth } from '../../auth/AuthContext';
import type { MainStackNavigation } from '../../navigation/MainNavigator';
import { getCurrentRiskPrediction } from '../../services/riskService';
import type { CurrentRisk } from '../../types/risk';
import { theme } from '../../theme';
import { apiErrorMessage } from '../../utils/apiErrorMessage';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { OfflineState } from '../../components/states/OfflineState';

export function RiskScreen() {
  const navigation = useNavigation<MainStackNavigation>();
  const { session } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [risk, setRisk] = useState<CurrentRisk | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadRisk = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    if (isOnline === false) {
      setRisk(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    const personnelId = session?.user.personnelId;
    if (!personnelId) {
      setRisk(null);
      setError('Current welfare risk is not available yet.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextRisk = await getCurrentRiskPrediction(personnelId);
      if (requestId.current === currentRequestId) {
        setRisk(nextRisk);
      }
    } catch (loadError: unknown) {
      if (requestId.current === currentRequestId) {
        setRisk(null);
        setError(apiErrorMessage(loadError, 'Current welfare risk is not available yet.', {
          forbidden: 'This welfare risk data is not available for the current account.',
        }));
      }
    } finally {
      if (requestId.current === currentRequestId) {
        setIsLoading(false);
      }
    }
  }, [isOnline, session?.user.personnelId]);

  useFocusEffect(
    useCallback(() => {
      void loadRisk();
    }, [loadRisk]),
  );

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppButton
          accessibilityLabel="Go back from My Welfare Status"
          onPress={() => navigation.goBack()}
          title="Back"
        />

        <View style={styles.header}>
          <AppText variant="title" style={styles.brand}>SURAKSHAI</AppText>
          <AppText variant="heading" style={styles.heading}>My Welfare Status</AppText>
          <AppText variant="body" style={styles.description}>
            Model-estimated risk category based on the available operational and wellness data.
          </AppText>
        </View>

        <OfflineState isOnline={isOnline} />

        {isOnline !== false && isLoading ? (
          <LoadingState message="Loading current welfare risk..." />
        ) : null}

        {!isLoading && error ? (
          <ErrorState message={error} onRetry={() => void loadRisk()} retryDisabled={isLoading || isOnline === false} />
        ) : null}

        {isOnline !== false && !isLoading && !error && risk ? (
          <RiskStatusCard risk={risk} />
        ) : null}

        {isOnline !== false && !isLoading && !error && !risk ? (
          <AppText variant="body" style={styles.emptyText}>
            Current welfare risk is not available yet.
          </AppText>
        ) : null}

        <View style={styles.actions}>
          <AppButton
            title="View risk history"
            onPress={() => navigation.navigate('RiskHistory')}
            accessibilityLabel="View risk history"
            disabled={isOnline === false}
          />
          <AppButton
            title="View SHAP explanation"
            onPress={() => navigation.navigate('RiskExplanation')}
            accessibilityLabel="View risk explanation"
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  content: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  header: {
    gap: theme.spacing.sm,
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
  emptyText: {
    color: theme.colors.secondary,
  },
  actions: {
    gap: theme.spacing.md,
  },
});
