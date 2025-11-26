import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { toast } from "sonner";
import { WebSocketEventBus } from "@/client/utils/WebSocketEventBus";
import { wsMetrics } from "@/client/utils/WebSocketMetrics";
import {
  bindOpenHandler,
  bindCloseHandler,
  bindMessageHandler,
  bindErrorHandler,
  clearReconnectTimeout,
  clearConnectionTimeout,
} from "@/client/utils/websocketHandlers";
import {
  startHeartbeat as startHeartbeatMonitoring,
  stopHeartbeat as stopHeartbeatMonitoring,
} from "@/client/utils/websocketHeartbeat";
import { ReadyState, GlobalEventTypes, SessionEventTypes, type ChannelEvent, type GlobalEvent } from "@/shared/types/websocket.types";
import { useAuthStore } from "@/client/stores/authStore";
import {
  WebSocketContext,
  type WebSocketContextValue,
} from "@/client/contexts/WebSocketContext";
import {
  Channels,
  isWebSocketMessage,
} from "@/shared/websocket";
import { isDebugMode } from "@/client/utils/isDebugMode";

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
 * WebSocketProvider
 *
 * Manages a single global WebSocket connection following Phoenix Channels pattern.
 * - Channel-based subscriptions via EventBus
 * - Heartbeat system (interval-based checking, not ping/pong)
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

  // Reconnection state - single source of truth
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalCloseRef = useRef(false);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Heartbeat state - interval-based checking
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageTimeRef = useRef<number>(Date.now());

  const isConnected = readyState === ReadyState.OPEN && isReady;

  /**
   * Start heartbeat monitoring
   */
  const startHeartbeat = () => {
    stopHeartbeatMonitoring(heartbeatIntervalRef);

    if (socketRef.current) {
      startHeartbeatMonitoring({
        socket: socketRef.current,
        lastMessageTimeRef,
        heartbeatIntervalRef,
      });
    }
  };

  /**
   * Stop heartbeat monitoring
   */
  const stopHeartbeat = () => {
    stopHeartbeatMonitoring(heartbeatIntervalRef);
  };

  /**
   * Connect to WebSocket server
   */
  const connect = () => {
    console.log("[WebSocket] 🔌 connect() called", {
      hasToken: !!token,
      currentState: readyState,
      reconnectAttempts: reconnectAttemptRef.current,
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

      // Clear any pending reconnection timeout
      clearReconnectTimeout(reconnectTimeoutRef);

      socketRef.current.close();
      socketRef.current = null;
    }

    try {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";

      // Allow override via VITE_WS_HOST for VPN/remote access
      // Examples: "10.0.1.100:4100", "vpn.example.com:4100"
      // In dev, Vite proxy forwards /ws to backend port
      const wsHost =
        import.meta.env.VITE_WS_HOST ||
        window.location.host;
      const wsUrl = `${wsProtocol}//${wsHost}/ws?token=${token}`;

      console.log("[WebSocket] 🌐 Creating new WebSocket connection:", {
        wsHost,
        protocol: wsProtocol,
        override: import.meta.env.VITE_WS_HOST,
        url: wsUrl.replace(token, "***"),
        reconnectAttempt: reconnectAttemptRef.current,
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

      // Bind handlers using extracted functions
      const handlerParams = {
        socket,
        eventBus: eventBusRef.current,
        reconnectAttemptRef,
        reconnectTimeoutRef,
        connectionTimeoutRef,
        lastMessageTimeRef,
        intentionalCloseRef,
        setReadyState,
        setIsReady,
        onStartHeartbeat: startHeartbeat,
        onStopHeartbeat: stopHeartbeat,
        onReconnect: connect,
        onReconnectStop: () => {
          // Called when max reconnection attempts reached
          // No action needed - handler already emits error event
        },
      };

      socket.onopen = bindOpenHandler(handlerParams);
      socket.onerror = bindErrorHandler(handlerParams);
      socket.onclose = bindCloseHandler(handlerParams);

      // Handle incoming messages
      const baseMessageHandler = bindMessageHandler(handlerParams);
      socket.onmessage = (event) => {
        // Update last message time
        baseMessageHandler();

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

          if (isDebugMode()) {
            if (type === SessionEventTypes.STREAM_OUTPUT) {
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

          // Handle global.connected event
          if (type === GlobalEventTypes.CONNECTED && channel === "global") {
            if (isDebugMode()) {
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

            // Start heartbeat monitoring
            startHeartbeat();

            // Flush queued messages
            const queue = messageQueueRef.current;
            messageQueueRef.current = [];
            queue.forEach(({ channel: qChannel, event: qEvent }) => {
              const msg = JSON.stringify({ channel: qChannel, ...qEvent });
              socket.send(msg);
              wsMetrics.trackSent();
              if (isDebugMode()) {
                console.log("[WebSocket] Sent queued message:", {
                  channel: qChannel,
                  type: qEvent.type,
                });
              }
            });
          }

          // Emit event to EventBus (channel-based)
          eventBusRef.current.emit(channel, { type, data });
        } catch (error) {
          console.error("[WebSocket] Failed to parse message:", error);
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
  const sendMessage = useCallback(
    (channel: string, event: ChannelEvent) => {
      if (!socketRef.current) {
        console.warn("[WebSocket] Cannot send message: no connection");
        return;
      }

      // Queue message if not ready yet
      if (!isReady) {
        if (isDebugMode()) {
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

        if (isDebugMode()) {
          console.log("[WebSocket] Sent:", { channel, type: event.type });
        }
      } else {
        console.warn("[WebSocket] Cannot send message: connection not open");
      }
    },
    [isReady]
  );

  /**
   * Manually trigger reconnection (resets attempt counter)
   */
  const reconnect = useCallback(() => {
    console.log("[WebSocket] 🔄 Manual reconnect triggered");
    reconnectAttemptRef.current = 0;

    // Clear any pending reconnect timeout
    clearReconnectTimeout(reconnectTimeoutRef);

    connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // connect() is stable within component lifecycle

  /**
   * Subscribe to global errors and show toasts
   */
  useEffect(() => {
    const eventBus = eventBusRef.current;

    const handleGlobalError = (event: GlobalEvent) => {
      if (event.type === GlobalEventTypes.ERROR) {
        const { error } = event.data;

        // Only show retry button if we haven't exhausted reconnection attempts
        if (reconnectAttemptRef.current < 5) {
          toast.error("WebSocket disconnected", {
            description: error || "Connection lost",
            action: {
              label: "Connect",
              onClick: () => reconnect(),
            },
          });
        } else {
          toast.error(error || "WebSocket disconnected", {
            description: event.data.error || "Connection lost",
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
      if (isDebugMode()) {
        console.log("[WebSocket] Provider unmounting, closing connection");
      }
      intentionalCloseRef.current = true;

      // Stop heartbeat
      stopHeartbeat();

      // Clear all timeouts
      clearReconnectTimeout(reconnectTimeoutRef);
      clearConnectionTimeout(connectionTimeoutRef);

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

  // Auto-reconnect when app regains focus (mobile background/foreground, desktop tab switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only reconnect if:
      // 1. Page became visible (not hidden)
      // 2. Connection is closed
      // 3. Not an intentional disconnect
      if (
        document.visibilityState === "visible" &&
        readyState === ReadyState.CLOSED &&
        !intentionalCloseRef.current
      ) {
        console.log("[WebSocket] 📱 App refocused, attempting reconnection");
        reconnect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [readyState, reconnect]);

  const contextValue: WebSocketContextValue = {
    sendMessage,
    readyState,
    isConnected,
    isReady,
    reconnectAttempt: reconnectAttemptRef.current,
    eventBus: eventBusRef.current,
    reconnect,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}
