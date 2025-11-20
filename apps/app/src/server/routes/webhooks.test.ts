import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import type { FastifyInstance } from "fastify";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import {
  createTestApp,
  closeTestApp,
} from "@/server/test-utils/fastify";
import {
  createAuthenticatedUser,
  createTestProject,
} from "@/server/test-utils/fixtures";

describe("POST /api/projects/:projectId/webhooks", () => {
  let app: FastifyInstance & { jwt: { sign: (payload: object) => string } };

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await cleanTestDB(prisma);
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it("should create webhook with minimal required fields", async () => {
    // Arrange
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });

    // Act
    const response = await app.inject({
      method: "POST",
      url: `/api/projects/${project.id}/webhooks`,
      headers,
      payload: {
        name: "GitHub PR Webhook",
        description: "Triggers workflow on PR events",
        source: "github",
      },
    });

    // Assert
    expect(response.statusCode).toBe(201);

    const body = JSON.parse(response.body);
    expect(body.data).toMatchObject({
      name: "GitHub PR Webhook",
      status: "draft",
    });
    expect(body.data.id).toBeDefined();
    expect(body.data.secret).toBeDefined();
    expect(body.data.secret).toHaveLength(64); // 32 bytes hex = 64 chars
  });

  it("should create webhook with optional fields", async () => {
    // Arrange
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });

    // Act
    const response = await app.inject({
      method: "POST",
      url: `/api/projects/${project.id}/webhooks`,
      headers,
      payload: {
        name: "Linear Issue Webhook",
        description: "Creates tickets from Linear issues",
        source: "linear",
        workflow_identifier: "issue-workflow",
        config: {
          field_mappings: [],
          source_config: {},
        },
      },
    });

    // Assert
    expect(response.statusCode).toBe(201);

    const body = JSON.parse(response.body);
    expect(body.data).toMatchObject({
      name: "Linear Issue Webhook",
      status: "draft",
    });
  });

  it("should return 401 for unauthenticated request", async () => {
    // Arrange
    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });

    // Act - no Authorization header
    const response = await app.inject({
      method: "POST",
      url: `/api/projects/${project.id}/webhooks`,
      payload: {
        name: "Test Webhook",
        source: "github",
      },
    });

    // Assert
    expect(response.statusCode).toBe(401);
  });

  it("should default source to 'generic' when not provided", async () => {
    // Arrange
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });

    // Act
    const response = await app.inject({
      method: "POST",
      url: `/api/projects/${project.id}/webhooks`,
      headers,
      payload: {
        name: "Custom Webhook",
      },
    });

    // Assert
    expect(response.statusCode).toBe(201);

    // Verify in database
    const webhook = await prisma.webhook.findFirst({
      where: { name: "Custom Webhook" },
    });
    expect(webhook?.source).toBe("generic");
  });
});

