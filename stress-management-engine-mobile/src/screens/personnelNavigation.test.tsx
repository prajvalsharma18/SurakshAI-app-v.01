import { NavigationContainer } from '@react-navigation/native';
import {
  act,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import type { ReactNode } from 'react';

import { apiClient } from '../api/client';
import { AuthProvider } from '../auth/AuthContext';
import type { Session } from '../auth/authTypes';
import { RootNavigator } from '../navigation/RootNavigator';
import { MainNavigator } from '../navigation/MainNavigator';
import * as authService from '../services/authService';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const session: Session = {
  accessToken: 'navigation-test-token',
  tokenType: 'Bearer',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  user: {
    username: 'sample.personnel',
    role: 'PERSONNEL',
    personnelId: 'PERSONNEL-42',
  },
};

function wrapWithAuth(navigator: ReactNode) {
  return (
    <AuthProvider>
      <NavigationContainer>{navigator}</NavigationContainer>
    </AuthProvider>
  );
}

async function renderAuthenticatedMain() {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(
    JSON.stringify(session),
  );
  const view = await render(wrapWithAuth(<MainNavigator />));
  await waitFor(() => {
    expect(view.getByText('Hello, sample.personnel')).toBeTruthy();
  });
  return view;
}

describe('personnel navigation screens', () => {
  const deleteItemAsync = jest.mocked(SecureStore.deleteItemAsync);
  const loginMock = jest.spyOn(authService, 'loginWithCredentials');
  const originalGet = apiClient.get;
  const originalPost = apiClient.post;

  beforeEach(() => {
    jest.mocked(SecureStore.getItemAsync).mockReset();
    jest.mocked(SecureStore.setItemAsync).mockReset();
    deleteItemAsync.mockReset();
    loginMock.mockReset();
    jest.mocked(SecureStore.setItemAsync).mockResolvedValue();
    deleteItemAsync.mockResolvedValue();
  });

  afterEach(() => {
    apiClient.get = originalGet;
    apiClient.post = originalPost;
  });

  afterAll(() => {
    loginMock.mockRestore();
  });

  it('renders the current session username on Home', async () => {
    const view = await renderAuthenticatedMain();
    expect(view.getByText('Hello, sample.personnel')).toBeTruthy();
    expect(view.queryByText(/mock_personnel|P900/)).toBeNull();
  });

  it('renders profile username, role, personnel ID, and session status', async () => {
    const view = await renderAuthenticatedMain();
    await act(async () => {
      await fireEvent.press(view.getByLabelText('Profile tab'));
    });

    expect(view.getByText('Username')).toBeTruthy();
    expect(view.getByText('sample.personnel')).toBeTruthy();
    expect(view.getByText('PERSONNEL')).toBeTruthy();
    expect(view.getByText('PERSONNEL-42')).toBeTruthy();
    expect(view.getByText('Signed in')).toBeTruthy();
    expect(view.queryByText(/navigation-test-token/)).toBeNull();
  });

  it('shows a safe fallback when personnel ID is not supplied', async () => {
    const noPersonnelIdSession: Session = {
      ...session,
      user: { username: 'sample.personnel', role: 'PERSONNEL' },
    };
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(
      JSON.stringify(noPersonnelIdSession),
    );
    const view = await render(wrapWithAuth(<MainNavigator />));
    await waitFor(() =>
      expect(view.getByText('Hello, sample.personnel')).toBeTruthy(),
    );
    await act(async () => {
      await fireEvent.press(view.getByLabelText('Profile tab'));
    });

    expect(view.getByText('Not available')).toBeTruthy();
  });

  it('navigates Home to Profile and back to Home', async () => {
    const view = await renderAuthenticatedMain();
    await act(async () => {
      await fireEvent.press(view.getByLabelText('Profile tab'));
    });
    expect(view.getAllByText('Profile').length).toBeGreaterThan(0);

    await act(async () => {
      await fireEvent.press(view.getByLabelText('Home tab'));
    });
    expect(view.getByText('Hello, sample.personnel')).toBeTruthy();
  });

  it('opens the Wellness Check-in screen without API requests on entry', async () => {
    const getSpy = jest.spyOn(apiClient, 'get');
    const postSpy = jest.spyOn(apiClient, 'post');
    const view = await renderAuthenticatedMain();

    await act(async () => {
      await fireEvent.press(
        view.getByLabelText('Wellness Check-in. A personal wellbeing check-in.'),
      );
    });

    expect(view.getByText('Wellness Check-in')).toBeTruthy();
    expect(view.getByText('Complete a brief self-assessment to share your current wellbeing.')).toBeTruthy();

    await act(async () => {
      await fireEvent.press(view.getByLabelText('Go back from Wellness Check-in'));
    });
    expect(view.getByText('Hello, sample.personnel')).toBeTruthy();

    expect(getSpy).not.toHaveBeenCalled();
    expect(postSpy).not.toHaveBeenCalled();
    getSpy.mockRestore();
    postSpy.mockRestore();
  });

  it('logout clears the session and replaces authenticated navigation with Login', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(
      JSON.stringify(session),
    );
    const view = await render(wrapWithAuth(<RootNavigator />));
    await waitFor(() =>
      expect(view.getByText('Hello, sample.personnel')).toBeTruthy(),
    );
    await act(async () => {
      await fireEvent.press(view.getByLabelText('Profile tab'));
    });

    await act(async () => {
      await fireEvent.press(view.getByLabelText('Log out of SURAKSHAI'));
    });

    await waitFor(() => expect(view.getByText('Account Login')).toBeTruthy());
    expect(deleteItemAsync).toHaveBeenCalledTimes(1);
    expect(view.queryByText('Hello, sample.personnel')).toBeNull();
    expect(view.queryByText('Signed in successfully.')).toBeNull();
  });

  it('sign-in through RootNavigator replaces Login with authenticated Home', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
    loginMock.mockResolvedValue(session);
    const view = await render(wrapWithAuth(<RootNavigator />));
    await waitFor(() =>
      expect(view.getByText('Account Login')).toBeTruthy(),
    );

    await act(async () =>
      fireEvent.changeText(
        view.getByLabelText('Username'),
        'sample.personnel',
      ),
    );
    await act(async () =>
      fireEvent.changeText(view.getByLabelText('Password'), 'test-pass'),
    );
    await act(async () => {
      await fireEvent.press(view.getByLabelText('Sign in to SURAKSHAI'));
    });

    await waitFor(() =>
      expect(view.getByText('Hello, sample.personnel')).toBeTruthy(),
    );
    expect(view.queryByText('Account Login')).toBeNull();
    expect(jest.mocked(SecureStore.setItemAsync)).toHaveBeenCalledTimes(1);
  });

  it('routes an ADMIN session to the isolated training console', async () => {
    const adminSession: Session = {
      accessToken: 'admin-navigation-token',
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: { username: 'admin.user', role: 'ADMIN' },
    };
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(
      JSON.stringify(adminSession),
    );
    const view = await render(wrapWithAuth(<RootNavigator />));

    await waitFor(() =>
      expect(view.getByText('Model Training Console')).toBeTruthy(),
    );
    expect(view.getByLabelText('Open training chat')).toBeTruthy();
    expect(view.queryByText('Hello, admin.user')).toBeNull();
    expect(view.queryByText('My Welfare')).toBeNull();
  });

  it('routes ADMIN login to the training console and persists the session', async () => {
    const adminSession: Session = {
      accessToken: 'admin-login-test-token',
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: { username: 'admin.user', role: 'ADMIN' },
    };
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
    loginMock.mockResolvedValue(adminSession);
    const view = await render(wrapWithAuth(<RootNavigator />));
    await waitFor(() => expect(view.getByText('Account Login')).toBeTruthy());

    await act(async () => fireEvent.changeText(view.getByLabelText('Username'), 'admin.user'));
    await act(async () => fireEvent.changeText(view.getByLabelText('Password'), 'test-pass'));
    await act(async () => {
      await fireEvent.press(view.getByLabelText('Sign in to SURAKSHAI'));
    });

    await waitFor(() => expect(view.getByText('Model Training Console')).toBeTruthy());
    expect(jest.mocked(SecureStore.setItemAsync)).toHaveBeenCalledTimes(1);
    expect(view.queryByText('My Welfare')).toBeNull();
  });

  it('continues routing PERSONNEL to welfare screens without admin controls', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(
      JSON.stringify(session),
    );
    const view = await render(wrapWithAuth(<RootNavigator />));
    await waitFor(() =>
      expect(view.getByText('Hello, sample.personnel')).toBeTruthy(),
    );
    expect(view.queryByText('Model Training Console')).toBeNull();
    expect(view.queryByLabelText('Open training chat')).toBeNull();
  });

  it('clears unsupported restored roles instead of exposing either navigator', async () => {
    const unsupportedSession: Session = {
      ...session,
      user: { username: 'officer.user', role: 'WELFARE_OFFICER' },
    };
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(
      JSON.stringify(unsupportedSession),
    );
    const view = await render(wrapWithAuth(<RootNavigator />));

    await waitFor(() =>
      expect(view.getByText('Account Login')).toBeTruthy(),
    );
    expect(deleteItemAsync).toHaveBeenCalledTimes(1);
    expect(view.queryByText('Model Training Console')).toBeNull();
    expect(view.queryByText('Hello, officer.user')).toBeNull();
  });
});
