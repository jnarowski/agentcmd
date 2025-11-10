import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import type { CliStepConfig, CliStepResult } from "agentcmd-workflows";
import type { CliStepOptions } from "@/server/domain/workflow/types/event.types";
import { executeStep } from "@/server/domain/workflow/services/engine/steps/utils/executeStep";
import { withTimeout } from "@/server/domain/workflow/services/engine/steps/utils/withTimeout";
import { toId } from "@/server/domain/workflow/services/engine/steps/utils/toId";
import { toName } from "@/server/domain/workflow/services/engine/steps/utils/toName";

const execAsync = promisify(exec);
const DEFAULT_CLI_TIMEOUT = 300000; // 5 minutes

/**
 * Create CLI step factory function
 * Executes shell commands
 */
export function createCliStep(
  context: RuntimeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
) {
  return async function cli(
    idOrName: string,
    config: CliStepConfig,
    options?: CliStepOptions
  ): Promise<CliStepResult> {
    const timeout = options?.timeout ?? DEFAULT_CLI_TIMEOUT;
    const id = toId(idOrName);
    const name = toName(idOrName);
    const command = config.command;

    return executeStep(context, id, name, async () => {
      const { projectPath, logger } = context;
      const cwd = config.cwd ?? projectPath;
      const env = { ...process.env, ...config.env };

      logger.debug({ command, cwd }, "Executing CLI command");

      try {
        const { stdout, stderr } = await withTimeout(
          execAsync(command, {
            cwd,
            env,
            shell: config.shell ?? "/bin/sh",
            maxBuffer: 10 * 1024 * 1024, // 10MB
          }),
          timeout,
          "CLI command"
        );

        return {
          command,
          exitCode: 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          success: true,
        };
      } catch (error: unknown) {
        // Command failed but we still want to return result
        const err = error as {
          code?: number;
          stdout?: string;
          stderr?: string;
          message?: string;
        };
        return {
          command,
          exitCode: err.code ?? 1,
          stdout: err.stdout?.trim() ?? "",
          stderr: err.stderr?.trim() ?? err.message ?? "Unknown error",
          success: false,
        };
      }
    }, inngestStep);
  };
}
