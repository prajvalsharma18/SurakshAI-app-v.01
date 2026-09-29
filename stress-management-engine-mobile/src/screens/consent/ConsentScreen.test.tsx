import { NavigationContainer } from '@react-navigation/native';
import {
  act,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';

import { ApiError, apiClient } from '../../api/client';
import type { GetConsentResponse } from '../../api/types';
import { AuthProvider } from '../../auth/AuthContext';
import type { Session } from '../../auth/authTypes';
import { MainNavigator } from '../../navigation/MainNavigator';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const session: Session = {
  accessToken: 'consent-test-token',
  tokenType: 'Bearer',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  user: {
    username: 'sample.personnel',
    role: 'PERSONNEL',
    personnelId: 'PERSONNEL-42',
  },
};

const grantedSettings: GetConsentResponse = {
  user_id: 'user-123',
  consents: [
    {
      consent_type: 'WELLNESS_DATA_PROCESSING',
      granted: true,
      timestamp: '2026-09-28T10:15:00+00:00',
    },
    {
      consent_type: 'DATA_SHARING',
      granted: false,
      timestamp: null,
    },
  ],
};

const revokedSettings: GetConsentResponse = {
  ...grantedSettings,
  consents: [
    {
      consent_type: 'WELLNESS_DATA_PROCESSING',
      granted: false,
      timestamp: '2026-09-29T10:15:00+00:00',
    },
    grantedSettings.consents[1],
  ],
};

function axiosResponse<T>(data: T): AxiosResponse<T> {
  const headers = new AxiosHeaders();
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers,
    config: { headers },
  };
}

async function renderConsentScreen() {
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
  await act(async () => {
    await fireEvent.press(
      view.getByLabelText(
        'My Consent. Review and manage your data permissions.',
      ),
    );
  });
  return view;
}

describe('ConsentScreen', () => {
  const getSpy = jest.spyOn(apiClient, 'get');
  const postSpy = jest.spyOn(apiClient, 'post');

  beforeEach(() => {
    apiClient.defaults.baseURL = 'https://surakshai.test';
    jest.mocked(SecureStore.getItemAsync).mockReset();
    getSpy.mockReset();
    postSpy.mockReset();
  });

  afterAll(() => {
    getSpy.mockRestore();
    postSpy.mockRestore();
  });

  it('shows loading, backend-provided categories, and reloads on revisit', async () => {
    let resolveInitial: ((value: AxiosResponse<GetConsentResponse>) => void) | undefined;
    getSpy
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveInitial = resolve;
        }),
      )
      .mockResolvedValue(axiosResponse(grantedSettings));

    const view = await renderConsentScreen();
    expect(view.getByText('Loading your consent settings...')).toBeTruthy();

    await act(async () => {
      resolveInitial?.(axiosResponse(grantedSettings));
    });
    await waitFor(() =>
      expect(view.getByText('Wellness Data Processing')).toBeTruthy(),
    );
    expect(view.getByText('Data Sharing')).toBeTruthy();
    expect(view.queryByText('Biometric Data Processing')).toBeNull();
    expect(view.getByText('Granted')).toBeTruthy();
    expect(view.getByText('Not granted')).toBeTruthy();

    await act(async () => {
      await fireEvent.press(view.getByLabelText('Go back from My Consent'));
    });
    await act(async () => {
      await fireEvent.press(
        view.getByLabelText(
          'My Consent. Review and manage your data permissions.',
        ),
      );
    });
    await waitFor(() => expect(getSpy).toHaveBeenCalledTimes(2));
    expect(view.getByText('Wellness Data Processing')).toBeTruthy();
  });

  it('submits one decision and refreshes from the backend response', async () => {
    let resolvePost: ((value: AxiosResponse<unknown>) => void) | undefined;
    getSpy
      .mockResolvedValueOnce(axiosResponse(grantedSettings))
      .mockResolvedValueOnce(axiosResponse(revokedSettings));
    postSpy.mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve;
      }),
    );

    const view = await renderConsentScreen();
    const revokeButton = await view.findByLabelText(
      'Withdraw consent for Wellness Data Processing',
    );
    await act(async () => {
      await fireEvent.press(revokeButton);
      await fireEvent.press(revokeButton);
    });

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith('/consent', {
      consent_type: 'WELLNESS_DATA_PROCESSING',
      granted: false,
    });
    expect(view.getByText('Updating...')).toBeTruthy();

    await act(async () => {
      resolvePost?.(
        axiosResponse({
          consent_type: 'WELLNESS_DATA_PROCESSING',
          granted: false,
          timestamp: '2026-09-29T10:15:00+00:00',
        }),
      );
    });
    await waitFor(() =>
      expect(view.getAllByLabelText('Consent status: Not granted')).toHaveLength(
        2,
      ),
    );
    expect(getSpy).toHaveBeenCalledTimes(2);
    expect(view.getByText('Your consent settings were updated.')).toBeTruthy();
  });

  it('keeps confirmed state after a rejected consent transition', async () => {
    getSpy.mockResolvedValue(axiosResponse(grantedSettings));
    postSpy.mockRejectedValue(
      new ApiError('validation', 'The backend returned HTTP 400.', 400),
    );

    const view = await renderConsentScreen();
    await act(async () => {
      await fireEvent.press(
        await view.findByLabelText(
          'Withdraw consent for Wellness Data Processing',
        ),
      );
    });

    await waitFor(() =>
      expect(
        view.getByText('That consent change could not be applied.'),
      ).toBeTruthy(),
    );
    expect(view.getByLabelText('Consent status: Granted')).toBeTruthy();
    expect(getSpy).toHaveBeenCalledTimes(1);
  });

  it('shows the shared session-expired message for unauthorized access', async () => {
    getSpy.mockRejectedValue(
      new ApiError(
        'unauthorized',
        'Your session has expired. Please sign in again.',
        401,
      ),
    );

    const view = await renderConsentScreen();
    await waitFor(() =>
      expect(
        view.getByText('Your session has expired. Please sign in again.'),
      ).toBeTruthy(),
    );
  });

  it('shows a safe network message without backend exception details', async () => {
    getSpy.mockRejectedValue(
      new AxiosError('private socket detail', 'ERR_NETWORK'),
    );

    const view = await renderConsentScreen();
    await waitFor(() =>
      expect(
        view.getByText('Unable to connect to the SURAKSHAI backend.'),
      ).toBeTruthy(),
    );
    expect(view.queryByText(/private socket detail/)).toBeNull();
  });

  it('shows safe feedback when the backend denies access', async () => {
    getSpy.mockRejectedValue(
      new ApiError('forbidden', 'The backend returned HTTP 403.', 403),
    );

    const view = await renderConsentScreen();
    await waitFor(() =>
      expect(
        view.getByText('Your consent settings could not be accessed.'),
      ).toBeTruthy(),
    );
  });
});
