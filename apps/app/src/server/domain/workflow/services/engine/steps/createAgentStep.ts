import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import type { AgentStepConfig, AgentStepResult } from "agentcmd-workflows";
import type { AgentStepOptions } from "@/server/domain/workflow/types/event.types";
import { executeAgent } from "@/server/domain/session/services/executeAgent";
import { createSession } from "@/server/domain/session/services/createSession";
import { updateSession } from "@/server/domain/session/services/updateSession";
import { storeCliSessionId } from "@/server/domain/session/services/storeCliSessionId";
import { updateWorkflowStep } from "@/server/domain/workflow/services/steps/updateWorkflowStep";
import { withTimeout } from "@/server/domain/workflow/services/engine/steps/utils/withTimeout";
import { toId } from "@/server/domain/workflow/services/engine/steps/utils/toId";
import { toName } from "@/server/domain/workflow/services/engine/steps/utils/toName";
import { generateInngestStepId } from "@/server/domain/workflow/services/engine/steps/utils/generateInngestStepId";
import { findOrCreateStep } from "@/server/domain/workflow/services/engine/steps/utils/findOrCreateStep";
import { updateStepStatus } from "@/server/domain/workflow/services/engine/steps/utils/updateStepStatus";
import { handleStepFailure } from "@/server/domain/workflow/services/engine/steps/utils/handleStepFailure";
import { randomUUID } from "node:crypto";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import { Channels } from "@/shared/websocket/channels";
import { SessionEventTypes } from "@/shared/types/websocket.types";

const DEFAULT_AGENT_TIMEOUT = 1800000; // 30 minutes

/**
 * Create agent step factory function
 * Executes an AI agent with WebSocket streaming
 */
export function createAgentStep(
  context: RuntimeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
) {
  return async function agent(
    idOrName: string,
    config: AgentStepConfig,
    options?: AgentStepOptions
  ): Promise<AgentStepResult> {
    const id = toId(idOrName);
    const name = toName(idOrName);
    const timeout = options?.timeout ?? DEFAULT_AGENT_TIMEOUT;

    // Generate phase-prefixed Inngest step ID
    const inngestStepId = generateInngestStepId(context, id);

    return (await inngestStep.run(inngestStepId, async () => {
      const { projectId, userId, logger } = context;

      // Find or create step in database
      const step = await findOrCreateStep({
        context,
        inngestStepId,
        stepName: name,
        stepType: "agent",
      });

      // Update to running with input
      await updateStepStatus(context, step.id, "running", config);

      try {
        // Create agent session using domain service
        const sessionId = randomUUID();
        const session = await createSession({
          data: {
            projectId,
            userId,
            sessionId,
            agent: config.agent,
            type: 'workflow',
            name,
            metadataOverride: {}, // Empty metadata for workflow sessions
            cli_session_id: config.resume ?? sessionId, // Set CLI session ID (resume or new)
          },
        });

        // Track if session ID has been set (will be set on first message)
        let sessionIdSet = false;

        try {
          logger.info(
            { sessionId: session.id, agent: config.agent },
            "Executing agent"
          );

          // Execute agent with timeout (bypass permissions for workflow context)
          // If config.resume is provided, we're resuming an existing CLI session
          const shouldResume = !!config.resume;

          const result = await withTimeout(
            executeAgent({
              processTrackingId: session.id, // Always track by workflow DB session ID
              sessionId: session.cli_session_id!, // CLI session ID (always set now)
              resume: shouldResume,
              agent: config.agent as "claude" | "codex",
              prompt: config.prompt,
              workingDir: config.workingDir ?? context.projectPath,
              permissionMode: "bypassPermissions", // Hardcoded to bypass permissions in workflows
              json: config.json,
              onEvent: async ({ message }) => {
                // Set agent_session_id on first message (only once)
                if (!sessionIdSet) {
                  await updateWorkflowStep({
                    stepId: step.id,
                    agentSessionId: session.id,
                    logger,
                  });
                  sessionIdSet = true;
                }

                if (
                  message &&
                  typeof message === "object" &&
                  message !== null
                ) {
                  broadcast(Channels.session(session.id), {
                    type: SessionEventTypes.STREAM_OUTPUT,
                    data: { message, sessionId: session.id },
                  });
                }
              },
            }),
            timeout,
            "Agent execution"
          );

          // Store CLI session ID (e.g., Claude's session ID) in agent_session
          await storeCliSessionId({
            sessionId: session.id,
            cliSessionId: result.sessionId,
          });

          // Update step with database session ID (foreign key constraint)
          await updateWorkflowStep({
            stepId: step.id,
            agentSessionId: session.id,
            logger,
          });

          // Mark session as idle on successful completion
          await updateSession({
            id: session.id,
            data: {
              state: "idle",
            },
          });

          // Wrap result in new format
          const wrappedResult: AgentStepResult = {
            sessionId: result.sessionId || session.id,
            exitCode: result.exitCode,
            data: result.data ?? '',
            success: result.success,
            error: result.error,
            trace: [{
              command: config.prompt,
              output: result.error || 'Agent execution completed',
              exitCode: result.exitCode,
            }],
          };

          // Update to completed with wrapped output
          await updateStepStatus(
            context,
            step.id,
            "completed",
            undefined, // no input update
            wrappedResult // wrapped output
          );

          // Strip messages and return wrapped result
          return wrappedResult;
        } catch (error) {
          // Mark session as failed using domain service
          await updateSession({
            id: session.id,
            data: {
              state: "error",
              error_message:
                error instanceof Error ? error.message : String(error),
            },
          });

          throw error;
        }
      } catch (error) {
        // Handle failure
        await handleStepFailure(context, step.id, error as Error);
        throw error;
      }
    })) as unknown as Promise<AgentStepResult>;
  };
}
