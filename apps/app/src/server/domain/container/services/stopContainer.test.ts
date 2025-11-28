import { describe, it, expect, vi, beforeEach } from "vitest";
import { stopContainer } from "./stopContainer";
import { prisma } from "@/shared/prisma";
import * as dockerClient from "../utils/dockerClient";
import * as subscriptions from "@/server/websocket/infrastructure/subscriptions";

// Mock docker client and WebSocket
vi.mock("../utils/dockerClient");
vi.mock("@/server/websocket/infrastructure/subscriptions");

describe("stopContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches container from DB and validates it exists", async () => {
    // Create test project and container
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
        compose_project: "container-test",
      },
    });

    vi.mocked(dockerClient.stop).mockResolvedValue(undefined);

    await stopContainer({ containerId: container.id });

    const updated = await prisma.container.findUnique({
      where: { id: container.id },
    });
    expect(updated?.status).toBe("stopped");

    await prisma.project.delete({ where: { id: project.id } });
  });

  it("throws NotFoundError when container doesn't exist", async () => {
    await expect(
      stopContainer({ containerId: "nonexistent" })
    ).rejects.toThrow("Container not found");
  });

  it("calls dockerClient.stop with correct container_ids and compose_project", async () => {
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
        compose_project: "container-test",
      },
    });

    vi.mocked(dockerClient.stop).mockResolvedValue(undefined);

    await stopContainer({ containerId: container.id });

    expect(dockerClient.stop).toHaveBeenCalledWith({
      containerIds: ["abc123", "def456"],
      composeProject: "container-test",
      workingDir: "/tmp/test",
    });

    await prisma.project.delete({ where: { id: project.id } });
  });

  it("updates Container status to stopped in DB", async () => {
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

    vi.mocked(dockerClient.stop).mockResolvedValue(undefined);

    const result = await stopContainer({ containerId: container.id });

    expect(result.status).toBe("stopped");

    const updated = await prisma.container.findUnique({
      where: { id: container.id },
    });
    expect(updated?.status).toBe("stopped");

    await prisma.project.delete({ where: { id: project.id } });
  });

  it("sets stopped_at timestamp", async () => {
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

    vi.mocked(dockerClient.stop).mockResolvedValue(undefined);

    await stopContainer({ containerId: container.id });

    const updated = await prisma.container.findUnique({
      where: { id: container.id },
    });
    expect(updated?.stopped_at).toBeDefined();
    expect(updated?.stopped_at).toBeInstanceOf(Date);

    await prisma.project.delete({ where: { id: project.id } });
  });

  it("broadcasts container.updated WebSocket event with changes object", async () => {
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

    vi.mocked(dockerClient.stop).mockResolvedValue(undefined);

    await stopContainer({ containerId: container.id });

    expect(subscriptions.broadcast).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        type: "container.updated",
        data: expect.objectContaining({
          containerId: container.id,
          changes: { status: "stopped" },
        }),
      })
    );

    await prisma.project.delete({ where: { id: project.id } });
  });

  it("gracefully handles Docker errors", async () => {
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

    vi.mocked(dockerClient.stop).mockRejectedValue(
      new Error("Docker stop failed")
    );

    await expect(
      stopContainer({ containerId: container.id })
    ).rejects.toThrow("Docker stop failed");

    const updated = await prisma.container.findUnique({
      where: { id: container.id },
    });
    expect(updated?.status).toBe("failed");
    expect(updated?.error_message).toBe("Docker stop failed");

    await prisma.project.delete({ where: { id: project.id } });
  });

  it("returns updated container object", async () => {
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

    vi.mocked(dockerClient.stop).mockResolvedValue(undefined);

    const result = await stopContainer({ containerId: container.id });

    expect(result).toEqual(
      expect.objectContaining({
        id: container.id,
        status: "stopped",
        project_id: project.id,
      })
    );

    await prisma.project.delete({ where: { id: project.id } });
  });
});
