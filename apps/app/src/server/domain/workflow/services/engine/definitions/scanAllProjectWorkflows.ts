import { prisma } from "@/shared/prisma";
import { scanProjectWorkflows } from "./scanProjectWorkflows";
import { createWorkflowRuntime } from "../createWorkflowRuntime";
import type { ScanResult } from "@/server/domain/workflow/types";
import type { FastifyInstance } from "fastify";
import type { FastifyBaseLogger } from "fastify";

type ProjectInfo = {
  id: string;
  path: string;
  name: string;
};

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Scan all projects for workflows
 *
 * Orchestrates multi-project workflow scanning:
 * 1. Loads all projects from database
 * 2. Scans each project for workflow definitions
 * 3. Aggregates results across all projects
 * 4. Logs comprehensive summary
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
    const projectResult = await scanSingleProject(
      project,
      workflowClient,
      logger
    );
    aggregateScanResults(result, projectResult);
  }

  // Log final summary
  logScanSummary(result, logger);

  return result;
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Scan a single project for workflows
 *
 * Creates runtime, scans project, logs per-project summary.
 * Returns workflow count or error.
 */
async function scanSingleProject(
  project: ProjectInfo,
  workflowClient: FastifyInstance["workflowClient"],
  logger: FastifyBaseLogger
): Promise<{ count: number; error?: { projectId: string; error: string } }> {
  try {
    // Create project-scoped runtime for scanning
    const runtime = createWorkflowRuntime(workflowClient!, project.id, logger);

    const count = await scanProjectWorkflows(
      project.id,
      project.path,
      runtime,
      logger
    );

    // Log per-project summary
    if (count > 0) {
      logger.info(
        {
          projectName: project.name,
          projectPath: project.path,
          workflowCount: count,
        },
        `  ✓ ${project.name}: Registered ${count} workflow(s)`
      );
    } else {
      logger.info(
        { projectName: project.name, projectPath: project.path },
        `  - ${project.name}: No workflows found`
      );
    }

    return { count };
  } catch (error) {
    logger.error(
      {
        projectId: project.id,
        projectName: project.name,
        error: (error as Error).message,
      },
      "Failed to scan project"
    );

    return {
      count: 0,
      error: {
        projectId: project.id,
        error: (error as Error).message,
      },
    };
  }
}

/**
 * Aggregate scan results from single project into total
 *
 * Updates running totals for scanned/discovered/errors.
 */
function aggregateScanResults(
  total: ScanResult,
  projectResult: { count: number; error?: { projectId: string; error: string } }
): void {
  total.scanned++;
  total.discovered += projectResult.count;

  if (projectResult.error) {
    total.errors.push(projectResult.error);
  }
}

/**
 * Log final scan summary
 *
 * Reports total workflows discovered, projects scanned, and errors.
 */
function logScanSummary(result: ScanResult, logger: FastifyBaseLogger): void {
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
}
