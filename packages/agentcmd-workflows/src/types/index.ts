/**
 * Type exports for workflow SDK
 */

export type {
  WorkflowStep,
  StepOptions,
  PhaseOptions,
  TraceEntry,
  AgentStepConfig,
  AgentStepResult,
  GitStepConfig,
  GitStepResult,
  CliStepConfig,
  CliStepResult,
  ArtifactStepConfig,
  ArtifactStepResult,
  AnnotationStepConfig,
  AnnotationStepResult,
  AiStepConfig,
  AiStepResult,
  AiGenerationMetadata,
  SetupWorkspaceConfig,
  WorkspaceResult,
} from "./steps";

export type {
  WorkflowConfig,
  WorkflowContext,
  WorkflowEvent,
  WorkflowEventData,
  WorkflowFunction,
  PhaseDefinition,
} from "./workflow";

export type { PhaseOptions as PhaseOptionsAlias } from "./phases";
