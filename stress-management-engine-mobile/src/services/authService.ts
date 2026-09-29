import {
  apiClient,
  ensureApiConfigured,
  normalizeApiError,
} from '../api/client';
import { endpoints } from '../api/endpoints';
import type { LoginRequest, LoginResponse } from '../api/types';
import type { Session, UserRole } from '../auth/authTypes';

export type AuthServiceErrorKind =
  | 'configuration'
  | 'credentials'
  | 'role'
  | 'network'
  | 'unavailable'
  | 'response'
  | 'unknown';

export class AuthServiceError extends Error {
  constructor(
    public readonly kind: AuthServiceErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'AuthServiceError';
  }
}

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

export function parseLoginResponse(data: unknown): LoginResponse {
  if (!isRecord(data) || !isRecord(data.user)) {
    throw new AuthServiceError(
      'response',
      'The backend returned an invalid sign-in response.',
    );
  }

  const user = data.user;
  const accessToken = data.access_token;
  const tokenType = data.token_type;
  const expiresIn = data.expires_in;
  const expiresAt = data.expires_at;
  const userId = user.user_id;
  const username = user.username;
  const role = user.role;
  const expiresAtTime =
    typeof expiresAt === 'string' ? Date.parse(expiresAt) : NaN;
  const validPersonnelId =
    user.personnel_id === undefined ||
    (typeof user.personnel_id === 'string' && user.personnel_id.length > 0);

  if (
    typeof accessToken !== 'string' ||
    accessToken.length === 0 ||
    tokenType !== 'Bearer' ||
    typeof expiresIn !== 'number' ||
    !Number.isFinite(expiresIn) ||
    expiresIn <= 0 ||
    typeof expiresAt !== 'string' ||
    !Number.isFinite(expiresAtTime) ||
    expiresAtTime <= Date.now() ||
    typeof userId !== 'string' ||
    userId.length === 0 ||
    typeof username !== 'string' ||
    username.length === 0 ||
    !isUserRole(role) ||
    !validPersonnelId
  ) {
    throw new AuthServiceError(
      'response',
      'The backend returned an invalid sign-in response.',
    );
  }

  return {
    access_token: accessToken,
    token_type: tokenType,
    expires_in: expiresIn,
    expires_at: expiresAt,
    user: {
      user_id: userId,
      username,
      role,
      ...(typeof user.personnel_id === 'string'
        ? { personnel_id: user.personnel_id }
        : {}),
    },
  };
}

export function toSession(response: LoginResponse): Session {
  const user = response.user;
  return {
    accessToken: response.access_token,
    tokenType: response.token_type,
    expiresAt: response.expires_at,
    user: {
      username: user.username,
      role: user.role,
      ...(user.personnel_id ? { personnelId: user.personnel_id } : {}),
    },
  };
}

function mapLoginError(error: unknown): AuthServiceError {
  if (error instanceof AuthServiceError) {
    return error;
  }

  const apiError = normalizeApiError(error);
  if (apiError.kind === 'configuration') {
    return new AuthServiceError(
      'configuration',
      'Configure the backend URL before signing in.',
    );
  }
  if (apiError.statusCode === 401) {
    return new AuthServiceError(
      'credentials',
      'Unable to sign in with those credentials.',
    );
  }
  if (apiError.kind === 'network' || apiError.kind === 'timeout') {
    return new AuthServiceError(
      'network',
      'Unable to connect to the SURAKSHAI backend.',
    );
  }
  if (apiError.statusCode === 503) {
    return new AuthServiceError(
      'unavailable',
      'The sign-in service is unavailable. Please try again.',
    );
  }
  return new AuthServiceError(
    'unknown',
    'Unable to sign in right now. Please try again.',
  );
}

export async function loginWithCredentials(
  credentials: LoginRequest,
): Promise<Session> {
  try {
    ensureApiConfigured();
    const response = await apiClient.post<unknown>(
      endpoints.login,
      credentials,
    );
    const parsed = parseLoginResponse(response.data);
    if (parsed.user.role !== 'PERSONNEL' && parsed.user.role !== 'ADMIN') {
      throw new AuthServiceError(
        'role',
        'This app is available to personnel and administrator accounts only.',
      );
    }
    return toSession(parsed);
  } catch (error: unknown) {
    throw mapLoginError(error);
  }
}
