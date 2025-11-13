import type { Inngest, GetStepTools } from "inngest";
import type {
  WorkflowRuntime,
  WorkflowConfig,
  WorkflowFunction,
  WorkflowStep,
  WorkflowEvent,
  WorkspaceResult,
  PhaseDefinition,
} from "agentcmd-workflows";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import type { FastifyBaseLogger } from "fastify";
import {
  createWorkflowEvent,
  getWorkflowRunForExecution,
  updateWorkflowRun,
} from "@/server/domain/workflow/services";
import { buildWorkflowIdentifiers } from "@/server/domain/workflow/utils/buildWorkflowIdentifiers";
import {
  createPhaseStep,
  createAgentStep,
  createGitStep,
  createCliStep,
  createArtifactStep,
  createAnnotationStep,
  createRunStep,
  createAiStep,
} from "./steps";
import { setupWorkspace } from "./setupWorkspace";
import { setupSpec } from "./setupSpec";
import { finalizeWorkspace } from "./finalizeWorkspace";

/**
 * @fileoverview Workflow Runtime Adapter
 *
 * Creates runtime implementation of agentcmd-workflows SDK for Inngest-based execution.
 * Acts as adapter layer between abstract workflow SDK and concrete Inngest orchestration.
 *
 * **Architecture:**
 * - Implements WorkflowRuntime interface from agentcmd-workflows SDK
 * - Wraps Inngest step API with domain-specific step methods (agent, git, cli, etc.)
 * - Manages workflow lifecycle (start, completion, failure, cleanup)
 * - Handles workspace setup/teardown (worktree vs stay modes)
 * - Emits events for real-time WebSocket streaming to UI
 *
 * **Key Responsibilities:**
 * 1. Function creation: Translates SDK workflow configs to Inngest functions
 * 2. Step augmentation: Extends Inngest steps with custom workflow operations
 * 3. Lifecycle management: Tracks workflow state in DB and emits lifecycle events
 * 4. Workspace isolation: Sets up temporary worktrees or stays in project directory
 * 5. Error handling: Captures failures and ensures cleanup runs even on errors
 *
 * @see {WorkflowRuntime} - SDK interface this implements
 * @see {createAgentStep} - Custom step implementations in ./steps/
 */

/**
 * Generic type constraint for workflow phases
 */
type PhasesConstraint = readonly PhaseDefinition[] | undefined;

/**
 * Extracts the phase ID type from TPhases constraint
 */
type ExtractPhaseId<TPhases extends PhasesConstraint> =
  TPhases extends readonly PhaseDefinition[]
    ? TPhases[number] extends string
      ? TPhases[number]
      : TPhases[number] extends { id: infer Id extends string }
        ? Id
        : string
    : string;

// ============================================================================
// Constants
// ============================================================================

/**
 * System-reserved phase names for internal workflow operations
 */
const SYSTEM_PHASES = {
  /** Workspace setup phase (runs before user workflow) */
  SETUP: "_system_setup",
  /** Workspace cleanup phase (runs after user workflow) */
  FINALIZE: "_system_finalize",
} as const;

// ============================================================================
// Public API
// ============================================================================

/**
 * Create workflow runtime adapter that implements the SDK interface.
 * Provides real implementations of all step methods and handles workflow lifecycle.
 *
 * This is the primary entry point for creating executable workflows. It returns a runtime
 * that can translate abstract workflow definitions into concrete Inngest functions with
 * full database tracking, WebSocket streaming, and workspace management.
 *
 * **Usage:**
 * ```typescript
 * const runtime = createWorkflowRuntime(inngest, projectId, logger);
 * const workflowFn = runtime.createInngestFunction(config, async ({ step }) => {
 *   await step.agent("review", { prompt: "Review code" });
 *   await step.git("commit", { message: "Apply changes" });
 * });
 * ```
 *
 * @param inngest - Inngest client instance for workflow orchestration
 * @param projectId - Project ID for event scoping and WebSocket channels (null for global workflows)
 * @param logger - Fastify logger for structured logging throughout workflow execution
 * @returns WorkflowRuntime implementation with createInngestFunction method
 */
