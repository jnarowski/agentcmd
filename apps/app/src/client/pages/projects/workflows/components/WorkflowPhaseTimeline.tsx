import { StepStatusValues } from '@/shared/schemas';
import type { WorkflowRun } from '../types';
import { CheckCircle2, XCircle, Circle, Loader2 } from 'lucide-react';
import { getPhaseId, getPhaseLabel } from '@/shared/utils/phase.utils';

export interface WorkflowPhaseTimelineProps {
  run: WorkflowRun;
  onPhaseClick?: (phaseId: string) => void;
}

export function WorkflowPhaseTimeline({
  run,
  onPhaseClick,
}: WorkflowPhaseTimelineProps) {
  const phases = run.workflow_definition?.phases || [];

  if (phases.length === 0) {
    return null;
  }

  const getPhaseStatus = (
    phaseId: string
  ): 'pending' | 'running' | 'completed' | 'failed' => {
    const phaseSteps =
      run.steps?.filter((step) => step.phase === phaseId) || [];

    if (phaseSteps.length === 0) return 'pending';

    const hasFailedStep = phaseSteps.some(
      (step) => step.status === StepStatusValues.FAILED
    );
    if (hasFailedStep) return 'failed';

    const allCompleted = phaseSteps.every(
      (step) =>
        step.status === StepStatusValues.COMPLETED ||
        step.status === StepStatusValues.SKIPPED
    );
    if (allCompleted) return 'completed';

    const hasRunningStep = phaseSteps.some(
      (step) => step.status === StepStatusValues.RUNNING
    );
    if (hasRunningStep || run.current_phase === phaseId)
      return 'running';

    return 'pending';
  };

  const getPhaseIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return CheckCircle2;
      case 'failed':
        return XCircle;
      case 'running':
        return Loader2;
      default:
        return Circle;
    }
  };

  const getPhaseColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 border-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 border-red-600 bg-red-50';
      case 'running':
        return 'text-blue-600 border-blue-600 bg-blue-50';
      default:
        return 'text-gray-400 border-gray-300 bg-gray-50';
    }
  };

  const getConnectorColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600';
      case 'failed':
        return 'bg-red-600';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex items-center gap-2 min-w-max px-4">
        {phases.map((phase, index) => {
          const phaseId = getPhaseId(phase);
          const phaseLabel = getPhaseLabel(phase);
          const status = getPhaseStatus(phaseId);
          const Icon = getPhaseIcon(status);
          const colorClass = getPhaseColor(status);
          const isClickable = onPhaseClick !== undefined;

          return (
            <div key={phaseId} className="flex items-center">
              {/* Phase item */}
              <button
                onClick={() => onPhaseClick?.(phaseId)}
                disabled={!isClickable}
                className={`flex flex-col items-center gap-2 ${
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                }`}
                aria-label={`Phase: ${phaseLabel}, Status: ${status}`}
              >
                {/* Icon */}
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${colorClass} transition-all`}
                >
                  <Icon
                    className={`h-5 w-5 ${status === 'running' ? 'animate-spin' : ''}`}
                  />
                </div>

                {/* Label */}
                <div className="text-center">
                  <div
                    className={`text-sm font-medium ${
                      status === 'pending'
                        ? 'text-muted-foreground'
                        : 'text-foreground'
                    }`}
                  >
                    {phaseLabel}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {run.steps?.filter((s) => s.phase === phaseId).length || 0} steps
                  </div>
                </div>
              </button>

              {/* Connector line */}
              {index < phases.length - 1 && (
                <div
                  className={`mx-2 h-0.5 w-12 ${getConnectorColor(
                    status === 'completed' ? 'completed' : 'pending'
                  )} transition-all`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
