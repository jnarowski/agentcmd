import { vi } from "vitest";
import type { ChildProcess } from "node:child_process";
import type { AgentExecuteResult } from "@/server/domain/session/services/executeAgent";

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
export function mockAgentExecution<T = string>(
  resultOrCallback:
    | MockAgentResult<T>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | ((config: any) => MockAgentResult<T> | Promise<MockAgentResult<T>>)
): void {
  const { execute } = require("agent-cli-sdk");

  if (typeof resultOrCallback === "function") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(execute).mockImplementation(async (config: any) => {
      const result = await resultOrCallback(config);
      return {
        success: true,
        exitCode: 0,
        sessionId: "mock-session",
        ...result,
      } as AgentExecuteResult<T>;
    });
  } else {
    vi.mocked(execute).mockResolvedValue({
      success: true,
      exitCode: 0,
      sessionId: "mock-session",
      ...resultOrCallback,
    } as AgentExecuteResult<T>);
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
export function mockAgentWithProcess<T = string>(
  process: ChildProcess,
  result: MockAgentResult<T> = {}
): void {
  const { execute } = require("agent-cli-sdk");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(execute).mockImplementation(async (config: any) => {
    if (config.onStart) {
      config.onStart(process);
    }
    return {
      success: true,
      exitCode: 0,
      sessionId: "mock-session",
      ...result,
    } as AgentExecuteResult<T>;
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
export function mockAgentWithEvents(
  events: Array<{ type: string; [key: string]: unknown }>,
  result: MockAgentResult = {}
): void {
  const { execute } = require("agent-cli-sdk");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(execute).mockImplementation(async (config: any) => {
    // Simulate event streaming
    if (config.onEvent) {
      for (const event of events) {
        config.onEvent({
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
    } as AgentExecuteResult;
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
export function mockAgentFailure(errorMessage: string): void {
  const { execute } = require("agent-cli-sdk");

  vi.mocked(execute).mockRejectedValue(new Error(errorMessage));
}
