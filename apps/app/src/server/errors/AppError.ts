/**
 * AppError Base Class
 *
 * Abstract base class for all application-specific errors.
 * Provides consistent error structure with status codes and optional context.
 */

/**
 * Base class for application errors
 *
 * All custom error classes should extend this base class to ensure
 * consistent error handling and response formatting throughout the application.
 *
 * @abstract
 */
export abstract class AppError extends Error {
  /**
   * HTTP status code for this error type
   */
  abstract readonly statusCode: number;

  /**
   * Machine-readable error code for client-side handling
   */
  abstract readonly code: string;

  /**
   * Additional context about the error (e.g., field names, ids)
   * This data is included in error responses but should not contain sensitive information
   */
  public readonly context?: Record<string, unknown>;

  /**
   * Create a new application error
   *
   * @param message - Human-readable error message
   * @param context - Optional context object with additional error details
   */
  constructor(message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;

    // Maintains proper stack trace for where error was thrown (V8 engines only)
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON representation for API responses
   *
   * @returns Object suitable for JSON serialization
   */
  toJSON() {
    return {
      error: {
        message: this.message,
        statusCode: this.statusCode,
        code: this.code,
        ...(this.context && { context: this.context }),
      },
    };
  }
}
