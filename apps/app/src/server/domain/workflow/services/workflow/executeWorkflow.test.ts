import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { createTestUser, createTestProject, createTestWorkflowRun } from "@/server/test-utils/fixtures";
import { executeWorkflow } from "./executeWorkflow";
import * as fs from "node:fs/promises";
import * as getWorkflowRunForExecutionModule from "../runs/getWorkflowRunForExecution";
import * as updateWorkflowRunModule from "../runs/updateWorkflowRun";
import type { Inngest } from "inngest";

// Mock fs.access for file existence checks
vi.mock("node:fs/promises", () => ({
  access: vi.fn(),
}));

// Mock getWorkflowRunForExecution to avoid complex test data setup
vi.mock("../runs/getWorkflowRunForExecution", () => ({
  getWorkflowRunForExecution: vi.fn(),
}));

// Mock updateWorkflowRun to avoid database side effects
vi.mock("../runs/updateWorkflowRun", () => ({
  updateWorkflowRun: vi.fn(),
}));

describe("executeWorkflow validation", () => {
  let mockWorkflowClient: Inngest;
  let testUser: { id: string; email: string };
  let testProject: { id: string; name: string; path: string };

  beforeEach(async () => {
    // Create test user and project
    testUser = await createTestUser(prisma);
    testProject = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });

    // Mock Inngest client
    mockWorkflowClient = {
      send: vi.fn().mockResolvedValue(undefined),
    } as unknown as Inngest;
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  describe("archived workflow definition", () => {
    it("should fail when workflow definition is archived", async () => {
      // Arrange: Create archived workflow definition
      const workflowDef = await prisma.workflowDefinition.create({
        data: {
          project_id: testProject.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: "/tmp/test-project/workflow.ts",
          phases: ["phase1"],
          status: "archived", // Archived status
          file_exists: true,
        },
      });

      const workflowRun = await createTestWorkflowRun(prisma, {
        project_id: testProject.id,
        user_id: testUser.id,
        workflow_definition_id: workflowDef.id,
        name: "Test Run",
        args: {},
      });

      // Mock getWorkflowRunForExecution to return our test data
      const mockGetWorkflowRun = vi.mocked(
        getWorkflowRunForExecutionModule.getWorkflowRunForExecution
      );
      mockGetWorkflowRun.mockResolvedValue({
        ...workflowRun,
        workflow_definition: workflowDef,
        project: testProject,
      });

      // Mock updateWorkflowRun
      const mockUpdateWorkflowRun = vi.mocked(
        updateWorkflowRunModule.updateWorkflowRun
      );
      mockUpdateWorkflowRun.mockResolvedValue(undefined);

      // Act & Assert: Attempt execution
      await expect(
        executeWorkflow({
          runId: workflowRun.id,
          workflowClient: mockWorkflowClient,
        })
      ).rejects.toThrow(/Cannot execute archived workflow/);

      // Verify updateWorkflowRun was called to mark run as failed
      expect(mockUpdateWorkflowRun).toHaveBeenCalledWith({
        runId: workflowRun.id,
        data: {
          status: "failed",
          error_message: expect.stringContaining("Cannot execute archived workflow"),
          completed_at: expect.any(Date),
        },
        logger: undefined,
      });

      // Verify Inngest event was NOT sent
      expect(mockWorkflowClient.send).not.toHaveBeenCalled();
    });
  });

  describe("file_exists flag validation", () => {
    it("should fail when file_exists is false", async () => {
      // Arrange: Create definition with file_exists=false
      const workflowDef = await prisma.workflowDefinition.create({
        data: {
          project_id: testProject.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: "/tmp/test-project/workflow.ts",
          phases: ["phase1"],
          status: "active",
          file_exists: false, // File marked as missing
        },
      });

      const workflowRun = await createTestWorkflowRun(prisma, {
        project_id: testProject.id,
        user_id: testUser.id,
        workflow_definition_id: workflowDef.id,
        name: "Test Run",
        args: {},
      });

      // Mock getWorkflowRunForExecution
      const mockGetWorkflowRun = vi.mocked(
        getWorkflowRunForExecutionModule.getWorkflowRunForExecution
      );
      mockGetWorkflowRun.mockResolvedValue({
        ...workflowRun,
        workflow_definition: workflowDef,
        project: testProject,
      });

      // Mock updateWorkflowRun
      const mockUpdateWorkflowRun = vi.mocked(
        updateWorkflowRunModule.updateWorkflowRun
      );
      mockUpdateWorkflowRun.mockResolvedValue(undefined);

      // Act & Assert: Attempt execution
      await expect(
        executeWorkflow({
          runId: workflowRun.id,
          workflowClient: mockWorkflowClient,
        })
      ).rejects.toThrow(/Workflow .* file not found/);

      // Verify error message includes helpful suggestions
      try {
        await executeWorkflow({
          runId: workflowRun.id,
          workflowClient: mockWorkflowClient,
        });
      } catch (error) {
        expect((error as Error).message).toContain("/tmp/test-project/workflow.ts");
        expect((error as Error).message).toContain(
          "Check if you switched git branches"
        );
      }

      // Verify updateWorkflowRun was called to mark run as failed
      expect(mockUpdateWorkflowRun).toHaveBeenCalledWith({
        runId: workflowRun.id,
        data: {
          status: "failed",
          error_message: expect.stringContaining("file not found"),
          completed_at: expect.any(Date),
        },
        logger: undefined,
      });

      // Verify Inngest event was NOT sent
      expect(mockWorkflowClient.send).not.toHaveBeenCalled();
    });
  });

  describe("file on disk validation", () => {
    it("should update file_exists when file missing on disk", async () => {
      // Arrange: Create definition with file_exists=true but file doesn't exist on disk
      const workflowDef = await prisma.workflowDefinition.create({
        data: {
          project_id: testProject.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: "/tmp/test-project/workflow.ts",
          phases: ["phase1"],
          status: "active",
          file_exists: true, // Flag says file exists
        },
      });

      const workflowRun = await createTestWorkflowRun(prisma, {
        project_id: testProject.id,
        user_id: testUser.id,
        workflow_definition_id: workflowDef.id,
        name: "Test Run",
        args: {},
      });

      // Mock getWorkflowRunForExecution
      const mockGetWorkflowRun = vi.mocked(
        getWorkflowRunForExecutionModule.getWorkflowRunForExecution
      );
      mockGetWorkflowRun.mockResolvedValue({
        ...workflowRun,
        workflow_definition: workflowDef,
        project: testProject,
      });

      // Mock updateWorkflowRun
      const mockUpdateWorkflowRun = vi.mocked(
        updateWorkflowRunModule.updateWorkflowRun
      );
      mockUpdateWorkflowRun.mockResolvedValue(undefined);

      // Mock fs.access to throw (file doesn't exist)
      const mockAccess = vi.mocked(fs.access);
      mockAccess.mockRejectedValue(new Error("ENOENT: no such file or directory"));

      // Act & Assert: Attempt execution
      await expect(
        executeWorkflow({
          runId: workflowRun.id,
          workflowClient: mockWorkflowClient,
        })
      ).rejects.toThrow(/Workflow .* file not found/);

      // Verify file_exists updated to false in database
      const updatedDef = await prisma.workflowDefinition.findUnique({
        where: { id: workflowDef.id },
      });
      expect(updatedDef?.file_exists).toBe(false);

      // Verify archived_at timestamp set
      expect(updatedDef?.archived_at).toBeInstanceOf(Date);

      // Verify updateWorkflowRun was called to mark run as failed
      expect(mockUpdateWorkflowRun).toHaveBeenCalledWith({
        runId: workflowRun.id,
        data: {
          status: "failed",
          error_message: expect.stringContaining("file not found"),
          completed_at: expect.any(Date),
        },
        logger: undefined,
      });

      // Verify Inngest event was NOT sent
      expect(mockWorkflowClient.send).not.toHaveBeenCalled();
    });
  });

  describe("successful execution", () => {
    it("should succeed when status=active and file exists", async () => {
      // Arrange: Create active definition with existing file
      const workflowDef = await prisma.workflowDefinition.create({
        data: {
          project_id: testProject.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: "/tmp/test-project/workflow.ts",
          phases: ["phase1"],
          status: "active",
          file_exists: true,
        },
      });

      const workflowRun = await createTestWorkflowRun(prisma, {
        project_id: testProject.id,
        user_id: testUser.id,
        workflow_definition_id: workflowDef.id,
        name: "Test Run",
        args: {},
      });

      // Mock getWorkflowRunForExecution
      const mockGetWorkflowRun = vi.mocked(
        getWorkflowRunForExecutionModule.getWorkflowRunForExecution
      );
      mockGetWorkflowRun.mockResolvedValue({
        ...workflowRun,
        workflow_definition: workflowDef,
        project: testProject,
      });

      // Mock updateWorkflowRun
      const mockUpdateWorkflowRun = vi.mocked(
        updateWorkflowRunModule.updateWorkflowRun
      );
      mockUpdateWorkflowRun.mockResolvedValue(undefined);

      // Mock fs.access to succeed (file exists)
      const mockAccess = vi.mocked(fs.access);
      mockAccess.mockResolvedValue(undefined);

      // Act: Execution should proceed normally
      await executeWorkflow({
        runId: workflowRun.id,
        workflowClient: mockWorkflowClient,
      });

      // Assert: Verify workflow run updated to pending
      expect(mockUpdateWorkflowRun).toHaveBeenCalledWith({
        runId: workflowRun.id,
        data: {
          status: "pending",
          started_at: expect.any(Date),
        },
        logger: undefined,
      });

      // Verify Inngest event was sent
      expect(mockWorkflowClient.send).toHaveBeenCalledWith({
        name: `workflow.${testProject.id}.test-workflow.triggered`,
        data: {
          runId: workflowRun.id,
          name: "Test Run",
          projectId: testProject.id,
          projectPath: testProject.path,
          userId: testUser.id,
          specFile: undefined,
          specContent: undefined,
          specType: undefined,
          mode: undefined,
          planningSessionId: undefined,
          baseBranch: undefined,
          branchName: undefined,
          args: {},
        },
      });

      // Verify file_exists flag not changed
      const unchangedDef = await prisma.workflowDefinition.findUnique({
        where: { id: workflowDef.id },
      });
      expect(unchangedDef?.file_exists).toBe(true);
      expect(unchangedDef?.status).toBe("active");
    });
  });
});
