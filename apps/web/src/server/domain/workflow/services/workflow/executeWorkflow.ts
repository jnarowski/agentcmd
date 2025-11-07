import { prisma } from "@/shared/prisma";
import Ajv from "ajv";
import type { ExecuteWorkflowOptions } from "@/server/domain/workflow/types/ExecuteWorkflowOptions";

// Create Ajv instance for JSON Schema validation
const ajv = new Ajv();

/**
 * Execute a workflow by triggering the Inngest workflow engine.
 * The engine will process steps asynchronously in the background.
 */
export async function executeWorkflow({
  runId,
  fastify: fastifyOrWorkflowClient,
  logger,
}: ExecuteWorkflowOptions): Promise<void> {
  // Get execution details
  const execution = await prisma.workflowRun.findUnique({
    where: { id: runId },
    include: {
      workflow_definition: true,
      project: true,
    },
  });

  if (!execution) {
    throw new Error(`Workflow execution ${runId} not found`);
  }

  if (!execution.workflow_definition) {
    throw new Error(`Workflow definition not found for execution ${runId}`);
  }

  // Validate args against argsSchema if defined
  if (execution.workflow_definition.args_schema) {
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
        await prisma.workflowRun.update({
          where: { id: runId },
          data: {
            status: "failed",
            error_message: errorMessage,
            completed_at: new Date(),
          },
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

      await prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: "failed",
          error_message: `Validation error: ${err.message}`,
          completed_at: new Date(),
        },
      });

      throw err;
    }
  }

  // Update execution status to pending (queued for processing)
  await prisma.workflowRun.update({
    where: { id: runId },
    data: {
      status: "pending",
      started_at: new Date(),
    },
  });

  // Get workflow client
  const workflowClient =
    "workflowClient" in fastifyOrWorkflowClient
      ? fastifyOrWorkflowClient.workflowClient
      : (
          fastifyOrWorkflowClient as {
            workflowClient?: {
              send: (event: { name: string; data: unknown }) => Promise<void>;
            };
          }
        ).workflowClient;

  if (!workflowClient) {
    throw new Error(
      "Workflow client not initialized. Please initialize workflow engine first."
    );
  }

  // Trigger workflow via Inngest using identifier with workflow/ prefix (Inngest convention)
  const eventName = `workflow/${execution.workflow_definition.identifier}`;
  const eventData = {
    runId,
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

  logger?.info(
    {
      runId,
      eventName,
      workflowIdentifier: execution.workflow_definition.identifier,
      projectId: execution.project_id,
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

  // Returns immediately - workflow will be processed by Inngest in the background
}
