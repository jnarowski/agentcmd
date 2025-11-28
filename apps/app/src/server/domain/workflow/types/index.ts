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
 *
 * Note: baseUrl and isDev are controlled via environment variables:
 * - INNGEST_BASE_URL=http://localhost:8288
 * - INNGEST_DEV=0
 * These are set by setInngestEnvironment() before SDK imports
 */
export interface WorkflowEngineConfig {
  /** Application ID for Inngest */
  appId: string;
  /** Event key for sending events to Inngest server */
  eventKey?: string;
  /** Path to SQLite memoization database */
  memoizationDbPath: string;
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
