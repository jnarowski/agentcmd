import { serve } from "inngest/fastify";
import type { FastifyInstance } from "fastify";
import { createWorkflowClient } from "./createWorkflowClient";
import { createWorkflowRuntime } from "./createWorkflowRuntime";
import { loadProjectWorkflows } from "./loadProjectWorkflows";
import { loadGlobalWorkflows } from "./loadGlobalWorkflows";
import { scanAllProjectWorkflows } from "./scanAllProjectWorkflows";
import { scanGlobalWorkflows } from "./scanGlobalWorkflows";
import { rescanAndLoadWorkflows, type ResyncDiff } from "./rescanAndLoadWorkflows";
import { prisma } from "@/shared/prisma";
import { config } from "@/server/config";

// Module-level mutable handler reference for hot-reloading
// This allows us to swap the Inngest handler without restarting the server
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentHandler: (req: any, reply: any) => Promise<unknown>;

/**
 * Initialize workflow engine and register Inngest endpoint
 *
 * - Creates Inngest client with SQLite memoization
 * - Creates workflow runtime adapter
 * - Loads all WorkflowDefinition records from database
 * - Dynamically imports workflow files
 * - Creates Inngest functions with runtime
 * - Registers /api/workflows/inngest endpoint (bypasses JWT auth)
 *
 * @param fastify - Fastify instance
 */
