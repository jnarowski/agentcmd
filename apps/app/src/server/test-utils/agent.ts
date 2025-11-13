import { vi } from "vitest";
import type { ChildProcess } from "node:child_process";
import type { ExecuteOptions } from "agent-cli-sdk";

/**
 * Mock agent execution result
 */
export interface MockAgentResult<T = string> {
  success?: boolean;
  exitCode?: number;
  error?: string;
  sessionId?: string;
  events?: unknown[];
  data?: T;
}

/**
 * Mock agent execution helper for tests
 *
 * Usage:
 * ```typescript
 * import { mockAgentExecution } from "@/server/test-utils/agent";
 * import { execute } from "agent-cli-sdk";
 *
 * vi.mock("agent-cli-sdk", () => ({
 *   execute: vi.fn(),
 * }));
 *
 * mockAgentExecution({
 *   success: true,
 *   sessionId: "test-session",
 * });
 *
 * // Or with custom behavior
 * mockAgentExecution((config) => {
 *   if (config.prompt.includes("error")) {
 *     throw new Error("Test error");
 *   }
 *   return { success: true, exitCode: 0 };
 * });
 * ```
 */
export async function mockAgentExecution<T = string>(
  resultOrCallback:
    | MockAgentResult<T>
    | ((config: ExecuteOptions) => MockAgentResult<T> | Promise<MockAgentResult<T>>)
): Promise<void> {
  const { execute } = await import("agent-cli-sdk");

  if (typeof resultOrCallback === "function") {
    vi.mocked(execute).mockImplementation(async (config: ExecuteOptions) => {
      const result = await resultOrCallback(config);
      return {
        success: true,
        exitCode: 0,
        sessionId: "mock-session",
        ...result,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });
  } else {
    vi.mocked(execute).mockResolvedValue({
      success: true,
      exitCode: 0,
      sessionId: "mock-session",
      ...resultOrCallback,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }
}

/**
 * Mock agent process for testing process tracking
 */
export function createMockProcess(pid = 12345): ChildProcess {
  return {
    pid,
    kill: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    emit: vi.fn(),
    removeListener: vi.fn(),
  } as unknown as ChildProcess;
}

/**
 * Mock agent execution with process tracking
 *
 * Usage:
 * ```typescript
 * const mockProcess = createMockProcess();
 * mockAgentWithProcess(mockProcess, { success: true });
 * ```
 */
export async function mockAgentWithProcess<T = string>(
  process: ChildProcess,
  result: MockAgentResult<T> = {}
): Promise<void> {
  const { execute } = await import("agent-cli-sdk");

  vi.mocked(execute).mockImplementation(async (config: ExecuteOptions) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((config as any).onStart) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (config as any).onStart(process);
    }
    return {
      success: true,
      exitCode: 0,
      sessionId: "mock-session",
      ...result,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });
}

/**
 * Mock agent execution that streams events
 *
 * Usage:
 * ```typescript
 * mockAgentWithEvents([
 *   { type: "output", text: "Hello" },
 *   { type: "output", text: "World" },
 * ]);
 * ```
 */
export async function mockAgentWithEvents(
  events: Array<{ type: string; [key: string]: unknown }>,
  result: MockAgentResult = {}
): Promise<void> {
  const { execute } = await import("agent-cli-sdk");

  vi.mocked(execute).mockImplementation(async (config: ExecuteOptions) => {
    // Simulate event streaming
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((config as any).onEvent) {
      for (const event of events) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (config as any).onEvent({
          raw: JSON.stringify(event),
          event,
          message: event.type === "output" ? event : null,
        });
      }
    }
    return {
      success: true,
      exitCode: 0,
      sessionId: "mock-session",
      events,
      ...result,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });
}

/**
 * Mock agent execution that fails
 *
 * Usage:
 * ```typescript
 * mockAgentFailure("Agent execution failed");
 * ```
 */
export async function mockAgentFailure(errorMessage: string): Promise<void> {
  const { execute } = await import("agent-cli-sdk");

  vi.mocked(execute).mockRejectedValue(new Error(errorMessage));
}
