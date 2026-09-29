import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { registerAuthSessionHooks } from '../api/client';
import { clearSession, loadSession, saveSession } from './authStorage';
import type { AuthStatus, Session, SessionView } from './authTypes';
import { loginWithCredentials } from '../services/authService';

type AuthContextValue = {
  authStatus: AuthStatus;
  session: SessionView | null;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('INITIALIZING');
  const [session, setSession] = useState<SessionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<Session | null>(null);

  const updateSession = useCallback((nextSession: Session | null) => {
    sessionRef.current = nextSession;
    setSession(
      nextSession
        ? { expiresAt: nextSession.expiresAt, user: nextSession.user }
        : null,
    );
    setAuthStatus(nextSession ? 'AUTHENTICATED' : 'UNAUTHENTICATED');
  }, []);

  const invalidateSession = useCallback(async (expiredAccessToken: string) => {
    if (sessionRef.current?.accessToken !== expiredAccessToken) {
      return;
    }

    try {
      await clearSession();
      setError('Your session has expired. Please sign in again.');
    } catch {
      setError(
        'Your session has expired, but secure session cleanup failed. Restart the app before signing in again.',
      );
      throw new Error('Secure session cleanup failed.');
    } finally {
      updateSession(null);
    }
  }, [updateSession]);

  useEffect(() => {
    let active = true;
    const unregisterAuthHooks = registerAuthSessionHooks({
      getAccessToken: () => sessionRef.current?.accessToken ?? null,
      onUnauthorized: invalidateSession,
    });

    async function restoreSession() {
      try {
        const storedSession = await loadSession();
        if (!active) {
          return;
        }

        const isExpired =
          storedSession !== null &&
          Date.parse(storedSession.expiresAt) <= Date.now();

        if (
          storedSession &&
          (storedSession.user.role === 'PERSONNEL' ||
            storedSession.user.role === 'ADMIN') &&
          !isExpired
        ) {
          setError(null);
          updateSession(storedSession);
          return;
        }

        if (storedSession) {
          await clearSession();
        }
        if (active) {
          updateSession(null);
        }
      } catch {
        if (active) {
          setError(
            'Unable to restore a secure session. Check device storage and sign in again.',
          );
          updateSession(null);
        }
      }
    }

    void restoreSession();
    return () => {
      active = false;
      unregisterAuthHooks();
    };
  }, [invalidateSession, updateSession]);

  const login = useCallback(
    async (username: string, password: string) => {
      setError(null);
      const nextSession = await loginWithCredentials({ username, password });
      if (
        nextSession.user.role !== 'PERSONNEL' &&
        nextSession.user.role !== 'ADMIN'
      ) {
        throw new Error('This app does not support that account role.');
      }
      await saveSession(nextSession);
      updateSession(nextSession);
    },
    [updateSession],
  );

  const logout = useCallback(async () => {
    await clearSession();
    setError(null);
    updateSession(null);
  }, [updateSession]);

  const value = useMemo(
    () => ({ authStatus, session, error, login, logout }),
    [authStatus, session, error, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}
