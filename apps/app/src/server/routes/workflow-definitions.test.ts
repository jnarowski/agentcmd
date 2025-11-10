import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  afterAll,
} from "vitest";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import {
  createTestApp,
  closeTestApp,
} from "@/server/test-utils/fastify";
import {
  createAuthenticatedUser,
  createTestProject,
  createTestWorkflowDefinition,
  createTestGlobalWorkflowDefinition,
} from "@/server/test-utils/fixtures";

describe("GET /api/projects/:projectId/workflow-definitions", () => {
  let app: FastifyInstance & { jwt: { sign: (payload: object) => string } };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it("should return 200 with workflow definitions including scope field", async () => {
    // Arrange: Create test user and project
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });

    // Create project-scoped workflow
    const projectWorkflow = await createTestWorkflowDefinition(prisma, {
      project_id: project.id,
      name: "Project Workflow",
      identifier: "project-workflow",
    });

    // Act: Make request
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${project.id}/workflow-definitions`,
      headers,
    });

    // Assert: Verify status and response structure
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    // Verify scope field is present
    const workflow = body.data.find((w: any) => w.id === projectWorkflow.id);
    expect(workflow).toBeDefined();
    expect(workflow).toHaveProperty("scope", "project");
    expect(workflow.name).toBe("Project Workflow");
  });

  it("should return both project and global workflows", async () => {
    // Arrange: Create test user and project
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });

    // Create project-scoped workflow
    const projectWorkflow = await createTestWorkflowDefinition(prisma, {
      project_id: project.id,
      name: "Project Workflow",
      identifier: "project-workflow",
    });

    // Create global workflow
    const globalWorkflow = await createTestGlobalWorkflowDefinition(prisma, {
      name: "Global Workflow",
      identifier: "global-workflow",
    });

    // Act: Make request
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${project.id}/workflow-definitions`,
      headers,
    });

    // Assert: Verify both workflows are returned
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.data.length).toBe(2);

    // Find workflows by scope
    const projectWorkflows = body.data.filter((w: any) => w.scope === "project");
    const globalWorkflows = body.data.filter((w: any) => w.scope === "global");

    expect(projectWorkflows.length).toBe(1);
    expect(globalWorkflows.length).toBe(1);

    expect(projectWorkflows[0].id).toBe(projectWorkflow.id);
    expect(globalWorkflows[0].id).toBe(globalWorkflow.id);
  });

  it("should filter by status (active/archived)", async () => {
    // Arrange: Create test user and project
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });

    // Create active and archived workflows
    const activeWorkflow = await createTestWorkflowDefinition(prisma, {
      project_id: project.id,
      name: "Active Workflow",
      identifier: "active-workflow",
      status: "active",
    });

    const archivedWorkflow = await createTestWorkflowDefinition(prisma, {
      project_id: project.id,
      name: "Archived Workflow",
      identifier: "archived-workflow",
      status: "archived",
    });

    // Act: Request only active workflows
    const activeResponse = await app.inject({
      method: "GET",
      url: `/api/projects/${project.id}/workflow-definitions?status=active`,
      headers,
    });

    // Assert: Only active workflow returned
    expect(activeResponse.statusCode).toBe(200);
    const activeBody = JSON.parse(activeResponse.body);
    expect(activeBody.data.length).toBe(1);
    expect(activeBody.data[0].id).toBe(activeWorkflow.id);
    expect(activeBody.data[0].status).toBe("active");

    // Act: Request only archived workflows
    const archivedResponse = await app.inject({
      method: "GET",
      url: `/api/projects/${project.id}/workflow-definitions?status=archived`,
      headers,
    });

    // Assert: Only archived workflow returned
    expect(archivedResponse.statusCode).toBe(200);
    const archivedBody = JSON.parse(archivedResponse.body);
    expect(archivedBody.data.length).toBe(1);
    expect(archivedBody.data[0].id).toBe(archivedWorkflow.id);
    expect(archivedBody.data[0].status).toBe("archived");
  });

  it("should return 401 for missing authentication", async () => {
    // Arrange: Create project (but don't authenticate)
    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });

    // Act: Make request WITHOUT auth header
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${project.id}/workflow-definitions`,
      // No headers - missing authentication
    });

    // Assert: Verify 401 response
    expect(response.statusCode).toBe(401);

    const body = JSON.parse(response.body);
    expect(body).toHaveProperty("error");
    expect(body.error).toHaveProperty("statusCode", 401);
  });

  it("should validate response schema includes scope field", async () => {
    // Arrange: Create test user and project
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });

    // Create workflow with all fields
    await createTestWorkflowDefinition(prisma, {
      project_id: project.id,
      name: "Complete Workflow",
      identifier: "complete-workflow",
      description: "Test description",
      type: "code",
      path: "/tmp/workflow.ts",
      phases: ["phase1", "phase2"],
      args_schema: { type: "object", properties: {} },
      status: "active",
    });

    // Act: Make request
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${project.id}/workflow-definitions`,
      headers,
    });

    // Assert: Verify response matches schema
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.data.length).toBeGreaterThan(0);

    const workflow = body.data[0];

    // Verify all required fields are present
    expect(workflow).toHaveProperty("id");
    expect(workflow).toHaveProperty("scope");
    expect(workflow).toHaveProperty("name");
    expect(workflow).toHaveProperty("description");
    expect(workflow).toHaveProperty("type");
    expect(workflow).toHaveProperty("path");
    expect(workflow).toHaveProperty("phases");
    expect(workflow).toHaveProperty("args_schema");
    expect(workflow).toHaveProperty("is_template");
    expect(workflow).toHaveProperty("load_error");
    expect(workflow).toHaveProperty("created_at");
    expect(workflow).toHaveProperty("updated_at");

    // Verify scope is valid enum
    expect(["project", "global"]).toContain(workflow.scope);
  });

  it("should only return workflows for the specified project", async () => {
    // Arrange: Create test user and multiple projects
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    const project1 = await createTestProject(prisma, {
      name: "Project 1",
      path: "/tmp/project-1",
    });

    const project2 = await createTestProject(prisma, {
      name: "Project 2",
      path: "/tmp/project-2",
    });

    // Create workflow for each project
    const workflow1 = await createTestWorkflowDefinition(prisma, {
      project_id: project1.id,
      name: "Project 1 Workflow",
      identifier: "project-1-workflow",
    });

    const workflow2 = await createTestWorkflowDefinition(prisma, {
      project_id: project2.id,
      name: "Project 2 Workflow",
      identifier: "project-2-workflow",
    });

    // Act: Request workflows for project 1
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${project1.id}/workflow-definitions`,
      headers,
    });

    // Assert: Only project 1 workflow returned (plus any global workflows)
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    const projectWorkflows = body.data.filter((w: any) => w.scope === "project");

    expect(projectWorkflows.length).toBe(1);
    expect(projectWorkflows[0].id).toBe(workflow1.id);

    // Project 2 workflow should NOT be in results
    const hasProject2Workflow = body.data.some((w: any) => w.id === workflow2.id);
    expect(hasProject2Workflow).toBe(false);
  });
});
