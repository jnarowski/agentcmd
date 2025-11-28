import { describe, it, expect, vi, beforeEach } from "vitest";
import { createContainer } from "./createContainer";
import { prisma } from "@/shared/prisma";
import * as dockerClient from "../utils/dockerClient";
import * as portManager from "../utils/portManager";
import * as subscriptions from "@/server/websocket/infrastructure/subscriptions";

// Mock docker client and port manager
vi.mock("../utils/dockerClient");
vi.mock("../utils/portManager");
vi.mock("@/server/websocket/infrastructure/subscriptions");

describe("createContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("config merging", () => {
    it("merges project preview_config with step overrides correctly", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test",
          preview_config: {
            ports: ["app"],
            env: { DEFAULT_KEY: "default_value" },
            maxMemory: "512m",
          },
        },
      });

      vi.mocked(dockerClient.checkDockerAvailable).mockResolvedValue(true);
      vi.mocked(dockerClient.detectConfig).mockReturnValue({
        type: "compose",
        filePath: "docker-compose.yml",
      });
      vi.mocked(portManager.allocatePorts).mockResolvedValue({
        ports: { app: 5000, server: 5001 },
      });
      vi.mocked(dockerClient.buildAndRun).mockResolvedValue({
        containerIds: ["abc123"],
        composeProject: "container-test",
      });

      await createContainer({
        projectId: project.id,
        workingDir: "/tmp/test",
        configOverrides: {
          ports: ["app", "server"], // Override ports
          env: { OVERRIDE_KEY: "override_value" }, // Add new env
          maxMemory: "1g", // Override memory
        },
      });

      expect(dockerClient.buildAndRun).toHaveBeenCalledWith(
        expect.objectContaining({
          ports: { app: 5000, server: 5001 },
          env: {
            DEFAULT_KEY: "default_value",
            OVERRIDE_KEY: "override_value",
          },
          maxMemory: "1g",
        })
      );

      await prisma.project.delete({ where: { id: project.id } });
    });

    it("uses custom dockerFilePath when provided in project config", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test",
          preview_config: {
            dockerFilePath: "docker/compose-preview.yml",
            ports: ["app"],
          },
        },
      });

      vi.mocked(dockerClient.checkDockerAvailable).mockResolvedValue(true);
      vi.mocked(dockerClient.detectConfig).mockReturnValue({
        type: "compose",
        filePath: "docker/compose-preview.yml",
      });
      vi.mocked(portManager.allocatePorts).mockResolvedValue({
        ports: { app: 5000 },
      });
      vi.mocked(dockerClient.buildAndRun).mockResolvedValue({
        containerIds: ["abc123"],
        composeProject: "container-test",
      });

      await createContainer({
        projectId: project.id,
        workingDir: "/tmp/test",
      });

      expect(dockerClient.detectConfig).toHaveBeenCalledWith(
        "/tmp/test",
        "docker/compose-preview.yml"
      );

      await prisma.project.delete({ where: { id: project.id } });
    });

    it("uses custom dockerFilePath when provided in step override", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test",
          preview_config: {
            ports: ["app"],
          },
        },
      });

      vi.mocked(dockerClient.checkDockerAvailable).mockResolvedValue(true);
      vi.mocked(dockerClient.detectConfig).mockReturnValue({
        type: "dockerfile",
        filePath: "custom.dockerfile",
      });
      vi.mocked(portManager.allocatePorts).mockResolvedValue({
        ports: { app: 5000 },
      });
      vi.mocked(dockerClient.buildAndRun).mockResolvedValue({
        containerIds: ["abc123"],
      });

      await createContainer({
        projectId: project.id,
        workingDir: "/tmp/test",
        configOverrides: {
          dockerFilePath: "custom.dockerfile",
        },
      });

      expect(dockerClient.detectConfig).toHaveBeenCalledWith(
        "/tmp/test",
        "custom.dockerfile"
      );

      await prisma.project.delete({ where: { id: project.id } });
    });
  });

  describe("port allocation", () => {
    it("calls portManager.allocatePorts with correct port names", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test",
          preview_config: {
            ports: ["server", "client"],
          },
        },
      });

      vi.mocked(dockerClient.checkDockerAvailable).mockResolvedValue(true);
      vi.mocked(dockerClient.detectConfig).mockReturnValue({
        type: "compose",
        filePath: "docker-compose.yml",
      });
      vi.mocked(portManager.allocatePorts).mockResolvedValue({
        ports: { server: 5000, client: 5001 },
      });
      vi.mocked(dockerClient.buildAndRun).mockResolvedValue({
        containerIds: ["abc123"],
        composeProject: "container-test",
      });

      await createContainer({
        projectId: project.id,
        workingDir: "/tmp/test",
      });

      expect(portManager.allocatePorts).toHaveBeenCalledWith({
        portNames: ["server", "client"],
      });

      await prisma.project.delete({ where: { id: project.id } });
    });
  });

  describe("Docker unavailable", () => {
    it("gracefully skips when Docker unavailable and returns null", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test",
          preview_config: {
            ports: ["app"],
          },
        },
      });

      vi.mocked(dockerClient.checkDockerAvailable).mockResolvedValue(false);

      const result = await createContainer({
        projectId: project.id,
        workingDir: "/tmp/test",
      });

      expect(result).toBeNull();
      expect(dockerClient.buildAndRun).not.toHaveBeenCalled();
      expect(portManager.allocatePorts).not.toHaveBeenCalled();

      await prisma.project.delete({ where: { id: project.id } });
    });
  });

  describe("container lifecycle", () => {
    it("creates Container record with status 'starting'", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test",
          preview_config: {
            ports: ["app"],
          },
        },
      });

      vi.mocked(dockerClient.checkDockerAvailable).mockResolvedValue(true);
      vi.mocked(dockerClient.detectConfig).mockReturnValue({
        type: "compose",
        filePath: "docker-compose.yml",
      });
      vi.mocked(portManager.allocatePorts).mockResolvedValue({
        ports: { app: 5000 },
      });

      // Simulate slow Docker start
      vi.mocked(dockerClient.buildAndRun).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({ containerIds: ["abc123"], composeProject: "test" }),
              100
            )
          )
      );

      const promise = createContainer({
        projectId: project.id,
        workingDir: "/tmp/test",
      });

      // Check status is "starting" immediately
      await new Promise((resolve) => setTimeout(resolve, 10));
      const startingContainer = await prisma.container.findFirst({
        where: { project_id: project.id },
      });
      expect(startingContainer?.status).toBe("starting");

      await promise;

      await prisma.project.delete({ where: { id: project.id } });
    });

    it("updates status to 'running' on successful Docker start", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test",
          preview_config: {
            ports: ["app"],
          },
        },
      });

      vi.mocked(dockerClient.checkDockerAvailable).mockResolvedValue(true);
      vi.mocked(dockerClient.detectConfig).mockReturnValue({
        type: "compose",
        filePath: "docker-compose.yml",
      });
      vi.mocked(portManager.allocatePorts).mockResolvedValue({
        ports: { app: 5000 },
      });
      vi.mocked(dockerClient.buildAndRun).mockResolvedValue({
        containerIds: ["abc123"],
        composeProject: "container-test",
      });

      const result = await createContainer({
        projectId: project.id,
        workingDir: "/tmp/test",
      });

      expect(result?.status).toBe("running");

      const container = await prisma.container.findUnique({
        where: { id: result!.id },
      });
      expect(container?.status).toBe("running");
      expect(container?.started_at).toBeDefined();

      await prisma.project.delete({ where: { id: project.id } });
    });

    it("updates status to 'failed' on Docker error", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test",
          preview_config: {
            ports: ["app"],
          },
        },
      });

      vi.mocked(dockerClient.checkDockerAvailable).mockResolvedValue(true);
      vi.mocked(dockerClient.detectConfig).mockReturnValue({
        type: "compose",
        filePath: "docker-compose.yml",
      });
      vi.mocked(portManager.allocatePorts).mockResolvedValue({
        ports: { app: 5000 },
      });
      vi.mocked(dockerClient.buildAndRun).mockRejectedValue(
        new Error("Docker build failed")
      );

      await expect(
        createContainer({
          projectId: project.id,
          workingDir: "/tmp/test",
        })
      ).rejects.toThrow("Docker build failed");

      const container = await prisma.container.findFirst({
        where: { project_id: project.id },
      });
      expect(container?.status).toBe("failed");
      expect(container?.error_message).toBe("Docker build failed");

      await prisma.project.delete({ where: { id: project.id } });
    });
  });

  describe("WebSocket broadcasts", () => {
    it("broadcasts container.created event", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test",
          preview_config: {
            ports: ["app"],
          },
        },
      });

      vi.mocked(dockerClient.checkDockerAvailable).mockResolvedValue(true);
      vi.mocked(dockerClient.detectConfig).mockReturnValue({
        type: "compose",
        filePath: "docker-compose.yml",
      });
      vi.mocked(portManager.allocatePorts).mockResolvedValue({
        ports: { app: 5000 },
      });
      vi.mocked(dockerClient.buildAndRun).mockResolvedValue({
        containerIds: ["abc123"],
        composeProject: "container-test",
      });

      const result = await createContainer({
        projectId: project.id,
        workingDir: "/tmp/test",
      });

      expect(subscriptions.broadcast).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: "container.created",
          data: expect.objectContaining({
            containerId: result!.id,
            status: "starting",
          }),
        })
      );

      await prisma.project.delete({ where: { id: project.id } });
    });

    it("broadcasts container.updated event on status change to running", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test",
          preview_config: {
            ports: ["app"],
          },
        },
      });

      vi.mocked(dockerClient.checkDockerAvailable).mockResolvedValue(true);
      vi.mocked(dockerClient.detectConfig).mockReturnValue({
        type: "compose",
        filePath: "docker-compose.yml",
      });
      vi.mocked(portManager.allocatePorts).mockResolvedValue({
        ports: { app: 5000 },
      });
      vi.mocked(dockerClient.buildAndRun).mockResolvedValue({
        containerIds: ["abc123"],
        composeProject: "container-test",
      });

      await createContainer({
        projectId: project.id,
        workingDir: "/tmp/test",
      });

      expect(subscriptions.broadcast).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: "container.updated",
          data: expect.objectContaining({
            changes: { status: "running" },
          }),
        })
      );

      await prisma.project.delete({ where: { id: project.id } });
    });
  });

  describe("return value", () => {
    it("returns container with URLs in localhost:port format", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test",
          preview_config: {
            ports: ["app", "server"],
          },
        },
      });

      vi.mocked(dockerClient.checkDockerAvailable).mockResolvedValue(true);
      vi.mocked(dockerClient.detectConfig).mockReturnValue({
        type: "compose",
        filePath: "docker-compose.yml",
      });
      vi.mocked(portManager.allocatePorts).mockResolvedValue({
        ports: { app: 5000, server: 5001 },
      });
      vi.mocked(dockerClient.buildAndRun).mockResolvedValue({
        containerIds: ["abc123"],
        composeProject: "container-test",
      });

      const result = await createContainer({
        projectId: project.id,
        workingDir: "/tmp/test",
      });

      expect(result).toEqual({
        id: expect.any(String),
        status: "running",
        urls: {
          app: "http://localhost:5000",
          server: "http://localhost:5001",
        },
        ports: {
          app: 5000,
          server: 5001,
        },
      });

      await prisma.project.delete({ where: { id: project.id } });
    });
  });
});
