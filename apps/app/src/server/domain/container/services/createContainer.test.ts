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
  beforeEach(async () => {
    vi.clearAllMocks();
    // Clean up test data before each test
    await prisma.container.deleteMany({});
    await prisma.project.deleteMany({
      where: { path: { startsWith: "/tmp/test-create-" } },
    });
  });

  describe("config merging", () => {
    it("merges project preview_config with step overrides correctly", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test-create-1",
          preview_config: {
            ports: { APP_PORT: 3000 },
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
        ports: { APP_PORT: 5000, SERVER_PORT: 5001 },
      });
      vi.mocked(dockerClient.buildAndRun).mockResolvedValue({
        containerIds: ["abc123"],
        composeProject: "container-test",
      });

      await createContainer({
        projectId: project.id,
        workingDir: "/tmp/test-create-1",
        configOverrides: {
          ports: { APP_PORT: 3000, SERVER_PORT: 4000 }, // Override ports
          env: { OVERRIDE_KEY: "override_value" }, // Add new env
          maxMemory: "1g", // Override memory
        },
      });

      expect(dockerClient.buildAndRun).toHaveBeenCalledWith(
        expect.objectContaining({
          ports: { APP_PORT: 5000, SERVER_PORT: 5001 },
          env: {
            DEFAULT_KEY: "default_value",
            OVERRIDE_KEY: "override_value",
          },
          maxMemory: "1g",
        })
      );
    });

    it("uses custom dockerFilePath when provided in project config", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test-create-2",
          preview_config: {
            dockerFilePath: "docker/compose-preview.yml",
            ports: { PORT: 3000 },
          },
        },
      });

      vi.mocked(dockerClient.checkDockerAvailable).mockResolvedValue(true);
      vi.mocked(dockerClient.detectConfig).mockReturnValue({
        type: "compose",
        filePath: "docker/compose-preview.yml",
      });
      vi.mocked(portManager.allocatePorts).mockResolvedValue({
        ports: { PORT: 5000 },
      });
      vi.mocked(dockerClient.buildAndRun).mockResolvedValue({
        containerIds: ["abc123"],
        composeProject: "container-test",
      });

      await createContainer({
        projectId: project.id,
        workingDir: "/tmp/test-create-2",
      });

      expect(dockerClient.detectConfig).toHaveBeenCalledWith(
        "/tmp/test-create-2",
        "docker/compose-preview.yml"
      );
    });

    it("uses custom dockerFilePath when provided in step override", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test-create-3",
          preview_config: {
            ports: { PORT: 3000 },
          },
        },
      });

      vi.mocked(dockerClient.checkDockerAvailable).mockResolvedValue(true);
      vi.mocked(dockerClient.detectConfig).mockReturnValue({
        type: "dockerfile",
        filePath: "custom.dockerfile",
      });
      vi.mocked(portManager.allocatePorts).mockResolvedValue({
        ports: { PORT: 5000 },
      });
      vi.mocked(dockerClient.buildAndRun).mockResolvedValue({
        containerIds: ["abc123"],
      });

      await createContainer({
        projectId: project.id,
        workingDir: "/tmp/test-create-3",
        configOverrides: {
          dockerFilePath: "custom.dockerfile",
        },
      });

      expect(dockerClient.detectConfig).toHaveBeenCalledWith(
        "/tmp/test-create-3",
        "custom.dockerfile"
      );
    });
  });

  describe("port allocation", () => {
    it("calls portManager.allocatePorts with correct portsConfig", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test-create-4",
          preview_config: {
            ports: { SERVER_PORT: 3000, CLIENT_PORT: 4000 },
          },
        },
      });

      vi.mocked(dockerClient.checkDockerAvailable).mockResolvedValue(true);
      vi.mocked(dockerClient.detectConfig).mockReturnValue({
        type: "compose",
        filePath: "docker-compose.yml",
      });
      vi.mocked(portManager.allocatePorts).mockResolvedValue({
        ports: { SERVER_PORT: 5000, CLIENT_PORT: 5001 },
      });
      vi.mocked(dockerClient.buildAndRun).mockResolvedValue({
        containerIds: ["abc123"],
        composeProject: "container-test",
      });

      await createContainer({
        projectId: project.id,
        workingDir: "/tmp/test-create-4",
      });

      expect(portManager.allocatePorts).toHaveBeenCalledWith({
        portsConfig: { SERVER_PORT: 3000, CLIENT_PORT: 4000 },
      });
    });
  });

  describe("Docker unavailable", () => {
    it("gracefully skips when Docker unavailable and returns null", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test-create-5",
          preview_config: {
            ports: { PORT: 3000 },
          },
        },
      });

      vi.mocked(dockerClient.checkDockerAvailable).mockResolvedValue(false);

      const result = await createContainer({
        projectId: project.id,
        workingDir: "/tmp/test-create-5",
      });

      expect(result).toBeNull();
      expect(dockerClient.buildAndRun).not.toHaveBeenCalled();
      expect(portManager.allocatePorts).not.toHaveBeenCalled();
    });
  });

  describe("container lifecycle", () => {
    it("creates Container record with status 'starting'", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test-create-6",
          preview_config: {
            ports: { PORT: 3000 },
          },
        },
      });

      vi.mocked(dockerClient.checkDockerAvailable).mockResolvedValue(true);
      vi.mocked(dockerClient.detectConfig).mockReturnValue({
        type: "compose",
        filePath: "docker-compose.yml",
      });
      vi.mocked(portManager.allocatePorts).mockResolvedValue({
        ports: { PORT: 5000 },
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
        workingDir: "/tmp/test-create-6",
      });

      // Check status is "starting" immediately
      await new Promise((resolve) => setTimeout(resolve, 10));
      const startingContainer = await prisma.container.findFirst({
        where: { project_id: project.id },
      });
      expect(startingContainer?.status).toBe("starting");

      await promise;
    });

    it("updates status to 'running' on successful Docker start", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test-create-7",
          preview_config: {
            ports: { PORT: 3000 },
          },
        },
      });

      vi.mocked(dockerClient.checkDockerAvailable).mockResolvedValue(true);
      vi.mocked(dockerClient.detectConfig).mockReturnValue({
        type: "compose",
        filePath: "docker-compose.yml",
      });
      vi.mocked(portManager.allocatePorts).mockResolvedValue({
        ports: { PORT: 5000 },
      });
      vi.mocked(dockerClient.buildAndRun).mockResolvedValue({
        containerIds: ["abc123"],
        composeProject: "container-test",
      });

      const result = await createContainer({
        projectId: project.id,
        workingDir: "/tmp/test-create-7",
      });

      expect(result?.status).toBe("running");

      const container = await prisma.container.findUnique({
        where: { id: result!.id },
      });
      expect(container?.status).toBe("running");
      expect(container?.started_at).toBeDefined();
    });

    it("updates status to 'failed' on Docker error", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test-create-8",
          preview_config: {
            ports: { PORT: 3000 },
          },
        },
      });

      vi.mocked(dockerClient.checkDockerAvailable).mockResolvedValue(true);
      vi.mocked(dockerClient.detectConfig).mockReturnValue({
        type: "compose",
        filePath: "docker-compose.yml",
      });
      vi.mocked(portManager.allocatePorts).mockResolvedValue({
        ports: { PORT: 5000 },
      });
      vi.mocked(dockerClient.buildAndRun).mockRejectedValue(
        new Error("Docker build failed")
      );

      await expect(
        createContainer({
          projectId: project.id,
          workingDir: "/tmp/test-create-8",
        })
      ).rejects.toThrow("Docker build failed");

      const container = await prisma.container.findFirst({
        where: { project_id: project.id },
      });
      expect(container?.status).toBe("failed");
      expect(container?.error_message).toBe("Docker build failed");
    });
  });

  describe("WebSocket broadcasts", () => {
    it("broadcasts container.created event", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test-create-9",
          preview_config: {
            ports: { PORT: 3000 },
          },
        },
      });

      vi.mocked(dockerClient.checkDockerAvailable).mockResolvedValue(true);
      vi.mocked(dockerClient.detectConfig).mockReturnValue({
        type: "compose",
        filePath: "docker-compose.yml",
      });
      vi.mocked(portManager.allocatePorts).mockResolvedValue({
        ports: { PORT: 5000 },
      });
      vi.mocked(dockerClient.buildAndRun).mockResolvedValue({
        containerIds: ["abc123"],
        composeProject: "container-test",
      });

      const result = await createContainer({
        projectId: project.id,
        workingDir: "/tmp/test-create-9",
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
    });

    it("broadcasts container.updated event on status change to running", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test-create-10",
          preview_config: {
            ports: { PORT: 3000 },
          },
        },
      });

      vi.mocked(dockerClient.checkDockerAvailable).mockResolvedValue(true);
      vi.mocked(dockerClient.detectConfig).mockReturnValue({
        type: "compose",
        filePath: "docker-compose.yml",
      });
      vi.mocked(portManager.allocatePorts).mockResolvedValue({
        ports: { PORT: 5000 },
      });
      vi.mocked(dockerClient.buildAndRun).mockResolvedValue({
        containerIds: ["abc123"],
        composeProject: "container-test",
      });

      await createContainer({
        projectId: project.id,
        workingDir: "/tmp/test-create-10",
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
    });
  });

  describe("return value", () => {
    it("returns container with URLs in localhost:port format", async () => {
      const project = await prisma.project.create({
        data: {
          name: "Test Project",
          path: "/tmp/test-create-11",
          preview_config: {
            ports: { APP_PORT: 3000, SERVER_PORT: 4000 },
          },
        },
      });

      vi.mocked(dockerClient.checkDockerAvailable).mockResolvedValue(true);
      vi.mocked(dockerClient.detectConfig).mockReturnValue({
        type: "compose",
        filePath: "docker-compose.yml",
      });
      vi.mocked(portManager.allocatePorts).mockResolvedValue({
        ports: { APP_PORT: 5000, SERVER_PORT: 5001 },
      });
      vi.mocked(dockerClient.buildAndRun).mockResolvedValue({
        containerIds: ["abc123"],
        composeProject: "container-test",
      });

      const result = await createContainer({
        projectId: project.id,
        workingDir: "/tmp/test-create-11",
      });

      expect(result).toEqual({
        id: expect.any(String),
        status: "running",
        urls: {
          APP_PORT: "http://localhost:5000",
          SERVER_PORT: "http://localhost:5001",
        },
        ports: {
          APP_PORT: 5000,
          SERVER_PORT: 5001,
        },
      });
    });
  });
});
