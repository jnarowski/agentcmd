import { prisma } from '@/shared/prisma';
import type { SessionResponse, AgentSessionMetadata, SessionType } from '@/shared/types/agent-session.types';

/**
 * Get single session by ID with ownership check
 */
export async function getSessionById({
  sessionId,
  projectId,
  userId,
}: {
  sessionId: string;
  projectId: string;
  userId: string;
}): Promise<SessionResponse | null> {
  const session = await prisma.agentSession.findFirst({
    where: {
      id: sessionId,
      projectId,
      userId,
    },
  });

  if (!session) return null;

  return {
    id: session.id,
    projectId: session.projectId,
    userId: session.userId,
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
}
