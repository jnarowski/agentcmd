/**
 * InternalServerError - 500 Internal Server Error
 *
 * Thrown when an unexpected error occurs that's not the client's fault.
 * Common use cases:
 * - Unhandled exceptions in business logic
 * - External service failures (database, API calls)
 * - System resource issues
 * - Unexpected application state
 *
 * These errors should be logged with full stack traces and investigated.
 */

import { AppError } from './AppError';

export class InternalServerError extends AppError {
  readonly statusCode = 500;
  readonly code = 'INTERNAL_SERVER_ERROR';

  /**
   * Original error that caused this internal server error (if available)
   */
  public readonly originalError?: Error;

  /**
   * Create a new internal server error
   *
   * @param message - User-friendly error message (avoid exposing internal details)
   * @param context - Optional context (avoid sensitive data)
   * @param originalError - Original error for logging/debugging
   *
   * @example
   * try {
   *   await database.query();
   * } catch (error) {
   *   throw new InternalServerError(
   *     'Failed to fetch data',
   *     { operation: 'database_query' },
   *     error instanceof Error ? error : undefined
   *   );
   * }
   */
  constructor(
    message = 'Internal server error',
    context?: Record<string, unknown>,
    originalError?: Error
  ) {
    super(message, context);
    this.originalError = originalError;
  }
}
