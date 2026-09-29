import { NavigationContainer } from '@react-navigation/native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { ApiError } from '../../api/client';
import { AuthProvider } from '../../auth/AuthContext';
import type { Session } from '../../auth/authTypes';
import { MainNavigator } from '../../navigation/MainNavigator';
import * as alertService from '../../services/alertService';
import * as supportService from '../../services/supportService';
import type { WelfareAlert } from '../../types/alert';
import type { SupportRequest } from '../../types/support';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

let mockOnline = true;
jest.mock('../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({ isOnline: mockOnline }),
}));

const session: Session = {
  accessToken: 'support-test-token',
  tokenType: 'Bearer',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  user: { username: 'sample.personnel', role: 'PERSONNEL', personnelId: 'personnel-fixture' },
};

const createdRequest: SupportRequest = {
  supportRequestId: 'support-fixture-1',
  relatedAlertId: null,
  category: 'GENERAL_WELFARE',
  message: null,
  urgency: 'NORMAL',
  status: 'REQUESTED',
  createdAt: '2026-09-29T08:00:00Z',
  updatedAt: '2026-09-29T08:00:00Z',
  acknowledgedAt: null,
  scheduledFollowUp: null,
  closedAt: null,
};

const alert: WelfareAlert = {
  alertId: 'alert-fixture-1',
  referenceDate: '2026-09-29',
  createdAt: '2026-09-29T08:00:00Z',
  severity: 'ATTENTION',
  triggerType: 'REPEATED_ELEVATED_RISK',
  currentRiskCategory: 'ELEVATED',
  status: 'OPEN',
  acknowledgedAt: null,
  reviewedAt: null,
  resolvedAt: null,
};

const supportErrors: [ApiError, string][] = [
  [new ApiError('unauthorized', 'sensitive error', 401), 'Your session has expired. Please sign in again.'],
  [new ApiError('forbidden', 'sensitive error', 403), 'Support requests are not available for this account.'],
  [new ApiError('not_found', 'sensitive error', 404), 'The linked alert is no longer available for this account.'],
  [new ApiError('conflict', 'sensitive error', 409), 'A support request is already open for this alert. Refresh to view its status.'],
  [new ApiError('validation', 'sensitive error', 422), 'Please review the request details and try again.'],
  [new ApiError('server', 'sensitive error', 503), 'Support requests are temporarily unavailable. Please try again later.'],
];

async function renderAuthenticatedMain() {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(JSON.stringify(session));
  const view = await render(
    <AuthProvider><NavigationContainer><MainNavigator /></NavigationContainer></AuthProvider>,
  );
  await waitFor(() => expect(view.getByText('Hello, sample.personnel')).toBeTruthy());
  return view;
}

async function openSupport(view: Awaited<ReturnType<typeof renderAuthenticatedMain>>) {
  await act(async () => {
    await fireEvent.press(view.getByLabelText('Support / Follow-up. Request human welfare support and view follow-up status.'));
  });
}

