import { prisma } from '@/shared/prisma';
import type { AgentSessionMetadata, SessionResponse } from '@/shared/types/agent-session.types';

export interface GetSessionsFilters {
  projectId?: string;
  userId: string;
  limit?: number;
  includeArchived?: boolean;
  orderBy?: 'created_at' | 'updated_at';
  order?: 'asc' | 'desc';
}

/**
 * Get sessions with optional filters
 * Generic session query supporting cross-project and project-scoped queries
 */
export async function getSessions(filters: GetSessionsFilters): Promise<SessionResponse[]> {
  const {
    projectId,
    userId,
    limit = 20,
    includeArchived = false,
    orderBy = 'created_at',
    order = 'desc',
  } = filters;

  const sessions = await prisma.agentSession.findMany({
    where: {
      userId,
      ...(projectId ? { projectId } : {}),
      ...(includeArchived ? {} : { is_archived: false }),
    },
    orderBy: {
      [orderBy]: order,
    },
    take: limit,
  });

  // Map to response format (consistent with getSessionsByProject)
  return sessions.map((session) => ({
    id: session.id,
    projectId: session.projectId,
    userId: session.userId,
    name: session.name ?? undefined,
    agent: session.agent,
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
}
