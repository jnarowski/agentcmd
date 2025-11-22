import type { AgentSession } from "@prisma/client";
import { prisma } from "@/shared/prisma";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import { SessionEventTypes } from "@/shared/types/websocket.types";
import { Channels } from "@/shared/websocket";
import type { UpdateSessionOptions } from '../types/UpdateSessionOptions';
import type { SessionResponse, AgentSessionMetadata, SessionType } from '@/shared/types/agent-session.types';

/**
 * Generic session update service
 *
 * Updates a session in the database and optionally broadcasts the update via WebSocket.
 * This service consolidates the repetitive "update database + broadcast" pattern
 * used throughout the session handler.
 *
 * Broadcasts full SessionResponse to enable direct Zustand updates without refetches.
 */
export async function updateSession({
  id: sessionId,
  data,
  shouldBroadcast = true
}: UpdateSessionOptions): Promise<AgentSession> {
  // Update database
  const session = await prisma.agentSession.update({
    where: { id: sessionId },
    // @ts-ignore - Prisma update type
    data: {
      ...data,
      updated_at: new Date(),
    },
  });

  // Optionally broadcast update event with full session
  if (shouldBroadcast) {
    // Convert Prisma model to SessionResponse
    const sessionResponse: SessionResponse = {
      id: session.id,
      projectId: session.project_id,
      userId: session.user_id,
      name: session.name ?? undefined,
      agent: session.agent,
      type: session.type as SessionType,
      permission_mode: session.permission_mode as 'default' | 'plan' | 'acceptEdits' | 'bypassPermissions',
      cli_session_id: session.cli_session_id ?? undefined,
      session_path: session.session_path ?? undefined,
      metadata: session.metadata as unknown as AgentSessionMetadata,
      state: session.state as 'idle' | 'working' | 'error',
      error_message: session.error_message ?? undefined,
      is_archived: session.is_archived,
      archived_at: session.archived_at,
      created_at: session.created_at,
      updated_at: session.updated_at,
    };

    broadcast(Channels.session(sessionId), {
      type: SessionEventTypes.SESSION_UPDATED,
      data: {
        sessionId,
        session: sessionResponse,
        ...data,
        updated_at: session.updated_at.toISOString(),
      },
    });
  }

  return session;
}
