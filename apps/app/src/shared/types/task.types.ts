/**
 * Task types for specs and planning sessions aggregation
 */

/**
 * Spec task extracted from .agent/specs/index.json
 * Represents a spec in the todo/ folder
 */
export interface SpecTask {
  id: string; // Timestamp ID from index.json
  name: string; // Extracted from folder/file name
  specPath: string; // Relative path from .agent/specs/
  projectId: string; // Project ID this task belongs to
  status: string; // From index.json (e.g., "draft", "in-progress")
  created_at: string; // ISO timestamp from index.json
}

/**
 * Planning session summary for tasks view
 */
export interface PlanningSessionSummary {
  id: string;
  projectId: string;
  userId: string;
  name?: string;
  agent: string;
  type: string;
  state: string;
  is_archived: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Response from GET /api/tasks
 * Aggregates specs and planning sessions
 */
export interface TasksResponse {
  tasks: SpecTask[];
  planningSessions: PlanningSessionSummary[];
}
