import { useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSessionStore } from "@/client/pages/projects/sessions/stores/sessionStore";
import { useWebSocket } from "@/client/hooks/useWebSocket";
import type { UnifiedContent, PermissionMode, AgentType } from "@repo/agent-cli-sdk";
import {
  SessionEventTypes,
  type SessionEvent,
} from "@/shared/types/websocket.types";
import { Channels } from "@/shared/websocket";
import { sessionKeys } from "./useAgentSessions";
import { generateUUID } from "@/client/utils/cn";
import { projectKeys } from "@/client/pages/projects/hooks/useProjects";
import type { ProjectWithSessions } from "@/shared/types/project.types";

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

  const queryClient = useQueryClient();

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

          // Get current session and messages
          const store = useSessionStore.getState();
          const session = store.session;

          if (!session?.messages.length) {
            return;
          }

          // If usage data is provided, attach it to the last assistant message
          if (data.usage) {
            const messages = [...session.messages];
            const lastMessageIndex = messages.length - 1;
            const lastMessage = messages[lastMessageIndex];

            if (lastMessage.role === "assistant") {
              // Create updated message with usage data
              messages[lastMessageIndex] = {
                ...lastMessage,
                usage: data.usage,
                isStreaming: false,
              };

              // Update store with new messages array
              useSessionStore.setState({
                session: {
                  ...session,
                  messages,
                  isStreaming: false,
                },
              });
            }
          } else {
            // No usage data, just finalize the message
            store.finalizeMessage(sessionIdRef.current);
          }

          // Update metadata if provided (for other fields like model, stop_reason)
          if (data.metadata) {
            store.updateMetadata(data.metadata);
          }

          // Invalidate sessions query to update sidebar with new metadata
          queryClient.invalidateQueries({
            queryKey: sessionKeys.byProject(projectIdRef.current),
          });
          break;
        }

        case SessionEventTypes.SESSION_UPDATED: {
          const data = event.data;
          console.log("[useSessionWebSocket] session.updated received:", data);

          // Update cached session data directly (no refetch)
          queryClient.setQueryData<ProjectWithSessions[]>(
            projectKeys.withSessions(),
            (old) => {
              if (!old) return old;

              return old.map((project) => {
                // Find project containing this session
                if (project.id !== projectIdRef.current) return project;

                // Update the matching session
                return {
                  ...project,
                  sessions: project.sessions.map((session) =>
                    session.id === sessionIdRef.current
                      ? {
                          ...session,
                          state: data.state ?? session.state,
                          error_message: data.error_message ?? session.error_message,
                          metadata: (data.metadata as unknown as typeof session.metadata) ?? session.metadata,
                          name: data.name ?? session.name,
                          updated_at: data.updated_at
                            ? new Date(data.updated_at)
                            : session.updated_at,
                        }
                      : session
                  ),
                };
              });
            }
          );

          // Sync sessionStore with database state
          if (data.state === "error") {
            // Session failed - stop streaming and show error
            useSessionStore.getState().setStreaming(false);
            useSessionStore
              .getState()
              .setError(data.error_message || "An error occurred");
          } else if (data.state === "idle") {
            // Session completed or cancelled - stop streaming and clear error
            useSessionStore.getState().setStreaming(false);
            useSessionStore.getState().setError(null);
          } else if (data.state === "working") {
            // Session started - begin streaming
            useSessionStore.getState().setStreaming(true);
            useSessionStore.getState().setError(null);
          }

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

          // Add error message to store
          useSessionStore.getState().addMessage({
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

          // Set error in store
          useSessionStore
            .getState()
            .setError(data.message || data.error || "An error occurred");
          useSessionStore.getState().setStreaming(false);
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
    [queryClient]
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
        type: "subscribe" as const,
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
        type: "send_message" as const,
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
    useSessionStore.getState().addMessage({
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
    useSessionStore.getState().setStreaming(false);
  }, [sendWsMessage]);

  return {
    readyState,
    isConnected,
    sendMessage,
    killSession,
  };
}
