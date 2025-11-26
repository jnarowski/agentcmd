/**
 * WebSocketEventBus
 *
 * Channel-based event emitter following Phoenix Channels pattern.
 * Components subscribe to channels and receive structured events with type discriminators.
 *
 * @example
 * ```typescript
 * import { Channels, SessionEventTypes, type SessionEvent } from '@/shared/websocket';
 *
 * // Subscribe to a channel
 * eventBus.on<SessionEvent>(Channels.session('123'), (event) => {
 *   switch (event.type) {
 *     case SessionEventTypes.STREAM_OUTPUT:
 *       console.log(event.data.message);
 *       break;
 *   }
 * });
 *
 * // Emit an event to a channel
 * eventBus.emit(Channels.session('123'), {
 *   type: SessionEventTypes.STREAM_OUTPUT,
 *   data: { message: 'Hello' }
 * });
 * ```
 */

import type { ChannelEvent } from '@/shared/types/websocket.types';

type ChannelEventHandler<T extends ChannelEvent = ChannelEvent> = (event: T) => void;

export class WebSocketEventBus {
  private listeners: Map<string, Set<ChannelEventHandler>>;

  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to a channel
   * @param channel The channel name to listen on (e.g., 'session:123', 'global')
   * @param handler The function to call when events are emitted to this channel
   */
  on<T extends ChannelEvent = ChannelEvent>(
    channel: string,
    handler: ChannelEventHandler<T>
  ): void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(handler as ChannelEventHandler);
  }

  /**
   * Unsubscribe from a channel
   * @param channel The channel name to stop listening on
   * @param handler The function to remove
   */
  off<T extends ChannelEvent = ChannelEvent>(
    channel: string,
    handler: ChannelEventHandler<T>
  ): void {
    const handlers = this.listeners.get(channel);
    if (handlers) {
      handlers.delete(handler as ChannelEventHandler);
      // Clean up empty sets
      if (handlers.size === 0) {
        this.listeners.delete(channel);
      }
    }
  }

  /**
   * Emit an event to all subscribers of a channel
   * @param channel The channel name to emit to
   * @param event The structured event with type and data
   */
  emit(channel: string, event: ChannelEvent): void {
    const handlers = this.listeners.get(channel);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error(`[EventBus] Error in handler for channel "${channel}":`, error);
        }
      });
    }
  }

  /**
   * Subscribe to a channel and automatically unsubscribe after first event
   * @param channel The channel name to listen on
   * @param handler The function to call once when an event is emitted
   */
  once<T extends ChannelEvent = ChannelEvent>(
    channel: string,
    handler: ChannelEventHandler<T>
  ): void {
    const onceHandler = (event: T) => {
      handler(event);
      this.off(channel, onceHandler);
    };
    this.on(channel, onceHandler);
  }

  /**
   * Remove all listeners for all channels
   * Useful for cleanup
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * Get the number of listeners for a specific channel (useful for debugging)
   */
  listenerCount(channel: string): number {
    return this.listeners.get(channel)?.size ?? 0;
  }

  /**
   * Get all active channel subscriptions (useful for debugging and DevTools)
   */
  getActiveChannels(): string[] {
    return Array.from(this.listeners.keys());
  }
}
