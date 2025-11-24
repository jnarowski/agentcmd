/**
 * Trace entry for command execution logging
 */
export interface TraceEntry {
  /** Command that was executed */
  command: string;
  /** Optional command output */
  output?: string;
  /** Optional exit code for CLI/shell commands */
  exitCode?: number;
  /** Optional execution duration in milliseconds */
  duration?: number;
}

/**
 * Options that can be passed to any step method for timeout configuration
 */
export interface StepOptions {
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Configuration for phase execution
 */
export interface PhaseOptions {
  /** Optional description for the phase */
  description?: string;
}

/**
 * Configuration for agent execution step
 */
export interface AgentStepConfig {
  /** Agent type: claude, codex, gemini */
  agent: "claude" | "codex" | "gemini";
  /** Prompt or instruction for the agent */
  prompt: string;
  /** Working directory path (project path or worktree path) */
  workingDir?: string;
  /** Additional context or files */
  context?: Record<string, unknown>;
  /** Permission mode for agent */
  permissionMode?: "default" | "plan" | "acceptEdits" | "bypassPermissions";
  /** Load MCP servers from JSON files or strings (space-separated) */
  mcpConfig?: string[];
  /** Enable JSON mode - automatically extract and parse JSON from response */
  json?: boolean;
  /** CLI session ID to resume (e.g., planning session's cli_session_id) */
  resume?: string;
}

/**
 * Result from agent execution
 */
export interface AgentStepResult<T = string> {
  /** Agent session ID */
  sessionId: string;
  /** Exit code from agent execution */
  exitCode: number;
  /** Result data (extracted JSON when json: true, otherwise string output) */
  data: T;
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Execution trace */
  trace: TraceEntry[];
}

/**
 * Base configuration shared by all git operations
 */
interface BaseGitStepConfig {
  /** Display name for the step (defaults to step ID) */
  name?: string;
}

/**
 * Configuration for git commit operation
 */
export interface GitCommitConfig extends BaseGitStepConfig {
  operation: "commit";
  /** Commit message */
  message: string;
}

/**
 * Configuration for git branch operation
 */
export interface GitBranchConfig extends BaseGitStepConfig {
  operation: "branch";
  /** Branch name to create */
  branch: string;
  /** Base branch to create from (default: main) */
  baseBranch?: string;
}

/**
 * Configuration for git pull request operation
 */
export interface GitPrConfig extends BaseGitStepConfig {
  operation: "pr";
  /** PR title */
  title: string;
  /** PR body/description */
  body?: string;
  /** Base branch for PR (default: main) */
  baseBranch?: string;
}

/**
 * Configuration for atomic commit-and-branch operation
 */
export interface GitCommitAndBranchConfig extends BaseGitStepConfig {
  operation: "commit-and-branch";
  /** Branch name to create */
  branch: string;
  /** Commit message (defaults to "WIP: Auto-commit before branching") */
  commitMessage?: string;
  /** Base branch to create from (default: main) */
  baseBranch?: string;
}

/**
 * Type-safe discriminated union for git operation configurations
 */
export type GitStepConfig =
  | GitCommitConfig
  | GitBranchConfig
  | GitPrConfig
  | GitCommitAndBranchConfig;

/**
 * Configuration for workspace setup step
 */
export interface SetupWorkspaceConfig {
  /** Project directory path */
  projectPath: string;
  /** Target branch name (optional, stays on current if not provided) */
  branch?: string;
  /** Base branch for branching (default: main) */
  baseBranch?: string;
  /** Worktree name (if provided, creates worktree instead of switching branches) */
  worktreeName?: string;
}

/**
 * Configuration for workspace cleanup step
 */
export interface CleanupWorkspaceConfig {
  /** Workspace result from setupWorkspace step */
  workspaceResult: WorkspaceResult;
}

/**
 * Base result shared by all git operations
 */
interface BaseGitStepResult {
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Execution trace */
  trace: TraceEntry[];
}

/**
 * Result from git commit operation
 */
export interface GitCommitResult extends BaseGitStepResult {
  data: {
    /** Commit SHA (undefined if no changes to commit) */
    commitSha?: string;
    /** Whether there were changes to commit */
    hadChanges: boolean;
  };
}

/**
 * Result from git branch operation
 */
export interface GitBranchResult extends BaseGitStepResult {
  data: {
    /** Branch name created */
    branch: string;
  };
}

/**
 * Result from git pull request operation
 */
export interface GitPrResult extends BaseGitStepResult {
  data: {
    /** PR URL */
    prUrl?: string;
    /** PR number (if available from gh CLI) */
    prNumber?: number;
  };
}

/**
 * Result from git commit-and-branch operation
 */
export interface GitCommitAndBranchResult extends BaseGitStepResult {
  data: {
    /** Branch name created */
    branch: string;
    /** Commit SHA (if changes were committed) */
    commitSha?: string;
    /** Whether there were uncommitted changes */
    hadUncommittedChanges: boolean;
    /** Whether already on target branch */
    alreadyOnBranch: boolean;
  };
}

/**
 * Type-safe discriminated union for git operation results
 */
export type GitStepResult =
  | GitCommitResult
  | GitBranchResult
  | GitPrResult
  | GitCommitAndBranchResult;

/**
 * Result from workspace setup operation
 */
export interface WorkspaceResult {
  /** Working directory path (either project path or worktree path) */
  workingDir: string;
  /** Current branch name */
  branch: string;
  /** Mode used: worktree, branch, or stay */
  mode: "worktree" | "branch" | "stay";
  /** Absolute path to worktree (only if mode is worktree) */
  worktreePath?: string;
  /** Original branch before workspace setup (for cleanup) */
  originalBranch?: string;
}

/**
 * Configuration for CLI command execution
 */
export interface CliStepConfig {
  /** Display name for the step (defaults to step ID) */
  name?: string;
  /** Shell command to execute */
  command: string;
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Shell to use (default: /bin/sh) */
  shell?: string;
}

/**
 * Result from CLI command execution
 */
export interface CliStepResult {
  /** Result data */
  data: {
    /** Command that was executed */
    command: string;
    /** Exit code */
    exitCode: number;
    /** Standard output */
    stdout: string;
    /** Standard error */
    stderr: string;
  };
  /** Success status (exitCode === 0) */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Execution trace */
  trace: TraceEntry[];
}

/**
 * Configuration for artifact upload
 */
export interface ArtifactStepConfig {
  /** Artifact name */
  name: string;
  /** Artifact type */
  type: "text" | "file" | "image" | "directory";
  /** Text content (for type: text) */
  content?: string;
  /** File path (for type: file or image) */
  file?: string;
  /** Directory path (for type: directory) */
  directory?: string;
  /** File glob pattern for directory uploads */
  pattern?: string;
  /** Description */
  description?: string;
  /** Optional event ID to attach artifact to */
  eventId?: string;
}

/**
 * Result from artifact upload
 */
export interface ArtifactStepResult {
  /** Result data */
  data: {
    /** Number of artifacts uploaded */
    count: number;
    /** Artifact IDs */
    artifactIds: string[];
    /** Total size in bytes */
    totalSize: number;
  };
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Execution trace */
  trace: TraceEntry[];
}

/**
 * Configuration for annotation step
 */
export interface AnnotationStepConfig {
  /** Annotation message */
  message: string;
}

/**
 * Result from annotation step
 */
export interface AnnotationStepResult {
  /** Result data (always undefined for annotations) */
  data: undefined;
  /** Success status */
  success: boolean;
  /** Execution trace */
  trace: TraceEntry[];
}

import type { AnthropicModelId, OpenaiModelId } from "./ai";

/**
 * Configuration for AI text/structured generation step - Anthropic provider
 */
export interface AiStepConfigAnthropic<TSchema = unknown> {
  /** Prompt for the AI model */
  prompt: string;
  /** AI provider: anthropic */
  provider: "anthropic";
  /** Anthropic model ID (defaults to claude-sonnet-4-5-20250929) */
  model?: AnthropicModelId;
  /** System prompt for context/instructions */
  systemPrompt?: string;
  /** Temperature (0-2, default: 0.7) */
  temperature?: number;
  /** Max tokens to generate */
  maxTokens?: number;
  /** Zod schema for structured output (uses generateObject when provided) */
  schema?: TSchema;
}

/**
 * Configuration for AI text/structured generation step - OpenAI provider
 */
export interface AiStepConfigOpenai<TSchema = unknown> {
  /** Prompt for the AI model */
  prompt: string;
  /** AI provider: openai */
  provider: "openai";
  /** OpenAI model ID (defaults to gpt-4) */
  model?: OpenaiModelId;
  /** System prompt for context/instructions */
  systemPrompt?: string;
  /** Temperature (0-2, default: 0.7) */
  temperature?: number;
  /** Max tokens to generate */
  maxTokens?: number;
  /** Zod schema for structured output (uses generateObject when provided) */
  schema?: TSchema;
}

/**
 * Configuration for AI text/structured generation step - Default (Anthropic)
 */
export interface AiStepConfigDefault<TSchema = unknown> {
  /** Prompt for the AI model */
  prompt: string;
  /** AI provider (defaults to anthropic) */
  provider?: undefined;
  /** Anthropic model ID (defaults to claude-sonnet-4-5-20250929) */
  model?: AnthropicModelId;
  /** System prompt for context/instructions */
  systemPrompt?: string;
  /** Temperature (0-2, default: 0.7) */
  temperature?: number;
  /** Max tokens to generate */
  maxTokens?: number;
  /** Zod schema for structured output (uses generateObject when provided) */
  schema?: TSchema;
}

/**
 * Configuration for AI text/structured generation step
 * Discriminated union provides type-safe model selection based on provider
 */
export type AiStepConfig<TSchema = unknown> =
  | AiStepConfigAnthropic<TSchema>
  | AiStepConfigOpenai<TSchema>
  | AiStepConfigDefault<TSchema>;

/**
 * AI generation metadata (based on Vercel AI SDK types)
 * Compatible with GenerateTextResult and GenerateObjectResult
 */
export interface AiGenerationMetadata {
  /** Reason why generation stopped */
  finishReason: 'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other' | 'unknown';
  /** Token usage statistics */
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    reasoningTokens?: number;
  };
  /** Total token usage across all steps (for multi-step generations) */
  totalUsage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    reasoningTokens?: number;
  };
  /** Provider warnings (unsupported settings, etc.) */
  warnings?: Array<{
    type: string;
    message?: string;
  }>;
  /** Provider-specific metadata */
  providerMetadata?: Record<string, unknown>;
  /** Request metadata */
  request?: {
    body?: unknown;
  };
  /** Response metadata */
  response?: {
    id?: string;
    modelId?: string;
    timestamp?: Date;
    body?: unknown;
  };
}

