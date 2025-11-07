import { describe, it, expect, beforeEach } from "vitest";
import { useNavigationStore } from "./navigationStore";

describe("navigationStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useNavigationStore.setState({
      activeProjectId: null,
      activeSessionId: null,
    });
  });

  it("should have initial state", () => {
    const state = useNavigationStore.getState();
    expect(state.activeProjectId).toBeNull();
    expect(state.activeSessionId).toBeNull();
  });

  it("should set active project", () => {
    useNavigationStore.getState().setActiveProject("project-123");

    const state = useNavigationStore.getState();
    expect(state.activeProjectId).toBe("project-123");
  });

  it("should set active session", () => {
    useNavigationStore.getState().setActiveSession("session-456");

    const state = useNavigationStore.getState();
    expect(state.activeSessionId).toBe("session-456");
  });

  it("should set both project and session", () => {
    useNavigationStore.getState().setActiveProject("project-123");
    useNavigationStore.getState().setActiveSession("session-456");

    const state = useNavigationStore.getState();
    expect(state.activeProjectId).toBe("project-123");
    expect(state.activeSessionId).toBe("session-456");
  });

  it("should clear navigation", () => {
    // Set some initial state
    useNavigationStore.setState({
      activeProjectId: "project-123",
      activeSessionId: "session-456",
    });

    useNavigationStore.getState().clearNavigation();

    const state = useNavigationStore.getState();
    expect(state.activeProjectId).toBeNull();
    expect(state.activeSessionId).toBeNull();
  });

  it("should allow setting null values", () => {
    useNavigationStore.setState({
      activeProjectId: "project-123",
      activeSessionId: "session-456",
    });

    useNavigationStore.getState().setActiveProject(null);
    useNavigationStore.getState().setActiveSession(null);

    const state = useNavigationStore.getState();
    expect(state.activeProjectId).toBeNull();
    expect(state.activeSessionId).toBeNull();
  });
});
