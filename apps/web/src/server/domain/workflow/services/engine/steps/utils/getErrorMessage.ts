/**
 * Extract error message from unknown error type
 *
 * @param error - Error of unknown type
 * @returns Error message string
 *
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error) {
 *   const message = getErrorMessage(error);
 *   logger.error({ message }, 'Operation failed');
 * }
 * ```
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return String(error);
}
