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
 * Allocates ports for a container.
 * Tries to use the configured container port as the host port first (if available),
 * otherwise falls back to the reserved range (5000-5999).
 * Uses a Prisma transaction to ensure atomicity and prevent race conditions.
 *
 * @param options - Port allocation options
 * @returns Allocated ports mapped to env var names
 * @throws Error if port range is exhausted
 *
 * @example
 * ```ts
 * const { ports } = await allocatePorts({ portsConfig: { PORT: 3000, VITE_PORT: 5173 } });
 * // If 3000 and 5173 are free: { PORT: 3000, VITE_PORT: 5173 }
 * // If 3000 is busy: { PORT: 5000, VITE_PORT: 5173 }
 * ```
 */
export async function allocatePorts(
  options: PortAllocationOptions
): Promise<PortAllocationResult> {
  const { portsConfig } = options;

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

    // Allocate ports - try preferred port first, then fall back to range
    const allocatedPorts: Record<string, number> = {};
    let fallbackPort = PORT_RANGE_START;

    for (const [envVarName, preferredPort] of Object.entries(portsConfig)) {
      // Try the preferred (container) port first if it's available
      if (!usedPorts.has(preferredPort)) {
        allocatedPorts[envVarName] = preferredPort;
        usedPorts.add(preferredPort);
        continue;
      }

      // Fall back to finding an available port in the reserved range
      while (usedPorts.has(fallbackPort) && fallbackPort <= PORT_RANGE_END) {
        fallbackPort++;
      }

      if (fallbackPort > PORT_RANGE_END) {
        throw new Error(
          `Port range exhausted: unable to allocate port for ${envVarName}`
        );
      }

      allocatedPorts[envVarName] = fallbackPort;
      usedPorts.add(fallbackPort);
      fallbackPort++;
    }

    return { ports: allocatedPorts };
  });
}
