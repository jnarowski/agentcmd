import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/shared/prisma";
import { allocatePorts } from "./portManager";
import * as childProcess from "child_process";

// Mock child_process to avoid actual lsof calls
vi.mock("child_process", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof childProcess;
  return {
    ...actual,
    exec: vi.fn((_cmd, callback) => {
      // Simulate port not in use on system (lsof returns exit code 1)
      const error = new Error("No process found") as Error & { code: number };
      error.code = 1;
      callback(error, "", "");
    }),
  };
});

describe("portManager", () => {
  let testProject: { id: string };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Clean up containers and projects before each test
    await prisma.container.deleteMany({});
    await prisma.project.deleteMany({ where: { name: { startsWith: "test-" } } });

    // Create a test project for foreign key constraint
    testProject = await prisma.project.create({
      data: {
        name: "test-project",
        path: "/tmp/test",
      },
    });
  });

  describe("allocatePorts", () => {
    it("returns preferred ports when available on system and in DB", async () => {
      // Request ports - since system check is mocked to return "not in use",
      // and DB is empty, preferred ports should be returned
      const result = await allocatePorts({ portsConfig: { app: 3000, server: 3001 } });

      expect(result.ports).toEqual({
        app: 3000,
        server: 3001,
      });
    });

    it("avoids ports from running containers", async () => {
      // Create a running container using ports 5000-5001
      await prisma.container.create({
        data: {
          id: "test-container-1",
          project_id: testProject.id,
          status: "running",
          ports: { app: 5000, server: 5001 },
          working_dir: "/tmp/test",
        },
      });

      // Request a port that's in use in DB - should fall back
      const result = await allocatePorts({ portsConfig: { app: 5000 } });

      // Should skip 5000-5001 and allocate 5002
      expect(result.ports).toEqual({ app: 5002 });
    });

    it("allocates multiple preferred ports when all available", async () => {
      const result = await allocatePorts({
        portsConfig: { app: 3000, server: 3001, client: 3002 },
      });

      expect(result.ports).toEqual({
        app: 3000,
        server: 3001,
        client: 3002,
      });
    });

    it("skips ports from multiple running containers", async () => {
      // Create two running containers
      await prisma.container.create({
        data: {
          id: "container-1",
          project_id: testProject.id,
          status: "running",
          ports: { app: 5000 },
          working_dir: "/tmp/test1",
        },
      });

      await prisma.container.create({
        data: {
          id: "container-2",
          project_id: testProject.id,
          status: "running",
          ports: { app: 5001, server: 5002 },
          working_dir: "/tmp/test2",
        },
      });

      // Request ports that are in use in DB - should fall back to 5003+
      const result = await allocatePorts({ portsConfig: { app: 5000, server: 5001 } });

      // Should skip 5000-5002 and allocate 5003-5004
      expect(result.ports).toEqual({
        app: 5003,
        server: 5004,
      });
    });

    it("ignores stopped containers when allocating ports", async () => {
      // Create a stopped container
      await prisma.container.create({
        data: {
          id: "stopped-container",
          project_id: testProject.id,
          status: "stopped",
          ports: { app: 5000 },
          working_dir: "/tmp/test",
        },
      });

      const result = await allocatePorts({ portsConfig: { app: 5000 } });

      // Should reuse 5000 since container is stopped
      expect(result.ports).toEqual({ app: 5000 });
    });

    it("throws error when port range (5000-5999) is exhausted", async () => {
      // Create containers for all ports in the range
      const containers = [];
      for (let i = 5000; i <= 5999; i++) {
        containers.push({
          id: `container-${i}`,
          project_id: testProject.id,
          status: "running",
          ports: { app: i },
          working_dir: "/tmp/test",
        });
      }
      await prisma.container.createMany({ data: containers });

      // Try to allocate ports that are all in use in DB - should fail since no ports left in range
      await expect(
        allocatePorts({ portsConfig: { app: 5000, server: 5001, client: 5002 } })
      ).rejects.toThrow();
    }, 30000);

    it("handles concurrent allocations", async () => {
      // Run allocations concurrently
      const results = await Promise.all([
        allocatePorts({ portsConfig: { app: 3000 } }),
        allocatePorts({ portsConfig: { server: 3001 } }),
        allocatePorts({ portsConfig: { client: 3002 } }),
      ]);

      // Each allocation should succeed and return requested ports
      expect(results).toHaveLength(3);
      expect(results[0].ports).toEqual({ app: 3000 });
      expect(results[1].ports).toEqual({ server: 3001 });
      expect(results[2].ports).toEqual({ client: 3002 });
    });

    it("allocates ports with gaps in running containers", async () => {
      // Create containers with non-consecutive ports
      await prisma.container.create({
        data: {
          id: "container-1",
          project_id: testProject.id,
          status: "running",
          ports: { app: 5000 },
          working_dir: "/tmp/test1",
        },
      });

      await prisma.container.create({
        data: {
          id: "container-2",
          project_id: testProject.id,
          status: "running",
          ports: { app: 5005 },
          working_dir: "/tmp/test2",
        },
      });

      // Request a port that's in use in DB - should fall back to first available (5001)
      const result = await allocatePorts({ portsConfig: { app: 5000 } });

      // Should fill the gap at 5001
      expect(result.ports).toEqual({ app: 5001 });
    });
  });
});
