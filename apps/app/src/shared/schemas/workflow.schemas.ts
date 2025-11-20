import { z } from 'zod';

/**
 * Workflow Status Schema
 *
 * Zod schema for validation - produces string union type
 */
export const workflowStatusSchema = z.enum([
  'pending',
  'running',
  'paused',
  'completed',
  'failed',
  'cancelled',
]);

/**
 * Workflow Status Enum Values (for runtime use)
 * Object with const values matching the schema
 */
export const WorkflowStatusValues = {
  PENDING: 'pending',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

/**
 * Workflow Status Type (for type annotations)
 * String union type derived from schema
 */
export type WorkflowStatus = z.infer<typeof workflowStatusSchema>;

/**
 * Step Status Schema
 *
 * Zod schema for validation - produces string union type
 */
export const stepStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'skipped',
]);

/**
 * Step Status Enum Values (for runtime use)
 * Object with const values matching the schema
 */
export const StepStatusValues = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const;

/**
 * Step Status Type (for type annotations)
 * String union type derived from schema
 */
export type StepStatus = z.infer<typeof stepStatusSchema>;

/**
 * Workflow Definition Status Schema
 *
 * Represents the status of a workflow definition:
 * - "active": Definition is active and can be executed
 * - "archived": Definition has been archived (file deleted or marked inactive)
 *
 * Zod schema for validation - produces string union type
 */
export const workflowDefinitionStatusSchema = z.enum(['active', 'archived']);

/**
 * Workflow Definition Status Type
 *
 * String union type derived from workflowDefinitionStatusSchema.
 * Use this for type annotations in components and services.
 */
export type WorkflowDefinitionStatus = z.infer<
  typeof workflowDefinitionStatusSchema
>;

/**
 * Artifact Type Enum Schema
 *
 * Represents the type of a workflow artifact file.
 */
export const artifactTypeSchema = z.enum([
  'image',
  'video',
  'document',
  'code',
  'other',
]);

/**
 * Artifact Type
 *
 * Derived from artifactTypeSchema for type safety.
 */
export type ArtifactType = z.infer<typeof artifactTypeSchema>;

/**
 * Triggered By Schema
 *
 * Represents how a workflow run was triggered.
 */
export const triggeredBySchema = z.enum(['manual', 'webhook', 'api', 'scheduled']);

/**
 * Triggered By Type
 *
 * Derived from triggeredBySchema for type safety.
 */
export type TriggeredBy = z.infer<typeof triggeredBySchema>;

/**
 * Issue Source Schema
 *
 * Represents the external issue tracking system.
 */
export const issueSourceSchema = z.enum(['github', 'linear', 'jira', 'generic']);

/**
 * Issue Source Type
 *
 * Derived from issueSourceSchema for type safety.
 */
export type IssueSource = z.infer<typeof issueSourceSchema>;

/**
 * Workflow Event Type Enum Schema
 *
 * Represents the type of a workflow event.
 */
export const workflowEventTypeSchema = z.enum([
  'annotation_added',
  'workflow_created',
  'workflow_started',
  'workflow_completed',
  'workflow_failed',
  'workflow_paused',
  'workflow_resumed',
  'workflow_cancelled',
  'phase_started',
  'phase_completed',
  'phase_retry',
  'phase_failed',
  'step_started',
  'step_running',
  'step_completed',
  'step_failed',
  'step_log',
  'command_executed',
]);

/**
 * Workflow Event Type
 *
 * Derived from workflowEventTypeSchema for type safety.
 */
export type WorkflowEventType = z.infer<typeof workflowEventTypeSchema>;

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Create Workflow Run Request Schema
 *
 * Validates the request body for creating a new workflow run.
 */
export const createWorkflowRunSchema = z
  .object({
    project_id: z.string().cuid(),
    workflow_definition_id: z.string().cuid(),
    name: z.string().min(1).max(200),
    args: z.record(z.string(), z.unknown()).default({}),
    spec_file: z.string().optional(),
    spec_content: z.string().optional(),
    spec_type: z.string().optional(),
    planning_session_id: z.string().uuid().optional(),
    mode: z.enum(['stay', 'branch', 'worktree']).optional(),
    base_branch: z.string().optional(),
    branch_name: z.string().optional(),
    inngest_run_id: z.string().optional(),
    triggered_by: triggeredBySchema.optional(),
    webhook_event_id: z.string().cuid().optional(),
    issue_id: z.string().optional(),
    issue_url: z.string().url().optional(),
    issue_source: issueSourceSchema.optional(),
  })
  .refine((data) => {
    // XOR: spec_file OR spec_content OR planning_session_id (exactly one must be provided)
    const hasSpecFile = !!data.spec_file;
    const hasSpecContent = !!data.spec_content;
    const hasPlanningSession = !!data.planning_session_id;
    const count = [hasSpecFile, hasSpecContent, hasPlanningSession].filter(Boolean).length;
    return count === 1;
  }, {
    message: "Exactly one of spec_file, spec_content, or planning_session_id must be provided",
    path: ["spec_file", "spec_content", "planning_session_id"],
  });

