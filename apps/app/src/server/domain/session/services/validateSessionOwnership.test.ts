import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { createTestUser, createTestProject, createTestSession } from "@/server/test-utils/fixtures";
import { validateSessionOwnership } from "./validateSessionOwnership";

describe("validateSessionOwnership", () => {
  beforeEach(async () => {
    await cleanTestDB(prisma);
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
  });

  it("returns session with project for correct owner", async () => {
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
    const result = await validateSessionOwnership({
      sessionId: session.id,
      userId: user.id,
    });

    // Assert
    expect(result).toBeDefined();
    expect(result.id).toBe(session.id);
    expect(result.userId).toBe(user.id);
    expect(result.project).toBeDefined();
    expect(result.project.id).toBe(project.id);
    expect(result.project.name).toBe("Test Project");
  });

  it("throws error for non-existent session", async () => {
    // Arrange
    const user = await createTestUser(prisma, { email: "test@example.com" });
    const nonExistentId = "clx0000000000000000000001";

    // Act & Assert
    await expect(
      validateSessionOwnership({
        sessionId: nonExistentId,
        userId: user.id,
      })
    ).rejects.toThrow("Session not found");
  });

  it("throws error for wrong user ID", async () => {
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

    // Act & Assert
    await expect(
      validateSessionOwnership({
        sessionId: session.id,
        userId: user2.id,
      })
    ).rejects.toThrow("Unauthorized access to session");
  });

  it("includes project data in returned session", async () => {
    // Arrange
    const user = await createTestUser(prisma, { email: "test@example.com" });
    const project = await createTestProject(prisma, {
      name: "Full Project",
      path: "/tmp/full-project",
      is_starred: true,
    });
    const session = await createTestSession(prisma, {
      projectId: project.id,
      userId: user.id,
      name: "Full Session",
    });

    // Act
    const result = await validateSessionOwnership({
      sessionId: session.id,
      userId: user.id,
    });

    // Assert
    expect(result.project).toBeDefined();
    expect(result.project.name).toBe("Full Project");
    expect(result.project.path).toBe("/tmp/full-project");
    expect(result.project.is_starred).toBe(true);
    expect(result.project.created_at).toBeInstanceOf(Date);
  });

  it("returns session with all fields populated", async () => {
    // Arrange
    const user = await createTestUser(prisma, { email: "test@example.com" });
    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });
    const session = await createTestSession(prisma, {
      projectId: project.id,
      userId: user.id,
      name: "Complex Session",
      cli_session_id: "cli-456",
      session_path: "/custom/path",
      metadata: { key: "value" },
    });

    // Act
    const result = await validateSessionOwnership({
      sessionId: session.id,
      userId: user.id,
    });

    // Assert
    expect(result.name).toBe("Complex Session");
    expect(result.cli_session_id).toBe("cli-456");
    expect(result.session_path).toBe("/custom/path");
    expect(result.metadata).toEqual({ key: "value" });
  });
});
