import type { FastifyInstance, FastifyBaseLogger } from "fastify";
import type { InngestFunction } from "inngest";
import type { WorkflowDefinition as WorkflowDefinitionRecord } from "@prisma/client";
import { createWorkflowClient } from "./createWorkflowClient";
import { createWorkflowRuntime } from "./createWorkflowRuntime";
import { loadProjectWorkflows } from "./loadProjectWorkflows";
import { scanAllProjectWorkflows } from "./scanAllProjectWorkflows";
import { prisma } from "@/shared/prisma";

export interface ResyncDiff {
  new: WorkflowDefinitionRecord[];
  updated: WorkflowDefinitionRecord[];
  archived: WorkflowDefinitionRecord[];
  errors: Array<{ id: string; name: string; error: string }>;
}

/**
 * Rescan workflow files and reload them with cache busting
 * This is the core logic for hot-reloading workflows without restarting the server
 *
 * @param fastify - Fastify instance
 * @param inngestClient - Inngest client instance
 * @param logger - Logger instance
 * @returns New functions array and diff of changes
 */
export async function rescanAndLoadWorkflows(
  fastify: FastifyInstance,
  inngestClient: ReturnType<typeof createWorkflowClient>,
  logger: FastifyBaseLogger
): Promise<{
  functions: InngestFunction.Any[];
  diff: ResyncDiff;
}> {
  const diff: ResyncDiff = {
    new: [],
    updated: [],
    archived: [],
    errors: [],
  };

  logger.info("=== WORKFLOW RESYNC STARTING ===");

  // Scan all projects for workflows
  logger.info("Rescanning projects for workflows...");
  const scanResults = await scanAllProjectWorkflows(fastify);

  if (scanResults.errors.length > 0) {
    logger.warn(
      { errors: scanResults.errors },
      `Encountered ${scanResults.errors.length} error(s) during workflow scanning`
    );
  }

  // Get current workflow definitions BEFORE loading
  const definitionsBeforeSync = await prisma.workflowDefinition.findMany({
    where: { status: "active" },
    select: {
      id: true,
      identifier: true,
      name: true,
      path: true,
      project_id: true,
      file_exists: true,
      load_error: true,
    },
  });

  // Track which definitions we've seen during this resync
  const seenIdentifiers = new Set<string>();

  // Load all active workflow definitions from database
  const definitions = await prisma.workflowDefinition.findMany({
    where: { status: "active" },
    select: {
      id: true,
      identifier: true,
      name: true,
      path: true,
      project_id: true,
    },
  });

  logger.info(
    { count: definitions.length },
    `Reloading ${definitions.length} workflow definition(s)...`
  );

  // Collect Inngest functions
  const inngestFunctions: InngestFunction.Any[] = [];

  // Group definitions by project
  const projectDefinitionsMap = new Map<string, typeof definitions>();

  for (const definition of definitions) {
    if (definition.project_id) {
      if (!projectDefinitionsMap.has(definition.project_id)) {
        projectDefinitionsMap.set(definition.project_id, []);
      }
      projectDefinitionsMap.get(definition.project_id)!.push(definition);
    }
  }

  // Load project workflows once per project
  for (const [projectId, projectDefinitions] of projectDefinitionsMap) {
    try {
      // Get project path
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { path: true, name: true },
      });

      if (!project) {
        logger.warn({ projectId }, "Project not found for workflow definitions");
        continue;
      }

      // Create project-scoped runtime
      const runtime = createWorkflowRuntime(inngestClient, projectId, logger);

      // Load all workflows from project ONCE (with cache busting)
      const { workflows, errors } = await loadProjectWorkflows(
        project.path,
        runtime,
        logger
      );

      // Process errors first
      for (const error of errors) {
        const definition = projectDefinitions.find(
          (d) => d.path === error.filePath
        );
        if (definition) {
          await prisma.workflowDefinition.update({
            where: { id: definition.id },
            data: { load_error: error.error },
          });
          diff.errors.push({
            id: definition.id,
            name: definition.name,
            error: error.error,
          });
          logger.error(
            { workflowId: definition.identifier, projectId, error: error.error },
            `Failed to load project workflow: ${definition.name}`
          );
        }
      }

      // Match and register all definitions from this project
      for (const definition of projectDefinitions) {
        const workflow = workflows.find(
          (w) => w.definition.config.id === definition.identifier
        );

        if (workflow) {
          seenIdentifiers.add(definition.identifier);
          inngestFunctions.push(workflow.inngestFunction);

          // Check if this was previously errored
          const previousDef = definitionsBeforeSync.find(
            (d) => d.id === definition.id
          );
          if (previousDef?.load_error) {
            // Clear error on successful load
            await prisma.workflowDefinition.update({
              where: { id: definition.id },
              data: { load_error: null },
            });
            diff.updated.push(definition as WorkflowDefinitionRecord);
            logger.info(
              {
                workflowId: definition.identifier,
                workflowName: definition.name,
                projectId,
              },
              "Reloaded project workflow (cleared error)"
            );
          } else {
            diff.updated.push(definition as WorkflowDefinitionRecord);
            logger.info(
              {
                workflowId: definition.identifier,
                workflowName: definition.name,
                projectId,
              },
              "Reloaded project workflow"
            );
          }
        } else {
          // Workflow file no longer exports matching definition
          await prisma.workflowDefinition.update({
            where: { id: definition.id },
            data: {
              status: "archived",
              file_exists: false,
              load_error: "Workflow file no longer exports matching definition",
              archived_at: new Date(),
            },
          });
          diff.archived.push(definition as WorkflowDefinitionRecord);
          logger.warn(
            {
              definitionId: definition.id,
              identifier: definition.identifier,
              projectId,
            },
            `Archived project workflow: ${definition.name}`
          );
        }
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error(
        { projectId, error: errorMessage },
        "Failed to load workflows for project"
      );

      // Mark all definitions from this project with error
      for (const definition of projectDefinitions) {
        await prisma.workflowDefinition.update({
          where: { id: definition.id },
          data: { load_error: errorMessage },
        });
        diff.errors.push({
          id: definition.id,
          name: definition.name,
          error: errorMessage,
        });
      }
    }
  }

  // Check for newly created workflows (in DB but not seen before)
  const newWorkflows = await prisma.workflowDefinition.findMany({
    where: {
      status: "active",
      identifier: { notIn: Array.from(seenIdentifiers) },
      created_at: {
        gte: new Date(Date.now() - 60000), // Created in last minute
      },
    },
  });

  diff.new.push(...newWorkflows);

  logger.info(
    {
      total: inngestFunctions.length,
      new: diff.new.length,
      updated: diff.updated.length,
      archived: diff.archived.length,
      errors: diff.errors.length,
    },
    "=== WORKFLOW RESYNC COMPLETE ==="
  );

  return { functions: inngestFunctions, diff };
}
