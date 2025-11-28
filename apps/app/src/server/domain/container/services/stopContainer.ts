import { prisma } from "@/shared/prisma";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import { Channels } from "@/shared/websocket";
import { config } from "@/server/config";
import * as dockerClient from "../utils/dockerClient";
import type { StopContainerByIdOptions } from "./types";
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

/**
 * Stop and remove a running container
 *
 * Fetches container from DB, calls Docker to stop/remove it,
 * updates DB status to "stopped", and broadcasts WebSocket event.
 *
 * @example
 * ```typescript
 * const container = await stopContainer({ containerId: "ctnr_123" });
 * console.log(container.status); // "stopped"
 * ```
 */
export async function stopContainer(
  options: StopContainerByIdOptions
): Promise<ContainerWithUrls> {
  const { containerId } = options;

  // Fetch container by ID with workflow run relation
  const container = await prisma.container.findUnique({
    where: { id: containerId },
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
    throw new Error(`Container not found: ${containerId}`);
  }

  try {
    // Call Docker to stop container
    await dockerClient.stop({
      containerIds: container.container_ids as string[],
      composeProject: container.compose_project || undefined,
      workingDir: container.working_dir,
    });

    // Update status to "stopped"
    const updatedContainer = await prisma.container.update({
      where: { id: containerId },
      data: {
        status: "stopped",
        stopped_at: new Date(),
      },
      include: {
        workflow_run: {
          select: {
            workflow_definition_id: true,
            name: true,
          },
        },
      },
    });

    // Broadcast WebSocket event
    broadcast(Channels.project(container.project_id), {
      type: "container.updated",
      data: {
        containerId,
        workflowRunId: container.workflow_run_id,
        changes: { status: "stopped" },
      },
    });

    const ports = updatedContainer.ports as Record<string, number> | null;
    return {
      ...updatedContainer,
      urls: ports ? buildContainerUrls(ports) : null,
      workflow_definition_id: updatedContainer.workflow_run?.workflow_definition_id ?? null,
      workflow_run_name: updatedContainer.workflow_run?.name ?? null,
    };
  } catch (error) {
    // Update status to "failed"
    await prisma.container.update({
      where: { id: containerId },
      data: {
        status: "failed",
        error_message: error instanceof Error ? error.message : String(error),
      },
    });

    // Broadcast WebSocket event
    broadcast(Channels.project(container.project_id), {
      type: "container.updated",
      data: {
        containerId,
        workflowRunId: container.workflow_run_id,
        changes: { status: "failed" },
      },
    });

    throw error;
  }
}
