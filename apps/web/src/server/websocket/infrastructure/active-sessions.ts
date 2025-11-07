import type { FastifyBaseLogger } from "fastify";
import type { ChildProcess } from "node:child_process";
import { cleanupTempDir } from "./cleanup";

export interface ActiveSessionData {
  projectPath: string;
  userId: string;
  tempImageDir?: string;
  childProcess?: ChildProcess;
  cancelled?: boolean;
}

/**
 * Active sessions manager
 * Wraps Map with methods for session lifecycle management
 */
export class ActiveSessionsManager {
  private sessions = new Map<string, ActiveSessionData>();

  /**
   * Get existing session or create new one
   */
  getOrCreate(
    sessionId: string,
    data: ActiveSessionData
  ): ActiveSessionData {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      return existing;
    }

    this.sessions.set(sessionId, data);
    return data;
  }

  /**
   * Get session by ID
   */
  get(sessionId: string): ActiveSessionData | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Update session data
   */
  update(sessionId: string, data: Partial<ActiveSessionData>): void {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      this.sessions.set(sessionId, { ...existing, ...data });
    }
  }

  /**
   * Set child process reference for a session
   */
  setProcess(sessionId: string, process: ChildProcess): void {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      this.sessions.set(sessionId, { ...existing, childProcess: process });
    }
  }

  /**
   * Get child process reference for a session
   */
  getProcess(sessionId: string): ChildProcess | undefined {
    return this.sessions.get(sessionId)?.childProcess;
  }

  /**
   * Clear child process reference for a session
   */
  clearProcess(sessionId: string): void {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      this.sessions.set(sessionId, { ...existing, childProcess: undefined });
    }
  }

  /**
   * Clean up session and remove from map
   */
  async cleanup(
    sessionId: string,
    logger?: FastifyBaseLogger
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Clear process reference before cleanup
      this.clearProcess(sessionId);
      await cleanupTempDir(session.tempImageDir, logger);
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Clean up all sessions for a user
   */
  async cleanupByUser(
    userId: string,
    logger?: FastifyBaseLogger
  ): Promise<void> {
    const sessionsToCleanup: string[] = [];

    for (const [sessionId, sessionData] of this.sessions.entries()) {
      if (sessionData.userId === userId) {
        sessionsToCleanup.push(sessionId);
      }
    }

    for (const sessionId of sessionsToCleanup) {
      await this.cleanup(sessionId, logger);
    }
  }

  /**
   * Get all session entries (for debugging/monitoring)
   */
  entries(): IterableIterator<[string, ActiveSessionData]> {
    return this.sessions.entries();
  }

  /**
   * Get number of active sessions
   */
  get size(): number {
    return this.sessions.size;
  }
}

export const activeSessions = new ActiveSessionsManager();
