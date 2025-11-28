import { serve } from "inngest/fastify";
import type { FastifyInstance } from "fastify";
import { createWorkflowClient } from "./createWorkflowClient";
import { loadWorkflows } from "./definitions/loadWorkflows";
import { config } from "@/server/config";

// Module-level mutable handler reference for hot-reloading
// This allows us to swap the Inngest handler without restarting the server
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentHandler: (req: any, reply: any) => Promise<unknown>;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Initialize workflow engine and register Inngest endpoint
 *
 * Orchestrates the following steps:
 * 1. Creates Inngest client with SQLite memoization
 * 2. Loads workflows (scan → load → register)
 * 3. Creates Inngest handler and registers Fastify route
 * 4. Sets up hot-reload decorator for runtime updates
 *
 * The resulting endpoint at /api/workflows/inngest bypasses JWT auth
 * and uses Inngest signing key validation instead.
 *
 * @param fastify - Fastify instance
 */
export async function initializeWorkflowEngine(
  fastify: FastifyInstance
): Promise<void> {
  const logger = fastify.log;

  logger.info("=== WORKFLOW ENGINE INITIALIZATION ===");

  // Debug: Log Inngest keys from config
  logger.info(
    {
      eventKey: config.workflow.eventKey
        ? `${config.workflow.eventKey.substring(0, 8)}...`
        : "MISSING",
      signingKey: config.workflow.signingKey
        ? `${config.workflow.signingKey.substring(0, 8)}...`
        : "MISSING",
      baseUrl: process.env.INNGEST_BASE_URL,
    },
    "Inngest config from env"
  );

  // Log Inngest configuration for self-hosted setup
  if (config.workflow.eventKey && config.workflow.signingKey) {
    logger.info(
      "\nInngest keys (for self-hosted `inngest start`):\n" +
        `  --event-key ${config.workflow.eventKey}\n` +
        `  --signing-key ${config.workflow.signingKey}\n`
    );
  }

  // Step 1: Create Inngest client and attach to Fastify
  // Note: baseUrl and isDev are controlled via environment variables
  // set by setInngestEnvironment() in server/index.ts
  const inngestClient = createWorkflowClient({
    appId: config.workflow.appId,
    eventKey: config.workflow.eventKey,
    memoizationDbPath: config.workflow.memoizationDbPath,
  });

  fastify.decorate("workflowClient", inngestClient);

  // Step 2: Load workflows (scan → load → register)
  const { functions: inngestFunctions } = await loadWorkflows(fastify);

  // Step 3: Create Inngest handler and register route
  currentHandler = createInngestHandler(
    inngestClient,
    inngestFunctions,
    config.workflow.signingKey,
    logger
  );
  registerInngestRoute(fastify, logger);

  // Step 4: Setup hot-reload decorator
  setupReloadDecorator(fastify, inngestClient, logger);

  logger.info(
    {
      endpoint: config.workflow.servePath,
      functions: inngestFunctions.length,
      memoization: config.workflow.memoizationDbPath,
    },
    `\nRegistered ${inngestFunctions.length} total workflow function(s)\n=== WORKFLOW ENGINE READY ===`
  );
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Create Inngest handler using serve()
 * Supports hot-reloading by returning handler that can be swapped at module level
 * Logs function details for debugging
 */
function createInngestHandler(
  inngestClient: ReturnType<typeof createWorkflowClient>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestFunctions: any[],
  signingKey: string | undefined,
  logger: FastifyInstance["log"]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): (req: any, reply: any) => Promise<unknown> {
  logger.info(
    {
      functionsCount: inngestFunctions.length,
      functionIds: inngestFunctions.map((f) => f.id()),
    },
    "Inngest functions collected"
  );

  // Create handler using serve() directly instead of fastifyPlugin
  // This allows us to swap the handler at runtime for hot-reloading
  // See: https://github.com/inngest/inngest-js/blob/main/packages/inngest/src/fastify.ts#L17-L36
  // This endpoint bypasses JWT auth and uses Inngest signing key validation
  return serve({
    client: inngestClient,
    functions: inngestFunctions,
    signingKey,
    // Pass custom logger to capture Inngest errors with full details
    // Use INNGEST_LOG_LEVEL env var or default to debug
    logLevel:
      (process.env.INNGEST_LOG_LEVEL as "debug" | "info" | "warn" | "error") ||
      "debug",
  });
}

/**
 * Register Fastify route that delegates to Inngest handler
 * Wraps handler with error logging for debugging
 */
function registerInngestRoute(
  fastify: FastifyInstance,
  logger: FastifyInstance["log"]
): void {
  fastify.route({
    method: ["GET", "POST", "PUT"],
    url: config.workflow.servePath,
    handler: async (req, reply) => {
      try {
        return await currentHandler(req, reply);
      } catch (error) {
        // Serialize error properly for logging
        const errorDetails = {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : undefined,
          cause: error instanceof Error ? error.cause : undefined,
          url: req.url,
          method: req.method,
          headers: req.headers,
          body: req.body,
        };
        logger.error(errorDetails, "Inngest handler error");
        throw error;
      }
    },
  });
}

/**
 * Setup hot-reload decorator on Fastify instance
 *
 * Allows reloading workflow engine without server restart.
 * Uses loadWorkflows orchestrator and swaps handler atomically.
 */
function setupReloadDecorator(
  fastify: FastifyInstance,
  inngestClient: ReturnType<typeof createWorkflowClient>,
  logger: FastifyInstance["log"]
): void {
  fastify.decorate(
    "reloadWorkflowEngine",
    async (): Promise<{ total: number }> => {
      try {
        logger.info("Reloading workflow engine...");

        // Load workflows (scan → load → register)
        const { functions, stats } = await loadWorkflows(fastify);

        // Swap handler atomically
        currentHandler = serve({
          client: inngestClient,
          functions,
          signingKey: config.workflow.signingKey,
        });

        logger.info(
          { total: stats.total },
          "Workflow engine reloaded successfully"
        );

        return { total: stats.total };
      } catch (error) {
        logger.warn(
          {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
          "Failed to reload workflow engine"
        );
        throw error;
      }
    }
  );
}

// Type augmentation for Fastify decorators
declare module "fastify" {
  interface FastifyInstance {
    workflowClient?: ReturnType<typeof createWorkflowClient>;
    reloadWorkflowEngine?: () => Promise<{ total: number }>;
  }
}
