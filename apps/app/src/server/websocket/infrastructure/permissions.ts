import { prisma } from "@/shared/prisma";
import { parseChannel } from "./channels";

/**
 * Permission Validation Utilities
 *
 * Validates user access to WebSocket channels before allowing subscriptions.
 * Prevents unauthorized users from subscribing to other users' resources.
 */

/**
 * Validate user access to a session
 *
 * @param sessionId - Session identifier
 * @param userId - User identifier
 * @returns True if user owns the session, false otherwise
 */
export async function validateSessionAccess(
  sessionId: string,
  userId: string
): Promise<boolean> {
  try {
    const session = await prisma.agentSession.findUnique({
      where: { id: sessionId },
      select: { user_id: true },
    });

    if (!session) {
      return false;
    }

    const hasAccess = session.user_id === userId;
    return hasAccess;
  } catch {
    return false;
  }
}

/**
 * Validate user access to a project
 *
 * Note: This is a single-user application, so we only check if the project exists.
 * For multi-user applications, add userId field to Project model and check ownership.
 *
 * @param projectId - Project identifier
 * @param userId - User identifier (unused in single-user app)
 * @returns True if project exists, false otherwise
 */
export async function validateProjectAccess(
  projectId: string,
  _userId: string // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<boolean> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return false;
    }

    // Single-user app: any valid user can access any project
    // For multi-user: check project.userId === userId
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate user access to a channel
 *
 * Parses the channel ID to determine resource type and delegates to
 * resource-specific validators.
 *
 * @param channelId - Channel identifier (e.g., "session:abc123")
 * @param userId - User identifier
 * @returns Object with allowed flag and optional reason for denial
 */
export async function validateChannelAccess(
  channelId: string,
  userId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const parsed = parseChannel(channelId);

  if (!parsed) {
    return {
      allowed: false,
      reason: `Invalid channel ID format: ${channelId}`,
    };
  }

  const { resource, id } = parsed;

  switch (resource) {
    case "session": {
      const allowed = await validateSessionAccess(id, userId);
      return {
        allowed,
        reason: allowed ? undefined : "Access denied to session",
      };
    }

    case "project": {
      const allowed = await validateProjectAccess(id, userId);
      return {
        allowed,
        reason: allowed ? undefined : "Access denied to project",
      };
    }

    case "terminal": {
      // Terminals are associated with sessions, so validate session access
      // Note: Terminal IDs in practice are session IDs
      const allowed = await validateSessionAccess(id, userId);
      return {
        allowed,
        reason: allowed ? undefined : "Access denied to terminal",
      };
    }

    default:
      return {
        allowed: false,
        reason: `Unknown resource type: ${resource}`,
      };
  }
}
