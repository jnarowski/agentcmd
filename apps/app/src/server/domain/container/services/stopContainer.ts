import { prisma } from "@/shared/prisma";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import { Channels } from "@/shared/websocket";
import * as dockerClient from "../utils/dockerClient";
import type { StopContainerByIdOptions } from "./types";
import type { Container } from "@prisma/client";

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
): Promise<Container> {
  const { containerId } = options;

  // Fetch container by ID
  const container = await prisma.container.findUnique({
    where: { id: containerId },
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
    });

    // Broadcast WebSocket event
    broadcast(Channels.project(container.project_id), {
      type: "container.updated",
      data: {
        containerId,
        changes: { status: "stopped" },
      },
    });

    return updatedContainer;
  } catch (error) {
    // Update status to "failed"
    const failedContainer = await prisma.container.update({
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
        changes: { status: "failed" },
      },
    });

    throw error;
  }
}
