import { PrismaClient, WorkflowStatus, Prisma } from "@prisma/client";
import { createTestUser } from "./user";
import { createTestProject } from "./project";
import { createTestWorkflowDefinition } from "./workflow-definition";

/**
 * Creates a test workflow run
 * @param prisma - Prisma client instance
 * @param overrides - Required project_id, user_id, workflow_definition_id, optional other fields
 * @returns Created workflow run
 */
export async function createTestWorkflowRun(
  prisma: PrismaClient,
  overrides: {
    project_id: string;
    user_id: string;
    workflow_definition_id: string;
    name?: string;
    args?: Record<string, unknown>;
    spec_file?: string;
    spec_content?: string;
    spec_type?: string;
    planning_session_id?: string;
    mode?: string;
    branch_name?: string;
    base_branch?: string;
    current_phase?: string;
    current_step_index?: number;
    status?: WorkflowStatus;
    error_message?: string;
    inngest_run_id?: string;
    started_at?: Date;
    completed_at?: Date;
    paused_at?: Date;
    cancelled_at?: Date;
  }
) {
  const {
    project_id,
    user_id,
    workflow_definition_id,
    name = "Test Workflow Run",
    args = {},
    spec_file,
    spec_content,
    spec_type,
    planning_session_id,
    mode,
    branch_name,
    base_branch,
    current_phase,
    current_step_index = 0,
    status = WorkflowStatus.pending,
    error_message,
    inngest_run_id,
    started_at,
    completed_at,
    paused_at,
    cancelled_at,
  } = overrides;

  const run = await prisma.workflowRun.create({
    data: {
      project_id,
      user_id,
      workflow_definition_id,
      name,
      args: args as Prisma.InputJsonValue,
      spec_file,
      spec_content,
      spec_type,
      planning_session_id,
      mode,
      branch_name,
      base_branch,
      current_phase,
      current_step_index,
      status,
      error_message,
      inngest_run_id,
      started_at,
      completed_at,
      paused_at,
      cancelled_at,
    },
  });

  return run;
}

/**
 * Creates a complete test workflow context (user, project, workflow definition, and run)
 * Convenience fixture for full setup in a single call
 * @param prisma - Prisma client instance
 * @param overrides - Optional overrides for any entity
 * @returns Object with user, project, workflow, and run
 */
export async function createTestWorkflowContext(
  prisma: PrismaClient,
  overrides?: {
    user?: Partial<{ email: string; password: string; is_active: boolean }>;
    project?: Partial<{ name: string; path: string; is_hidden: boolean; is_starred: boolean }>;
    workflow?: Partial<{
      identifier: string;
      name: string;
      description: string | null;
      type: string;
      path: string;
      phases: unknown;
      args_schema: unknown;
      is_template: boolean;
      status: string;
      file_exists: boolean;
      load_error: string | null;
    }>;
    run?: Partial<{
      name: string;
      args: Record<string, unknown>;
      spec_file: string;
      spec_content: string;
      spec_type: string;
      planning_session_id: string;
      mode: string;
      branch_name: string;
      base_branch: string;
      current_phase: string;
      current_step_index: number;
      status: WorkflowStatus;
      error_message: string;
      inngest_run_id: string;
      started_at: Date;
      completed_at: Date;
      paused_at: Date;
      cancelled_at: Date;
    }>;
  }
) {
  // Create user
  const user = await createTestUser(prisma, overrides?.user);

  // Create project
  const project = await createTestProject(prisma, overrides?.project);

  // Create workflow definition
  const workflow = await createTestWorkflowDefinition(
    prisma,
    project.id,
    overrides?.workflow
  );

  // Create workflow run
  const run = await createTestWorkflowRun(prisma, {
    project_id: project.id,
    user_id: user.id,
    workflow_definition_id: workflow.id,
    ...overrides?.run,
  });

  return { user, project, workflow, run };
}

/**
 * Workflow file templates for testing workflow loading
 */
export const WORKFLOW_FILE_TEMPLATES = {
  /**
   * Valid workflow with default export
   */
  validWorkflow: `import { defineWorkflow } from "agentcmd-workflows";

/**
 * Minimal valid workflow for testing
 */
export default defineWorkflow(
  {
    id: "test-valid-workflow",
    name: "Test Valid Workflow",
    description: "A minimal valid workflow for testing",
    phases: [],
  },
  async () => {
    // Empty workflow function for testing
  }
);
`,

  /**
   * Valid workflow with named export
   */
  namedExportWorkflow: `import { defineWorkflow } from "agentcmd-workflows";

/**
 * Valid workflow with named export for testing
 */
export const workflow = defineWorkflow(
  {
    id: "test-named-workflow",
    name: "Test Named Workflow",
    description: "A valid workflow with named export",
    phases: [],
  },
  async () => {
    // Empty workflow function for testing
  }
);
`,

  /**
   * Invalid workflow (not a proper workflow definition)
   */
  invalidWorkflow: `/**
 * Invalid workflow for testing - not a proper workflow definition
 */
export default {
  id: "test-invalid-workflow",
  name: "Test Invalid Workflow",
  // Missing __type and createInngestFunction
};
`,

  /**
   * Workflow that throws an error on import
   */
  errorWorkflow: `/**
 * Workflow that throws an error on import for testing
 */

throw new Error("Test import error - this workflow cannot be loaded");
`,
};