describe("GET /api/projects/:projectId/webhooks", () => {
  let app: FastifyInstance & { jwt: { sign: (payload: object) => string } };

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await cleanTestDB(prisma);
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it("should return empty array when no webhooks exist", async () => {
    // Arrange
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });

    // Act
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${project.id}/webhooks`,
      headers,
    });

    // Assert
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.data).toEqual([]);
  });

  it("should return all webhooks for a project", async () => {
    // Arrange
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });

    // Create multiple webhooks
    await prisma.webhook.create({
      data: {
        project_id: project.id,
        name: "Webhook 1",
        source: "github",
        secret: "secret1",
        status: "draft",
        config: { field_mappings: [], source_config: {} },
      },
    });

    await prisma.webhook.create({
      data: {
        project_id: project.id,
        name: "Webhook 2",
        source: "linear",
        secret: "secret2",
        status: "active",
        config: { field_mappings: [], source_config: {} },
      },
    });

    // Act
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${project.id}/webhooks`,
      headers,
    });

    // Assert
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.data).toHaveLength(2);
    // Webhooks are ordered by created_at DESC (newest first)
    expect(body.data[0].name).toBe("Webhook 2");
    expect(body.data[1].name).toBe("Webhook 1");
  });

  it("should return 401 for unauthenticated request", async () => {
    // Arrange
    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });

    // Act - no Authorization header
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${project.id}/webhooks`,
    });

    // Assert
    expect(response.statusCode).toBe(401);
  });
});

describe("GET /api/webhooks/:webhookId", () => {
  let app: FastifyInstance & { jwt: { sign: (payload: object) => string } };

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await cleanTestDB(prisma);
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it("should return webhook by ID", async () => {
    // Arrange
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });

    const webhook = await prisma.webhook.create({
      data: {
        project_id: project.id,
        name: "Test Webhook",
        source: "github",
        secret: "test-secret",
        status: "draft",
        config: { field_mappings: [], source_config: {} },
      },
    });

    // Act
    const response = await app.inject({
      method: "GET",
      url: `/api/webhooks/${webhook.id}`,
      headers,
    });

    // Assert
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.data).toMatchObject({
      id: webhook.id,
      name: "Test Webhook",
      source: "github",
      status: "draft",
    });
  });

  it("should return 404 for non-existent webhook", async () => {
    // Arrange
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    const nonExistentId = "clx0000000000000000000001";

    // Act
    const response = await app.inject({
      method: "GET",
      url: `/api/webhooks/${nonExistentId}`,
      headers,
    });

    // Assert
    expect(response.statusCode).toBe(404);
  });

  it("should return 401 for unauthenticated request", async () => {
    // Arrange
    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });

    const webhook = await prisma.webhook.create({
      data: {
        project_id: project.id,
        name: "Test Webhook",
        source: "github",
        secret: "test-secret",
        status: "draft",
        config: { field_mappings: [], source_config: {} },
      },
    });

    // Act - no Authorization header
    const response = await app.inject({
      method: "GET",
      url: `/api/webhooks/${webhook.id}`,
    });

    // Assert
    expect(response.statusCode).toBe(401);
  });
});

describe("PATCH /api/webhooks/:webhookId", () => {
  let app: FastifyInstance & { jwt: { sign: (payload: object) => string } };

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await cleanTestDB(prisma);
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it("should update webhook name", async () => {
    // Arrange
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });

    const webhook = await prisma.webhook.create({
      data: {
        project_id: project.id,
        name: "Original Name",
        source: "github",
        secret: "test-secret",
        status: "draft",
        config: { field_mappings: [], source_config: {} },
      },
    });

    // Act
    const response = await app.inject({
      method: "PATCH",
      url: `/api/webhooks/${webhook.id}`,
      headers,
      payload: {
        name: "Updated Name",
      },
    });

    // Assert
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.data.name).toBe("Updated Name");

    // Verify in database
    const updated = await prisma.webhook.findUnique({
      where: { id: webhook.id },
    });
    expect(updated?.name).toBe("Updated Name");
  });

  it("should update workflow_identifier", async () => {
    // Arrange
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });

    const webhook = await prisma.webhook.create({
      data: {
        project_id: project.id,
        name: "Test Webhook",
        source: "github",
        secret: "test-secret",
        status: "draft",
        config: { field_mappings: [], source_config: {} },
      },
    });

    // Act
    const response = await app.inject({
      method: "PATCH",
      url: `/api/webhooks/${webhook.id}`,
      headers,
      payload: {
        workflow_identifier: "my-workflow",
      },
    });

    // Assert
    expect(response.statusCode).toBe(200);

    const updated = await prisma.webhook.findUnique({
      where: { id: webhook.id },
    });
    expect(updated?.workflow_identifier).toBe("my-workflow");
  });

  it("should return 404 for non-existent webhook", async () => {
    // Arrange
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    const nonExistentId = "clx0000000000000000000001";

    // Act
    const response = await app.inject({
      method: "PATCH",
      url: `/api/webhooks/${nonExistentId}`,
      headers,
      payload: {
        name: "Updated Name",
      },
    });

    // Assert
    expect(response.statusCode).toBe(404);
  });

  it("should return 401 for unauthenticated request", async () => {
    // Arrange
    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });

    const webhook = await prisma.webhook.create({
      data: {
        project_id: project.id,
        name: "Test Webhook",
        source: "github",
        secret: "test-secret",
        status: "draft",
        config: { field_mappings: [], source_config: {} },
      },
    });

    // Act - no Authorization header
    const response = await app.inject({
      method: "PATCH",
      url: `/api/webhooks/${webhook.id}`,
      payload: {
        name: "Updated Name",
      },
    });

    // Assert
    expect(response.statusCode).toBe(401);
  });
});

describe("DELETE /api/webhooks/:webhookId", () => {
  let app: FastifyInstance & { jwt: { sign: (payload: object) => string } };

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await cleanTestDB(prisma);
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it("should delete webhook", async () => {
    // Arrange
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });

    const webhook = await prisma.webhook.create({
      data: {
        project_id: project.id,
        name: "Test Webhook",
        source: "github",
        secret: "test-secret",
        status: "draft",
        config: { field_mappings: [], source_config: {} },
      },
    });

    // Act
    const response = await app.inject({
      method: "DELETE",
      url: `/api/webhooks/${webhook.id}`,
      headers,
    });

    // Assert
    expect(response.statusCode).toBe(204);

    // Verify deleted from database
    const deleted = await prisma.webhook.findUnique({
      where: { id: webhook.id },
    });
    expect(deleted).toBeNull();
  });

  it("should return 404 for non-existent webhook", async () => {
    // Arrange
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    const nonExistentId = "clx0000000000000000000001";

    // Act
    const response = await app.inject({
      method: "DELETE",
      url: `/api/webhooks/${nonExistentId}`,
      headers,
    });

    // Assert
    expect(response.statusCode).toBe(404);
  });

  it("should return 401 for unauthenticated request", async () => {
    // Arrange
    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });

    const webhook = await prisma.webhook.create({
      data: {
        project_id: project.id,
        name: "Test Webhook",
        source: "github",
        secret: "test-secret",
        status: "draft",
        config: { field_mappings: [], source_config: {} },
      },
    });

    // Act - no Authorization header
    const response = await app.inject({
      method: "DELETE",
      url: `/api/webhooks/${webhook.id}`,
    });

    // Assert
    expect(response.statusCode).toBe(401);
  });
});
