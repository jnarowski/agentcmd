import type { WebSocket } from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
import { prisma } from "@/shared/prisma";
import type { SessionSendMessageData } from "../types";
import { sendMessage } from "../infrastructure/send-message";
import { activeSessions } from "../infrastructure/active-sessions";
import {
  validateSessionOwnership,
  extractUsageFromEvents,
  executeAgent,
  processImageUploads,
  generateSessionName,
  updateSessionState,
  handleExecutionFailure,
  storeCliSessionId,
  cleanupSessionImages,
  validateAgentSupported,
  parseExecutionConfig,
  cancelSession,
  type AgentExecuteResult,
} from "@/server/domain/session/services";
import { toSessionResponse } from "@/server/domain/session/utils";
import { broadcast, subscribe, unsubscribe } from "../infrastructure/subscriptions";
import {
  SessionEventTypes,
  GlobalEventTypes,
} from "@/shared/types/websocket.types";
import { Channels, parseChannel } from "@/shared/websocket";

// ============================================================================
// Public API - Session Event Handlers
// ============================================================================

/**
 * Handle session send_message event
 *
 * Main entry point for processing user messages sent to an agent session.
 * Orchestrates the entire message handling flow including image uploads,
 * agent execution, and post-processing tasks.
 */
export async function handleSessionSendMessage(
  socket: WebSocket,
  sessionId: string,
  data: SessionSendMessageData,
  userId: string,
  fastify: FastifyInstance
): Promise<void> {
  fastify.log.info(
    { sessionId, userId, message: data.message },
    "[WebSocket] ===== handleSessionSendMessage ENTRY POINT ====="
  );

  // Auto-subscribe socket to session channel
  const channel = Channels.session(sessionId);
  subscribe(channel, socket);
  fastify.log.debug(
    { sessionId, channel },
    "[WebSocket] Auto-subscribed to session channel"
  );

  // Verify user owns session
  const session = await validateSessionOwnership({ sessionId, userId });
  const projectPath = session.project.path;

  // Get or create session data for temp image tracking
  const sessionData = activeSessions.getOrCreate(sessionId, {
    projectPath,
    userId,
  });

  // Process image uploads (domain function)
  const { imagePaths } = await processImageUploads({
    images: data.images,
    projectPath: sessionData.projectPath,
    sessionId
  });

  // Validate agent is supported
  const validation = await validateAgentSupported({ agent: session.agent });
  if (!validation.supported) {
    broadcast(Channels.session(sessionId), {
      type: SessionEventTypes.ERROR,
      data: {
        error: validation.error || "Unsupported agent",
        sessionId,
        code: "UNSUPPORTED_AGENT",
      },
    });
    await cleanupSessionImages({ sessionId });
    return;
  }

  // Parse execution configuration
  const config = await parseExecutionConfig({ config: data.config });

  fastify.log.info(
    { sessionId, cliSessionId: session.cli_session_id, resume: config.resume },
    "[WebSocket] Executing with session ID"
  );

  // Set session state to working
  await updateSessionState({
    id: sessionId,
    data: { state: "working" },
    shouldBroadcast: false,
  });

  // Execute agent command
  fastify.log.info(
    { sessionId, agent: session.agent, message: data.message },
    "[WebSocket] About to execute agent command"
  );

  const result = await executeAgent({
    agent: session.agent as "claude" | "codex",
    prompt: data.message,
    workingDir: projectPath,
    processTrackingId: sessionId, // Always track by DB session ID
    sessionId: session.cli_session_id!, // CLI session ID (always set now)
    resume: config.resume,
    permissionMode: config.permissionMode,
    model: config.model,
    images:
      imagePaths.length > 0 ? imagePaths.map((path) => ({ path })) : undefined,
    onEvent: ({ message }) => {
      if (message && typeof message === "object" && message !== null) {
        broadcast(Channels.session(sessionId), {
          type: SessionEventTypes.STREAM_OUTPUT,
          data: {
            message,
            sessionId,
          },
        });
      }
    },
  });

  fastify.log.info(
    { sessionId, success: result.success },
    "[WebSocket] Agent command execution completed"
  );

  // Handle execution failure
  if (!result.success) {
    fastify.log.warn(
      { sessionId, error: result.error },
      "[WebSocket] Execution failed, skipping post-processing"
    );
    await handleExecutionFailure({ sessionId, result, shouldBroadcast: true });
    await cleanupSessionImages({ sessionId });
    return;
  }

  fastify.log.info(
    { sessionId },
    "[WebSocket] Execution succeeded, proceeding to post-processing"
  );

  // Post-processing: Store CLI session ID, generate name, extract usage
  fastify.log.info(
    { sessionId, existingSessionName: session.name, hasName: !!session.name },
    "[WebSocket] Starting post-processing tasks"
  );
  await performPostProcessingTasks(
    sessionId,
    session.name,
    data.message,
    result,
    fastify
  );

  // Set session state to idle (successful completion)
  await updateSessionState({
    id: sessionId,
    data: { state: "idle" },
    shouldBroadcast: false,
  });

  // Query full session for MESSAGE_COMPLETE broadcast
  const fullSession = await prisma.agentSession.findUnique({
    where: { id: sessionId },
  });

  // Cleanup and complete
  await cleanupSessionImages({ sessionId });

  if (fullSession) {
    // Broadcast MESSAGE_COMPLETE with full session data
    broadcast(Channels.session(sessionId), {
      type: SessionEventTypes.MESSAGE_COMPLETE,
      data: {
        sessionId,
        session: {
          id: fullSession.id,
          projectId: fullSession.project_id,
          userId: fullSession.user_id,
          name: fullSession.name ?? undefined,
          agent: fullSession.agent,
          type: fullSession.type as 'chat' | 'workflow' | 'internal',
          permission_mode: fullSession.permission_mode as 'default' | 'plan' | 'acceptEdits' | 'bypassPermissions',
          cli_session_id: fullSession.cli_session_id ?? undefined,
          session_path: fullSession.session_path ?? undefined,
          metadata: fullSession.metadata as unknown as import('@/shared/types/agent-session.types').AgentSessionMetadata,
          state: fullSession.state as 'idle' | 'working' | 'error',
          error_message: fullSession.error_message ?? undefined,
          is_archived: fullSession.is_archived,
          archived_at: fullSession.archived_at,
          created_at: fullSession.created_at,
          updated_at: fullSession.updated_at,
        },
      },
    });
  } else {
    // Fallback if session not found (shouldn't happen)
    broadcast(Channels.session(sessionId), {
      type: SessionEventTypes.MESSAGE_COMPLETE,
      data: {
        sessionId,
      },
    });
  }
}

