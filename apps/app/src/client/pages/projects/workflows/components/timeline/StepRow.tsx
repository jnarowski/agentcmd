import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  MinusCircle,
} from "lucide-react";
import { AgentSessionModal } from "../AgentSessionModal";
import type { WorkflowRunStep } from "../../types";

interface StepRowProps {
  step: WorkflowRunStep;
  projectId: string;
}

export function StepRow({ step, projectId }: StepRowProps) {
  const [showSessionModal, setShowSessionModal] = useState(false);

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

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors">
      {/* Status Icon */}
      <StatusIcon
        className={`h-5 w-5 ${statusColor} ${step.status === "running" ? "animate-spin" : ""}`}
      />

      {/* Step Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{step.name}</span>
          <span className="text-xs text-muted-foreground font-mono">
            [STEP: {step.id}]
          </span>
          {step.agent_session_id && (
            <button
              onClick={() => setShowSessionModal(true)}
              className="text-xs text-blue-500 hover:underline"
            >
              View Session
            </button>
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

        {/* Status Badge beneath step info */}
        <div className="mt-1">
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${
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
      </div>

      {/* Label */}
      <span className="text-xs text-muted-foreground">Step</span>

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
    </div>
  );
}
