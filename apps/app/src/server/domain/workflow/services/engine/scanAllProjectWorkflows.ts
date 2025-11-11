import { prisma } from "@/shared/prisma";
import { scanProjectWorkflows } from "./scanProjectWorkflows";
import { createWorkflowRuntime } from "./createWorkflowRuntime";
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
  const workflowClient = fastify.workflowClient;

  if (!workflowClient) {
    throw new Error("Workflow client not initialized");
  }

  logger.info("Scanning all projects for workflows...");

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
      // Create project-scoped runtime for scanning
      const runtime = createWorkflowRuntime(workflowClient, project.id, logger);

      const count = await scanProjectWorkflows(
        project.id,
        project.path,
        runtime,
        logger
      );
      result.scanned++;
      result.discovered += count;

      // Log per-project summary
      if (count > 0) {
        logger.info(
          { projectName: project.name, projectPath: project.path, workflowCount: count },
          `  ✓ ${project.name}: Registered ${count} workflow(s)`
        );
      } else {
        logger.info(
          { projectName: project.name, projectPath: project.path },
          `  - ${project.name}: No workflows found`
        );
      }
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

  // Log final summary
  if (result.discovered > 0) {
    logger.info(
      {
        projectsScanned: result.scanned,
        workflowsDiscovered: result.discovered,
        errors: result.errors.length,
      },
      `\nSummary: Discovered ${result.discovered} workflow(s) from ${result.scanned} project(s)`
    );
  } else {
    logger.info(
      { projectsScanned: result.scanned },
      `\nNo workflows found in ${result.scanned} project(s)`
    );
  }

  if (result.errors.length > 0) {
    logger.warn(
      { errors: result.errors },
      `⚠ ${result.errors.length} error(s) during scanning`
    );
  }

  return result;
}
