import { ApiError } from '../api/client';

export function apiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
  overrides: Partial<Record<ApiError['kind'], string>> = {},
): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  const message = overrides[error.kind];
  if (message) {
    return message;
  }

  switch (error.kind) {
    case 'unauthorized':
      return 'Your session has expired. Please sign in again.';
    case 'forbidden':
      return "You don't have permission to access this information.";
    case 'not_found':
      return 'The requested information could not be found.';
    case 'validation':
      return 'Please review the information and try again.';
    case 'conflict':
      return 'This change could not be applied. Refresh and try again.';
    case 'server':
      return 'The SURAKSHAI service is temporarily unavailable.';
    case 'network':
      return 'Unable to connect to the SURAKSHAI backend.';
    case 'timeout':
      return 'The request took too long. Please try again.';
    case 'configuration':
      return 'The SURAKSHAI backend is not configured.';
    case 'response':
    case 'unknown':
    case 'http':
      return fallback;
  }
}
