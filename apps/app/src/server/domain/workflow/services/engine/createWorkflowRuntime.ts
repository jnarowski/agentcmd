import type { Inngest, InngestFunction } from "inngest";
import type {
  WorkflowRuntime,
  WorkflowConfig,
  WorkflowFunction,
  WorkflowStep,
} from "agentcmd-workflows";
import type { RuntimeContext } from "../../types/engine.types";
import type { FastifyBaseLogger } from "fastify";
import { prisma } from "@/shared/prisma";
import { createWorkflowEvent } from "@/server/domain/workflow/services";
import { broadcastWorkflowEvent } from "../events/broadcastWorkflowEvent";
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
  createCleanupWorkspaceStep,
} from "./steps";

/**
 * Create workflow runtime adapter that implements the SDK interface
 * This provides real implementations of all step methods
 *
 * @param inngest - Inngest client instance
 * @param logger - Fastify logger
 * @returns WorkflowRuntime implementation
 */
export function createWorkflowRuntime(
  inngest: Inngest,
  logger: FastifyBaseLogger
): WorkflowRuntime {
  return {
    createInngestFunction<TPhases extends readonly import("agentcmd-workflows").PhaseDefinition[] | undefined>(
      config: WorkflowConfig<TPhases>,
      fn: WorkflowFunction<TPhases>
    ): InngestFunction<
      // @ts-ignore - retries type
      { id: string; name?: string; retries?: number },
      {  event: string; data: Record<string, unknown> },
      Record<string, unknown>
    > {
      // Create Inngest function with custom step implementations
      // Using workflow/${id} convention to match event sender (Inngest convention)
      return inngest.createFunction(
        {
          id: config.id,
          name: config.name ?? config.id,
          ...(config.timeout && {
            timeouts: {
              finish: `${Math.floor(config.timeout / 1000)}s` as `${number}s`
            }
          }),
        },
        { event: `workflow/${config.id}` },
        async ({ event, step: inngestStep, runId: inngestRunId }) => {
          // Extract runtime context from event data
          const { runId, projectId, userId, projectPath } = event.data;

          // Create runtime context
          const context: RuntimeContext<TPhases> = {
            runId,
            projectId,
            userId,
            currentPhase: null,
            logger,
            projectPath,
            config,
          };

          // Create extended step object with custom methods
          const extendedStep: WorkflowStep = Object.assign({}, inngestStep, {
            // Override native step.run to track in database
            run: createRunStep(context, inngestStep),
            // Custom phase-based step methods
            // ONLY agent and cli use executeStep (which wraps inngestStep.run)
            // phase does NOT wrap in step.run (to avoid nesting warning)
            // All others wrap inngestStep.run() directly
            phase: createPhaseStep(context),
            agent: createAgentStep(context, inngestStep),
            git: createGitStep(context, inngestStep),
            cli: createCliStep(context, inngestStep),
            artifact: createArtifactStep(context, inngestStep),
            annotation: createAnnotationStep(context, inngestStep),
            ai: createAiStep(context, inngestStep),
            setupWorkspace: createSetupWorkspaceStep(context, inngestStep),
            cleanupWorkspace: createCleanupWorkspaceStep(context, inngestStep),
          }) as WorkflowStep;

          try {
            // Update execution status and emit event
            const startedAt = new Date();
            await prisma.workflowRun.update({
              where: { id: runId },
              data: {
                status: "running",
                started_at: startedAt,
                inngest_run_id: inngestRunId,
              },
            });

            await createWorkflowEvent({
              workflow_run_id: runId,
              // @ts-ignore - event data
              event_type: "workflow_started",
              // @ts-ignore - event data
              event_data: { timestamp: startedAt.toISOString() },
              logger,
            });

            // Emit execution:updated WebSocket event
            broadcastWorkflowEvent(projectId, {
              type: "workflow:run:updated",
              data: {
                run_id: runId,
                project_id: projectId,
                changes: {
                  status: "running",
                  started_at: startedAt,
                },
              },
            });

            logger.info({ runId, projectId, inngestRunId }, "Workflow started");

            // Call user's workflow function with enriched context
            const result = await fn({
              event,
              step: extendedStep,
            });

            // Emit workflow:completed event
            const completedAt = new Date();
            await prisma.workflowRun.update({
              where: { id: runId },
              data: {
                status: "completed",
                completed_at: completedAt,
              },
            });

            await createWorkflowEvent({
              workflow_run_id: runId,
              event_type: "workflow_completed",
              // @ts-ignore - event data
              event_data: { timestamp: completedAt.toISOString() },
              logger,
            });

            // Emit execution:updated WebSocket event
            broadcastWorkflowEvent(projectId, {
              type: "workflow:run:updated",
              data: {
                run_id: runId,
                project_id: projectId,
                changes: {
                  status: "completed",
                  completed_at: completedAt,
                },
              },
            });

            logger.info({ runId, projectId }, "Workflow completed");

            return result;
          } catch (error) {
            const err =
              error instanceof Error ? error : new Error(String(error));

            // Emit workflow:failed event
            const failedAt = new Date();
            await prisma.workflowRun.update({
              where: { id: runId },
              data: {
                status: "failed",
                completed_at: failedAt,
                error_message: err.message,
              },
            });

            await createWorkflowEvent({
              workflow_run_id: runId,
              event_type: "workflow_failed",
              // @ts-ignore - event data
              event_data: {
                error: err.message,
                timestamp: failedAt.toISOString(),
              },
              logger,
            });

            // Emit execution:updated WebSocket event
            broadcastWorkflowEvent(projectId, {
              type: "workflow:run:updated",
              data: {
                run_id: runId,
                project_id: projectId,
                changes: {
                  status: "failed",
                  completed_at: failedAt,
                  error_message: err.message,
                },
              },
            });

            logger.error(
              { runId, projectId, error: err.message },
              "Workflow failed"
            );

            throw error;
          }
        }
      );
    },
  };
}
