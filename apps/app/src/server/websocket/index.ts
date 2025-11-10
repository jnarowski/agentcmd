import type { FastifyInstance } from "fastify";
import type { JWTPayload } from "@/server/utils/auth";
import { sendMessage } from "./infrastructure/send-message";
import { wsMetrics } from "./infrastructure/metrics";
import { activeSessions } from "./infrastructure/active-sessions";
import { reconnectionManager } from "./infrastructure/reconnection";
import { handleSessionEvent } from "./handlers/session.handler";
import { handleShellEvent } from "./handlers/shell.handler";
import { handleGlobalEvent } from "./handlers/global.handler";
import { unsubscribeAll } from "./infrastructure/subscriptions";
import { GlobalEventTypes } from "@/shared/types/websocket.types";
import { Channels } from "@/shared/websocket";

/**
 * Register unified WebSocket endpoint
 */
export async function registerWebSocket(
  fastify: FastifyInstance
): Promise<void> {
  fastify.register(async (fastify) => {
    // Unified WebSocket endpoint with JWT authentication
    fastify.get("/ws", { websocket: true }, async (socket, request) => {
      let userId: string | null = null;

      try {
        fastify.log.info("[WebSocket] New connection attempt");

        // Authenticate the WebSocket connection using JWT
        try {
          // Get token from query params (browser WebSocket doesn't support custom headers)
          const query = request.query as { token?: string };
          const token =
            query.token ||
            request.headers.authorization?.replace("Bearer ", "");

          if (!token) {
            sendMessage(socket, Channels.global(), {
              type: GlobalEventTypes.ERROR,
              data: {
                error: "Authentication required",
                message: "No authentication token provided",
              },
            });
            socket.close(1008, "Authentication required"); // 1008 = Policy Violation
            return;
          }

          // Verify JWT token
          const decoded = fastify.jwt.verify<JWTPayload>(token);
          userId = decoded.userId;

          fastify.log.info({ userId }, "[WebSocket] Client authenticated");

          // Record connection metric
          wsMetrics.recordConnection();

          // Send CONNECTED event to signal client is ready
          sendMessage(socket, Channels.global(), {
            type: GlobalEventTypes.CONNECTED,
            data: {
              timestamp: Date.now(),
              userId,
            },
          });
        } catch (err: unknown) {
          fastify.log.error({ err }, "[WebSocket] Authentication failed");
          wsMetrics.recordError();

          const errorMessage =
            err instanceof Error ? err.message : "Invalid or expired token";
          sendMessage(socket, Channels.global(), {
            type: GlobalEventTypes.ERROR,
            data: {
              error: "Authentication failed",
              message: errorMessage,
            },
          });
          socket.close(1008, "Authentication failed"); // 1008 = Policy Violation
          return;
        }

        // Handle incoming messages
        socket.on(
          "message",
          async (message: Buffer | ArrayBuffer | Buffer[]) => {
            try {
              wsMetrics.recordMessageReceived();

              const messageStr = Buffer.isBuffer(message)
                ? message.toString()
                : Array.isArray(message)
                  ? Buffer.concat(message).toString()
                  : new TextDecoder().decode(message);

              const parsed = JSON.parse(messageStr);

              // Phoenix Channels format: {channel, type, data}
              const { channel, type, data } = parsed;

              fastify.log.info(
                { channel, type, userId },
                "[WebSocket] Received message"
              );

              // Route based on channel
              if (channel?.startsWith("session:")) {
                await handleSessionEvent(socket, channel, type, data, userId!, fastify);
              } else if (channel?.startsWith("shell:")) {
                await handleShellEvent(socket, channel, type, data, userId!, fastify);
              } else if (channel?.startsWith("project:")) {
                // Project channels are used for workflow events (broadcast-only)
                // Route subscribe/unsubscribe to global handler
                await handleGlobalEvent(socket, channel, type, data, userId!, fastify);
              } else if (channel === "global") {
                await handleGlobalEvent(socket, channel, type, data, userId!, fastify);
              } else {
                // Unknown channel
                sendMessage(socket, Channels.global(), {
                  type: GlobalEventTypes.ERROR,
                  data: {
                    error: "Unknown channel",
                    message: `Invalid channel format: ${channel}`,
                  },
                });
              }

              wsMetrics.recordMessageSent();
            } catch (err: unknown) {
              fastify.log.error(
                { err },
                "[WebSocket] Error processing message"
              );
              wsMetrics.recordError();

              const errorMessage =
                err instanceof Error ? err.message : "Malformed message";
              sendMessage(socket, Channels.global(), {
                type: GlobalEventTypes.ERROR,
                data: {
                  error: "Failed to process message",
                  message: errorMessage,
                },
              });
            }
          }
        );

        // Handle disconnection
        socket.on("close", () => {
          fastify.log.info({ userId }, "[WebSocket] Client disconnected");
          wsMetrics.recordDisconnection();

          // Unsubscribe from all channels
          unsubscribeAll(socket);
          fastify.log.debug({ userId }, "[WebSocket] Unsubscribed from all channels");

          // Schedule cleanup with 30-second grace period for reconnection
          for (const [sessionId, sessionData] of activeSessions.entries()) {
            if (sessionData.userId === userId) {
              fastify.log.info(
                { sessionId, userId },
                "[WebSocket] Scheduling session cleanup (30s grace period)"
              );

              reconnectionManager.scheduleCleanup(sessionId, async () => {
                fastify.log.info(
                  { sessionId, userId },
                  "[WebSocket] Executing scheduled cleanup (no reconnect)"
                );
                await activeSessions.cleanup(sessionId, fastify.log);
              });
            }
          }
        });

        // Handle errors
        socket.on("error", (err: Error) => {
          fastify.log.error({ err, userId }, "[WebSocket] Socket error");
          wsMetrics.recordError();

          // Unsubscribe from all channels
          unsubscribeAll(socket);
          fastify.log.debug({ userId }, "[WebSocket] Unsubscribed from all channels on error");

          // Clean up immediately on error (no grace period)
          for (const [sessionId, sessionData] of activeSessions.entries()) {
            if (sessionData.userId === userId) {
              activeSessions
                .cleanup(sessionId, fastify.log)
                .catch((cleanupErr) => {
                  fastify.log.warn(
                    { err: cleanupErr, sessionId },
                    "Failed to clean up session on error"
                  );
                });
            }
          }
        });
      } catch (err) {
        fastify.log.error(
          { err },
          "[WebSocket] Fatal error in WebSocket handler"
        );
        wsMetrics.recordError();
        socket.close();
      }
    });
  });
}

// Export active sessions and reconnection manager for graceful shutdown
export { activeSessions, reconnectionManager };