/**
 * Result from AI generation step
 */
export interface AiStepResult<T = { text: string }> {
  /** Generated data (text or structured object) */
  data: T;
  /** Full AI generation metadata (usage, finishReason, warnings, etc.) */
  result?: AiGenerationMetadata;
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Execution trace */
  trace: TraceEntry[];
}

/**
 * Base Inngest step tools interface (simplified)
 * The runtime will inject the actual Inngest step implementation
 */
export interface InngestStepTools {
  run<T>(name: string, fn: () => Promise<T>): Promise<T>;
  sleep(name: string, duration: number | string): Promise<void>;
  waitForEvent(name: string, opts: { event: string; timeout: string }): Promise<unknown>;
}

/**
 * Extended step interface with custom workflow step methods
 */
export interface WorkflowStep<TPhaseId extends string = string> extends InngestStepTools {
  /**
   * Execute a workflow phase with automatic retry logic
   * @param id - Phase ID (typesafe when phases are defined in config)
   * @param fn - Phase function to execute
   * @param options - Phase configuration (description)
   */
  phase<T>(
    id: TPhaseId,
    fn: () => Promise<T>,
    options?: PhaseOptions
  ): Promise<T>;

  /**
   * Execute an AI agent
   * @param id - Step ID
   * @param config - Agent configuration (includes optional name field)
   * @param options - Step options (timeout, retries, etc.)
   */
  agent<T = string>(
    id: string,
    config: AgentStepConfig,
    options?: StepOptions
  ): Promise<AgentStepResult<T>>;