describe('personnel Support & Follow-up screen', () => {
  const listSpy = jest.spyOn(supportService, 'getMySupportRequests');
  const createSpy = jest.spyOn(supportService, 'createSupportRequest');
  const alertsSpy = jest.spyOn(alertService, 'getPersonnelAlerts');
  const detailSpy = jest.spyOn(alertService, 'getWelfareAlertDetail');

  beforeEach(() => {
    mockOnline = true;
    jest.mocked(SecureStore.getItemAsync).mockReset();
    listSpy.mockReset();
    createSpy.mockReset();
    alertsSpy.mockReset();
    detailSpy.mockReset();
    listSpy.mockResolvedValue([]);
  });

  afterAll(() => {
    listSpy.mockRestore();
    createSpy.mockRestore();
    alertsSpy.mockRestore();
    detailSpy.mockRestore();
  });

  it('replaces the placeholder with a real empty request flow', async () => {
    const view = await renderAuthenticatedMain();
    await openSupport(view);
    expect(await view.findByText('Request human welfare support. A welfare professional will review your request.')).toBeTruthy();
    expect(view.getByText('No support requests yet')).toBeTruthy();
    expect(listSpy).toHaveBeenCalledTimes(1);
    expect(view.queryByText('Coming in a later phase.')).toBeNull();
  });

  it('shows a loading state while the authenticated list is pending', async () => {
    let resolveRequests: ((requests: SupportRequest[]) => void) | undefined;
    listSpy.mockReturnValue(new Promise((resolve) => { resolveRequests = resolve; }));
    const view = await renderAuthenticatedMain();
    await openSupport(view);
    expect(view.getByText('Loading your support requests...')).toBeTruthy();
    await act(async () => resolveRequests?.([]));
    expect(await view.findByText('No support requests yet')).toBeTruthy();
  });

  it('validates category and requires explicit confirmation before posting', async () => {
    const view = await renderAuthenticatedMain();
    await openSupport(view);
    await view.findByText('No support requests yet');

    await act(async () => fireEvent.press(view.getByLabelText('Review support request')));
    expect(view.getByText('Choose a support category to continue.')).toBeTruthy();
    expect(createSpy).not.toHaveBeenCalled();

    await act(async () => fireEvent.press(view.getByLabelText('General welfare')));
    await act(async () => fireEvent.press(view.getByLabelText('Review support request')));
    expect(view.getByText(/Confirm that you want to send this request/)).toBeTruthy();
    expect(createSpy).not.toHaveBeenCalled();

    createSpy.mockResolvedValue(createdRequest);
    await act(async () => fireEvent.press(view.getByLabelText('Confirm and submit support request')));
    expect(createSpy).toHaveBeenCalledWith({ category: 'GENERAL_WELFARE', urgency: 'NORMAL' });
    expect(await view.findByText(/support-fixture-1 was submitted and is requested/)).toBeTruthy();
    expect(view.getByLabelText('Request status: Requested')).toBeTruthy();
  });

  it.each(supportErrors)('shows a safe message for HTTP %s', async (error, message) => {
    listSpy.mockResolvedValue([]);
    createSpy.mockRejectedValue(error);
    const view = await renderAuthenticatedMain();
    await openSupport(view);
    await view.findByText('No support requests yet');
    await act(async () => fireEvent.press(view.getByLabelText('Personal support')));
    await act(async () => fireEvent.press(view.getByLabelText('Review support request')));
    await act(async () => fireEvent.press(view.getByLabelText('Confirm and submit support request')));
    expect(await view.findByText(message)).toBeTruthy();
    expect(view.queryByText('sensitive error')).toBeNull();
  });

  it('disables submission while offline', async () => {
    mockOnline = false;
    const view = await renderAuthenticatedMain();
    await openSupport(view);
    expect(await view.findByText(/You're offline/)).toBeTruthy();
    expect(view.getByLabelText('Review support request').props.accessibilityState.disabled).toBe(true);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('opens a linked support request from an owned alert without showing staff actions', async () => {
    alertsSpy.mockResolvedValue([alert]);
    detailSpy.mockResolvedValue(alert);
    const view = await renderAuthenticatedMain();
    await act(async () => fireEvent.press(view.getByLabelText('Support Alerts. View welfare support alerts shared with you.')));
    await act(async () => fireEvent.press(await view.findByLabelText('Open Attention support alert')));
    await view.findByText('Support alert');
    expect(view.getByLabelText('Request support for this alert')).toBeTruthy();
    expect(view.queryByLabelText(/acknowledge alert|resolve alert|intervention/i)).toBeNull();

    await act(async () => fireEvent.press(view.getByLabelText('Request support for this alert')));
    await view.findByText('This request will be linked to the support alert you selected.');
    expect(listSpy).toHaveBeenCalled();
    expect(view.queryByLabelText(/acknowledge alert|resolve alert|intervention/i)).toBeNull();

    createSpy.mockResolvedValue({ ...createdRequest, relatedAlertId: 'alert-fixture-1' });
    await act(async () => fireEvent.press(view.getByLabelText('General welfare')));
    await act(async () => fireEvent.press(view.getByLabelText('Review support request')));
    await act(async () => fireEvent.press(view.getByLabelText('Confirm and submit support request')));
    expect(createSpy).toHaveBeenCalledWith({
      related_alert_id: 'alert-fixture-1',
      category: 'GENERAL_WELFARE',
      urgency: 'NORMAL',
    });
  });

  it('shows an existing open alert request instead of offering another submission', async () => {
    alertsSpy.mockResolvedValue([alert]);
    detailSpy.mockResolvedValue(alert);
    listSpy.mockResolvedValue([{ ...createdRequest, relatedAlertId: 'alert-fixture-1' }]);
    const view = await renderAuthenticatedMain();
    await act(async () => fireEvent.press(view.getByLabelText('Support Alerts. View welfare support alerts shared with you.')));
    await act(async () => fireEvent.press(await view.findByLabelText('Open Attention support alert')));
    await act(async () => fireEvent.press(await view.findByLabelText('Request support for this alert')));
    expect(await view.findByText('A request is already open for this alert')).toBeTruthy();
    expect(view.queryByLabelText('Review support request')).toBeNull();
    expect(view.getAllByLabelText('Request status: Requested')).toHaveLength(2);
    expect(createSpy).not.toHaveBeenCalled();
  });
});
