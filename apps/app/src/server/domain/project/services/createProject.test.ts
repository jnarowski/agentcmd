import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { createProject } from "./createProject";
import * as isGitRepositoryModule from "@/server/domain/git/services/isGitRepository";
import * as checkWorkflowPackageModule from "@/server/domain/project/services/checkWorkflowPackage";

// Mock isGitRepository to avoid filesystem dependencies
vi.mock("@/server/domain/git/services/isGitRepository", () => ({
  isGitRepository: vi.fn(),
}));

// Mock checkWorkflowPackage to avoid filesystem dependencies
vi.mock("@/server/domain/project/services/checkWorkflowPackage", () => ({
  checkWorkflowPackage: vi.fn(),
}));

describe("createProject", () => {
  beforeEach(async () => {
    await cleanTestDB(prisma);
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  describe("success cases", () => {
    it("creates project with git branch detection", async () => {
    // Arrange: Mock capability detection
    const mockIsGitRepository = vi.mocked(isGitRepositoryModule.isGitRepository);
    mockIsGitRepository.mockResolvedValue({
      initialized: true,
      error: null,
      branch: "main",
    });

    const mockCheckWorkflowPackage = vi.mocked(checkWorkflowPackageModule.checkWorkflowPackage);
    mockCheckWorkflowPackage.mockResolvedValue({
      hasPackageJson: true,
      installed: true,
      version: "1.0.0",
    });

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
    expect(project.capabilities.git.initialized).toBe(true);
    expect(project.capabilities.git.branch).toBe("main");
    expect(project.capabilities.workflow_sdk.installed).toBe(true);
    expect(project.created_at).toBeInstanceOf(Date);
    expect(project.updated_at).toBeInstanceOf(Date);

    expect(mockIsGitRepository).toHaveBeenCalledWith("/tmp/test-project");
    expect(mockCheckWorkflowPackage).toHaveBeenCalledWith({ projectPath: "/tmp/test-project" });

    const dbProject = await prisma.project.findUnique({
      where: { id: project.id },
    });
    expect(dbProject).toBeDefined();
    expect(dbProject?.name).toBe("Test Project");
    expect(dbProject?.path).toBe("/tmp/test-project");
    });

    it("creates multiple projects concurrently", async () => {
      // Arrange
      const mockIsGitRepository = vi.mocked(isGitRepositoryModule.isGitRepository);
      mockIsGitRepository.mockResolvedValue({
        initialized: true,
        error: null,
        branch: "main",
      });

      const mockCheckWorkflowPackage = vi.mocked(checkWorkflowPackageModule.checkWorkflowPackage);
      mockCheckWorkflowPackage.mockResolvedValue({
        hasPackageJson: true,
        installed: true,
        version: "1.0.0",
      });

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
      expect(project1.capabilities.git.branch).toBe("main");

      expect(project2.name).toBe("Project 2");
      expect(project2.path).toBe("/tmp/project-2");
      expect(project2.capabilities.git.branch).toBe("main");

      expect(project3.name).toBe("Project 3");
      expect(project3.path).toBe("/tmp/project-3");
      expect(project3.capabilities.git.branch).toBe("main");

      const projects = await prisma.project.findMany({
        orderBy: { name: "asc" },
      });
      expect(projects).toHaveLength(3);
    });

    it("sets timestamps correctly on creation", async () => {
      // Arrange
      const mockIsGitRepository = vi.mocked(isGitRepositoryModule.isGitRepository);
      mockIsGitRepository.mockResolvedValue({
        initialized: true,
        error: null,
        branch: "main",
      });

      const mockCheckWorkflowPackage = vi.mocked(checkWorkflowPackageModule.checkWorkflowPackage);
      mockCheckWorkflowPackage.mockResolvedValue({
        hasPackageJson: false,
        installed: false,
        version: null,
      });

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
    it("sets git capabilities when no git repo", async () => {
    // Arrange: Mock isGitRepository returning not initialized
    const mockIsGitRepository = vi.mocked(isGitRepositoryModule.isGitRepository);
    mockIsGitRepository.mockResolvedValue({
      initialized: false,
      error: null,
      branch: null,
    });

    const mockCheckWorkflowPackage = vi.mocked(checkWorkflowPackageModule.checkWorkflowPackage);
    mockCheckWorkflowPackage.mockResolvedValue({
      hasPackageJson: false,
      installed: false,
      version: null,
    });

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
    expect(project.capabilities.git.initialized).toBe(false);
    expect(project.capabilities.git.branch).toBeNull();

    expect(mockIsGitRepository).toHaveBeenCalledWith("/tmp/non-git-project");
    });

    it("handles errors gracefully and doesn't fail project creation", async () => {
      // Arrange
      const mockIsGitRepository = vi.mocked(isGitRepositoryModule.isGitRepository);
      mockIsGitRepository.mockRejectedValue(new Error("Git command failed"));

      const mockCheckWorkflowPackage = vi.mocked(checkWorkflowPackageModule.checkWorkflowPackage);
      mockCheckWorkflowPackage.mockResolvedValue({
        hasPackageJson: false,
        installed: false,
        version: null,
      });

      const input = {
        name: "Test Project",
        path: "/tmp/test-project",
      };

      // Act
      const project = await createProject({ data: input });

      // Assert: Project still created with error capabilities
      expect(project).toBeDefined();
      expect(project.capabilities.git.initialized).toBe(false);
      expect(project.capabilities.git.error).toBe("Git command failed");
      expect(project.capabilities.git.branch).toBeNull();
    });
  });

  describe("validation & constraints", () => {
    it("rejects duplicate path", async () => {
    // Arrange: Create first project
    const mockIsGitRepository = vi.mocked(isGitRepositoryModule.isGitRepository);
    mockIsGitRepository.mockResolvedValue({
      initialized: true,
      error: null,
      branch: "main",
    });

    const mockCheckWorkflowPackage = vi.mocked(checkWorkflowPackageModule.checkWorkflowPackage);
    mockCheckWorkflowPackage.mockResolvedValue({
      hasPackageJson: false,
      installed: false,
      version: null,
    });

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
    // Arrange: Mock capability detection
    const mockIsGitRepository = vi.mocked(isGitRepositoryModule.isGitRepository);
    mockIsGitRepository.mockResolvedValue({
      initialized: true,
      error: null,
      branch: "main",
    });

    const mockCheckWorkflowPackage = vi.mocked(checkWorkflowPackageModule.checkWorkflowPackage);
    mockCheckWorkflowPackage.mockResolvedValue({
      hasPackageJson: false,
      installed: false,
      version: null,
    });

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
    // Arrange: Mock capability detection
    const mockIsGitRepository = vi.mocked(isGitRepositoryModule.isGitRepository);
    mockIsGitRepository.mockResolvedValue({
      initialized: false,
      error: null,
      branch: null,
    });

    const mockCheckWorkflowPackage = vi.mocked(checkWorkflowPackageModule.checkWorkflowPackage);
    mockCheckWorkflowPackage.mockResolvedValue({
      hasPackageJson: false,
      installed: false,
      version: null,
    });

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
