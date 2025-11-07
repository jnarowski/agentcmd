import type { FastifyBaseLogger } from "fastify";
import type { WorkflowConfig, PhaseDefinition } from "@repo/workflow-sdk";

/**
 * Runtime context passed to all workflow step implementations
 */
export interface RuntimeContext<
  TPhases extends readonly PhaseDefinition[] | undefined = readonly PhaseDefinition[] | undefined
> {
  /** Workflow execution ID */
  runId: string;
  /** Project ID */
  projectId: string;
  /** User ID who triggered the workflow */
  userId: string;
  /** Current phase name (tracked for nested steps) */
  currentPhase: string | null;
  /** Fastify logger instance */
  logger: FastifyBaseLogger;
  /** Project filesystem path */
  projectPath: string;
  /** Workflow configuration (for phase validation) */
  config: WorkflowConfig<TPhases>;
}
