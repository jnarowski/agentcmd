import { prisma } from "@/shared/prisma";
import * as dockerClient from "../utils/dockerClient";
import type { GetContainerLogsOptions } from "./types";

// PUBLIC API

/**
 * Get logs for a container
 *
 * @example
 * ```typescript
 * const logs = await getContainerLogs({ containerId: "ctnr_123" });
 * console.log(logs);
 * ```
 */
export async function getContainerLogs(
  options: GetContainerLogsOptions
): Promise<string> {
  const { containerId } = options;

  // Fetch container to get container_ids
  const container = await prisma.container.findUnique({
    where: { id: containerId },
  });

  if (!container) {
    throw new Error(`Container not found: ${containerId}`);
  }

  try {
    const logs = await dockerClient.getLogs({
      containerIds: container.container_ids as string[],
      workingDir: container.working_dir,
    });

    return logs;
  } catch (error) {
    // Return error message as logs instead of throwing
    return `Error fetching logs: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}
