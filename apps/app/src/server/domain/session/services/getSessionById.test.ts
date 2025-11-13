import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { createTestUser, createTestProject, createTestSession } from "@/server/test-utils/fixtures";
import { getSessionById } from "./getSessionById";

describe("getSessionById", () => {
  afterEach(async () => {
    await cleanTestDB(prisma);
  });

  it("returns session for valid session ID with correct ownership", async () => {
    // Arrange
    const user = await createTestUser(prisma, { email: "test@example.com" });
    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });
    const session = await createTestSession(prisma, {
      projectId: project.id,
      userId: user.id,
      name: "Test Session",
    });

    // Act
    const result = await getSessionById({
      sessionId: session.id,
      projectId: project.id,
      userId: user.id,
    });

    // Assert
    expect(result).toBeDefined();
    expect(result).not.toBeNull();
    expect(result?.id).toBe(session.id);
    expect(result?.name).toBe("Test Session");
    expect(result?.projectId).toBe(project.id);
    expect(result?.userId).toBe(user.id);
  });

  it("returns null for non-existent session ID", async () => {
    // Arrange
    const user = await createTestUser(prisma, { email: "test@example.com" });
    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });
    const nonExistentId = "clx0000000000000000000001";

    // Act
    const result = await getSessionById({
      sessionId: nonExistentId,
      projectId: project.id,
      userId: user.id,
    });

    // Assert
    expect(result).toBeNull();
  });

  it("returns null for session with wrong project ID", async () => {
    // Arrange
    const user = await createTestUser(prisma, { email: "test@example.com" });
    const project1 = await createTestProject(prisma, {
      name: "Project 1",
      path: "/tmp/project-1",
    });
    const project2 = await createTestProject(prisma, {
      name: "Project 2",
      path: "/tmp/project-2",
    });
    const session = await createTestSession(prisma, {
      projectId: project1.id,
      userId: user.id,
    });

    // Act - Query with wrong project ID
    const result = await getSessionById({
      sessionId: session.id,
      projectId: project2.id,
      userId: user.id,
    });

    // Assert
    expect(result).toBeNull();
  });

  it("returns null for session with wrong user ID", async () => {
    // Arrange
    const user1 = await createTestUser(prisma, { email: "user1@example.com" });
    const user2 = await createTestUser(prisma, { email: "user2@example.com" });
    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });
    const session = await createTestSession(prisma, {
      projectId: project.id,
      userId: user1.id,
    });

    // Act - Query with wrong user ID
    const result = await getSessionById({
      sessionId: session.id,
      projectId: project.id,
      userId: user2.id,
    });

    // Assert
    expect(result).toBeNull();
  });

  it("returns session with all fields populated correctly", async () => {
    // Arrange
    const user = await createTestUser(prisma, { email: "test@example.com" });
    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });
    const session = await createTestSession(prisma, {
      projectId: project.id,
      userId: user.id,
      name: "Full Session",
      cli_session_id: "cli-123",
      session_path: "/path/to/session",
      metadata: { key: "value" },
    });

    // Act
    const result = await getSessionById({
      sessionId: session.id,
      projectId: project.id,
      userId: user.id,
    });

    // Assert
    expect(result).not.toBeNull();
    expect(result?.id).toBe(session.id);
    expect(result?.name).toBe("Full Session");
    expect(result?.cli_session_id).toBe("cli-123");
    expect(result?.session_path).toBe("/path/to/session");
    expect(result?.metadata).toEqual({ key: "value" });
    expect(result?.created_at).toBeInstanceOf(Date);
    expect(result?.updated_at).toBeInstanceOf(Date);
  });
});
