import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Hoist mocks
const { mockExec, mockExistsSync } = vi.hoisted(() => ({
  mockExec: vi.fn(),
  mockExistsSync: vi.fn(),
}));

// Mock util.promisify to return our mock
vi.mock("util", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("util");
  return {
    ...actual,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    promisify: (_fn: any) => mockExec,
  };
});

// Mock modules before import
vi.mock("child_process", () => ({
  exec: vi.fn(),
}));

vi.mock("fs", () => ({
  existsSync: mockExistsSync,
}));

// Import after mocks
import {
  checkDockerAvailable,
  detectConfig,
  buildAndRun,
  stop,
  getLogs,
} from "./dockerClient";

describe("dockerClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("checkDockerAvailable", () => {
    it("returns true when docker is installed", async () => {
      mockExec.mockResolvedValue({ stdout: "Docker version 24.0.0", stderr: "" });

      const result = await checkDockerAvailable();
      expect(result).toBe(true);
      expect(mockExec).toHaveBeenCalledWith("docker --version");
    });

    it("returns false when docker is not installed", async () => {
      mockExec.mockRejectedValue(new Error("command not found"));

      const result = await checkDockerAvailable();
      expect(result).toBe(false);
    });
  });

  describe("detectConfig", () => {
    it("returns compose when docker-compose.yml exists", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return path.endsWith("docker-compose.yml");
      });

      const result = detectConfig("/tmp/test");
      expect(result).toEqual({
        type: "compose",
        filePath: "/tmp/test/docker-compose.yml",
      });
    });

    it("returns compose when docker-compose.yaml exists", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return path.endsWith("docker-compose.yaml");
      });

      const result = detectConfig("/tmp/test");
      expect(result).toEqual({
        type: "compose",
        filePath: "/tmp/test/docker-compose.yaml",
      });
    });

    it("returns compose when compose.yml exists", () => {
      mockExistsSync.mockImplementation((path: string) => {
        // Only compose.yml exists, not docker-compose.yml
        return path === "/tmp/test/compose.yml" || path === "/tmp/test/compose.yaml";
      });

      const result = detectConfig("/tmp/test");
      expect(result).toEqual({
        type: "compose",
        filePath: "/tmp/test/compose.yml",
      });
    });

    it("returns dockerfile when only Dockerfile exists", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return path.includes("Dockerfile");
      });

      const result = detectConfig("/tmp/test");
      expect(result).toEqual({
        type: "dockerfile",
        filePath: "/tmp/test/Dockerfile",
      });
    });

    it("validates and uses custom path when provided", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return path.includes("custom/compose.yml");
      });

      const result = detectConfig("/tmp/test", "/tmp/test/custom/compose.yml");
      expect(result).toEqual({
        type: "compose",
        filePath: "/tmp/test/custom/compose.yml",
      });
    });

    it("throws error when custom path does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      expect(() => detectConfig("/tmp/test", "/tmp/test/missing.yml")).toThrow(
        "Docker file not found"
      );
    });

    it("throws error when no Docker files exist", () => {
      mockExistsSync.mockReturnValue(false);

      expect(() => detectConfig("/tmp/test")).toThrow(
        "No Dockerfile or docker-compose.yml found"
      );
    });

    it("prioritizes custom path over auto-detection", () => {
      mockExistsSync.mockReturnValue(true);

      const result = detectConfig("/tmp/test", "/tmp/test/custom/Dockerfile");
      expect(result.filePath).toBe("/tmp/test/custom/Dockerfile");
    });
  });

  describe("buildAndRun", () => {
    it("builds correct docker compose command with env vars", async () => {
      mockExec.mockResolvedValue({ stdout: "container-id-123", stderr: "" });

      await buildAndRun({
        type: "compose",
        workingDir: "/tmp/test",
        containerId: "abc123",
        ports: { app: 5000, server: 5001 },
        env: { NODE_ENV: "preview" },
      });

      expect(mockExec).toHaveBeenCalled();
      const call = mockExec.mock.calls[0];
      const cmd = call[0] as string;

      expect(cmd).toContain("docker compose");
      expect(cmd).toContain("-p container-abc123");
      expect(cmd).toContain("up -d");
      expect(cmd).toContain("PREVIEW_PORT_APP=5000");
      expect(cmd).toContain("PREVIEW_PORT_SERVER=5001");
      expect(cmd).toContain("NODE_ENV=preview");
    });

    it("includes resource limits when provided", async () => {
      mockExec.mockResolvedValue({ stdout: "container-id-123", stderr: "" });

      await buildAndRun({
        type: "dockerfile",
        workingDir: "/tmp/test",
        containerId: "abc123",
        ports: { app: 5000 },
        maxMemory: "1g",
        maxCpus: "1.0",
      });

      const runCall = mockExec.mock.calls[1][0] as string;

      expect(runCall).toContain("--memory 1g");
      expect(runCall).toContain("--cpus 1.0");
    });

    it("injects PREVIEW_PORT_{NAME} env vars with uppercase port names", async () => {
      mockExec.mockResolvedValue({ stdout: "container-id-123", stderr: "" });

      await buildAndRun({
        type: "compose",
        workingDir: "/tmp/test",
        containerId: "abc123",
        ports: { app: 5000, "my-service": 5001 },
      });

      const call = mockExec.mock.calls[0];
      const cmd = call[0] as string;

      expect(cmd).toContain("PREVIEW_PORT_APP=5000");
      expect(cmd).toContain("PREVIEW_PORT_MY_SERVICE=5001");
    });

    it("builds dockerfile command correctly", async () => {
      mockExec.mockResolvedValue({ stdout: "container-id-123", stderr: "" });

      await buildAndRun({
        type: "dockerfile",
        workingDir: "/tmp/test",
        containerId: "abc123",
        ports: { app: 5000 },
      });

      expect(mockExec).toHaveBeenCalledTimes(2);
      const buildCall = mockExec.mock.calls[0][0] as string;
      const runCall = mockExec.mock.calls[1][0] as string;

      expect(buildCall).toContain("docker build");
      expect(buildCall).toContain("-t container-abc123");

      expect(runCall).toContain("docker run");
      expect(runCall).toContain("-d");
      expect(runCall).toContain("-p 5000:");
      expect(runCall).toContain("--name container-abc123");
    });

    it("returns container IDs and compose project", async () => {
      mockExec.mockResolvedValue({ stdout: "container-id-123\ncontainer-id-456", stderr: "" });

      const result = await buildAndRun({
        type: "compose",
        workingDir: "/tmp/test",
        containerId: "abc123",
        ports: { app: 5000 },
      });

      expect(result.containerIds).toEqual(["container-id-123", "container-id-456"]);
      expect(result.composeProject).toBe("container-abc123");
    });

    it("throws error on Docker failure", async () => {
      mockExec.mockRejectedValue(new Error("Docker build failed"));

      await expect(
        buildAndRun({
          type: "dockerfile",
          workingDir: "/tmp/test",
          containerId: "abc123",
          ports: { app: 5000 },
        })
      ).rejects.toThrow("Docker build failed");
    });
  });

  describe("stop", () => {
    it("builds correct stop command for compose", async () => {
      mockExec.mockResolvedValue({ stdout: "", stderr: "" });

      await stop({
        containerIds: [],
        composeProject: "container-abc123",
        workingDir: "/tmp/test",
      });

      expect(mockExec).toHaveBeenCalled();
      const call = mockExec.mock.calls[0];
      const cmd = call[0] as string;

      expect(cmd).toContain("docker compose");
      expect(cmd).toContain("-p container-abc123");
      expect(cmd).toContain("down");
    });

    it("builds correct stop command for standalone container", async () => {
      mockExec.mockResolvedValue({ stdout: "", stderr: "" });

      await stop({
        containerIds: ["container-id-123"],
        workingDir: "/tmp/test",
      });

      expect(mockExec).toHaveBeenCalledTimes(2);
      const stopCall = mockExec.mock.calls[0][0] as string;
      const rmCall = mockExec.mock.calls[1][0] as string;

      expect(stopCall).toContain("docker stop container-id-123");
      expect(rmCall).toContain("docker rm container-id-123");
    });

    it("handles stop errors gracefully", async () => {
      mockExec.mockRejectedValue(new Error("Container not running"));

      // Should not throw
      await expect(
        stop({
          containerIds: ["missing"],
          workingDir: "/tmp/test",
        })
      ).resolves.not.toThrow();
    });
  });

  describe("getLogs", () => {
    it("fetches logs for container IDs", async () => {
      mockExec.mockResolvedValue({ stdout: "Container logs here", stderr: "" });

      const result = await getLogs({ containerIds: ["container-id-123"] });

      expect(result).toContain("Container logs here");
      expect(mockExec).toHaveBeenCalled();
      const call = mockExec.mock.calls[0];
      const cmd = call[0] as string;

      expect(cmd).toContain("docker logs container-id-123");
    });

    it("combines logs from multiple containers", async () => {
      mockExec
        .mockResolvedValueOnce({ stdout: "Logs from container 1", stderr: "" })
        .mockResolvedValueOnce({ stdout: "Logs from container 2", stderr: "" });

      const result = await getLogs({
        containerIds: ["container-1", "container-2"],
      });

      expect(result).toContain("Logs from container 1");
      expect(result).toContain("Logs from container 2");
    });

    it("returns error message on failure", async () => {
      mockExec.mockRejectedValue(new Error("Container not found"));

      const result = await getLogs({ containerIds: ["missing"] });

      expect(result).toContain("Error fetching logs");
    });
  });
});
