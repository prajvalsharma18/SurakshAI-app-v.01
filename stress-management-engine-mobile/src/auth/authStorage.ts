import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import type { Session, UserRole } from './authTypes';

const SESSION_KEY = 'surakshai.auth.session';
let webSession: string | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUserRole(value: unknown): value is UserRole {
  return (
    value === 'PERSONNEL' ||
    value === 'WELFARE_OFFICER' ||
    value === 'COMMANDER' ||
    value === 'ADMIN'
  );
}

export function isSession(value: unknown): value is Session {
  if (!isRecord(value) || !isRecord(value.user)) {
    return false;
  }

  const { user } = value;
  return (
    typeof value.accessToken === 'string' &&
    value.accessToken.length > 0 &&
    value.tokenType === 'Bearer' &&
    typeof value.expiresAt === 'string' &&
    Number.isFinite(Date.parse(value.expiresAt)) &&
    typeof user.username === 'string' &&
    user.username.length > 0 &&
    isUserRole(user.role) &&
    (user.personnelId === undefined ||
      (typeof user.personnelId === 'string' && user.personnelId.length > 0))
  );
}

function readStoredValue(): Promise<string | null> {
  return Platform.OS === 'web'
    ? Promise.resolve(webSession)
    : SecureStore.getItemAsync(SESSION_KEY);
}

function writeStoredValue(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    webSession = value;
    return Promise.resolve();
  }
  return SecureStore.setItemAsync(SESSION_KEY, value);
}

function removeStoredValue(): Promise<void> {
  if (Platform.OS === 'web') {
    webSession = null;
    return Promise.resolve();
  }
  return SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function saveSession(session: Session): Promise<void> {
  if (!isSession(session)) {
    throw new Error('Cannot store an invalid authentication session.');
  }
  await writeStoredValue(JSON.stringify(session));
}

export async function loadSession(): Promise<Session | null> {
  const storedValue = await readStoredValue();
  if (storedValue === null) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(storedValue);
  } catch {
    await removeStoredValue();
    return null;
  }

  if (!isSession(parsed)) {
    await removeStoredValue();
    return null;
  }

  return parsed;
}

export async function clearSession(): Promise<void> {
  await removeStoredValue();
}
