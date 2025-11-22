import { useEffect, useCallback, useRef } from "react";
import { useSessionStore } from "@/client/pages/projects/sessions/stores/sessionStore";
import { useWebSocket } from "@/client/hooks/useWebSocket";
import type { UnifiedContent, PermissionMode, AgentType } from "agent-cli-sdk";
import {
  SessionEventTypes,
  type SessionEvent,
} from "@/shared/types/websocket.types";
import { Channels } from "@/shared/websocket";
import { generateUUID } from "@/client/utils/cn";

interface UseSessionWebSocketOptions {
  sessionId: string;
  projectId: string;
}

interface SessionConfig {
  resume?: boolean;
  sessionId?: string;
  permissionMode?: PermissionMode;
  agentType?: AgentType;
  [key: string]: unknown;
}

/**
 * Hook to manage WebSocket events for sessions using Phoenix Channels pattern
 * Subscribes to session channel and handles events with exhaustive type checking
 * Uses the global WebSocketProvider connection and EventBus
 * All message state is managed by sessionStore
 */
export function useSessionWebSocket({
  sessionId,
  projectId,
}: UseSessionWebSocketOptions) {
  const {
    sendMessage: sendWsMessage,
    readyState,
    isConnected,
    eventBus,
  } = useWebSocket();

  // Refs to avoid recreating callbacks
  const sessionIdRef = useRef(sessionId);
  const projectIdRef = useRef(projectId);

  useEffect(() => {
    sessionIdRef.current = sessionId;
    projectIdRef.current = projectId;
  }, [sessionId, projectId]);

  /**
   * Handle SessionEvent with exhaustive type checking
   */
  const handleEvent = useCallback(
    (event: SessionEvent) => {
      switch (event.type) {
        case SessionEventTypes.STREAM_OUTPUT: {
          const { message } = event.data;

          // SDK already provides clean UnifiedMessage
          if (message) {
            // Validate content before updating
            const content = message.content;
            if (!Array.isArray(content)) {
              console.error(
                "[useSessionWebSocket] Message content is not an array:",
                message
              );
              return;
            }

            // Check for empty content blocks
            const emptyTextBlocks = content.filter(
              (block) =>
                typeof block !== 'string' &&
                block.type === "text" &&
                (!block.text || block.text.trim() === "")
            );
            if (emptyTextBlocks.length > 0) {
              console.warn(
                "[useSessionWebSocket] Message contains",
                emptyTextBlocks.length,
                "empty text blocks"
              );
            }

            if (content.length === 0) {
              console.warn(
                "[useSessionWebSocket] Message has EMPTY content array"
              );
            }

            useSessionStore
              .getState()
              .updateStreamingMessage(
                sessionIdRef.current,
                message.id,
                content as UnifiedContent[]
              );
          } else {
            console.warn(
              "[useSessionWebSocket] stream_output received without message"
            );
          }
          break;
        }

        case SessionEventTypes.MESSAGE_COMPLETE: {
          const data = event.data;
          console.log("[useSessionWebSocket] message_complete received:", data);

          // Use full session payload from WebSocket (Phase 0) to update Map
          if (data.session) {
            // Full session provided by backend - update Map directly
            useSessionStore.getState().setSession(sessionIdRef.current, data.session);

            // Also update session in list (for sidebar)
            useSessionStore.getState().updateSessionInList(projectIdRef.current, data.session);
          } else {
            // Fallback: No full session, finalize message manually
            if (data.messageId) {
              const store = useSessionStore.getState();
              store.finalizeMessage(sessionIdRef.current, data.messageId);
            }

            // Update metadata if provided
            if (data.metadata) {
              // Note: updateMetadata not in new store API, metadata comes from full session
              console.warn("[useSessionWebSocket] Metadata received but no full session - ignoring");
            }
          }

          // Explicitly clear streaming state (setSession preserves client state)
          useSessionStore.getState().setStreaming(sessionIdRef.current, false);

          // No React Query invalidations needed - Zustand is single source of truth
          break;
        }

        case SessionEventTypes.SESSION_UPDATED: {
          const data = event.data;
          console.log("[useSessionWebSocket] session.updated received:", data);

          // Use full session payload from WebSocket (Phase 0) to update Map
          if (data.session) {
            // Full session provided by backend - update Map directly
            useSessionStore.getState().setSession(sessionIdRef.current, data.session);

            // Also update session in list (for sidebar)
            useSessionStore.getState().updateSessionInList(projectIdRef.current, data.session);
          } else {
            // Fallback: No full session, log warning (should not happen after Phase 0)
            console.warn("[useSessionWebSocket] SESSION_UPDATED received without full session payload");
          }

          // No React Query invalidations needed - Zustand is single source of truth
          break;
        }

        case SessionEventTypes.ERROR: {
          const data = event.data;
          console.error(
            "[useSessionWebSocket] Error from server:",
            data.message,
            data.error
          );

          // Build error message with optional details
          const errorMessage = data.message || data.error || "An error occurred";
          const details =
            typeof data === "object" &&
            data !== null &&
            "details" in data &&
            data.details !== undefined
              ? `\n\nDetails: ${JSON.stringify(data.details, null, 2)}`
              : "";

          // Add error message to session in Map
          useSessionStore.getState().addMessage(sessionIdRef.current, {
            id: generateUUID(),
            role: "assistant",
            content: [
              {
                type: "text",
                text: `Error: ${errorMessage}${details}`,
              },
            ],
            timestamp: Date.now(),
            isError: true,
            _original: undefined,
          });

          // Set error in session in Map
          const session = useSessionStore.getState().sessions.get(sessionIdRef.current);
          if (session) {
            useSessionStore.getState().sessions.set(sessionIdRef.current, {
              ...session,
              error: errorMessage,
              isStreaming: false,
            });
          }
          break;
        }

        case SessionEventTypes.SUBSCRIBE_SUCCESS: {
          console.log(
            "[useSessionWebSocket] Successfully subscribed to session channel"
          );
          break;
        }

        default: {
          // Exhaustive checking - TypeScript will error if we miss a case
          const _exhaustive: never = event;
          console.warn(
            "[useSessionWebSocket] Unknown event type:",
            _exhaustive
          );
        }
      }
    },
    [] // No dependencies - all state access via getState()
  );

  /**
   * Subscribe to session channel via EventBus (Phoenix Channels pattern)
   */
  useEffect(() => {
    if (!sessionId) return;

    const channel = Channels.session(sessionId);

    // Subscribe to session channel on backend
    if (isConnected) {
      sendWsMessage(channel, {
        type: SessionEventTypes.SUBSCRIBE,
        data: { sessionId },
      });
    }

    // Subscribe to channel events via EventBus
    eventBus.on<SessionEvent>(channel, handleEvent);

    // Cleanup subscriptions on unmount or sessionId change
    return () => {
      eventBus.off(channel, handleEvent);
    };
  }, [sessionId, isConnected, eventBus, sendWsMessage, handleEvent]);

  /**
   * Send a message via WebSocket using Phoenix Channels pattern
   */
  const sendMessage = useCallback(
    (message: string, images?: string[], config?: SessionConfig) => {
      const currentSessionId = sessionIdRef.current;

      if (!currentSessionId) {
        console.error(
          "[useSessionWebSocket] Cannot send message: no sessionId"
        );
        return;
      }

      const channel = Channels.session(currentSessionId);

      // Send message event to session channel
      sendWsMessage(channel, {
        type: SessionEventTypes.SEND_MESSAGE,
        data: {
          message,
          images,
          config,
        },
      });
    },
    [sendWsMessage]
  );

  /**
   * Kill the running agent session
   * Sends cancel event and updates UI immediately
   */
  const killSession = useCallback(() => {
    const currentSessionId = sessionIdRef.current;

    if (!currentSessionId) {
      console.error("[useSessionWebSocket] Cannot kill session: no sessionId");
      return;
    }

    const channel = Channels.session(currentSessionId);

    // Send cancel event to backend
    sendWsMessage(channel, {
      type: SessionEventTypes.CANCEL,
      data: { sessionId: currentSessionId },
    });

    // Add system message to UI
    useSessionStore.getState().addMessage(currentSessionId, {
      id: generateUUID(),
      role: "user",
      content: [
        {
          type: "text",
          text: "🛑 Session interrupted",
        },
      ],
      timestamp: Date.now(),
      _original: undefined,
    });

    // Update streaming state
    useSessionStore.getState().setStreaming(currentSessionId, false);
  }, [sendWsMessage]);

  return {
    readyState,
    isConnected,
    sendMessage,
    killSession,
  };
}