  /**
   * Execute a git commit operation
   * @param id - Step ID
   * @param config - Commit configuration
   * @param options - Step options (timeout)
   */
  git(
    id: string,
    config: GitCommitConfig,
    options?: StepOptions
  ): Promise<GitCommitResult>;

  /**
   * Execute a git branch operation
   * @param id - Step ID
   * @param config - Branch configuration
   * @param options - Step options (timeout)
   */
  git(
    id: string,
    config: GitBranchConfig,
    options?: StepOptions
  ): Promise<GitBranchResult>;

  /**
   * Execute a git pull request operation
   * @param id - Step ID
   * @param config - PR configuration
   * @param options - Step options (timeout)
   */
  git(
    id: string,
    config: GitPrConfig,
    options?: StepOptions
  ): Promise<GitPrResult>;

  /**
   * Execute a git commit-and-branch operation
   * @param id - Step ID
   * @param config - Commit-and-branch configuration
   * @param options - Step options (timeout)
   */
  git(
    id: string,
    config: GitCommitAndBranchConfig,
    options?: StepOptions
  ): Promise<GitCommitAndBranchResult>;

  /**
   * Execute a git operation (general overload)
   * @param id - Step ID
   * @param config - Git configuration
   * @param options - Step options (timeout)
   */
  git(
    id: string,
    config: GitStepConfig,
    options?: StepOptions
  ): Promise<GitStepResult>;