export function createWorkflowRuntime(
  inngest: Inngest,
  projectId: string | null,
  logger: FastifyBaseLogger
): WorkflowRuntime {
  return {
    createInngestFunction<TPhases extends PhasesConstraint>(
      config: WorkflowConfig<TPhases, Record<string, unknown>>,
      fn: WorkflowFunction<TPhases, Record<string, unknown>>
    ) {
      const { functionId, eventName } = buildWorkflowIdentifiers(
        config.id,
        projectId
      );

      return inngest.createFunction(
        {
          id: functionId,
          name: config.name ?? config.id,
          retries: 3, // Explicit retry config (Inngest default)
          onFailure: async ({ event, error }) => {
            // Catches failures AFTER all Inngest retries exhausted
            // This handles workflow execution failures (step errors, timeout, etc.)
            const runId = event.data.event?.data?.runId;
            const projectId = event.data.event?.data?.projectId;

            logger.error(
              {
                runId,
                projectId,
                error: error.message,
                stack: error.stack,
              },
              "Inngest function failed after retries - marking workflow as failed"
            );

            await handleWorkflowFailure(runId, projectId, error, logger);
          },
          ...(config.timeout && {
            timeouts: {
              finish: `${Math.floor(config.timeout / 1000)}s` as `${number}s`,
            },
          }),
        },
        { event: eventName },
        async ({ event, step: inngestStep, runId: inngestRunId }) => {
          const { runId, projectId, userId, projectPath } = event.data;

          const context: RuntimeContext<TPhases> = {
            runId,
            projectId,
            userId,
            currentPhase: null,
            logger,
            projectPath,
            config,
          };

          let run: Awaited<
            ReturnType<typeof getWorkflowRunForExecution>
          > | null = null;
          let workspace: WorkspaceResult | null = null;
          let extendedStep: WorkflowStep<ExtractPhaseId<TPhases>> | null = null;

          // SETUP PHASE: Catch errors before workflow execution
          // These errors should call handleWorkflowFailure since onFailure won't see them
          try {
            // Fetch workflow run
            run = await getWorkflowRunForExecution(runId);
            if (!run) {
              throw new Error(`Workflow run ${runId} not found`);
            }
          } catch (error) {
            // Pre-workflow errors (DB fetch, validation) - handle immediately
            logger.error(
              {
                runId,
                projectId,
                error: error instanceof Error ? error.message : String(error),
              },
              "Workflow setup failed"
            );

            await handleWorkflowFailure(runId, projectId, error, logger);

            throw error;
          }

          // EXECUTION PHASE: Let onFailure handle workflow execution errors
          // Catch and handle immediately, then re-throw for Inngest to also process
          try {
            extendedStep = extendInngestSteps(context, inngestStep);

            // Mark workflow as started
            await handleWorkflowStart(runId, projectId, inngestRunId, logger);

            // System setup phase: workspace and spec preparation
            if (!extendedStep) {
              throw new Error("Failed to create extended step");
            }

            const step = extendedStep; // Type narrowing for closure

            await step.phase(
              SYSTEM_PHASES.SETUP as ExtractPhaseId<TPhases>,
              async () => {
                // Setup workspace (may fail)
                workspace = await setupWorkspace({
                  run,
                  context,
                  inngestStep,
                  logger,
                });

                // Add workingDir to event.data for workflows to use
                event.data.workingDir = workspace.workingDir;

                // Setup spec file (generate if needed)
                const specFile = await setupSpec({
                  run,
                  event: event as WorkflowEvent,
                  step,
                  logger,
                });

                // Update event with spec file path
                event.data.specFile = specFile;
              }
            );

            // Execute workflow function
            const result = await fn({
              event: {
                name: event.name,
                data: event.data,
              },
              step: extendedStep,
            });

            // Mark workflow as completed
            await handleWorkflowCompletion(runId, projectId, logger);
            return result;
          } catch (error) {
            // Handle workflow execution errors immediately
            // Also let error propagate so onFailure can process in production
            logger.error(
              {
                runId,
                projectId,
                error: error instanceof Error ? error.message : String(error),
              },
              "Workflow execution failed - handling and re-throwing"
            );
            await handleWorkflowFailure(runId, projectId, error, logger);
            throw error;
          } finally {
            // Always attempt cleanup (non-fatal)
            if (run && workspace && extendedStep) {
              await finalizeWorkspace(
                run,
                workspace,
                context,
                extendedStep,
                inngestStep,
                logger
              );
            }
          }
        }
      );
    },
  };
}

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * Extend Inngest step object with custom workflow methods.
 * Augments base Inngest step API with domain-specific operations (phase, agent, git, etc.)
 *
 * Note: Uses Inngest.Any to remain client-agnostic - workflows work with any Inngest
 * instance regardless of event schemas. We extend beyond Inngest's type system with
 * custom step methods, so specific client typing wouldn't provide additional safety.
 *
 * @param context - Runtime execution context
 * @param inngestStep - Base Inngest step tools (client-agnostic)
 * @returns Extended step object with all workflow methods
 */
function extendInngestSteps<TPhases extends PhasesConstraint>(
  context: RuntimeContext<TPhases>,
  inngestStep: GetStepTools<Inngest.Any>
): WorkflowStep<
  TPhases extends readonly PhaseDefinition[]
    ? TPhases[number] extends string
      ? TPhases[number]
      : TPhases[number] extends { id: infer Id extends string }
        ? Id
        : string
    : string
