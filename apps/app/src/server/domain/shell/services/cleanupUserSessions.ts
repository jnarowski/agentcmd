import type { CleanupUserSessionOptions } from '../types/CleanupUserSessionsOptions';
import { getUserSessions } from './getShellSession';
import { destroyShellSession } from './destroyShellSession';

/**
 * Cleanup all sessions for a specific user
 * @throws Error if any session cleanup fails
 */
export function cleanupUserSessions({ userId }: CleanupUserSessionOptions): void {
  const sessionIds = getUserSessions({ userId });
  for (const sessionId of sessionIds) {
    destroyShellSession({ sessionId });
  }
}