  /**
   * Execute a CLI command
   * @param id - Step ID
   * @param config - CLI configuration (includes command and optional name field)
   * @param options - Step options (timeout, retries, continueOnError)
   */
  cli(
    id: string,
    config: CliStepConfig,
    options?: StepOptions
  ): Promise<CliStepResult>;

  /**
   * Upload an artifact (file, directory, text, screenshot)
   * @param id - Step ID or display name (auto-converted to kebab-case ID)
   * @param config - Artifact configuration
   * @param options - Step options (timeout, continueOnError)
   */
  artifact(
    id: string,
    config: ArtifactStepConfig,
    options?: StepOptions
  ): Promise<ArtifactStepResult>;

  /**
   * Add a progress annotation/note to the workflow timeline
   * @param id - Unique step identifier
   * @param config - Annotation configuration (message)
   */
  annotation(id: string, config: AnnotationStepConfig): Promise<AnnotationStepResult>;

  /**
   * Generate AI text or structured output
   * @param id - Step ID
   * @param config - AI configuration (prompt, provider, schema, etc.)
   * @param options - Step options (timeout)
   */
  ai<T = { text: string }>(
    id: string,
    config: AiStepConfig,
    options?: StepOptions
  ): Promise<AiStepResult<T>>;

  /**
   * Log a message during workflow execution
   * @param args - Values to log (strings or objects)
   */
  log: {
    (...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
  };

  /**
   * Update workflow run metadata (e.g., pr_url)
   * Automatically broadcasts changes via WebSocket
   * @param data - Fields to update on the workflow run
   */
  updateRun: (data: { pr_url?: string }) => Promise<void>;
}