/**
 * Workflow Run Filters Schema
 *
 * Validates query parameters for filtering workflow runs.
 */
export const workflowRunFiltersSchema = z.object({
  project_id: z.string().cuid().optional(),
  status: z.union([
    workflowStatusSchema,
    z.string().transform((val) => val.split(',').map(s => s.trim()))
  ]).optional(),
  search: z.string().optional(),
  definition_id: z.string().cuid().optional(),
});

/**
 * Upload Artifact Request Schema
 *
 * Validates the request for uploading a workflow artifact (multipart form data).
 */
export const uploadArtifactSchema = z.object({
  step_id: z.string().cuid(),
  name: z.string().min(1).max(200).optional(),
  file_type: artifactTypeSchema,
});

/**
 * Attach Artifact to Event Schema
 *
 * Validates the request for attaching an artifact to a workflow event.
 */
export const attachArtifactSchema = z.object({
  event_id: z.string().cuid(),
});

/**
 * Create Workflow Event Request Schema
 *
 * Validates the request body for creating a new workflow event (comment, etc.).
 */
export const createWorkflowEventSchema = z.object({
  text: z.string().min(1),
  step_id: z.string().cuid().optional(),
  event_type: workflowEventTypeSchema.optional(),
});

/**
 * Get Workflow Events Query Schema
 *
 * Validates query parameters for fetching workflow events.
 */
export const getWorkflowEventsQuerySchema = z.object({
  step_id: z.string().cuid().optional(),
  event_type: workflowEventTypeSchema.optional(),
});

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Workflow Run Step Response Schema
 *
 * Validates the response for a workflow run step (used in nested relations).
 */
