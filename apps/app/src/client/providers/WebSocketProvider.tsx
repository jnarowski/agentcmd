import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { WebSocketEventBus } from "@/client/utils/WebSocketEventBus";
import { wsMetrics } from "@/client/utils/WebSocketMetrics";
import {
  calculateReconnectDelay,
  DEFAULT_MAX_RECONNECT_DELAY,
} from "@/client/utils/reconnectionStrategy";
import { ReadyState, GlobalEventTypes, type ChannelEvent, type GlobalEvent } from "@/shared/types/websocket.types";
import { useAuthStore } from "@/client/stores/authStore";
import {
  WebSocketContext,
  type WebSocketContextValue,
} from "@/client/contexts/WebSocketContext";
import {
  Channels,
  isWebSocketMessage,
} from "@/shared/websocket";

/**
 * WebSocketProvider Props
 */
export interface WebSocketProviderProps {
  children: ReactNode;
}

/**
 * Maximum messages queued before dropping oldest
 * Prevents memory leaks if connection never opens
 */
const MAX_QUEUE_SIZE = 100;

/**
 * Heartbeat ping interval (30 seconds)
 */
const HEARTBEAT_INTERVAL = 30000;

/**
 * Heartbeat pong timeout (5 seconds)
 * If no pong received within this time, reconnect
 */
const HEARTBEAT_TIMEOUT = 5000;

/**
 * WebSocketProvider
 *
 * Manages a single global WebSocket connection following Phoenix Channels pattern.
 * - Channel-based subscriptions via EventBus
 * - Heartbeat system (ping/pong every 30s)
 * - Automatic reconnection with exponential backoff
 * - Queue limits and reconnection caps
 * - Error toasts and metrics tracking
 */
