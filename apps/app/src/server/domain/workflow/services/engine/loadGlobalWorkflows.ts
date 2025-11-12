import { stat } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import type { WorkflowDefinition } from "agentcmd-workflows";
import type { WorkflowRuntime } from "agentcmd-workflows";
import type { InngestFunction } from "inngest";
import type { FastifyBaseLogger } from "fastify";
import { getGlobalWorkflowsDir } from "@/cli/utils/paths";
import { findWorkflowFiles } from "./findWorkflowFiles";
import { extractWorkflowDefinition } from "./extractWorkflowDefinition";

/**
 * Load workflows from global ~/.agentcmd/workflows/ directory
 *
 * @param runtime - Workflow runtime adapter
 * @param logger - Logger instance
 * @returns Array of Inngest functions
 */
export interface WorkflowLoadError {
  filePath: string;
  error: string;
}

export async function loadGlobalWorkflows(
  runtime: WorkflowRuntime,
  logger: FastifyBaseLogger
): Promise<{
  workflows: Array<{
    definition: WorkflowDefinition;
    // @ts-ignore - inngest function type
    inngestFunction: InngestFunction<Record<string, unknown>, Record<string, unknown>>;
    filePath: string;
  }>;
  errors: WorkflowLoadError[];
}> {
  const workflowsDir = getGlobalWorkflowsDir();
  const results: Array<{
    definition: WorkflowDefinition;
    // @ts-ignore - inngest function type
    inngestFunction: InngestFunction<Record<string, unknown>, Record<string, unknown>>;
    filePath: string;
  }> = [];
  const errors: WorkflowLoadError[] = [];

  // Check if global workflows directory exists
  try {
    const dirStat = await stat(workflowsDir);
    if (!dirStat.isDirectory()) {
      logger.debug(
        { workflowsDir },
        "Global workflows directory does not exist"
      );
      return { workflows: results, errors };
    }
  } catch {
    // Directory doesn't exist
    logger.debug(
      { workflowsDir },
      "Global workflows directory does not exist"
    );
    return { workflows: results, errors };
  }

  // Find all workflow files
  const files = await findWorkflowFiles(workflowsDir);
  logger.debug(
    { workflowsDir, filesFound: files.length },
    "Found global workflow files"
  );

  // Load each file
  for (const file of files) {
    try {
      // Dynamic import with file URL and cache busting
      // Cache busting ensures Node.js re-imports the module on each resync
      const fileUrl = pathToFileURL(file).href + "?v=" + Date.now();
      const module = await import(fileUrl);

      // Extract workflow definition
      const definition = extractWorkflowDefinition(module);

      if (definition) {
        // Create Inngest function with runtime
        const inngestFunction = definition.createInngestFunction(runtime);

        results.push({
          definition,
          inngestFunction,
          filePath: file,
        });

        logger.info(
          { file, workflowId: definition.config.id },
          "Loaded global workflow"
        );
      } else {
        logger.warn(
          { file },
          "Global workflow file does not export a valid workflow definition"
        );
      }
    } catch (error) {
      const errorMessage = (error as Error).message;

      // Check if this is a module resolution error
      const isModuleError = errorMessage.includes("Cannot find module");

      if (isModuleError) {
        logger.error(
          { file, error: errorMessage },
          `Failed to load global workflow: missing dependencies. Run 'cd ${workflowsDir.replace('/workflows', '')} && npm install'`
        );
      } else {
        logger.error(
          { file, error: errorMessage },
          "Failed to load global workflow file"
        );
      }

      errors.push({
        filePath: file,
        error: errorMessage,
      });
    }
  }

  return { workflows: results, errors };
}
