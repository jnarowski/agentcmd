import { prisma } from "@/shared/prisma";
import { config } from "@/server/config";
import * as dockerClient from "../utils/dockerClient";
import type { Container } from "@prisma/client";

type ContainerWithUrls = Container & {
  urls: Record<string, string> | null;
  workflow_definition_id: string | null;
  workflow_run_name: string | null;
};

// PRIVATE HELPERS

function buildContainerUrls(ports: Record<string, number>): Record<string, string> {
  const { externalHost } = config.server;
  return Object.entries(ports).reduce(
    (acc, [name, port]) => {
      acc[name] = `http://${externalHost}:${port}`;
      return acc;
    },
    {} as Record<string, string>
  );
}

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
): Promise<ContainerWithUrls | null> {
  const { workflowRunId } = options;

  const container = await prisma.container.findUnique({
    where: { workflow_run_id: workflowRunId },
    include: {
      workflow_run: {
        select: {
          workflow_definition_id: true,
          name: true,
        },
      },
    },
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
      await prisma.container.update({
        where: { id: container.id },
        data: {
          status: "stopped",
          stopped_at: new Date(),
        },
      });

      const ports = container.ports as Record<string, number> | null;
      return {
        ...container,
        status: "stopped",
        stopped_at: new Date(),
        urls: ports ? buildContainerUrls(ports) : null,
        workflow_definition_id: container.workflow_run?.workflow_definition_id ?? null,
        workflow_run_name: container.workflow_run?.name ?? null,
      };
    }
  }

  const ports = container.ports as Record<string, number> | null;
  return {
    ...container,
    urls: ports ? buildContainerUrls(ports) : null,
    workflow_definition_id: container.workflow_run?.workflow_definition_id ?? null,
    workflow_run_name: container.workflow_run?.name ?? null,
  };
}
