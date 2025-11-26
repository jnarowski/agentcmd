/**
 * Pure state update functions for workflow store
 *
 * All functions are pure - they accept state, return new state, no side effects.
 * Used by Zustand store to keep handlers thin and logic testable.
 */

import type {
  WorkflowRun,
  WorkflowRunStep,
  WorkflowEvent,
} from "@/client/pages/projects/workflows/types";
import { WorkflowStatusValues, StepStatusValues } from "@/shared/schemas/workflow.schemas";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Immutably update an run in a Map
 *
 * @param runs - Current runs Map
 * @param id - Execution ID to update
 * @param updater - Function that returns updated run
 * @returns New Map with updated run
 */
export function updateExecutionInMap(
  runs: Map<string, WorkflowRun>,
  id: string,
  updater: (exec: WorkflowRun) => WorkflowRun
): Map<string, WorkflowRun> {
  const run = runs.get(id);
  if (!run) return runs;

  const newExecutions = new Map(runs);
  newExecutions.set(id, updater(run));
  return newExecutions;
}

/**
 * Immutably update a step within an run
 *
 * @param run - Current run
 * @param stepId - Step ID to update
 * @param updates - Partial step updates
 * @returns New run with updated step
 */
export function updateStepInExecution(
  run: WorkflowRun,
  stepId: string,
  updates: Partial<WorkflowRunStep>
): WorkflowRun {
  if (!run.steps) return run;

  return {
    ...run,
    steps: run.steps.map((step) =>
      step.id === stepId
        ? ({ ...step, ...updates, updated_at: new Date() } as WorkflowRunStep)
        : step
    ),
    updated_at: new Date(),
  };
}

// ============================================================================
// Workflow Status Update Functions
// ============================================================================

/**
 * Apply workflow started event
 */
export function applyWorkflowStarted(
  run: WorkflowRun
): WorkflowRun {
  return {
    ...run,
    status: WorkflowStatusValues.RUNNING,
    started_at: new Date(),
    updated_at: new Date(),
  };
}

/**
 * Apply workflow completed event
 */
export function applyWorkflowCompleted(
  run: WorkflowRun
): WorkflowRun {
  return {
    ...run,
    status: WorkflowStatusValues.COMPLETED,
    completed_at: new Date(),
    updated_at: new Date(),
  };
}

/**
 * Apply workflow failed event
 */
export function applyWorkflowFailed(
  run: WorkflowRun,
  error: string
): WorkflowRun {
  return {
    ...run,
    status: WorkflowStatusValues.FAILED,
    error_message: error,
    completed_at: new Date(),
    updated_at: new Date(),
  };
}

/**
 * Apply workflow paused event
 */
export function applyWorkflowPaused(
  run: WorkflowRun
): WorkflowRun {
  return {
    ...run,
    status: WorkflowStatusValues.PAUSED,
    updated_at: new Date(),
  };
}

/**
 * Apply workflow resumed event
 */
export function applyWorkflowResumed(
  run: WorkflowRun
): WorkflowRun {
  return {
    ...run,
    status: WorkflowStatusValues.RUNNING,
    updated_at: new Date(),
  };
}

/**
 * Apply workflow cancelled event
 */
export function applyWorkflowCancelled(
  run: WorkflowRun
): WorkflowRun {
  return {
    ...run,
    status: WorkflowStatusValues.CANCELLED,
    completed_at: new Date(),
    updated_at: new Date(),
  };
}

// ============================================================================
// Step Update Functions
// ============================================================================

/**
 * Apply step started event
 */
export function applyStepStarted(
  run: WorkflowRun,
  event: {
    stepId: string;
    stepName: string;
    phaseId: string;
  }
): WorkflowRun {
  const updatedExec = {
    ...run,
    current_step: event.stepName,
    current_phase: event.phaseId,
    updated_at: new Date(),
  };

  // Update step status if steps are loaded
  if (run.steps) {
    return updateStepInExecution(updatedExec, event.stepId, {
      status: StepStatusValues.RUNNING,
      started_at: new Date(),
    });
  }

  return updatedExec;
}

/**
 * Apply step completed event
 */
export function applyStepCompleted(
  run: WorkflowRun,
  event: {
    stepId: string;
    logs?: string; // Optional for backward compatibility
  }
): WorkflowRun {
  if (!run.steps) return run;

  return updateStepInExecution(run, event.stepId, {
    status: StepStatusValues.COMPLETED,
    completed_at: new Date(),
  });
}

/**
 * Apply step failed event
 */
export function applyStepFailed(
  run: WorkflowRun,
  event: {
    stepId: string;
    error: string;
  }
): WorkflowRun {
  if (!run.steps) return run;

  return updateStepInExecution(run, event.stepId, {
    status: StepStatusValues.FAILED,
    error_message: event.error,
    completed_at: new Date(),
  });
}

/**
 * Apply phase completed event
 */
export function applyPhaseCompleted(
  run: WorkflowRun,
  nextPhase: string | null
): WorkflowRun {
  return {
    ...run,
    current_phase: nextPhase,
    updated_at: new Date(),
  };
}

// ============================================================================
// Other Update Functions
// ============================================================================

/**
 * Apply event created (e.g., annotation_added)
 */
export function applyEventCreated(
  run: WorkflowRun,
  event: WorkflowEvent
): WorkflowRun {
  return {
    ...run,
    events: run.events ? [...run.events, event] : [event],
    updated_at: new Date(),
  };
}
