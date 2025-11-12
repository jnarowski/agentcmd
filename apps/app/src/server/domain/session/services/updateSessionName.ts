import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/prisma';
import type { AgentSessionMetadata, SessionResponse, SessionType } from '@/shared/types/agent-session.types';
import type { UpdateSessionNameOptions } from '../types/UpdateSessionNameOptions';

/**
 * Update session name
 */
export async function updateSessionName({
  id: sessionId,
  data: { name },
  userId
}: UpdateSessionNameOptions): Promise<SessionResponse | null> {
  try {
    // Verify session exists and user has access
    const session = await prisma.agentSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      return null;
    }

    // Update session name
    const updatedSession = await prisma.agentSession.update({
      where: { id: sessionId },
      data: { name },
    });

    return {
      id: updatedSession.id,
      projectId: updatedSession.projectId,
      userId: updatedSession.userId,
      name: updatedSession.name ?? undefined,
      agent: updatedSession.agent,
      type: updatedSession.type as SessionType,
      permission_mode: updatedSession.permission_mode as 'default' | 'plan' | 'acceptEdits' | 'bypassPermissions',
      cli_session_id: updatedSession.cli_session_id ?? undefined,
      session_path: updatedSession.session_path ?? undefined,
      metadata: updatedSession.metadata as unknown as AgentSessionMetadata,
      state: updatedSession.state as 'idle' | 'working' | 'error',
      error_message: updatedSession.error_message ?? undefined,
      is_archived: updatedSession.is_archived,
      archived_at: updatedSession.archived_at,
      created_at: updatedSession.created_at,
      updated_at: updatedSession.updated_at,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return null;
      }
    }
    throw error;
  }
}