> {
  return {
    ...inngestStep,
    agent: createAgentStep(context, inngestStep),
    ai: createAiStep(context, inngestStep),
    annotation: createAnnotationStep(context, inngestStep),
    artifact: createArtifactStep(context, inngestStep),
    cli: createCliStep(context, inngestStep),
    git: createGitStep(context, inngestStep),
    phase: createPhaseStep(context),
    run: createRunStep(context, inngestStep),
  } as WorkflowStep;
}

/**
 * Emit a lifecycle event with user-friendly messages.
 * Centralizes event emission for workflow start, completion, and failure.
 *
 * @param runId - Workflow run ID
 * @param eventType - Type of lifecycle event
 * @param data - Event data with title, body, and optional fields
 * @param logger - Fastify logger instance
 */
async function emitLifecycleEvent(
  runId: string,
  eventType: "workflow_started" | "workflow_completed" | "workflow_failed",
  data: {
    title: string;
    body: string;
    timestamp: string;
    error?: string;
  },
  logger: FastifyBaseLogger
): Promise<void> {
  await createWorkflowEvent({
    workflow_run_id: runId,
    event_type: eventType,
    event_data: data,
    logger,
  });
}

/**
 * Handle workflow start lifecycle.
 * Updates database status to 'running', emits lifecycle event for UI, and logs start.
 *
 * @param runId - Workflow run ID
 * @param projectId - Project ID (null for global workflows)
 * @param inngestRunId - Inngest execution run ID for tracking
 * @param logger - Logger instance
 */
async function handleWorkflowStart(
  runId: string,
  projectId: string | null,
  inngestRunId: string,
  logger: FastifyBaseLogger
): Promise<void> {
  const startedAt = new Date();

  await updateWorkflowRun({
    runId,
    data: {
      status: "running",
      started_at: startedAt,
      inngest_run_id: inngestRunId,
    },
    logger,
  });

  await emitLifecycleEvent(
    runId,
    "workflow_started",
    {
      title: "Workflow Started",
      body: "Workflow execution has begun",
      timestamp: startedAt.toISOString(),
    },
    logger
  );

  logger.info({ runId, projectId, inngestRunId }, "Workflow started");
}

/**
 * Handle workflow completion lifecycle.
 * Updates database status to 'completed', emits success event for UI, and logs completion.
 *
 * @param runId - Workflow run ID
 * @param projectId - Project ID (null for global workflows)
 * @param logger - Logger instance
 */
async function handleWorkflowCompletion(
  runId: string,
  projectId: string | null,
  logger: FastifyBaseLogger
): Promise<void> {
  const completedAt = new Date();

  await updateWorkflowRun({
    runId,
    data: {
      status: "completed",
      completed_at: completedAt,
    },
    logger,
  });

  await emitLifecycleEvent(
    runId,
    "workflow_completed",
    {
      title: "Workflow Completed",
      body: "Workflow execution finished successfully",
      timestamp: completedAt.toISOString(),
    },
    logger
  );

  logger.info({ runId, projectId }, "Workflow completed");
}

/**
 * Handle workflow failure lifecycle.
 * Updates database status to 'failed' with error message, emits failure event for UI, and logs error.
 * This function is made extra robust to ensure at least the DB update succeeds.
 *
 * @param runId - Workflow run ID
 * @param projectId - Project ID (null for global workflows)
 * @param error - Error that caused failure (converted to Error instance if needed)
 * @param logger - Logger instance
 */
async function handleWorkflowFailure(
  runId: string,
  projectId: string | null,
  error: unknown,
  logger: FastifyBaseLogger
): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error));
  const failedAt = new Date();

  logger.error(
    { runId, projectId, error: err.message, stack: err.stack },
    "Workflow failed - updating status"
  );

  // Try to update DB status (most critical operation)
  try {
    await updateWorkflowRun({
      runId,
      data: {
        status: "failed",
        completed_at: failedAt,
        error_message: err.message,
      },
      logger,
    });
  } catch (updateError) {
    // If update fails, log but don't throw - we'll try the event next
    logger.error(
      {
        runId,
        error:
          updateError instanceof Error
            ? updateError.message
            : String(updateError),
      },
      "CRITICAL: Failed to update workflow run status to 'failed'"
    );
  }

  // Try to emit lifecycle event (secondary operation)
  try {
    await emitLifecycleEvent(
      runId,
      "workflow_failed",
      {
        title: "Workflow Failed",
        body: `Workflow execution encountered an error: ${err.message}`,
        timestamp: failedAt.toISOString(),
        error: err.message,
      },
      logger
    );
  } catch (eventError) {
    // If event emission fails, log but don't throw
    logger.error(
      {
        runId,
        error:
          eventError instanceof Error ? eventError.message : String(eventError),
      },
      "Failed to emit workflow failure event"
    );
  }
}
