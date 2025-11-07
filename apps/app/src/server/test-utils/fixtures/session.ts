import { PrismaClient, AgentType, SessionState, Prisma } from "@prisma/client";

/**
 * Creates a test agent session
 * @param prisma - Prisma client instance
 * @param overrides - Required projectId and userId, optional other fields
 * @returns Created session
 */
export async function createTestSession(
  prisma: PrismaClient,
  overrides: {
    projectId: string;
    userId: string;
    name?: string;
    agent?: AgentType;
    state?: SessionState;
    cli_session_id?: string;
    session_path?: string;
    metadata?: Record<string, unknown>;
    error_message?: string;
  }
) {
  const {
    projectId,
    userId,
    name = "Test Session",
    agent = AgentType.claude,
    state = SessionState.idle,
    cli_session_id,
    session_path,
    metadata = {},
    error_message,
  } = overrides;

  const session = await prisma.agentSession.create({
    data: {
      projectId,
      userId,
      name,
      agent,
      state,
      cli_session_id,
      session_path,
      metadata: metadata as Prisma.InputJsonValue,
      error_message,
    },
  });

  return session;
}
