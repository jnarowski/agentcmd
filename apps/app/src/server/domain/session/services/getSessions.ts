import { prisma } from '@/shared/prisma';
import type { AgentSessionMetadata, SessionResponse, SessionType } from '@/shared/types/agent-session.types';

export interface GetSessionsFilters {
  projectId?: string;
  userId: string;
  type?: SessionType;
  permission_mode?: 'default' | 'plan' | 'acceptEdits' | 'bypassPermissions';
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
    type,
    permission_mode,
    limit = 20,
    includeArchived = false,
    orderBy = 'created_at',
    order = 'desc',
  } = filters;

  const sessions = await prisma.agentSession.findMany({
    where: {
      user_id: userId,
      ...(projectId ? { project_id: projectId } : {}),
      ...(type ? { type } : {}),
      ...(permission_mode ? { permission_mode } : {}),
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
  }));
}
