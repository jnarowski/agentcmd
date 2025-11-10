import { Channels } from "@/shared/websocket/channels";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import type { PhaseDefinition } from "agentcmd-workflows";
import { updateWorkflowRun } from "@/server/domain/workflow/services/runs/updateWorkflowRun";
import { findOrCreateWorkflowEvent } from "@/server/domain/workflow/services/events/findOrCreateWorkflowEvent";
import { toId } from "@/server/domain/workflow/services/engine/steps/utils/toId";
import { toName } from "@/server/domain/workflow/services/engine/steps/utils/toName";

/**
 * Create phase step factory function
 *
 * Phase step executes a workflow phase WITHOUT Inngest step.run() wrapper
 * - Phases are organizational containers, not memoized steps
 * - Updates WorkflowRun.current_phase
 * - Creates phase events (started, completed, failed) with consistent step IDs for deduplication
 * - Broadcasts WebSocket events
 * - All nested steps tagged with phase name
 * - Relies on Inngest function-level retries
 * - Validates phase ID against config (dev only)
 *
 * @param context - Runtime context (will be mutated to set currentPhase)
 * @returns Phase step function
 */
export function createPhaseStep<TPhases extends readonly PhaseDefinition[] | undefined>(
  context: RuntimeContext<TPhases>
) {
  return async function phase<T>(
    idOrName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const id = toId(idOrName);
    const name = toName(idOrName);
    const { runId, projectId, logger, config } = context;

    // Validate phase ID in development
    if (process.env.NODE_ENV !== "production" && config.phases) {
      // System phases (_system_*) are exempt from validation
      if (!id.startsWith("_system_")) {
        const validPhases = config.phases.map((p: string | { id: string }) =>
          typeof p === "string" ? p : p.id
        );
        if (!validPhases.includes(id)) {
          throw new Error(
            `Invalid phase ID "${id}". Valid phases: ${validPhases.join(", ")}`
          );
        }
      }
    }

    // Generate consistent step ID for phase lifecycle events (for deduplication on replay)
    const phaseStepId = `phase-${id}-lifecycle`;

    logger.info({ runId, phase: name }, "Phase started");

    // Update current_phase in execution using domain service
    await updateWorkflowRun({
      runId,
      data: { current_phase: id },
      logger,
    });

    // Set current phase in context (for nested step tagging)
    context.currentPhase = id;

    // Create phase_started event with step ID for idempotency
    await findOrCreateWorkflowEvent({
      workflow_run_id: runId,
      event_type: "phase_started",
      event_data: {
        title: `Phase Started: ${name}`,
        body: `Starting phase "${name}"`,
        phase: id,
      },
      phase: id,
      inngest_step_id: phaseStepId,
      logger,
    });

    // Broadcast phase started
    broadcast(Channels.project(projectId), {
      type: "workflow:phase:started",
      data: {
        runId,
        phase: id,
        timestamp: new Date().toISOString(),
      },
    });

    try {
      // Execute phase function (Inngest handles retries at function level)
      const result = await fn();

      // Success - create phase_completed event with step ID
      await findOrCreateWorkflowEvent({
        workflow_run_id: runId,
        event_type: "phase_completed",
        event_data: {
          title: `Phase Completed: ${name}`,
          body: `Phase "${name}" completed successfully`,
          phase: id,
        },
        phase: id,
        inngest_step_id: phaseStepId,
        logger,
      });

      // Broadcast phase completed
      broadcast(Channels.project(projectId), {
        type: "workflow:phase:completed",
        data: {
          runId,
          phase: id,
          timestamp: new Date().toISOString(),
        },
      });

      logger.info({ runId, phase: name }, "Phase completed");

      return result;
    } catch (error) {
      const err = error as Error;

      logger.error(
        { runId, phase: name, error: err.message },
        "Phase failed"
      );

      // Create phase_failed event with step ID
      await findOrCreateWorkflowEvent({
        workflow_run_id: runId,
        event_type: "phase_failed",
        event_data: {
          title: `Phase Failed: ${name}`,
          body: `Phase "${name}" failed. Error: ${err.message}`,
          phase: id,
          attempts: 1,
          error: err.message,
        },
        phase: id,
        inngest_step_id: phaseStepId,
        logger,
      });

      broadcast(Channels.project(projectId), {
        type: "workflow:phase:failed",
        data: {
          runId,
          phase: id,
          error: err.message,
          timestamp: new Date().toISOString(),
        },
      });

      // Throw error - Inngest will handle retry at function level
      throw error;
    }
  };
}
