import { Pause, Play, X } from 'lucide-react';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import type { WorkflowRun } from '../types';

interface WorkflowRunHeaderProps {
  run: WorkflowRun;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

export function WorkflowRunHeader({
  run,
  onPause,
  onResume,
  onCancel,
}: WorkflowRunHeaderProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  const isRunning = run.status === 'running';
  const isPaused = run.status === 'paused';
  const isActive = isRunning || isPaused;

  return (
    <div className="flex items-center gap-6">
        {/* Title and badge */}
        <div className="flex items-center gap-3 shrink-0">
          <h1 className="text-lg font-bold whitespace-nowrap">{run.name}</h1>
          <WorkflowStatusBadge status={run.status} />
        </div>

        {/* Metadata - horizontal layout */}
        <div className="flex items-center gap-4 text-sm min-w-0 flex-1">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-muted-foreground">Started:</span>
            <span className="whitespace-nowrap">{formatDate(run.started_at)}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-muted-foreground">Completed:</span>
            <span className="whitespace-nowrap">{formatDate(run.completed_at)}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-muted-foreground">Current Phase:</span>
            <span className="whitespace-nowrap">{run.current_phase || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-muted-foreground">Current Step:</span>
            <span className="whitespace-nowrap">{run.current_step || 'N/A'}</span>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex gap-2 shrink-0">
          {isRunning && (
            <button
              onClick={onPause}
              className="flex items-center gap-1.5 rounded-md bg-yellow-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-600"
            >
              <Pause className="h-4 w-4" />
              Pause
            </button>
          )}

          {isPaused && (
            <button
              onClick={onResume}
              className="flex items-center gap-1.5 rounded-md bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600"
            >
              <Play className="h-4 w-4" />
              Resume
            </button>
          )}

          {isActive && (
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 rounded-md bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          )}
        </div>
    </div>
  );
}
