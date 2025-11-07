import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "../../../types/engine.types";
import type { AgentStepConfig, AgentStepResult } from "agentcmd-workflows";
import type { AgentStepOptions } from "../../../types/event.types";
import { executeAgent } from "@/server/domain/session/services/executeAgent";
import { createSession } from "@/server/domain/session/services/createSession";
import { updateSession } from "@/server/domain/session/services/updateSession";
import { storeCliSessionId } from "@/server/domain/session/services/storeCliSessionId";
import { updateWorkflowStep } from "../../steps/updateWorkflowStep";
import { withTimeout } from "./utils/withTimeout";
import { toId } from "./utils/toId";
import { toName } from "./utils/toName";
import { generateInngestStepId } from "./utils/generateInngestStepId";
import { findOrCreateStep } from "./utils/findOrCreateStep";
import { updateStepStatus } from "./utils/updateStepStatus";
import { handleStepFailure } from "./utils/handleStepFailure";
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
      const step = await findOrCreateStep(context, inngestStepId, name);

      // Update to running
      await updateStepStatus(context, step.id, "running");

      try {
        // Create agent session using domain service
        const sessionId = randomUUID();
        const session = await createSession({
          data: {
            projectId,
            userId,
            sessionId,
            agent: config.agent,
            name,
            metadataOverride: {}, // Empty metadata for workflow sessions
          },
        });

        // Update step with session ID immediately (before agent execution)
        // This allows frontend to start watching the session right away
        await updateWorkflowStep({
          stepId: step.id,
          agentSessionId: session.id,
          logger,
        });

        try {
          logger.info(
            { sessionId: session.id, agent: config.agent },
            "Executing agent"
          );

          console.log("Executing agent =============", {
            sessionId: session.id,
            agent: config.agent,
            prompt: config.prompt,
            workingDir: config.projectPath ?? context.projectPath,
          });
          // Execute agent with timeout
          const result = await withTimeout(
            executeAgent({
              sessionId: session.id,
              agent: config.agent as "claude" | "codex",
              prompt: config.prompt,
              workingDir: config.projectPath ?? context.projectPath,
              onEvent: ({ message }) => {
                if (message && typeof message === "object" && message !== null) {
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

          // Update step with CLI session ID (if available), otherwise use db session ID
          const agentSessionId = result.sessionId || session.id;
          await updateWorkflowStep({
            stepId: step.id,
            agentSessionId,
            logger,
          });

          // Update to completed
          await updateStepStatus(
            context,
            step.id,
            "completed",
            result as unknown as Record<string, unknown>
          );

          return result;
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
