/**
 * Tool Types
 *
 * Re-exports SDK tool input types as primary types.
 * SDK types are the single source of truth for tool input structure.
 */

// Re-export ALL tool input types from SDK
export type {
  BashToolInput,
  ReadToolInput,
  WriteToolInput,
  EditToolInput,
  GlobToolInput,
  GrepToolInput,
  TodoWriteToolInput,
  WebSearchToolInput,
  TaskToolInput,
  AskUserQuestionToolInput,
  ExitPlanModeToolInput,
} from 'agent-cli-sdk';

// Re-export type guards
export {
  isBashTool,
  isReadTool,
  isWriteTool,
  isEditTool,
  isGlobTool,
  isGrepTool,
} from 'agent-cli-sdk';
