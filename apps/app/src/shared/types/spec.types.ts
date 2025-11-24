/**
 * Spec types for specs and planning sessions aggregation
 */

/**
 * Valid spec status values
 */
export type SpecStatus = "backlog" | "draft" | "in-progress" | "completed" | "review";

/**
 * Spec extracted from .agent/specs/index.json
 * Includes all spec statuses
 */
export interface Spec {
  id: string; // Timestamp ID from index.json
  name: string; // Extracted from folder/file name
  specPath: string; // Path relative to .agent/specs/ (e.g., "todo/251117.../spec.md")
  projectId: string; // Project ID this spec belongs to
  status: SpecStatus; // From index.json
  spec_type: string; // Spec type (e.g., "feature", "test") - defaults to "feature" for legacy specs
  created_at: string; // ISO timestamp from index.json
  totalComplexity?: number; // Total complexity points from spec.md
  phaseCount?: number; // Number of phases from spec.md
  taskCount?: number; // Number of tasks from spec.md
}

/**
 * Planning session summary for specs view
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
 * Response from GET /api/specs
 * Aggregates specs and planning sessions
 */
export interface SpecsResponse {
  specs: Spec[];
  planningSessions: PlanningSessionSummary[];
}
