/**
 * agentcmd-workflows - Type-safe workflow SDK for agentcmd workflow engine
 *
 * This SDK provides TypeScript interfaces and builder functions for defining workflows.
 * The actual implementations are provided by the agentcmd web app at runtime.
 *
 * @example
 * ```typescript
 * import { defineWorkflow } from 'agentcmd-workflows';
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
  CleanupWorkspaceConfig,
  WorkflowConfig,
  WorkflowContext,
  WorkflowEvent,
  WorkflowEventData,
  WorkflowFunction,
  PhaseDefinition,
} from "./types";

// AI model constants and types
export { AI_MODELS } from "./types/ai";
export type {
  AiProvider,
  AnthropicModelId,
  OpenaiModelId,
  AiModelId,
} from "./types/ai";

// Schema type utilities
export type { InferSchemaType, DeepReadonly } from "./types/schema";

// Runtime exports
export type { WorkflowRuntime } from "./runtime";

// Slash command type generation utilities
export { parseSlashCommands, parseArgumentHint, parseJsonResponseSchema } from "./utils/parseSlashCommands";
export { generateSlashCommandTypesCode, generateSlashCommandTypesFromDir } from "./utils/generateSlashCommandTypes";
export { generateResponseTypeCode, commandNameToTypeName, commandNameToArgsTypeName } from "./utils/generateCommandResponseTypes";

// Internal types for slash command parsing
export type { CommandDefinition, CommandArgument, ResponseSchema } from "./types/slash-commands-internal";

// Generated types for built-in template slash commands
export type {
  CmdGenerateSpecArgs,
  CmdGenerateSpecResponse,
  CmdImplementSpecArgs,
  CmdImplementSpecResponse,
  CmdReviewSpecImplementationArgs,
  CmdReviewSpecImplementationResponse,
  SlashCommandName,
  SlashCommandArgs,
} from "./generated/slash-command-types";

// Generated utilities for built-in template slash commands
export { buildSlashCommand } from "./generated/slash-command-types";

// Package version
export const VERSION = "1.0.0";
