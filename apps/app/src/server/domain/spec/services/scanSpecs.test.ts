/**
 * Unit tests for scanSpecs service
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { scanSpecs } from "./scanSpecs";
import fs from "node:fs/promises";
import path from "node:path";

vi.mock("node:fs/promises");
vi.mock("node:path");

describe("scanSpecs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty array when index.json is not found", async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error("File not found"));
    vi.mocked(path.join).mockReturnValue("/fake/path/index.json");

    const result = await scanSpecs("/fake/project/path", "project-123");

    expect(result).toEqual([]);
  });

  it("should filter only specs in todo/ folder", async () => {
    const mockIndex = {
      lastId: 251112070556,
      specs: {
        "251112054939": {
          path: "todo/251112054939-workflow-resync",
          status: "draft",
          created: "2025-11-12T05:49:39.000Z",
          updated: "2025-11-12T05:49:39.000Z",
        },
        "251112061640": {
          path: "done/251112061640-type-safe-workflow-steps",
          status: "completed",
          created: "2025-11-12T06:16:40.000Z",
          updated: "2025-11-12T20:30:00.000Z",
        },
        "251108000000": {
          path: "backlog/251108000000-log-streaming",
          status: "draft",
          created: "2025-11-08T00:00:00.000Z",
          updated: "2025-11-12T00:00:00.000Z",
        },
      },
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockIndex));
    vi.mocked(path.join).mockReturnValue("/fake/path/index.json");

    const result = await scanSpecs("/fake/project/path", "project-123");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("251112054939");
    expect(result[0].specPath).toBe("todo/251112054939-workflow-resync");
    expect(result[0].projectId).toBe("project-123");
  });

  it("should extract display name from folder name", async () => {
    const mockIndex = {
      lastId: 251112070556,
      specs: {
        "251112070556": {
          path: "todo/251112070556-tasks-nav-workflow-integration/spec.md",
          status: "in-progress",
          created: "2025-11-12T07:05:56.000Z",
          updated: "2025-11-12T20:30:00.000Z",
        },
      },
    };

    // Mock index.json read to succeed, spec.md read to fail
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce(JSON.stringify(mockIndex))
      .mockRejectedValueOnce(new Error("spec.md not found"));
    vi.mocked(path.join).mockReturnValue("/fake/path/index.json");

    const result = await scanSpecs("/fake/project/path", "project-123");

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Tasks Nav Workflow Integration");
  });

  it("should set projectId from parameter", async () => {
    const mockIndex = {
      lastId: 251112070556,
      specs: {
        "251112070556": {
          path: "todo/251112070556-tasks-nav-workflow-integration",
          status: "in-progress",
          created: "2025-11-12T07:05:56.000Z",
          updated: "2025-11-12T20:30:00.000Z",
        },
      },
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockIndex));
    vi.mocked(path.join).mockReturnValue("/fake/path/index.json");

    const result = await scanSpecs("/fake/project/path", "project-456");

    expect(result).toHaveLength(1);
    expect(result[0].projectId).toBe("project-456");
  });

  it("should include all spec metadata", async () => {
    const mockIndex = {
      lastId: 251112070556,
      specs: {
        "251112070556": {
          path: "todo/251112070556-tasks-nav-workflow-integration",
          status: "in-progress",
          created: "2025-11-12T07:05:56.000Z",
          updated: "2025-11-12T20:30:00.000Z",
        },
      },
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockIndex));
    vi.mocked(path.join).mockReturnValue("/fake/path/index.json");

    const result = await scanSpecs("/fake/project/path", "project-789");

    expect(result[0]).toMatchObject({
      id: "251112070556",
      name: expect.any(String),
      specPath: "todo/251112070556-tasks-nav-workflow-integration",
      projectId: "project-789",
      status: "in-progress",
      created_at: "2025-11-12T07:05:56.000Z",
    });
  });
});
