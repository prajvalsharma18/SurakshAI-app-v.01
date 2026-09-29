import { create, isAxiosError } from 'axios';

import { endpoints } from './endpoints';

const requestTimeoutMs = 10_000;
const publicEndpoints = new Set<string>([endpoints.health, endpoints.login]);

export const apiClient = create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || undefined,
  timeout: requestTimeoutMs,
  headers: {
    Accept: 'application/json',
  },
});

export type ApiErrorKind =
  | 'configuration'
  | 'http'
  | 'network'
  | 'unauthorized'
  | 'timeout'
  | 'response'
  | 'unknown'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'server';

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type AuthSessionHooks = {
  getAccessToken: () => string | null;
  onUnauthorized: (accessToken: string) => void | Promise<void>;
};

let authSessionHooks: AuthSessionHooks | null = null;

export function registerAuthSessionHooks(
  hooks: AuthSessionHooks,
): () => void {
  authSessionHooks = hooks;
  return () => {
    if (authSessionHooks === hooks) {
      authSessionHooks = null;
    }
  };
}

apiClient.interceptors.request.use((config) => {
  const url = config.url?.split('?')[0].replace(/\/+$/, '') ?? '';
  const isPublic = [...publicEndpoints].some(
    (endpoint) => url === endpoint || url.endsWith(endpoint),
  );

  if (isPublic) {
    config.headers.delete('Authorization');
    return config;
  }

  const accessToken = authSessionHooks?.getAccessToken();
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  } else {
    config.headers.delete('Authorization');
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (isAxiosError(error) && error.response?.status === 401) {
      const authorization = error.config?.headers.get('Authorization');
      const [scheme, accessToken] =
        typeof authorization === 'string' ? authorization.trim().split(/\s+/, 2) : [];

      if (
        scheme?.toLowerCase() === 'bearer' &&
        accessToken &&
        authSessionHooks
      ) {
        await authSessionHooks.onUnauthorized(accessToken);
        throw normalizeApiError(error, { unauthorized: true });
      }
    }

    return Promise.reject(error);
  },
);

export function ensureApiConfigured(): void {
  if (
    typeof apiClient.defaults.baseURL !== 'string' ||
    !apiClient.defaults.baseURL.trim()
  ) {
    throw new ApiError(
      'configuration',
      'Configure EXPO_PUBLIC_API_BASE_URL in the mobile app environment before checking the backend.',
    );
  }
}

export function normalizeApiError(
  error: unknown,
  options: { unauthorized?: boolean } = {},
): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError(
        'timeout',
        'The backend request timed out. Check the connection and try again.',
      );
    }

    if (error.response) {
      if (error.response.status === 401 && options.unauthorized) {
        return new ApiError(
          'unauthorized',
          'Your session has expired. Please sign in again.',
          401,
        );
      }

      const kindByStatus: Record<number, ApiErrorKind> = {
        400: 'validation',
        403: 'forbidden',
        404: 'not_found',
        409: 'conflict',
        422: 'validation',
      };
      const kind =
        kindByStatus[error.response.status] ??
        (error.response.status >= 500 ? 'server' : 'http');
      return new ApiError(
        kind,
        `The backend returned HTTP ${error.response.status}.`,
        error.response.status,
      );
    }

    return new ApiError(
      'network',
      'Unable to reach the backend. Check the API URL and network, then try again.',
    );
  }

  return new ApiError(
    'unknown',
    'An unexpected error occurred while checking the backend.',
  );
}
