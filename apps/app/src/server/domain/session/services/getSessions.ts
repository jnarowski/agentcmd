import { prisma } from '@/shared/prisma';
import type { SessionResponse, SessionType } from '@/shared/types/agent-session.types';
import { toSessionResponse } from '../utils';

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
      ...(type ? { type } : { type: { not: 'internal' } }), // Filter specific type OR exclude internal
      ...(permission_mode ? { permission_mode } : {}),
      ...(includeArchived ? {} : { is_archived: false }),
    },
    orderBy: {
      [orderBy]: order,
    },
    take: limit,
  });

  // Map to response format (consistent with getSessionsByProject)
  return sessions.map(toSessionResponse);
}
