import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '../../auth/AuthContext';
import { RecommendationCard } from '../../components/recommendations/RecommendationCard';
import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { OfflineState } from '../../components/states/OfflineState';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import type { MainStackNavigation } from '../../navigation/MainNavigator';
import { getWelfareRecommendations } from '../../services/recommendationService';
import type { WelfareRecommendations } from '../../types/recommendation';
import { theme } from '../../theme';
import { apiErrorMessage } from '../../utils/apiErrorMessage';

export function RecommendationsScreen() {
  const navigation = useNavigation<MainStackNavigation>();
  const { session } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [result, setResult] = useState<WelfareRecommendations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestInProgress = useRef(false);
  const requestId = useRef(0);

  const loadRecommendations = useCallback(async () => {
    if (isOnline === false) {
      requestId.current += 1;
      requestInProgress.current = false;
      setResult(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    if (requestInProgress.current) {
      return;
    }

    const personnelId = session?.user.personnelId;
    if (!personnelId) {
      setResult(null);
      setError('Recommendations are temporarily unavailable.');
      setIsLoading(false);
      return;
    }

    const currentRequestId = ++requestId.current;
    setIsLoading(true);
    setError(null);

    try {
      const recommendations = await getWelfareRecommendations(personnelId);
      if (requestId.current === currentRequestId) {
        setResult(recommendations);
      }
    } catch (loadError: unknown) {
      if (requestId.current === currentRequestId) {
        setResult(null);
        setError(apiErrorMessage(loadError, 'Recommendations are temporarily unavailable.', {
          forbidden: 'Recommendations are not available for this account.',
          server: 'Recommendations are temporarily unavailable.',
        }));
      }
    } finally {
      if (requestId.current === currentRequestId) {
        requestInProgress.current = false;
        setIsLoading(false);
      }
    }
  }, [isOnline, session?.user.personnelId]);

  useFocusEffect(
    useCallback(() => {
      void loadRecommendations();
      return () => {
        requestId.current += 1;
        requestInProgress.current = false;
      };
    }, [loadRecommendations]),
  );

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppButton
          accessibilityLabel="Go back from Welfare Recommendations"
          onPress={() => navigation.goBack()}
          title="Back"
        />

        <View style={styles.header}>
          <AppText variant="title" style={styles.brand}>
            SURAKSHAI
          </AppText>
          <AppText variant="heading" style={styles.heading}>
            Welfare Recommendations
          </AppText>
          <AppText variant="body" style={styles.description}>
            Personalized welfare guidance based on information available to the
            support system.
          </AppText>
          <AppText variant="bodySmall" style={styles.transparency}>
            AI-assisted suggestions are not a medical diagnosis or a guaranteed
            outcome.
          </AppText>
        </View>

        <OfflineState isOnline={isOnline} />

        {isOnline !== false && isLoading ? (
          <LoadingState message="Loading welfare recommendations..." />
        ) : null}

        {!isLoading && error ? (
          <ErrorState message={error} onRetry={() => void loadRecommendations()} retryDisabled={isLoading || isOnline === false} />
        ) : null}

        {isOnline !== false && !isLoading && !error && result?.recommendations.length === 0 ? (
          <EmptyState title="No welfare recommendations are available right now." />
        ) : null}

        {isOnline !== false && !isLoading && !error && result?.recommendations.length ? (
          <View style={styles.list}>
            <AppText variant="bodySmall" style={styles.metadata}>
              Reference date: {result.referenceDate} · Risk category:{' '}
              {result.riskCategory}
            </AppText>
            <AppText variant="bodySmall" style={styles.metadata}>
              Model version: {result.modelVersion} · Data mode: {result.dataMode}
            </AppText>
            {result.recommendations.map((recommendation, index) => (
              <RecommendationCard
                key={`${recommendation.category}-${index}`}
                recommendation={recommendation}
              />
            ))}
          </View>
        ) : null}

        <AppButton
          accessibilityLabel="Refresh welfare recommendations"
          disabled={isLoading || isOnline === false}
          loading={isLoading}
          onPress={() => void loadRecommendations()}
          title="Refresh"
        />
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
  transparency: {
    color: theme.colors.secondary,
  },
  metadata: {
    color: theme.colors.secondary,
  },
  list: {
    gap: theme.spacing.md,
  },
});
