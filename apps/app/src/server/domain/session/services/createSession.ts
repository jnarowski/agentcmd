import { prisma } from '@/shared/prisma';
import type { AgentSessionMetadata, SessionResponse, SessionType } from '@/shared/types/agent-session.types';
import type { AgentType } from '@/shared/types/agent.types';
import { getSessionFilePath } from '@/server/utils/path';
import type { CreateSessionOptions } from '../types/CreateSessionOptions';

/**
 * Create a new session
 * Creates database record (JSONL file will be created by agent-cli-sdk)
 */
export async function createSession({
  data
}: CreateSessionOptions): Promise<SessionResponse> {
  const {
    projectId,
    userId,
    sessionId,
    agent = 'claude' as AgentType,
    type = 'chat' as SessionType,
    permission_mode,
    name,
    metadataOverride,
    cli_session_id
  } = data;
  // Get project to determine session file path
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  // Calculate the full absolute path to the session JSONL file
  const sessionPath = getSessionFilePath(project.path, sessionId);

  // Initialize with empty metadata or use override
  const metadata: AgentSessionMetadata = metadataOverride
    ? (metadataOverride as unknown as AgentSessionMetadata)
    : {
        totalTokens: 0,
        messageCount: 0,
        lastMessageAt: new Date().toISOString(),
        firstMessagePreview: '',
      };

  const session = await prisma.agentSession.create({
    data: {
      id: sessionId,
      projectId,
      userId,
      agent,
      type,
      permission_mode: permission_mode ?? 'default',
      session_path: sessionPath,
      metadata: JSON.parse(JSON.stringify(metadata)),
      state: 'working',
      error_message: null,
      cli_session_id: cli_session_id ?? sessionId, // Always set, defaults to DB session ID
      ...(name && { name }),
    },
  });

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
    metadata: metadata,
    state: session.state as 'idle' | 'working' | 'error',
    error_message: session.error_message ?? undefined,
    is_archived: session.is_archived,
    archived_at: session.archived_at,
    created_at: session.created_at,
    updated_at: session.updated_at,
  };
}
