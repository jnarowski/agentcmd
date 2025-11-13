import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import type { FastifyInstance } from "fastify";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { createTestApp, closeTestApp } from "@/server/test-utils/fastify";
import {
  createAuthenticatedUser,
  createTestProject,
} from "@/server/test-utils/fixtures";

// Mock Inngest client
vi.mock("@/server/domain/workflow/services/executeWorkflow", () => ({
  executeWorkflow: vi.fn().mockResolvedValue({ runId: "test-run-id" }),
}));

describe("Workflow Routes", () => {
  let app: FastifyInstance & { jwt: { sign: (payload: object) => string } };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe("POST /api/workflow-runs", () => {
    it("should return 401 without authentication", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/workflow-runs",
        payload: {
          project_id: "test-project",
          workflow_definition_id: "test-workflow",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("error");
    });

    it("should return 400 for missing required fields", async () => {
      const { headers } = await createAuthenticatedUser(prisma, app);

      const response = await app.inject({
        method: "POST",
        url: "/api/workflow-runs",
        headers,
        payload: {
          // Missing project_id and workflow_definition_id
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("error");
    });

    it("should create workflow run with valid data", async () => {
      const { headers, user } = await createAuthenticatedUser(prisma, app);
      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test",
      });

      // Create workflow definition
      const workflowDef = await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: ".workflows/test.ts",
          phases: [],
        },
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/workflow-runs",
        headers,
        payload: {
          project_id: project.id,
          workflow_definition_id: workflowDef.id,
          name: "Test Run",
          args: { test: "value" },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveProperty("id");
      expect(body.data.name).toBe("Test Run");
      expect(body.data.user_id).toBe(user.id);
      expect(body.data.project_id).toBe(project.id);
    });

    it("should return 404 for non-existent workflow definition", async () => {
      const { headers } = await createAuthenticatedUser(prisma, app);
      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/workflow-runs",
        headers,
        payload: {
          project_id: project.id,
          workflow_definition_id: "non-existent",
          name: "Test Run",
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("GET /api/workflow-runs", () => {
    it("should return 401 without authentication", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/workflow-runs",
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return user workflow runs", async () => {
      const { headers, user } = await createAuthenticatedUser(prisma, app);
      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test",
      });

      const workflowDef = await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: ".workflows/test.ts",
          phases: [],
        },
      });

      // Create workflow runs
      await prisma.workflowRun.create({
        data: {
          user_id: user.id,
          project_id: project.id,
          workflow_definition_id: workflowDef.id,
          name: "Run 1",
          status: "pending",
          args: {},
          args: {},
        },
      });

      await prisma.workflowRun.create({
        data: {
          user_id: user.id,
          project_id: project.id,
          workflow_definition_id: workflowDef.id,
          name: "Run 2",
          status: "running",
          args: {},
          args: {},
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/workflow-runs",
        headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(2);
      expect(body.data[0]).toHaveProperty("id");
    });

    it("should filter by project_id", async () => {
      const { headers, user } = await createAuthenticatedUser(prisma, app);
      const project1 = await createTestProject(prisma, {
        name: "Project 1",
        path: "/tmp/p1",
      });
      const project2 = await createTestProject(prisma, {
        name: "Project 2",
        path: "/tmp/p2",
      });

      const workflowDef1 = await prisma.workflowDefinition.create({
        data: {
          project_id: project1.id,
          identifier: "wf1",
          name: "Workflow 1",
          type: "code",
          path: ".workflows/wf1.ts",
          phases: [],
        },
      });

      const workflowDef2 = await prisma.workflowDefinition.create({
        data: {
          project_id: project2.id,
          identifier: "wf2",
          name: "Workflow 2",
          type: "code",
          path: ".workflows/wf2.ts",
          phases: [],
        },
      });

      await prisma.workflowRun.create({
        data: {
          user_id: user.id,
          project_id: project1.id,
          workflow_definition_id: workflowDef1.id,
          name: "P1 Run",
          status: "pending",
          args: {},
        },
      });

      await prisma.workflowRun.create({
        data: {
          user_id: user.id,
          project_id: project2.id,
          workflow_definition_id: workflowDef2.id,
          name: "P2 Run",
          status: "pending",
          args: {},
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/workflow-runs?project_id=${project1.id}`,
        headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe("P1 Run");
    });

    it("should filter by status", async () => {
      const { headers, user } = await createAuthenticatedUser(prisma, app);
      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test",
      });

      const workflowDef = await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: ".workflows/test.ts",
          phases: [],
        },
      });

      await prisma.workflowRun.create({
        data: {
          user_id: user.id,
          project_id: project.id,
          workflow_definition_id: workflowDef.id,
          name: "Pending Run",
          status: "pending",
          args: {},
        },
      });

      await prisma.workflowRun.create({
        data: {
          user_id: user.id,
          project_id: project.id,
          workflow_definition_id: workflowDef.id,
          name: "Running Run",
          status: "running",
          args: {},
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/workflow-runs?status=running",
        headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].status).toBe("running");
    });

    it("should not return other users' workflow runs", async () => {
      const { headers, user } = await createAuthenticatedUser(prisma, app);
      const otherUser = await prisma.user.create({
        data: {
          username: "other-user",
          password_hash: "hash",
          is_active: true,
        },
      });

      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test",
      });

      const workflowDef = await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: ".workflows/test.ts",
          phases: [],
        },
      });

      // Create run for current user
      await prisma.workflowRun.create({
        data: {
          user_id: user.id,
          project_id: project.id,
          workflow_definition_id: workflowDef.id,
          name: "My Run",
          status: "pending",
          args: {},
        },
      });

      // Create run for other user
      await prisma.workflowRun.create({
        data: {
          user_id: otherUser.id,
          project_id: project.id,
          workflow_definition_id: workflowDef.id,
          name: "Other Run",
          status: "pending",
          args: {},
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/workflow-runs",
        headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe("My Run");
    });
  });

  describe("GET /api/workflow-runs/:id", () => {
    it("should return 401 without authentication", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/workflow-runs/test-id",
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return workflow run by id", async () => {
      const { headers, user } = await createAuthenticatedUser(prisma, app);
      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test",
      });

      const workflowDef = await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: ".workflows/test.ts",
          phases: [],
        },
      });

      const run = await prisma.workflowRun.create({
        data: {
          user_id: user.id,
          project_id: project.id,
          workflow_definition_id: workflowDef.id,
          name: "Test Run",
          status: "pending",
          args: {},
          args: {},
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/workflow-runs/${run.id}`,
        headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.id).toBe(run.id);
      expect(body.data.name).toBe("Test Run");
    });

    it("should return 404 for non-existent run", async () => {
      const { headers } = await createAuthenticatedUser(prisma, app);

      const response = await app.inject({
        method: "GET",
        url: "/api/workflow-runs/clzabc123",
        headers,
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 403 for other user's run", async () => {
      const { headers } = await createAuthenticatedUser(prisma, app);
      const otherUser = await prisma.user.create({
        data: {
          username: "other-user",
          password_hash: "hash",
          is_active: true,
        },
      });

      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test",
      });

      const workflowDef = await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: ".workflows/test.ts",
          phases: [],
        },
      });

      const run = await prisma.workflowRun.create({
        data: {
          user_id: otherUser.id,
          project_id: project.id,
          workflow_definition_id: workflowDef.id,
          name: "Other Run",
          status: "pending",
          args: {},
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/workflow-runs/${run.id}`,
        headers,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("POST /api/workflow-runs/:id/pause", () => {
    it("should return 401 without authentication", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/workflow-runs/test-id/pause",
      });

      expect(response.statusCode).toBe(401);
    });

    it("should pause a running workflow", async () => {
      const { headers, user } = await createAuthenticatedUser(prisma, app);
      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test",
      });

      const workflowDef = await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: ".workflows/test.ts",
          phases: [],
        },
      });

      const run = await prisma.workflowRun.create({
        data: {
          user_id: user.id,
          project_id: project.id,
          workflow_definition_id: workflowDef.id,
          name: "Test Run",
          status: "running",
          args: {},
          args: {},
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/workflow-runs/${run.id}/pause`,
        headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.status).toBe("paused");
    });

    it("should return 400 if run is not running", async () => {
      const { headers, user } = await createAuthenticatedUser(prisma, app);
      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test",
      });

      const workflowDef = await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: ".workflows/test.ts",
          phases: [],
        },
      });

      const run = await prisma.workflowRun.create({
        data: {
          user_id: user.id,
          project_id: project.id,
          workflow_definition_id: workflowDef.id,
          name: "Test Run",
          status: "completed",
          args: {},
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/workflow-runs/${run.id}/pause`,
        headers,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 403 for other user's run", async () => {
      const { headers } = await createAuthenticatedUser(prisma, app);
      const otherUser = await prisma.user.create({
        data: {
          username: "other-user",
          password_hash: "hash",
          is_active: true,
        },
      });

      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test",
      });

      const workflowDef = await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: ".workflows/test.ts",
          phases: [],
        },
      });

      const run = await prisma.workflowRun.create({
        data: {
          user_id: otherUser.id,
          project_id: project.id,
          workflow_definition_id: workflowDef.id,
          name: "Other Run",
          status: "running",
          args: {},
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/workflow-runs/${run.id}/pause`,
        headers,
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 404 for non-existent run", async () => {
      const { headers } = await createAuthenticatedUser(prisma, app);

      const response = await app.inject({
        method: "POST",
        url: "/api/workflow-runs/clzabc123/pause",
        headers,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /api/workflow-runs/:id/resume", () => {
    it("should return 401 without authentication", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/workflow-runs/test-id/resume",
      });

      expect(response.statusCode).toBe(401);
    });

    it("should resume a paused workflow", async () => {
      const { headers, user } = await createAuthenticatedUser(prisma, app);
      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test",
      });

      const workflowDef = await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: ".workflows/test.ts",
          phases: [],
        },
      });

      const run = await prisma.workflowRun.create({
        data: {
          user_id: user.id,
          project_id: project.id,
          workflow_definition_id: workflowDef.id,
          name: "Test Run",
          status: "paused",
          args: {},
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/workflow-runs/${run.id}/resume`,
        headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.status).toBe("running");
    });

    it("should return 400 if run is not paused", async () => {
      const { headers, user } = await createAuthenticatedUser(prisma, app);
      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test",
      });

      const workflowDef = await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: ".workflows/test.ts",
          phases: [],
        },
      });

      const run = await prisma.workflowRun.create({
        data: {
          user_id: user.id,
          project_id: project.id,
          workflow_definition_id: workflowDef.id,
          name: "Test Run",
          status: "running",
          args: {},
          args: {},
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/workflow-runs/${run.id}/resume`,
        headers,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 403 for other user's run", async () => {
      const { headers } = await createAuthenticatedUser(prisma, app);
      const otherUser = await prisma.user.create({
        data: {
          username: "other-user",
          password_hash: "hash",
          is_active: true,
        },
      });

      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test",
      });

      const workflowDef = await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: ".workflows/test.ts",
          phases: [],
        },
      });

      const run = await prisma.workflowRun.create({
        data: {
          user_id: otherUser.id,
          project_id: project.id,
          workflow_definition_id: workflowDef.id,
          name: "Other Run",
          status: "paused",
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/workflow-runs/${run.id}/resume`,
        headers,
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 404 for non-existent run", async () => {
      const { headers } = await createAuthenticatedUser(prisma, app);

      const response = await app.inject({
        method: "POST",
        url: "/api/workflow-runs/clzabc123/resume",
        headers,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /api/workflow-runs/:id/cancel", () => {
    it("should return 401 without authentication", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/workflow-runs/test-id/cancel",
      });

      expect(response.statusCode).toBe(401);
    });

    it("should cancel a workflow run", async () => {
      const { headers, user } = await createAuthenticatedUser(prisma, app);
      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test",
      });

      const workflowDef = await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: ".workflows/test.ts",
          phases: [],
        },
      });

      const run = await prisma.workflowRun.create({
        data: {
          user_id: user.id,
          project_id: project.id,
          workflow_definition_id: workflowDef.id,
          name: "Test Run",
          status: "running",
          args: {},
          args: {},
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/workflow-runs/${run.id}/cancel`,
        headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.status).toBe("cancelled");
    });

    it("should cancel a paused workflow run", async () => {
      const { headers, user } = await createAuthenticatedUser(prisma, app);
      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test",
      });

      const workflowDef = await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: ".workflows/test.ts",
          phases: [],
        },
      });

      const run = await prisma.workflowRun.create({
        data: {
          user_id: user.id,
          project_id: project.id,
          workflow_definition_id: workflowDef.id,
          name: "Test Run",
          status: "paused",
          args: {},
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/workflow-runs/${run.id}/cancel`,
        headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.status).toBe("cancelled");
    });

    it("should return 403 for other user's run", async () => {
      const { headers } = await createAuthenticatedUser(prisma, app);
      const otherUser = await prisma.user.create({
        data: {
          username: "other-user",
          password_hash: "hash",
          is_active: true,
        },
      });

      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test",
      });

      const workflowDef = await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: ".workflows/test.ts",
          phases: [],
        },
      });

      const run = await prisma.workflowRun.create({
        data: {
          user_id: otherUser.id,
          project_id: project.id,
          workflow_definition_id: workflowDef.id,
          name: "Other Run",
          status: "running",
          args: {},
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/workflow-runs/${run.id}/cancel`,
        headers,
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 404 for non-existent run", async () => {
      const { headers } = await createAuthenticatedUser(prisma, app);

      const response = await app.inject({
        method: "POST",
        url: "/api/workflow-runs/clzabc123/cancel",
        headers,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("State Transition Tests", () => {
    it("should handle invalid state transition pause → pause", async () => {
      const { headers, user } = await createAuthenticatedUser(prisma, app);
      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test",
      });

      const workflowDef = await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: ".workflows/test.ts",
          phases: [],
        },
      });

      const run = await prisma.workflowRun.create({
        data: {
          user_id: user.id,
          project_id: project.id,
          workflow_definition_id: workflowDef.id,
          name: "Test Run",
          status: "paused",
          args: {},
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/workflow-runs/${run.id}/pause`,
        headers,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should handle invalid state transition completed → resume", async () => {
      const { headers, user } = await createAuthenticatedUser(prisma, app);
      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test",
      });

      const workflowDef = await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: ".workflows/test.ts",
          phases: [],
        },
      });

      const run = await prisma.workflowRun.create({
        data: {
          user_id: user.id,
          project_id: project.id,
          workflow_definition_id: workflowDef.id,
          name: "Test Run",
          status: "completed",
          args: {},
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/workflow-runs/${run.id}/resume`,
        headers,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should handle concurrent state changes", async () => {
      const { headers, user } = await createAuthenticatedUser(prisma, app);
      const project = await createTestProject(prisma, {
        name: "Test Project",
        path: "/tmp/test",
      });

      const workflowDef = await prisma.workflowDefinition.create({
        data: {
          project_id: project.id,
          identifier: "test-workflow",
          name: "Test Workflow",
          type: "code",
          path: ".workflows/test.ts",
          phases: [],
        },
      });

      const run = await prisma.workflowRun.create({
        data: {
          user_id: user.id,
          project_id: project.id,
          workflow_definition_id: workflowDef.id,
          name: "Test Run",
          status: "running",
          args: {},
          args: {},
        },
      });

      // Try to pause and cancel simultaneously
      const [pauseResponse, cancelResponse] = await Promise.all([
        app.inject({
          method: "POST",
          url: `/api/workflow-runs/${run.id}/pause`,
          headers,
        }),
        app.inject({
          method: "POST",
          url: `/api/workflow-runs/${run.id}/cancel`,
          headers,
        }),
      ]);

      // One should succeed, at least
      const successResponses = [pauseResponse, cancelResponse].filter(
        (r) => r.statusCode === 200
      );
      expect(successResponses.length).toBeGreaterThanOrEqual(1);
    });
  });
});
