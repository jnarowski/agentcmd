import { prisma } from "@/shared/prisma";
import type {
  PortAllocationOptions,
  PortAllocationResult,
} from "../services/types";

// Module constants
const PORT_RANGE_START = 5000;
const PORT_RANGE_END = 5999;

// PUBLIC API

/**
 * Allocates ports for a container from the reserved range (5000-5999).
 * Uses a Prisma transaction to ensure atomicity and prevent race conditions.
 *
 * @param options - Port allocation options
 * @returns Allocated ports mapped to port names
 * @throws Error if port range is exhausted
 *
 * @example
 * ```ts
 * const { ports } = await allocatePorts({ portNames: ["app", "server"] });
 * // { app: 5000, server: 5001 }
 * ```
 */
export async function allocatePorts(
  options: PortAllocationOptions
): Promise<PortAllocationResult> {
  const { portNames } = options;

  // Use transaction to ensure atomicity
  return await prisma.$transaction(async (tx) => {
    // Get all ports from running containers
    const runningContainers = await tx.container.findMany({
      where: { status: "running" },
      select: { ports: true },
    });

    // Extract used ports
    const usedPorts = new Set<number>();
    for (const container of runningContainers) {
      const ports = container.ports as Record<string, number>;
      for (const port of Object.values(ports)) {
        usedPorts.add(port);
      }
    }

    // Find available ports
    const allocatedPorts: Record<string, number> = {};
    let currentPort = PORT_RANGE_START;

    for (const portName of portNames) {
      // Find next available port
      while (usedPorts.has(currentPort) && currentPort <= PORT_RANGE_END) {
        currentPort++;
      }

      if (currentPort > PORT_RANGE_END) {
        throw new Error(
          `Port range exhausted: unable to allocate ${portNames.length} ports`
        );
      }

      allocatedPorts[portName] = currentPort;
      usedPorts.add(currentPort);
      currentPort++;
    }

    return { ports: allocatedPorts };
  });
}
