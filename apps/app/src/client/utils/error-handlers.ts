import { toast } from 'sonner';

/**
 * Extract a user-friendly error message from an unknown error
 */
export function extractErrorMessage(
  error: unknown,
  fallback: string = 'An unexpected error occurred'
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  // Handle API error responses with data.error or data.message
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;

    // Check for nested error messages (common in API responses)
    if (err.data && typeof err.data === 'object') {
      const data = err.data as Record<string, unknown>;
      if (typeof data.error === 'string') {
        return data.error;
      }
      if (typeof data.message === 'string') {
        return data.message;
      }
    }

    // Check for direct error/message properties
    if (typeof err.error === 'string') {
      return err.error;
    }
    if (typeof err.message === 'string') {
      return err.message;
    }
  }

  return fallback;
}

/**
 * Handle mutation errors by extracting the message and showing a toast
 */
export function handleMutationError(
  error: unknown,
  fallbackMessage: string = 'Operation failed'
): void {
  const message = extractErrorMessage(error, fallbackMessage);
  toast.error(message);
}
