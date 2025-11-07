import {
  describe,
  it,
  expect,
  beforeAll,
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
import { projectResponseSchema } from "@/server/domain/project/schemas";

describe("GET /api/projects/:id", () => {
  let app: FastifyInstance & { jwt: { sign: (payload: object) => string } };

  beforeAll(async () => {
    // Schema already applied by globalSetup - just create app
    app = await createTestApp();
  });

  afterEach(async () => {
    // Clean data between tests (preserves schema)
    await cleanTestDB(prisma);
  });

  afterAll(async () => {
    // Cleanup resources
    await closeTestApp(app);
    // Database disconnect handled by globalSetup teardown
  });

  it("should return 200 with project data for authenticated valid request", async () => {
    // Arrange: Create test user and project
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });

    // Act: Make request
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${project.id}`,
      headers,
    });

    // Assert: Verify status and response structure
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body).toHaveProperty("data");
    expect(body.data).toMatchObject({
      id: project.id,
      name: "Test Project",
      path: "/tmp/test-project",
      is_hidden: false,
      is_starred: false,
    });

    // Validate response against Zod schema
    const validationResult = projectResponseSchema.safeParse(body);
    expect(validationResult.success).toBe(true);
  });

  it("should return 404 for non-existent project ID", async () => {
    // Arrange: Create test user (but no project)
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    // Use valid CUID format but non-existent ID
    const nonExistentId = "clx0000000000000000000001";

    // Act: Make request
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${nonExistentId}`,
      headers,
    });

    // Assert: Verify 404 response
    expect(response.statusCode).toBe(404);

    const body = JSON.parse(response.body);
    expect(body).toHaveProperty("error");
    expect(body.error).toHaveProperty("message");
    expect(body.error.message).toContain("not found");
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
      url: `/api/projects/${project.id}`,
      // No headers - missing authentication
    });

    // Assert: Verify 401 response
    expect(response.statusCode).toBe(401);

    const body = JSON.parse(response.body);
    expect(body).toHaveProperty("error");
    expect(body.error).toHaveProperty("statusCode", 401);
    expect(body.error.message).toMatch(/unauthorized|invalid|missing token/i);
  });

  it("should return 400 for invalid project ID format", async () => {
    // Arrange: Create test user
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    // Invalid CUID format
    const invalidId = "not-a-valid-cuid-format";

    // Act: Make request with malformed ID
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${invalidId}`,
      headers,
    });

    // Assert: Verify 400 validation error
    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);

    // Fastify validation errors have a flat structure
    expect(body).toHaveProperty("statusCode", 400);
    expect(body).toHaveProperty("error", "Bad Request");
    expect(body).toHaveProperty("message");
    expect(body.message).toContain("Invalid");
  });

  it("should validate response schema with all fields populated", async () => {
    // Arrange: Create test user and project with all fields
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    const project = await createTestProject(prisma, {
      name: "Full Test Project",
      path: "/tmp/full-test-project",
      is_hidden: true,
      is_starred: true,
    });

    // Act: Make request
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${project.id}`,
      headers,
    });

    // Assert: Verify response matches schema
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);

    // Parse with Zod schema - should not throw
    const parseResult = projectResponseSchema.parse(body);

    // Verify all fields are present and correct
    expect(parseResult.data).toMatchObject({
      id: project.id,
      name: "Full Test Project",
      path: "/tmp/full-test-project",
      is_hidden: true,
      is_starred: true,
    });

    // Verify date fields are parsed correctly
    expect(parseResult.data.created_at).toBeInstanceOf(Date);
    expect(parseResult.data.updated_at).toBeInstanceOf(Date);
  });

  it("should handle concurrent requests correctly", async () => {
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

    // Act: Make concurrent requests
    const [response1, response2] = await Promise.all([
      app.inject({
        method: "GET",
        url: `/api/projects/${project1.id}`,
        headers,
      }),
      app.inject({
        method: "GET",
        url: `/api/projects/${project2.id}`,
        headers,
      }),
    ]);

    // Assert: Both requests succeed and return correct data
    expect(response1.statusCode).toBe(200);
    expect(response2.statusCode).toBe(200);

    const body1 = JSON.parse(response1.body);
    const body2 = JSON.parse(response2.body);

    expect(body1.data.id).toBe(project1.id);
    expect(body1.data.name).toBe("Project 1");

    expect(body2.data.id).toBe(project2.id);
    expect(body2.data.name).toBe("Project 2");
  });
});
