import type { WorkflowRun, WorkflowRunListItem } from '../types';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import { formatRelativeTime } from '../utils/workflowFormatting';
import { getExecutionMetrics } from '../utils/runMetrics';

export interface WorkflowRunCardProps {
  run: WorkflowRun | WorkflowRunListItem;
  onClick: () => void;
}

export function WorkflowRunCard({
  run,
  onClick,
}: WorkflowRunCardProps) {
  const timeDisplay = run.started_at
    ? formatRelativeTime(run.started_at)
    : formatRelativeTime(run.created_at);

  const { currentPhaseNumber, totalPhases, totalActions } = getExecutionMetrics(run);

  return (
    <div
      className="group relative cursor-pointer rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Workflow run ${run.name}, status ${run.status}, phase ${currentPhaseNumber} of ${totalPhases}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground truncate">
            {run.name}
          </h3>
          {run.workflow_definition && (
            <p className="text-xs text-muted-foreground truncate">
              {run.workflow_definition.name}
            </p>
          )}
        </div>
        <WorkflowStatusBadge status={run.status} size="sm" />
      </div>

      {/* Phase progress */}
      {totalPhases > 0 && (
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Progress</span>
            <span>
              {currentPhaseNumber} / {totalPhases} phases
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: `${currentPhaseNumber > 0 ? (currentPhaseNumber / totalPhases) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Current step */}
      {'current_step' in run && run.current_step && (
        <div className="mb-3 rounded-md bg-muted/50 p-2 text-xs">
          <span className="font-medium text-muted-foreground">Current: </span>
          <span className="text-foreground">{run.current_step}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1">
          <span className="font-medium text-primary">{totalActions}</span>
          <span className="text-muted-foreground">actions</span>
        </div>
        <span className="text-muted-foreground">{timeDisplay}</span>
      </div>
    </div>
  );
}
