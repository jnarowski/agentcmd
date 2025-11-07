import Ajv from "ajv";
import type { ExecuteWorkflowOptions } from "@/server/domain/workflow/types/ExecuteWorkflowOptions";
import type { WorkflowRun, WorkflowDefinition, Project } from "@prisma/client";
import type { FastifyBaseLogger } from "fastify";
import { getWorkflowRunForExecution } from "../runs/getWorkflowRunForExecution";
import { updateWorkflowRun } from "../runs/updateWorkflowRun";
import type { Inngest } from "inngest";

// Create Ajv instance for JSON Schema validation
const ajv = new Ajv();

/**
 * Execute a workflow by triggering the Inngest workflow engine.
 * The engine will process steps asynchronously in the background.
 */
export async function executeWorkflow({
  runId,
  workflowClient,
  logger,
}: ExecuteWorkflowOptions): Promise<void> {
  // Get execution details
  const execution = await getWorkflowRunForExecution(runId);

  if (!execution) {
    throw new Error(`Workflow execution ${runId} not found`);
  }

  if (!execution.workflow_definition) {
    throw new Error(`Workflow definition not found for execution ${runId}`);
  }

  // Validate args against schema
  await validateWorkflowArgs(execution, runId, logger);

  // Update execution status to pending (queued for processing)
  await updateWorkflowRun({
    runId,
    data: {
      status: "pending",
      started_at: new Date(),
    },
    logger,
  });

  // Build and send workflow event
  const eventName = `workflow/${execution.workflow_definition.identifier}`;
  const eventData = buildWorkflowEventData(execution);

  await sendWorkflowEvent(workflowClient, eventName, eventData, runId, logger);
}

// ============================================================================
// Private Helper Functions
// ============================================================================

/**
 * Validate workflow arguments against the JSON schema defined in workflow definition.
 * Updates workflow run status to 'failed' if validation fails.
 *
 * @private
 */
async function validateWorkflowArgs(
  execution: WorkflowRun & {
    workflow_definition: WorkflowDefinition | null;
    project: Project;
  },
  runId: string,
  logger?: FastifyBaseLogger
): Promise<void> {
  if (!execution.workflow_definition?.args_schema) {
    return; // No schema to validate against
  }

  try {
    const validate = ajv.compile(
      execution.workflow_definition.args_schema as object
    );
    const valid = validate(execution.args);

    if (!valid) {
      const errorMessage = `Invalid workflow args: ${JSON.stringify(validate.errors)}`;
      logger?.error(
        {
          runId,
          workflowDefinitionId: execution.workflow_definition.id,
          validationErrors: validate.errors,
        },
        "Workflow args validation failed"
      );

      // Update execution status to failed
      await updateWorkflowRun({
        runId,
        data: {
          status: "failed",
          error_message: errorMessage,
          completed_at: new Date(),
        },
        logger,
      });

      throw new Error(errorMessage);
    }

    logger?.info(
      { runId, workflowDefinitionId: execution.workflow_definition.id },
      "Workflow args validated successfully"
    );
  } catch (error) {
    // If validation fails or throws, mark execution as failed
    if (
      error instanceof Error &&
      error.message.startsWith("Invalid workflow args:")
    ) {
      throw error; // Re-throw validation errors
    }

    // Handle unexpected validation errors
    const err = error instanceof Error ? error : new Error(String(error));
    logger?.error(
      { err, runId },
      "Unexpected error during workflow args validation"
    );

    await updateWorkflowRun({
      runId,
      data: {
        status: "failed",
        error_message: `Validation error: ${err.message}`,
        completed_at: new Date(),
      },
      logger,
    });

    throw err;
  }
}

/**
 * Build workflow event data payload for Inngest.
 *
 * @private
 */
function buildWorkflowEventData(
  execution: WorkflowRun & {
    workflow_definition: WorkflowDefinition | null;
    project: Project;
  }
) {
  return {
    runId: execution.id,
    projectId: execution.project_id,
    projectPath: execution.project.path,
    userId: execution.user_id,
    specFile: execution.spec_file ?? undefined,
    specContent: execution.spec_content ?? undefined,
    branchFrom: execution.branch_from ?? undefined,
    branchName: execution.branch_name ?? undefined,
    worktreeName: execution.worktree_name ?? undefined,
    args: execution.args,
  };
}

/**
 * Send workflow execution event to Inngest workflow engine.
 * Logs success/failure and re-throws errors.
 *
 * @private
 */
async function sendWorkflowEvent(
  workflowClient: Inngest,
  eventName: string,
  eventData: unknown,
  runId: string,
  logger?: FastifyBaseLogger
): Promise<void> {
  logger?.info(
    {
      runId,
      eventName,
      projectId: (eventData as { projectId: string }).projectId,
    },
    "Sending workflow execution event to Inngest"
  );

  try {
    await workflowClient.send({
      name: eventName,
      data: eventData,
    });

    logger?.info(
      { runId, eventName },
      "Successfully sent workflow execution event to Inngest"
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger?.error(
      { err, runId, eventName },
      "Failed to send workflow execution event to Inngest"
    );
    throw err;
  }
}
