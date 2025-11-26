import { randomUUID } from "node:crypto";
import { createSession } from "./createSession";
import { executeAgent } from "./executeAgent";
import type { PermissionMode } from "agent-cli-sdk";
import type { SessionType } from "@/shared/types/agent-session.types";
import { prisma } from "@/shared/prisma";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Execute a slash command programmatically (outside of user chat sessions)
 *
 * Creates an `internal` type session that is hidden from UI and executes the command.
 * Supports both synchronous (await completion) and asynchronous (fire-and-forget) modes.
 *
 * @param options - Command execution configuration
 * @returns Command execution result (with data if sync mode, sessionId if async)
 */
export async function executeCommand<T = string>(
  options: ExecuteCommandOptions
): Promise<ExecuteCommandResult<T>> {
  const {
    projectId,
    userId,
    agent = "claude",
    prompt,
    mode = "sync",
    permissionMode = "bypassPermissions",
    model,
    json = false,
  } = options;

  // Generate unique session ID for internal execution
  const sessionId = randomUUID();

  // Create internal session (hidden from UI)
  const session = await createSession({
    data: {
      projectId,
      userId,
      sessionId,
      agent,
      type: "internal" as SessionType,
      permission_mode: permissionMode,
      name: `Command: ${prompt.slice(0, 50)}`,
    },
  });

  // Get project path for execution
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  // Fire-and-forget mode: return immediately after starting execution
  if (mode === "async") {
    // Start execution without awaiting
    executeAgent({
      agent,
      prompt,
      workingDir: project.path,
      processTrackingId: sessionId,
      sessionId,
      permissionMode,
      model,
      json,
    }).catch((error) => {
      // Log error but don't propagate (async mode)
      console.error(`Async command execution failed for ${sessionId}:`, error);
    });

    return {
      sessionId: session.id,
      mode: "async",
    };
  }

  // Sync mode: await completion and return result
  const result = await executeAgent<T>({
    agent,
    prompt,
    workingDir: project.path,
    processTrackingId: sessionId,
    sessionId,
    permissionMode,
    model,
    json,
  });

  return {
    sessionId: session.id,
    mode: "sync",
    success: result.success,
    exitCode: result.exitCode,
    data: result.data,
    error: result.error,
  };
}

export interface ExecuteCommandOptions {
  /** Project ID to execute command in */
  projectId: string;
  /** User ID executing the command */
  userId: string;
  /** Agent to use (default: claude) */
  agent?: "claude" | "codex";
  /** Command prompt (e.g., "/cmd:move-spec spec-123 todo") */
  prompt: string;
  /** Execution mode: sync (await) or async (fire-and-forget) */
  mode?: "sync" | "async";
  /** Permission mode (default: bypassPermissions for internal commands) */
  permissionMode?: PermissionMode;
  /** AI model to use (optional) */
  model?: string;
  /** Parse output as JSON (default: false) */
  json?: boolean;
}

export type ExecuteCommandResult<T = string> =
  | {
      /** Internal session ID */
      sessionId: string;
      /** Execution mode */
      mode: "async";
    }
  | {
      /** Internal session ID */
      sessionId: string;
      /** Execution mode */
      mode: "sync";
      /** Whether execution succeeded */
      success: boolean;
      /** Process exit code */
      exitCode: number;
      /** Parsed data (if json: true) or raw output */
      data?: T;
      /** Error message if failed */
      error?: string;
    };
