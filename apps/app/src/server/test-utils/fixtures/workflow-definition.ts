import { PrismaClient, WorkflowScope, Prisma } from "@prisma/client";

/**
 * Creates a test workflow definition
 * @param prisma - Prisma client instance
 * @param overrides - Optional fields to override defaults
 * @returns Created workflow definition
 */
export async function createTestWorkflowDefinition(
  prisma: PrismaClient,
  overrides?: Partial<{
    scope: WorkflowScope;
    project_id: string;
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
  }>
) {
  const scope = overrides?.scope || WorkflowScope.project;
  const identifier = overrides?.identifier || `test-workflow-${Date.now()}`;
  const name = overrides?.name || "Test Workflow";
  const description = overrides?.description ?? "Test workflow description";
  const type = overrides?.type || "code";
  const path = overrides?.path || `/tmp/test-workflow-${Date.now()}.ts`;
  const phases = overrides?.phases || ["setup", "execute", "cleanup"];
  const args_schema = overrides?.args_schema ?? null;
  const is_template = overrides?.is_template ?? true;
  const status = overrides?.status || "active";
  const file_exists = overrides?.file_exists ?? true;
  const load_error = overrides?.load_error ?? null;

  // project_id is required for project-scoped workflows
  const project_id = overrides?.project_id || null;

  const definition = await prisma.workflowDefinition.create({
    data: {
      scope,
      project_id,
      identifier,
      name,
      description,
      type,
      path,
      phases,
      args_schema: args_schema as Prisma.InputJsonValue,
      is_template,
      status,
      file_exists,
      load_error,
    },
  });

  return definition;
}

/**
 * Creates a test global workflow definition
 * @param prisma - Prisma client instance
 * @param overrides - Optional fields to override defaults
 * @returns Created global workflow definition
 */
export async function createTestGlobalWorkflowDefinition(
  prisma: PrismaClient,
  overrides?: Partial<{
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
  }>
) {
  return createTestWorkflowDefinition(prisma, {
    ...overrides,
    scope: WorkflowScope.global,
    project_id: undefined,
  });
}
