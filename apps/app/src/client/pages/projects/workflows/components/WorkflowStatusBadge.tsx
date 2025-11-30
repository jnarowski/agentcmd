import { WorkflowStatusValues } from "@/shared/schemas/workflow.schemas";
import type { WorkflowStatus, StepStatus } from "@/shared/schemas/workflow.schemas";
import {
  getWorkflowStatusConfig,
  getStepStatusConfig,
} from "@/client/pages/projects/workflows/utils/workflowStatus";

export interface WorkflowStatusBadgeProps {
  status: WorkflowStatus | StepStatus;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  showLabel?: boolean;
  className?: string;
}

export function WorkflowStatusBadge({
  status,
  size = "md",
  showIcon = true,
  showLabel = true,
  className = "",
}: WorkflowStatusBadgeProps) {
  // Determine if it's a workflow or step status
  const isWorkflowStatus = Object.values(WorkflowStatusValues).includes(
    status as WorkflowStatus
  );
  const config = isWorkflowStatus
    ? getWorkflowStatusConfig(status as WorkflowStatus)
    : getStepStatusConfig(status as StepStatus);

  const Icon = config.icon;

  // Size classes
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-sm gap-1.5",
    lg: "px-3 py-1.5 text-base gap-2",
  };

  const iconSizeClasses = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  // Add pulse animation for running status
  const isRunning = status === "running";

  return (
    <span
      data-testid={isWorkflowStatus ? "run-status-badge" : "step-status-badge"}
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${config.bgColor} ${config.textColor} ${className}`}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      {showIcon && (
        <Icon
          className={`${iconSizeClasses[size]} ${isRunning ? "animate-spin" : ""}`}
        />
      )}
      {showLabel && <span>{config.label}</span>}
      {isRunning && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
        </span>
      )}
    </span>
  );
}
