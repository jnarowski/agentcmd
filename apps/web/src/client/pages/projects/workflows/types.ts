import type {
  WorkflowStatus,
  StepStatus,
  WorkflowEventType,
} from "@/shared/schemas/workflow.schemas";
import type { PhaseDefinition } from "@repo/workflow-sdk";

// Re-export types only
export type { WorkflowStatus, StepStatus, WorkflowEventType, PhaseDefinition };

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string | null;
  phases: PhaseDefinition[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args_schema: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Frontend-specific WorkflowRun interface
 *
 * **Note**: This interface intentionally diverges from the backend response schema
 * (`workflowRunResponseSchema`) to meet frontend UI requirements:
 *
 * - Uses `created_by: string` instead of `user_id` (more descriptive for UI)
 * - Uses `current_step: string | null` instead of `current_step_index: number` (UI displays step name, not index)
 * - Omits `paused_at` and `cancelled_at` (not currently displayed in UI)
 * - Uses `Date` objects instead of ISO strings (easier to work with in React)
 * - Optional relations (`steps`, `events`, `artifacts`, `workflow_definition`) for flexibility
 *
 * This follows the hybrid approach: shared schemas validate API responses,
 * frontend defines interfaces optimized for UI needs.
 */
export interface WorkflowRun {
  id: string;
  workflow_definition_id: string;
  workflow_definition?: WorkflowDefinition;
  project_id: string;
  name: string;
  status: WorkflowStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any> | null;
  spec_file: string | null;
  spec_content: string | null;
  branch_from: string | null;
  branch_name: string | null;
  worktree_name: string | null;
  current_step: string | null;
  current_phase: string | null;
  error_message: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  steps?: WorkflowRunStep[];
  events?: WorkflowEvent[];
  artifacts?: WorkflowArtifact[];
  _count?: {
    steps: number;
    events: number;
  };
}

export interface WorkflowRunStep {
  id: string;
  workflow_run_id: string;
  inngest_step_id: string; // Phase-prefixed step ID for Inngest memoization
  name: string; // Display name
  phase: string;
  status: StepStatus;
  logs: string | null;
  error_message: string | null;
  agent_session_id: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  artifacts?: WorkflowArtifact[];
}

// User information interface (for created_by_user relation)
export interface User {
  id: string;
  username: string;
}

// Base event data structure - all events have at minimum title and body
export interface BaseEventData {
  title?: string;
  body?: string;
  message?: string;
}

// Event data type map (matching backend EventDataMap)
// All events use the same base structure (title + body) with optional additional fields
export interface EventDataMap {
  annotation_added: {
    message: string;
  };
  workflow_started: BaseEventData;
  workflow_completed: BaseEventData;
  workflow_failed: BaseEventData & {
    error?: string;
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
  };
  phase_completed: BaseEventData & {
    phase: string;
  };
  step_started: BaseEventData & {
    step_id: string;
    step_name: string;
  };
}

// WorkflowEvent interface (replaces WorkflowComment)
export interface WorkflowEvent {
  id: string;
  workflow_run_id: string;
  event_type: WorkflowEventType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event_data: any; // JSON field, type-safe access via EventDataMap
  phase: string | null; // Phase column from Prisma
  inngest_step_id: string | null; // Optional reference to step that triggered event
  created_by_user_id: string | null;
  created_at: Date;
  created_by_user?: User | null;
  artifacts?: WorkflowArtifact[];
}

export interface WorkflowArtifact {
  id: string;
  workflow_run_id: string;
  workflow_run_step_id: string | null;
  workflow_event_id: string | null;
  name: string;
  file_path: string;
  file_type: string;
  mime_type: string;
  size_bytes: number;
  phase: string | null;
  inngest_step_id: string | null; // Optional reference to step that created artifact
  created_at: Date;
}

// Filter types
export interface WorkflowFilter {
  status?: WorkflowStatus;
  definitionId?: string;
  search?: string;
}

/**
 * WorkflowRunListItem - Optimized interface for list views
 *
 * Minimal data required for displaying workflow runs in list/board views.
 * This matches the optimized backend query that selects only necessary fields.
 * ~500 bytes per run vs ~10KB for full nested data (95% reduction)
 */
export interface WorkflowRunListItem {
  id: string;
  name: string;
  status: WorkflowStatus;
  current_phase: string | null;
  workflow_definition_id: string;
  started_at: Date | null;
  created_at: Date;
  workflow_definition: {
    name: string;
    phases: PhaseDefinition[];
  };
  _count: {
    steps: number;
  };
}

/**
 * WorkflowRunDetail - Full interface for detail views
 *
 * Complete data including nested steps, events, and artifacts.
 * Used only in detail view where full data is needed.
 * This is the full WorkflowRun interface with all nested data
 */
export interface WorkflowRunDetail {
  id: string;
  workflow_definition_id: string;
  workflow_definition?: WorkflowDefinition;
  project_id: string;
  name: string;
  status: WorkflowStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any> | null;
  spec_file: string | null;
  spec_content: string | null;
  branch_from: string | null;
  branch_name: string | null;
  worktree_name: string | null;
  current_step: string | null;
  current_phase: string | null;
  error_message: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  steps?: WorkflowRunStep[];
  events?: WorkflowEvent[];
  artifacts?: WorkflowArtifact[];
  _count?: {
    steps: number;
    events: number;
  };
}
