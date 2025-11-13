import { execute, type PermissionMode } from "agent-cli-sdk";
import { activeSessions } from "@/server/websocket/infrastructure/active-sessions";
import type { ChildProcess } from "node:child_process";

/**
 * Configuration for executing an agent
 *
 * Key parameters:
 * - processTrackingId: DB session ID used for internal process tracking (activeSessions map key)
 * - sessionId: CLI session ID passed to agent tool (can differ when resuming existing CLI session)
 *
 * This separation allows workflows to resume planning sessions correctly:
 * - processTrackingId is always the workflow's DB session ID (for cancellation lookup)
 * - sessionId can be the planning CLI session ID (for session continuity)
 */
export interface AgentExecuteConfig {
  agent: "claude" | "codex";
  prompt: string;
  workingDir: string;
  processTrackingId: string; // DB session ID for process tracking
  sessionId: string; // CLI session ID passed to agent
  resume?: boolean;
  permissionMode?: PermissionMode;
  model?: string;
  images?: { path: string }[];
  json?: boolean;
  onEvent?: (data: { raw: string; event: unknown; message: unknown | null }) => void;
  onStart?: (process: ChildProcess) => void;
}

export interface AgentExecuteResult<T = string> {
  success: boolean;
  exitCode: number;
  error?: string;
  sessionId?: string;
  events?: unknown[];
  data?: T;
}

/**
 * Execute agent command via agent-cli-sdk
 *
 * Separates process tracking (via processTrackingId) from CLI session management (via sessionId).
 * This allows workflows to resume planning sessions while maintaining correct cancellation behavior.
 *
 * Process tracking always uses DB session ID (processTrackingId) for consistent lookup.
 * CLI receives the appropriate session ID (new or resumed) via sessionId parameter.
 */
export async function executeAgent<T = string>(
  config: AgentExecuteConfig
): Promise<AgentExecuteResult<T>> {
  const {
    agent,
    prompt,
    workingDir,
    processTrackingId,
    sessionId,
    resume,
    permissionMode,
    model,
    images,
    json,
    onEvent,
  } = config;

  try {
    // Execute via agent-cli-sdk
    const result = await execute<T>({
      tool: agent,
      prompt,
      workingDir,
      sessionId, // CLI receives the session ID (could be resumed)
      resume,
      permissionMode,
      model,
      verbose: true,
      images,
      json,
    // @ts-ignore - onStart optional callback
      onStart: (process) => {
        // Store process by DB session ID for consistent tracking/cancellation
        activeSessions.setProcess(processTrackingId, process);
      },
      onEvent,
    });

    // Clear process reference after completion (by processTrackingId)
    activeSessions.clearProcess(processTrackingId);

    // If session was cancelled, treat as success to avoid error handling
    const sessionData = activeSessions.get(processTrackingId);
    if (sessionData?.cancelled) {
      return {
        ...result,
        success: true,
        error: undefined,
      };
    }

    return result;
  } catch (err: unknown) {

    // Clear process reference on error (by processTrackingId)
    activeSessions.clearProcess(processTrackingId);

    const errorMessage =
      err instanceof Error ? err.message : "Failed to execute agent command";

    return {
      success: false,
      exitCode: 1,
      error: errorMessage,
    };
  }
}
