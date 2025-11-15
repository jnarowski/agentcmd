import { prisma } from "@/shared/prisma";
import { loadProjectWorkflows } from "./loadProjectWorkflows";
import { upsertWorkflowDefinition } from "../../definitions/upsertWorkflowDefinition";
import { updateWorkflowDefinition } from "../../definitions/updateWorkflowDefinition";
import type { WorkflowRuntime } from "agentcmd-workflows";
import type { FastifyBaseLogger } from "fastify";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Scan a single project for workflows and create/update WorkflowDefinition records
 *
 * Orchestrates workflow scanning:
 * 1. Loads workflows from filesystem
 * 2. Upserts valid workflow definitions to DB
 * 3. Handles errored workflow files
 * 4. Marks missing workflow definitions
 *
 * @param projectId - Project ID
 * @param projectPath - Project filesystem path
 * @param runtime - Workflow runtime adapter
 * @param logger - Logger instance
 * @returns Number of workflows discovered
 */
export async function scanProjectWorkflows(
  projectId: string,
  projectPath: string,
  runtime: WorkflowRuntime,
  logger: FastifyBaseLogger
): Promise<number> {
  // Load workflows from project
  const { workflows, errors } = await loadProjectWorkflows(
    projectPath,
    runtime,
    logger
  );

  // Track found workflow identifiers and errored files
  const foundIdentifiers = new Set<string>();
  const erroredFiles = new Map<string, string>(); // filePath -> error message

  // Store errors by file path for later lookup
  for (const { filePath, error } of errors) {
    erroredFiles.set(filePath, error);
  }

  // Create or update WorkflowDefinition records
  await upsertWorkflowDefinitions(
    projectId,
    workflows,
    foundIdentifiers,
    erroredFiles,
    logger
  );

  // Handle errored workflow files
  await handleErroredWorkflowFiles(projectId, erroredFiles, logger);

  // Mark missing workflow definitions
  await markMissingWorkflowDefinitions(projectId, foundIdentifiers, logger);

  return workflows.length;
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Upsert workflow definitions to database
 *
 * Creates new records or updates existing ones.
 * Reactivates archived/missing workflows.
 * Tracks found identifiers and errored files.
 */
async function upsertWorkflowDefinitions(
  projectId: string,
  workflows: Array<{
    definition: { config: { id: string; name?: string; description?: string; phases?: unknown[]; argsSchema?: unknown } };
    filePath: string;
  }>,
  foundIdentifiers: Set<string>,
  erroredFiles: Map<string, string>,
  logger: FastifyBaseLogger
): Promise<void> {
  for (const { definition, filePath } of workflows) {
    const { config } = definition;

    // Skip workflows with missing identifier
    if (!config.id) {
      logger.warn(
        { projectId, filePath, config },
        "Workflow missing required 'id' field - skipping"
      );
      erroredFiles.set(
        filePath,
        "Workflow definition missing required 'id' field"
      );
      continue;
    }

    foundIdentifiers.add(config.id);

    const existingDefinition = await prisma.workflowDefinition.findUnique({
      where: {
        project_id_identifier: {
          project_id: projectId,
          identifier: config.id,
        },
      },
    });

    // Reactivate if previously archived/missing
    const shouldReactivate =
      existingDefinition &&
      (existingDefinition.status === "archived" ||
        existingDefinition.file_exists === false);

    await upsertWorkflowDefinition({
      where: {
        project_id_identifier: {
          project_id: projectId,
          identifier: config.id,
        },
      },
      create: {
        project: { connect: { id: projectId } },
        identifier: config.id,
        name: config.name ?? config.id,
        description: config.description ?? null,
        type: "code",
        path: filePath,
        phases: (config.phases as object[]) ?? [],
        args_schema: (config.argsSchema as object) ?? null,
        status: "active",
        file_exists: true,
        load_error: null,
      },
      update: {
        name: config.name ?? config.id,
        description: config.description ?? null,
        path: filePath,
        phases: (config.phases as object[]) ?? [],
        args_schema: (config.argsSchema as object) ?? null,
        updated_at: new Date(),
        status: shouldReactivate ? "active" : undefined,
        file_exists: true,
        load_error: null,
        archived_at: shouldReactivate ? null : undefined,
      },
    });

    if (shouldReactivate) {
      logger.info(
        { projectId, workflowId: config.id, filePath },
        `    ✓ ${filePath.split("/").pop()} (reactivated)`
      );
    } else {
      logger.debug(
        { projectId, workflowId: config.id, filePath },
        `    ✓ ${filePath.split("/").pop()}`
      );
    }
  }
}

/**
 * Handle errored workflow files
 *
 * Updates existing definitions with error messages.
 * Creates placeholder definitions for new errored files.
 */
async function handleErroredWorkflowFiles(
  projectId: string,
  erroredFiles: Map<string, string>,
  logger: FastifyBaseLogger
): Promise<void> {
  for (const [filePath, errorMessage] of erroredFiles) {
    // Try to find existing definition by path
    const existingDefinition = await prisma.workflowDefinition.findFirst({
      where: {
        project_id: projectId,
        path: filePath,
      },
    });

    if (existingDefinition) {
      // Update existing definition with error
      await updateWorkflowDefinition({
        id: existingDefinition.id,
        data: {
          load_error: errorMessage,
          file_exists: true,
          updated_at: new Date(),
        },
      });

      logger.warn(
        {
          projectId,
          workflowId: existingDefinition.identifier,
          filePath,
          error: errorMessage,
        },
        "Workflow definition failed to load - error persisted"
      );
    } else {
      // Create placeholder definition for errored file
      const identifier = `error-${filePath.split("/").pop()?.replace(/\.[^.]+$/, "") || "unknown"}`;
      await prisma.workflowDefinition.create({
        data: {
          project: { connect: { id: projectId } },
          identifier,
          name: `[ERROR] ${filePath.split("/").pop() || "Unknown"}`,
          type: "code",
          path: filePath,
          phases: [],
          status: "active",
          file_exists: true,
          load_error: errorMessage,
        },
      });

      logger.warn(
        {
          projectId,
          identifier,
          filePath,
          error: errorMessage,
        },
        "Created placeholder definition for errored workflow file"
      );
    }
  }
}

/**
 * Mark missing workflow definitions
 *
 * Finds definitions not in foundIdentifiers set.
 * Sets file_exists=false and archived_at timestamp.
 */
async function markMissingWorkflowDefinitions(
  projectId: string,
  foundIdentifiers: Set<string>,
  logger: FastifyBaseLogger
): Promise<void> {
  const missingDefinitions = await prisma.workflowDefinition.findMany({
    where: {
      project_id: projectId,
      identifier: {
        notIn: Array.from(foundIdentifiers),
      },
      file_exists: true,
      load_error: null,
    },
  });

  for (const definition of missingDefinitions) {
    await updateWorkflowDefinition({
      id: definition.id,
      data: {
        file_exists: false,
        archived_at: new Date(),
      },
    });

    logger.warn(
      {
        projectId,
        workflowId: definition.identifier,
        filePath: definition.path,
      },
      "Workflow definition file missing - marked as file_exists=false"
    );
  }
}
