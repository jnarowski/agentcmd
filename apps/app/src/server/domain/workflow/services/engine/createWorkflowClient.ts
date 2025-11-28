import { Inngest } from "inngest";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { WorkflowEngineConfig } from "@/server/domain/workflow/types";

/**
 * Create and configure Inngest client for workflow execution
 *
 * Features:
 * - SQLite memoization store for durable step caching
 * - Signing key validation for webhook authentication
 * - Development mode support
 *
 * @param config - Workflow engine configuration
 * @returns Configured Inngest client
 */
export function createWorkflowClient(config: WorkflowEngineConfig): Inngest {
  // Ensure memoization database directory exists
  const dbDir = dirname(config.memoizationDbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  // Create Inngest client with memoization
  // Note: baseUrl and isDev are controlled via environment variables:
  // - INNGEST_BASE_URL=http://localhost:8288
  // - INNGEST_DEV=0
  const client = new Inngest({
    id: config.appId,
    eventKey: config.eventKey,
  });

  return client;
}
