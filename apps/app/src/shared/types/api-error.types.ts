/**
 * Unified API Error Types
 *
 * Shared between frontend and backend to ensure consistent error handling.
 * Backend generates these types, frontend consumes them.
 */

/**
 * Standard API error response format
 *
 * @example
 * {
 *   error: {
 *     message: "Project not found",
 *     statusCode: 404,
 *     code: "NOT_FOUND"
 *   }
 * }
 */
export interface ApiErrorResponse {
  error: {
    /** Human-readable error message */
    message: string;
    /** HTTP status code */
    statusCode: number;
    /** Optional machine-readable error code for client-side handling */
    code?: string;
    /** Optional additional error details (e.g., validation errors) */
    details?: unknown;
  };
}

/**
 * Custom Error class for API errors
 *
 * Extends Error with statusCode, code, and details properties
 * for consistent error handling across the application.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    // captureStackTrace is only available in Node.js, not in browsers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ('captureStackTrace' in Error && typeof (Error as any).captureStackTrace === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Error as any).captureStackTrace(this, ApiError);
    }
  }
}
