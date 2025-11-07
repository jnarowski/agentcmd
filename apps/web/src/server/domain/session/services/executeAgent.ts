import { execute, type PermissionMode } from "@repo/agent-cli-sdk";
import { activeSessions } from "@/server/websocket/infrastructure/active-sessions";
import type { ChildProcess } from "node:child_process";

export interface AgentExecuteConfig {
  agent: "claude" | "codex";
  prompt: string;
  workingDir: string;
  sessionId: string;
  resume?: boolean;
  permissionMode?: PermissionMode;
  model?: string;
  images?: { path: string }[];
  onEvent?: (data: { raw: string; event: unknown; message: unknown | null }) => void;
  onStart?: (process: ChildProcess) => void;
}

export interface AgentExecuteResult {
  success: boolean;
  exitCode: number;
  error?: string;
  sessionId?: string;
  events?: unknown[];
}

/**
 * Execute agent command via agent-cli-sdk
 * Directly calls the SDK execute function for the specified agent
 */
export async function executeAgent(
  config: AgentExecuteConfig
): Promise<AgentExecuteResult> {
  const {
    agent,
    prompt,
    workingDir,
    sessionId,
    resume,
    permissionMode,
    model,
    images,
    onEvent,
  } = config;

  try {
    // Execute via agent-cli-sdk
    const result = await execute({
      tool: agent,
      prompt,
      workingDir,
      sessionId,
      resume,
      permissionMode,
      model,
      verbose: true,
      images,
    // @ts-ignore - onStart optional callback
      onStart: (process) => {
        // Store process reference immediately when execution starts
        activeSessions.setProcess(sessionId, process);
      },
      onEvent,
    });

    // Clear process reference after completion
    activeSessions.clearProcess(sessionId);

    // If session was cancelled, treat as success to avoid error handling
    const sessionData = activeSessions.get(sessionId);
    if (sessionData?.cancelled) {
      return {
        ...result,
        success: true,
        error: undefined,
      };
    }

    return result;
  } catch (err: unknown) {

    // Clear process reference on error
    activeSessions.clearProcess(sessionId);

    const errorMessage =
      err instanceof Error ? err.message : "Failed to execute agent command";

    return {
      success: false,
      exitCode: 1,
      error: errorMessage,
    };
  }
}
