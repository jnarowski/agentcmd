import { prisma } from "@/shared/prisma";
import { activeSessions } from "@/server/websocket/infrastructure/active-sessions";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import { SessionEventTypes } from "@/shared/types/websocket.types";
import { Channels } from "@/shared/websocket";
import { killProcess } from "agent-cli-sdk";
import { updateSessionState } from "./updateSessionState";
import type { CancelSessionOptions } from '../types/CancelSessionOptions';

/**
 * Cancel a running agent session
 *
 * Kills the running agent process and returns the session to idle state.
 * Handles validation, process cleanup, and broadcasting.
 *
 * Process Tracking:
 * - Looks up process by sessionId (DB session ID) in activeSessions map
 * - Works correctly for both chat sessions and workflow resume scenarios
 * - Chat: sessionId = processTrackingId = cli_session_id (all same)
 * - Workflow: sessionId = processTrackingId (workflow DB ID), cli_session_id may differ (planning ID)
 * - Cancellation always uses sessionId parameter to find the correct process
 */
export async function cancelSession({
  sessionId,
  userId,
  shouldBroadcast = true
}: CancelSessionOptions): Promise<{ success: boolean; error?: string }> {

  // Validate session ownership
  const session = await prisma.agentSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    const errorMsg = "Session not found";

    if (shouldBroadcast) {
      broadcast(Channels.session(sessionId), {
        type: SessionEventTypes.ERROR,
        data: {
          error: errorMsg,
          sessionId,
          code: "SESSION_NOT_FOUND",
        },
      });
    }

    return { success: false, error: errorMsg };
  }

  if (session.user_id !== userId) {
    const errorMsg = "Unauthorized: session does not belong to user";

    if (shouldBroadcast) {
      broadcast(Channels.session(sessionId), {
        type: SessionEventTypes.ERROR,
        data: {
          error: errorMsg,
          sessionId,
          code: "UNAUTHORIZED",
        },
      });
    }

    return { success: false, error: errorMsg };
  }

  // Check if session is in 'working' state
  if (session.state !== "working") {
    const errorMsg = `Cannot cancel session in '${session.state}' state`;

    if (shouldBroadcast) {
      broadcast(Channels.session(sessionId), {
        type: SessionEventTypes.ERROR,
        data: {
          error: errorMsg,
          sessionId,
          code: "INVALID_STATE",
        },
      });
    }

    return { success: false, error: errorMsg };
  }

  // Retrieve process from active sessions
  const process = activeSessions.getProcess(sessionId);

  if (!process) {
    // Update state to idle anyway (race condition handling)
    await updateSessionState({
      id: sessionId,
      data: { state: "idle", errorMessage: null },
      shouldBroadcast
    });

    return { success: true };
  }

  // Mark session as cancelled before killing
  activeSessions.update(sessionId, { cancelled: true });

  // Kill the process with graceful shutdown
  try {
    await killProcess(process, { timeoutMs: 5000 });
  } catch {
    // Process might already be dead - continue anyway
  }

  // Clear process reference
  activeSessions.clearProcess(sessionId);

  // Update database state to idle
  await updateSessionState({
    id: sessionId,
    data: { state: "idle", errorMessage: null },
    shouldBroadcast
  });

  // Also send message_complete for consistency
  if (shouldBroadcast) {
    broadcast(Channels.session(sessionId), {
      type: SessionEventTypes.MESSAGE_COMPLETE,
      data: {
        sessionId,
        cancelled: true,
      },
    });
  }

  return { success: true };
}
