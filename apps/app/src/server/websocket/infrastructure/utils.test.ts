import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { sendMessage } from "./send-message";
import { extractId } from "./extract-id";
import { cleanupTempDir } from "./cleanup";
import { WebSocketMetrics } from "./metrics";
import fs from "fs/promises";
import { EventEmitter } from "events";
import type { WebSocket } from "@fastify/websocket";

// Mock WebSocket implementation that matches the interface
interface MockWebSocketInstance extends WebSocket {
  lastMessage: string | null;
  sentMessages: string[];
}

class MockWebSocket extends EventEmitter {
  lastMessage: string | null = null;
  sentMessages: string[] = [];
  readyState = 1; // OPEN

  send(message: string): void {
    this.lastMessage = message;
    this.sentMessages.push(message);
  }
}

// Helper to create a mock socket with proper typing
function createMockSocket(): MockWebSocketInstance {
  return new MockWebSocket() as unknown as MockWebSocketInstance;
}

describe("WebSocket Utilities", () => {
  describe("sendMessage", () => {
    test("sends JSON message to socket with Phoenix Channels format", () => {
      const socket = createMockSocket();
      sendMessage(socket, "session:123", { type: "test.event", data: { foo: "bar" } });

      expect(socket.lastMessage).toBe('{"channel":"session:123","type":"test.event","data":{"foo":"bar"}}');
    });

    test("handles complex data structures", () => {
      const socket = createMockSocket();
      const complexData = {
        nested: { value: 123 },
        array: [1, 2, 3],
        nullValue: null,
      };

      sendMessage(socket, "session:456", { type: "complex.event", data: complexData });

      const parsed = JSON.parse(socket.lastMessage!);
      expect(parsed).toEqual({
        channel: "session:456",
        type: "complex.event",
        data: complexData,
      });
    });
  });

  describe("extractId", () => {
    test("extracts session ID from event type", () => {
      const id = extractId("session.123.send_message", "session");
      expect(id).toBe("123");
    });

    test("extracts shell ID from event type", () => {
      const id = extractId("shell.abc-def.input", "shell");
      expect(id).toBe("abc-def");
    });

    test("returns null for invalid format", () => {
      expect(extractId("invalid", "session")).toBeNull();
      expect(extractId("session", "session")).toBeNull();
      expect(extractId("session.123", "session")).toBeNull();
    });

    test("returns null for wrong prefix", () => {
      expect(extractId("session.123.send", "shell")).toBeNull();
      expect(extractId("shell.456.init", "session")).toBeNull();
    });

    test("handles UUIDs as IDs", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      const id = extractId(`session.${uuid}.send_message`, "session");
      expect(id).toBe(uuid);
    });
  });

  describe("cleanupTempDir", () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = `/tmp/websocket-test-${Date.now()}`;
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(`${tempDir}/test.txt`, "test content");
    });

    afterEach(async () => {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    test("removes temp directory from file system", async () => {
      // Verify directory exists before cleanup
      const statsBefore = await fs.stat(tempDir);
      expect(statsBefore.isDirectory()).toBe(true);

      // Cleanup
      await cleanupTempDir(tempDir);

      // Verify directory is removed
      await expect(fs.stat(tempDir)).rejects.toThrow();
    });

    test("removes nested files and directories", async () => {
      // Create nested structure
      await fs.mkdir(`${tempDir}/nested`, { recursive: true });
      await fs.writeFile(`${tempDir}/nested/file.txt`, "content");

      await cleanupTempDir(tempDir);

      // Verify everything is removed
      await expect(fs.stat(tempDir)).rejects.toThrow();
    });

    test("handles undefined tempDir gracefully", async () => {
      await expect(cleanupTempDir(undefined)).resolves.toBeUndefined();
    });

    test("handles non-existent directory gracefully", async () => {
      await expect(cleanupTempDir("/tmp/non-existent-dir-12345")).resolves.toBeUndefined();
    });
  });

  describe("WebSocketMetrics", () => {
    let metrics: WebSocketMetrics;

    beforeEach(() => {
      metrics = new WebSocketMetrics();
    });

    test("starts with zero metrics", () => {
      const data = metrics.getMetrics();
      expect(data.activeConnections).toBe(0);
      expect(data.totalMessagesSent).toBe(0);
      expect(data.totalMessagesReceived).toBe(0);
      expect(data.totalErrors).toBe(0);
    });

    test("increments connection counter", () => {
      metrics.recordConnection();
      expect(metrics.getMetrics().activeConnections).toBe(1);

      metrics.recordConnection();
      expect(metrics.getMetrics().activeConnections).toBe(2);
    });

    test("decrements connection counter on disconnect", () => {
      metrics.recordConnection();
      metrics.recordConnection();
      expect(metrics.getMetrics().activeConnections).toBe(2);

      metrics.recordDisconnection();
      expect(metrics.getMetrics().activeConnections).toBe(1);
    });

    test("tracks messages sent", () => {
      metrics.recordMessageSent();
      metrics.recordMessageSent();
      expect(metrics.getMetrics().totalMessagesSent).toBe(2);
    });

    test("tracks messages received", () => {
      metrics.recordMessageReceived();
      metrics.recordMessageReceived();
      metrics.recordMessageReceived();
      expect(metrics.getMetrics().totalMessagesReceived).toBe(3);
    });

    test("tracks errors", () => {
      metrics.recordError();
      expect(metrics.getMetrics().totalErrors).toBe(1);
    });

    test("tracks all metrics independently", () => {
      metrics.recordConnection();
      metrics.recordMessageSent();
      metrics.recordMessageSent();
      metrics.recordMessageReceived();
      metrics.recordError();

      const data = metrics.getMetrics();
      expect(data.activeConnections).toBe(1);
      expect(data.totalMessagesSent).toBe(2);
      expect(data.totalMessagesReceived).toBe(1);
      expect(data.totalErrors).toBe(1);
    });
  });
});
