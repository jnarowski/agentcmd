import { prisma } from "@/shared/prisma";
import * as dockerClient from "../utils/dockerClient";
import type { Container } from "@prisma/client";

// PUBLIC API

export interface GetContainerByWorkflowRunIdOptions {
  workflowRunId: string;
}

/**
 * Get container associated with a workflow run
 *
 * Verifies that container is actually running in Docker and updates status if not.
 *
 * @example
 * ```typescript
 * const container = await getContainerByWorkflowRunId({
 *   workflowRunId: "run_123"
 * });
 * ```
 */
export async function getContainerByWorkflowRunId(
  options: GetContainerByWorkflowRunIdOptions
): Promise<Container | null> {
  const { workflowRunId } = options;

  const container = await prisma.container.findUnique({
    where: { workflow_run_id: workflowRunId },
  });

  if (!container) {
    return null;
  }

  // Verify containers marked as "running" or "starting" are actually running
  if (container.status === "running" || container.status === "starting") {
    const isRunning = await dockerClient.isContainerRunning({
      containerIds: container.container_ids as string[] | undefined,
      composeProject: container.compose_project || undefined,
      workingDir: container.working_dir,
    });

    if (!isRunning) {
      // Update stale status to "stopped"
      return await prisma.container.update({
        where: { id: container.id },
        data: {
          status: "stopped",
          stopped_at: new Date(),
        },
      });
    }
  }

  return container;
}
