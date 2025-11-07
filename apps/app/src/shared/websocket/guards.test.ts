import { describe, test, expect } from 'vitest';
import {
  isSessionEvent,
  isGlobalEvent,
  isShellEvent,
  isWebSocketMessage,
} from './guards';
// @ts-ignore - test file types
import { SessionEventTypes, GlobalEventTypes, ShellEventTypes } from '@/shared/types/websocket.types';
// @ts-ignore - test file types
import type { ChannelEvent } from '@/shared/types/websocket.types';

describe('Type Guards', () => {
  describe('isSessionEvent', () => {
    test('returns true for valid session events', () => {
      const streamOutputEvent: ChannelEvent = {
        type: SessionEventTypes.STREAM_OUTPUT,
        data: { message: 'test', sessionId: '123' },
      };
      expect(isSessionEvent(streamOutputEvent)).toBe(true);

      const messageCompleteEvent: ChannelEvent = {
        type: SessionEventTypes.MESSAGE_COMPLETE,
        data: { messageId: '456', sessionId: '123' },
      };
      expect(isSessionEvent(messageCompleteEvent)).toBe(true);

      const errorEvent: ChannelEvent = {
        type: SessionEventTypes.ERROR,
        data: { error: 'test error', sessionId: '123' },
      };
      expect(isSessionEvent(errorEvent)).toBe(true);

      const subscribeSuccessEvent: ChannelEvent = {
        type: SessionEventTypes.SUBSCRIBE_SUCCESS,
        data: { channel: 'session:123', sessionId: '123' },
      };
      expect(isSessionEvent(subscribeSuccessEvent)).toBe(true);
    });

    test('returns false for non-session events', () => {
      const globalEvent: ChannelEvent = {
        type: GlobalEventTypes.PING,
        data: { timestamp: Date.now() },
      };
      expect(isSessionEvent(globalEvent)).toBe(false);

      const shellEvent: ChannelEvent = {
        type: ShellEventTypes.OUTPUT,
        data: { data: 'output', sessionId: '123' },
      };
      expect(isSessionEvent(shellEvent)).toBe(false);
    });

    test('returns false for unknown event types', () => {
      const unknownEvent: ChannelEvent = {
        type: 'unknown.event',
        data: {},
      };
      expect(isSessionEvent(unknownEvent)).toBe(false);
    });
  });

  describe('isGlobalEvent', () => {
    test('returns true for valid global events', () => {
      const pingEvent: ChannelEvent = {
        type: GlobalEventTypes.PING,
        data: { timestamp: Date.now() },
      };
      expect(isGlobalEvent(pingEvent)).toBe(true);

      const pongEvent: ChannelEvent = {
        type: GlobalEventTypes.PONG,
        data: { timestamp: Date.now() },
      };
      expect(isGlobalEvent(pongEvent)).toBe(true);

      const connectedEvent: ChannelEvent = {
        type: GlobalEventTypes.CONNECTED,
        data: { timestamp: Date.now() },
      };
      expect(isGlobalEvent(connectedEvent)).toBe(true);

      const errorEvent: ChannelEvent = {
        type: GlobalEventTypes.ERROR,
        data: { error: 'test error' },
      };
      expect(isGlobalEvent(errorEvent)).toBe(true);

      const subscriptionSuccessEvent: ChannelEvent = {
        type: GlobalEventTypes.SUBSCRIPTION_SUCCESS,
        data: { channel: 'session:123' },
      };
      expect(isGlobalEvent(subscriptionSuccessEvent)).toBe(true);

      const subscriptionErrorEvent: ChannelEvent = {
        type: GlobalEventTypes.SUBSCRIPTION_ERROR,
        data: { channel: 'session:123', error: 'test error' },
      };
      expect(isGlobalEvent(subscriptionErrorEvent)).toBe(true);
    });

    test('returns false for non-global events', () => {
      const sessionEvent: ChannelEvent = {
        type: SessionEventTypes.STREAM_OUTPUT,
        data: { message: 'test', sessionId: '123' },
      };
      expect(isGlobalEvent(sessionEvent)).toBe(false);

      const shellEvent: ChannelEvent = {
        type: ShellEventTypes.OUTPUT,
        data: { data: 'output', sessionId: '123' },
      };
      expect(isGlobalEvent(shellEvent)).toBe(false);
    });

    test('returns false for unknown event types', () => {
      const unknownEvent: ChannelEvent = {
        type: 'unknown.event',
        data: {},
      };
      expect(isGlobalEvent(unknownEvent)).toBe(false);
    });
  });

  describe('isShellEvent', () => {
    test('returns true for valid shell events', () => {
      const initEvent: ChannelEvent = {
        type: ShellEventTypes.INIT,
        data: { cols: 80, rows: 24, sessionId: '123' },
      };
      expect(isShellEvent(initEvent)).toBe(true);

      const inputEvent: ChannelEvent = {
        type: ShellEventTypes.INPUT,
        data: { data: 'ls -la', sessionId: '123' },
      };
      expect(isShellEvent(inputEvent)).toBe(true);

      const outputEvent: ChannelEvent = {
        type: ShellEventTypes.OUTPUT,
        data: { data: 'output', sessionId: '123' },
      };
      expect(isShellEvent(outputEvent)).toBe(true);

      const resizeEvent: ChannelEvent = {
        type: ShellEventTypes.RESIZE,
        data: { cols: 100, rows: 30, sessionId: '123' },
      };
      expect(isShellEvent(resizeEvent)).toBe(true);

      const exitEvent: ChannelEvent = {
        type: ShellEventTypes.EXIT,
        data: { code: 0, sessionId: '123' },
      };
      expect(isShellEvent(exitEvent)).toBe(true);

      const errorEvent: ChannelEvent = {
        type: ShellEventTypes.ERROR,
        data: { error: 'test error', sessionId: '123' },
      };
      expect(isShellEvent(errorEvent)).toBe(true);
    });

    test('returns false for non-shell events', () => {
      const sessionEvent: ChannelEvent = {
        type: SessionEventTypes.STREAM_OUTPUT,
        data: { message: 'test', sessionId: '123' },
      };
      expect(isShellEvent(sessionEvent)).toBe(false);

      const globalEvent: ChannelEvent = {
        type: GlobalEventTypes.PING,
        data: { timestamp: Date.now() },
      };
      expect(isShellEvent(globalEvent)).toBe(false);
    });

    test('returns false for unknown event types', () => {
      const unknownEvent: ChannelEvent = {
        type: 'unknown.event',
        data: {},
      };
      expect(isShellEvent(unknownEvent)).toBe(false);
    });
  });

  describe('isWebSocketMessage', () => {
    test('returns true for valid WebSocket messages', () => {
      expect(
        isWebSocketMessage({
          channel: 'session:123',
          type: 'stream_output',
          data: { message: 'test' },
        })
      ).toBe(true);

      expect(
        isWebSocketMessage({
          channel: 'global',
          type: 'ping',
          data: { timestamp: Date.now() },
        })
      ).toBe(true);

      expect(
        isWebSocketMessage({
          channel: 'shell:456',
          type: 'output',
          data: { data: 'test' },
        })
      ).toBe(true);
    });

    test('returns false for messages missing channel', () => {
      expect(
        isWebSocketMessage({
          type: 'stream_output',
          data: { message: 'test' },
        })
      ).toBe(false);
    });

    test('returns false for messages missing type', () => {
      expect(
        isWebSocketMessage({
          channel: 'session:123',
          data: { message: 'test' },
        })
      ).toBe(false);
    });

    test('returns false for messages missing data', () => {
      expect(
        isWebSocketMessage({
          channel: 'session:123',
          type: 'stream_output',
        })
      ).toBe(false);
    });

    test('returns false for non-string channel', () => {
      expect(
        isWebSocketMessage({
          channel: 123,
          type: 'stream_output',
          data: { message: 'test' },
        })
      ).toBe(false);
    });

    test('returns false for non-string type', () => {
      expect(
        isWebSocketMessage({
          channel: 'session:123',
          type: 123,
          data: { message: 'test' },
        })
      ).toBe(false);
    });

    test('returns false for null', () => {
      expect(isWebSocketMessage(null)).toBe(false);
    });

    test('returns false for undefined', () => {
      expect(isWebSocketMessage(undefined)).toBe(false);
    });

    test('returns false for primitive values', () => {
      expect(isWebSocketMessage('string')).toBe(false);
      expect(isWebSocketMessage(123)).toBe(false);
      expect(isWebSocketMessage(true)).toBe(false);
    });

    test('returns false for empty object', () => {
      expect(isWebSocketMessage({})).toBe(false);
    });
  });
});
