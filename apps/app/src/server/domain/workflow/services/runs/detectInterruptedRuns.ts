import { prisma } from "@/shared/prisma";
import type { FastifyBaseLogger } from "fastify";

// PUBLIC API

/**
 * Detect workflows that were interrupted by server shutdown.
 * Called on app startup to identify runs needing recovery.
 */
export async function detectInterruptedRuns(logger: FastifyBaseLogger) {
  const interruptedRuns = await prisma.workflowRun.findMany({
    where: { status: "interrupted" },
    select: { id: true, name: true, project_id: true },
  });

  if (interruptedRuns.length > 0) {
    logger.warn(
      { count: interruptedRuns.length, runIds: interruptedRuns.map((r) => r.id) },
      "Found interrupted workflow runs from previous shutdown"
    );
  }

  return interruptedRuns;
}
