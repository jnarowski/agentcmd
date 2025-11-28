import { describe, it, expect, vi, beforeEach } from "vitest";
import { getContainerById } from "./getContainerById";
import { getContainersByProject } from "./getContainersByProject";
import { getContainerLogs } from "./getContainerLogs";
import { prisma } from "@/shared/prisma";
import * as dockerClient from "../utils/dockerClient";

// Mock docker client
vi.mock("../utils/dockerClient");

describe("Container Query Services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getContainerById", () => {
    it("returns container when ID exists", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test",
        },
      });

      const container = await prisma.container.create({
        data: {
          project_id: project.id,
          status: "running",
          ports: { app: 5000 },
          working_dir: "/tmp/test",
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

      await prisma.project.delete({ where: { id: project.id } });
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
          path: "/tmp/test",
        },
      });

      const container = await prisma.container.create({
        data: {
          project_id: project.id,
          status: "running",
          ports: { app: 5000, server: 5001 },
          working_dir: "/tmp/test",
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

      await prisma.project.delete({ where: { id: project.id } });
    });
  });

  describe("getContainersByProject", () => {
    it("returns all containers for project when no filter", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test",
        },
      });

      await prisma.container.create({
        data: {
          project_id: project.id,
          status: "running",
          ports: { app: 5000 },
          working_dir: "/tmp/test",
        },
      });

      await prisma.container.create({
        data: {
          project_id: project.id,
          status: "stopped",
          ports: { app: 5001 },
          working_dir: "/tmp/test",
        },
      });

      const result = await getContainersByProject({ projectId: project.id });

      expect(result).toHaveLength(2);
      expect(result[0].project_id).toBe(project.id);
      expect(result[1].project_id).toBe(project.id);

      await prisma.project.delete({ where: { id: project.id } });
    });

    it("filters by status when provided", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test",
        },
      });

      await prisma.container.create({
        data: {
          project_id: project.id,
          status: "running",
          ports: { app: 5000 },
          working_dir: "/tmp/test",
        },
      });

      await prisma.container.create({
        data: {
          project_id: project.id,
          status: "stopped",
          ports: { app: 5001 },
          working_dir: "/tmp/test",
        },
      });

      const result = await getContainersByProject({
        projectId: project.id,
        status: "running",
      });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("running");

      await prisma.project.delete({ where: { id: project.id } });
    });

    it("returns empty array when project has no containers", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test",
        },
      });

      const result = await getContainersByProject({ projectId: project.id });

      expect(result).toEqual([]);

      await prisma.project.delete({ where: { id: project.id } });
    });

    it("orders by created_at DESC (most recent first)", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test",
        },
      });

      const container1 = await prisma.container.create({
        data: {
          project_id: project.id,
          status: "running",
          ports: { app: 5000 },
          working_dir: "/tmp/test",
          created_at: new Date("2024-01-01"),
        },
      });

      const container2 = await prisma.container.create({
        data: {
          project_id: project.id,
          status: "running",
          ports: { app: 5001 },
          working_dir: "/tmp/test",
          created_at: new Date("2024-01-02"),
        },
      });

      const result = await getContainersByProject({ projectId: project.id });

      expect(result[0].id).toBe(container2.id); // Most recent first
      expect(result[1].id).toBe(container1.id);

      await prisma.project.delete({ where: { id: project.id } });
    });
  });

  describe("getContainerLogs", () => {
    it("calls dockerClient.getLogs with container_ids", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test",
        },
      });

      const container = await prisma.container.create({
        data: {
          project_id: project.id,
          status: "running",
          ports: { app: 5000 },
          working_dir: "/tmp/test",
          container_ids: ["abc123", "def456"],
        },
      });

      vi.mocked(dockerClient.getLogs).mockResolvedValue("Container logs here");

      await getContainerLogs({ containerId: container.id });

      expect(dockerClient.getLogs).toHaveBeenCalledWith({
        containerIds: ["abc123", "def456"],
        workingDir: "/tmp/test",
      });

      await prisma.project.delete({ where: { id: project.id } });
    });

    it("returns logs string from Docker", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test",
        },
      });

      const container = await prisma.container.create({
        data: {
          project_id: project.id,
          status: "running",
          ports: { app: 5000 },
          working_dir: "/tmp/test",
          container_ids: ["abc123"],
        },
      });

      vi.mocked(dockerClient.getLogs).mockResolvedValue(
        "Log line 1\nLog line 2"
      );

      const result = await getContainerLogs({ containerId: container.id });

      expect(result).toBe("Log line 1\nLog line 2");

      await prisma.project.delete({ where: { id: project.id } });
    });

    it("handles Docker errors gracefully (returns error message as logs)", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test",
        },
      });

      const container = await prisma.container.create({
        data: {
          project_id: project.id,
          status: "running",
          ports: { app: 5000 },
          working_dir: "/tmp/test",
          container_ids: ["abc123"],
        },
      });

      vi.mocked(dockerClient.getLogs).mockRejectedValue(
        new Error("Container not running")
      );

      const result = await getContainerLogs({ containerId: container.id });

      expect(result).toContain("Error fetching logs");
      expect(result).toContain("Container not running");

      await prisma.project.delete({ where: { id: project.id } });
    });

    it("throws NotFoundError when container doesn't exist", async () => {
      await expect(
        getContainerLogs({ containerId: "nonexistent" })
      ).rejects.toThrow("Container not found");
    });
  });
});
