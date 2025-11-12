import { prisma } from '@/shared/prisma';
import type { AgentSessionMetadata, SessionResponse, SessionType } from '@/shared/types/agent-session.types';
import type { GetSessionsByProjectOptions } from '../types/GetSessionsByProjectOptions';

/**
 * Get all sessions for a project
 */
export async function getSessionsByProject({
  filters: { projectId, userId, includeArchived = false, type }
}: GetSessionsByProjectOptions): Promise<SessionResponse[]> {
  const sessions = await prisma.agentSession.findMany({
    where: {
      projectId,
      userId,
      ...(includeArchived ? {} : { is_archived: false }),
      ...(type && { type }),
    },
    // Don't order by updated_at as sync operations set all sessions to same timestamp
    // We'll sort by metadata.lastMessageAt in application code instead
  });

  // Map to response format
  const mappedSessions = sessions.map((session) => ({
    id: session.id,
    projectId: session.projectId,
    userId: session.userId,
    name: session.name ?? undefined,
    agent: session.agent,
    type: session.type as SessionType,
    cli_session_id: session.cli_session_id ?? undefined,
    session_path: session.session_path ?? undefined,
    metadata: session.metadata as unknown as AgentSessionMetadata,
    state: session.state as 'idle' | 'working' | 'error',
    error_message: session.error_message ?? undefined,
    is_archived: session.is_archived,
    archived_at: session.archived_at,
    created_at: session.created_at,
    updated_at: session.updated_at,
  }));

  // Sort by created_at (most recent first)
  // created_at is stable and doesn't change during sync operations
  return mappedSessions.sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();

    // Handle invalid dates (NaN) by treating them as oldest
    if (isNaN(aTime) && isNaN(bTime)) return 0;
    if (isNaN(aTime)) return 1; // a is older, b comes first
    if (isNaN(bTime)) return -1; // b is older, a comes first

    return bTime - aTime; // Descending order (most recent first)
  });
}
