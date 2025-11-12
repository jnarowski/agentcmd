import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  MinusCircle,
  GitBranch,
} from "lucide-react";
import { useDebugMode } from "@/client/hooks/useDebugMode";
import type { WorkflowRunStep } from "@/client/pages/projects/workflows/types";

interface StepGitRowProps {
  step: WorkflowRunStep;
}

export function StepGitRow({ step }: StepGitRowProps) {
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
    if (seconds < 1) return "<1s";
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="flex items-center gap-2 py-2 px-3 hover:bg-accent/30 transition-colors">
      {/* Status Icon - smaller */}
      <StatusIcon
        className={`h-4 w-4 ${statusColor} ${step.status === "running" ? "animate-spin" : ""}`}
      />

      {/* Git Icon */}
      <GitBranch className="h-4 w-4 text-muted-foreground" />

      {/* Compact Step Info */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm">{step.name}</span>
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

      {/* Compact Status Badge */}
      <span
        className={`px-1.5 py-0.5 text-xs font-medium rounded ${
          {
            pending: "bg-gray-500/10 text-gray-500",
            running: "bg-blue-500/10 text-blue-500",
            completed: "bg-green-500/10 text-green-500",
            failed: "bg-red-500/10 text-red-500",
            skipped: "bg-gray-500/10 text-gray-500",
          }[step.status]
        }`}
      >
        {step.status}
      </span>
    </div>
  );
}
