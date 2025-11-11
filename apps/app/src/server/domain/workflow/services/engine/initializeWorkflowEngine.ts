import { fastifyPlugin } from "inngest/fastify";
import type { FastifyInstance } from "fastify";
import { createWorkflowClient } from "./createWorkflowClient";
import { createWorkflowRuntime } from "./createWorkflowRuntime";
import { loadProjectWorkflows } from "./loadProjectWorkflows";
import { loadGlobalWorkflows } from "./loadGlobalWorkflows";
import { scanAllProjectWorkflows } from "./scanAllProjectWorkflows";
import { scanGlobalWorkflows } from "./scanGlobalWorkflows";
import { prisma } from "@/shared/prisma";
import config from "@/server/config";

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

  // Check if workflow engine is enabled
  if (!config.workflow.enabled) {
    logger.info("Workflow engine disabled");
    return;
  }

  logger.info("Initializing workflow engine");

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

  logger.info({ count: definitions.length }, "Loading workflow definitions");

  // Collect Inngest functions
  const inngestFunctions = [];

  // Load each workflow from filesystem
  for (const definition of definitions) {
    try {
      if (definition.scope === "global") {
        // Load global workflow
        const runtime = createWorkflowRuntime(inngestClient, null, logger);
        const { workflows } = await loadGlobalWorkflows(runtime, logger);

        // Find matching workflow
        const workflow = workflows.find(
          (w) => w.definition.config.id === definition.identifier
        );

        if (workflow) {
          inngestFunctions.push(workflow.inngestFunction);
          logger.info(
            { workflowId: definition.identifier, name: definition.name, path: definition.path, scope: "global" },
            "Registered global workflow"
          );
        } else {
          logger.warn(
            { definitionId: definition.id, identifier: definition.identifier, path: definition.path },
            "Workflow file no longer exports matching definition - marking as archived"
          );

          // Mark workflow as archived since file no longer exports definition
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
      } else {
        // Load project workflow
        const project = await prisma.project.findUnique({
          where: { id: definition.project_id! },
          select: { path: true },
        });

        if (!project) {
          logger.warn({ definitionId: definition.id }, "Project not found for workflow definition");
          continue;
        }

        // Create project-scoped runtime
        const runtime = createWorkflowRuntime(inngestClient, definition.project_id!, logger);

        // Load workflows from project (will reload from stored path)
        const { workflows } = await loadProjectWorkflows(project.path, runtime, logger);

        // Find matching workflow
        const workflow = workflows.find(
          (w) => w.definition.config.id === definition.identifier
        );

        if (workflow) {
          inngestFunctions.push(workflow.inngestFunction);
          logger.info(
            { workflowId: definition.identifier, name: definition.name, path: definition.path, scope: "project" },
            "Registered project workflow"
          );
        } else {
          logger.warn(
            { definitionId: definition.id, identifier: definition.identifier, path: definition.path },
            "Workflow file no longer exports matching definition - marking as archived"
          );

          // Mark workflow as archived since file no longer exports definition
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
        { definitionId: definition.id, error: errorMessage },
        "Failed to load workflow - marking as archived"
      );

      // Mark workflow as archived since it failed to load
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

  // Register Inngest endpoint using the plugin pattern
  // This endpoint bypasses JWT auth and uses Inngest signing key validation
  await fastify.register(fastifyPlugin, {
    client: inngestClient,
    functions: inngestFunctions,
    options: {
      servePath: config.workflow.servePath,
    },
  });

  logger.info(
    {
      endpoint: config.workflow.servePath,
      functions: inngestFunctions.length,
      memoization: config.workflow.memoizationDbPath,
    },
    "Workflow engine initialized"
  );
}

// Type augmentation for Fastify decorators
declare module "fastify" {
  interface FastifyInstance {
    workflowClient?: ReturnType<typeof createWorkflowClient>;
  }
}
