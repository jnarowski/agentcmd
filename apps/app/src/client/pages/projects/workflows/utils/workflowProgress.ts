import type { WorkflowRun } from "@/client/pages/projects/workflows/types";
import { StepStatusValues } from "@/shared/schemas/workflow.schemas";
import { isStepTerminal } from "./workflowStatus";

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
 * Format duration in milliseconds to human-readable string
 * Examples: "2m 34s", "1h 5m", "45s"
 */
export function formatDuration(ms: number): string {
  if (ms < 0) return "0s";

  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds}s`);
  }

  return parts.join(" ");
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
