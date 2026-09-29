import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../auth/AuthContext';
import { ModelVersionCard } from '../../components/admin/ModelVersionCard';
import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { OfflineState } from '../../components/states/OfflineState';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { getModelVersions, promoteModel } from '../../services/modelTrainingService';
import type { AdminTrainingStackParamList } from '../../types/navigation';
import type { ModelVersionsResponse } from '../../types/modelTraining';
import { theme } from '../../theme';
import { apiErrorMessage } from '../../utils/apiErrorMessage';

type AdminNavigation = NativeStackNavigationProp<AdminTrainingStackParamList>;

export function ModelVersionsScreen() {
  const navigation = useNavigation<AdminNavigation>();
  const { logout } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [versions, setVersions] = useState<ModelVersionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const inProgress = useRef(false);

  const loadVersions = useCallback(async () => {
    if (isOnline === false) {
      requestId.current += 1;
      inProgress.current = false;
      setVersions(null);
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
      const result = await getModelVersions();
      if (requestId.current === currentRequestId) {
        setVersions(result);
      }
    } catch (loadError: unknown) {
      if (requestId.current === currentRequestId) {
        setVersions(null);
        setError(apiErrorMessage(loadError, 'Unable to load model versions.'));
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
      void loadVersions();
      return () => {
        requestId.current += 1;
        inProgress.current = false;
      };
    }, [loadVersions]),
  );

  async function promote(modelVersion: string) {
    if (promoting || isOnline === false) {
      return;
    }
    setPromoting(true);
    setError(null);
    try {
      setVersions(await promoteModel(modelVersion));
    } catch (promotionError: unknown) {
      setError(apiErrorMessage(promotionError, 'Unable to promote this candidate model.'));
    } finally {
      setPromoting(false);
    }
  }

  function requestPromotion(modelVersion: string) {
    Alert.alert(
      'Promote candidate model?',
      `Make ${modelVersion} the active model? The current model artifact will be retained.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Promote', style: 'destructive', onPress: () => void promote(modelVersion) },
      ],
    );
  }

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <AppButton title="Back" accessibilityLabel="Back to admin console" onPress={() => navigation.goBack()} />
          <AppButton title="Logout" accessibilityLabel="Log out of admin console" onPress={() => void logout()} />
        </View>
        <View style={styles.header}>
          <AppText variant="title" style={styles.brand}>SURAKSHAI</AppText>
          <AppText variant="heading" style={styles.heading}>Model Versions</AppText>
          <AppText variant="bodySmall">
            Candidate models do not affect inference until explicitly promoted.
          </AppText>
        </View>
        <OfflineState isOnline={isOnline} />
        {isOnline !== false && loading ? <LoadingState message="Loading model versions..." /> : null}
        {!loading && error ? (
          <ErrorState message={error} onRetry={() => void loadVersions()} retryDisabled={isOnline === false || promoting} />
        ) : null}
        {isOnline !== false && !loading && !error && versions ? (
          <>
            {versions.active_model ? (
              <ModelVersionCard model={versions.active_model} title="Active Model" />
            ) : (
              <EmptyState title="No active model is reported by the backend." />
            )}
            {versions.candidate_models.map((model) => (
              <ModelVersionCard
                key={model.model_version}
                model={model}
                title="Candidate Model"
                busy={promoting}
                onPromote={model.promotion_allowed ? () => requestPromotion(model.model_version) : undefined}
              />
            ))}
            {versions.candidate_models.length === 0 ? (
              <EmptyState title="No candidate models are available." />
            ) : null}
          </>
        ) : null}
        <AppButton
          title="Refresh"
          accessibilityLabel="Refresh model versions"
          loading={loading}
          disabled={loading || promoting || isOnline === false}
          onPress={() => void loadVersions()}
        />
        <AppButton title="Training Jobs" accessibilityLabel="Open training jobs" onPress={() => navigation.navigate('TrainingJobs')} />
        <AppButton title="Training Chat" accessibilityLabel="Open training chat" onPress={() => navigation.navigate('TrainingChat')} />
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
