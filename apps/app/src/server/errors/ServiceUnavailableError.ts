/**
 * ServiceUnavailableError - 503 Service Unavailable
 *
 * Thrown when a required service or dependency is temporarily unavailable.
 * Common use cases:
 * - External API is down or unreachable
 * - Database connection pool exhausted
 * - Rate limits exceeded
 * - Maintenance mode
 *
 * Clients should retry these requests after a delay.
 */

import { AppError } from './AppError';

export class ServiceUnavailableError extends AppError {
  readonly statusCode = 503;
  readonly code = 'SERVICE_UNAVAILABLE';

  /**
   * Optional retry-after duration in seconds
   */
  public readonly retryAfter?: number;

  /**
   * Create a new service unavailable error
   *
   * @param message - Description of which service is unavailable
   * @param context - Optional context (e.g., service name, reason)
   * @param retryAfter - Optional seconds to wait before retrying
   *
   * @example
   * throw new ServiceUnavailableError(
   *   'Git operations temporarily unavailable',
   *   { service: 'git', reason: 'repository_locked' },
   *   30
   * );
   */
  constructor(
    message = 'Service temporarily unavailable',
    context?: Record<string, unknown>,
    retryAfter?: number
  ) {
    super(message, context);
    this.retryAfter = retryAfter;
  }
}
