import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  MinusCircle,
  Ban,
  ExternalLink,
} from "lucide-react";
import type { PreviewStepResult } from "agentcmd-workflows";
import type { WorkflowRunStep } from "@/shared/types/workflow-step.types";
import type { WorkflowTab } from "@/client/pages/projects/workflows/hooks/useWorkflowDetailPanel";
import { TimelineRow } from "./TimelineRow";
import { TimelineItemHeader } from "./TimelineItemHeader";
import { formatDate } from "@/shared/utils/formatDate";

interface StepPreviewRowProps {
  step: WorkflowRunStep;
  onSelectStep?: (stepId: string) => void;
  onSetActiveTab?: (tab: WorkflowTab) => void;
}

export function StepPreviewRow({
  step,
  onSelectStep,
  onSetActiveTab,
}: StepPreviewRowProps) {
  // Type-safe output access
  const output =
    step.step_type === "preview"
      ? (step.output as PreviewStepResult | null)
      : null;

  // Status icon
  const StatusIcon = {
    pending: Circle,
    running: Loader2,
    completed: CheckCircle2,
    failed: XCircle,
    skipped: MinusCircle,
    cancelled: Ban,
  }[step.status];

  // Status color
  const statusColor = {
    pending: "text-gray-400",
    running: "text-blue-500",
    completed: "text-green-500",
    failed: "text-red-500",
    skipped: "text-gray-400",
    cancelled: "text-gray-400",
  }[step.status];

  // Calculate duration
  const duration =
    step.started_at && step.completed_at
      ? new Date(step.completed_at).getTime() -
        new Date(step.started_at).getTime()
      : null;

  // Get URLs from output
  const urls = output?.data?.urls ?? {};
  const urlEntries = Object.entries(urls);
  const hasUrls = urlEntries.length > 0;

  return (
    <TimelineRow
      icon={
        <StatusIcon
          className={`h-5 w-5 ${statusColor} ${step.status === "running" ? "animate-spin" : ""}`}
        />
      }
      tooltipLabel="Preview Step"
      onClick={() => {
        onSelectStep?.(step.id);
        onSetActiveTab?.("logs");
      }}
    >
      <TimelineItemHeader
        title={step.name}
        badge="preview"
        date={formatDate(step.created_at)}
        duration={duration}
        id={step.id}
        errorMessage={step.error_message}
      />

      {/* Preview URLs */}
      {step.status === "completed" && hasUrls && (
        <div>
          <p className="mt-2 text-xs text-muted-foreground">
            Preview deployed successfully
          </p>
          <div className="text-xs font-mono space-y-1 mt-2">
            {urlEntries.map(([name, url]) => (
              <div key={name} className="flex items-center gap-1 min-w-0">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:text-primary/80 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>{url}</span>
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
                <span className="text-muted-foreground">- {name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Running state */}
      {step.status === "running" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Starting preview container...
        </p>
      )}

      {/* Skipped state */}
      {step.status === "skipped" && output?.error && (
        <p className="mt-2 text-xs text-muted-foreground">{output.error}</p>
      )}
    </TimelineRow>
  );
}
