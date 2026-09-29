import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { RiskHistoryCard } from '../../components/risk/RiskHistoryCard';
import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { OfflineState } from '../../components/states/OfflineState';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useAuth } from '../../auth/AuthContext';
import type { MainStackNavigation } from '../../navigation/MainNavigator';
import { getRiskHistory } from '../../services/riskService';
import type { RiskHistoryItem } from '../../types/risk';
import { theme } from '../../theme';
import { apiErrorMessage } from '../../utils/apiErrorMessage';

export function RiskHistoryScreen() {
  const navigation = useNavigation<MainStackNavigation>();
  const { session } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [history, setHistory] = useState<RiskHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestInProgress = useRef(false);
  const requestId = useRef(0);

  const loadHistory = useCallback(async () => {
    if (isOnline === false) {
      requestId.current += 1;
      requestInProgress.current = false;
      setHistory([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    if (requestInProgress.current) {
      return;
    }
    const personnelId = session?.user.personnelId;
    if (!personnelId) {
      setHistory([]);
      setError('No risk history is available yet.');
      setIsLoading(false);
      return;
    }

    requestInProgress.current = true;
    const currentRequestId = ++requestId.current;
    setIsLoading(true);
    setError(null);

    try {
      const nextHistory = await getRiskHistory(personnelId);
      if (requestId.current === currentRequestId) {
        setHistory(nextHistory);
      }
    } catch (loadError: unknown) {
      if (requestId.current === currentRequestId) {
        setHistory([]);
        setError(apiErrorMessage(loadError, 'Unable to load risk history.', {
          forbidden: 'Risk history is not available for the current account.',
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
      void loadHistory();
      return () => {
        requestId.current += 1;
        requestInProgress.current = false;
      };
    }, [loadHistory]),
  );

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppButton
          accessibilityLabel="Go back from Risk History"
          onPress={() => navigation.goBack()}
          title="Back"
        />

        <View style={styles.header}>
          <AppText variant="title" style={styles.brand}>SURAKSHAI</AppText>
          <AppText variant="heading" style={styles.heading}>Risk History</AppText>
        </View>

        <OfflineState isOnline={isOnline} />

        {isOnline !== false && isLoading ? (
          <LoadingState message="Loading risk history..." />
        ) : null}

        {!isLoading && error ? (
          <ErrorState message={error} onRetry={() => void loadHistory()} retryDisabled={isOnline === false} />
        ) : null}

        {isOnline !== false && !isLoading && !error && history.length === 0 ? (
          <EmptyState title="No risk history is available yet." />
        ) : null}

        {isOnline !== false && !isLoading && !error && history.length > 0 ? (
          <View style={styles.list}>
            {history.map((item, index) => (
              <RiskHistoryCard key={`${item.referenceDate}-${index}`} item={item} />
            ))}
          </View>
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
  list: {
    gap: theme.spacing.md,
  },
});
