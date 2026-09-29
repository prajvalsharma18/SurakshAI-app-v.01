import { AxiosError, AxiosHeaders } from 'axios';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { Button, Text } from 'react-native';

import { apiClient } from '../api/client';
import { AuthProvider, useAuth } from './AuthContext';
import type { Session } from './authTypes';
import { loginWithCredentials } from '../services/authService';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('../services/authService', () => ({
  loginWithCredentials: jest.fn(),
}));

const personnelSession: Session = {
  accessToken: 'personnel-token',
  tokenType: 'Bearer',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  user: {
    username: 'personnel.user',
    role: 'PERSONNEL',
    personnelId: 'P-123',
  },
};

function AuthHarness() {
  const auth = useAuth();
  return (
    <>
      <Text testID="auth-status">{auth.authStatus}</Text>
      <Text testID="auth-username">{auth.session?.user.username ?? ''}</Text>
      <Text testID="session-keys">
        {auth.session ? Object.keys(auth.session).join(',') : ''}
      </Text>
      <Text testID="auth-error">{auth.error ?? ''}</Text>
      <Button
        title="Login"
        onPress={() =>
          void auth.login('personnel.user', 'password').catch(() => undefined)
        }
      />
      <Button title="Logout" onPress={() => void auth.logout()} />
    </>
  );
}

async function renderProvider() {
  return render(
    <AuthProvider>
      <AuthHarness />
    </AuthProvider>,
  );
}

describe('AuthContext', () => {
  const getItemAsync = jest.mocked(SecureStore.getItemAsync);
  const setItemAsync = jest.mocked(SecureStore.setItemAsync);
  const deleteItemAsync = jest.mocked(SecureStore.deleteItemAsync);
  const loginMock = jest.mocked(loginWithCredentials);
  const originalAdapter = apiClient.defaults.adapter;
  const originalBaseUrl = apiClient.defaults.baseURL;

  beforeEach(() => {
    getItemAsync.mockReset();
    setItemAsync.mockReset();
    deleteItemAsync.mockReset();
    loginMock.mockReset();
    getItemAsync.mockResolvedValue(null);
    setItemAsync.mockResolvedValue();
    deleteItemAsync.mockResolvedValue();
    apiClient.defaults.baseURL = 'https://surakshai.test';
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    apiClient.defaults.baseURL = originalBaseUrl;
  });

  it('restores a valid personnel session during startup', async () => {
    getItemAsync.mockResolvedValue(JSON.stringify(personnelSession));
    const view = await renderProvider();

    await waitFor(() => {
      expect(view.getByTestId('auth-status').props.children).toBe(
        'AUTHENTICATED',
      );
    });
    expect(view.getByTestId('auth-username').props.children).toBe(
      'personnel.user',
    );
    expect(view.getByTestId('session-keys').props.children).not.toContain(
      'accessToken',
    );
  });

  it('clears expired stored sessions and remains unauthenticated', async () => {
    getItemAsync.mockResolvedValue(
      JSON.stringify({
        ...personnelSession,
        expiresAt: new Date(Date.now() - 1_000).toISOString(),
      }),
    );
    const view = await renderProvider();

    await waitFor(() => {
      expect(view.getByTestId('auth-status').props.children).toBe(
        'UNAUTHENTICATED',
      );
    });
    expect(deleteItemAsync).toHaveBeenCalledTimes(1);
  });

  it('persists a successful personnel login before authenticating', async () => {
    loginMock.mockResolvedValue(personnelSession);
    const view = await renderProvider();
    await waitFor(() =>
      expect(view.getByTestId('auth-status').props.children).toBe(
        'UNAUTHENTICATED',
      ),
    );

    await act(async () => {
      await fireEvent.press(view.getByText('Login'));
    });

    expect(setItemAsync).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(view.getByTestId('auth-status').props.children).toBe(
        'AUTHENTICATED',
      ),
    );
  });

  it('persists an administrator session for the dedicated admin navigator', async () => {
    loginMock.mockResolvedValue({
      ...personnelSession,
      user: { ...personnelSession.user, role: 'ADMIN' },
    });
    const view = await renderProvider();
    await waitFor(() =>
      expect(view.getByTestId('auth-status').props.children).toBe(
        'UNAUTHENTICATED',
      ),
    );

    await act(async () => {
      await fireEvent.press(view.getByText('Login'));
    });

    expect(setItemAsync).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('auth-status').props.children).toBe('AUTHENTICATED');
    expect(view.getByTestId('auth-username').props.children).toBe('personnel.user');
  });

  it('does not persist an unsupported role even if the service returns one', async () => {
    loginMock.mockResolvedValue({
      ...personnelSession,
      user: { ...personnelSession.user, role: 'WELFARE_OFFICER' },
    });
    const view = await renderProvider();
    await waitFor(() =>
      expect(view.getByTestId('auth-status').props.children).toBe(
        'UNAUTHENTICATED',
      ),
    );

    await act(async () => {
      await fireEvent.press(view.getByText('Login'));
    });

    expect(setItemAsync).not.toHaveBeenCalled();
    expect(view.getByTestId('auth-status').props.children).toBe('UNAUTHENTICATED');
  });

  it('clears persisted session before ending authentication on logout', async () => {
    getItemAsync.mockResolvedValue(JSON.stringify(personnelSession));
    const view = await renderProvider();
    await waitFor(() =>
      expect(view.getByTestId('auth-status').props.children).toBe(
        'AUTHENTICATED',
      ),
    );

    await act(async () => {
      await fireEvent.press(view.getByText('Logout'));
    });

    expect(deleteItemAsync).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('auth-status').props.children).toBe(
      'UNAUTHENTICATED',
    );
    expect(view.getByTestId('auth-username').props.children).toBe('');
  });

  it('clears secure storage and invalidates auth when a protected API returns 401', async () => {
    getItemAsync.mockResolvedValue(JSON.stringify(personnelSession));
    const view = await renderProvider();
    await waitFor(() =>
      expect(view.getByTestId('auth-status').props.children).toBe(
        'AUTHENTICATED',
      ),
    );

    apiClient.defaults.adapter = async (config) => {
      const headers = new AxiosHeaders();
      return Promise.reject(
        new AxiosError('unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
          data: { error: 'Unauthorized' },
          status: 401,
          statusText: 'Unauthorized',
          headers,
          config,
        }),
      );
    };

    await act(async () => {
      await expect(apiClient.get('/private/resource')).rejects.toMatchObject({
        kind: 'unauthorized',
      });
    });

    await waitFor(() =>
      expect(view.getByTestId('auth-status').props.children).toBe(
        'UNAUTHENTICATED',
      ),
    );
    expect(deleteItemAsync).toHaveBeenCalledTimes(1);
  });
});
