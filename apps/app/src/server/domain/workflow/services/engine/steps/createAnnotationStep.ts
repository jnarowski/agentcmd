import type { GetStepTools } from "inngest";
import { Channels } from "@/shared/websocket/channels";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import { createWorkflowEvent } from "@/server/domain/workflow/services/events/createWorkflowEvent";
import { generateInngestStepId } from "@/server/domain/workflow/services/engine/steps/utils/generateInngestStepId";
import { toId } from "@/server/domain/workflow/services/engine/steps/utils/toId";
import { toName } from "@/server/domain/workflow/services/engine/steps/utils/toName";

export interface AnnotationStepConfig {
  message: string;
}

/**
 * Create annotation step factory function
 * Adds progress notes/annotations to workflow timeline
 * Uses Inngest step.run() for idempotency (no duplicates on replay)
 */
export function createAnnotationStep(
  context: RuntimeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
) {
  return async function annotation(
    idOrName: string,
    config: AnnotationStepConfig
  ): Promise<void> {
    const id = toId(idOrName);
    const name = toName(idOrName);
    const { runId, projectId, currentPhase, logger } = context;
    const message = config.message;

    // Generate phase-prefixed Inngest step ID
    const inngestStepId = generateInngestStepId(context, id);

    // Wrap in Inngest step.run for memoization
    return (await inngestStep.run(inngestStepId, async () => {
      // Create annotation event using domain service
      const event = await createWorkflowEvent({
        workflow_run_id: runId,
        event_type: "annotation_added",
        event_data: {
          message,
        },
        phase: currentPhase,
        logger,
      });

      // Broadcast annotation
      broadcast(Channels.project(projectId), {
        type: "workflow:annotation:created",
        data: {
          runId,
          message,
          phase: currentPhase,
          timestamp: event.created_at.toISOString(),
        },
      });

      logger.debug(
        { runId, name, message, phase: currentPhase },
        "Annotation added"
      );
    })) as unknown as Promise<void>;
  };
}
