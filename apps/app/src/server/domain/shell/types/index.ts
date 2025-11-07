// Shell domain types
import type * as pty from 'node-pty';

export interface ShellSession {
  ptyProcess: pty.IPty;
  projectId: string;
  userId: string;
  createdAt: Date;
}

// Export options types
export * from './CreateShellSessionOptions'
export * from './DestroyShellSessionOptions'
export * from './GetShellSessionOptions'
export * from './WriteToShellOptions'
export * from './ResizeShellOptions'
export * from './CleanupShellSessionOptions'
export * from './CleanupUserSessionsOptions'
export * from './GetUserSessionsOptions'
