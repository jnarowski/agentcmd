import { AppError } from './AppError';

/**
 * 400 Validation Error
 *
 * Thrown when request validation fails.
 * Note: For new code, consider using BadRequestError instead.
 *
 * @example
 * throw new ValidationError('Invalid email format');
 * throw new ValidationError('Missing required field', { field: 'username' });
 */
export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = 'VALIDATION_ERROR';

  constructor(message = 'Validation failed', context?: Record<string, unknown>) {
    super(message, context);
  }
}
