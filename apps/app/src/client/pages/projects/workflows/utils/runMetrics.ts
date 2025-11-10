import type { WorkflowRun } from "@/client/pages/projects/workflows/types";
import { getPhaseId } from "@/shared/utils/phase.utils";

/**
 * Execution metrics for display in UI components
 */
export interface ExecutionMetrics {
  /** Current phase number (1-indexed). 0 if not started. */
  currentPhaseNumber: number;
  /** Total number of phases in workflow definition */
  totalPhases: number;
  /** Total actions (steps + events) */
  totalActions: number;
  /** Phase progress as percentage (0-100) */
  phaseProgressPercentage: number;
}

/**
 * Calculate all run metrics for display
 *
 * @param run - Workflow run with definition and counts
 * @returns Metrics object with phase progress, counts, and percentages
 *
 * @example
 * const { currentPhaseNumber, totalPhases } = getExecutionMetrics(run);
 * // Shows: "1 / 3 phases"
 */
export function getExecutionMetrics(
  run: WorkflowRun
): ExecutionMetrics {
  // Get phases from workflow definition
  const phases = run.workflow_definition?.phases || [];
  const totalPhases = phases.length;

  // Calculate current phase number (1-indexed)
  let currentPhaseNumber = 0;
  if (run.current_phase) {
    const currentPhaseIndex = phases.findIndex(
      (phase) => getPhaseId(phase) === run.current_phase
    );
    if (currentPhaseIndex !== -1) {
      currentPhaseNumber = currentPhaseIndex + 1;
    }
  }

  // Calculate phase progress percentage
  const phaseProgressPercentage =
    totalPhases > 0 && currentPhaseNumber > 0
      ? Math.round((currentPhaseNumber / totalPhases) * 100)
      : 0;

  // Count total actions (steps + events)
  const totalActions =
    (run._count?.steps || 0) + (run._count?.events || 0);

  return {
    currentPhaseNumber,
    totalPhases,
    totalActions,
    phaseProgressPercentage,
  };
}
