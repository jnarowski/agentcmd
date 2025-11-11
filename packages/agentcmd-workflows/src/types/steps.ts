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
  /** Enable JSON mode - automatically extract and parse JSON from response */
  json?: boolean;
}

/**
 * Result from agent execution
 */
export interface AgentStepResult<T = string> {
  /** Agent session ID */
  sessionId: string;
  /** Success status */
  success: boolean;
  /** Exit code from agent execution */
  exitCode: number;
  /** Output or error message */
  message?: string;
  /** Agent output content */
  output?: string;
  /** Number of steps executed */
  steps?: number;
  /** Extracted data (JSON object when json: true, otherwise string output) */
  data?: T;
}

/**
 * Configuration for git operation step
 */
export interface GitStepConfig {
  /** Display name for the step (defaults to step ID) */
  name?: string;
  /** Git operation type */
  operation: "commit" | "branch" | "pr" | "commit-and-branch";
  /** Commit message (for commit operation) */
  message?: string;
  /** Commit message (for commit-and-branch operation, defaults to "WIP: Auto-commit before branching") */
  commitMessage?: string;
  /** Branch name (for branch/pr/commit-and-branch operation) */
  branch?: string;
  /** Base branch for PR or branch creation (default: main) */
  baseBranch?: string;
  /** PR title */
  title?: string;
  /** PR body/description */
  body?: string;
  /** Auto-commit staged changes before operation */
  autoCommit?: boolean;
}

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
 * Result from git operation
 */
export interface GitStepResult {
  /** Operation that was performed */
  operation: "commit" | "branch" | "pr" | "commit-and-branch";
  /** Commit SHA */
  commitSha?: string;
  /** Branch name */
  branch?: string;
  /** PR number */
  prNumber?: number;
  /** PR URL */
  prUrl?: string;
  /** Whether there were uncommitted changes (commit-and-branch only) */
  hadUncommittedChanges?: boolean;
  /** Whether already on target branch (commit-and-branch only) */
  alreadyOnBranch?: boolean;
  /** Success status */
  success: boolean;
}

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
  /** Command that was executed */
  command: string;
  /** Exit code */
  exitCode: number;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Success status (exitCode === 0) */
  success: boolean;
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
  /** Number of artifacts uploaded */
  count: number;
  /** Artifact IDs */
  artifactIds: string[];
  /** Total size in bytes */
  totalSize: number;
}

/**
 * Configuration for annotation step
 */
export interface AnnotationStepConfig {
  /** Annotation message */
  message: string;
}

/**
 * Configuration for AI text/structured generation step
 */
export interface AiStepConfig<TSchema = unknown> {
  /** Prompt for the AI model */
  prompt: string;
  /** AI provider: anthropic or openai */
  provider?: "anthropic" | "openai";
  /** Model ID (defaults: anthropic → claude-sonnet-4-5-20250929, openai → gpt-4) */
  model?: string;
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
   * Execute a git operation
   * @param id - Step ID
   * @param config - Git configuration (includes optional name field)
   * @param options - Step options (timeout, continueOnError)
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
  annotation(id: string, config: AnnotationStepConfig): Promise<void>;

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
}
