import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { createTestProject } from "@/server/test-utils/fixtures/project";
import { scanProjectWorkflows } from "./scanProjectWorkflows";
import * as loadProjectWorkflowsModule from "./loadProjectWorkflows";
import type { WorkflowRuntime } from "agentcmd-workflows";
import type { FastifyBaseLogger } from "fastify";

// Mock loadProjectWorkflows to control workflow loading behavior
vi.mock("./loadProjectWorkflows", () => ({
  loadProjectWorkflows: vi.fn(),
}));

describe("scanProjectWorkflows", () => {
  let mockRuntime: WorkflowRuntime;
  let mockLogger: FastifyBaseLogger;

  beforeEach(async () => {
    await cleanTestDB(prisma);

    // Create minimal mock runtime
    mockRuntime = {} as WorkflowRuntime;

    // Create minimal mock logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as FastifyBaseLogger;

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
  });

  describe("workflow discovery and sync", () => {
    it("creates database records for newly discovered workflows", async () => {
      // Arrange: Create test project
      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test-project",
      });

      // Mock loadProjectWorkflows to return a valid workflow
      const mockLoadProjectWorkflows = vi.mocked(
        loadProjectWorkflowsModule.loadProjectWorkflows
      );
      mockLoadProjectWorkflows.mockResolvedValue({
        workflows: [
          {
            definition: {
              config: {
                id: "test-workflow",
                name: "Test Workflow",
                description: "A test workflow",
                phases: [],
              },
              __type: "workflow" as const,
              createInngestFunction: vi.fn(),
            },
            inngestFunction: {} as never,
            filePath: "/tmp/test-project/.agent/workflows/definitions/test.ts",
          },
        ],
        errors: [],
        cleanup: vi.fn(),
      });

      // Act: Scan project workflows
      const count = await scanProjectWorkflows(
        project.id,
        project.path,
        mockRuntime,
        mockLogger
      );

      // Assert: One workflow discovered
      expect(count).toBe(1);

      // Assert: Database record created with correct metadata
      const definitions = await prisma.workflowDefinition.findMany({
        where: { project_id: project.id },
      });

      expect(definitions).toHaveLength(1);
      expect(definitions[0]).toMatchObject({
        project_id: project.id,
        identifier: "test-workflow",
        name: "Test Workflow",
        description: "A test workflow",
        type: "code",
        path: "/tmp/test-project/.agent/workflows/definitions/test.ts",
        status: "active",
        file_exists: true,
        load_error: null,
      });
    });

    it("updates existing workflow definitions on rescan", async () => {
      // Arrange: Create test project
      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test-project",
      });

      // Create existing workflow definition
      await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "test-workflow",
          name: "Old Name",
          description: "Old description",
          type: "code",
          path: "/tmp/old-path/test.ts",
          phases: [],
          status: "active",
          file_exists: true,
        },
      });

      // Mock loadProjectWorkflows to return updated workflow
      const mockLoadProjectWorkflows = vi.mocked(
        loadProjectWorkflowsModule.loadProjectWorkflows
      );
      mockLoadProjectWorkflows.mockResolvedValue({
        workflows: [
          {
            definition: {
              config: {
                id: "test-workflow",
                name: "Updated Name",
                description: "Updated description",
                phases: [{ id: "phase1" }],
              },
              __type: "workflow" as const,
              createInngestFunction: vi.fn(),
            },
            inngestFunction: {} as never,
            filePath: "/tmp/new-path/test.ts",
          },
        ],
        errors: [],
        cleanup: vi.fn(),
      });

      // Act: Rescan project
      await scanProjectWorkflows(
        project.id,
        project.path,
        mockRuntime,
        mockLogger
      );

      // Assert: Definition updated with new metadata
      const definitions = await prisma.workflowDefinition.findMany({
        where: { project_id: project.id },
      });

      expect(definitions).toHaveLength(1);
      expect(definitions[0]).toMatchObject({
        identifier: "test-workflow",
        name: "Updated Name",
        description: "Updated description",
        path: "/tmp/new-path/test.ts",
        phases: [{ id: "phase1" }],
        status: "active",
        file_exists: true,
      });
    });

    it("reactivates archived workflows when file reappears", async () => {
      // Arrange: Create test project
      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test-project",
      });

      // Create archived workflow definition
      const archivedAt = new Date();
      await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: "/tmp/test-project/.agent/workflows/definitions/test.ts",
          phases: [],
          status: "archived",
          file_exists: false,
          archived_at: archivedAt,
        },
      });

      // Mock loadProjectWorkflows to return the workflow (file reappeared)
      const mockLoadProjectWorkflows = vi.mocked(
        loadProjectWorkflowsModule.loadProjectWorkflows
      );
      mockLoadProjectWorkflows.mockResolvedValue({
        workflows: [
          {
            definition: {
              config: {
                id: "test-workflow",
                name: "Test Workflow",
                phases: [],
              },
              __type: "workflow" as const,
              createInngestFunction: vi.fn(),
            },
            inngestFunction: {} as never,
            filePath: "/tmp/test-project/.agent/workflows/definitions/test.ts",
          },
        ],
        errors: [],
        cleanup: vi.fn(),
      });

      // Act: Rescan project
      await scanProjectWorkflows(
        project.id,
        project.path,
        mockRuntime,
        mockLogger
      );

      // Assert: Workflow reactivated
      const definitions = await prisma.workflowDefinition.findMany({
        where: { project_id: project.id },
      });

      expect(definitions).toHaveLength(1);
      expect(definitions[0]).toMatchObject({
        identifier: "test-workflow",
        status: "active",
        file_exists: true,
        archived_at: null,
      });

      // Assert: Logger shows reactivation
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: project.id,
          workflowId: "test-workflow",
        }),
        expect.stringContaining("reactivated")
      );
    });

    it("marks missing workflow definitions when files deleted", async () => {
      // Arrange: Create test project
      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test-project",
      });

      // Create existing workflow definitions
      await prisma.workflowDefinition.createMany({
        data: [
          {
            project_id: project.id,
            identifier: "workflow-1",
            name: "Workflow 1",
            type: "code",
            path: "/tmp/test-project/.agent/workflows/definitions/w1.ts",
            phases: [],
            status: "active",
            file_exists: true,
          },
          {
            project_id: project.id,
            identifier: "workflow-2",
            name: "Workflow 2",
            type: "code",
            path: "/tmp/test-project/.agent/workflows/definitions/w2.ts",
            phases: [],
            status: "active",
            file_exists: true,
          },
        ],
      });

      // Mock loadProjectWorkflows to return only workflow-1 (workflow-2 deleted)
      const mockLoadProjectWorkflows = vi.mocked(
        loadProjectWorkflowsModule.loadProjectWorkflows
      );
      mockLoadProjectWorkflows.mockResolvedValue({
        workflows: [
          {
            definition: {
              config: {
                id: "workflow-1",
                name: "Workflow 1",
                phases: [],
              },
              __type: "workflow" as const,
              createInngestFunction: vi.fn(),
            },
            inngestFunction: {} as never,
            filePath: "/tmp/test-project/.agent/workflows/definitions/w1.ts",
          },
        ],
        errors: [],
        cleanup: vi.fn(),
      });

      // Act: Rescan project
      await scanProjectWorkflows(
        project.id,
        project.path,
        mockRuntime,
        mockLogger
      );

      // Assert: workflow-1 still active, workflow-2 marked missing
      const definitions = await prisma.workflowDefinition.findMany({
        where: { project_id: project.id },
        orderBy: { identifier: "asc" },
      });

      expect(definitions).toHaveLength(2);

      // workflow-1 should remain active
      expect(definitions[0]).toMatchObject({
        identifier: "workflow-1",
        status: "active",
        file_exists: true,
        archived_at: null,
      });

      // workflow-2 should be marked as missing
      expect(definitions[1]).toMatchObject({
        identifier: "workflow-2",
        file_exists: false,
      });
      expect(definitions[1].archived_at).toBeInstanceOf(Date);

      // Assert: Logger warned about missing file
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: project.id,
          workflowId: "workflow-2",
        }),
        expect.stringContaining("file missing")
      );
    });
  });

  describe("error handling", () => {
    it("persists load errors for workflows with missing required fields", async () => {
      // Arrange: Create test project
      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test-project",
      });

      // Mock loadProjectWorkflows to return workflow missing 'id' field
      const mockLoadProjectWorkflows = vi.mocked(
        loadProjectWorkflowsModule.loadProjectWorkflows
      );
      mockLoadProjectWorkflows.mockResolvedValue({
        workflows: [
          {
            definition: {
              config: {
                // Missing 'id' field
                name: "Invalid Workflow",
                phases: [],
              } as { id: string },
              __type: "workflow" as const,
              createInngestFunction: vi.fn(),
            },
            inngestFunction: {} as never,
            filePath: "/tmp/test-project/.agent/workflows/definitions/invalid.ts",
          },
        ],
        errors: [],
        cleanup: vi.fn(),
      });

      // Act: Scan project
      await scanProjectWorkflows(
        project.id,
        project.path,
        mockRuntime,
        mockLogger
      );

      // Assert: No definitions created (workflow skipped)
      const definitions = await prisma.workflowDefinition.findMany({
        where: { project_id: project.id, load_error: null },
      });
      expect(definitions).toHaveLength(0);

      // Assert: Logger warned about missing id
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: project.id,
        }),
        expect.stringContaining("missing required 'id' field")
      );
    });

    it("creates placeholder definitions for workflow files that fail to load", async () => {
      // Arrange: Create test project
      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test-project",
      });

      // Mock loadProjectWorkflows to return load error
      const mockLoadProjectWorkflows = vi.mocked(
        loadProjectWorkflowsModule.loadProjectWorkflows
      );
      mockLoadProjectWorkflows.mockResolvedValue({
        workflows: [],
        errors: [
          {
            filePath: "/tmp/test-project/.agent/workflows/definitions/broken.ts",
            error: "SyntaxError: Unexpected token",
          },
        ],
        cleanup: vi.fn(),
      });

      // Act: Scan project
      await scanProjectWorkflows(
        project.id,
        project.path,
        mockRuntime,
        mockLogger
      );

      // Assert: Placeholder definition created
      const definitions = await prisma.workflowDefinition.findMany({
        where: { project_id: project.id },
      });

      expect(definitions).toHaveLength(1);
      expect(definitions[0]).toMatchObject({
        identifier: "error-broken",
        name: "[ERROR] broken.ts",
        type: "code",
        path: "/tmp/test-project/.agent/workflows/definitions/broken.ts",
        status: "active",
        file_exists: true,
        load_error: "SyntaxError: Unexpected token",
      });

      // Assert: Logger warned about error
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: project.id,
          error: "SyntaxError: Unexpected token",
        }),
        expect.stringContaining("placeholder definition")
      );
    });

    it("updates existing definitions with new load errors", async () => {
      // Arrange: Create test project
      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test-project",
      });

      // Create existing workflow definition
      const existingDef = await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: "/tmp/test-project/.agent/workflows/definitions/test.ts",
          phases: [],
          status: "active",
          file_exists: true,
          load_error: null,
        },
      });

      // Mock loadProjectWorkflows to return load error for existing file
      const mockLoadProjectWorkflows = vi.mocked(
        loadProjectWorkflowsModule.loadProjectWorkflows
      );
      mockLoadProjectWorkflows.mockResolvedValue({
        workflows: [],
        errors: [
          {
            filePath: "/tmp/test-project/.agent/workflows/definitions/test.ts",
            error: "Error: Something broke",
          },
        ],
        cleanup: vi.fn(),
      });

      // Act: Rescan project
      await scanProjectWorkflows(
        project.id,
        project.path,
        mockRuntime,
        mockLogger
      );

      // Assert: Existing definition updated with error
      const updated = await prisma.workflowDefinition.findUnique({
        where: { id: existingDef.id },
      });

      expect(updated).toMatchObject({
        id: existingDef.id,
        identifier: "test-workflow",
        load_error: "Error: Something broke",
        file_exists: true,
      });

      // Assert: Logger warned about error
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: project.id,
          workflowId: "test-workflow",
          error: "Error: Something broke",
        }),
        expect.stringContaining("failed to load")
      );
    });
  });
});
