/**
 * BadRequestError - 400 Bad Request
 *
 * Thrown when the client sends a malformed or invalid request.
 * Common use cases:
 * - Invalid input format
 * - Missing required fields
 * - Invalid parameter values
 * - Business logic validation failures
 *
 * Note: For Zod schema validation errors, Fastify handles those automatically.
 * Use BadRequestError for business logic validation that occurs after schema validation.
 */

import { AppError } from './AppError';

export class BadRequestError extends AppError {
  readonly statusCode = 400;
  readonly code = 'BAD_REQUEST';

  /**
   * Create a new bad request error
   *
   * @param message - Description of what's wrong with the request
   * @param context - Optional context (e.g., invalid field names, expected values)
   *
   * @example
   * throw new BadRequestError('Project path must be an absolute path', {
   *   field: 'path',
   *   provided: 'relative/path'
   * });
   */
  constructor(message = 'Invalid request', context?: Record<string, unknown>) {
    super(message, context);
  }
}
