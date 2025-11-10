import type { Inngest, GetStepTools } from "inngest";
import type {
  WorkflowRuntime,
  WorkflowConfig,
  WorkflowFunction,
  WorkflowStep,
  WorkflowContext,
  WorkspaceResult,
  PhaseDefinition,
} from "agentcmd-workflows";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import type { FastifyBaseLogger } from "fastify";
import type { WorkflowRun } from "@prisma/client";
import {
  createWorkflowEvent,
  getWorkflowRunForExecution,
  updateWorkflowRun,
} from "@/server/domain/workflow/services";
import { buildWorkflowIdentifiers } from "@/server/domain/workflow/utils/buildWorkflowIdentifiers";
import { getCurrentBranch } from "@/server/domain/git/services/getCurrentBranch";
import {
  createPhaseStep,
  createAgentStep,
  createGitStep,
  createCliStep,
  createArtifactStep,
  createAnnotationStep,
  createRunStep,
  createAiStep,
  createSetupWorkspaceStep,
  createFinalizeWorkspaceStep,
} from "./steps";

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
 * Extended workflow context that includes workspace
 * (workspace is a runtime extension, not part of base SDK)
 */
interface ExtendedWorkflowContext extends Omit<WorkflowContext, "step"> {
  step: WorkflowStep;
  workspace: WorkspaceResult | null;
}

/**
 * Generic type constraint for workflow phases
 */
type PhasesConstraint = readonly PhaseDefinition[] | undefined;

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
      config: WorkflowConfig<TPhases>,
      fn: WorkflowFunction<TPhases>
    ) {
      const { functionId, eventName } = buildWorkflowIdentifiers(
        config.id,
        projectId
      );

      return inngest.createFunction(
        {
          id: functionId,
          name: config.name ?? config.id,
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

          const run = await getWorkflowRunForExecution(runId);
          if (!run) {
            throw new Error(`Workflow run ${runId} not found`);
          }

          const extendedStep = extendInngestSteps(context, inngestStep);
          let workspace: WorkspaceResult | null = null;

          try {
            await handleWorkflowStart(runId, projectId, inngestRunId, logger);

            workspace = await setupWorkspace(
              run,
              context,
              extendedStep,
              inngestStep,
              logger
            );

            const result = await fn({
              event,
              step: extendedStep,
              workspace,
            } as ExtendedWorkflowContext);

            await handleWorkflowCompletion(runId, projectId, logger);
            return result;
          } catch (error) {
            await handleWorkflowFailure(runId, projectId, error, logger);
            throw error;
          } finally {
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
): WorkflowStep {
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
 * Setup workspace based on run mode.
 * Determines isolation strategy for workflow execution to prevent conflicts.
 *
 * **Modes:**
 * - `worktree`: Creates isolated git worktree for parallel workflows on separate branches
 * - `stay`: Uses existing project directory (must coordinate concurrent runs manually)
 * - `null`/`undefined`: Defaults to stay mode with current branch
 *
 * @param run - Workflow run with mode, branch info, and project path
 * @param context - Runtime execution context
 * @param extendedStep - Extended step object for phase tracking
 * @param inngestStep - Base Inngest step tools
 * @param logger - Logger instance
 * @returns Workspace result with mode, working directory, and branch name
 */
async function setupWorkspace<TPhases extends PhasesConstraint>(
  run: WorkflowRun & { project: { path: string } },
  context: RuntimeContext<TPhases>,
  extendedStep: WorkflowStep,
  inngestStep: GetStepTools<Inngest.Any>,
  logger: FastifyBaseLogger
): Promise<WorkspaceResult> {
  // No mode specified - default to stay mode (use existing project directory)
  if (!run.mode) {
    const currentBranch = await getCurrentBranch({
      projectPath: run.project.path,
    });

    logger.info(
      { runId: run.id },
      "No workspace mode specified, using stay mode"
    );

    return {
      mode: "stay",
      workingDir: run.project.path,
      branch: currentBranch ?? "main",
    };
  }

  // Explicit mode - delegate to workspace setup step (handles worktree/stay logic)
  const workspace = await extendedStep.phase(SYSTEM_PHASES.SETUP, async () => {
    const setupStep = createSetupWorkspaceStep(context, inngestStep);
    const worktreeName =
      run.mode === "worktree"
        ? `run-${run.id}-${run.branch_name || "main"}`
        : undefined;

    return await setupStep("setup-workspace", {
      branch: run.branch_name ?? undefined,
      baseBranch: run.base_branch ?? "main",
      projectPath: run.project.path,
      worktreeName,
    });
  });

  logger.info(
    { runId: run.id, mode: run.mode, workingDir: workspace.workingDir },
    "Workspace setup completed"
  );

  return workspace;
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

  await updateWorkflowRun({
    runId,
    data: {
      status: "failed",
      completed_at: failedAt,
      error_message: err.message,
    },
    logger,
  });

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

  logger.error({ runId, projectId, error: err.message }, "Workflow failed");
}

/**
 * Finalize workspace cleanup (non-fatal).
 * Runs in finally block to ensure cleanup even on workflow failure. Errors are logged but don't fail workflow.
 *
 * **Behavior:**
 * - Worktree mode: Removes temporary worktree and cleans up git objects
 * - Stay mode: No cleanup needed (uses original project directory)
 * - No mode: Skips cleanup
 *
 * @param run - Workflow run with mode information
 * @param workspace - Workspace result from setup (null if setup was skipped)
 * @param context - Runtime execution context
 * @param extendedStep - Extended step object for phase tracking
 * @param inngestStep - Base Inngest step tools
 * @param logger - Logger instance
 */
async function finalizeWorkspace<TPhases extends PhasesConstraint>(
  run: WorkflowRun,
  workspace: WorkspaceResult | null,
  context: RuntimeContext<TPhases>,
  extendedStep: WorkflowStep,
  inngestStep: GetStepTools<Inngest.Any>,
  logger: FastifyBaseLogger
): Promise<void> {
  if (!workspace || !run.mode) {
    return;
  }

  try {
    await extendedStep.phase(SYSTEM_PHASES.FINALIZE, async () => {
      const finalizeStep = createFinalizeWorkspaceStep(context, inngestStep);
      await finalizeStep("finalize-workspace", {
        workspaceResult: workspace,
      });
    });

    logger.info({ runId: run.id, mode: run.mode }, "Workspace finalized");
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(
      { runId: run.id, error: err.message },
      "Failed to finalize workspace (non-fatal)"
    );
  }
}
