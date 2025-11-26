import { AppError } from './AppError';

/**
 * 401 Unauthorized Error
 *
 * Thrown when authentication is required but not provided or invalid.
 *
 * @example
 * throw new UnauthorizedError('Invalid credentials');
 * throw new UnauthorizedError('Token expired', { tokenId: '123' });
 */
export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly code = 'UNAUTHORIZED';

  constructor(message = 'Unauthorized', context?: Record<string, unknown>) {
    super(message, context);
  }
}
