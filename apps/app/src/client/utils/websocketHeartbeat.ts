import { isDebugMode } from "@/client/utils/isDebugMode";

/**
 * WebSocket Heartbeat Implementation
 *
 * Adapted from react-use-websocket library's heartbeat pattern.
 * Uses interval-based checking rather than ping/pong roundtrip.
 *
 * How it works:
 * - Check last message time every 3 seconds
 * - If no message received in 60 seconds, close connection
 * - Connection close will trigger reconnection logic
 */

/**
 * Heartbeat check interval (3 seconds)
 * How often to check if we've received messages recently
 */
const HEARTBEAT_INTERVAL = 3000;

/**
 * Heartbeat timeout (60 seconds)
 * How long without messages before considering connection dead
 */
const HEARTBEAT_TIMEOUT = 60000;

/**
 * Parameters for starting heartbeat
 */
export interface HeartbeatParams {
  socket: WebSocket;
  lastMessageTimeRef: { current: number };
  heartbeatIntervalRef: { current: ReturnType<typeof setInterval> | null };
}

/**
 * Start heartbeat monitoring
 *
 * Returns cleanup function to clear interval
 */
export function startHeartbeat(params: HeartbeatParams): () => void {
  const { lastMessageTimeRef, heartbeatIntervalRef } = params;

  // Initialize last message time to now
  lastMessageTimeRef.current = Date.now();

  // Clear any existing heartbeat
  if (heartbeatIntervalRef.current) {
    clearInterval(heartbeatIntervalRef.current);
    heartbeatIntervalRef.current = null;
  }

  if (isDebugMode()) {
    console.log("[WebSocket] ❤️ Starting heartbeat monitoring");
  }

  // Set up interval to check last message time
  heartbeatIntervalRef.current = setInterval(() => {
    const timeSinceLastMessage = Date.now() - lastMessageTimeRef.current;

    // If we haven't received a message in HEARTBEAT_TIMEOUT, log it
    // Note: We don't close the connection - browser will detect truly dead connections
    if (timeSinceLastMessage > HEARTBEAT_TIMEOUT) {
      if (isDebugMode()) {
        console.log(
          `[WebSocket] 💤 Idle: No message received in ${HEARTBEAT_TIMEOUT}ms (connection still open)`
        );
      }
    }
  }, HEARTBEAT_INTERVAL);

  // Return cleanup function
  return () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;

      if (isDebugMode()) {
        console.log("[WebSocket] ❤️ Stopped heartbeat monitoring");
      }
    }
  };
}

/**
 * Stop heartbeat monitoring
 */
export function stopHeartbeat(heartbeatIntervalRef: {
  current: ReturnType<typeof setInterval> | null;
}) {
  if (heartbeatIntervalRef.current) {
    clearInterval(heartbeatIntervalRef.current);
    heartbeatIntervalRef.current = null;

    if (isDebugMode()) {
      console.log("[WebSocket] ❤️ Stopped heartbeat monitoring");
    }
  }
}
