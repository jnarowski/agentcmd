import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { ActiveSessionsManager } from "./active-sessions";
import { ReconnectionManager } from "./reconnection";
import fs from "fs/promises";

describe("State Management", () => {
  describe("ActiveSessionsManager", () => {
    let manager: ActiveSessionsManager;
    let tempDir: string;

    beforeEach(async () => {
      manager = new ActiveSessionsManager();
      tempDir = `/tmp/session-test-${Date.now()}`;
      await fs.mkdir(tempDir, { recursive: true });
    });

    afterEach(async () => {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    test("creates new session on first getOrCreate", () => {
      const sessionData = {
        userId: "user-123",
        projectPath: "/path/to/project",
      };

      const result = manager.getOrCreate("session-1", sessionData);

      expect(result).toEqual(sessionData);
      expect(manager.get("session-1")).toEqual(sessionData);
    });

    test("returns existing session on second getOrCreate", () => {
      const sessionData = {
        userId: "user-123",
        projectPath: "/path/to/project",
      };

      const first = manager.getOrCreate("session-1", sessionData);
      const second = manager.getOrCreate("session-1", {
        userId: "different-user",
        projectPath: "/different/path",
      });

      // Should return original session, not new data
      expect(second).toEqual(first);
      expect(second.userId).toBe("user-123");
    });

    test("retrieves session data", () => {
      manager.getOrCreate("session-1", {
        userId: "user-123",
        projectPath: "/path",
      });

      const session = manager.get("session-1");
      expect(session).toBeDefined();
      expect(session?.userId).toBe("user-123");
    });

    test("returns undefined for non-existent session", () => {
      expect(manager.get("non-existent")).toBeUndefined();
    });

    test("updates session data", () => {
      manager.getOrCreate("session-1", {
        userId: "user-123",
        projectPath: "/path",
      });

      manager.update("session-1", {
        tempImageDir: tempDir,
      });

      const updated = manager.get("session-1");
      expect(updated?.tempImageDir).toBe(tempDir);
      expect(updated?.userId).toBe("user-123"); // Original data preserved
    });

    test("update does nothing for non-existent session", () => {
      manager.update("non-existent", { tempImageDir: tempDir });
      expect(manager.get("non-existent")).toBeUndefined();
    });

    test("cleanup removes session and temp directory", async () => {
      await fs.writeFile(`${tempDir}/test.txt`, "content");

      manager.getOrCreate("session-1", {
        userId: "user-123",
        projectPath: "/path",
        tempImageDir: tempDir,
      });

      await manager.cleanup("session-1");

      // Session removed from map
      expect(manager.get("session-1")).toBeUndefined();

      // Temp directory removed
      await expect(fs.stat(tempDir)).rejects.toThrow();
    });

    test("cleanupByUser removes all user sessions", async () => {
      const tempDir1 = `/tmp/session-test-${Date.now()}-1`;
      const tempDir2 = `/tmp/session-test-${Date.now()}-2`;
      await fs.mkdir(tempDir1, { recursive: true });
      await fs.mkdir(tempDir2, { recursive: true });

      manager.getOrCreate("session-1", {
        userId: "user-123",
        projectPath: "/path1",
        tempImageDir: tempDir1,
      });

      manager.getOrCreate("session-2", {
        userId: "user-123",
        projectPath: "/path2",
        tempImageDir: tempDir2,
      });

      manager.getOrCreate("session-3", {
        userId: "user-456",
        projectPath: "/path3",
      });

      await manager.cleanupByUser("user-123");

      // User 123's sessions removed
      expect(manager.get("session-1")).toBeUndefined();
      expect(manager.get("session-2")).toBeUndefined();

      // User 456's session remains
      expect(manager.get("session-3")).toBeDefined();

      // Temp directories removed
      await expect(fs.stat(tempDir1)).rejects.toThrow();
      await expect(fs.stat(tempDir2)).rejects.toThrow();
    });
  });

  describe("ReconnectionManager", () => {
    let manager: ReconnectionManager;

    beforeEach(() => {
      manager = new ReconnectionManager();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    test("schedules cleanup after 30 seconds", async () => {
      const callback = vi.fn();

      manager.scheduleCleanup("session-1", callback);

      // Callback not called immediately
      expect(callback).not.toHaveBeenCalled();

      // Advance time by 30 seconds
      await vi.advanceTimersByTimeAsync(30000);

      // Callback called
      expect(callback).toHaveBeenCalledOnce();
    });

    test("cancels cleanup when user reconnects", async () => {
      const callback = vi.fn();

      manager.scheduleCleanup("session-1", callback);

      // User reconnects before 30s
      await vi.advanceTimersByTimeAsync(15000);
      manager.cancelCleanup("session-1");

      // Advance past 30s
      await vi.advanceTimersByTimeAsync(20000);

      // Callback should not be called
      expect(callback).not.toHaveBeenCalled();
    });

    test("replaces existing timer on second schedule", async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.scheduleCleanup("session-1", callback1);
      await vi.advanceTimersByTimeAsync(15000);

      // Schedule new cleanup (should cancel first)
      manager.scheduleCleanup("session-1", callback2);
      await vi.advanceTimersByTimeAsync(30000);

      // Only second callback should be called
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledOnce();
    });

    test("handles multiple sessions independently", async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.scheduleCleanup("session-1", callback1);
      await vi.advanceTimersByTimeAsync(10000);
      manager.scheduleCleanup("session-2", callback2);

      // Advance to 30s (session-1 should fire)
      await vi.advanceTimersByTimeAsync(20000);
      expect(callback1).toHaveBeenCalledOnce();
      expect(callback2).not.toHaveBeenCalled();

      // Advance another 10s (session-2 should fire)
      await vi.advanceTimersByTimeAsync(10000);
      expect(callback2).toHaveBeenCalledOnce();
    });

    test("cancelAll cancels all pending cleanups", async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.scheduleCleanup("session-1", callback1);
      manager.scheduleCleanup("session-2", callback2);

      manager.cancelAll();

      await vi.advanceTimersByTimeAsync(30000);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    test("cancelCleanup handles non-existent session gracefully", () => {
      expect(() => manager.cancelCleanup("non-existent")).not.toThrow();
    });
  });
});
