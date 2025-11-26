import { AppError } from './AppError';

/**
 * 403 Forbidden Error
 *
 * Thrown when the user is authenticated but lacks permission to access a resource.
 *
 * @example
 * throw new ForbiddenError('Access denied');
 * throw new ForbiddenError('Insufficient permissions', { requiredRole: 'admin' });
 */
export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly code = 'FORBIDDEN';

  constructor(message = 'Forbidden', context?: Record<string, unknown>) {
    super(message, context);
  }
}
