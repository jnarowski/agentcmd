import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import type { PreviewStepConfig, PreviewStepResult } from "agentcmd-workflows";
import type { PreviewStepOptions } from "@/server/domain/workflow/types/event.types";
import { createContainer } from "@/server/domain/container/services/createContainer";
import { executeStep } from "@/server/domain/workflow/services/engine/steps/utils/executeStep";
import { withTimeout } from "@/server/domain/workflow/services/engine/steps/utils/withTimeout";
import { slugify as toId } from "@/server/utils/slugify";

const DEFAULT_PREVIEW_TIMEOUT = 300000; // 5 minutes

/**
 * Create preview step factory function
 * Starts a Docker preview container
 *
 * @example
 * ```typescript
 * // Use project preview config
 * const result = await step.preview("deploy");
 *
 * // Override with custom config
 * const result = await step.preview("deploy", {
 *   ports: ["app", "server"],
 *   env: { NODE_ENV: "preview" },
 *   dockerFilePath: "docker/compose-preview.yml"
 * });
 * ```
 */
export function createPreviewStep(
  context: RuntimeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
) {
  return async function preview(
    idOrName: string,
    config?: PreviewStepConfig,
    options?: PreviewStepOptions
  ): Promise<PreviewStepResult> {
    const id = toId(idOrName);
    const name = idOrName; // Use original name for display
    const timeout = options?.timeout ?? DEFAULT_PREVIEW_TIMEOUT;

    const { result } = await executeStep({
      context,
      stepId: id,
      stepName: name,
      stepType: "preview",
      inngestStep,
      input: config ?? {},
      fn: async () => {
        const { workingDir, projectId } = context;

        const operation = await withTimeout(
          executePreviewOperation(projectId, workingDir, config),
          timeout,
          "Preview operation"
        );

        return operation;
      },
    });

    return result;
  };
}

async function executePreviewOperation(
  projectId: string,
  workingDir: string,
  config?: PreviewStepConfig
): Promise<PreviewStepResult> {
  try {
    const startTime = Date.now();

    // Create container with merged config
    const container = await createContainer({
      projectId,
      workingDir,
      configOverrides: config ?? {},
    });

    const duration = Date.now() - startTime;

    // Docker unavailable - return success with empty URLs and warning
    if (!container) {
      return {
        data: {
          containerId: "",
          status: "skipped",
          urls: {},
        },
        success: true,
        error: "Docker not available - preview skipped",
        trace: [{
          command: "docker --version",
          duration,
          output: "Docker not found or not running",
        }],
      };
    }

    // Build URLs map from ports
    const urls: Record<string, string> = {};
    const ports = container.ports as Record<string, number>;
    for (const [name, port] of Object.entries(ports)) {
      urls[name] = `http://localhost:${port}`;
    }

    return {
      data: {
        containerId: container.id,
        status: container.status,
        urls,
      },
      success: true,
      trace: [{
        command: "docker compose up",
        duration,
        output: `Container started with ports: ${JSON.stringify(ports)}`,
      }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      data: {
        containerId: "",
        status: "failed",
        urls: {},
      },
      success: false,
      error: `Failed to create preview container: ${errorMessage}`,
      trace: [{
        command: "docker compose up",
        output: errorMessage,
      }],
    };
  }
}
