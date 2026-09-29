import * as SecureStore from 'expo-secure-store';

import type { Session } from './authTypes';
import { clearSession, loadSession, saveSession } from './authStorage';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const storedSession: Session = {
  accessToken: 'secret-token',
  tokenType: 'Bearer',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  user: {
    username: 'personnel.user',
    role: 'PERSONNEL',
    personnelId: 'P-123',
  },
};

describe('authStorage', () => {
  const getItemAsync = jest.mocked(SecureStore.getItemAsync);
  const setItemAsync = jest.mocked(SecureStore.setItemAsync);
  const deleteItemAsync = jest.mocked(SecureStore.deleteItemAsync);

  beforeEach(() => {
    getItemAsync.mockReset();
    setItemAsync.mockReset();
    deleteItemAsync.mockReset();
  });

  it('saves only the session payload, never credentials', async () => {
    setItemAsync.mockResolvedValue();

    await saveSession(storedSession);

    expect(setItemAsync).toHaveBeenCalledTimes(1);
    const savedValue = setItemAsync.mock.calls[0][1];
    expect(JSON.parse(savedValue)).toEqual(storedSession);
    expect(savedValue).not.toContain('password');
  });

  it('loads a valid session', async () => {
    getItemAsync.mockResolvedValue(JSON.stringify(storedSession));

    await expect(loadSession()).resolves.toEqual(storedSession);
  });

  it('clears malformed stored session data', async () => {
    getItemAsync.mockResolvedValue('{invalid json');
    deleteItemAsync.mockResolvedValue();

    await expect(loadSession()).resolves.toBeNull();
    expect(deleteItemAsync).toHaveBeenCalledTimes(1);
  });

  it('clears stored session data on logout', async () => {
    deleteItemAsync.mockResolvedValue();

    await clearSession();

    expect(deleteItemAsync).toHaveBeenCalledTimes(1);
  });
});
