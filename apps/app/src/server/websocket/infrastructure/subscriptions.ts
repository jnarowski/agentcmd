import type { WebSocket } from "@fastify/websocket";
import type { ChannelEvent } from "@/shared/types/websocket.types";
import { wsMetrics } from "./metrics";

/**
 * Channel-based WebSocket Subscription Manager
 *
 * Manages subscriptions to channels using a Map-based registry.
 * Automatically cleans up dead sockets during broadcast operations.
 *
 * Channel naming convention: {resource}:{id}
 * Examples: "session:abc123", "project:xyz789", "terminal:term-001"
 */

// Registry: channelId → Set of WebSockets
const subscriptions = new Map<string, Set<WebSocket>>();

// Reverse mapping: WebSocket → Set of channels (for cleanup)
const socketChannels = new Map<WebSocket, Set<string>>();

/**
 * Subscribe a socket to a channel
 *
 * @param channelId - Channel identifier (e.g., "session:abc123")
 * @param socket - WebSocket connection
 */
export function subscribe(channelId: string, socket: WebSocket): void {
  // Get or create channel subscriber set
  let subscribers = subscriptions.get(channelId);
  if (!subscribers) {
    subscribers = new Set();
    subscriptions.set(channelId, subscribers);
  }

  // Add socket to channel
  subscribers.add(socket);

  // DIAGNOSTIC: Log subscription
  console.log('[DIAGNOSTIC] subscribe() called:', {
    channelId,
    subscriberCount: subscribers.size,
    socketReadyState: socket.readyState,
  });

  // Track channel for this socket (for cleanup)
  let channels = socketChannels.get(socket);
  if (!channels) {
    channels = new Set();
    socketChannels.set(socket, channels);
  }
  channels.add(channelId);

  // Record metrics
  wsMetrics.recordSubscription(channelId);
}

/**
 * Unsubscribe a socket from a channel
 *
 * @param channelId - Channel identifier
 * @param socket - WebSocket connection
 */
export function unsubscribe(channelId: string, socket: WebSocket): void {
  const subscribers = subscriptions.get(channelId);
  if (subscribers) {
    subscribers.delete(socket);

    // Record metrics
    wsMetrics.recordUnsubscription(channelId);

    // Remove empty channel
    if (subscribers.size === 0) {
      subscriptions.delete(channelId);
    }
  }

  // Remove from reverse mapping
  const channels = socketChannels.get(socket);
  if (channels) {
    channels.delete(channelId);

    if (channels.size === 0) {
      socketChannels.delete(socket);
    }
  }
}

/**
 * Unsubscribe a socket from all channels
 *
 * Called on disconnect to clean up all subscriptions for a socket
 *
 * @param socket - WebSocket connection
 */
export function unsubscribeAll(socket: WebSocket): void {
  const channels = socketChannels.get(socket);
  if (!channels) {
    return;
  }

  // Remove socket from all channels
  for (const channelId of channels) {
    const subscribers = subscriptions.get(channelId);
    if (subscribers) {
      subscribers.delete(socket);

      // Remove empty channel
      if (subscribers.size === 0) {
        subscriptions.delete(channelId);
      }
    }
  }

  // Remove reverse mapping
  socketChannels.delete(socket);
}

/**
 * Broadcast a message to all subscribers of a channel
 *
 * Automatically removes dead sockets (readyState !== OPEN)
 *
 * @param channelId - Channel identifier
 * @param event - Event object with type and data (Phoenix Channels pattern)
 */
export function broadcast(channelId: string, event: ChannelEvent): void {
  const subscribers = subscriptions.get(channelId);

  // DIAGNOSTIC: Log broadcast attempt
  console.log('[DIAGNOSTIC] broadcast() called:', {
    channelId,
    eventType: event.type,
    subscriberCount: subscribers?.size || 0,
    hasSubscribers: !!subscribers && subscribers.size > 0,
  });

  if (!subscribers || subscribers.size === 0) {
    console.log('[DIAGNOSTIC] No subscribers for channel:', channelId);
    return;
  }

  const message = JSON.stringify({
    channel: channelId,
    ...event,
  });
  const deadSockets: WebSocket[] = [];

  // Send to all live subscribers
  for (const socket of subscribers) {
    if (socket.readyState === 1) {
      // 1 = OPEN
      try {
        socket.send(message);
      } catch {
        // Socket send failed, mark for cleanup
        deadSockets.push(socket);
      }
    } else {
      deadSockets.push(socket);
    }
  }

  // Clean up dead sockets
  if (deadSockets.length > 0) {
    for (const socket of deadSockets) {
      unsubscribeAll(socket);
    }
  }
}

/**
 * Check if a channel has active subscribers
 *
 * @param channelId - Channel identifier
 * @returns True if channel has at least one subscriber
 */
export function hasSubscribers(channelId: string): boolean {
  const subscribers = subscriptions.get(channelId);
  return subscribers ? subscribers.size > 0 : false;
}

/**
 * Get the number of subscribers for a channel
 *
 * @param channelId - Channel identifier
 * @returns Number of active subscribers
 */
export function getSubscriberCount(channelId: string): number {
  const subscribers = subscriptions.get(channelId);
  return subscribers ? subscribers.size : 0;
}

/**
 * Get all active channel IDs
 *
 * @returns Array of channel IDs with active subscribers
 */
export function getActiveChannels(): string[] {
  return Array.from(subscriptions.keys());
}

/**
 * Clear all subscriptions (for testing)
 * @internal
 */
export function clearAllSubscriptions(): void {
  subscriptions.clear();
  socketChannels.clear();
}
