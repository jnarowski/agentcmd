import { prisma } from "@/shared/prisma";
import { loadGlobalWorkflows } from "./loadGlobalWorkflows";
import type { WorkflowRuntime } from "agentcmd-workflows";
import type { FastifyBaseLogger } from "fastify";

/**
 * Scan global workflows directory and create/update WorkflowDefinition records
 *
 * @param runtime - Workflow runtime adapter
 * @param logger - Logger instance
 * @returns Number of workflows discovered
 */
export async function scanGlobalWorkflows(
  runtime: WorkflowRuntime,
  logger: FastifyBaseLogger
): Promise<number> {
  logger.info("Scanning global workflows");

  // Load workflows from global directory
  const { workflows, errors } = await loadGlobalWorkflows(runtime, logger);

  // Track found workflow identifiers and errored files
  const foundIdentifiers = new Set<string>();
  const erroredFiles = new Map<string, string>(); // filePath -> error message

  // Store errors by file path for later lookup
  for (const { filePath, error } of errors) {
    erroredFiles.set(filePath, error);
  }

  // Create or update WorkflowDefinition records with scope=global
  for (const { definition, filePath } of workflows) {
    const { config } = definition;
    foundIdentifiers.add(config.id);

    const existingDefinition = await prisma.workflowDefinition.findUnique({
      where: {
        scope_identifier: {
          scope: "global",
          identifier: config.id,
        },
      },
    });

    // Reactivate if previously archived/missing
    const shouldReactivate =
      existingDefinition &&
      (existingDefinition.status === "archived" ||
        existingDefinition.file_exists === false);

    await prisma.workflowDefinition.upsert({
      where: {
        scope_identifier: {
          scope: "global",
          identifier: config.id,
        },
      },
      create: {
        scope: "global",
        project_id: null,
        identifier: config.id,
        name: config.name ?? config.id,
        description: config.description ?? null,
        type: "code",
        path: filePath,
        phases: config.phases ?? [],
        args_schema: (config.argsSchema as object) ?? null,
        status: "active",
        file_exists: true,
        load_error: null,
      },
      update: {
        name: config.name ?? config.id,
        description: config.description ?? null,
        path: filePath,
        phases: config.phases ?? [],
        args_schema: (config.argsSchema as object) ?? null,
        status: shouldReactivate ? "active" : undefined,
        file_exists: true,
        load_error: null,
        archived_at: shouldReactivate ? null : undefined,
      },
    });

    logger.info(
      { identifier: config.id, path: filePath },
      shouldReactivate ? "Reactivated global workflow" : "Upserted global workflow"
    );
  }

  // Mark missing global workflows (were in DB but not found on filesystem)
  const existingGlobalWorkflows = await prisma.workflowDefinition.findMany({
    where: { scope: "global" },
    select: {
      id: true,
      identifier: true,
      path: true,
    },
  });

  for (const existing of existingGlobalWorkflows) {
    if (!foundIdentifiers.has(existing.identifier)) {
      const loadError = erroredFiles.get(existing.path);

      if (loadError) {
        // File exists but failed to load
        await prisma.workflowDefinition.update({
          where: { id: existing.id },
          data: {
            file_exists: true,
            load_error: loadError,
            status: "archived",
            archived_at: new Date(),
          },
        });
        logger.warn(
          { identifier: existing.identifier, error: loadError },
          "Global workflow has load error"
        );
      } else {
        // File is missing from filesystem
        await prisma.workflowDefinition.update({
          where: { id: existing.id },
          data: {
            file_exists: false,
            load_error: null,
            status: "archived",
            archived_at: new Date(),
          },
        });
        logger.warn(
          { identifier: existing.identifier, path: existing.path },
          "Global workflow file missing"
        );
      }
    }
  }

  logger.info({ count: workflows.length }, "Completed global workflow scanning");

  return workflows.length;
}
