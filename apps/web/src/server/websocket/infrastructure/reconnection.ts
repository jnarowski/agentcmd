/**
 * Reconnection manager
 * Provides 30-second grace period before cleaning up disconnected sessions
 */
export class ReconnectionManager {
  private timers = new Map<string, NodeJS.Timeout>();

  /**
   * Schedule cleanup after 30 seconds
   * Cancels any existing timer for this session
   */
  scheduleCleanup(
    sessionId: string,
    callback: () => Promise<void>
  ): void {
    this.cancelCleanup(sessionId);

    const timer = setTimeout(async () => {
      this.timers.delete(sessionId);
      await callback();
    }, 30000); // 30 seconds

    this.timers.set(sessionId, timer);
  }

  /**
   * Cancel scheduled cleanup (e.g., when user reconnects)
   */
  cancelCleanup(sessionId: string): void {
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(sessionId);
    }
  }

  /**
   * Cancel all scheduled cleanups (for graceful shutdown)
   */
  cancelAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}

export const reconnectionManager = new ReconnectionManager();
