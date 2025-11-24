import type { WorkflowRun } from "@/client/pages/projects/workflows/types";
import { StepStatusValues } from "@/shared/schemas/workflow.schemas";
import { isStepTerminal } from "./workflowStatus";
import { formatDuration } from "./formatDuration";

/**
 * Estimate time remaining for a workflow run
 * Based on average step duration and remaining steps
 */
export function estimateTimeRemaining(run: WorkflowRun): string {
  const steps = run.steps || [];

  if (steps.length === 0 || !run.started_at) {
    return "Unknown";
  }

  // Filter completed steps with timing information
  const completedSteps = steps.filter(
    (step) =>
      step.status === StepStatusValues.COMPLETED &&
      step.started_at &&
      step.completed_at
  );

  if (completedSteps.length === 0) {
    return "Calculating...";
  }

  // Calculate average step duration
  const totalDuration = completedSteps.reduce((sum, step) => {
    const start = new Date(step.started_at!).getTime();
    const end = new Date(step.completed_at!).getTime();
    return sum + (end - start);
  }, 0);

  const avgStepDuration = totalDuration / completedSteps.length;

  // Count remaining steps
  const remainingSteps = steps.filter(
    (step) => step.status === StepStatusValues.PENDING
  ).length;

  const estimatedMs = avgStepDuration * remainingSteps;

  return formatDuration(estimatedMs);
}

/**
 * Calculate the duration of a workflow run
 */
export function calculateDuration(run: WorkflowRun): string {
  if (!run.started_at) {
    return "Not started";
  }

  const startTime = new Date(run.started_at).getTime();
  const endTime = run.completed_at
    ? new Date(run.completed_at).getTime()
    : Date.now();

  return formatDuration(endTime - startTime);
}

/**
 * Get the current phase progress (steps completed in current phase)
 * @param run - The workflow run
 * @param phaseId - The phase ID (not label) to get progress for
 */
export function getPhaseProgress(
  run: WorkflowRun,
  phaseId: string
): { completed: number; total: number; percentage: number } {
  const phaseSteps =
    run.steps?.filter((step) => step.phase === phaseId) || [];

  const completed = phaseSteps.filter((step) =>
    isStepTerminal(step.status)
  ).length;

  const percentage =
    phaseSteps.length > 0
      ? Math.round((completed / phaseSteps.length) * 100)
      : 0;

  return {
    completed,
    total: phaseSteps.length,
    percentage,
  };
}
