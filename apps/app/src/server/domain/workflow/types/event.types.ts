import type { WorkflowEvent } from "@prisma/client";
import type { WorkflowEventType } from "@/shared/schemas/workflow.schemas";

// Base event data structure - all events have at minimum title and body
export interface BaseEventData {
  title: string;
  body: string;
}

// Event data map for type-safe event_data
// All events use the same base structure (title + body) with optional additional fields
export interface EventDataMap {
  annotation_added: {
    message: string;
  };
  workflow_started: BaseEventData & {
    timestamp?: string;
  };
  workflow_completed: BaseEventData & {
    timestamp?: string;
  };
  workflow_failed: BaseEventData & {
    error?: string;
    timestamp?: string;
  };
  workflow_paused: BaseEventData & {
    reason?: string;
  };
  workflow_resumed: BaseEventData;
  workflow_cancelled: BaseEventData & {
    reason?: string;
  };
  phase_started: BaseEventData & {
    phase: string;
    retries?: number;
  };
  phase_completed: BaseEventData & {
    phase: string;
  };
  phase_retry: BaseEventData & {
    phase: string;
    attempt: number;
    error?: string;
  };
  phase_failed: BaseEventData & {
    phase: string;
    attempts: number;
    error?: string;
  };
  step_started: BaseEventData & {
    step_id: string;
    step_name: string;
    stepId?: string;
  };
  step_running: BaseEventData & {
    stepId: string;
  };
  step_completed: BaseEventData & {
    stepId: string;
  };
  step_failed: BaseEventData & {
    stepId: string;
    error?: string;
  };
}

// Export WorkflowEvent type from Prisma
export type { WorkflowEvent };

// Re-export WorkflowEventType from shared schemas for convenience
export type { WorkflowEventType };

// Step Options Interfaces
// Base options for all steps
export interface BaseStepOptions {
  timeout?: number;
}

// Agent-specific options (extensive configuration)
export interface AgentStepOptions extends BaseStepOptions {
  retries?: number;
  retryDelay?: number;
  continueOnError?: boolean;
}

// CLI-specific options
export interface CliStepOptions extends BaseStepOptions {
  retries?: number;
  continueOnError?: boolean;
}

// Git-specific options
export interface GitStepOptions extends BaseStepOptions {
  continueOnError?: boolean;
}

// Artifact-specific options
export interface ArtifactStepOptions extends BaseStepOptions {
  continueOnError?: boolean;
}

// Phase-specific options
export interface PhaseOptions {
  description?: string;
}