export const workflowRunStepResponseSchema = z.object({
  id: z.string(),
  workflow_run_id: z.string(),
  step_id: z.string(),
  name: z.string(),
  phase: z.string(),
  status: z.string(),
  log_directory_path: z.string().nullable(),
  agent_session_id: z.string().nullable(),
  error_message: z.string().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Workflow Event Response Schema
 *
 * Validates the response for a workflow event (used in nested relations).
 */
export const workflowEventResponseSchema = z.object({
  id: z.string(),
  workflow_run_id: z.string(),
  event_type: z.string(),
  event_data: z.record(z.string(), z.unknown()),
  phase: z.string().nullable(),
  inngest_step_id: z.string().nullable(),
  created_by_user_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Phase Definition Schema
 *
 * A phase can be either:
 * - A simple string (id = label)
 * - An object with separate id and label
 */
export const phaseDefinitionSchema = z.union([
  z.string(),
  z.object({
    id: z.string(),
    label: z.string(),
  }),
]);

/**
 * Workflow Definition Response Schema (Nested)
 *
 * Validates the response for a workflow definition when included as a relation.
 */
export const workflowDefinitionResponseSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.string(),
  path: z.string(),
  phases: z.array(phaseDefinitionSchema),
  args_schema: z.record(z.string(), z.unknown()).nullable(),
  is_template: z.boolean(),
  status: workflowDefinitionStatusSchema,
  file_exists: z.boolean(),
  archived_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Workflow Run Response Schema
 *
 * Validates the response for a workflow run, with optional nested relations.
 */
export const workflowRunResponseSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  user_id: z.string(),
  workflow_definition_id: z.string(),
  name: z.string(),
  args: z.record(z.string(), z.unknown()),
  spec_file: z.string().nullable(),
  spec_content: z.string().nullable(),
  spec_type: z.string().nullable(),
  planning_session_id: z.string().nullable(),
  base_branch: z.string().nullable(),
  branch_name: z.string().nullable(),
  worktree_name: z.string().nullable(),
  triggered_by: z.string(),
  webhook_event_id: z.string().nullable(),
  issue_id: z.string().nullable(),
  issue_url: z.string().nullable(),
  issue_source: z.string().nullable(),
  current_phase: z.string().nullable(),
  current_step_index: z.number(),
  status: z.string(),
  error_message: z.string().nullable(),
  inngest_run_id: z.string().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  paused_at: z.string().nullable(),
  cancelled_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  // Optional relations
  steps: z.array(workflowRunStepResponseSchema).optional(),
  events: z.array(workflowEventResponseSchema).optional(),
  workflow_definition: workflowDefinitionResponseSchema.optional(),
});

/**
 * Artifact Response Schema
 *
 * Validates the response for a workflow artifact.
 */
export const artifactResponseSchema = z.object({
  id: z.string(),
  workflow_run_id: z.string(),
  workflow_event_id: z.string().nullable(),
  name: z.string(),
  file_path: z.string(),
  file_type: z.string(),
  mime_type: z.string(),
  size_bytes: z.number(),
  phase: z.string().nullable(),
  inngest_step_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// ============================================================================
// WebSocket Event Schemas
// ============================================================================

/**
 * Workflow created event
 * Emitted when workflow run is created
 */
const WorkflowCreatedSchema = z.object({
  type: z.literal('workflow.created'),
  data: z.object({
    runId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
    definitionId: z.string(),
  }),
});

/**
 * Workflow started event
 * Emitted when workflow run begins
 */
const WorkflowStartedSchema = z.object({
  type: z.literal('workflow.started'),
  data: z.object({
    runId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
  }),
});

/**
 * Workflow completed event
 * Emitted when workflow run finishes successfully
 */
const WorkflowCompletedSchema = z.object({
  type: z.literal('workflow.completed'),
  data: z.object({
    runId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
  }),
});

/**
 * Workflow failed event
 * Emitted when workflow run fails with error
 */
const WorkflowFailedSchema = z.object({
  type: z.literal('workflow.failed'),
  data: z.object({
    runId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
    error: z.string(),
  }),
});

/**
 * Workflow paused event
 * Emitted when workflow run is paused
 */
const WorkflowPausedSchema = z.object({
  type: z.literal('workflow.paused'),
  data: z.object({
    runId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
  }),
});

/**
 * Workflow resumed event
 * Emitted when paused workflow run resumes
 */
const WorkflowResumedSchema = z.object({
  type: z.literal('workflow.resumed'),
  data: z.object({
    runId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
  }),
});

/**
 * Workflow cancelled event
 * Emitted when workflow run is cancelled by user
 */
const WorkflowCancelledSchema = z.object({
  type: z.literal('workflow.cancelled'),
  data: z.object({
    runId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
  }),
});

/**
 * Step started event
 * Emitted when a workflow step begins execution
 */
const WorkflowStepStartedSchema = z.object({
  type: z.literal('workflow.step.started'),
  data: z.object({
    runId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
    stepId: z.string(),
    stepName: z.string(),
    phase: z.string(),
  }),
});

/**
 * Step completed event
 * Emitted when a workflow step finishes successfully
 */
const WorkflowStepCompletedSchema = z.object({
  type: z.literal('workflow.step.completed'),
  data: z.object({
    runId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
    stepId: z.string(),
    stepName: z.string(),
    phase: z.string(),
    logs: z.string(),
  }),
});

/**
 * Step failed event
 * Emitted when a workflow step fails with error
 */
const WorkflowStepFailedSchema = z.object({
  type: z.literal('workflow.step.failed'),
  data: z.object({
    runId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
    stepId: z.string(),
    stepName: z.string(),
    phase: z.string(),
    error: z.string(),
  }),
});

/**
 * Phase started event
 * Emitted when a workflow phase begins
 */
const WorkflowPhaseStartedSchema = z.object({
  type: z.literal('workflow.phase.started'),
  data: z.object({
    runId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
    phase: z.string(),
  }),
});

/**
 * Phase completed event
 * Emitted when a workflow phase completes
 */
const WorkflowPhaseCompletedSchema = z.object({
  type: z.literal('workflow.phase.completed'),
  data: z.object({
    runId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
    phase: z.string(),
  }),
});

/**
 * Annotation created event
 * Emitted when a comment/annotation is added to workflow run
 */
const WorkflowAnnotationCreatedSchema = z.object({
  type: z.literal('workflow.annotation.created'),
  data: z.object({
    runId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
    commentId: z.string(),
    text: z.string(),
    body: z.string().optional(),
    stepId: z.string().optional(),
    userId: z.string().nullable(),
  }),
});

/**
 * Complete discriminated union of all workflow WebSocket event message types
 *
 * Use this schema for validation:
 * ```typescript
 * const message = WorkflowWebSocketMessageSchema.parse(rawMessage);
 * ```
 *
 * Enables exhaustive type checking with TypeScript's never type:
 * ```typescript
 * switch (message.type) {
 *   case 'workflow.started': // ...
 *   case 'workflow.completed': // ...
 *   default:
 *     const _exhaustive: never = message; // TypeScript error if missing case
 * }
 * ```
 */
export const WorkflowWebSocketMessageSchema = z.discriminatedUnion('type', [
  WorkflowCreatedSchema,
  WorkflowStartedSchema,
  WorkflowCompletedSchema,
  WorkflowFailedSchema,
  WorkflowPausedSchema,
  WorkflowResumedSchema,
  WorkflowCancelledSchema,
  WorkflowStepStartedSchema,
  WorkflowStepCompletedSchema,
  WorkflowStepFailedSchema,
  WorkflowPhaseStartedSchema,
  WorkflowPhaseCompletedSchema,
  WorkflowAnnotationCreatedSchema,
]);

/**
 * TypeScript type inferred from schema
 * Use this for type annotations in frontend and backend
 */
export type WorkflowWebSocketMessage = z.infer<typeof WorkflowWebSocketMessageSchema>;

/**
 * Validate a workflow WebSocket message (development helper)
 *
 * @param message - Raw message object to validate
 * @returns Validated message or throws ZodError
 *
 * @example
 * ```typescript
 * try {
 *   const validatedMessage = validateWorkflowMessage(rawMessage);
 *   // Process validatedMessage safely
 * } catch (error) {
 *   if (error instanceof z.ZodError) {
 *     console.error('Invalid message format:', error.issues);
 *   }
 * }
 * ```
 */
export function validateWorkflowMessage(message: unknown): WorkflowWebSocketMessage {
  return WorkflowWebSocketMessageSchema.parse(message);
}
