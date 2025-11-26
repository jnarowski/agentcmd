/**
 * Shared Schemas Barrel Export
 *
 * ⚠️ DEPRECATED: Import directly from source files instead
 *
 * ❌ DON'T: import { WorkflowStatus } from "@/shared/schemas"
 * ✅ DO:    import { WorkflowStatus } from "@/shared/schemas/workflow.schemas"
 *
 * Direct imports are clearer and avoid re-export complexity.
 */

// Re-exports maintained for backward compatibility only
export {
  WorkflowStatusValues,
  StepStatusValues,
  workflowStatusSchema,
  stepStatusSchema,
  artifactTypeSchema,
  workflowEventTypeSchema,
  createWorkflowRunSchema,
  workflowRunFiltersSchema,
  uploadArtifactSchema,
  attachArtifactSchema,
  createWorkflowEventSchema,
  getWorkflowEventsQuerySchema,
  workflowRunStepResponseSchema,
  workflowEventResponseSchema,
  workflowDefinitionResponseSchema,
  workflowRunResponseSchema,
  artifactResponseSchema,
  WorkflowWebSocketMessageSchema,
  validateWorkflowMessage,
} from './workflow.schemas';

export type {
  WorkflowStatus,
  StepStatus,
  ArtifactType,
  WorkflowEventType,
  WorkflowWebSocketMessage,
} from './workflow.schemas';

export {
  specStatusSchema,
  specFiltersSchema,
} from './spec.schemas';

export type {
  SpecStatus,
  SpecFilters,
} from './spec.schemas';
