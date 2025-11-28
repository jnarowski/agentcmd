// Barrel export for workflow types
export * from "./workflow.types";
export * from "./artifact.types";
export * from "./event.types";
export * from "./engine.types";

// Service options types
export * from "./GetWorkflowRunByIdOptions";
export * from "./ExecuteWorkflowOptions";
export * from "./PauseWorkflowOptions";
export * from "./ResumeWorkflowOptions";
export * from "./CancelWorkflowOptions";
export * from "./UpdateWorkflowRunOptions";
export * from "./DetachArtifactFromWorkflowEventOptions";

// Workflow definition CRUD options (gold standard)
export * from "./GetWorkflowDefinitionOptions";
export * from "./GetWorkflowDefinitionByOptions";
export * from "./GetWorkflowDefinitionsOptions";
export * from "./CreateWorkflowDefinitionOptions";
export * from "./UpdateWorkflowDefinitionOptions";
export * from "./UpsertWorkflowDefinitionOptions";
export * from "./DeleteWorkflowDefinitionOptions";

/**
 * Configuration for workflow engine
 */
export interface WorkflowEngineConfig {
  /** Application ID for Inngest */
  appId: string;
  /** Event key for webhook authentication (optional in dev) */
  eventKey?: string;
  /** Enable development mode */
  isDev: boolean;
  /** Path to SQLite memoization database */
  memoizationDbPath: string;
  /** Inngest base URL (for local inngest start) */
  baseURL?: string;
}

/**
 * Scan result for workflow discovery
 */
export interface ScanResult {
  /** Number of projects scanned */
  scanned: number;
  /** Number of workflows discovered */
  discovered: number;
  /** Errors encountered during scanning */
  errors: Array<{ projectId: string; error: string }>;
}
