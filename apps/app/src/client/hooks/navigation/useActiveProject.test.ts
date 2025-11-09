vi.mock("@/client/stores/index", () => ({
  useNavigationStore: vi.fn(),
}));
vi.mock("@/client/pages/projects/hooks/useProjects", () => ({
  useProjects: vi.fn(),
}));

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useActiveProject } from "./useActiveProject";
import { useNavigationStore } from "@/client/stores/index";
import { useProjects } from "@/client/pages/projects/hooks/useProjects";

describe("useActiveProject", () => {
  const mockProjects = [
    { id: "project-1", name: "Project 1" },
    { id: "project-2", name: "Project 2" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when no active project", () => {
    vi.mocked(useNavigationStore).mockReturnValue(null);
    vi.mocked(useProjects).mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
    } as never);

    const { result } = renderHook(() => useActiveProject());

    expect(result.current.project).toBeNull();
    expect(result.current.projectId).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("should return project when ID matches", () => {
    vi.mocked(useNavigationStore).mockReturnValue("project-1");
    vi.mocked(useProjects).mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
    } as never);

    const { result } = renderHook(() => useActiveProject());

    expect(result.current.project).toEqual(mockProjects[0]);
    expect(result.current.projectId).toBe("project-1");
    expect(result.current.isLoading).toBe(false);
  });

  it("should return null when project ID not found", () => {
    vi.mocked(useNavigationStore).mockReturnValue("nonexistent-id");
    vi.mocked(useProjects).mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
    } as never);

    const { result } = renderHook(() => useActiveProject());

    expect(result.current.project).toBeNull();
    expect(result.current.projectId).toBe("nonexistent-id");
  });

  it("should handle loading state", () => {
    vi.mocked(useNavigationStore).mockReturnValue("project-1");
    vi.mocked(useProjects).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as never);

    const { result } = renderHook(() => useActiveProject());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.project).toBeNull();
  });

  it("should handle error state", () => {
    const mockError = new Error("Failed to fetch projects");
    vi.mocked(useNavigationStore).mockReturnValue("project-1");
    vi.mocked(useProjects).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
    } as never);

    const { result } = renderHook(() => useActiveProject());

    expect(result.current.error).toBe(mockError);
    expect(result.current.project).toBeNull();
  });
});
