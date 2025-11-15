import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { createTestProject } from "@/server/test-utils/fixtures/project";
import { loadWorkflows } from "./loadWorkflows";
import * as scanAllProjectWorkflowsModule from "./scanAllProjectWorkflows";
import * as loadProjectWorkflowsModule from "./loadProjectWorkflows";
import type { FastifyInstance } from "fastify";
import type { FastifyBaseLogger } from "fastify";

// Mock the dependencies
vi.mock("./scanAllProjectWorkflows", () => ({
  scanAllProjectWorkflows: vi.fn(),
}));

vi.mock("./loadProjectWorkflows", () => ({
  loadProjectWorkflows: vi.fn(),
}));

describe("loadWorkflows", () => {
  let mockFastify: FastifyInstance;
  let mockLogger: FastifyBaseLogger;

  beforeEach(async () => {
    await cleanTestDB(prisma);

    // Create mock logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as FastifyBaseLogger;

    // Create mock Fastify instance with workflowClient
    mockFastify = {
      log: mockLogger,
      workflowClient: {
        id: "test-client",
      },
    } as unknown as FastifyInstance;

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
  });

  describe("workflow loading and registration", () => {
    it("returns Inngest functions for active workflow definitions with matching files", async () => {
      // Arrange: Create test projects with workflow definitions
      const project1 = await createTestProject(prisma, {
        name: "Project 1",
        path: "/tmp/project-1",
      });

      await prisma.workflowDefinition.createMany({
        data: [
          {
            project_id: project1.id,
            identifier: "workflow-1",
            name: "Workflow 1",
            type: "code",
            path: "/tmp/project-1/.agent/workflows/definitions/w1.ts",
            phases: [],
            status: "active",
            file_exists: true,
          },
          {
            project_id: project1.id,
            identifier: "workflow-2",
            name: "Workflow 2",
            type: "code",
            path: "/tmp/project-1/.agent/workflows/definitions/w2.ts",
            phases: [],
            status: "active",
            file_exists: true,
          },
        ],
      });

      // Mock scanAllProjectWorkflows (already did its job)
      const mockScanAll = vi.mocked(
        scanAllProjectWorkflowsModule.scanAllProjectWorkflows
      );
      mockScanAll.mockResolvedValue(undefined);

      // Mock loadProjectWorkflows to return matching workflows
      const mockLoadProject = vi.mocked(
        loadProjectWorkflowsModule.loadProjectWorkflows
      );
      mockLoadProject.mockResolvedValue({
        workflows: [
          {
            definition: {
              config: { id: "workflow-1", name: "Workflow 1" },
              __type: "workflow" as const,
              createInngestFunction: vi.fn(),
            },
            inngestFunction: { id: "func-1" } as never,
            filePath: "/tmp/project-1/.agent/workflows/definitions/w1.ts",
          },
          {
            definition: {
              config: { id: "workflow-2", name: "Workflow 2" },
              __type: "workflow" as const,
              createInngestFunction: vi.fn(),
            },
            inngestFunction: { id: "func-2" } as never,
            filePath: "/tmp/project-1/.agent/workflows/definitions/w2.ts",
          },
        ],
        errors: [],
        cleanup: vi.fn(),
      });

      // Act
      const result = await loadWorkflows(mockFastify);

      // Assert: Both workflows registered as Inngest functions
      expect(result.functions).toHaveLength(2);
      expect(result.functions[0]).toEqual({ id: "func-1" });
      expect(result.functions[1]).toEqual({ id: "func-2" });
      expect(result.stats.total).toBe(2);

      // Assert: Logged registration
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: "workflow-1",
          projectId: project1.id,
        }),
        expect.stringContaining("Registered")
      );
    });

    it("archives workflow definitions when matching files no longer exist", async () => {
      // Arrange: Create test project with workflow definitions
      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test-project",
      });

      const def1 = await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "workflow-1",
          name: "Workflow 1",
          type: "code",
          path: "/tmp/test-project/.agent/workflows/definitions/w1.ts",
          phases: [],
          status: "active",
          file_exists: true,
        },
      });

      const def2 = await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "workflow-2",
          name: "Workflow 2",
          type: "code",
          path: "/tmp/test-project/.agent/workflows/definitions/w2.ts",
          phases: [],
          status: "active",
          file_exists: true,
        },
      });

      // Mock scanAllProjectWorkflows
      const mockScanAll = vi.mocked(
        scanAllProjectWorkflowsModule.scanAllProjectWorkflows
      );
      mockScanAll.mockResolvedValue(undefined);

      // Mock loadProjectWorkflows to return only workflow-1 (workflow-2 missing)
      const mockLoadProject = vi.mocked(
        loadProjectWorkflowsModule.loadProjectWorkflows
      );
      mockLoadProject.mockResolvedValue({
        workflows: [
          {
            definition: {
              config: { id: "workflow-1", name: "Workflow 1" },
              __type: "workflow" as const,
              createInngestFunction: vi.fn(),
            },
            inngestFunction: { id: "func-1" } as never,
            filePath: "/tmp/test-project/.agent/workflows/definitions/w1.ts",
          },
        ],
        errors: [],
        cleanup: vi.fn(),
      });

      // Act
      const result = await loadWorkflows(mockFastify);

      // Assert: Only workflow-1 registered
      expect(result.functions).toHaveLength(1);
      expect(result.functions[0]).toEqual({ id: "func-1" });

      // Assert: workflow-2 archived
      const updatedDef2 = await prisma.workflowDefinition.findUnique({
        where: { id: def2.id },
      });

      expect(updatedDef2).toMatchObject({
        status: "archived",
        file_exists: false,
      });
      expect(updatedDef2?.load_error).toContain("no longer exports");
      expect(updatedDef2?.archived_at).toBeInstanceOf(Date);

      // Assert: workflow-1 still active
      const updatedDef1 = await prisma.workflowDefinition.findUnique({
        where: { id: def1.id },
      });
      expect(updatedDef1?.status).toBe("active");
    });

    it("loads workflows from multiple projects correctly", async () => {
      // Arrange: Create two projects with workflows
      const project1 = await createTestProject(prisma, {
        name: "Project 1",
        path: "/tmp/project-1",
      });

      const project2 = await createTestProject(prisma, {
        name: "Project 2",
        path: "/tmp/project-2",
      });

      await prisma.workflowDefinition.createMany({
        data: [
          {
            project_id: project1.id,
            identifier: "p1-workflow",
            name: "P1 Workflow",
            type: "code",
            path: "/tmp/project-1/.agent/workflows/definitions/w.ts",
            phases: [],
            status: "active",
            file_exists: true,
          },
          {
            project_id: project2.id,
            identifier: "p2-workflow",
            name: "P2 Workflow",
            type: "code",
            path: "/tmp/project-2/.agent/workflows/definitions/w.ts",
            phases: [],
            status: "active",
            file_exists: true,
          },
        ],
      });

      // Mock scanAllProjectWorkflows
      const mockScanAll = vi.mocked(
        scanAllProjectWorkflowsModule.scanAllProjectWorkflows
      );
      mockScanAll.mockResolvedValue(undefined);

      // Mock loadProjectWorkflows to return different workflows for each project
      const mockLoadProject = vi.mocked(
        loadProjectWorkflowsModule.loadProjectWorkflows
      );

      // Return different results based on project path
      mockLoadProject.mockImplementation(async (projectPath) => {
        if (projectPath === "/tmp/project-1") {
          return {
            workflows: [
              {
                definition: {
                  config: { id: "p1-workflow", name: "P1 Workflow" },
                  __type: "workflow" as const,
                  createInngestFunction: vi.fn(),
                },
                inngestFunction: { id: "func-p1" } as never,
                filePath: "/tmp/project-1/.agent/workflows/definitions/w.ts",
              },
            ],
            errors: [],
            cleanup: vi.fn(),
          };
        } else {
          return {
            workflows: [
              {
                definition: {
                  config: { id: "p2-workflow", name: "P2 Workflow" },
                  __type: "workflow" as const,
                  createInngestFunction: vi.fn(),
                },
                inngestFunction: { id: "func-p2" } as never,
                filePath: "/tmp/project-2/.agent/workflows/definitions/w.ts",
              },
            ],
            errors: [],
            cleanup: vi.fn(),
          };
        }
      });

      // Act
      const result = await loadWorkflows(mockFastify);

      // Assert: Both workflows from different projects registered
      expect(result.functions).toHaveLength(2);
      expect(result.functions.map((f) => (f as { id: string }).id)).toContain(
        "func-p1"
      );
      expect(result.functions.map((f) => (f as { id: string }).id)).toContain(
        "func-p2"
      );

      // Assert: loadProjectWorkflows called for each project
      expect(mockLoadProject).toHaveBeenCalledTimes(2);
      expect(mockLoadProject).toHaveBeenCalledWith(
        "/tmp/project-1",
        expect.anything(),
        expect.anything()
      );
      expect(mockLoadProject).toHaveBeenCalledWith(
        "/tmp/project-2",
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe("error handling", () => {
    it("continues processing other projects when one project fails to load", async () => {
      // Arrange: Create two projects
      const project1 = await createTestProject(prisma, {
        name: "Project 1",
        path: "/tmp/project-1",
      });

      const project2 = await createTestProject(prisma, {
        name: "Project 2",
        path: "/tmp/project-2",
      });

      await prisma.workflowDefinition.createMany({
        data: [
          {
            project_id: project1.id,
            identifier: "p1-workflow",
            name: "P1 Workflow",
            type: "code",
            path: "/tmp/project-1/.agent/workflows/definitions/w.ts",
            phases: [],
            status: "active",
            file_exists: true,
          },
          {
            project_id: project2.id,
            identifier: "p2-workflow",
            name: "P2 Workflow",
            type: "code",
            path: "/tmp/project-2/.agent/workflows/definitions/w.ts",
            phases: [],
            status: "active",
            file_exists: true,
          },
        ],
      });

      // Mock scanAllProjectWorkflows
      const mockScanAll = vi.mocked(
        scanAllProjectWorkflowsModule.scanAllProjectWorkflows
      );
      mockScanAll.mockResolvedValue(undefined);

      // Mock loadProjectWorkflows to fail for project1, succeed for project2
      const mockLoadProject = vi.mocked(
        loadProjectWorkflowsModule.loadProjectWorkflows
      );

      mockLoadProject.mockImplementation(async (projectPath) => {
        if (projectPath === "/tmp/project-1") {
          throw new Error("Failed to load project 1 workflows");
        } else {
          return {
            workflows: [
              {
                definition: {
                  config: { id: "p2-workflow", name: "P2 Workflow" },
                  __type: "workflow" as const,
                  createInngestFunction: vi.fn(),
                },
                inngestFunction: { id: "func-p2" } as never,
                filePath: "/tmp/project-2/.agent/workflows/definitions/w.ts",
              },
            ],
            errors: [],
            cleanup: vi.fn(),
          };
        }
      });

      // Act
      const result = await loadWorkflows(mockFastify);

      // Assert: Project 2 workflow still registered
      expect(result.functions).toHaveLength(1);
      expect(result.functions[0]).toEqual({ id: "func-p2" });

      // Assert: Project 1 definitions archived with error
      const p1Definitions = await prisma.workflowDefinition.findMany({
        where: { project_id: project1.id },
      });

      expect(p1Definitions).toHaveLength(1);
      expect(p1Definitions[0]).toMatchObject({
        status: "archived",
        file_exists: false,
        load_error: "Failed to load project 1 workflows",
      });

      // Assert: Logger reported error
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: project1.id,
          error: "Failed to load project 1 workflows",
        }),
        expect.stringContaining("Failed to load workflows")
      );
    });

    it("returns empty array when no active definitions exist", async () => {
      // Arrange: Create project with archived definition
      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test-project",
      });

      await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "archived-workflow",
          name: "Archived Workflow",
          type: "code",
          path: "/tmp/test-project/.agent/workflows/definitions/w.ts",
          phases: [],
          status: "archived",
          file_exists: false,
          archived_at: new Date(),
        },
      });

      // Mock scanAllProjectWorkflows
      const mockScanAll = vi.mocked(
        scanAllProjectWorkflowsModule.scanAllProjectWorkflows
      );
      mockScanAll.mockResolvedValue(undefined);

      // Act
      const result = await loadWorkflows(mockFastify);

      // Assert: No functions returned (only archived definitions exist)
      expect(result.functions).toHaveLength(0);
      expect(result.stats.total).toBe(0);
    });

    it("throws error when workflow client not initialized", async () => {
      // Arrange: Fastify without workflowClient
      const mockFastifyNoClient = {
        log: mockLogger,
        workflowClient: null,
      } as unknown as FastifyInstance;

      // Act & Assert
      await expect(loadWorkflows(mockFastifyNoClient)).rejects.toThrow(
        "Workflow client not initialized"
      );
    });
  });
});
