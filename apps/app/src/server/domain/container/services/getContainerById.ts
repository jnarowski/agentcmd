import { prisma } from "@/shared/prisma";
import { config } from "@/server/config";
import type { GetContainerByIdOptions } from "./types";
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
): Promise<ContainerWithUrls> {
  const { containerId } = options;

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

  const ports = container.ports as Record<string, number> | null;
  return {
    ...container,
    urls: ports ? buildContainerUrls(ports) : null,
    workflow_definition_id: container.workflow_run?.workflow_definition_id ?? null,
    workflow_run_name: container.workflow_run?.name ?? null,
  };
}
