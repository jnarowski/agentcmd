/**
 * @repo/workflow-sdk - Type-safe workflow SDK for Sourceborn workflow engine
 *
 * This SDK provides TypeScript interfaces and builder functions for defining workflows.
 * The actual implementations are provided by the Sourceborn web app at runtime.
 *
 * @example
 * ```typescript
 * import { defineWorkflow } from '@repo/workflow-sdk';
 *
 * export default defineWorkflow({
 *   id: 'my-workflow',
 *   trigger: 'workflow/my-workflow',
 *   phases: ['phase1', 'phase2']
 * }, async ({ event, step }) => {
 *   await step.phase('phase1', async () => {
 *     await step.agent('task', { agent: 'claude', prompt: 'Do something' });
 *   });
 * });
 * ```
 */

// Builder exports
export { defineWorkflow } from "./builder";
export { defineSchema } from "./builder/defineSchema";
export type { WorkflowDefinition } from "./builder";

// Type exports
export type {
  WorkflowStep,
  StepOptions,
  PhaseOptions,
  AgentStepConfig,
  AgentStepResult,
  GitStepConfig,
  GitStepResult,
  CliStepConfig,
  CliStepResult,
  ArtifactStepConfig,
  ArtifactStepResult,
  AnnotationStepConfig,
  AiStepConfig,
  AiStepResult,
  WorkflowConfig,
  WorkflowContext,
  WorkflowEventData,
  WorkflowFunction,
  PhaseDefinition,
} from "./types";

// Schema type utilities
export type { InferSchemaType, DeepReadonly } from "./types/schema";

// Runtime exports
export type { WorkflowRuntime } from "./runtime";

// Slash command type generation utilities
export { parseSlashCommands, parseArgumentHint, parseJsonResponseSchema } from "./utils/parseSlashCommands";
export { generateSlashCommandTypesCode, generateSlashCommandTypesFromDir } from "./utils/generateSlashCommandTypes";
export { generateResponseTypeCode, commandNameToTypeName } from "./utils/generateCommandResponseTypes";

// Internal types for slash command parsing
export type { CommandDefinition, CommandArgument, ResponseSchema } from "./types/slash-commands-internal";

// Package version
export const VERSION = "1.0.0";