export async function initializeWorkflowEngine(
  fastify: FastifyInstance
): Promise<void> {
  const logger = fastify.log;

  logger.info("=== WORKFLOW ENGINE INITIALIZATION ===");

  // Create Inngest client
  const inngestClient = createWorkflowClient({
    appId: config.workflow.appId,
    eventKey: config.workflow.eventKey,
    isDev: config.workflow.devMode,
    memoizationDbPath: config.workflow.memoizationDbPath,
  });

  // Store Inngest client on fastify instance for later access
  fastify.decorate("workflowClient", inngestClient);

  // Scan global workflows first (no project dependency)
  logger.info("Scanning global workflows...");
  const globalRuntime = createWorkflowRuntime(inngestClient, null, logger);
  const globalWorkflowsCount = await scanGlobalWorkflows(globalRuntime, logger);

  if (globalWorkflowsCount > 0) {
    logger.info(
      { workflowsDiscovered: globalWorkflowsCount },
      `Discovered ${globalWorkflowsCount} global workflow(s)`
    );
  } else {
    logger.info("No global workflows found");
  }

  // Scan all projects for workflows BEFORE loading from database
  // This ensures database is populated with workflow definitions
  logger.info("Scanning projects for workflows...");
  const scanResults = await scanAllProjectWorkflows(fastify);

  if (scanResults.discovered > 0) {
    logger.info(
      {
        projectsScanned: scanResults.scanned,
        workflowsDiscovered: scanResults.discovered,
        errors: scanResults.errors.length,
      },
      `Discovered ${scanResults.discovered} workflow(s) in ${scanResults.scanned} project(s)`
    );
  } else {
    logger.info(
      { projectsScanned: scanResults.scanned },
      `No workflows found in ${scanResults.scanned} project(s)`
    );
  }

  if (scanResults.errors.length > 0) {
    logger.warn(
      { errors: scanResults.errors },
      `Encountered ${scanResults.errors.length} error(s) during workflow scanning`
    );
  }

  // Load all active workflow definitions from database (now populated by scan)
  const definitions = await prisma.workflowDefinition.findMany({
    where: {
      status: "active",
    },
    select: {
      id: true,
      identifier: true,
      name: true,
      path: true,
      scope: true,
      project_id: true,
    },
  });

  logger.info({ count: definitions.length }, `\nRegistering ${definitions.length} workflow definition(s)...`);

  // Collect Inngest functions
  const inngestFunctions = [];

  // Group definitions by scope and project to avoid reloading workflows multiple times
  const globalDefinitions = definitions.filter(d => d.scope === "global");
  const projectDefinitionsMap = new Map<string, typeof definitions>();

  for (const definition of definitions) {
    if (definition.scope === "project" && definition.project_id) {
      if (!projectDefinitionsMap.has(definition.project_id)) {
        projectDefinitionsMap.set(definition.project_id, []);
      }
      projectDefinitionsMap.get(definition.project_id)!.push(definition);
    }
  }

  // Load global workflows once
  if (globalDefinitions.length > 0) {
    try {
      const runtime = createWorkflowRuntime(inngestClient, null, logger);
      const { workflows } = await loadGlobalWorkflows(runtime, logger);

      for (const definition of globalDefinitions) {
        const workflow = workflows.find(
          (w) => w.definition.config.id === definition.identifier
        );

        if (workflow) {
          inngestFunctions.push(workflow.inngestFunction);
          logger.info(
            { workflowId: definition.identifier, workflowName: definition.name, scope: "global" },
            "Registered global workflow"
          );
        } else {
          logger.warn(
            { definitionId: definition.id, identifier: definition.identifier, path: definition.path },
            `    ✗ ${definition.name} (${definition.identifier}) - file no longer exports matching definition`
          );

          await prisma.workflowDefinition.update({
            where: { id: definition.id },
            data: {
              status: "archived",
              file_exists: false,
              load_error: "Workflow file no longer exports matching definition",
              archived_at: new Date(),
            },
          });
        }
      }
    } catch (error) {
      logger.error({ error: (error as Error).message }, "Failed to load global workflows");
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

      // Load all workflows from project ONCE
      const { workflows } = await loadProjectWorkflows(project.path, runtime, logger);

      // Match and register all definitions from this project
      for (const definition of projectDefinitions) {
        const workflow = workflows.find(
          (w) => w.definition.config.id === definition.identifier
        );

        if (workflow) {
          inngestFunctions.push(workflow.inngestFunction);
          logger.info(
            { workflowId: definition.identifier, workflowName: definition.name, projectId },
            "Registered project workflow"
          );
        } else {
          logger.warn(
            { definitionId: definition.id, identifier: definition.identifier, path: definition.path },
            `    ✗ ${definition.name} (${definition.identifier}) - file no longer exports matching definition`
          );

          await prisma.workflowDefinition.update({
            where: { id: definition.id },
            data: {
              status: "archived",
              file_exists: false,
              load_error: "Workflow file no longer exports matching definition",
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
        await prisma.workflowDefinition.update({
          where: { id: definition.id },
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

  // Register Inngest endpoint using serve() directly instead of fastifyPlugin
  // This allows us to swap the handler at runtime for hot-reloading
  // See: https://github.com/inngest/inngest-js/blob/main/packages/inngest/src/fastify.ts#L17-L36
  // This endpoint bypasses JWT auth and uses Inngest signing key validation
  currentHandler = serve({
    client: inngestClient,
    functions: inngestFunctions,
  });

  // Register route that delegates to currentHandler
  fastify.route({
    method: ["GET", "POST", "PUT"],
    url: config.workflow.servePath,
    handler: async (req, reply) => currentHandler(req, reply),
  });

  // Expose reloadWorkflowEngine decorator for hot-reloading
  fastify.decorate("reloadWorkflowEngine", async (): Promise<ResyncDiff> => {
    logger.info("Reloading workflow engine...");

    // Rescan and load workflows with cache busting
    const { functions, diff } = await rescanAndLoadWorkflows(
      fastify,
      inngestClient,
      logger
    );

    // Swap handler atomically
    currentHandler = serve({
      client: inngestClient,
      functions,
    });

    logger.info(
      {
        total: functions.length,
        new: diff.new.length,
        updated: diff.updated.length,
        archived: diff.archived.length,
        errors: diff.errors.length,
      },
      "Workflow engine reloaded successfully"
    );

    return diff;
  });

  logger.info(
    {
      endpoint: config.workflow.servePath,
      functions: inngestFunctions.length,
      memoization: config.workflow.memoizationDbPath,
    },
    `\nRegistered ${inngestFunctions.length} total workflow function(s)\n=== WORKFLOW ENGINE READY ===`
  );
}

// Type augmentation for Fastify decorators
declare module "fastify" {
  interface FastifyInstance {
    workflowClient?: ReturnType<typeof createWorkflowClient>;
    reloadWorkflowEngine?: () => Promise<ResyncDiff>;
  }
}