/**
 * Handle session cancel event
 *
 * Kills the running agent process and returns session to idle state
 */
export async function handleSessionCancel(
  _socket: WebSocket,
  sessionId: string,
  _data: unknown,
  userId: string,
  fastify: FastifyInstance
): Promise<void> {
  fastify.log.info({ sessionId, userId }, "[WebSocket] Session cancel requested");

  try {
    // Delegate all business logic to domain service
    const result = await cancelSession({ sessionId, userId, shouldBroadcast: true });

    if (!result.success) {
      // Error already broadcasted by domain service
      fastify.log.error(
        { sessionId, error: result.error },
        "[WebSocket] Session cancellation failed"
      );
    }
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to cancel session";

    fastify.log.error({ err, sessionId }, "[WebSocket] Error cancelling session");

    broadcast(Channels.session(sessionId), {
      type: SessionEventTypes.ERROR,
      data: {
        error: errorMessage,
        sessionId,
        code: "CANCEL_FAILED",
      },
    });
  }
}

/**
 * Handle session subscribe event
 *
 * Subscribes the WebSocket to the session's broadcast channel, enabling
 * the client to receive real-time updates for this session.
 * This is used for page reloads and passive session viewing.
 */
export async function handleSessionSubscribe(
  socket: WebSocket,
  sessionId: string,
  userId: string,
  fastify: FastifyInstance
): Promise<void> {
  // Validate session ownership
  await validateSessionOwnership({ sessionId, userId });

  // Subscribe socket to session channel
  const channel = Channels.session(sessionId);
  subscribe(channel, socket);

  fastify.log.info(
    { sessionId, channel },
    "[WebSocket] Client subscribed to session channel"
  );
}

