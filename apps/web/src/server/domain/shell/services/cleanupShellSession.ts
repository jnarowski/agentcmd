import type { CleanupShellSessionOptions } from '../types/CleanupShellSessionOptions';

/**
 * Cleanup a shell session by killing the PTY process
 * @throws Error if PTY process cannot be killed
 */
export function cleanupShellSession({
  ptyProcess,
  sessionId
}: CleanupShellSessionOptions): void {
  try {
    ptyProcess.kill();
  } catch (error) {
    // Re-throw with context for route layer to handle
    throw new Error(`Failed to kill PTY process for session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
