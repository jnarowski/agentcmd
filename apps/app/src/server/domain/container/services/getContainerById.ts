import { prisma } from "@/shared/prisma";
import type { GetContainerByIdOptions } from "./types";
import type { Container } from "@prisma/client";

// PUBLIC API

/**
 * Get a single container by ID
 *
 * @example
 * ```typescript
 * const container = await getContainerById({ containerId: "ctnr_123" });
 * console.log(container.status);
 * ```
 */
export async function getContainerById(
  options: GetContainerByIdOptions
): Promise<Container> {
  const { containerId } = options;

  const container = await prisma.container.findUnique({
    where: { id: containerId },
  });

  if (!container) {
    throw new Error(`Container not found: ${containerId}`);
  }

  return container;
}
