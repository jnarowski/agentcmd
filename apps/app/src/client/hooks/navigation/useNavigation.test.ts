import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useNavigation } from "./useNavigation";
import { useNavigationStore } from "@/client/stores/index";
import { useNavigate } from "react-router-dom";

// Mock react-router-dom
vi.mock("react-router-dom", () => ({
  useNavigate: vi.fn(),
}));

// Mock the store
vi.mock("@/client/stores", () => ({
  useNavigationStore: vi.fn(),
}));

describe("useNavigation", () => {
  const mockNavigate = vi.fn();
  const mockSetActiveProject = vi.fn();
  const mockSetActiveSession = vi.fn();
  const mockClearNavigation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useNavigationStore).mockReturnValue({
      activeProjectId: null,
      activeSessionId: null,
      setActiveProject: mockSetActiveProject,
      setActiveSession: mockSetActiveSession,
      clearNavigation: mockClearNavigation,
    });
  });

  it("should return current navigation state", () => {
    vi.mocked(useNavigationStore).mockReturnValue({
      activeProjectId: "project-1",
      activeSessionId: "session-1",
      setActiveProject: mockSetActiveProject,
      setActiveSession: mockSetActiveSession,
      clearNavigation: mockClearNavigation,
    });

    const { result } = renderHook(() => useNavigation());

    expect(result.current.activeProjectId).toBe("project-1");
    expect(result.current.activeSessionId).toBe("session-1");
  });

  it("should navigate to project and update store", () => {
    const { result } = renderHook(() => useNavigation());

    result.current.goToProject("project-123");

    expect(mockSetActiveProject).toHaveBeenCalledWith("project-123");
    expect(mockNavigate).toHaveBeenCalledWith("/projects/project-123");
  });

  it("should navigate to session and update store", () => {
    const { result } = renderHook(() => useNavigation());

    result.current.goToSession("project-123", "session-456");

    expect(mockSetActiveProject).toHaveBeenCalledWith("project-123");
    expect(mockSetActiveSession).toHaveBeenCalledWith("session-456");
    expect(mockNavigate).toHaveBeenCalledWith(
      "/projects/project-123/chat/session-456"
    );
  });

  it("should clear navigation", () => {
    const { result } = renderHook(() => useNavigation());

    result.current.clearNavigation();

    expect(mockClearNavigation).toHaveBeenCalled();
  });

  it("should call setActiveProject and navigate in correct order", () => {
    const callOrder: string[] = [];

    mockSetActiveProject.mockImplementation(() => {
      callOrder.push("setActiveProject");
    });

    mockNavigate.mockImplementation(() => {
      callOrder.push("navigate");
    });

    const { result } = renderHook(() => useNavigation());
    result.current.goToProject("project-123");

    expect(callOrder).toEqual(["setActiveProject", "navigate"]);
  });

  it("should call both setters and navigate in correct order for session", () => {
    const callOrder: string[] = [];

    mockSetActiveProject.mockImplementation(() => {
      callOrder.push("setActiveProject");
    });

    mockSetActiveSession.mockImplementation(() => {
      callOrder.push("setActiveSession");
    });

    mockNavigate.mockImplementation(() => {
      callOrder.push("navigate");
    });

    const { result } = renderHook(() => useNavigation());
    result.current.goToSession("project-123", "session-456");

    expect(callOrder).toEqual([
      "setActiveProject",
      "setActiveSession",
      "navigate",
    ]);
  });
});
