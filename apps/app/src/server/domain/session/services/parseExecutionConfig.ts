import type { ExecutionConfig } from "../types";
import type { ParseExecutionConfigOptions } from "@/server/domain/session/types/ParseExecutionConfigOptions";

/**
 * Parse execution configuration from WebSocket message data
 *
 * Safely extracts and validates execution configuration options from
 * unknown data, providing type-safe defaults.
 *
 * @param options - Options object with config
 * @returns Type-safe execution configuration
 */
export async function parseExecutionConfig({ config }: ParseExecutionConfigOptions): Promise<ExecutionConfig> {
  const configObj = config as Record<string, unknown> | undefined;

  return {
    resume: configObj?.resume === true,
    permissionMode: configObj?.permissionMode as
      | "default"
      | "acceptEdits"
      | "bypassPermissions"
      | undefined,
    model: configObj?.model as string | undefined,
  };
}
