import { useEffect, useRef, useCallback, useState } from 'react';
import { useShell } from "@/client/pages/projects/shell/contexts/ShellContext";
import { getAuthToken } from '@/client/utils/auth';
import {
  ShellEventTypes,
  type ShellEvent,
} from '@/shared/types/websocket.types';
import { isShellEvent } from '@/shared/websocket';
import { getReconnectDelay } from '@/client/utils/websocketHandlers';

interface UseShellWebSocketOptions {
  sessionId: string;
  projectId: string;
  enabled?: boolean;
  onOutput?: (data: string) => void;
  onExit?: (exitCode: number, signal?: number) => void;
}

/**
 * Hook to manage WebSocket connection for shell/terminal sessions using Phoenix Channels pattern.
 *
 * **Why Shell Uses a Separate WebSocket:**
 *
 * The shell WebSocket connection is intentionally separate from the global WebSocketProvider
 * for several important architectural reasons:
 *
 * 1. **Protocol Requirements**: PTY (pseudo-terminal) streams require high-frequency,
 *    low-latency bidirectional communication. Unlike session chat which sends occasional
 *    messages, terminal I/O can send hundreds of events per second (keystroke echo, output
 *    streaming, escape sequences).
 *
 * 2. **Lifecycle Management**: Shell sessions are ephemeral - they spawn on demand and die
 *    when the terminal exits. This lifecycle is independent of the main WebSocket connection
 *    which should persist across page navigations.
 *
 * 3. **Isolation Benefits**: If a shell process crashes or hangs, it won't affect the main
 *    application WebSocket. Session chat, file operations, and other features remain functional
 *    even if a terminal session has issues.
 *
 * 4. **Optimization**: Terminal data doesn't need the same processing pipeline as session
 *    events. No message enrichment, tool matching, or complex state management required -
 *    just raw PTY I/O forwarding.
 *
 * **Shared Patterns:**
 *
 * While the connection is separate, this hook shares architectural patterns with the main
 * WebSocket system:
 * - Uses ShellEventTypes constants (no magic strings)
 * - Exhaustive type checking with discriminated unions
 * - Shared reconnection strategy (calculateReconnectDelay)
 * - Same authentication mechanism (JWT in query params)
 *
 * For complete details on the WebSocket architecture, see: `.agent/docs/websockets.md`
 */
export function useShellWebSocket({
  sessionId,
  projectId,
  enabled = true,
  onOutput,
  onExit,
}: UseShellWebSocketOptions) {
  const { updateSessionStatus, updateSession } = useShell();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const connect = useCallback(
    (cols: number, rows: number) => {
      if (!enabled || wsRef.current) return;

      const token = getAuthToken();
      if (!token) {
        updateSessionStatus(sessionId, 'error', 'No authentication token found');
        return;
      }

      updateSessionStatus(sessionId, 'connecting');

      // Create WebSocket connection with token in query params
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

      // Allow override via VITE_WS_HOST for VPN/remote access
      // In dev, Vite proxy forwards /shell to backend port
      const wsHost = import.meta.env.VITE_WS_HOST || window.location.host;
      const wsUrl = `${protocol}//${wsHost}/shell?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (import.meta.env.DEV) {
          console.log('[Shell] WebSocket connected');
        }
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Send init message to spawn shell (flat structure for client→server)
        ws.send(
          JSON.stringify({
            type: ShellEventTypes.INIT,
            projectId,
            cols,
            rows,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);

          // Validate it's a shell event
          if (!isShellEvent(parsed)) {
            console.warn('[Shell] Received non-shell event:', parsed);
            return;
          }

          const shellEvent = parsed as ShellEvent;

          // Handle event with exhaustive type checking
          switch (shellEvent.type) {
            case ShellEventTypes.INIT: {
              if (!shellEvent.data) {
                console.warn('[Shell] INIT event missing data');
                break;
              }
              const { shellId } = shellEvent.data;
              if (import.meta.env.DEV) {
                console.log('[Shell] Session initialized:', shellId);
              }
              updateSession(sessionId, { sessionId: shellId });
              updateSessionStatus(sessionId, 'connected');
              break;
            }

            case ShellEventTypes.OUTPUT: {
              if (!shellEvent.data) {
                console.warn('[Shell] OUTPUT event missing data');
                break;
              }
              const { data } = shellEvent.data;
              if (onOutput) {
                onOutput(data);
              }
              break;
            }

            case ShellEventTypes.EXIT: {
              if (!shellEvent.data) {
                console.warn('[Shell] EXIT event missing data');
                break;
              }
              const { code } = shellEvent.data;
              if (import.meta.env.DEV) {
                console.log('[Shell] Process exited:', { code });
              }
              if (onExit) {
                // onExit expects exitCode and signal, but we only have code
                onExit(code, undefined);
              }
              break;
            }

            case ShellEventTypes.ERROR: {
              if (!shellEvent.data) {
                console.warn('[Shell] ERROR event missing data');
                updateSessionStatus(sessionId, 'error', 'Unknown error');
                break;
              }
              const { error } = shellEvent.data;
              console.error('[Shell] Error:', error);
              updateSessionStatus(sessionId, 'error', error);
              break;
            }

            case ShellEventTypes.RESIZE: {
              // Resize acknowledgment - can be used for logging if needed
              if (import.meta.env.DEV) {
                console.log('[Shell] Resize acknowledged');
              }
              break;
            }

            case ShellEventTypes.INPUT: {
              // Input echo/acknowledgment - typically not needed on client
              break;
            }

            default: {
              // Exhaustive checking - TypeScript will error if we miss a case
              const _exhaustive: never = shellEvent;
              console.warn('[Shell] Unknown event type:', _exhaustive);
            }
          }
        } catch (error) {
          console.error('[Shell] Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[Shell] WebSocket error:', error);
        updateSessionStatus(sessionId, 'error', 'WebSocket connection error');
      };

      ws.onclose = (event) => {
        if (import.meta.env.DEV) {
          console.log('[Shell] WebSocket closed', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
          });
        }
        setIsConnected(false);
        wsRef.current = null;
        updateSessionStatus(sessionId, 'disconnected');

        // Attempt reconnection if not too many attempts
        if (
          enabled &&
          reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
        ) {
          const delay = getReconnectDelay(reconnectAttemptsRef.current);
          reconnectAttemptsRef.current++;
          if (import.meta.env.DEV) {
            console.log(
              `[Shell] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
            );
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            connect(cols, rows);
          }, delay);
        }
      };
    },
    [enabled, sessionId, projectId, updateSessionStatus, updateSession, onOutput, onExit]
  );

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
      updateSessionStatus(sessionId, 'disconnected');
    }
  }, [sessionId, updateSessionStatus]);

  const sendInput = useCallback((data: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: ShellEventTypes.INPUT,
          data, // Flat structure for client→server
        })
      );
    }
  }, []);

  const sendResize = useCallback((cols: number, rows: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: ShellEventTypes.RESIZE,
          cols,
          rows, // Flat structure for client→server
        })
      );
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    connect,
    disconnect,
    sendInput,
    sendResize,
  };
}
