import { describe, it, expect, vi, beforeEach } from "vitest";
import { getContainerById } from "./getContainerById";
import { getContainersByProject } from "./getContainersByProject";
import { getContainerLogs } from "./getContainerLogs";
import { prisma } from "@/shared/prisma";
import * as dockerClient from "../utils/dockerClient";

// Mock docker client
vi.mock("../utils/dockerClient");

describe("Container Query Services", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock isContainerRunning to return true for running containers
    vi.mocked(dockerClient.isContainerRunning).mockResolvedValue(true);
    // Clean up test data before each test
    await prisma.container.deleteMany({});
    await prisma.project.deleteMany({
      where: { path: { startsWith: "/tmp/test-query-" } },
    });
  });

  describe("getContainerById", () => {
    it("returns container when ID exists", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test-query-1",
        },
      });

      const container = await prisma.container.create({
        data: {
          project_id: project.id,
          status: "running",
          ports: { app: 5000 },
          working_dir: "/tmp/test-query-1",
        },
      });

      const result = await getContainerById({ containerId: container.id });

      expect(result).toEqual(
        expect.objectContaining({
          id: container.id,
          status: "running",
          project_id: project.id,
        })
      );
    });

    it("throws NotFoundError when ID doesn't exist", async () => {
      await expect(
        getContainerById({ containerId: "nonexistent" })
      ).rejects.toThrow("Container not found");
    });

    it("includes all container fields", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test-query-2",
        },
      });

      const container = await prisma.container.create({
        data: {
          project_id: project.id,
          status: "running",
          ports: { app: 5000, server: 5001 },
          working_dir: "/tmp/test-query-2",
          container_ids: ["abc123"],
          compose_project: "test-project",
        },
      });

      const result = await getContainerById({ containerId: container.id });

      expect(result).toEqual(
        expect.objectContaining({
          id: container.id,
          status: "running",
          ports: { app: 5000, server: 5001 },
          container_ids: ["abc123"],
          compose_project: "test-project",
        })
      );
    });
  });

  describe("getContainersByProject", () => {
    it("returns all containers for project when no filter", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test-query-3",
        },
      });

      await prisma.container.create({
        data: {
          project_id: project.id,
          status: "running",
          ports: { app: 5000 },
          working_dir: "/tmp/test-query-3",
        },
      });

      await prisma.container.create({
        data: {
          project_id: project.id,
          status: "stopped",
          ports: { app: 5001 },
          working_dir: "/tmp/test-query-3",
        },
      });

      const result = await getContainersByProject({ projectId: project.id });

      expect(result).toHaveLength(2);
      expect(result[0].project_id).toBe(project.id);
      expect(result[1].project_id).toBe(project.id);
    });

    it("filters by status when provided", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test-query-4",
        },
      });

      await prisma.container.create({
        data: {
          project_id: project.id,
          status: "running",
          ports: { app: 5000 },
          working_dir: "/tmp/test-query-4",
        },
      });

      await prisma.container.create({
        data: {
          project_id: project.id,
          status: "stopped",
          ports: { app: 5001 },
          working_dir: "/tmp/test-query-4",
        },
      });

      const result = await getContainersByProject({
        projectId: project.id,
        status: "running",
      });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("running");
    });

    it("returns empty array when project has no containers", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test-query-5",
        },
      });

      const result = await getContainersByProject({ projectId: project.id });

      expect(result).toEqual([]);
    });

    it("orders by created_at DESC (most recent first)", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test-query-6",
        },
      });

      const container1 = await prisma.container.create({
        data: {
          project_id: project.id,
          status: "running",
          ports: { app: 5000 },
          working_dir: "/tmp/test-query-6",
          created_at: new Date("2024-01-01"),
        },
      });

      const container2 = await prisma.container.create({
        data: {
          project_id: project.id,
          status: "running",
          ports: { app: 5001 },
          working_dir: "/tmp/test-query-6",
          created_at: new Date("2024-01-02"),
        },
      });

      const result = await getContainersByProject({ projectId: project.id });

      expect(result[0].id).toBe(container2.id); // Most recent first
      expect(result[1].id).toBe(container1.id);
    });
  });

  describe("getContainerLogs", () => {
    it("calls dockerClient.getLogs with container_ids", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test-query-7",
        },
      });

      const container = await prisma.container.create({
        data: {
          project_id: project.id,
          status: "running",
          ports: { app: 5000 },
          working_dir: "/tmp/test-query-7",
          container_ids: ["abc123", "def456"],
        },
      });

      vi.mocked(dockerClient.getLogs).mockResolvedValue("Container logs here");

      await getContainerLogs({ containerId: container.id });

      expect(dockerClient.getLogs).toHaveBeenCalledWith({
        containerIds: ["abc123", "def456"],
        workingDir: "/tmp/test-query-7",
      });
    });

    it("returns logs string from Docker", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test-query-8",
        },
      });

      const container = await prisma.container.create({
        data: {
          project_id: project.id,
          status: "running",
          ports: { app: 5000 },
          working_dir: "/tmp/test-query-8",
          container_ids: ["abc123"],
        },
      });

      vi.mocked(dockerClient.getLogs).mockResolvedValue(
        "Log line 1\nLog line 2"
      );

      const result = await getContainerLogs({ containerId: container.id });

      expect(result).toBe("Log line 1\nLog line 2");
    });

    it("handles Docker errors gracefully (returns error message as logs)", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test-query-9",
        },
      });

      const container = await prisma.container.create({
        data: {
          project_id: project.id,
          status: "running",
          ports: { app: 5000 },
          working_dir: "/tmp/test-query-9",
          container_ids: ["abc123"],
        },
      });

      vi.mocked(dockerClient.getLogs).mockRejectedValue(
        new Error("Container not running")
      );

      const result = await getContainerLogs({ containerId: container.id });

      expect(result).toContain("Error fetching logs");
      expect(result).toContain("Container not running");
    });

    it("throws NotFoundError when container doesn't exist", async () => {
      await expect(
        getContainerLogs({ containerId: "nonexistent" })
      ).rejects.toThrow("Container not found");
    });
  });
});
