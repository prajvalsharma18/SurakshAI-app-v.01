import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ConsentCard } from '../../components/consent/ConsentCard';
import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { OfflineState } from '../../components/states/OfflineState';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import type { MainStackNavigation } from '../../navigation/MainNavigator';
import { getConsent, setConsent } from '../../services/consentService';
import type { ConsentSettings, ConsentType } from '../../types/consent';
import { theme } from '../../theme';
import { apiErrorMessage } from '../../utils/apiErrorMessage';

export function ConsentScreen() {
  const navigation = useNavigation<MainStackNavigation>();
  const { isOnline } = useNetworkStatus();
  const [settings, setSettings] = useState<ConsentSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mutatingType, setMutatingType] = useState<ConsentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestId = useRef(0);
  const mutationInProgress = useRef(false);

  const loadConsent = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    if (isOnline === false) {
      setSettings(null);
      setIsLoading(false);
      setError(null);
      setNotice(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    setNotice(null);

    try {
      const response = await getConsent();
      if (requestId.current === currentRequestId) {
        setSettings(response);
      }
    } catch (loadError: unknown) {
      if (requestId.current === currentRequestId) {
        setError(apiErrorMessage(loadError, 'Unable to load your consent settings. Please try again.', {
          forbidden: 'Your consent settings could not be accessed.',
        }));
      }
    } finally {
      if (requestId.current === currentRequestId) {
        setIsLoading(false);
      }
    }
  }, [isOnline]);

  useFocusEffect(
    useCallback(() => {
      if (!mutationInProgress.current) {
        void loadConsent();
      }
      return () => {
        requestId.current += 1;
      };
    }, [loadConsent]),
  );

  const handleDecision = useCallback(
    async (type: ConsentType, granted: boolean) => {
      if (mutationInProgress.current || isLoading || isOnline === false) {
        return;
      }

      mutationInProgress.current = true;
      setMutatingType(type);
      setError(null);
      setNotice(null);

      try {
        await setConsent({ type, granted });
        try {
          const confirmedSettings = await getConsent();
          setSettings(confirmedSettings);
          setNotice('Your consent settings were updated.');
        } catch (refreshError: unknown) {
          setError(apiErrorMessage(refreshError, 'Unable to load your consent settings. Please try again.', {
            forbidden: 'Your consent settings could not be accessed.',
          }));
          setNotice(
            'Your decision was submitted, but the latest settings could not be loaded. Refresh to confirm the current state.',
          );
        }
      } catch (updateError: unknown) {
        setError(apiErrorMessage(updateError, 'That consent change could not be applied.', {
          validation: 'That consent change could not be applied.',
          forbidden: 'That consent change could not be applied.',
        }));
      } finally {
        mutationInProgress.current = false;
        setMutatingType(null);
      }
    },
    [isLoading, isOnline],
  );

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppButton
          accessibilityLabel="Go back from My Consent"
          onPress={() => navigation.goBack()}
          title="Back"
        />
        <View style={styles.header}>
          <AppText variant="title" style={styles.brand}>
            SURAKSHAI
          </AppText>
          <AppText variant="heading" style={styles.heading}>
            My Consent
          </AppText>
          <AppText variant="body" style={styles.description}>
            Review and manage the permissions associated with your welfare and
            support information. Your choices are shown after they are
            confirmed by the backend.
          </AppText>
        </View>

        <OfflineState isOnline={isOnline} />

        {isOnline !== false && isLoading ? (
          <LoadingState message="Loading your consent settings..." />
        ) : null}

        {error ? (
          <ErrorState message={error} onRetry={() => void loadConsent()} retryDisabled={isOnline === false || mutatingType !== null} />
        ) : null}
        {notice ? (
          <AppText
            accessibilityLiveRegion="polite"
            variant="bodySmall"
            style={styles.notice}
          >
            {notice}
          </AppText>
        ) : null}

        {isOnline !== false && !isLoading && settings?.consents.length === 0 ? (
          <AppText variant="bodySmall" style={styles.secondaryText}>
            No consent categories are currently available.
          </AppText>
        ) : null}

        {isOnline !== false && settings?.consents.map((consent) => (
          <ConsentCard
            key={consent.type}
            consent={consent}
            disabled={isLoading || mutatingType !== null}
            loading={mutatingType === consent.type}
            onDecision={handleDecision}
          />
        ))}

        <AppButton
          accessibilityLabel="Refresh consent settings"
          disabled={isLoading || mutatingType !== null || isOnline === false}
          loading={isLoading}
          onPress={() => void loadConsent()}
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
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  header: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
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
  secondaryText: {
    color: theme.colors.secondary,
  },
  error: {
    color: theme.colors.error,
  },
  notice: {
    color: theme.colors.success,
  },
});
