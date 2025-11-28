import { prisma } from "@/shared/prisma";
import type { GetContainersByProjectOptions } from "./types";
import type { Container } from "@prisma/client";

// PUBLIC API

/**
 * Get all containers for a project
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
): Promise<Container[]> {
  const { projectId, status } = options;

  const containers = await prisma.container.findMany({
    where: {
      project_id: projectId,
      ...(status && { status }),
    },
    orderBy: {
      created_at: "desc",
    },
  });

  return containers;
}
