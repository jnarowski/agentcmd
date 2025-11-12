import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/prisma';
import type { AgentSessionMetadata, SessionResponse, SessionType } from '@/shared/types/agent-session.types';
import type { UpdateSessionMetadataOptions } from '../types/UpdateSessionMetadataOptions';

/**
 * Update session metadata
 * Called after messages are added to update token counts, etc.
 */
export async function updateSessionMetadata({
  id: sessionId,
  data: { metadata }
}: UpdateSessionMetadataOptions): Promise<SessionResponse | null> {
  try {
    const session = await prisma.agentSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return null;
    }

    const currentMetadata = session.metadata as unknown as AgentSessionMetadata;
    const updatedMetadata = { ...currentMetadata, ...metadata };

    const updatedSession = await prisma.agentSession.update({
      where: { id: sessionId },
      data: {
        metadata: JSON.parse(JSON.stringify(updatedMetadata)),
        // updated_at is automatically set by Prisma @updatedAt directive
      },
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
      metadata: updatedMetadata,
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
