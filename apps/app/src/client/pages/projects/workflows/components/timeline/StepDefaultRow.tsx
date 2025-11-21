import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  MinusCircle,
} from "lucide-react";
import { useDebugMode } from "@/client/hooks/useDebugMode";
import type { WorkflowRunStep } from "@/shared/types/workflow-step.types";
import type { WorkflowTab } from "@/client/pages/projects/workflows/hooks/useWorkflowDetailPanel";
import { TimelineRow } from "./TimelineRow";

interface StepDefaultRowProps {
  step: WorkflowRunStep;
  onSelectStep?: (stepId: string) => void;
  onSetActiveTab?: (tab: WorkflowTab) => void;
}

export function StepDefaultRow({ step, onSelectStep, onSetActiveTab }: StepDefaultRowProps) {
  const debugMode = useDebugMode();

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
    <>
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
        <div className="flex items-center gap-2">
          <span className="font-medium">{step.name}</span>
          {debugMode && (
            <span className="text-xs text-muted-foreground font-mono">
              [STEP: {step.id}]
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <span>
            {new Date(step.created_at).toLocaleString()}
          </span>
          {duration && <span>{formatDuration(duration)}</span>}
          {step.error_message && (
            <span className="text-red-500">{step.error_message}</span>
          )}
        </div>
      </TimelineRow>
    </>
  );
}
