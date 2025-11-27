import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  MinusCircle,
  Ban,
} from "lucide-react";
import { AgentSessionModal } from "@/client/pages/projects/workflows/components/AgentSessionModal";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/client/components/ui/tooltip";
import { Button } from "@/client/components/ui/button";
import { useIsMobile } from "@/client/hooks/use-mobile";
import type {
  WorkflowRunStep,
  StepOutput,
} from "@/shared/types/workflow-step.types";
import type { WorkflowTab } from "@/client/pages/projects/workflows/hooks/useWorkflowDetailPanel";
import type { TraceEntry } from "agentcmd-workflows";
import { TimelineRow } from "./TimelineRow";
import { TimelineItemHeader } from "./TimelineItemHeader";
import { formatDate } from "@/shared/utils/formatDate";

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

  // Type-safe output access for trace
  const output = step.output as StepOutput<typeof step.step_type> | null;

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

  return (
    <>
      <TimelineRow
        icon={
          <StatusIcon
            className={`h-5 w-5 ${statusColor} ${step.status === "running" ? "animate-spin" : ""}`}
          />
        }
        tooltipLabel="Agent Step"
        onClick={() => {
          onSelectStep?.(step.id);
          onSetActiveTab?.("logs");
        }}
      >
        <TimelineItemHeader
          title={step.name}
          badge="agent"
          date={formatDate(step.created_at)}
          duration={duration}
          id={step.id}
          errorMessage={step.error_message}
        />

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
