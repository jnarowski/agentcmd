/**
 * WebSocket Handler Functions
 *
 * Extracted handler pattern from react-use-websocket library.
 * Provides clean, testable functions for WebSocket lifecycle events.
 *
 * Key responsibilities:
 * - bindOpenHandler: Reset reconnect counter, start heartbeat
 * - bindCloseHandler: Check auth failures, schedule reconnections
 * - bindMessageHandler: Track last message time for heartbeat
 * - bindErrorHandler: Log errors, emit to EventBus
 */

import type { WebSocketEventBus } from "@/client/utils/WebSocketEventBus";
import { Channels } from "@/shared/websocket";
import { GlobalEventTypes } from "@/shared/types/websocket.types";

/**
 * Exponential backoff delays for reconnection attempts
 * Pattern: 1s, 2s, 4s, 8s, 16s
 */
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000];

/**
 * Maximum reconnection attempts before giving up
 */
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Get reconnection delay for a given attempt number
 * @param attempt Attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
export function getReconnectDelay(attempt: number): number {
  return RECONNECT_DELAYS[attempt] ?? 16000;
}

/**
 * Parameters for binding WebSocket handlers
 */
export interface BindHandlerParams {
  socket: WebSocket;
  eventBus: WebSocketEventBus;
  reconnectAttemptRef: { current: number };
  reconnectTimeoutRef: { current: ReturnType<typeof setTimeout> | null };
  connectionTimeoutRef: { current: ReturnType<typeof setTimeout> | null };
  lastMessageTimeRef: { current: number };
  intentionalCloseRef: { current: boolean };
  setReadyState: (state: number) => void;
  setIsReady: (ready: boolean) => void;
  onStartHeartbeat: () => void;
  onStopHeartbeat: () => void;
  onReconnect: () => void;
  onReconnectStop: () => void;
}

/**
 * Clear reconnection timeout
 */
export function clearReconnectTimeout(
  reconnectTimeoutRef: { current: ReturnType<typeof setTimeout> | null }
) {
  if (reconnectTimeoutRef.current) {
    clearTimeout(reconnectTimeoutRef.current);
    reconnectTimeoutRef.current = null;
  }
}

/**
 * Clear connection timeout
 */
export function clearConnectionTimeout(
  connectionTimeoutRef: { current: ReturnType<typeof setTimeout> | null }
) {
  if (connectionTimeoutRef.current) {
    clearTimeout(connectionTimeoutRef.current);
    connectionTimeoutRef.current = null;
  }
}

/**
 * Bind open handler - called when WebSocket connection opens
 * Resets reconnection state and starts heartbeat
 */
export function bindOpenHandler(params: BindHandlerParams) {
  const {
    connectionTimeoutRef,
    setReadyState,
    reconnectAttemptRef,
    onStopHeartbeat,
  } = params;

  return () => {
    // Clear connection timeout
    clearConnectionTimeout(connectionTimeoutRef);

    if (import.meta.env.DEV) {
      console.log("[WebSocket] ✓ Socket opened (readyState = OPEN)");
      console.log(
        "[WebSocket] ⏳ Waiting for global.connected message from server..."
      );
    }
    setReadyState(1); // ReadyState.OPEN

    // Reset reconnect attempts on successful connection
    reconnectAttemptRef.current = 0;

    // Stop any existing heartbeat (will be restarted on 'connected' message)
    onStopHeartbeat();
  };
}

/**
 * Bind message handler - called when receiving WebSocket messages
 * Tracks last message time for heartbeat monitoring
 */
export function bindMessageHandler(params: BindHandlerParams) {
  const { lastMessageTimeRef } = params;

  return () => {
    // Update last message timestamp for heartbeat
    lastMessageTimeRef.current = Date.now();
  };
}

/**
 * Bind error handler - called on WebSocket errors
 * Logs error and emits to EventBus
 */
export function bindErrorHandler(params: BindHandlerParams) {
  const { eventBus } = params;

  return (error: Event) => {
    console.error("[WebSocket] Error:", error);
    eventBus.emit(Channels.global(), {
      type: GlobalEventTypes.ERROR,
      data: {
        error: "WebSocket error occurred",
        timestamp: Date.now(),
      },
    });
  };
}

/**
 * Bind close handler - called when WebSocket connection closes
 * Handles auth failures and schedules reconnection with exponential backoff
 */
export function bindCloseHandler(params: BindHandlerParams) {
  const {
    eventBus,
    reconnectAttemptRef,
    reconnectTimeoutRef,
    intentionalCloseRef,
    setReadyState,
    setIsReady,
    onStopHeartbeat,
    onReconnect,
    onReconnectStop,
  } = params;

  return (event: CloseEvent) => {
    // Stop heartbeat on close
    onStopHeartbeat();

    console.log("[WebSocket] ❌ Connection closed", {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
      intentionalClose: intentionalCloseRef.current,
      reconnectAttempts: reconnectAttemptRef.current,
    });

    setReadyState(3); // ReadyState.CLOSED
    setIsReady(false);

    // Handle auth failure (1008 = Policy Violation)
    if (event.code === 1008) {
      console.error("[WebSocket] Authentication failed");
      eventBus.emit(Channels.global(), {
        type: GlobalEventTypes.ERROR,
        data: {
          error: "Authentication failed",
          message: "Invalid or expired token",
          timestamp: Date.now(),
        },
      });
      return; // Don't attempt to reconnect
    }

    // Don't reconnect if intentional close (e.g., replacing connection)
    if (intentionalCloseRef.current) {
      console.log("[WebSocket] ⏸️ Intentional close, not reconnecting");
      intentionalCloseRef.current = false; // Reset flag
      return;
    }

    // Always attempt reconnection (except for auth failures and intentional close)
    console.log("[WebSocket] 🔍 Reconnection check:", {
      currentAttempts: reconnectAttemptRef.current,
      willReconnect: reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS,
    });

    // Check if we've exceeded max attempts
    if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error(
        "[WebSocket] ⛔ Max reconnection attempts reached:",
        reconnectAttemptRef.current
      );

      eventBus.emit(Channels.global(), {
        type: GlobalEventTypes.ERROR,
        data: {
          error: "Connection lost",
          message: "Maximum reconnection attempts reached",
          timestamp: Date.now(),
        },
      });

      // Notify parent that reconnection has stopped
      onReconnectStop();
      return;
    }

    // Schedule reconnection with exponential backoff
    const delay = getReconnectDelay(reconnectAttemptRef.current);
    reconnectAttemptRef.current++; // Increment BEFORE scheduling

    console.log(
      `[WebSocket] 🔄 Scheduling reconnect attempt ${reconnectAttemptRef.current}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(
        `[WebSocket] ▶️ Executing reconnect attempt ${reconnectAttemptRef.current}/${MAX_RECONNECT_ATTEMPTS}`
      );
      onReconnect();
    }, delay);
  };
}
