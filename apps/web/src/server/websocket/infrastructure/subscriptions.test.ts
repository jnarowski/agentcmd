import { describe, test, expect, beforeEach, vi } from "vitest";
import type { WebSocket } from "@fastify/websocket";
import {
  subscribe,
  unsubscribe,
  unsubscribeAll,
  broadcast,
  hasSubscribers,
  getSubscriberCount,
  getActiveChannels,
  clearAllSubscriptions,
} from "./subscriptions";

/**
 * Mock WebSocket factory
 */
function mockWebSocket(options: {
  readyState?: number;
} = {}): WebSocket {
  const socket = {
    readyState: options.readyState ?? 1, // 1 = OPEN by default
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
    removeListener: vi.fn(),
  } as unknown as WebSocket;

  return socket;
}

describe("SubscriptionManager", () => {
  // Clean up subscriptions between tests
  beforeEach(() => {
    // Clear all subscriptions
    clearAllSubscriptions();
    // Clear all mock function calls
    vi.clearAllMocks();
  });

  describe("subscribe", () => {
    test("subscribe adds socket to channel", () => {
      const socket = mockWebSocket();
      subscribe("session:123", socket);

      expect(getSubscriberCount("session:123")).toBe(1);
      expect(hasSubscribers("session:123")).toBe(true);
    });

    test("subscribe is idempotent (no duplicates)", () => {
      const socket = mockWebSocket();
      subscribe("session:123", socket);
      subscribe("session:123", socket); // Subscribe again

      expect(getSubscriberCount("session:123")).toBe(1);
    });

    test("multiple sockets can subscribe to same channel", () => {
      const socket1 = mockWebSocket();
      const socket2 = mockWebSocket();

      subscribe("session:123", socket1);
      subscribe("session:123", socket2);

      expect(getSubscriberCount("session:123")).toBe(2);
    });

    test("socket can subscribe to multiple channels", () => {
      const socket = mockWebSocket();

      subscribe("session:123", socket);
      subscribe("project:456", socket);

      expect(getSubscriberCount("session:123")).toBe(1);
      expect(getSubscriberCount("project:456")).toBe(1);
      expect(getActiveChannels()).toContain("session:123");
      expect(getActiveChannels()).toContain("project:456");
    });
  });

  describe("unsubscribe", () => {
    test("unsubscribe removes socket from channel", () => {
      const socket = mockWebSocket();
      subscribe("session:123", socket);

      unsubscribe("session:123", socket);

      expect(getSubscriberCount("session:123")).toBe(0);
      expect(hasSubscribers("session:123")).toBe(false);
    });

    test("unsubscribe removes channel when last subscriber leaves", () => {
      const socket1 = mockWebSocket();
      const socket2 = mockWebSocket();

      subscribe("session:123", socket1);
      subscribe("session:123", socket2);

      unsubscribe("session:123", socket1);
      expect(getActiveChannels()).toContain("session:123");

      unsubscribe("session:123", socket2);
      expect(getActiveChannels()).not.toContain("session:123");
    });

    test("unsubscribe from non-existent channel is safe", () => {
      const socket = mockWebSocket();

      expect(() => {
        unsubscribe("session:999", socket);
      }).not.toThrow();
    });
  });

  describe("unsubscribeAll", () => {
    test("unsubscribeAll removes socket from all channels", () => {
      const socket = mockWebSocket();

      subscribe("session:123", socket);
      subscribe("project:456", socket);
      subscribe("terminal:789", socket);

      unsubscribeAll(socket);

      expect(getSubscriberCount("session:123")).toBe(0);
      expect(getSubscriberCount("project:456")).toBe(0);
      expect(getSubscriberCount("terminal:789")).toBe(0);
    });

    test("unsubscribeAll does not affect other sockets", () => {
      const socket1 = mockWebSocket();
      const socket2 = mockWebSocket();

      subscribe("session:123", socket1);
      subscribe("session:123", socket2);

      unsubscribeAll(socket1);

      expect(getSubscriberCount("session:123")).toBe(1);
    });

    test("unsubscribeAll on socket with no subscriptions is safe", () => {
      const socket = mockWebSocket();

      expect(() => {
        unsubscribeAll(socket);
      }).not.toThrow();
    });
  });

  describe("broadcast", () => {
    test("broadcast sends to all subscribers", () => {
      const socket1 = mockWebSocket();
      const socket2 = mockWebSocket();

      subscribe("session:123", socket1);
      subscribe("session:123", socket2);

      broadcast("session:123", { type: "test.event", data: { message: "hello" } });

      expect(socket1.send).toHaveBeenCalledWith(
        JSON.stringify({
          channel: "session:123",
          type: "test.event",
          data: { message: "hello" },
        })
      );

      expect(socket2.send).toHaveBeenCalledWith(
        JSON.stringify({
          channel: "session:123",
          type: "test.event",
          data: { message: "hello" },
        })
      );
    });

    test("broadcast to channel with no subscribers is safe", () => {
      expect(() => {
        broadcast("session:999", { type: "test.event", data: {} });
      }).not.toThrow();
    });

    test("broadcast skips dead sockets (readyState !== OPEN)", () => {
      const liveSocket = mockWebSocket({ readyState: 1 }); // OPEN
      const deadSocket = mockWebSocket({ readyState: 3 }); // CLOSED

      subscribe("session:123", liveSocket);
      subscribe("session:123", deadSocket);

      broadcast("session:123", { type: "test.event", data: { data: "hello" } });

      expect(liveSocket.send).toHaveBeenCalled();
      expect(deadSocket.send).not.toHaveBeenCalled();

      // Dead socket should be removed from channel
      expect(getSubscriberCount("session:123")).toBe(1);
    });

    test("broadcast removes socket on send error", () => {
      const socket1 = mockWebSocket();
      const socket2 = mockWebSocket();

      // Make socket2 throw error on send
      socket2.send = vi.fn(() => {
        throw new Error("Send failed");
      });

      subscribe("session:123", socket1);
      subscribe("session:123", socket2);

      broadcast("session:123", { type: "test.event", data: {} });

      // socket1 should succeed, socket2 should be removed
      expect(socket1.send).toHaveBeenCalled();
      expect(getSubscriberCount("session:123")).toBe(1);
    });
  });

  describe("hasSubscribers", () => {
    test("returns true for channel with subscribers", () => {
      const socket = mockWebSocket();
      subscribe("session:123", socket);

      expect(hasSubscribers("session:123")).toBe(true);
    });

    test("returns false for channel without subscribers", () => {
      expect(hasSubscribers("session:999")).toBe(false);
    });
  });

  describe("getSubscriberCount", () => {
    test("returns correct count", () => {
      const socket1 = mockWebSocket();
      const socket2 = mockWebSocket();
      const socket3 = mockWebSocket();

      subscribe("session:123", socket1);
      subscribe("session:123", socket2);
      subscribe("session:123", socket3);

      expect(getSubscriberCount("session:123")).toBe(3);
    });

    test("returns 0 for non-existent channel", () => {
      expect(getSubscriberCount("session:999")).toBe(0);
    });
  });

  describe("getActiveChannels", () => {
    test("returns list of active channels", () => {
      const socket = mockWebSocket();

      subscribe("session:123", socket);
      subscribe("project:456", socket);

      const channels = getActiveChannels();
      expect(channels).toContain("session:123");
      expect(channels).toContain("project:456");
      expect(channels.length).toBe(2);
    });

    test("returns empty array when no channels", () => {
      expect(getActiveChannels()).toEqual([]);
    });
  });
});
