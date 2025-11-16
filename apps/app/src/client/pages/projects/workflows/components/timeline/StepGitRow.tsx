import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  MinusCircle,
} from "lucide-react";
import { useDebugMode } from "@/client/hooks/useDebugMode";
import type { WorkflowRunStep, StepOutput } from "@/shared/types/workflow-step.types";
import type { WorkflowTab } from "@/client/pages/projects/workflows/hooks/useWorkflowDetailPanel";
import { TimelineRow } from "./TimelineRow";

interface StepGitRowProps {
  step: WorkflowRunStep;
  onSelectStep?: (stepId: string) => void;
  onSetActiveTab?: (tab: WorkflowTab) => void;
}

export function StepGitRow({ step, onSelectStep, onSetActiveTab }: StepGitRowProps) {
  const debugMode = useDebugMode();

  // Type-safe output access
  const output = step.step_type === "git" || step.step_type === "cli"
    ? (step.output as StepOutput<"git"> | StepOutput<"cli">)
    : null;

  // Status icon
  const StatusIcon = {
    pending: Circle,
    running: Loader2,
    completed: CheckCircle2,
    failed: XCircle,
    skipped: MinusCircle,
  }[step.status];

  // Status color
  const statusColor = {
    pending: "text-gray-400",
    running: "text-blue-500",
    completed: "text-green-500",
    failed: "text-red-500",
    skipped: "text-gray-400",
  }[step.status];

  // Calculate duration
  const duration =
    step.started_at && step.completed_at
      ? new Date(step.completed_at).getTime() -
        new Date(step.started_at).getTime()
      : null;

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 1) return "<1s";
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  // Format step type for tooltip
  const tooltipLabel = step.step_type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") + " Step";

  return (
    <TimelineRow
      icon={
        <StatusIcon
          className={`h-5 w-5 ${statusColor} ${step.status === "running" ? "animate-spin" : ""}`}
        />
      }
      tooltipLabel={tooltipLabel}
      rightContent={
        <span className="px-2 py-1 text-xs font-medium rounded bg-background/50 text-muted-foreground">
          {tooltipLabel}
        </span>
      }
      onClick={() => {
        onSelectStep?.(step.id);
        onSetActiveTab?.("logs");
      }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="font-medium">{step.name}</span>
          {debugMode && (
            <span className="text-xs text-muted-foreground font-mono">
              [STEP: {step.id}]
            </span>
          )}
          {duration && (
            <span className="text-xs text-muted-foreground">{formatDuration(duration)}</span>
          )}
          {step.error_message && (
            <span className="text-xs text-red-500 truncate">{step.error_message}</span>
          )}
        </div>

        {/* Trace display */}
        {output?.trace && output.trace.length > 0 && (
          <div className="text-xs font-mono text-muted-foreground space-y-1">
            {output.trace.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-blue-400">$</span>
                <span>{entry.command}</span>
                {entry.duration && (
                  <span className="text-gray-500">({entry.duration}ms)</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </TimelineRow>
  );
}