/**
 * Handle session unsubscribe event
 *
 * Unsubscribes the WebSocket from the session's broadcast channel.
 * Called when a component unmounts or session changes.
 */
export async function handleSessionUnsubscribe(
  socket: WebSocket,
  sessionId: string,
  userId: string,
  fastify: FastifyInstance
): Promise<void> {
  // Validate session ownership
  await validateSessionOwnership({ sessionId, userId });

  // Unsubscribe socket from session channel
  const channel = Channels.session(sessionId);
  unsubscribe(channel, socket);

  fastify.log.info(
    { sessionId, channel },
    "[WebSocket] Client unsubscribed from session channel"
  );
}

/**
 * Handle kill session event
 *
 * Kills the running agent process and returns session to idle state.
 * Alias for handleSessionCancel for backwards compatibility.
 */
export async function handleKillSession(
  socket: WebSocket,
  sessionId: string,
  data: unknown,
  userId: string,
  fastify: FastifyInstance
): Promise<void> {
  // Delegate to cancel handler (same functionality)
  await handleSessionCancel(socket, sessionId, data, userId, fastify);
}

/**
 * Route session events to appropriate handler
 *
 * Main router for session-related WebSocket events. Extracts the session ID
 * from the event type and delegates to specific handlers based on the action.
 */
export async function handleSessionEvent(
  socket: WebSocket,
  channel: string,
  type: string,
  data: unknown,
  userId: string,
  fastify: FastifyInstance
): Promise<void> {
  fastify.log.info(
    { channel, type, userId },
    "[WebSocket] handleSessionEvent router entry"
  );

  const parsed = parseChannel(channel);
  const sessionId = parsed?.id;

  fastify.log.info(
    { parsed, sessionId, resource: parsed?.resource },
    "[WebSocket] Parsed channel"
  );

  if (!sessionId || parsed?.resource !== "session") {
    fastify.log.warn(
      { sessionId, resource: parsed?.resource },
      "[WebSocket] Invalid session channel"
    );
    sendMessage(socket, Channels.global(), {
      type: GlobalEventTypes.ERROR,
      data: {
        error: "Invalid session channel",
      },
    });
    return;
  }

  try {
    if (type === SessionEventTypes.SEND_MESSAGE) {
      fastify.log.info(
        { sessionId, type },
        "[WebSocket] Routing to handleSessionSendMessage"
      );
      await handleSessionSendMessage(
        socket,
        sessionId,
        data as SessionSendMessageData,
        userId,
        fastify
      );
    } else if (type === SessionEventTypes.CANCEL) {
      await handleSessionCancel(socket, sessionId, data, userId, fastify);
    } else if (type === SessionEventTypes.KILL_SESSION) {
      await handleKillSession(socket, sessionId, data, userId, fastify);
    } else if (type === SessionEventTypes.SUBSCRIBE) {
      await handleSessionSubscribe(socket, sessionId, userId, fastify);
    } else if (type === SessionEventTypes.UNSUBSCRIBE) {
      await handleSessionUnsubscribe(socket, sessionId, userId, fastify);
    } else {
      // Unknown session action
      broadcast(Channels.session(sessionId), {
        type: SessionEventTypes.ERROR,
        data: {
          error: "Unknown session action",
          sessionId,
        },
      });
    }
  } catch (err: unknown) {
    fastify.log.error({ err, type, sessionId }, "Error handling session event");
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";

    broadcast(Channels.session(sessionId), {
      type: SessionEventTypes.ERROR,
      data: {
        error: errorMessage,
        sessionId,
      },
    });
  }
}

