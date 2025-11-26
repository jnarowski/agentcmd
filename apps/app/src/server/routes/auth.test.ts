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
import { createTestApp, closeTestApp } from "@/server/test-utils/fastify";
import { createTestUser } from "@/server/test-utils/fixtures";
import bcrypt from "bcryptjs";

describe("Auth Routes", () => {
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

  describe("GET /api/auth/status", () => {
    it("returns needsSetup true when no users exist", async () => {
      // Act
      const response = await app.inject({
        method: "GET",
        url: "/api/auth/status",
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.needsSetup).toBe(true);
      expect(body.isAuthenticated).toBe(false);
    });

    it("returns needsSetup false when user exists", async () => {
      // Arrange
      await createTestUser(prisma, { email: "test@example.com" });

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/api/auth/status",
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.needsSetup).toBe(false);
    });
  });

  describe("POST /api/auth/register", () => {
    it("creates user and returns token when no users exist", async () => {
      // Act
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
          email: "newuser@example.com",
          password: "securepassword123",
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe("newuser@example.com");
      expect(body.token).toBeDefined();

      // Verify user in database
      const user = await prisma.user.findUnique({
        where: { email: "newuser@example.com" },
      });
      expect(user).toBeDefined();
      expect(user?.email).toBe("newuser@example.com");
    });

    it("returns 403 when user already exists", async () => {
      // Arrange
      await createTestUser(prisma, { email: "existing@example.com" });

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
          email: "newuser@example.com",
          password: "password123",
        },
      });

      // Assert
      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(body.error.message).toContain("already exists");
    });

    it("returns 400 for invalid email format", async () => {
      // Act
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
          email: "not-an-email",
          password: "password123",
        },
      });

      // Assert
      expect(response.statusCode).toBe(400);
    });

    it("returns 400 for weak password", async () => {
      // Act
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
          email: "user@example.com",
          password: "123", // Too short
        },
      });

      // Assert
      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    it("returns token for valid credentials", async () => {
      // Arrange
      const password = "testpassword123";
      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.user.create({
        data: {
          email: "test@example.com",
          password_hash: passwordHash,
          is_active: true,
        },
      });

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          email: "test@example.com",
          password: password,
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe("test@example.com");
      expect(body.token).toBeDefined();
    });

    it("returns 401 for non-existent user", async () => {
      // Act
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          email: "nonexistent@example.com",
          password: "password123",
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("Invalid email or password");
    });

    it("returns 401 for wrong password", async () => {
      // Arrange
      await createTestUser(prisma, {
        email: "test@example.com",
        password: "correctpassword",
      });

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          email: "test@example.com",
          password: "wrongpassword",
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("Invalid email or password");
    });

    it("returns 403 for inactive user", async () => {
      // Arrange
      await createTestUser(prisma, {
        email: "inactive@example.com",
        password: "password123",
        is_active: false,
      });

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          email: "inactive@example.com",
          password: "password123",
        },
      });

      // Assert
      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("inactive");
    });

    it("updates last_login on successful login", async () => {
      // Arrange
      const user = await createTestUser(prisma, {
        email: "test@example.com",
        password: "password123",
      });
      const oldLastLogin = user.last_login;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Act
      await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          email: "test@example.com",
          password: "password123",
        },
      });

      // Assert
      const updatedUser = await prisma.user.findUnique({
        where: { email: "test@example.com" },
      });
      expect(updatedUser?.last_login).not.toEqual(oldLastLogin);
    });
  });

  describe("GET /api/auth/user", () => {
    it("returns user for authenticated request", async () => {
      // Arrange
      const user = await createTestUser(prisma, { email: "test@example.com" });
      const token = app.jwt.sign({ userId: user.id, email: user.email });

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/api/auth/user",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.data.email).toBe("test@example.com");
    });

    it("returns 401 for missing token", async () => {
      // Act
      const response = await app.inject({
        method: "GET",
        url: "/api/auth/user",
      });

      // Assert
      expect(response.statusCode).toBe(401);
    });

    it("returns 401 for invalid token", async () => {
      // Act
      const response = await app.inject({
        method: "GET",
        url: "/api/auth/user",
        headers: {
          authorization: "Bearer invalid-token",
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
    });
  });
});
