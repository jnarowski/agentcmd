import { prisma } from "@/shared/prisma";
import { loadProjectWorkflows } from "./loadProjectWorkflows";
import type { WorkflowRuntime } from "agentcmd-workflows";
import type { FastifyBaseLogger } from "fastify";

/**
 * Scan a single project for workflows and create/update WorkflowDefinition records
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
  logger.info({ projectId, projectPath }, "Scanning project for workflows");

  // Load workflows from project
  const workflows = await loadProjectWorkflows(projectPath, runtime, logger);

  // Create or update WorkflowDefinition records
  for (const { definition, filePath } of workflows) {
    const { config } = definition;

    await prisma.workflowDefinition.upsert({
      where: {
        project_id_identifier: {
          project_id: projectId,
          identifier: config.id,
        },
      },
      create: {
        project_id: projectId,
        identifier: config.id,
        name: config.name ?? config.id, // Use display name or fallback to identifier
        description: config.description ?? null,
        type: "code",
        path: filePath,
        phases: config.phases ?? [],
        args_schema: (config.argsSchema as object) ?? null,
      },
      update: {
        name: config.name ?? config.id,
        description: config.description ?? null,
        path: filePath,
        phases: config.phases ?? [],
        args_schema: (config.argsSchema as object) ?? null,
        updated_at: new Date(),
      },
    });

    logger.info(
      { projectId, workflowId: config.id, filePath },
      "Created/updated workflow definition"
    );
  }

  return workflows.length;
}
