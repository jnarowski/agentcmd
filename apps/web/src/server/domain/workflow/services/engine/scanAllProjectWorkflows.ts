import { prisma } from "@/shared/prisma";
import { scanProjectWorkflows } from "./scanProjectWorkflows";
import type { ScanResult } from "@/server/domain/workflow/types";
import type { FastifyInstance } from "fastify";

/**
 * Scan all projects for workflows
 *
 * @param fastify - Fastify instance (for accessing workflowClient)
 * @returns Scan result summary
 */
export async function scanAllProjectWorkflows(
  fastify: FastifyInstance
): Promise<ScanResult> {
  const logger = fastify.log;
  const runtime = fastify.workflowRuntime;

  if (!runtime) {
    throw new Error("Workflow runtime not initialized");
  }

  logger.info("Scanning all projects for workflows");

  // Load all projects from database
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      path: true,
      name: true,
    },
  });

  const result: ScanResult = {
    scanned: 0,
    discovered: 0,
    errors: [],
  };

  // Scan each project
  for (const project of projects) {
    try {
      const count = await scanProjectWorkflows(
        project.id,
        project.path,
        runtime,
        logger
      );
      result.scanned++;
      result.discovered += count;
    } catch (error) {
      logger.error(
        {
          projectId: project.id,
          projectName: project.name,
          error: (error as Error).message,
        },
        "Failed to scan project"
      );
      result.errors.push({
        projectId: project.id,
        error: (error as Error).message,
      });
    }
  }

  logger.info(result, "Completed workflow scanning");

  return result;
}
