import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../auth/AuthContext';
import { TrainingJobCard } from '../../components/admin/TrainingJobCard';
import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { OfflineState } from '../../components/states/OfflineState';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { getTrainingJobs } from '../../services/modelTrainingService';
import type { AdminTrainingStackParamList } from '../../types/navigation';
import type { TrainingJob } from '../../types/modelTraining';
import { theme } from '../../theme';
import { apiErrorMessage } from '../../utils/apiErrorMessage';

type AdminNavigation = NativeStackNavigationProp<AdminTrainingStackParamList>;

export function TrainingJobsScreen() {
  const navigation = useNavigation<AdminNavigation>();
  const { logout } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [jobs, setJobs] = useState<TrainingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const inProgress = useRef(false);

  const loadJobs = useCallback(async () => {
    if (isOnline === false) {
      requestId.current += 1;
      inProgress.current = false;
      setJobs([]);
      setError(null);
      setLoading(false);
      return;
    }
    if (inProgress.current) {
      return;
    }
    inProgress.current = true;
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getTrainingJobs();
      if (requestId.current === currentRequestId) {
        setJobs(result);
      }
    } catch (loadError: unknown) {
      if (requestId.current === currentRequestId) {
        setJobs([]);
        setError(apiErrorMessage(loadError, 'Unable to load training jobs.'));
      }
    } finally {
      if (requestId.current === currentRequestId) {
        inProgress.current = false;
        setLoading(false);
      }
    }
  }, [isOnline]);

  useFocusEffect(
    useCallback(() => {
      void loadJobs();
      const refreshTimer = setInterval(() => void loadJobs(), 3000);
      return () => {
        clearInterval(refreshTimer);
        requestId.current += 1;
        inProgress.current = false;
      };
    }, [loadJobs]),
  );

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <AppButton title="Back" accessibilityLabel="Back to admin console" onPress={() => navigation.goBack()} />
          <AppButton title="Logout" accessibilityLabel="Log out of admin console" onPress={() => void logout()} />
        </View>
        <View style={styles.header}>
          <AppText variant="title" style={styles.brand}>SURAKSHAI</AppText>
          <AppText variant="heading" style={styles.heading}>Training Jobs</AppText>
          <AppText variant="bodySmall">
            Job states and metrics shown here are returned by the backend. No
            estimated progress is displayed.
          </AppText>
        </View>
        <OfflineState isOnline={isOnline} />
        {isOnline !== false && loading ? <LoadingState message="Loading training jobs..." /> : null}
        {!loading && error ? (
          <ErrorState message={error} onRetry={() => void loadJobs()} retryDisabled={isOnline === false} />
        ) : null}
        {isOnline !== false && !loading && !error && jobs.length === 0 ? (
          <EmptyState title="No training jobs are available." />
        ) : null}
        {isOnline !== false && !loading && !error
          ? jobs.map((job) => <TrainingJobCard key={job.job_id} job={job} />)
          : null}
        <AppButton
          title="Refresh"
          accessibilityLabel="Refresh training jobs"
          loading={loading}
          disabled={loading || isOnline === false}
          onPress={() => void loadJobs()}
        />
        <AppButton
          title="Training Chat"
          accessibilityLabel="Open training chat"
          onPress={() => navigation.navigate('TrainingChat')}
        />
        <AppButton
          title="Model Versions"
          accessibilityLabel="Open model versions"
          onPress={() => navigation.navigate('ModelVersions')}
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
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
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
});
