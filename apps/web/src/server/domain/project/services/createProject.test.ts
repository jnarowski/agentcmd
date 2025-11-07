import {
  describe,
  it,
  expect,
  afterEach,
  vi,
} from "vitest";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { createProject } from "./createProject";
import * as getCurrentBranchModule from "@/server/domain/git/services/getCurrentBranch";

// Mock getCurrentBranch to avoid filesystem dependencies
vi.mock("@/server/domain/git/services/getCurrentBranch", () => ({
  getCurrentBranch: vi.fn(),
}));

describe("createProject", () => {
  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  describe("success cases", () => {
    it("creates project with git branch detection", async () => {
    // Arrange: Mock git branch detection
    const mockGetCurrentBranch = vi.mocked(
      getCurrentBranchModule.getCurrentBranch
    );
    mockGetCurrentBranch.mockResolvedValue("main");

    const input = {
      name: "Test Project",
      path: "/tmp/test-project",
    };

    // Act: Create project
    const project = await createProject({ data: input });

    // Assert
    expect(project).toBeDefined();
    expect(project.id).toBeDefined();
    expect(project.name).toBe("Test Project");
    expect(project.path).toBe("/tmp/test-project");
    expect(project.is_hidden).toBe(false);
    expect(project.is_starred).toBe(false);
    expect(project.current_branch).toBe("main");
    expect(project.created_at).toBeInstanceOf(Date);
    expect(project.updated_at).toBeInstanceOf(Date);

    expect(mockGetCurrentBranch).toHaveBeenCalledWith({ projectPath: "/tmp/test-project" });
    expect(mockGetCurrentBranch).toHaveBeenCalledTimes(1);

    const dbProject = await prisma.project.findUnique({
      where: { id: project.id },
    });
    expect(dbProject).toBeDefined();
    expect(dbProject?.name).toBe("Test Project");
    expect(dbProject?.path).toBe("/tmp/test-project");
    });

    it("creates multiple projects concurrently", async () => {
      // Arrange
      const mockGetCurrentBranch = vi.mocked(
        getCurrentBranchModule.getCurrentBranch
      );
      mockGetCurrentBranch.mockResolvedValue("main");

      // Act
      const [project1, project2, project3] = await Promise.all([
        createProject({
          data: {
            name: "Project 1",
            path: "/tmp/project-1",
          }
        }),
        createProject({
          data: {
            name: "Project 2",
            path: "/tmp/project-2",
          }
        }),
        createProject({
          data: {
            name: "Project 3",
            path: "/tmp/project-3",
          }
        }),
      ]);

      // Assert
      expect(project1.name).toBe("Project 1");
      expect(project1.path).toBe("/tmp/project-1");
      expect(project1.current_branch).toBe("main");

      expect(project2.name).toBe("Project 2");
      expect(project2.path).toBe("/tmp/project-2");
      expect(project2.current_branch).toBe("main");

      expect(project3.name).toBe("Project 3");
      expect(project3.path).toBe("/tmp/project-3");
      expect(project3.current_branch).toBe("main");

      const projects = await prisma.project.findMany({
        orderBy: { name: "asc" },
      });
      expect(projects).toHaveLength(3);
    });

    it("sets timestamps correctly on creation", async () => {
      // Arrange
      const mockGetCurrentBranch = vi.mocked(
        getCurrentBranchModule.getCurrentBranch
      );
      mockGetCurrentBranch.mockResolvedValue("main");

      // Act
      const project = await createProject({
        data: {
          name: "Test Project",
          path: "/tmp/test-project",
        }
      });

      // Assert
      expect(project.created_at).toBeInstanceOf(Date);
      expect(project.updated_at).toBeInstanceOf(Date);
      expect(project.created_at.getTime()).toBe(project.updated_at.getTime());

      // Verify timestamp is recent (within last 5 seconds)
      const now = Date.now();
      const createdTime = project.created_at.getTime();
      expect(now - createdTime).toBeLessThan(5000);
    });
  });

  describe("git integration", () => {
    it("sets current_branch undefined when no git repo", async () => {
    // Arrange: Mock getCurrentBranch returning null (no git repo)
    const mockGetCurrentBranch = vi.mocked(
      getCurrentBranchModule.getCurrentBranch
    );
    mockGetCurrentBranch.mockResolvedValue(null);

    const input = {
      name: "Non-Git Project",
      path: "/tmp/non-git-project",
    };

    // Act
    const project = await createProject({ data: input });

    // Assert
    expect(project).toBeDefined();
    expect(project.name).toBe("Non-Git Project");
    expect(project.path).toBe("/tmp/non-git-project");
    expect(project.current_branch).toBeUndefined();

    expect(mockGetCurrentBranch).toHaveBeenCalledWith({ projectPath: "/tmp/non-git-project" });
    });

    it("propagates error when getCurrentBranch fails", async () => {
      // Arrange
      const mockGetCurrentBranch = vi.mocked(
        getCurrentBranchModule.getCurrentBranch
      );
      mockGetCurrentBranch.mockRejectedValue(new Error("Git command failed"));

      const input = {
        name: "Test Project",
        path: "/tmp/test-project",
      };

      // Act & Assert
      await expect(createProject({ data: input })).rejects.toThrow("Git command failed");

      // Note: In production, consider catching this error and setting
      // current_branch to null instead of failing the entire operation
    });
  });

  describe("validation & constraints", () => {
    it("rejects duplicate path", async () => {
    // Arrange: Create first project
    const mockGetCurrentBranch = vi.mocked(
      getCurrentBranchModule.getCurrentBranch
    );
    mockGetCurrentBranch.mockResolvedValue("main");

    await createProject({
      data: {
        name: "First Project",
        path: "/tmp/duplicate-path",
      }
    });

    // Act & Assert
    await expect(
      createProject({
        data: {
          name: "Second Project",
          path: "/tmp/duplicate-path",
        }
      })
    ).rejects.toThrow();

    const projects = await prisma.project.findMany({
      where: { path: "/tmp/duplicate-path" },
    });
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe("First Project");
    });

    it("allows empty name (validation happens at route layer)", async () => {
    // Arrange: Mock git branch detection
    const mockGetCurrentBranch = vi.mocked(
      getCurrentBranchModule.getCurrentBranch
    );
    mockGetCurrentBranch.mockResolvedValue("main");

    const input = {
      name: "",
      path: "/tmp/test-project",
    };

    // Act
    const project = await createProject({ data: input });

    // Assert: Prisma doesn't validate empty strings at DB level
    expect(project).toBeDefined();
    expect(project.name).toBe("");
    expect(project.path).toBe("/tmp/test-project");
    });

    it("allows empty path (validation happens at route layer)", async () => {
    // Arrange: Mock git branch detection
    const mockGetCurrentBranch = vi.mocked(
      getCurrentBranchModule.getCurrentBranch
    );
    mockGetCurrentBranch.mockResolvedValue("main");

    const input = {
      name: "Test Project",
      path: "",
    };

    // Act
    const project = await createProject({ data: input });

    // Assert: Prisma doesn't validate empty strings at DB level
    expect(project).toBeDefined();
    expect(project.name).toBe("Test Project");
    expect(project.path).toBe("");
    });
  });
});
