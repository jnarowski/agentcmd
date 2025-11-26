import type { DestroyShellSessionOptions } from '../types/DestroyShellSessionOptions';
import { getShellSession, removeShellSession } from './getShellSession';
import { cleanupShellSession } from './cleanupShellSession';

/**
 * Destroy a shell session
 * @throws Error if cleanup fails
 */
export function destroyShellSession({ sessionId }: DestroyShellSessionOptions): void {
  const session = getShellSession({ sessionId });
  if (session) {
    cleanupShellSession({ ptyProcess: session.ptyProcess, sessionId });
    removeShellSession({ sessionId });
  }
}
