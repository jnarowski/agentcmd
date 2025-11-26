/**
 * Get step logs from filesystem
 * Returns logs content and path, or null if not found
 *
 * NOTE: Logs are no longer stored in log_directory_path
 * This function now returns null - logs should be retrieved from step.output.trace
 */
export async function getStepLogs(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _runId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _stepId: string
): Promise<{ logs: string; path: string } | null> {
  return null;
}
