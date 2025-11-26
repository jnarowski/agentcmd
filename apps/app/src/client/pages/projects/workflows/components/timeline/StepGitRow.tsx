import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  MinusCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/client/components/ui/tooltip";
import type { WorkflowRunStep, StepOutput } from "@/shared/types/workflow-step.types";
import type { WorkflowTab } from "@/client/pages/projects/workflows/hooks/useWorkflowDetailPanel";
import { TimelineRow } from "./TimelineRow";
import { TimelineItemHeader } from "./TimelineItemHeader";
import { formatDate } from "@/shared/utils/formatDate";

/** Convert kebab-case to Title Case (e.g., "commit-implementation-cycle-1" → "Commit Implementation Cycle 1") */
function toTitleCase(str: string): string {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface StepGitRowProps {
  step: WorkflowRunStep;
  onSelectStep?: (stepId: string) => void;
  onSetActiveTab?: (tab: WorkflowTab) => void;
}

export function StepGitRow({ step, onSelectStep, onSetActiveTab }: StepGitRowProps) {
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

  // Badge label for step type
  const badgeLabel = step.step_type === "git" ? "git" : "cli";

  return (
    <TimelineRow
      icon={
        <StatusIcon
          className={`h-5 w-5 ${statusColor} ${step.status === "running" ? "animate-spin" : ""}`}
        />
      }
      tooltipLabel={`${badgeLabel.charAt(0).toUpperCase() + badgeLabel.slice(1)} Step`}
      onClick={() => {
        onSelectStep?.(step.id);
        onSetActiveTab?.("logs");
      }}
    >
      <TimelineItemHeader
        title={toTitleCase(step.name)}
        badge={badgeLabel}
        date={formatDate(step.created_at)}
        duration={duration}
        id={step.id}
        errorMessage={step.error_message}
      />

      {/* Trace display */}
      {output?.trace && output.trace.length > 0 && (
        <div className="text-xs font-mono text-muted-foreground space-y-1 mt-2">
          {output.trace.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-2 min-w-0">
              <span className="text-blue-400 flex-shrink-0">$</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="truncate flex-1 min-w-0">{entry.command}</span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-md break-words">
                  {entry.command}
                </TooltipContent>
              </Tooltip>
              {entry.duration && (
                <span className="text-gray-500 flex-shrink-0">({entry.duration}ms)</span>
              )}
            </div>
          ))}
        </div>
      )}
    </TimelineRow>
  );
}
