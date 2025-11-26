import { prisma } from "@/shared/prisma";
import { getWorkflowDefinitions } from "../../definitions/getWorkflowDefinitions";
import { updateWorkflowDefinition } from "../../definitions/updateWorkflowDefinition";
import { scanAllProjectWorkflows } from "./scanAllProjectWorkflows";
import { loadProjectWorkflows } from "./loadProjectWorkflows";
import { createWorkflowRuntime } from "../createWorkflowRuntime";
import type { FastifyInstance } from "fastify";
import type { FastifyBaseLogger } from "fastify";
import type { InngestFunction } from "inngest";

// Type for workflow definition from database
type WorkflowDefinition = {
  id: string;
  identifier: string;
  name: string;
  path: string;
  project_id: string | null;
};

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Load workflows orchestrator for boot/import/reload scenarios
 *
 * Orchestrates the workflow loading pipeline:
 * 1. Scans all projects for workflow files (updates database)
 * 2. Loads active workflow definitions from database
 * 3. Groups definitions by project to optimize loading
 * 4. Loads workflow files from disk and matches against definitions
 * 5. Registers workflows as Inngest functions
 *
 * This replaces the complex rescanAndLoadWorkflows with a simple
 * load-and-register pattern. No diff tracking, just load and return.
 *
 * @param fastify - Fastify instance (for workflowClient and logger)
 * @returns Array of Inngest functions and basic stats
 */
export async function loadWorkflows(fastify: FastifyInstance): Promise<{
  functions: InngestFunction.Any[];
  stats: { total: number; errors: number };
}> {
  const logger = fastify.log;
  const workflowClient = fastify.workflowClient;

  if (!workflowClient) {
    throw new Error("Workflow client not initialized");
  }

  // Step 1: Scan all projects for workflows (populates database)
  logger.info("Scanning projects for workflows...");
  await scanAllProjectWorkflows(fastify);

  // Step 2: Load active workflow definitions from database
  const definitions = await loadActiveDefinitions();

  logger.info(
    { count: definitions.length },
    `\nRegistering ${definitions.length} workflow definition(s)...`
  );

  // Step 3: Group definitions by project to avoid reloading workflows multiple times
  const projectDefinitionsMap = groupDefinitionsByProject(definitions);

  // Step 4: Load and register workflows for all projects
  const inngestFunctions = await registerProjectWorkflows(
    projectDefinitionsMap,
    workflowClient,
    logger
  );

  return {
    functions: inngestFunctions,
    stats: {
      total: inngestFunctions.length,
      errors: 0, // We log errors but don't track count here
    },
  };
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Load active workflow definitions from database
 *
 * Queries for definitions with status='active' and selects
 * only the fields needed for registration.
 */
async function loadActiveDefinitions(): Promise<WorkflowDefinition[]> {
  const definitions = await getWorkflowDefinitions({
    where: { status: "active" },
    select: {
      id: true,
      identifier: true,
      name: true,
      path: true,
      project_id: true,
    },
  });

  return definitions;
}

/**
 * Group workflow definitions by project ID
 *
 * Optimizes loading by grouping definitions so each project's
 * workflows are loaded once, then matched against all its definitions.
 */
function groupDefinitionsByProject(
  definitions: WorkflowDefinition[]
): Map<string, WorkflowDefinition[]> {
  const projectDefinitionsMap = new Map<string, WorkflowDefinition[]>();

  for (const definition of definitions) {
    if (definition.project_id) {
      if (!projectDefinitionsMap.has(definition.project_id)) {
        projectDefinitionsMap.set(definition.project_id, []);
      }
      projectDefinitionsMap.get(definition.project_id)!.push(definition);
    }
  }

  return projectDefinitionsMap;
}

/**
 * Load and register workflows for all projects
 *
 * For each project:
 * - Loads project metadata from database
 * - Creates project-scoped runtime
 * - Loads all workflow files from disk (with cache busting)
 * - Matches definitions against loaded workflows
 * - Archives definitions that no longer have matching files
 *
 * Returns array of Inngest functions ready for registration.
 */
async function registerProjectWorkflows(
  projectDefinitionsMap: Map<string, WorkflowDefinition[]>,
  workflowClient: FastifyInstance["workflowClient"],
  logger: FastifyBaseLogger
): Promise<InngestFunction.Any[]> {
  const inngestFunctions = [];

  for (const [projectId, projectDefinitions] of projectDefinitionsMap) {
    try {
      // Get project path
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { path: true, name: true },
      });

      if (!project) {
        logger.warn(
          { projectId },
          "Project not found for workflow definitions"
        );
        continue;
      }

      // Create project-scoped runtime
      const runtime = createWorkflowRuntime(workflowClient!, projectId, logger);

      // Load all workflows from project ONCE
      const { workflows } = await loadProjectWorkflows(
        project.path,
        runtime,
        logger
      );

      // Match and register all definitions from this project
      for (const definition of projectDefinitions) {
        const workflow = workflows.find(
          (w) => w.definition.config.id === definition.identifier
        );

        if (workflow) {
          inngestFunctions.push(workflow.inngestFunction);
          logger.info(
            {
              workflowId: definition.identifier,
              workflowName: definition.name,
              projectId,
            },
            "Registered project workflow"
          );
        } else {
          logger.warn(
            {
              definitionId: definition.id,
              identifier: definition.identifier,
              path: definition.path,
            },
            `    ✗ ${definition.name} (${definition.identifier}) - file no longer exports matching definition`
          );

          await updateWorkflowDefinition({
            id: definition.id,
            data: {
              status: "archived",
              file_exists: false,
              load_error:
                "Workflow file no longer exports matching definition",
              archived_at: new Date(),
            },
          });
        }
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error(
        { projectId, error: errorMessage },
        "Failed to load workflows for project"
      );

      // Mark all definitions from this project as archived
      for (const definition of projectDefinitions) {
        await updateWorkflowDefinition({
          id: definition.id,
          data: {
            status: "archived",
            file_exists: false,
            load_error: errorMessage,
            archived_at: new Date(),
          },
        });
      }
    }
  }

  return inngestFunctions;
}
