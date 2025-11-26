import type { ShellSession } from '../types/index';
import type { GetShellSessionOptions } from '../types/GetShellSessionOptions';
import type { GetUserSessionsOptions } from '../types/GetUserSessionsOptions';

// Module-level sessions Map - shared across all shell service functions
const sessions = new Map<string, ShellSession>();

/**
 * Get an existing shell session
 * @returns Shell session or undefined if not found
 */
export function getShellSession({ sessionId }: GetShellSessionOptions): ShellSession | undefined {
  return sessions.get(sessionId);
}

/**
 * Store a shell session
 * @param sessionId - Session ID
 * @param session - Shell session data
 */
export function setShellSession(sessionId: string, session: ShellSession): void {
  sessions.set(sessionId, session);
}

/**
 * Remove a shell session from the map
 */
export function removeShellSession({ sessionId }: GetShellSessionOptions): void {
  sessions.delete(sessionId);
}

/**
 * Get session count for monitoring
 */
export function getSessionCount(): number {
  return sessions.size;
}

/**
 * Get all active session IDs for a user
 */
export function getUserSessions({ userId }: GetUserSessionsOptions): string[] {
  const userSessions: string[] = [];
  for (const [sessionId, session] of sessions.entries()) {
    if (session.userId === userId) {
      userSessions.push(sessionId);
    }
  }
  return userSessions;
}
