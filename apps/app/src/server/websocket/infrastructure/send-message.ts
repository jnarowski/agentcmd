import type { WebSocket } from "@fastify/websocket";
import type { ChannelEvent } from "@/shared/types/websocket.types";

/**
 * Send a WebSocket message using Phoenix Channels pattern
 * Message format: {channel, type, data}
 *
 * @param socket - WebSocket connection
 * @param channel - Channel name (e.g., "session:123")
 * @param event - Event object with type and data
 */
export function sendMessage(
  socket: WebSocket,
  channel: string,
  event: ChannelEvent
): void {
  if (socket.readyState === 1) {
    // 1 = OPEN
    socket.send(
      JSON.stringify({
        channel,
        ...event,
      })
    );
  }
}
