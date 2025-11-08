import { stat } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { WorkflowDefinition } from "agentcmd-workflows";
import type { WorkflowRuntime } from "agentcmd-workflows";
import type { InngestFunction } from "inngest";
import type { FastifyBaseLogger } from "fastify";
import { findWorkflowFiles } from "./findWorkflowFiles";
import { extractWorkflowDefinition } from "./extractWorkflowDefinition";

/**
 * Load workflows from a project's .agent/workflows/definitions/ directory
 *
 * @param projectPath - Project filesystem path
 * @param runtime - Workflow runtime adapter
 * @param logger - Logger instance
 * @returns Array of Inngest functions
 */
export interface WorkflowLoadError {
  filePath: string;
  error: string;
}

export async function loadProjectWorkflows(
  projectPath: string,
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
  const workflowsDir = join(projectPath, ".agent/workflows/definitions");
  const results: Array<{
    definition: WorkflowDefinition;
    // @ts-ignore - inngest function type
    inngestFunction: InngestFunction<Record<string, unknown>, Record<string, unknown>>;
    filePath: string;
  }> = [];
  const errors: WorkflowLoadError[] = [];

  // Check if .agent/workflows/definitions directory exists
  try {
    const dirStat = await stat(workflowsDir);
    if (!dirStat.isDirectory()) {
      logger.debug(
        { projectPath },
        "No .agent/workflows/definitions directory found"
      );
      return { workflows: results, errors };
    }
  } catch {
    // Directory doesn't exist
    logger.debug(
      { projectPath },
      "No .agent/workflows/definitions directory found"
    );
    return { workflows: results, errors };
  }

  // Find all workflow files
  const files = await findWorkflowFiles(workflowsDir);
  logger.debug(
    { projectPath, filesFound: files.length },
    "Found workflow files"
  );

  // Load each file
  for (const file of files) {
    try {
      // Dynamic import with file URL
      const fileUrl = pathToFileURL(file).href;
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
          "Loaded workflow"
        );
      } else {
        logger.warn(
          { file },
          "File does not export a valid workflow definition"
        );
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error(
        { file, error: errorMessage },
        "Failed to load workflow file"
      );
      errors.push({
        filePath: file,
        error: errorMessage,
      });
    }
  }

  return { workflows: results, errors };
}
