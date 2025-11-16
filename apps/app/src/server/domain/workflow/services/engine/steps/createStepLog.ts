import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import { createWorkflowEvent } from "@/server/domain/workflow/services";
import { sanitizeJson } from "@/server/domain/workflow/utils/sanitizeJson";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Create step log factory
 * Returns log object with info/warn/error methods for workflow step logging
 */
export function createStepLog(
  context: RuntimeContext,
  getCurrentStepId: () => string | null
): {
  (...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
} {
  /**
   * Create log method for specific level
   */
  function createLogMethod(level: "info" | "warn" | "error") {
    return (...args: unknown[]): void => {
      const message = serializeLogArgs(args);
      const currentStepId = getCurrentStepId();

      // Create workflow event (fire and forget - don't block execution)
      createWorkflowEvent({
        workflow_run_id: context.runId,
        event_type: "step_log",
        event_data: {
          level,
          message,
          args,
        },
        inngest_step_id: currentStepId ?? undefined,
        phase: context.currentPhase ?? undefined,
        logger: context.logger,
      }).catch((error) => {
        context.logger.error(
          { error, stepId: currentStepId, level },
          "Failed to create step_log event"
        );
      });
    };
  }

  // Create the log function with variants
  const log = createLogMethod("info") as {
    (...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
  };
  log.warn = createLogMethod("warn");
  log.error = createLogMethod("error");

  return log;
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Serialize log arguments to string
 */
function serializeLogArgs(args: unknown[]): string {
  return args
    .map((arg) =>
      typeof arg === "string" ? arg : JSON.stringify(sanitizeJson(arg), null, 2)
    )
    .join(" ");
}
