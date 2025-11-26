import { prisma } from '@/shared/prisma';
import type { AgentSessionMetadata, SessionResponse, SessionType } from '@/shared/types/agent-session.types';
import type { AgentType } from '@/shared/types/agent.types';
import { getSessionFilePath } from '@/server/utils/path';
import type { CreateSessionOptions } from '../types/CreateSessionOptions';
import { toSessionResponse } from '../utils';

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
    cli_session_id,
    session_path: providedSessionPath
  } = data;
  // Get project to determine session file path
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  // Use provided session path or calculate from project path
  const sessionPath = providedSessionPath ?? getSessionFilePath(project.path, sessionId);

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
      project_id: projectId,
      user_id: userId,
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

  return toSessionResponse(session);
}
