import { describe, it, expect, vi } from 'vitest';
import { WebSocketEventBus } from './WebSocketEventBus';
import type { SessionEvent, GlobalEvent } from '@/shared/types/websocket.types';
import { SessionEventTypes, GlobalEventTypes } from '@/shared/types/websocket.types';

describe('WebSocketEventBus - Phoenix Channels Pattern', () => {
  it('should subscribe to channel and receive events', () => {
    const bus = new WebSocketEventBus();
    const handler = vi.fn();

    bus.on('session:123', handler);
    bus.emit('session:123', {
      type: SessionEventTypes.STREAM_OUTPUT,
      data: { message: 'hello', sessionId: '123' },
    });

    expect(handler).toHaveBeenCalledWith({
      type: SessionEventTypes.STREAM_OUTPUT,
      data: { message: 'hello', sessionId: '123' },
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe correctly', () => {
    const bus = new WebSocketEventBus();
    const handler = vi.fn();

    const event1: SessionEvent = {
      type: SessionEventTypes.STREAM_OUTPUT,
      data: { message: 'first', sessionId: '123' },
    };
    const event2: SessionEvent = {
      type: SessionEventTypes.STREAM_OUTPUT,
      data: { message: 'second', sessionId: '123' },
    };

    bus.on('session:123', handler);
    bus.emit('session:123', event1);
    expect(handler).toHaveBeenCalledTimes(1);

    bus.off('session:123', handler);
    bus.emit('session:123', event2);
    expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
  });

  it('should auto-unsubscribe with once()', () => {
    const bus = new WebSocketEventBus();
    const handler = vi.fn();

    const event1: SessionEvent = {
      type: SessionEventTypes.MESSAGE_COMPLETE,
      data: { sessionId: '123', messageId: 'msg1' },
    };
    const event2: SessionEvent = {
      type: SessionEventTypes.MESSAGE_COMPLETE,
      data: { sessionId: '123', messageId: 'msg2' },
    };

    bus.once('session:123', handler);
    bus.emit('session:123', event1);
    expect(handler).toHaveBeenCalledWith(event1);
    expect(handler).toHaveBeenCalledTimes(1);

    bus.emit('session:123', event2);
    expect(handler).toHaveBeenCalledTimes(1); // Still 1, auto-unsubscribed
  });

  it('should support multiple handlers on same channel', () => {
    const bus = new WebSocketEventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const event: GlobalEvent = {
      type: GlobalEventTypes.CONNECTED,
      data: { timestamp: Date.now() },
    };

    bus.on('global', handler1);
    bus.on('global', handler2);
    bus.emit('global', event);

    expect(handler1).toHaveBeenCalledWith(event);
    expect(handler2).toHaveBeenCalledWith(event);
  });

  it('should not error when emitting to channel with no handlers', () => {
    const bus = new WebSocketEventBus();

    expect(() => {
      bus.emit('nonexistent:channel', {
        type: SessionEventTypes.ERROR,
        data: { error: 'test', sessionId: 'none' },
      });
    }).not.toThrow();
  });

  it('should clean up empty handler sets after unsubscribe', () => {
    const bus = new WebSocketEventBus();
    const handler = vi.fn();

    bus.on('session:123', handler);
    expect(bus.listenerCount('session:123')).toBe(1);

    bus.off('session:123', handler);
    expect(bus.listenerCount('session:123')).toBe(0);
  });

  it('should clear all listeners', () => {
    const bus = new WebSocketEventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus.on('session:123', handler1);
    bus.on('global', handler2);
    expect(bus.listenerCount('session:123')).toBe(1);
    expect(bus.listenerCount('global')).toBe(1);

    bus.clear();
    expect(bus.listenerCount('session:123')).toBe(0);
    expect(bus.listenerCount('global')).toBe(0);
  });

  it('should isolate errors in handlers without stopping other handlers', () => {
    const bus = new WebSocketEventBus();
    const errorHandler = vi.fn(() => {
      throw new Error('Handler error');
    });
    const successHandler = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const event: SessionEvent = {
      type: SessionEventTypes.ERROR,
      data: { error: 'test error', sessionId: '123' },
    };

    bus.on('session:123', errorHandler);
    bus.on('session:123', successHandler);
    bus.emit('session:123', event);

    expect(errorHandler).toHaveBeenCalled();
    expect(successHandler).toHaveBeenCalledWith(event);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should handle type-safe session events', () => {
    const bus = new WebSocketEventBus();
    const handler = vi.fn<[SessionEvent], void>();

    const event: SessionEvent = {
      type: SessionEventTypes.STREAM_OUTPUT,
      data: { message: 'test', sessionId: '123' },
    };

    bus.on<SessionEvent>('session:123', handler);
    bus.emit('session:123', event);

    expect(handler).toHaveBeenCalledWith(event);
  });

  it('should handle type-safe global events', () => {
    const bus = new WebSocketEventBus();
    const handler = vi.fn<[GlobalEvent], void>();

    const event: GlobalEvent = {
      type: GlobalEventTypes.PING,
      data: { timestamp: Date.now() },
    };

    bus.on<GlobalEvent>('global', handler);
    bus.emit('global', event);

    expect(handler).toHaveBeenCalledWith(event);
  });

  it('should return correct listener count', () => {
    const bus = new WebSocketEventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const handler3 = vi.fn();

    expect(bus.listenerCount('session:123')).toBe(0);

    bus.on('session:123', handler1);
    expect(bus.listenerCount('session:123')).toBe(1);

    bus.on('session:123', handler2);
    bus.on('session:123', handler3);
    expect(bus.listenerCount('session:123')).toBe(3);

    bus.off('session:123', handler1);
    expect(bus.listenerCount('session:123')).toBe(2);
  });

  it('should not add duplicate handlers', () => {
    const bus = new WebSocketEventBus();
    const handler = vi.fn();

    const event: SessionEvent = {
      type: SessionEventTypes.STREAM_OUTPUT,
      data: { message: 'test', sessionId: '123' },
    };

    bus.on('session:123', handler);
    bus.on('session:123', handler); // Add same handler again
    bus.emit('session:123', event);

    // Should only be called once because Set deduplicates
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should track active channels', () => {
    const bus = new WebSocketEventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    expect(bus.getActiveChannels()).toEqual([]);

    bus.on('session:123', handler1);
    bus.on('global', handler2);

    const channels = bus.getActiveChannels();
    expect(channels).toContain('session:123');
    expect(channels).toContain('global');
    expect(channels.length).toBe(2);

    bus.off('session:123', handler1);
    expect(bus.getActiveChannels()).toEqual(['global']);
  });

  it('should emit different event types to same channel', () => {
    const bus = new WebSocketEventBus();
    const handler = vi.fn();

    bus.on<SessionEvent>('session:123', handler);

    const event1: SessionEvent = {
      type: SessionEventTypes.STREAM_OUTPUT,
      data: { message: 'output', sessionId: '123' },
    };

    const event2: SessionEvent = {
      type: SessionEventTypes.MESSAGE_COMPLETE,
      data: { sessionId: '123', messageId: 'msg1' },
    };

    bus.emit('session:123', event1);
    bus.emit('session:123', event2);

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenNthCalledWith(1, event1);
    expect(handler).toHaveBeenNthCalledWith(2, event2);
  });
});
