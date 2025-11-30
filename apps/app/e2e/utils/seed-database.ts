import type { PrismaClient } from "@prisma/client";

/**
 * Database Seeding Utilities
 *
 * Provides helper functions to seed test data:
 * - seedUser: Create user with hashed password
 * - seedProject: Create project for user
 * - seedSession: Create session for project
 * - seedMessage: Create message in session
 */

export interface SeedUserOptions {
  email: string;
  password?: string;
}

export interface SeedProjectOptions {
  name: string;
  /** Optional custom path (auto-generated with .agentcmd-e2e-test- prefix if not provided) */
  path?: string;
}

export interface SeedSessionOptions {
  projectId: string;
  userId: string;
  name: string;
  state?: "idle" | "working" | "error";
}


/**
 * Seed a user in the database
 * Note: E2E tests typically use authenticated-page fixture instead
 */
export async function seedUser(
  prisma: PrismaClient,
  options: SeedUserOptions
) {
  const bcrypt = await import("bcryptjs");
  const password_hash = await bcrypt.hash(options.password || "testpass123", 12);

  return prisma.user.create({
    data: {
      email: options.email,
      password_hash,
      last_login: new Date(),
    },
  });
}

/**
 * E2E test project path prefix
 * Used to filter out E2E projects from sync operations (like worktrees)
 * Format: /tmp/.agentcmd-e2e-test-{name}-{timestamp}-{random}
 */
export const E2E_PROJECT_PATH_PREFIX = "/tmp/.agentcmd-e2e-test-";

/**
 * Seed a project in the database
 * Uses standardized /tmp/.agentcmd-e2e-test- prefix for easy filtering from sync
 */
export async function seedProject(
  prisma: PrismaClient,
  options: SeedProjectOptions
) {
  // Generate unique path with standardized E2E prefix
  // This allows sync operations to filter out E2E projects (similar to worktrees)
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const safeName = options.name.toLowerCase().replace(/\s+/g, "-");
  const uniquePath = `${E2E_PROJECT_PATH_PREFIX}${safeName}-${uniqueSuffix}`;

  return prisma.project.create({
    data: {
      name: options.name,
      path: uniquePath,
    },
  });
}

/**
 * Check if a path is an E2E test project path
 */
export function isE2ETestProject(path: string): boolean {
  return path.startsWith(E2E_PROJECT_PATH_PREFIX);
}

/**
 * Seed a session in the database
 */
export async function seedSession(
  prisma: PrismaClient,
  options: SeedSessionOptions
) {
  return prisma.agentSession.create({
    data: {
      name: options.name,
      state: options.state || "idle",
      user_id: options.userId,
      project_id: options.projectId,
      metadata: {},
    },
  });
}

/**
 * Cleanup all test data for a user
 * Deletes in order: sessions -> projects -> user
 */
export async function cleanupUserData(prisma: PrismaClient, userId: string) {
  // Delete user's sessions
  await prisma.agentSession.deleteMany({
    where: { user_id: userId },
  });

  // Delete user's projects (cascade deletes workflow definitions, runs, etc.)
  await prisma.project.deleteMany({
    where: { id: { in: [] } }, // Projects don't have user_id, so manual deletion not needed
  });

  // Delete user
  await prisma.user.delete({
    where: { id: userId },
  });
}

// ========================================
// NEW: Enhanced Test Fixtures
// ========================================

export interface SeedTestProjectOptions {
  name?: string;
  /** Whether to copy the fixture template (default: true) */
  copyFixture?: boolean;
}

export interface SeedTestProjectResult {
  project: Awaited<ReturnType<typeof seedProject>>;
  projectPath: string;
}

export interface SeedWorkflowDefinitionOptions {
  projectId: string;
  identifier: string;
  name: string;
  description?: string;
  phases?: Array<{ id: string; label: string }>;
  path?: string;
}

export interface SeedSpecFileOptions {
  projectPath: string;
  title?: string;
  description?: string;
}

export interface SeedSpecFileResult {
  specFile: string;
  specContent: string;
}

/**
 * Seed a test project with optional fixture template copy
 *
 * Copies fixture template from apps/app/e2e/fixtures/test-project/ to /tmp/e2e-test-project-{timestamp}
 * Creates project in database with generated path
 */
export async function seedTestProject(
  prisma: PrismaClient,
  options: SeedTestProjectOptions = {}
): Promise<SeedTestProjectResult> {
  const { name = "E2E Test Project", copyFixture = true } = options;

  // Generate unique project path
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const projectPath = `/tmp/e2e-test-project-${timestamp}-${random}`;

  if (copyFixture) {
    // Copy fixture template to temp directory
    const { cpSync, mkdirSync } = await import("node:fs");
    const { join } = await import("node:path");

    const fixtureSourcePath = join(
      process.cwd(),
      "e2e/fixtures/test-project"
    );

    // Create parent directory if needed
    mkdirSync(projectPath, { recursive: true });

    // Copy all files from fixture to temp directory
    cpSync(fixtureSourcePath, projectPath, { recursive: true });
  }

  // Create project in database
  const project = await prisma.project.create({
    data: {
      name,
      path: projectPath,
    },
  });

  return { project, projectPath };
}

/**
 * Seed a workflow definition in the database
 * Note: The workflow file must exist in the project directory
 */
export async function seedWorkflowDefinition(
  prisma: PrismaClient,
  options: SeedWorkflowDefinitionOptions
) {
  const {
    projectId,
    identifier,
    name,
    description = null,
    phases = [
      { id: "setup", label: "Setup" },
      { id: "execute", label: "Execute" },
      { id: "complete", label: "Complete" },
    ],
    path = `.agent/workflows/definitions/${identifier}.ts`,
  } = options;

  return prisma.workflowDefinition.create({
    data: {
      project_id: projectId,
      identifier,
      name,
      description,
      type: "code",
      path,
      phases,
      file_exists: true,
      status: "active",
    },
  });
}

/**
 * Create a minimal spec file in project directory
 * Returns spec file path relative to project root and content
 */
export async function seedSpecFile(
  projectPath: string,
  options: SeedSpecFileOptions = {}
): Promise<SeedSpecFileResult> {
  const {
    title = "E2E Test Spec",
    description = "Test spec for E2E workflow execution",
  } = options;

  const { mkdirSync, writeFileSync } = await import("node:fs");
  const { join } = await import("node:path");

  // Generate timestamp-based spec folder
  const timestamp = Date.now().toString().substring(4); // Remove first 4 digits to match spec format
  const specFolder = `${timestamp}-e2e-test`;
  const specDir = join(projectPath, ".agent/specs/todo", specFolder);

  // Create spec directory
  mkdirSync(specDir, { recursive: true });

  // Create minimal spec.md
  const specContent = `# ${title}

${description}

**Status**: draft
**Created**: ${new Date().toISOString().split("T")[0]}
`;

  const specFilePath = join(specDir, "spec.md");
  writeFileSync(specFilePath, specContent, "utf-8");

  // Return relative path from project root
  const specFile = `todo/${specFolder}/spec.md`;

  return {
    specFile,
    specContent,
  };
}

/**
 * Create a file change in project for git testing
 */
export async function seedFileChange(
  projectPath: string,
  filename: string,
  content: string
): Promise<void> {
  const { writeFileSync, mkdirSync } = await import("node:fs");
  const { join, dirname } = await import("node:path");

  const filePath = join(projectPath, filename);

  // Create parent directory if needed
  mkdirSync(dirname(filePath), { recursive: true });

  // Write file content
  writeFileSync(filePath, content, "utf-8");
}
