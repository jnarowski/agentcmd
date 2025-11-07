/**
 * Error Classes
 *
 * Centralized error classes for consistent error handling throughout the application.
 * All errors extend AppError and include statusCode, code, and optional context.
 */

import type { ApiErrorResponse } from '@/shared/types/api-error.types';

// Core error classes
export { AppError } from './AppError';
export { BadRequestError } from './BadRequestError';
export { UnauthorizedError } from './UnauthorizedError';
export { ForbiddenError } from './ForbiddenError';
export { NotFoundError } from './NotFoundError';
export { ConflictError } from './ConflictError';
export { InternalServerError } from './InternalServerError';
export { ServiceUnavailableError } from './ServiceUnavailableError';

// Alias for backward compatibility
export { BadRequestError as ValidationError } from './BadRequestError';

/**
 * Error Response Structure
 *
 * Uses shared ApiErrorResponse type for consistency between frontend and backend
 */
export type ErrorResponse = ApiErrorResponse;

/**
 * Build a standardized error response
 *
 * @param statusCode - HTTP status code
 * @param message - Error message
 * @param code - Optional error code for client-side handling
 * @returns Standardized error response object
 */
export function buildErrorResponse(
  statusCode: number,
  message: string,
  code?: string,
): ErrorResponse {
  return {
    error: {
      message,
      statusCode,
      ...(code && { code }),
    },
  };
}
