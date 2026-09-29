import { NavigationContainer } from '@react-navigation/native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { ApiError } from '../../api/client';
import { AuthProvider } from '../../auth/AuthContext';
import type { Session } from '../../auth/authTypes';
import { MainNavigator } from '../../navigation/MainNavigator';
import * as alertService from '../../services/alertService';
import type { WelfareAlert } from '../../types/alert';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const session: Session = {
  accessToken: 'alerts-test-token',
  tokenType: 'Bearer',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  user: {
    username: 'sample.personnel',
    role: 'PERSONNEL',
    personnelId: 'personnel-fixture',
  },
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

async function renderAuthenticatedMain() {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(
    JSON.stringify(session),
  );
  const view = await render(
    <AuthProvider>
      <NavigationContainer>
        <MainNavigator />
      </NavigationContainer>
    </AuthProvider>,
  );
  await waitFor(() =>
    expect(view.getByText('Hello, sample.personnel')).toBeTruthy(),
  );
  return view;
}

async function openAlerts(
  view: Awaited<ReturnType<typeof renderAuthenticatedMain>>,
) {
  await act(async () => {
    await fireEvent.press(
      view.getByLabelText(
        'Support Alerts. View welfare support alerts shared with you.',
      ),
    );
  });
}

describe('personnel welfare alerts flow', () => {
  const listSpy = jest.spyOn(alertService, 'getPersonnelAlerts');
  const detailSpy = jest.spyOn(alertService, 'getWelfareAlertDetail');

  beforeEach(() => {
    jest.mocked(SecureStore.getItemAsync).mockReset();
    listSpy.mockReset();
    detailSpy.mockReset();
  });

  afterAll(() => {
    listSpy.mockRestore();
    detailSpy.mockRestore();
  });

  it('shows the list loading state and passes the session personnel ID', async () => {
    let resolveList: ((alerts: WelfareAlert[]) => void) | undefined;
    listSpy.mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve;
      }),
    );

    const view = await renderAuthenticatedMain();
    await openAlerts(view);

    expect(view.getByText('Loading support alerts...')).toBeTruthy();
    expect(listSpy).toHaveBeenCalledTimes(1);
    expect(listSpy).toHaveBeenCalledWith('personnel-fixture');

    await act(async () => {
      resolveList?.([alert]);
    });
    expect(await view.findByText('Welfare support alert')).toBeTruthy();
  });

  it('shows the calm empty state from an empty backend list', async () => {
    listSpy.mockResolvedValue([]);
    const view = await renderAuthenticatedMain();

    await openAlerts(view);

    expect(
      await view.findByText('No welfare support alerts are available right now.'),
    ).toBeTruthy();
  });

  it('navigates from Home to alert list and from an alert to backend detail', async () => {
    listSpy.mockResolvedValue([alert]);
    detailSpy.mockResolvedValue(alert);
    const view = await renderAuthenticatedMain();

    await openAlerts(view);
    await act(async () => {
      await fireEvent.press(
        await view.findByLabelText('Open Attention support alert'),
      );
    });

    expect(await view.findByText('Support alert')).toBeTruthy();
    expect(
      view.getByText('Support context: Repeated elevated risk'),
    ).toBeTruthy();
    expect(view.getByLabelText('Alert status: Open')).toBeTruthy();
    expect(detailSpy).toHaveBeenCalledWith('alert-fixture-1');
  });

  it('displays backend-confirmed status without personnel mutation controls', async () => {
    listSpy.mockResolvedValue([{ ...alert, status: 'ACKNOWLEDGED' }]);
    detailSpy.mockResolvedValue({
      ...alert,
      status: 'ACKNOWLEDGED',
      acknowledgedAt: '2026-09-29T09:00:00Z',
    });
    const view = await renderAuthenticatedMain();

    await openAlerts(view);
    await act(async () => {
      await fireEvent.press(
        await view.findByLabelText('Open Attention support alert'),
      );
    });

    expect(view.getByLabelText('Alert status: Acknowledged')).toBeTruthy();
    expect(view.getByText(/Acknowledged:/)).toBeTruthy();
    expect(view.queryByLabelText(/acknowledge alert/i)).toBeNull();
    expect(view.queryByLabelText(/submit.*support action/i)).toBeNull();
    expect(
      view.getByText(/managed by authorized welfare staff/),
    ).toBeTruthy();
  });

  it('refreshes alert list from backend after revisiting the screen', async () => {
    listSpy.mockResolvedValue([alert]);
    const view = await renderAuthenticatedMain();

    await openAlerts(view);
    await waitFor(() => expect(listSpy).toHaveBeenCalledTimes(1));

    await act(async () => {
      await fireEvent.press(
        view.getByLabelText('Go back from Support Alerts'),
      );
    });
    await openAlerts(view);

    await waitFor(() => expect(listSpy).toHaveBeenCalledTimes(2));
  });

  it.each([
    [
      new ApiError('unauthorized', 'private auth details', 401),
      'Your session has expired. Please sign in again.',
    ],
    [
      new ApiError('forbidden', 'private denied details', 403),
      'Welfare alerts are not available for this account.',
    ],
    [
      new ApiError('not_found', 'private missing details', 404),
      'Welfare alerts could not be found.',
    ],
    [
      new ApiError('server', 'private server details', 503),
      'Welfare alerts are temporarily unavailable.',
    ],
  ])('shows a safe list error for %s', async (error, message) => {
    listSpy.mockRejectedValue(error);
    const view = await renderAuthenticatedMain();

    await openAlerts(view);

    expect(await view.findByText(message)).toBeTruthy();
    expect(view.queryByText(/private|stack|database|exception/i)).toBeNull();
  });

  it('does not log alert content', async () => {
    listSpy.mockResolvedValue([alert]);
    detailSpy.mockResolvedValue(alert);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const view = await renderAuthenticatedMain();

    await openAlerts(view);
    await act(async () => {
      await fireEvent.press(
        await view.findByLabelText('Open Attention support alert'),
      );
    });
    await view.findByText('Support context: Repeated elevated risk');

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
