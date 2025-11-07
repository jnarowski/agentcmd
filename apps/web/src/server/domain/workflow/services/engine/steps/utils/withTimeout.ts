/**
 * Execute a promise with timeout
 *
 * @param operation - Promise to execute with timeout
 * @param timeoutMs - Timeout in milliseconds
 * @param stepType - Type of step for error message (e.g., 'Agent execution', 'CLI command')
 * @returns Result of the operation
 * @throws Error if operation exceeds timeout
 *
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   executeAgent({ ... }),
 *   30 * 60 * 1000,
 *   'Agent execution'
 * );
 * ```
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  stepType: string
): Promise<T> {
  return await Promise.race([
    operation,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${stepType} timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}
