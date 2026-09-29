import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { SupportRequestCard } from '../../components/support/SupportRequestCard';
import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { OfflineState } from '../../components/states/OfflineState';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import type { MainStackNavigation } from '../../navigation/MainNavigator';
import { createSupportRequest, getMySupportRequests } from '../../services/supportService';
import { ApiError } from '../../api/client';
import type { MainStackParamList } from '../../types/navigation';
import {
  supportRequestCategories,
  supportRequestCategoryLabels,
  type SupportRequest,
  type SupportRequestCategory,
  type SupportRequestUrgency,
} from '../../types/support';
import { theme } from '../../theme';
import { apiErrorMessage } from '../../utils/apiErrorMessage';

function supportErrorMessage(error: unknown): string {
  return apiErrorMessage(error, 'Your support request could not be completed. Please try again.', {
    unauthorized: 'Your session has expired. Please sign in again.',
    forbidden: 'Support requests are not available for this account.',
    not_found: 'The linked alert is no longer available for this account.',
    conflict: 'A support request is already open for this alert. Refresh to view its status.',
    validation: 'Please review the request details and try again.',
    server: 'Support requests are temporarily unavailable. Please try again later.',
  });
}

export function SupportScreen() {
  const navigation = useNavigation<MainStackNavigation>();
  const route = useRoute<RouteProp<MainStackParamList, 'Support'>>();
  const relatedAlertId = route.params?.relatedAlertId;
  const { isOnline } = useNetworkStatus();
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [category, setCategory] = useState<SupportRequestCategory | null>(null);
  const [message, setMessage] = useState('');
  const [urgency, setUrgency] = useState<SupportRequestUrgency>('NORMAL');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const requestInProgress = useRef(false);
  const submitInProgress = useRef(false);
  const requestId = useRef(0);

  const loadRequests = useCallback(async () => {
    if (isOnline === false) {
      requestId.current += 1;
      requestInProgress.current = false;
      setRequests([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    if (requestInProgress.current) {
      return;
    }
    requestInProgress.current = true;
    const currentRequestId = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const nextRequests = await getMySupportRequests();
      if (requestId.current === currentRequestId) {
        setRequests(nextRequests);
      }
    } catch (loadError: unknown) {
      if (requestId.current === currentRequestId) {
        setRequests([]);
        setError(supportErrorMessage(loadError));
      }
    } finally {
      if (requestId.current === currentRequestId) {
        requestInProgress.current = false;
        setIsLoading(false);
      }
    }
  }, [isOnline]);

  useFocusEffect(
    useCallback(() => {
      void loadRequests();
      return () => {
        requestId.current += 1;
        requestInProgress.current = false;
      };
    }, [loadRequests]),
  );

  const existingForAlert = useMemo(
    () => relatedAlertId
      ? requests.find((request) => request.relatedAlertId === relatedAlertId && request.status !== 'RESOLVED')
      : undefined,
    [relatedAlertId, requests],
  );

  const beginConfirmation = useCallback(() => {
    if (!category) {
      setValidationError('Choose a support category to continue.');
      return;
    }
    if (message.trim().length > 2000) {
      setValidationError('Your message must be 2000 characters or fewer.');
      return;
    }
    setValidationError(null);
    setError(null);
    setIsConfirming(true);
  }, [category, message]);

  const submit = useCallback(async () => {
    if (!category || submitInProgress.current || isOnline === false) {
      return;
    }
    submitInProgress.current = true;
    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const created = await createSupportRequest({
        ...(relatedAlertId ? { related_alert_id: relatedAlertId } : {}),
        category,
        ...(message.trim() ? { message: message.trim() } : {}),
        urgency,
      });
      setRequests((current) => [created, ...current.filter((item) => item.supportRequestId !== created.supportRequestId)]);
      setNotice(`Your request ${created.supportRequestId} was submitted and is ${created.status.toLowerCase()}.`);
      setCategory(null);
      setMessage('');
      setUrgency('NORMAL');
      setIsConfirming(false);
      setValidationError(null);
    } catch (submitError: unknown) {
      if (submitError instanceof ApiError && submitError.kind === 'conflict') {
        setIsConfirming(false);
        try {
          setRequests(await getMySupportRequests());
        } catch {
          // Keep the duplicate-request explanation safe and visible.
        }
      }
      setError(supportErrorMessage(submitError));
    } finally {
      submitInProgress.current = false;
      setIsSubmitting(false);
    }
  }, [category, isOnline, message, relatedAlertId, urgency]);

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <AppButton accessibilityLabel="Go back from Support and Follow-up" onPress={() => navigation.goBack()} title="Back" />
        <View style={styles.header}>
          <AppText variant="title" style={styles.brand}>SURAKSHAI</AppText>
          <AppText variant="heading" style={styles.heading}>Support &amp; Follow-up</AppText>
          <AppText variant="body" style={styles.description}>Request human welfare support. A welfare professional will review your request.</AppText>
          {relatedAlertId ? <AppText variant="bodySmall" style={styles.description}>This request will be linked to the support alert you selected.</AppText> : null}
        </View>

        <OfflineState isOnline={isOnline} />
        {isOnline !== false && isLoading ? <LoadingState message="Loading your support requests..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void loadRequests()} retryDisabled={isOnline === false || isSubmitting} /> : null}
        {notice ? <AppText accessibilityLiveRegion="polite" variant="bodySmall" style={styles.notice}>{notice}</AppText> : null}

        {existingForAlert ? (
          <View style={styles.existing}>
            <AppText variant="title" style={styles.sectionTitle}>A request is already open for this alert</AppText>
            <SupportRequestCard request={existingForAlert} />
          </View>
        ) : (
          <View style={styles.form}>
            <AppText variant="title" style={styles.sectionTitle}>Request support</AppText>
            <AppText variant="bodySmall" style={styles.description}>Choose the area where you would like a person to follow up.</AppText>

            <AppText variant="bodySmall" style={styles.fieldLabel}>Support category</AppText>
            <View style={styles.options}>
              {supportRequestCategories.map((item) => (
                <Pressable
                  key={item}
                  accessibilityLabel={supportRequestCategoryLabels[item]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: category === item }}
                  onPress={() => { setCategory(item); setIsConfirming(false); setValidationError(null); }}
                  style={[styles.option, category === item && styles.optionSelected]}
                >
                  <AppText variant="bodySmall" style={[styles.optionText, category === item && styles.optionTextSelected]}>
                    {supportRequestCategoryLabels[item]}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <AppText variant="bodySmall" style={styles.fieldLabel}>Message (optional)</AppText>
            <TextInput
              accessibilityLabel="Optional support request message"
              maxLength={2000}
              multiline
              onChangeText={(value) => { setMessage(value); setIsConfirming(false); }}
              placeholder="Share anything that may help the welfare team respond."
              placeholderTextColor={theme.colors.mutedText}
              style={styles.messageInput}
              textAlignVertical="top"
              value={message}
            />

            <AppText variant="bodySmall" style={styles.fieldLabel}>Urgency</AppText>
            <View style={styles.options}>
              {(['NORMAL', 'URGENT'] as const).map((item) => (
                <Pressable
                  key={item}
                  accessibilityLabel={`${item === 'URGENT' ? 'Urgent' : 'Normal'} urgency`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: urgency === item }}
                  onPress={() => { setUrgency(item); setIsConfirming(false); }}
                  style={[styles.option, urgency === item && styles.optionSelected]}
                >
                  <AppText variant="bodySmall" style={[styles.optionText, urgency === item && styles.optionTextSelected]}>
                    {item === 'URGENT' ? 'Urgent' : 'Normal'}
                  </AppText>
                </Pressable>
              ))}
            </View>

            {validationError ? <AppText accessibilityRole="alert" variant="bodySmall" style={styles.errorText}>{validationError}</AppText> : null}
            {isConfirming ? (
              <View style={styles.confirmation}>
                <AppText variant="bodySmall" style={styles.confirmationText}>Confirm that you want to send this request to the welfare team. The request will be recorded as REQUESTED.</AppText>
                <AppButton accessibilityLabel="Confirm and submit support request" disabled={isOnline === false} loading={isSubmitting} onPress={() => void submit()} title="Confirm request" />
                <AppButton accessibilityLabel="Edit support request" disabled={isSubmitting} onPress={() => setIsConfirming(false)} title="Edit request" />
              </View>
            ) : (
              <AppButton accessibilityLabel="Review support request" disabled={isLoading || isOnline === false || isSubmitting} onPress={beginConfirmation} title="Review request" />
            )}
          </View>
        )}

        <View style={styles.listSection}>
          <AppText variant="title" style={styles.sectionTitle}>Your requests</AppText>
          {isOnline !== false && !isLoading && !error && requests.length === 0 ? (
            <EmptyState title="No support requests yet" message="Requests you submit and their status will appear here." />
          ) : null}
          {isOnline !== false && !isLoading && !error && requests.length > 0 ? (
            <View style={styles.list}>{requests.map((request) => <SupportRequestCard key={request.supportRequestId} request={request} />)}</View>
          ) : null}
          <AppButton accessibilityLabel="Refresh support requests" disabled={isLoading || isOnline === false || isSubmitting} loading={isLoading} onPress={() => void loadRequests()} title="Refresh" />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0, paddingVertical: 0 },
  content: { gap: theme.spacing.lg, padding: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  header: { gap: theme.spacing.sm },
  brand: { color: theme.colors.accent },
  heading: { color: theme.colors.primary },
  description: { color: theme.colors.secondary },
  form: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: 14, borderWidth: 1, gap: theme.spacing.md, padding: theme.spacing.md },
  existing: { gap: theme.spacing.md },
  sectionTitle: { color: theme.colors.primary },
  fieldLabel: { color: theme.colors.primary, fontWeight: '700' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  option: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: 18, borderWidth: 1, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  optionSelected: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  optionText: { color: theme.colors.text },
  optionTextSelected: { color: theme.colors.surface, fontWeight: '700' },
  messageInput: { minHeight: 100, borderColor: theme.colors.border, borderRadius: 10, borderWidth: 1, color: theme.colors.text, padding: theme.spacing.md },
  errorText: { color: theme.colors.error },
  notice: { color: theme.colors.success },
  confirmation: { backgroundColor: theme.colors.background, borderRadius: 12, gap: theme.spacing.md, padding: theme.spacing.md },
  confirmationText: { color: theme.colors.text },
  listSection: { gap: theme.spacing.md },
  list: { gap: theme.spacing.md },
});
