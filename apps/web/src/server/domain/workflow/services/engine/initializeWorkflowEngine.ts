import { fastifyPlugin } from "inngest/fastify";
import type { FastifyInstance } from "fastify";
import { createWorkflowClient } from "./createWorkflowClient";
import { createWorkflowRuntime } from "./createWorkflowRuntime";
import { loadProjectWorkflows } from "./loadProjectWorkflows";
import { scanAllProjectWorkflows } from "./scanAllProjectWorkflows";
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

  // Create workflow runtime adapter
  const runtime = createWorkflowRuntime(inngestClient, logger);

  // Store client and runtime on fastify instance for later access
  fastify.decorate("workflowClient", inngestClient);
  fastify.decorate("workflowRuntime", runtime);

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

  // Load all workflow definitions from database (now populated by scan)
  const definitions = await prisma.workflowDefinition.findMany({
    select: {
      id: true,
      identifier: true,
      name: true,
      path: true,
      project_id: true,
    },
  });

  logger.info({ count: definitions.length }, "Loading workflow definitions");

  // Collect Inngest functions
  const inngestFunctions = [];

  // Load each workflow from filesystem
  for (const definition of definitions) {
    try {
      // Get project path
      const project = await prisma.project.findUnique({
        where: { id: definition.project_id },
        select: { path: true },
      });

      if (!project) {
        logger.warn({ definitionId: definition.id }, "Project not found for workflow definition");
        continue;
      }

      // Load workflows from project (will reload from stored path)
      const workflows = await loadProjectWorkflows(project.path, runtime, logger);

      // Find matching workflow
      const workflow = workflows.find(
        (w) => w.definition.config.id === definition.identifier
      );

      if (workflow) {
        inngestFunctions.push(workflow.inngestFunction);
        logger.info(
          { workflowId: definition.identifier, name: definition.name, path: definition.path },
          "Registered workflow"
        );
      } else {
        logger.warn(
          { definitionId: definition.id, identifier: definition.identifier, path: definition.path },
          "Workflow file no longer exports matching definition"
        );
      }
    } catch (error) {
      logger.error(
        { definitionId: definition.id, error: (error as Error).message },
        "Failed to load workflow"
      );
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
    workflowClient: ReturnType<typeof createWorkflowClient>;
    workflowRuntime: ReturnType<typeof createWorkflowRuntime>;
  }
}
