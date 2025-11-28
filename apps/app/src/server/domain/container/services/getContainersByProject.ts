import { prisma } from "@/shared/prisma";
import { config } from "@/server/config";
import * as dockerClient from "../utils/dockerClient";
import type { GetContainersByProjectOptions } from "./types";
import type { Container } from "@prisma/client";

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

type ContainerWithUrls = Container & {
  urls: Record<string, string> | null;
  workflow_definition_id: string | null;
  workflow_run_name: string | null;
};

// PUBLIC API

/**
 * Get all containers for a project
 *
 * Verifies that containers marked as "running" are actually running in Docker.
 * Updates stale statuses automatically.
 *
 * @example
 * ```typescript
 * const containers = await getContainersByProject({
 *   projectId: "proj_123",
 *   status: "running"
 * });
 * ```
 */
export async function getContainersByProject(
  options: GetContainersByProjectOptions
): Promise<ContainerWithUrls[]> {
  const { projectId, status } = options;

  const containers = await prisma.container.findMany({
    where: {
      project_id: projectId,
      ...(status && { status }),
    },
    include: {
      workflow_run: {
        select: {
          workflow_definition_id: true,
          name: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  // Type for containers with the included workflow_run relation
  type ContainerWithRun = (typeof containers)[number];

  // Verify containers marked as "running" or "starting" are actually running
  const verifiedContainers: ContainerWithRun[] = [];

  for (const container of containers) {
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

        // Only include if we're not filtering by running status
        if (status !== "running" && status !== "starting") {
          verifiedContainers.push({
            ...container,
            status: "stopped",
            stopped_at: new Date(),
          });
        }
      } else {
        verifiedContainers.push(container);
      }
    } else {
      verifiedContainers.push(container);
    }
  }

  // Add computed URLs and workflow_definition_id to each container
  return verifiedContainers.map((container) => {
    const ports = container.ports as Record<string, number> | null;
    return {
      ...container,
      urls: ports ? buildContainerUrls(ports) : null,
      workflow_definition_id: container.workflow_run?.workflow_definition_id ?? null,
      workflow_run_name: container.workflow_run?.name ?? null,
    };
  });
}
