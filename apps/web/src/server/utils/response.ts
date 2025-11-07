/**
 * Response Utilities
 *
 * Standard response builders for consistent API responses.
 */

/**
 * Success Response Structure
 */
export interface SuccessResponse<T> {
  data: T;
}

/**
 * Build a standardized success response
 *
 * @param data - The response data
 * @returns Standardized success response object
 *
 * @example
 * buildSuccessResponse({ id: '123', name: 'Project' })
 * // => { data: { id: '123', name: 'Project' } }
 */
export function buildSuccessResponse<T>(data: T): SuccessResponse<T> {
  return { data };
}
