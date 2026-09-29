import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { ShapContributorCard } from '../../components/risk/ShapContributorCard';
import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { OfflineState } from '../../components/states/OfflineState';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useAuth } from '../../auth/AuthContext';
import type { MainStackNavigation } from '../../navigation/MainNavigator';
import { getRiskExplanation } from '../../services/riskService';
import type { RiskExplanation } from '../../types/risk';
import { theme } from '../../theme';
import { apiErrorMessage } from '../../utils/apiErrorMessage';

export function RiskExplanationScreen() {
  const navigation = useNavigation<MainStackNavigation>();
  const { session } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [explanation, setExplanation] = useState<RiskExplanation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadExplanation = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    if (isOnline === false) {
      setExplanation(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    const personnelId = session?.user.personnelId;
    if (!personnelId) {
      setExplanation(null);
      setError('An explanation is not available for this prediction.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextExplanation = await getRiskExplanation(personnelId);
      if (requestId.current === currentRequestId) {
        setExplanation(nextExplanation);
      }
    } catch (loadError: unknown) {
      if (requestId.current === currentRequestId) {
        setExplanation(null);
        setError(apiErrorMessage(loadError, 'An explanation is not available for this prediction.'));
      }
    } finally {
      if (requestId.current === currentRequestId) {
        setIsLoading(false);
      }
    }
  }, [isOnline, session?.user.personnelId]);

  useFocusEffect(
    useCallback(() => {
      void loadExplanation();
      return () => {
        requestId.current += 1;
      };
    }, [loadExplanation]),
  );

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppButton
          accessibilityLabel="Go back from Risk Explanation"
          onPress={() => navigation.goBack()}
          title="Back"
        />

        <View style={styles.header}>
          <AppText variant="title" style={styles.brand}>SURAKSHAI</AppText>
          <AppText variant="heading" style={styles.heading}>Risk Explanation</AppText>
          <AppText variant="body" style={styles.description}>
            Model contributor values for the current prediction.
          </AppText>
        </View>

        <OfflineState isOnline={isOnline} />

        {isOnline !== false && isLoading ? (
          <LoadingState message="Loading model explanation..." />
        ) : null}

        {!isLoading && error ? (
          <ErrorState message={error} onRetry={() => void loadExplanation()} retryDisabled={isOnline === false} />
        ) : null}

        {isOnline !== false && !isLoading && !error && explanation && explanation.contributors.length > 0 ? (
          <View style={styles.list}>
            {explanation.contributors.map((contributor, index) => (
              <ShapContributorCard
                key={`${contributor.feature}-${index}`}
                contributor={contributor}
              />
            ))}
          </View>
        ) : null}

        {isOnline !== false && !isLoading && !error && (!explanation || explanation.contributors.length === 0) ? (
          <EmptyState title="An explanation is not available for this prediction." />
        ) : null}
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
  list: {
    gap: theme.spacing.md,
  },
});
