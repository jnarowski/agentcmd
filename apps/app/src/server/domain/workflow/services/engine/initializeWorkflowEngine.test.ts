import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { initializeWorkflowEngine } from "./initializeWorkflowEngine";
import * as loadProjectWorkflowsModule from "./loadProjectWorkflows";
import * as loadGlobalWorkflowsModule from "./loadGlobalWorkflows";
import * as scanGlobalWorkflowsModule from "./scanGlobalWorkflows";
import * as scanAllProjectWorkflowsModule from "./scanAllProjectWorkflows";
import * as createWorkflowClientModule from "./createWorkflowClient";
import type { FastifyInstance } from "fastify";
import type { WorkflowDefinition } from "agentcmd-workflows";

// Mock all the imports
vi.mock("./loadProjectWorkflows");
vi.mock("./loadGlobalWorkflows");
vi.mock("./scanGlobalWorkflows");
vi.mock("./scanAllProjectWorkflows");
vi.mock("./createWorkflowClient");
vi.mock("inngest/fastify", () => ({
  fastifyPlugin: vi.fn(() => async () => {}),
  serve: vi.fn(() => ({
    register: vi.fn(),
  })),
}));

describe("initializeWorkflowEngine", () => {
  let mockFastify: FastifyInstance;
  let mockLoadProjectWorkflows: ReturnType<typeof vi.fn>;
  let mockLoadGlobalWorkflows: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock Fastify instance
    mockFastify = {
      log: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
      decorate: vi.fn(),
      register: vi.fn(),
      route: vi.fn(),
    } as unknown as FastifyInstance;

    // Mock workflow client
    const mockClient = { id: vi.fn().mockReturnValue("test-client") };
    vi.mocked(createWorkflowClientModule.createWorkflowClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createWorkflowClientModule.createWorkflowClient>
    );

    // Mock scanning functions
    vi.mocked(scanGlobalWorkflowsModule.scanGlobalWorkflows).mockResolvedValue(0);
    vi.mocked(scanAllProjectWorkflowsModule.scanAllProjectWorkflows).mockResolvedValue({
      scanned: 0,
      discovered: 0,
      errors: [],
    });

    // Mock load functions
    mockLoadProjectWorkflows = vi.mocked(loadProjectWorkflowsModule.loadProjectWorkflows);
    mockLoadGlobalWorkflows = vi.mocked(loadGlobalWorkflowsModule.loadGlobalWorkflows);
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  describe("workflow loading optimization", () => {
    it("should load project workflows only once per project", async () => {
      // Create test project
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test-project",
        },
      });

      // Create 3 workflow definitions for the same project
      const workflow1 = await prisma.workflowDefinition.create({
        data: {
          scope: "project",
          project_id: project.id,
          identifier: "workflow-1",
          name: "Workflow 1",
          type: "code",
          path: "/tmp/test-project/.agent/workflows/definitions/workflow-1.ts",
          phases: [],
          status: "active",
        },
      });

      const workflow2 = await prisma.workflowDefinition.create({
        data: {
          scope: "project",
          project_id: project.id,
          identifier: "workflow-2",
          name: "Workflow 2",
          type: "code",
          path: "/tmp/test-project/.agent/workflows/definitions/workflow-2.ts",
          phases: [],
          status: "active",
        },
      });

      const workflow3 = await prisma.workflowDefinition.create({
        data: {
          scope: "project",
          project_id: project.id,
          identifier: "workflow-3",
          name: "Workflow 3",
          type: "code",
          path: "/tmp/test-project/.agent/workflows/definitions/workflow-3.ts",
          phases: [],
          status: "active",
        },
      });

      // Mock workflow loading to return all 3 workflows
      const createMockDefinition = (id: string, name: string): WorkflowDefinition => ({
        __type: "workflow",
        config: {
          id,
          name,
          phases: [] as const,
        },
        createInngestFunction: vi.fn().mockReturnValue({
          id: vi.fn().mockReturnValue(id),
        }),
      });

      mockLoadProjectWorkflows.mockResolvedValue({
        workflows: [
          {
            definition: createMockDefinition("workflow-1", "Workflow 1"),
            inngestFunction: { id: () => "workflow-1" },
            filePath: workflow1.path,
          },
          {
            definition: createMockDefinition("workflow-2", "Workflow 2"),
            inngestFunction: { id: () => "workflow-2" },
            filePath: workflow2.path,
          },
          {
            definition: createMockDefinition("workflow-3", "Workflow 3"),
            inngestFunction: { id: () => "workflow-3" },
            filePath: workflow3.path,
          },
        ],
        errors: [],
      });

      // Act
      await initializeWorkflowEngine(mockFastify);

      // Assert - loadProjectWorkflows should be called ONLY ONCE for this project
      expect(mockLoadProjectWorkflows).toHaveBeenCalledTimes(1);
      expect(mockLoadProjectWorkflows).toHaveBeenCalledWith(
        project.path,
        expect.anything(), // runtime
        expect.anything() // logger
      );
    });

    it("should load workflows once per project when multiple projects exist", async () => {
      // Create 2 projects
      const project1 = await prisma.project.create({
        data: { name: "Project 1", path: "/tmp/project-1" },
      });

      const project2 = await prisma.project.create({
        data: { name: "Project 2", path: "/tmp/project-2" },
      });

      // Create 2 workflows for project1
      await prisma.workflowDefinition.create({
        data: {
          scope: "project",
          project_id: project1.id,
          identifier: "p1-workflow-1",
          name: "P1 Workflow 1",
          type: "code",
          path: "/tmp/project-1/.agent/workflows/definitions/workflow-1.ts",
          phases: [],
          status: "active",
        },
      });

      await prisma.workflowDefinition.create({
        data: {
          scope: "project",
          project_id: project1.id,
          identifier: "p1-workflow-2",
          name: "P1 Workflow 2",
          type: "code",
          path: "/tmp/project-1/.agent/workflows/definitions/workflow-2.ts",
          phases: [],
          status: "active",
        },
      });

      // Create 3 workflows for project2
      await prisma.workflowDefinition.create({
        data: {
          scope: "project",
          project_id: project2.id,
          identifier: "p2-workflow-1",
          name: "P2 Workflow 1",
          type: "code",
          path: "/tmp/project-2/.agent/workflows/definitions/workflow-1.ts",
          phases: [],
          status: "active",
        },
      });

      await prisma.workflowDefinition.create({
        data: {
          scope: "project",
          project_id: project2.id,
          identifier: "p2-workflow-2",
          name: "P2 Workflow 2",
          type: "code",
          path: "/tmp/project-2/.agent/workflows/definitions/workflow-2.ts",
          phases: [],
          status: "active",
        },
      });

      await prisma.workflowDefinition.create({
        data: {
          scope: "project",
          project_id: project2.id,
          identifier: "p2-workflow-3",
          name: "P2 Workflow 3",
          type: "code",
          path: "/tmp/project-2/.agent/workflows/definitions/workflow-3.ts",
          phases: [],
          status: "active",
        },
      });

      // Mock workflow loading - return different workflows based on project path
      mockLoadProjectWorkflows.mockImplementation(async (projectPath: string) => {
        const createMockDefinition = (id: string, name: string): WorkflowDefinition => ({
          __type: "workflow",
          config: { id, name, phases: [] as const },
          createInngestFunction: vi.fn().mockReturnValue({
            id: vi.fn().mockReturnValue(id),
          }),
        });

        if (projectPath === "/tmp/project-1") {
          return {
            workflows: [
              {
                definition: createMockDefinition("p1-workflow-1", "P1 Workflow 1"),
                inngestFunction: { id: () => "p1-workflow-1" },
                filePath: "/tmp/project-1/.agent/workflows/definitions/workflow-1.ts",
              },
              {
                definition: createMockDefinition("p1-workflow-2", "P1 Workflow 2"),
                inngestFunction: { id: () => "p1-workflow-2" },
                filePath: "/tmp/project-1/.agent/workflows/definitions/workflow-2.ts",
              },
            ],
            errors: [],
          };
        } else {
          return {
            workflows: [
              {
                definition: createMockDefinition("p2-workflow-1", "P2 Workflow 1"),
                inngestFunction: { id: () => "p2-workflow-1" },
                filePath: "/tmp/project-2/.agent/workflows/definitions/workflow-1.ts",
              },
              {
                definition: createMockDefinition("p2-workflow-2", "P2 Workflow 2"),
                inngestFunction: { id: () => "p2-workflow-2" },
                filePath: "/tmp/project-2/.agent/workflows/definitions/workflow-2.ts",
              },
              {
                definition: createMockDefinition("p2-workflow-3", "P2 Workflow 3"),
                inngestFunction: { id: () => "p2-workflow-3" },
                filePath: "/tmp/project-2/.agent/workflows/definitions/workflow-3.ts",
              },
            ],
            errors: [],
          };
        }
      });

      // Act
      await initializeWorkflowEngine(mockFastify);

      // Assert - loadProjectWorkflows called exactly TWICE (once per project)
      expect(mockLoadProjectWorkflows).toHaveBeenCalledTimes(2);

      // Verify it was called with correct paths
      expect(mockLoadProjectWorkflows).toHaveBeenCalledWith(
        "/tmp/project-1",
        expect.anything(),
        expect.anything()
      );
      expect(mockLoadProjectWorkflows).toHaveBeenCalledWith(
        "/tmp/project-2",
        expect.anything(),
        expect.anything()
      );
    });

    it("should load global workflows only once even with multiple global definitions", async () => {
      // Create 3 global workflow definitions
      await prisma.workflowDefinition.create({
        data: {
          scope: "global",
          project_id: null,
          identifier: "global-1",
          name: "Global 1",
          type: "code",
          path: "/home/.agentcmd/workflows/global-1.ts",
          phases: [],
          status: "active",
        },
      });

      await prisma.workflowDefinition.create({
        data: {
          scope: "global",
          project_id: null,
          identifier: "global-2",
          name: "Global 2",
          type: "code",
          path: "/home/.agentcmd/workflows/global-2.ts",
          phases: [],
          status: "active",
        },
      });

      await prisma.workflowDefinition.create({
        data: {
          scope: "global",
          project_id: null,
          identifier: "global-3",
          name: "Global 3",
          type: "code",
          path: "/home/.agentcmd/workflows/global-3.ts",
          phases: [],
          status: "active",
        },
      });

      // Mock global workflow loading
      const createMockDefinition = (id: string, name: string): WorkflowDefinition => ({
        __type: "workflow",
        config: { id, name, phases: [] as const },
        createInngestFunction: vi.fn().mockReturnValue({
          id: vi.fn().mockReturnValue(id),
        }),
      });

      mockLoadGlobalWorkflows.mockResolvedValue({
        workflows: [
          {
            definition: createMockDefinition("global-1", "Global 1"),
            inngestFunction: { id: () => "global-1" },
            filePath: "/home/.agentcmd/workflows/global-1.ts",
          },
          {
            definition: createMockDefinition("global-2", "Global 2"),
            inngestFunction: { id: () => "global-2" },
            filePath: "/home/.agentcmd/workflows/global-2.ts",
          },
          {
            definition: createMockDefinition("global-3", "Global 3"),
            inngestFunction: { id: () => "global-3" },
            filePath: "/home/.agentcmd/workflows/global-3.ts",
          },
        ],
        errors: [],
      });

      // Act
      await initializeWorkflowEngine(mockFastify);

      // Assert - loadGlobalWorkflows should be called ONLY ONCE
      expect(mockLoadGlobalWorkflows).toHaveBeenCalledTimes(1);
    });

    it("should register all workflows from a single load", async () => {
      // Create project with 5 workflows
      const project = await prisma.project.create({
        data: { name: "Multi Workflow Project", path: "/tmp/multi" },
      });

      const workflows = [];
      for (let i = 1; i <= 5; i++) {
        workflows.push(
          await prisma.workflowDefinition.create({
            data: {
              scope: "project",
              project_id: project.id,
              identifier: `workflow-${i}`,
              name: `Workflow ${i}`,
              type: "code",
              path: `/tmp/multi/.agent/workflows/definitions/workflow-${i}.ts`,
              phases: [],
              status: "active",
            },
          })
        );
      }

      // Mock loading all 5 workflows
      const createMockDefinition = (id: string, name: string): WorkflowDefinition => ({
        __type: "workflow",
        config: { id, name, phases: [] as const },
        createInngestFunction: vi.fn().mockReturnValue({
          id: vi.fn().mockReturnValue(id),
        }),
      });

      mockLoadProjectWorkflows.mockResolvedValue({
        workflows: workflows.map((w) => ({
          definition: createMockDefinition(w.identifier, w.name),
          inngestFunction: { id: () => w.identifier },
          filePath: w.path,
        })),
        errors: [],
      });

      // Act
      await initializeWorkflowEngine(mockFastify);

      // Assert
      expect(mockLoadProjectWorkflows).toHaveBeenCalledTimes(1);

      // Verify all 5 workflows were registered (check logs)
      const infoLogs = vi.mocked(mockFastify.log.info).mock.calls;
      const registeredWorkflowLogs = infoLogs.filter(
        (call) => call[1] === "Registered project workflow"
      );
      expect(registeredWorkflowLogs).toHaveLength(5);
    });
  });

  describe("mixed scope handling", () => {
    it("should load both global and project workflows efficiently", async () => {
      // Create global workflows
      await prisma.workflowDefinition.create({
        data: {
          scope: "global",
          project_id: null,
          identifier: "global-workflow",
          name: "Global Workflow",
          type: "code",
          path: "/home/.agentcmd/workflows/global.ts",
          phases: [],
          status: "active",
        },
      });

      // Create project with workflows
      const project = await prisma.project.create({
        data: { name: "Test Project", path: "/tmp/test" },
      });

      await prisma.workflowDefinition.create({
        data: {
          scope: "project",
          project_id: project.id,
          identifier: "project-workflow",
          name: "Project Workflow",
          type: "code",
          path: "/tmp/test/.agent/workflows/definitions/workflow.ts",
          phases: [],
          status: "active",
        },
      });

      // Mock both loaders
      const createMockDefinition = (id: string, name: string): WorkflowDefinition => ({
        __type: "workflow",
        config: { id, name, phases: [] as const },
        createInngestFunction: vi.fn().mockReturnValue({
          id: vi.fn().mockReturnValue(id),
        }),
      });

      mockLoadGlobalWorkflows.mockResolvedValue({
        workflows: [
          {
            definition: createMockDefinition("global-workflow", "Global Workflow"),
            inngestFunction: { id: () => "global-workflow" },
            filePath: "/home/.agentcmd/workflows/global.ts",
          },
        ],
        errors: [],
      });

      mockLoadProjectWorkflows.mockResolvedValue({
        workflows: [
          {
            definition: createMockDefinition("project-workflow", "Project Workflow"),
            inngestFunction: { id: () => "project-workflow" },
            filePath: "/tmp/test/.agent/workflows/definitions/workflow.ts",
          },
        ],
        errors: [],
      });

      // Act
      await initializeWorkflowEngine(mockFastify);

      // Assert - each loader called exactly once
      expect(mockLoadGlobalWorkflows).toHaveBeenCalledTimes(1);
      expect(mockLoadProjectWorkflows).toHaveBeenCalledTimes(1);
    });
  });
});