export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const token = useAuthStore((state) => state.token);

  // WebSocket instance (stored in ref to avoid re-creating on state changes)
  const socketRef = useRef<WebSocket | null>(null);

  // EventBus instance (created once and shared)
  const eventBusRef = useRef(new WebSocketEventBus());

  // Message queue for messages sent before connection is ready
  const messageQueueRef = useRef<
    Array<{ channel: string; event: ChannelEvent }>
  >([]);

  // Connection state
  const [readyState, setReadyState] = useState<ReadyState>(ReadyState.CLOSED);
  const [isReady, setIsReady] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // Reconnection state
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalCloseRef = useRef(false);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Heartbeat state
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPingTimestampRef = useRef<number>(0);

  const isConnected = readyState === ReadyState.OPEN && isReady;

  /**
   * Start heartbeat system (ping every 30s, expect pong within 5s)
   */
  const startHeartbeat = () => {
    // Clear any existing heartbeat
    stopHeartbeat();

    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN && isReady) {
        const timestamp = Date.now();
        lastPingTimestampRef.current = timestamp;

        sendMessage(Channels.global(), {
          type: GlobalEventTypes.PING,
          data: { timestamp },
        });

        // Set timeout for pong response
        heartbeatTimeoutRef.current = setTimeout(() => {
          console.warn(
            "[WebSocket] Heartbeat timeout - no pong received, reconnecting"
          );
          // Reconnect if no pong received
          if (socketRef.current) {
            socketRef.current.close();
          }
        }, HEARTBEAT_TIMEOUT);
      }
    }, HEARTBEAT_INTERVAL);
  };

  /**
   * Stop heartbeat system
   */
  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  };

  /**
   * Connect to WebSocket server
   */
  const connect = () => {
    console.log("[WebSocket] 🔌 connect() called", {
      hasToken: !!token,
      currentState: readyState,
      reconnectAttempts: reconnectAttemptsRef.current,
    });

    // Don't connect if no token (user not logged in)
    if (!token) {
      console.warn("[WebSocket] ⚠️ No auth token, skipping connection");
      return;
    }

    // Close existing connection if any
    if (socketRef.current) {
      console.log("[WebSocket] 🔄 Closing existing connection before reconnect");
      intentionalCloseRef.current = true;
      socketRef.current.close();
      socketRef.current = null;
    }

    try {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      // In development, Vite runs on :5173 but backend is on :3456
      const isDev = import.meta.env.DEV;

      // Allow override via VITE_WS_HOST for VPN/remote access
      // Examples: "10.0.1.100:3456", "vpn.example.com:3456"
      const wsHost =
        import.meta.env.VITE_WS_HOST ||
        (isDev ? "localhost:3456" : window.location.host);
      const wsUrl = `${wsProtocol}//${wsHost}/ws?token=${token}`;

      // Increment connection attempts
      setConnectionAttempts((prev) => prev + 1);

      console.log("[WebSocket] 🌐 Creating new WebSocket connection:", {
        isDev,
        wsHost,
        protocol: wsProtocol,
        override: import.meta.env.VITE_WS_HOST,
        url: wsUrl.replace(token, "***"),
        totalAttempts: connectionAttempts + 1,
        reconnectAttempt: reconnectAttemptsRef.current,
      });

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      setReadyState(ReadyState.CONNECTING);
      setIsReady(false);

      // Set connection timeout (10 seconds)
      connectionTimeoutRef.current = setTimeout(() => {
        if (socket.readyState === WebSocket.CONNECTING) {
          console.warn(
            "[WebSocket] Connection timeout - still in CONNECTING state after 10s"
          );
          socket.close();
        }
      }, 10000);

      // Handle connection open
      socket.onopen = () => {
        // Clear connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        if (import.meta.env.DEV) {
          console.log("[WebSocket] ✓ Socket opened (readyState = OPEN)");
          console.log(
            "[WebSocket] ⏳ Waiting for global.connected message from server..."
          );
        }
        setReadyState(ReadyState.OPEN);
        // Note: We wait for 'global.connected' message before setting isReady
      };

      // Handle incoming messages
      socket.onmessage = (event) => {
        try {
          const rawMessage = JSON.parse(event.data);

          // Validate message format
          if (!isWebSocketMessage(rawMessage)) {
            console.warn("[WebSocket] Invalid message format:", rawMessage);
            return;
          }

          const { channel, type, data } = rawMessage;

          // Track received message
          wsMetrics.trackReceived();

          if (import.meta.env.DEV) {
            if (type === "stream_output") {
              const streamData = data as Record<string, unknown>;
              const message = streamData.message as Record<string, unknown> | undefined;
              console.log("[WebSocket] Stream output:", {
                messageId: message?.id,
                role: message?.role,
                contentLength: Array.isArray(message?.content) ? message.content.length : 0,
                contentTypes: Array.isArray(message?.content)
                  ? message.content.map((b: { type?: string }) => b.type).join(', ')
                  : 'N/A',
                isStreaming: message?.isStreaming,
                sessionId: streamData.sessionId,
                fullData: streamData  // Expandable full object
              });
            }
          }

          // Handle global.connected event (backward compatibility)
          if (type === "connected" && channel === "global") {
            if (import.meta.env.DEV) {
              console.log("[WebSocket] ✓ Received connected from server");
              console.log(
                "[WebSocket] ✓ Connection fully established and ready"
              );
              console.log(
                "[WebSocket] 📤 Flushing message queue:",
                messageQueueRef.current.length,
                "messages"
              );
            }
            setIsReady(true);
            reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection

            // Start heartbeat system
            startHeartbeat();

            // Flush queued messages
            const queue = messageQueueRef.current;
            messageQueueRef.current = [];
            queue.forEach(({ channel: qChannel, event: qEvent }) => {
              const msg = JSON.stringify({ channel: qChannel, ...qEvent });
              socket.send(msg);
              wsMetrics.trackSent();
              if (import.meta.env.DEV) {
                console.log("[WebSocket] Sent queued message:", {
                  channel: qChannel,
                  type: qEvent.type,
                });
              }
            });
          }

          // Handle pong response
          if (type === GlobalEventTypes.PONG && channel === "global") {
            // Clear pong timeout
            if (heartbeatTimeoutRef.current) {
              clearTimeout(heartbeatTimeoutRef.current);
              heartbeatTimeoutRef.current = null;
            }

            // Calculate and track latency
            const latency = Date.now() - lastPingTimestampRef.current;
            wsMetrics.trackLatency(latency);

            if (import.meta.env.DEV) {
              console.log("[WebSocket] Pong received, latency:", latency, "ms");
            }
          }

          // Emit event to EventBus (channel-based)
          eventBusRef.current.emit(channel, { type, data });
        } catch (error) {
          console.error("[WebSocket] Failed to parse message:", error);
        }
      };

      // Handle errors
      socket.onerror = (error) => {
        console.error("[WebSocket] Error:", error);
        eventBusRef.current.emit(Channels.global(), {
          type: GlobalEventTypes.ERROR,
          data: {
            error: "WebSocket error occurred",
            timestamp: Date.now(),
          },
        });
      };

      // Handle connection close
      socket.onclose = (event) => {
        // Stop heartbeat on close
        stopHeartbeat();

        console.log("[WebSocket] ❌ Connection closed", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          intentionalClose: intentionalCloseRef.current,
          reconnectAttempts: reconnectAttemptsRef.current,
        });

        setReadyState(ReadyState.CLOSED);
        setIsReady(false);
        socketRef.current = null;

        // Handle specific close codes
        if (event.code === 1008) {
          // 1008 = Policy Violation (typically auth failure)
          console.error("[WebSocket] Authentication failed");
          eventBusRef.current.emit(Channels.global(), {
            type: GlobalEventTypes.ERROR,
            data: {
              error: "Authentication failed",
              message: "Invalid or expired token",
              timestamp: Date.now(),
            },
          });

          toast.error("Authentication failed", {
            description: "Invalid or expired token. Please log in again.",
          });
          return; // Don't attempt to reconnect
        }

        console.log("[WebSocket] 🔍 Reconnection check:", {
          intentionalClose: intentionalCloseRef.current,
          currentAttempts: reconnectAttemptsRef.current,
          willReconnect: !intentionalCloseRef.current && reconnectAttemptsRef.current < 5,
        });

        // Attempt reconnection if not intentional close
        if (!intentionalCloseRef.current && reconnectAttemptsRef.current < 5) {
          reconnectAttemptsRef.current++; // Increment BEFORE scheduling timeout
          const attemptNumber = reconnectAttemptsRef.current;

          const delay = calculateReconnectDelay(
            attemptNumber - 1, // Use previous attempt count for delay calculation
            undefined,
            DEFAULT_MAX_RECONNECT_DELAY
          );

          console.log(
            `[WebSocket] 🔄 Scheduling reconnect attempt ${attemptNumber}/5 in ${delay}ms`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            wsMetrics.trackReconnection();

            console.log(
              `[WebSocket] ▶️ Executing reconnect attempt ${attemptNumber}/5`
            );
            connect();
          }, delay);
        } else if (
          !intentionalCloseRef.current &&
          reconnectAttemptsRef.current >= 5
        ) {
          console.error(
            "[WebSocket] ⛔ Max reconnection attempts reached:",
            reconnectAttemptsRef.current
          );

          const errorData = {
            error: "Connection lost",
            message: "Maximum reconnection attempts reached",
            timestamp: Date.now(),
          };

          eventBusRef.current.emit(Channels.global(), {
            type: GlobalEventTypes.ERROR,
            data: errorData,
          });

          toast.error("Connection lost", {
            description:
              "Maximum reconnection attempts reached. Click to retry.",
            action: {
              label: "Retry",
              onClick: () => reconnect(),
            },
          });

          // Reset intentional close flag after all reconnection attempts exhausted
          intentionalCloseRef.current = false;
        } else if (intentionalCloseRef.current) {
          console.log("[WebSocket] ⏸️ Intentional close, not reconnecting");
          // Reset intentional close flag for next connection attempt
          intentionalCloseRef.current = false;
        }
      };
    } catch (error) {
      console.error("[WebSocket] Failed to create connection:", error);
      setReadyState(ReadyState.CLOSED);
    }
  };

  /**
   * Send a message through the WebSocket
   * @param channel The channel to send to (e.g., 'session:123', 'global')
   * @param event The event object with type and data
   */
  const sendMessage = (channel: string, event: ChannelEvent) => {
    if (!socketRef.current) {
      console.warn("[WebSocket] Cannot send message: no connection");
      return;
    }

    // Queue message if not ready yet
    if (!isReady) {
      if (import.meta.env.DEV) {
        console.log("[WebSocket] Queueing message (not ready yet):", {
          channel,
          type: event.type,
        });
      }

      // Check queue size limit
      if (messageQueueRef.current.length >= MAX_QUEUE_SIZE) {
        // Drop oldest message
        const dropped = messageQueueRef.current.shift();
        console.warn(
          `[WebSocket] Queue full (${MAX_QUEUE_SIZE}), dropped oldest message:`,
          dropped
        );
      }

      messageQueueRef.current.push({ channel, event });
      return;
    }

    // Send message immediately if ready
    if (socketRef.current.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ channel, ...event });
      socketRef.current.send(message);
      wsMetrics.trackSent();

      if (import.meta.env.DEV) {
        console.log("[WebSocket] Sent:", { channel, type: event.type });
      }
    } else {
      console.warn("[WebSocket] Cannot send message: connection not open");
    }
  };

  /**
   * Manually trigger reconnection (resets attempt counter)
   */
  const reconnect = () => {
    console.log("[WebSocket] 🔄 Manual reconnect triggered");
    reconnectAttemptsRef.current = 0;

    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    connect();
  };

  /**
   * Subscribe to global errors and show toasts
   */
  useEffect(() => {
    const eventBus = eventBusRef.current;

    const handleGlobalError = (event: GlobalEvent) => {
      if (event.type === GlobalEventTypes.ERROR) {
        const { error } = event.data;

        // Only show retry button if we haven't exhausted reconnection attempts
        if (reconnectAttemptsRef.current < 5) {
          toast.error("WebSocket Error", {
            description:
              error || "An error occurred with the WebSocket connection",
            action: {
              label: "Retry",
              onClick: () => reconnect(),
            },
          });
        } else {
          toast.error(error || "WebSocket Error", {
            description:
              event.data.error ||
              "An error occurred with the WebSocket connection",
          });
        }
      }
    };

    eventBus.on<GlobalEvent>(Channels.global(), handleGlobalError);

    return () => {
      eventBus.off(Channels.global(), handleGlobalError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Connect on mount, disconnect on unmount
   */
  useEffect(() => {
    // Capture the current eventBus reference for use in cleanup
    const eventBus = eventBusRef.current;

    connect();

    return () => {
      if (import.meta.env.DEV) {
        console.log("[WebSocket] Provider unmounting, closing connection");
      }
      intentionalCloseRef.current = true;

      // Stop heartbeat
      stopHeartbeat();

      // Clear all timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      if (socketRef.current) {
        const socket = socketRef.current;

        // If socket is still connecting, wait for it to open before closing
        // This prevents the browser error "WebSocket is closed before the connection is established"
        if (socket.readyState === WebSocket.CONNECTING) {
          socket.onopen = () => {
            socket.close();
          };
          socket.onerror = () => {}; // Suppress errors during cleanup
          socket.onclose = () => {}; // Suppress close events during cleanup
          socket.onmessage = null;
        } else if (socket.readyState === WebSocket.OPEN) {
          // Socket is already open, safe to close immediately
          socket.onopen = null;
          socket.onmessage = null;
          socket.onerror = () => {}; // Suppress errors during cleanup
          socket.onclose = () => {}; // Suppress close events during cleanup
          socket.close();
        } else {
          // Socket is already closed or closing, just clean up handlers
          socket.onopen = null;
          socket.onmessage = null;
          socket.onerror = null;
          socket.onclose = null;
        }

        socketRef.current = null;
      }

      // Clear all event listeners
      eventBus.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // Reconnect when token changes

  const contextValue: WebSocketContextValue = {
    sendMessage,
    readyState,
    isConnected,
    isReady,
    connectionAttempts,
    eventBus: eventBusRef.current,
    reconnect,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}
