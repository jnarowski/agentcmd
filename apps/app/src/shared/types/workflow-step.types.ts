import type {
  GitStepResult,
  CliStepResult,
  AiStepResult,
  AgentStepResult,
  ArtifactStepResult,
  AnnotationStepResult,
  PreviewStepResult,
} from "agentcmd-workflows";

/**
 * Base workflow run step fields from database
 */
export interface WorkflowRunStepBase {
  id: string;
  workflow_run_id: string;
  inngest_step_id: string;
  name: string;
  step_type: "git" | "cli" | "ai" | "agent" | "artifact" | "annotation" | "conditional" | "loop" | "preview";
  phase: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped" | "cancelled";
  agent_session_id: string | null;
  error_message: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Git step with typed args and output
 */
export interface WorkflowRunStepGit {
  step_type: "git";
  args: {
    operation: "commit" | "branch" | "pr" | "commit-and-branch";
    message?: string;
    commitMessage?: string;
    branch?: string;
    baseBranch?: string;
    title?: string;
    body?: string;
    autoCommit?: boolean;
  } | null;
  output: GitStepResult | null;
}

/**
 * CLI step with typed args and output
 */
export interface WorkflowRunStepCli {
  step_type: "cli";
  args: {
    command: string;
    cwd?: string;
    env?: Record<string, string>;
    shell?: string;
  } | null;
  output: CliStepResult | null;
}

/**
 * AI step with typed args and output
 */
export interface WorkflowRunStepAi {
  step_type: "ai";
  args: {
    prompt: string;
    provider?: "anthropic" | "openai";
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  } | null;
  output: AiStepResult | null;
}

/**
 * Agent step with typed args and output
 */
export interface WorkflowRunStepAgent {
  step_type: "agent";
  args: {
    agent: "claude" | "codex" | "gemini";
    prompt: string;
    workingDir?: string;
    context?: Record<string, unknown>;
    permissionMode?: "default" | "plan" | "acceptEdits" | "bypassPermissions";
    json?: boolean;
  } | null;
  output: AgentStepResult | null;
}

/**
 * Artifact step with typed args and output
 */
export interface WorkflowRunStepArtifact {
  step_type: "artifact";
  args: {
    name: string;
    type: "text" | "file" | "image" | "directory";
    content?: string;
    file?: string;
    directory?: string;
    pattern?: string;
    description?: string;
    eventId?: string;
  } | null;
  output: ArtifactStepResult | null;
}

/**
 * Annotation step with typed args and output
 */
export interface WorkflowRunStepAnnotation {
  step_type: "annotation";
  args: {
    message: string;
  } | null;
  output: AnnotationStepResult | null;
}

/**
 * Conditional step (no SDK type yet, using basic structure)
 */
export interface WorkflowRunStepConditional {
  step_type: "conditional";
  args: {
    condition: string;
    onTrue?: unknown;
    onFalse?: unknown;
  } | null;
  output: {
    data: { result: boolean };
    success: boolean;
    error?: string;
    trace: Array<{ command: string; output?: string }>;
  } | null;
}

/**
 * Loop step (no SDK type yet, using basic structure)
 */
export interface WorkflowRunStepLoop {
  step_type: "loop";
  args: {
    items?: unknown[];
    range?: { start: number; end: number };
    variable?: string;
  } | null;
  output: {
    data: { iterations: number };
    success: boolean;
    error?: string;
    trace: Array<{ command: string; output?: string }>;
  } | null;
}

/**
 * Preview step with typed args and output
 */
export interface WorkflowRunStepPreview {
  step_type: "preview";
  args: {
    ports?: Record<string, number>;
    env?: Record<string, string>;
    dockerFilePath?: string;
    maxMemory?: string;
    maxCpus?: string;
  } | null;
  output: PreviewStepResult | null;
}

/**
 * Discriminated union of all step types
 */
export type WorkflowRunStepTyped =
  | WorkflowRunStepGit
  | WorkflowRunStepCli
  | WorkflowRunStepAi
  | WorkflowRunStepAgent
  | WorkflowRunStepArtifact
  | WorkflowRunStepAnnotation
  | WorkflowRunStepConditional
  | WorkflowRunStepLoop
  | WorkflowRunStepPreview;

/**
 * Complete workflow run step with type-safe args and output
 * Intersection of base DB fields and discriminated union
 */
export type WorkflowRunStep = WorkflowRunStepBase & WorkflowRunStepTyped;

/**
 * Type helper to extract args type for a specific step type
 */
export type StepArgs<T extends WorkflowRunStep["step_type"]> = Extract<
  WorkflowRunStepTyped,
  { step_type: T }
>["args"];

/**
 * Type helper to extract output type for a specific step type
 */
export type StepOutput<T extends WorkflowRunStep["step_type"]> = Extract<
  WorkflowRunStepTyped,
  { step_type: T }
>["output"];

/**
 * Type guards for step types
 */
export function isGitStep(step: WorkflowRunStep): step is WorkflowRunStepBase & WorkflowRunStepGit {
  return step.step_type === "git";
}

export function isCliStep(step: WorkflowRunStep): step is WorkflowRunStepBase & WorkflowRunStepCli {
  return step.step_type === "cli";
}

export function isAiStep(step: WorkflowRunStep): step is WorkflowRunStepBase & WorkflowRunStepAi {
  return step.step_type === "ai";
}

export function isAgentStep(step: WorkflowRunStep): step is WorkflowRunStepBase & WorkflowRunStepAgent {
  return step.step_type === "agent";
}

export function isArtifactStep(step: WorkflowRunStep): step is WorkflowRunStepBase & WorkflowRunStepArtifact {
  return step.step_type === "artifact";
}

export function isAnnotationStep(step: WorkflowRunStep): step is WorkflowRunStepBase & WorkflowRunStepAnnotation {
  return step.step_type === "annotation";
}

export function isConditionalStep(step: WorkflowRunStep): step is WorkflowRunStepBase & WorkflowRunStepConditional {
  return step.step_type === "conditional";
}

export function isLoopStep(step: WorkflowRunStep): step is WorkflowRunStepBase & WorkflowRunStepLoop {
  return step.step_type === "loop";
}

export function isPreviewStep(step: WorkflowRunStep): step is WorkflowRunStepBase & WorkflowRunStepPreview {
  return step.step_type === "preview";
}
