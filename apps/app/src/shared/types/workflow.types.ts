/**
 * Workflow-related type definitions
 */

/**
 * Inngest step data returned from Inngest API
 */
export interface InngestStepData {
  /** Inngest step ID */
  id: string;
  /** Step name */
  name: string;
  /** Step status (completed, failed, running, etc.) */
  status: string;
  /** Step start time */
  started_at: string | null;
  /** Step completion time */
  completed_at: string | null;
  /** Step duration in milliseconds */
  duration: number | null;
  /** Step output data (JSON) */
  output?: unknown;
  /** Error message if step failed */
  error?: string;
}

/**
 * Log chunk event emitted during step execution
 */
export interface LogChunkEvent {
  /** Log chunk content */
  chunk: string;
  /** Timestamp when chunk was generated */
  timestamp: Date;
  /** Run ID */
  runId: string;
  /** Step ID */
  stepId: string;
}
