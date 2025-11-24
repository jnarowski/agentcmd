import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  MinusCircle,
} from "lucide-react";
import { AgentSessionModal } from "@/client/pages/projects/workflows/components/AgentSessionModal";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/client/components/ui/tooltip";
import { Button } from "@/client/components/ui/button";
import { useIsMobile } from "@/client/hooks/use-mobile";
import { useDebugMode } from "@/client/hooks/useDebugMode";
import type {
  WorkflowRunStep,
  StepOutput,
} from "@/shared/types/workflow-step.types";
import type { WorkflowTab } from "@/client/pages/projects/workflows/hooks/useWorkflowDetailPanel";
import type { TraceEntry } from "agentcmd-workflows";
import { TimelineRow } from "./TimelineRow";
import { formatDate } from "@/shared/utils/formatDate";
import { formatDuration } from "../../utils/formatDuration";

interface StepAgentRowProps {
  step: WorkflowRunStep;
  projectId: string;
  onSelectSession?: (sessionId: string) => void;
  onSelectStep?: (stepId: string) => void;
  onSetActiveTab?: (tab: WorkflowTab) => void;
}

export function StepAgentRow({
  step,
  projectId,
  onSelectSession,
  onSelectStep,
  onSetActiveTab,
}: StepAgentRowProps) {
  const [showSessionModal, setShowSessionModal] = useState(false);
  const isMobile = useIsMobile();
  const debugMode = useDebugMode();

  // Type-safe output access for trace
  const output = step.output as StepOutput<typeof step.step_type> | null;

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

  // Format step type for tooltip
  const tooltipLabel =
    step.step_type
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

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
          <span>{formatDate(step.created_at)}</span>
          <span>•</span>
          {duration && <span>{formatDuration(duration)}</span>}
          {step.error_message && (
            <span className="text-red-500">{step.error_message}</span>
          )}
        </div>

        {step.agent_session_id && (
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (isMobile) {
                setShowSessionModal(true);
              } else {
                if (step.agent_session_id) {
                  onSelectSession?.(step.agent_session_id);
                  onSetActiveTab?.("session");
                }
              }
            }}
            className="mt-2 h-7 text-xs"
          >
            View Session
          </Button>
        )}

        {/* Trace display */}
        {output?.trace && output.trace.length > 0 && (
          <div className="text-xs font-mono text-muted-foreground space-y-1 mt-2">
            {(output.trace as TraceEntry[]).map((entry, idx) => (
              <div key={idx} className="flex items-center gap-2 min-w-0">
                <span className="text-blue-400 flex-shrink-0">$</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="truncate flex-1 min-w-0">
                      {entry.command}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-md break-words">
                    {entry.command}
                  </TooltipContent>
                </Tooltip>
                {entry.duration && (
                  <span className="text-gray-500 flex-shrink-0">
                    ({entry.duration}ms)
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </TimelineRow>

      {/* Session Modal */}
      {step.agent_session_id && (
        <AgentSessionModal
          open={showSessionModal}
          onOpenChange={setShowSessionModal}
          projectId={projectId}
          sessionId={step.agent_session_id}
          sessionName={`${step.name} Session`}
        />
      )}
    </>
  );
}
