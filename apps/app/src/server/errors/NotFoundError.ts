import { AppError } from './AppError';

/**
 * 404 Not Found Error
 *
 * Thrown when a requested resource cannot be found.
 *
 * @example
 * throw new NotFoundError('Project not found');
 * throw new NotFoundError('User not found', { userId: '123' });
 */
export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = 'NOT_FOUND';

  constructor(message = 'Resource not found', context?: Record<string, unknown>) {
    super(message, context);
  }
}
