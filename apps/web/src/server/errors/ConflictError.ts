/**
 * ConflictError - 409 Conflict
 *
 * Thrown when a request conflicts with the current state of the server.
 * Common use cases:
 * - Duplicate resource creation (e.g., project with same path already exists)
 * - Concurrent modifications
 * - State conflicts (e.g., trying to delete a resource that's in use)
 */

import { AppError } from './AppError';

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = 'CONFLICT';

  /**
   * Create a new conflict error
   *
   * @param message - Description of the conflict
   * @param context - Optional context (e.g., conflicting field, resource id)
   *
   * @example
   * throw new ConflictError('Project with this path already exists', {
   *   field: 'path',
   *   value: '/path/to/project'
   * });
   */
  constructor(message = 'Resource conflict', context?: Record<string, unknown>) {
    super(message, context);
  }
}
