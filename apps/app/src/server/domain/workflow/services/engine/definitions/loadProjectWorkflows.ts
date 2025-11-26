import { stat } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { register as registerLoader } from "node:module";
import type { WorkflowDefinition } from "agentcmd-workflows";
import type { WorkflowRuntime } from "agentcmd-workflows";
import type { InngestFunction } from "inngest";
import type { FastifyBaseLogger } from "fastify";
import { register as registerTsx } from "tsx/esm/api";
import { findWorkflowFiles } from "./findWorkflowFiles";
import { extractWorkflowDefinition } from "./extractWorkflowDefinition";

type WorkflowResult = {
  definition: WorkflowDefinition;
  // @ts-ignore - inngest function type
  inngestFunction: InngestFunction<
    Record<string, unknown>,
    Record<string, unknown>
  >;
  filePath: string;
};

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Load workflows from a project's .agent/workflows/definitions/ directory
 *
 * Orchestrates loading workflow files:
 * 1. Checks if workflows directory exists
 * 2. Finds all workflow files
 * 3. Sets up TypeScript and custom module loaders
 * 4. Loads and validates each workflow file
 * 5. Creates Inngest functions for each valid workflow
 *
 * @param projectPath - Project filesystem path
 * @param runtime - Workflow runtime adapter
 * @param logger - Logger instance
 * @returns Array of loaded workflows and any errors encountered
 */
export async function loadProjectWorkflows(
  projectPath: string,
  runtime: WorkflowRuntime,
  logger: FastifyBaseLogger
): Promise<{
  workflows: WorkflowResult[];
  errors: WorkflowLoadError[];
}> {
  const workflowsDir = join(projectPath, ".agent/workflows/definitions");
  const results: WorkflowResult[] = [];
  const errors: WorkflowLoadError[] = [];

  // Check if workflows directory exists
  const directoryExists = await checkWorkflowsDirectory(
    workflowsDir,
    projectPath,
    logger
  );

  if (!directoryExists) {
    return { workflows: results, errors };
  }

  // Find all workflow files
  const files = await findWorkflowFiles(workflowsDir);

  // Setup loaders for TypeScript and custom module resolution
  const cleanup = setupWorkflowLoaders(projectPath, workflowsDir);

  try {
    // Load each workflow file
    for (const file of files) {
      const result = await loadSingleWorkflow(file, runtime, logger);

      if (result.success && result.workflow) {
        results.push(result.workflow);
      } else if (result.error) {
        errors.push(result.error);
      }
    }

    return { workflows: results, errors };
  } finally {
    cleanup();
  }
}

export interface WorkflowLoadError {
  filePath: string;
  error: string;
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Check if workflows directory exists and is valid
 * Logs debug message if directory not found
 */
async function checkWorkflowsDirectory(
  workflowsDir: string,
  projectPath: string,
  logger: FastifyBaseLogger
): Promise<boolean> {
  try {
    const dirStat = await stat(workflowsDir);

    if (!dirStat.isDirectory()) {
      logger.debug(
        { projectPath },
        "No .agent/workflows/definitions directory found"
      );
      return false;
    }

    return true;
  } catch {
    // Directory doesn't exist
    logger.debug(
      { projectPath },
      "No .agent/workflows/definitions directory found"
    );
    return false;
  }
}

/**
 * Setup TypeScript and custom module loaders
 * Enables user workflows to use:
 * - import { foo } from "./utils" (no extension)
 * - import { z } from "zod" (from project's node_modules)
 *
 * @returns Cleanup function to unregister loaders
 */
function setupWorkflowLoaders(
  projectPath: string,
  workflowsDir: string
): () => void {
  // Register custom loader for extensionless imports + project node_modules resolution
  const loaderPath = new URL("./workflowLoader.mjs", import.meta.url).href;
  registerLoader(loaderPath, {
    parentURL: import.meta.url,
    data: { projectPath },
  });

  // Register tsx for TypeScript compilation
  const unregisterTsx = registerTsx({
    namespace: pathToFileURL(workflowsDir).href,
  });

  // Return cleanup function (custom module loader is process-global, no cleanup needed)
  return () => {
    unregisterTsx();
  };
}

/**
 * Load and validate a single workflow file
 * Creates Inngest function if workflow definition is valid
 *
 * @returns Success result with workflow data or error result
 */
async function loadSingleWorkflow(
  file: string,
  runtime: WorkflowRuntime,
  logger: FastifyBaseLogger
): Promise<
  | { success: true; workflow: WorkflowResult; error?: never }
  | { success: false; workflow?: never; error: WorkflowLoadError }
  | { success: false; workflow?: never; error?: never }
> {
  try {
    // Dynamic import with file URL and cache busting
    // Cache busting ensures Node.js re-imports the module on each resync
    const fileUrl = pathToFileURL(file).href + "?v=" + Date.now();
    const module = await import(fileUrl);

    // Extract workflow definition
    const definition = extractWorkflowDefinition(module);

    if (!definition) {
      logger.warn({ file }, "File does not export a valid workflow definition");
      return { success: false };
    }

    // Create Inngest function with runtime
    const inngestFunction = definition.createInngestFunction(runtime);

    logger.debug(
      { file, workflowId: definition.config.id },
      "Loaded workflow"
    );

    return {
      success: true,
      workflow: {
        definition,
        inngestFunction,
        filePath: file,
      },
    };
  } catch (error) {
    const errorMessage = (error as Error).message;
    logger.error({ file, error: errorMessage }, "Failed to load workflow file");

    return {
      success: false,
      error: {
        filePath: file,
        error: errorMessage,
      },
    };
  }
}
