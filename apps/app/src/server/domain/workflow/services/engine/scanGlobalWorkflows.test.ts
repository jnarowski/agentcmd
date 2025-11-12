import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { scanGlobalWorkflows } from "./scanGlobalWorkflows";
import * as loadGlobalWorkflowsModule from "./loadGlobalWorkflows";
import type { WorkflowRuntime } from "agentcmd-workflows";
import type { FastifyBaseLogger } from "fastify";
import type { WorkflowDefinition } from "agentcmd-workflows";

// Mock loadGlobalWorkflows
vi.mock("./loadGlobalWorkflows", () => ({
  loadGlobalWorkflows: vi.fn(),
}));

describe("scanGlobalWorkflows", () => {
  let mockRuntime: WorkflowRuntime;
  let mockLogger: FastifyBaseLogger;

  beforeEach(() => {
    // Mock runtime
    mockRuntime = {} as WorkflowRuntime;

    // Mock logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as FastifyBaseLogger;
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  describe("discovery and loading", () => {
    it("should return empty count when no workflows found", async () => {
      // Mock loadGlobalWorkflows to return no workflows
      const mockLoad = vi.mocked(loadGlobalWorkflowsModule.loadGlobalWorkflows);
      mockLoad.mockResolvedValue({ workflows: [], errors: [] });

      // Act
      const count = await scanGlobalWorkflows(mockRuntime, mockLogger);

      // Assert
      expect(count).toBe(0);
      expect(mockLoad).toHaveBeenCalledWith(mockRuntime, mockLogger);
    });

    it("should discover workflows from loadGlobalWorkflows", async () => {
      // Mock loadGlobalWorkflows with valid workflows
      const mockDefinition: WorkflowDefinition = {
        __type: "workflow",
        config: {
          id: "test-workflow",
          name: "Test Workflow",
          description: "Test description",
          phases: [{ id: "test", label: "Test" }] as const,
        },
        createInngestFunction: vi.fn(),
      };

      const mockLoad = vi.mocked(loadGlobalWorkflowsModule.loadGlobalWorkflows);
      mockLoad.mockResolvedValue({
        workflows: [
          {
            definition: mockDefinition,
            inngestFunction: {} as unknown,
            filePath: "/home/.agentcmd/workflows/test.ts",
          },
        ],
        errors: [],
      });

      // Act
      const count = await scanGlobalWorkflows(mockRuntime, mockLogger);

      // Assert
      expect(count).toBe(1);
    });

    it("should handle load errors from loadGlobalWorkflows", async () => {
      // Mock loadGlobalWorkflows with errors
      const mockLoad = vi.mocked(loadGlobalWorkflowsModule.loadGlobalWorkflows);
      mockLoad.mockResolvedValue({
        workflows: [],
        errors: [
          {
            filePath: "/home/.agentcmd/workflows/broken.ts",
            error: "SyntaxError: Unexpected token",
          },
        ],
      });

      // Act
      const count = await scanGlobalWorkflows(mockRuntime, mockLogger);

      // Assert
      expect(count).toBe(0);
    });
  });

  describe("database synchronization - create", () => {
    it("should create new workflow records with scope=global and project_id=null", async () => {
      // Mock workflow
      const mockDefinition: WorkflowDefinition = {
        __type: "workflow",
        config: {
          id: "new-workflow",
          name: "New Workflow",
          description: "New description",
          phases: [{ id: "phase1", label: "Phase 1" }] as const,
        },
        createInngestFunction: vi.fn(),
      };

      const mockLoad = vi.mocked(loadGlobalWorkflowsModule.loadGlobalWorkflows);
      mockLoad.mockResolvedValue({
        workflows: [
          {
            definition: mockDefinition,
            inngestFunction: {} as unknown,
            filePath: "/home/.agentcmd/workflows/new.ts",
          },
        ],
        errors: [],
      });

      // Act
      await scanGlobalWorkflows(mockRuntime, mockLogger);

      // Assert
      const workflow = await prisma.workflowDefinition.findFirst({
        where: {
          scope: "global",
          identifier: "new-workflow",
          project_id: null,
        },
      });

      expect(workflow).not.toBeNull();
      expect(workflow?.scope).toBe("global");
      expect(workflow?.project_id).toBeNull();
      expect(workflow?.identifier).toBe("new-workflow");
      expect(workflow?.name).toBe("New Workflow");
      expect(workflow?.description).toBe("New description");
      expect(workflow?.path).toBe("/home/.agentcmd/workflows/new.ts");
      expect(workflow?.status).toBe("active");
      expect(workflow?.file_exists).toBe(true);
      expect(workflow?.load_error).toBeNull();
    });
  });

  describe("database synchronization - update", () => {
    it("should update existing workflow when file changes", async () => {
      // Create existing workflow
      await prisma.workflowDefinition.create({
        data: {
          scope: "global",
          project_id: null,
          identifier: "existing-workflow",
          name: "Old Name",
          description: "Old description",
          type: "code",
          path: "/home/.agentcmd/workflows/existing.ts",
          phases: [],
          status: "active",
          file_exists: true,
        },
      });

      // Mock updated workflow
      const mockDefinition: WorkflowDefinition = {
        __type: "workflow",
        config: {
          id: "existing-workflow",
          name: "Updated Name",
          description: "Updated description",
          phases: [{ id: "new-phase", label: "New Phase" }] as const,
        },
        createInngestFunction: vi.fn(),
      };

      const mockLoad = vi.mocked(loadGlobalWorkflowsModule.loadGlobalWorkflows);
      mockLoad.mockResolvedValue({
        workflows: [
          {
            definition: mockDefinition,
            inngestFunction: {} as unknown,
            filePath: "/home/.agentcmd/workflows/existing.ts",
          },
        ],
        errors: [],
      });

      // Act
      await scanGlobalWorkflows(mockRuntime, mockLogger);

      // Assert
      const workflow = await prisma.workflowDefinition.findFirst({
        where: {
          scope: "global",
          project_id: null,
          identifier: "existing-workflow",
        },
      });

      expect(workflow?.name).toBe("Updated Name");
      expect(workflow?.description).toBe("Updated description");
      expect(workflow?.phases).toEqual([{ id: "new-phase", label: "New Phase" }]);
    });
  });

  describe("database synchronization - reactivation", () => {
    it("should reactivate archived workflow when file reappears", async () => {
      // Create archived workflow
      const archivedAt = new Date();
      await prisma.workflowDefinition.create({
        data: {
          scope: "global",
          project_id: null,
          identifier: "archived-workflow",
          name: "Archived Workflow",
          type: "code",
          path: "/home/.agentcmd/workflows/archived.ts",
          phases: [],
          status: "archived",
          file_exists: false,
          archived_at: archivedAt,
        },
      });

      // Mock workflow reappearing
      const mockDefinition: WorkflowDefinition = {
        __type: "workflow",
        config: {
          id: "archived-workflow",
          name: "Archived Workflow",
          phases: [] as const,
        },
        createInngestFunction: vi.fn(),
      };

      const mockLoad = vi.mocked(loadGlobalWorkflowsModule.loadGlobalWorkflows);
      mockLoad.mockResolvedValue({
        workflows: [
          {
            definition: mockDefinition,
            inngestFunction: {} as unknown,
            filePath: "/home/.agentcmd/workflows/archived.ts",
          },
        ],
        errors: [],
      });

      // Act
      await scanGlobalWorkflows(mockRuntime, mockLogger);

      // Assert
      const workflow = await prisma.workflowDefinition.findFirst({
        where: {
          scope: "global",
          project_id: null,
          identifier: "archived-workflow",
        },
      });

      expect(workflow?.status).toBe("active");
      expect(workflow?.file_exists).toBe(true);
      expect(workflow?.archived_at).toBeNull();
    });

    it("should reactivate workflow when file_exists=false", async () => {
      // Create workflow with file_exists=false
      await prisma.workflowDefinition.create({
        data: {
          scope: "global",
          project_id: null,
          identifier: "missing-workflow",
          name: "Missing Workflow",
          type: "code",
          path: "/home/.agentcmd/workflows/missing.ts",
          phases: [],
          status: "active",
          file_exists: false,
        },
      });

      // Mock workflow reappearing
      const mockDefinition: WorkflowDefinition = {
        __type: "workflow",
        config: {
          id: "missing-workflow",
          name: "Missing Workflow",
          phases: [] as const,
        },
        createInngestFunction: vi.fn(),
      };

      const mockLoad = vi.mocked(loadGlobalWorkflowsModule.loadGlobalWorkflows);
      mockLoad.mockResolvedValue({
        workflows: [
          {
            definition: mockDefinition,
            inngestFunction: {} as unknown,
            filePath: "/home/.agentcmd/workflows/missing.ts",
          },
        ],
        errors: [],
      });

      // Act
      await scanGlobalWorkflows(mockRuntime, mockLogger);

      // Assert
      const workflow = await prisma.workflowDefinition.findFirst({
        where: {
          scope: "global",
          project_id: null,
          identifier: "missing-workflow",
        },
      });

      expect(workflow?.file_exists).toBe(true);
      expect(workflow?.status).toBe("active");
    });
  });

  describe("database synchronization - missing files", () => {
    it("should mark workflow as file_exists=false and archived when file deleted", async () => {
      // Create existing workflow
      await prisma.workflowDefinition.create({
        data: {
          scope: "global",
          project_id: null,
          identifier: "deleted-workflow",
          name: "Deleted Workflow",
          type: "code",
          path: "/home/.agentcmd/workflows/deleted.ts",
          phases: [],
          status: "active",
          file_exists: true,
        },
      });

      // Mock no workflows found (file deleted)
      const mockLoad = vi.mocked(loadGlobalWorkflowsModule.loadGlobalWorkflows);
      mockLoad.mockResolvedValue({ workflows: [], errors: [] });

      // Act
      await scanGlobalWorkflows(mockRuntime, mockLogger);

      // Assert
      const workflow = await prisma.workflowDefinition.findFirst({
        where: {
          scope: "global",
          project_id: null,
          identifier: "deleted-workflow",
        },
      });

      expect(workflow?.file_exists).toBe(false);
      expect(workflow?.status).toBe("archived");
      expect(workflow?.archived_at).toBeInstanceOf(Date);
      expect(workflow?.load_error).toBeNull();
    });
  });

  describe("database synchronization - load errors", () => {
    it("should store load errors in load_error field", async () => {
      // Create existing workflow
      await prisma.workflowDefinition.create({
        data: {
          scope: "global",
          project_id: null,
          identifier: "broken-workflow",
          name: "Broken Workflow",
          type: "code",
          path: "/home/.agentcmd/workflows/broken.ts",
          phases: [],
          status: "active",
          file_exists: true,
        },
      });

      // Mock load error
      const mockLoad = vi.mocked(loadGlobalWorkflowsModule.loadGlobalWorkflows);
      mockLoad.mockResolvedValue({
        workflows: [],
        errors: [
          {
            filePath: "/home/.agentcmd/workflows/broken.ts",
            error: "SyntaxError: Unexpected token )",
          },
        ],
      });

      // Act
      await scanGlobalWorkflows(mockRuntime, mockLogger);

      // Assert
      const workflow = await prisma.workflowDefinition.findFirst({
        where: {
          scope: "global",
          project_id: null,
          identifier: "broken-workflow",
        },
      });

      expect(workflow?.file_exists).toBe(true);
      expect(workflow?.load_error).toBe("SyntaxError: Unexpected token )");
      expect(workflow?.status).toBe("archived");
      expect(workflow?.archived_at).toBeInstanceOf(Date);
    });
  });

  describe("scope isolation", () => {
    it("should not affect project-specific workflows", async () => {
      // Create project workflow
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test-project",
        },
      });

      await prisma.workflowDefinition.create({
        data: {
          scope: "project",
          project_id: project.id,
          identifier: "project-workflow",
          name: "Project Workflow",
          type: "code",
          path: "/tmp/test-project/.workflows/workflow.ts",
          phases: [],
          status: "active",
          file_exists: true,
        },
      });

      // Mock global workflow
      const mockDefinition: WorkflowDefinition = {
        __type: "workflow",
        config: {
          id: "global-workflow",
          name: "Global Workflow",
          phases: [] as const,
        },
        createInngestFunction: vi.fn(),
      };

      const mockLoad = vi.mocked(loadGlobalWorkflowsModule.loadGlobalWorkflows);
      mockLoad.mockResolvedValue({
        workflows: [
          {
            definition: mockDefinition,
            inngestFunction: {} as unknown,
            filePath: "/home/.agentcmd/workflows/global.ts",
          },
        ],
        errors: [],
      });

      // Act
      await scanGlobalWorkflows(mockRuntime, mockLogger);

      // Assert - project workflow unchanged
      const projectWorkflow = await prisma.workflowDefinition.findUnique({
        where: {
          project_id_identifier: {
            project_id: project.id,
            identifier: "project-workflow",
          },
        },
      });

      expect(projectWorkflow).not.toBeNull();
      expect(projectWorkflow?.status).toBe("active");
      expect(projectWorkflow?.file_exists).toBe(true);
      expect(projectWorkflow?.project_id).toBe(project.id);

      // Assert - global workflow created
      const globalWorkflow = await prisma.workflowDefinition.findFirst({
        where: {
          scope: "global",
          project_id: null,
          identifier: "global-workflow",
        },
      });

      expect(globalWorkflow).not.toBeNull();
      expect(globalWorkflow?.project_id).toBeNull();
    });

    it("should handle same identifier for global and project workflows", async () => {
      // Create project workflow with identifier "shared"
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test-project",
        },
      });

      await prisma.workflowDefinition.create({
        data: {
          scope: "project",
          project_id: project.id,
          identifier: "shared",
          name: "Project Shared",
          type: "code",
          path: "/tmp/test-project/.workflows/shared.ts",
          phases: [],
          status: "active",
          file_exists: true,
        },
      });

      // Mock global workflow with same identifier
      const mockDefinition: WorkflowDefinition = {
        __type: "workflow",
        config: {
          id: "shared",
          name: "Global Shared",
          phases: [] as const,
        },
        createInngestFunction: vi.fn(),
      };

      const mockLoad = vi.mocked(loadGlobalWorkflowsModule.loadGlobalWorkflows);
      mockLoad.mockResolvedValue({
        workflows: [
          {
            definition: mockDefinition,
            inngestFunction: {} as unknown,
            filePath: "/home/.agentcmd/workflows/shared.ts",
          },
        ],
        errors: [],
      });

      // Act
      await scanGlobalWorkflows(mockRuntime, mockLogger);

      // Assert - both workflows exist independently
      const projectWorkflow = await prisma.workflowDefinition.findUnique({
        where: {
          project_id_identifier: {
            project_id: project.id,
            identifier: "shared",
          },
        },
      });

      const globalWorkflow = await prisma.workflowDefinition.findFirst({
        where: {
          scope: "global",
          project_id: null,
          identifier: "shared",
        },
      });

      expect(projectWorkflow).not.toBeNull();
      expect(projectWorkflow?.name).toBe("Project Shared");

      expect(globalWorkflow).not.toBeNull();
      expect(globalWorkflow?.name).toBe("Global Shared");
    });
  });
});
