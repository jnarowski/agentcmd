import type { JSONSchema7 } from "json-schema";
import type { WorkflowStep, WorkspaceResult } from "./steps";

/**
 * Phase definition - can be a simple string (id = label) or object with separate id and label
 */
export type PhaseDefinition = string | { id: string; label: string };

/**
 * Extract phase IDs from phase definitions array
 * Handles both string arrays and object arrays with id property
 */
export type ExtractPhaseIds<T extends readonly PhaseDefinition[]> =
  T[number] extends string
    ? T[number]
    : T[number] extends { id: infer Id }
      ? Id
      : never;

/**
 * Workflow configuration
 */
export interface WorkflowConfig<
  TPhases extends readonly PhaseDefinition[] | undefined = undefined,
  TArgsSchema extends Record<string, unknown> = Record<string, unknown>
> {
  /** Unique workflow identifier */
  id: string;
  /** Human-readable workflow name */
  name?: string;
  /** Workflow description */
  description?: string;
  /** Workflow phases (for UI organization) */
  phases?: TPhases;
  /** Global workflow timeout in milliseconds */
  timeout?: number;
  /**
   * JSON Schema for workflow arguments (runtime validation)
   */
  argsSchema?: TArgsSchema;
}

/**
 * Workflow execution context passed to workflow function
 */
export interface WorkflowContext<
  TPhases extends readonly PhaseDefinition[] | undefined = undefined,
  TArgs = Record<string, unknown>
> {
  /** Inngest event data */
  event: {
    name: string;
    data: WorkflowEventData<TArgs>;
  };
  /** Extended step interface with custom methods */
  step: WorkflowStep<
    TPhases extends readonly PhaseDefinition[]
      ? ExtractPhaseIds<TPhases>
      : string
  >;
  /** Workspace configuration and result */
  workspace?: WorkspaceResult;
}

/**
 * Event data structure for workflow triggers
 */
export interface WorkflowEventData<TArgs = Record<string, unknown>> {
  /** Workflow run ID */
  runId: string;
  /** Project ID */
  projectId: string;
  /** User ID who triggered the workflow */
  userId: string;
  /** Project filesystem path */
  projectPath: string;
  /** Working directory (set after workspace setup, falls back to projectPath) */
  workingDir?: string;
  /** Spec file path */
  specFile?: string;
  /** Spec file content */
  specContent?: string;
  /** Git branch to create worktree from */
  baseBranch?: string;
  /** New branch name for worktree */
  branchName?: string;
  /** Worktree directory name */
  worktreeName?: string;
  /**
   * Workflow arguments
   */
  args: TArgs;
}

/**
 * Workflow function signature
 */
export type WorkflowFunction<
  TPhases extends readonly PhaseDefinition[] | undefined = undefined,
  TArgs = Record<string, unknown>
> = (
  context: WorkflowContext<TPhases, TArgs>
) => Promise<unknown>;
