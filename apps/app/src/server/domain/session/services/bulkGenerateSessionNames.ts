import { prisma } from "@/shared/prisma";
import { generateSessionName } from "./generateSessionName";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import { Channels } from "@/shared/websocket";
import { SessionEventTypes } from "@/shared/types/websocket.types";
import type { FastifyBaseLogger } from "fastify";
import type { AgentSessionMetadata } from "@/shared/types/agent-session.types";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Options for bulk session name generation
 */
export interface BulkGenerateSessionNamesOptions {
  /** Project ID to generate names for */
  projectId: string;
  /** User ID (for authorization) */
  userId: string;
  /** Maximum number of sessions to process (default: 50) */
  limit?: number;
  /** Logger instance */
  logger: FastifyBaseLogger;
}

/**
 * Result of bulk session name generation
 */
export interface BulkGenerateSessionNamesResult {
  /** Total sessions processed */
  total: number;
  /** Successfully named sessions */
  successful: number;
  /** Failed sessions */
  failed: number;
}

/**
 * Bulk generate AI names for the most recent unnamed sessions
 *
 * Processes up to `limit` sessions (default 50) where:
 * - name IS NULL (no existing name)
 * - name_generated_at IS NULL (never attempted)
 * - is_archived = false (active sessions only)
 *
 * Processes in batches of 10 to control memory and API rate limiting.
 * Broadcasts SESSION_UPDATED events for each successful naming.
 * Sets name_generated_at on both success and failure to prevent retry loops.
 *
 * @param options - Configuration object
 * @returns Statistics about the naming operation
 *
 * @example
 * const result = await bulkGenerateSessionNames({
 *   projectId: "proj-123",
 *   userId: "user-456",
 *   limit: 50,
 *   logger: fastify.log
 * });
 * // { total: 45, successful: 43, failed: 2 }
 */
export async function bulkGenerateSessionNames({
  projectId,
  userId,
  limit = 50,
  logger,
}: BulkGenerateSessionNamesOptions): Promise<BulkGenerateSessionNamesResult> {
  logger.info(
    { projectId, userId, limit },
    "Starting bulk session name generation"
  );

  // Get sessions needing names (most recent first)
  const sessions = await prisma.agentSession.findMany({
    where: {
      projectId,
      userId,
      name: null,
      name_generated_at: null,
      is_archived: false,
    },
    orderBy: { created_at: "desc" },
    take: limit,
  });

  if (sessions.length === 0) {
    logger.info({ projectId }, "No sessions need naming");
    return { total: 0, successful: 0, failed: 0 };
  }

  logger.info(
    { projectId, count: sessions.length },
    "Found sessions needing names"
  );

  let successful = 0;
  let failed = 0;
  const batchSize = 10;

  // Process in batches to control memory and rate limiting
  for (let i = 0; i < sessions.length; i += batchSize) {
    const batch = sessions.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map((session) => processSession(session, logger))
    );

    // Count successes and failures
    results.forEach((result) => {
      if (result.status === "fulfilled") {
        successful++;
      } else {
        failed++;
      }
    });

    logger.info(
      {
        processed: i + batch.length,
        total: sessions.length,
        successful,
        failed,
      },
      "Batch completed"
    );

    // Small delay between batches (prevents API rate limiting)
    if (i + batchSize < sessions.length) {
      await sleep(500);
    }
  }

  logger.info(
    { projectId, total: sessions.length, successful, failed },
    "Bulk session naming completed"
  );

  return {
    total: sessions.length,
    successful,
    failed,
  };
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Process a single session: generate name, update DB, broadcast event
 */
async function processSession(
  session: {
    id: string;
    metadata: unknown;
  },
  logger: FastifyBaseLogger
): Promise<void> {
  const metadata = session.metadata as AgentSessionMetadata;
  const userPrompt = metadata.firstMessagePreview;

  if (!userPrompt) {
    logger.warn(
      { sessionId: session.id },
      "Session has no firstMessagePreview, skipping"
    );
    // Mark as attempted to prevent future processing
    await prisma.agentSession.update({
      where: { id: session.id },
      data: { name_generated_at: new Date() },
    });
    throw new Error("No first message preview");
  }

  try {
    // Generate name using AI
    const name = await generateSessionName({ userPrompt });

    // Update session with name and timestamp
    await prisma.agentSession.update({
      where: { id: session.id },
      data: {
        name,
        name_generated_at: new Date(),
      },
    });

    logger.info(
      { sessionId: session.id, name },
      "Successfully generated session name"
    );

    // Broadcast update to connected clients
    broadcast(Channels.session(session.id), {
      type: SessionEventTypes.SESSION_UPDATED,
      data: {
        sessionId: session.id,
        name,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    logger.error(
      {
        err,
        sessionId: session.id,
        errorMessage: err instanceof Error ? err.message : String(err),
      },
      "Failed to generate session name"
    );

    // Mark as attempted even on failure (prevents infinite retries)
    await prisma.agentSession.update({
      where: { id: session.id },
      data: { name_generated_at: new Date() },
    });

    throw err;
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