// ============================================================================
// Private Helper Methods
// ============================================================================

/**
 * Perform post-processing tasks after successful execution
 *
 * Handles:
 * - Storing CLI-generated session ID
 * - Generating session name from first message
 * - Extracting and logging usage data
 *
 * @private
 */
async function performPostProcessingTasks(
  sessionId: string,
  existingSessionName: string | null,
  userMessage: string,
  result: AgentExecuteResult,
  fastify: FastifyInstance
): Promise<void> {
  fastify.log.info(
    {
      sessionId,
      existingSessionName,
      hasExistingName: !!existingSessionName,
      willGenerateName: !existingSessionName,
      userMessagePreview: userMessage.substring(0, 50),
    },
    "[WebSocket] performPostProcessingTasks called"
  );

  // Store CLI session ID
  await storeCliSessionId({
    sessionId,
    cliSessionId: result.sessionId,
  });

  // Generate session name if needed
  if (!existingSessionName) {
    fastify.log.info(
      { sessionId },
      "[WebSocket] No existing session name, will generate one"
    );
    await generateAndStoreName(sessionId, userMessage, fastify.log);
  } else {
    fastify.log.info(
      { sessionId, existingSessionName },
      "[WebSocket] Session already has a name, skipping generation"
    );
  }

  // Extract and log usage data
  extractAndLogUsage(sessionId, result, fastify.log);
}

/**
 * Generate and store a session name from the user's first message
 *
 * @private
 */
async function generateAndStoreName(
  sessionId: string,
  userMessage: string,
  logger: import("fastify").FastifyBaseLogger
): Promise<void> {
  logger.info(
    { sessionId, userMessageLength: userMessage.length },
    "[WebSocket] ===== ENTERED generateAndStoreName function ====="
  );

  try {
    logger.info(
      { sessionId, userPrompt: userMessage.substring(0, 100), fullPrompt: userMessage },
      "[WebSocket] About to call generateSessionName"
    );

    const sessionName = await generateSessionName({
      userPrompt: userMessage,
    });

    logger.info(
      { sessionId, sessionName, nameLength: sessionName?.length },
      "[WebSocket] generateSessionName returned successfully"
    );

    logger.info(
      { sessionId, sessionName },
      "[WebSocket] About to update database with session name"
    );

    // Capture full Prisma model from update
    const updatedSession = await prisma.agentSession.update({
      where: { id: sessionId },
      data: { name: sessionName },
    });

    logger.info(
      { sessionId, sessionName },
      "[WebSocket] Database updated successfully with session name"
    );

    // Convert to SessionResponse using util
    const sessionResponse = toSessionResponse(updatedSession);

    // Broadcast with full session object (consistent with updateSession service)
    broadcast(Channels.session(sessionId), {
      type: SessionEventTypes.SESSION_UPDATED,
      data: {
        sessionId,
        session: sessionResponse, // Full session enables sidebar update
        name: sessionName,
        updated_at: updatedSession.updated_at.toISOString(),
      },
    });
  } catch (err: unknown) {
    // Non-critical error - log and continue
    logger.error(
      {
        err,
        sessionId,
        errorMessage: err instanceof Error ? err.message : String(err),
        errorStack: err instanceof Error ? err.stack : undefined
      },
      "[WebSocket] Failed to generate session name (non-critical)"
    );
  }
}

/**
 * Extract usage data from execution result and log it
 *
 * @private
 */
function extractAndLogUsage(
  sessionId: string,
  result: AgentExecuteResult,
  logger: import("fastify").FastifyBaseLogger
): void {
  const usage = extractUsageFromEvents({ events: result.events });

  if (usage) {
    logger.info({ usage, sessionId }, "Extracted usage data");
  } else {
    logger.warn({ sessionId }, "No usage data found in result.events");
  }
}
