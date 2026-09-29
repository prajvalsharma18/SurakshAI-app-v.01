import { useNavigation } from '@react-navigation/native';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../auth/AuthContext';
import { TrainingMessageBubble } from '../../components/admin/TrainingMessageBubble';
import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { ErrorState } from '../../components/states/ErrorState';
import { OfflineState } from '../../components/states/OfflineState';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { createTrainingPlan, confirmTrainingPlan } from '../../services/modelTrainingService';
import type { AdminTrainingStackParamList } from '../../types/navigation';
import type { ModelTrainingPlan } from '../../types/modelTraining';
import { theme } from '../../theme';
import { apiErrorMessage } from '../../utils/apiErrorMessage';
import { TrainingPlanScreen } from './TrainingPlanScreen';

type AdminNavigation = NativeStackNavigationProp<AdminTrainingStackParamList>;

export function AdminTrainingChatScreen() {
  const navigation = useNavigation<AdminNavigation>();
  const { logout } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [requestText, setRequestText] = useState('');
  const [messages, setMessages] = useState<{ id: number; sender: 'admin' | 'assistant'; message: string }[]>([]);
  const [plan, setPlan] = useState<ModelTrainingPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const requestInProgress = useRef(false);
  const nextMessageId = useRef(0);

  async function submitRequest() {
    const query = requestText.trim();
    if (!query || requestInProgress.current || isOnline === false) {
      return;
    }
    requestInProgress.current = true;
    setBusy(true);
    setError(null);
    setPlan(null);
    setMessages((current) => [
      ...current,
      { id: nextMessageId.current++, sender: 'admin', message: query },
    ]);
    setRequestText('');
    try {
      const trainingPlan = await createTrainingPlan(query);
      setPlan(trainingPlan);
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId.current++,
          sender: 'assistant',
          message: 'Review the proposed candidate training plan below. No training has started.',
        },
      ]);
    } catch (requestError: unknown) {
      setError(apiErrorMessage(requestError, 'Unable to create a training plan.'));
    } finally {
      requestInProgress.current = false;
      setBusy(false);
    }
  }

  async function confirmPlan() {
    if (!plan || requestInProgress.current || isOnline === false) {
      return;
    }
    requestInProgress.current = true;
    setBusy(true);
    setError(null);
    try {
      await confirmTrainingPlan(plan.plan_id);
      setPlan(null);
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId.current++,
          sender: 'assistant',
          message: 'Training job submitted. You can follow its backend-confirmed status in Training Jobs.',
        },
      ]);
    } catch (requestError: unknown) {
      setError(apiErrorMessage(requestError, 'Unable to start the candidate training job.'));
    } finally {
      requestInProgress.current = false;
      setBusy(false);
    }
  }

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <AppButton title="Back" accessibilityLabel="Back to admin console" onPress={() => navigation.goBack()} />
          <AppButton title="Logout" accessibilityLabel="Log out of admin console" onPress={() => void logout()} />
        </View>
        <View style={styles.header}>
          <AppText variant="title" style={styles.brand}>SURAKSHAI</AppText>
          <AppText variant="heading" style={styles.heading}>Training Chat</AppText>
          <AppText variant="body">
            Describe the candidate model you want to train. Sending a request only
            creates a reviewable plan; it does not start training.
          </AppText>
        </View>
        <OfflineState isOnline={isOnline} />
        {messages.map((item) => (
          <TrainingMessageBubble key={item.id} sender={item.sender} message={item.message} />
        ))}
        {error ? <ErrorState message={error} /> : null}
        {plan ? (
          <TrainingPlanScreen
            plan={plan}
            busy={busy}
            disabled={isOnline === false}
            onCancel={() => {
              if (!busy) {
                setPlan(null);
                setError(null);
              }
            }}
            onConfirm={() => void confirmPlan()}
          />
        ) : null}
        <View style={styles.inputSection}>
          <TextInput
            accessibilityLabel="Training request"
            editable={!busy && isOnline !== false}
            multiline
            onChangeText={setRequestText}
            placeholder="Train a new candidate risk model using the latest approved dataset."
            style={styles.input}
            value={requestText}
          />
          <AppButton
            title="Create Plan"
            accessibilityLabel="Create training plan"
            disabled={busy || isOnline === false || requestText.trim().length === 0}
            loading={busy}
            onPress={() => void submitRequest()}
          />
        </View>
        <AppButton
          title="View Training Jobs"
          accessibilityLabel="Open training jobs"
          onPress={() => navigation.navigate('TrainingJobs')}
        />
        <AppButton
          title="View Model Versions"
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
  inputSection: {
    gap: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 96,
    padding: theme.spacing.md,
    textAlignVertical: 'top',
  },
});
