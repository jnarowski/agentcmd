import type { AgentSession } from "@prisma/client";
import type { SessionResponse, AgentSessionMetadata, SessionType } from '@/shared/types/agent-session.types';

/**
 * Convert Prisma AgentSession model to SessionResponse API type
 *
 * Handles:
 * - Field name mapping (project_id → projectId, user_id → userId)
 * - Null → undefined conversion for optional fields
 * - Type casting for enums
 * - Relation pruning (removes Prisma relations)
 */
export function toSessionResponse(session: AgentSession): SessionResponse {
  return {
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
}
