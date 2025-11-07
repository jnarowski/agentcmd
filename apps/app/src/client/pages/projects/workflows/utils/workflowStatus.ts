import type { WorkflowStatus, StepStatus } from "@/shared/schemas/workflow.schemas";
import type { LucideIcon } from "lucide-react";
import {
  Clock,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Ban,
  Circle,
  Loader2,
} from "lucide-react";

export interface StatusConfig {
  color: string;
  bgColor: string;
  textColor: string;
  icon: LucideIcon;
  label: string;
}

const WORKFLOW_STATUS_CONFIG: Record<WorkflowStatus, StatusConfig> = {
  pending: {
    color: "gray",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
    icon: Clock,
    label: "Pending",
  },
  running: {
    color: "blue",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
    icon: Play,
    label: "Running",
  },
  paused: {
    color: "yellow",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-700",
    icon: Pause,
    label: "Paused",
  },
  completed: {
    color: "green",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
    icon: CheckCircle2,
    label: "Completed",
  },
  failed: {
    color: "red",
    bgColor: "bg-red-100",
    textColor: "text-red-700",
    icon: XCircle,
    label: "Failed",
  },
  cancelled: {
    color: "gray",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
    icon: Ban,
    label: "Cancelled",
  },
};

const STEP_STATUS_CONFIG: Record<StepStatus, StatusConfig> = {
  pending: {
    color: "gray",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
    icon: Circle,
    label: "Pending",
  },
  running: {
    color: "blue",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
    icon: Loader2,
    label: "Running",
  },
  completed: {
    color: "green",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
    icon: CheckCircle2,
    label: "Completed",
  },
  failed: {
    color: "red",
    bgColor: "bg-red-100",
    textColor: "text-red-700",
    icon: XCircle,
    label: "Failed",
  },
  skipped: {
    color: "gray",
    bgColor: "bg-gray-100",
    textColor: "text-gray-500",
    icon: Circle,
    label: "Skipped",
  },
};

export function getWorkflowStatusConfig(status: WorkflowStatus): StatusConfig {
  return WORKFLOW_STATUS_CONFIG[status];
}

export function getStepStatusConfig(status: StepStatus): StatusConfig {
  return STEP_STATUS_CONFIG[status];
}

// Utility to check if a workflow is in a terminal state
export function isTerminalStatus(status: WorkflowStatus): boolean {
  return ["completed", "failed", "cancelled"].includes(status);
}

// Utility to check if a workflow is active
export function isActiveStatus(status: WorkflowStatus): boolean {
  return ["running", "paused"].includes(status);
}

// Utility to check if a step is in a terminal state
export function isStepTerminal(status: StepStatus): boolean {
  return ["completed", "failed", "skipped"].includes(status);
}
