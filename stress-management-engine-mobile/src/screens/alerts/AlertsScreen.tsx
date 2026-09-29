import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AlertCard } from '../../components/alerts/AlertCard';
import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { OfflineState } from '../../components/states/OfflineState';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useAuth } from '../../auth/AuthContext';
import type { MainStackNavigation } from '../../navigation/MainNavigator';
import { getPersonnelAlerts } from '../../services/alertService';
import type { WelfareAlert } from '../../types/alert';
import { theme } from '../../theme';
import { apiErrorMessage } from '../../utils/apiErrorMessage';

export function AlertsScreen() {
  const navigation = useNavigation<MainStackNavigation>();
  const { session } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [alerts, setAlerts] = useState<WelfareAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestInProgress = useRef(false);
  const requestId = useRef(0);

  const loadAlerts = useCallback(async () => {
    if (isOnline === false) {
      requestId.current += 1;
      requestInProgress.current = false;
      setAlerts([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    if (requestInProgress.current) {
      return;
    }

    const personnelId = session?.user.personnelId;
    if (!personnelId) {
      setAlerts([]);
      setError('Welfare alerts are not available for this account.');
      setIsLoading(false);
      return;
    }

    requestInProgress.current = true;
    const currentRequestId = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const nextAlerts = await getPersonnelAlerts(personnelId);
      if (requestId.current === currentRequestId) {
        setAlerts(nextAlerts);
      }
    } catch (loadError: unknown) {
      if (requestId.current === currentRequestId) {
        setAlerts([]);
        setError(apiErrorMessage(loadError, 'Welfare alerts are temporarily unavailable.', {
          forbidden: 'Welfare alerts are not available for this account.',
          not_found: 'Welfare alerts could not be found.',
          server: 'Welfare alerts are temporarily unavailable.',
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
      void loadAlerts();
      return () => {
        requestId.current += 1;
        requestInProgress.current = false;
      };
    }, [loadAlerts]),
  );

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppButton
          accessibilityLabel="Go back from Support Alerts"
          onPress={() => navigation.goBack()}
          title="Back"
        />

        <View style={styles.header}>
          <AppText variant="title" style={styles.brand}>
            SURAKSHAI
          </AppText>
          <AppText variant="heading" style={styles.heading}>
            Welfare Support
          </AppText>
          <AppText variant="body" style={styles.description}>
            Support alerts from the welfare system. These alerts are not medical
            diagnoses.
          </AppText>
        </View>

        <OfflineState isOnline={isOnline} />

        {isOnline !== false && isLoading ? (
          <LoadingState message="Loading support alerts..." />
        ) : null}

        {!isLoading && error ? (
          <ErrorState message={error} onRetry={() => void loadAlerts()} retryDisabled={isOnline === false} />
        ) : null}

        {isOnline !== false && !isLoading && !error && alerts.length === 0 ? (
          <EmptyState title="No welfare support alerts are available right now." />
        ) : null}

        {isOnline !== false && !isLoading && !error && alerts.length > 0 ? (
          <View style={styles.list}>
            {alerts.map((alert) => (
              <AlertCard
                key={alert.alertId}
                alert={alert}
                onPress={() =>
                  navigation.navigate('AlertDetail', { alertId: alert.alertId })
                }
              />
            ))}
          </View>
        ) : null}

        <AppButton
          accessibilityLabel="Refresh Support Alerts"
          disabled={isLoading || isOnline === false}
          loading={isLoading}
          onPress={() => void loadAlerts()}
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
  list: {
    gap: theme.spacing.md,
  },
});
