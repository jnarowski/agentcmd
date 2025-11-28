import { exec } from "child_process";
import { promisify } from "util";
import { prisma } from "@/shared/prisma";
import type {
  PortAllocationOptions,
  PortAllocationResult,
} from "../services/types";

const execAsync = promisify(exec);

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
      // Check both DB (other containers) and system (other processes)
      const preferredInUseByContainer = usedPorts.has(preferredPort);
      const preferredInUseOnSystem = await isPortInUseOnSystem(preferredPort);

      if (!preferredInUseByContainer && !preferredInUseOnSystem) {
        allocatedPorts[envVarName] = preferredPort;
        usedPorts.add(preferredPort);
        continue;
      }

      // Fall back to finding an available port in the reserved range
      // Check both DB and system for each candidate
      while (fallbackPort <= PORT_RANGE_END) {
        const inUseByContainer = usedPorts.has(fallbackPort);
        const inUseOnSystem = await isPortInUseOnSystem(fallbackPort);

        if (!inUseByContainer && !inUseOnSystem) {
          break;
        }
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

// PRIVATE HELPERS

/**
 * Check if a port is in use on the local system
 * Uses lsof to check for any process listening on the port
 */
async function isPortInUseOnSystem(port: number): Promise<boolean> {
  try {
    // lsof returns exit code 0 if port is in use, 1 if not
    await execAsync(`lsof -i :${port} -P -n -sTCP:LISTEN`);
    return true; // Command succeeded = port in use
  } catch {
    return false; // Command failed = port available
  }
}
