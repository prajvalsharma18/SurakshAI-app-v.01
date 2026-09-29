import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { OfflineState } from '../../components/states/OfflineState';
import { RatingSelector } from '../../components/wellness/RatingSelector';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { WellnessQuestion } from '../../components/wellness/WellnessQuestion';
import type { MainStackNavigation } from '../../navigation/MainNavigator';
import {
  buildWellnessRequest,
  getWellnessAssessments,
  submitWellnessAssessment,
  validateWellnessForm,
} from '../../services/wellnessService';
import type { WellnessAssessment, WellnessFormErrors, WellnessFormState } from '../../types/wellness';
import { theme } from '../../theme';
import { apiErrorMessage } from '../../utils/apiErrorMessage';

const emptyForm: WellnessFormState = {
  assessmentDate: '',
  sleepQuality: '',
  fatigueLevel: '',
  perceivedStress: '',
  moodWellbeing: '',
};

function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

function getLatestAssessment(assessments: WellnessAssessment[]) {
  if (assessments.length === 0) {
    return null;
  }
  return assessments.reduce((latest, current) =>
    current.assessmentDate > latest.assessmentDate ? current : latest,
  );
}

export function WellnessScreen() {
  const navigation = useNavigation<MainStackNavigation>();
  const { isOnline } = useNetworkStatus();
  const [form, setForm] = useState<WellnessFormState>(emptyForm);
  const [assessments, setAssessments] = useState<WellnessAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<WellnessFormErrors>({});
  const requestId = useRef(0);
  const submitInProgress = useRef(false);

  const loadWellness = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    if (isOnline === false) {
      setAssessments([]);
      setForm(emptyForm);
      setIsLoading(false);
      setError(null);
      setNotice(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    setNotice(null);

    try {
      const latest = await getWellnessAssessments();
      if (requestId.current !== currentRequestId) {
        return;
      }
      setAssessments(latest);
      if (latest.length > 0) {
        const mostRecent = getLatestAssessment(latest);
        if (mostRecent) {
          setForm({
            assessmentDate: mostRecent.assessmentDate,
            sleepQuality: String(mostRecent.sleepQuality),
            fatigueLevel: String(mostRecent.fatigueLevel),
            perceivedStress: String(mostRecent.perceivedStress),
            moodWellbeing: String(mostRecent.moodWellbeing),
          });
        }
      }
    } catch (loadError: unknown) {
      if (requestId.current !== currentRequestId) {
        return;
      }
      setError(apiErrorMessage(loadError, 'Unable to load your wellness assessment.'));
    } finally {
      if (requestId.current === currentRequestId) {
        setIsLoading(false);
      }
    }
  }, [isOnline]);

  useFocusEffect(
    useCallback(() => {
      if (!submitInProgress.current) {
        void loadWellness();
      }
      return () => {
        requestId.current += 1;
      };
    }, [loadWellness]),
  );

  const latestAssessment = useMemo(
    () => getLatestAssessment(assessments),
    [assessments],
  );
  const assessmentExistsForSelectedDate = assessments.some(
    (assessment) => assessment.assessmentDate === form.assessmentDate.trim(),
  );

  const updateField = (field: keyof WellnessFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: undefined }));
    setError(null);
  };

  const handleSubmit = useCallback(async () => {
    if (submitInProgress.current || isOnline === false) {
      return;
    }

    const validationErrors = validateWellnessForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      setError('Please review the highlighted responses.');
      return;
    }

    submitInProgress.current = true;
    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const normalizedRequest = buildWellnessRequest(form);
      await submitWellnessAssessment(normalizedRequest);
      const refreshed = await getWellnessAssessments();
      setAssessments(refreshed);
      const newest = getLatestAssessment(refreshed);
      if (newest) {
        setForm({
          assessmentDate: newest.assessmentDate,
          sleepQuality: String(newest.sleepQuality),
          fatigueLevel: String(newest.fatigueLevel),
          perceivedStress: String(newest.perceivedStress),
          moodWellbeing: String(newest.moodWellbeing),
        });
      }
      setNotice('Your wellness check-in was submitted and confirmed.');
      setFormErrors({});
    } catch (submitError: unknown) {
      const message = apiErrorMessage(submitError, 'Unable to complete the wellness check-in. Please try again.', {
        forbidden: 'Wellness data could not be submitted with the current consent settings.',
        conflict: 'A wellness assessment already exists for this date.',
        validation: 'Please review the highlighted responses.',
      });
      setError(message);
    } finally {
      submitInProgress.current = false;
      setIsSubmitting(false);
    }
  }, [form, isOnline]);

  const hasAssessmentData = assessments.length > 0 && latestAssessment !== null;

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppButton
          accessibilityLabel="Go back from Wellness Check-in"
          onPress={() => navigation.goBack()}
          title="Back"
        />

        <View style={styles.header}>
          <AppText variant="title" style={styles.brand}>SURAKSHAI</AppText>
          <AppText variant="heading" style={styles.heading}>Wellness Check-in</AppText>
          <AppText variant="body" style={styles.description}>
            Complete a brief self-assessment to share your current wellbeing.
          </AppText>
        </View>

        <OfflineState isOnline={isOnline} />

        {isOnline !== false && isLoading ? (
          <LoadingState message="Loading your wellness assessment..." />
        ) : null}

        {error ? (
          <ErrorState message={error} onRetry={() => void loadWellness()} retryDisabled={isOnline === false} />
        ) : null}

        {notice ? (
          <AppText accessibilityLiveRegion="polite" variant="bodySmall" style={styles.notice}>
            {notice}
          </AppText>
        ) : null}

        {isOnline !== false && !isLoading && !hasAssessmentData ? (
          <View style={styles.emptyState}>
            <AppText variant="body" style={styles.emptyHeading}>No wellness check-in yet</AppText>
            <AppText variant="bodySmall" style={styles.secondaryText}>
              Complete a quick assessment below to record your current wellbeing.
            </AppText>
          </View>
        ) : null}

        {isOnline !== false && !isLoading && hasAssessmentData ? (
          <View style={styles.summaryCard}>
            <AppText variant="bodySmall" style={styles.summaryLabel}>Latest check-in</AppText>
            <AppText variant="body" style={styles.summaryValue}>
              {latestAssessment?.assessmentDate}
            </AppText>
            <AppText variant="bodySmall" style={styles.secondaryText}>
              Submitted {latestAssessment?.submittedAt ? new Date(latestAssessment.submittedAt).toLocaleString() : 'recently'}
            </AppText>
          </View>
        ) : null}

        {isOnline !== false ? <View style={styles.formSection}>
          <WellnessQuestion
            label="Assessment date"
            error={formErrors.assessmentDate}
          >
            <TextInput
              accessibilityLabel="Wellness assessment date"
              value={form.assessmentDate}
              onChangeText={(value) => updateField('assessmentDate', value)}
              placeholder={todayIso()}
              style={styles.input}
            />
          </WellnessQuestion>

          {assessmentExistsForSelectedDate ? (
            <AppText accessibilityLiveRegion="polite" variant="bodySmall" style={styles.error}>
              A wellness assessment already exists for this date.
            </AppText>
          ) : null}

          <WellnessQuestion
            label="Sleep quality"
            description="1 = poor, 5 = excellent"
            error={formErrors.sleepQuality}
          >
            <RatingSelector
              label="Sleep quality"
              value={form.sleepQuality}
              onChange={(value) => updateField('sleepQuality', value)}
            />
          </WellnessQuestion>

          <WellnessQuestion
            label="Fatigue level"
            description="1 = low, 5 = high"
            error={formErrors.fatigueLevel}
          >
            <RatingSelector
              label="Fatigue level"
              value={form.fatigueLevel}
              onChange={(value) => updateField('fatigueLevel', value)}
            />
          </WellnessQuestion>

          <WellnessQuestion
            label="Perceived stress"
            description="1 = calm, 5 = overwhelmed"
            error={formErrors.perceivedStress}
          >
            <RatingSelector
              label="Perceived stress"
              value={form.perceivedStress}
              onChange={(value) => updateField('perceivedStress', value)}
            />
          </WellnessQuestion>

          <WellnessQuestion
            label="Mood and wellbeing"
            description="1 = low, 5 = positive"
            error={formErrors.moodWellbeing}
          >
            <RatingSelector
              label="Mood and wellbeing"
              value={form.moodWellbeing}
              onChange={(value) => updateField('moodWellbeing', value)}
            />
          </WellnessQuestion>
        </View> : null}

        <AppButton
          accessibilityLabel="Submit wellness check-in"
          disabled={isLoading || isSubmitting || isOnline === false || assessmentExistsForSelectedDate}
          loading={isSubmitting}
          onPress={() => void handleSubmit()}
          title="Submit check-in"
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
  emptyState: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  emptyHeading: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  secondaryText: {
    color: theme.colors.secondary,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
  },
  summaryLabel: {
    color: theme.colors.secondary,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  formSection: {
    gap: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  error: {
    color: theme.colors.error,
  },
  notice: {
    color: theme.colors.success,
  },
});
