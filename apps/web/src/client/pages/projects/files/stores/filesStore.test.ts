import { describe, it, expect, beforeEach } from "vitest";
import { useFilesStore } from "./filesStore";

describe("filesStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useFilesStore.setState({
      expandedDirs: new Set<string>(),
      selectedFile: null,
      searchQuery: "",
    });
  });

  it("should have initial state", () => {
    const state = useFilesStore.getState();
    expect(state.expandedDirs.size).toBe(0);
    expect(state.selectedFile).toBeNull();
    expect(state.searchQuery).toBe("");
  });

  it("should toggle directory expansion", () => {
    // Toggle to expand
    useFilesStore.getState().toggleDir("/src");
    let state = useFilesStore.getState();
    expect(state.expandedDirs.has("/src")).toBe(true);

    // Toggle to collapse
    useFilesStore.getState().toggleDir("/src");
    state = useFilesStore.getState();
    expect(state.expandedDirs.has("/src")).toBe(false);
  });

  it("should expand directory", () => {
    useFilesStore.getState().expandDir("/src");

    const state = useFilesStore.getState();
    expect(state.expandedDirs.has("/src")).toBe(true);
  });

  it("should collapse directory", () => {
    // First expand it
    useFilesStore.setState({
      expandedDirs: new Set(["/src"]),
      selectedFile: null,
      searchQuery: "",
    });

    useFilesStore.getState().collapseDir("/src");

    const state = useFilesStore.getState();
    expect(state.expandedDirs.has("/src")).toBe(false);
  });

  it("should handle multiple expanded directories", () => {
    useFilesStore.getState().expandDir("/src");
    useFilesStore.getState().expandDir("/lib");
    useFilesStore.getState().expandDir("/components");

    const state = useFilesStore.getState();
    expect(state.expandedDirs.size).toBe(3);
    expect(state.expandedDirs.has("/src")).toBe(true);
    expect(state.expandedDirs.has("/lib")).toBe(true);
    expect(state.expandedDirs.has("/components")).toBe(true);
  });

  it("should set selected file", () => {
    useFilesStore.getState().setSelectedFile("/src/index.ts");

    const state = useFilesStore.getState();
    expect(state.selectedFile).toBe("/src/index.ts");
  });

  it("should update selected file", () => {
    useFilesStore.getState().setSelectedFile("/src/index.ts");
    useFilesStore.getState().setSelectedFile("/src/app.ts");

    const state = useFilesStore.getState();
    expect(state.selectedFile).toBe("/src/app.ts");
  });

  it("should set search query", () => {
    useFilesStore.getState().setSearch("component");

    const state = useFilesStore.getState();
    expect(state.searchQuery).toBe("component");
  });

  it("should clear selection", () => {
    useFilesStore.setState({
      expandedDirs: new Set<string>(),
      selectedFile: "/src/index.ts",
      searchQuery: "",
    });

    useFilesStore.getState().clearSelection();

    const state = useFilesStore.getState();
    expect(state.selectedFile).toBeNull();
  });

  it("should handle immutable Set updates", () => {
    const store = useFilesStore.getState();
    store.expandDir("/src");

    const firstState = useFilesStore.getState();
    const firstSet = firstState.expandedDirs;

    store.expandDir("/lib");

    const secondState = useFilesStore.getState();
    const secondSet = secondState.expandedDirs;

    // Sets should be different instances (immutable)
    expect(firstSet).not.toBe(secondSet);
    expect(firstSet.size).toBe(1);
    expect(secondSet.size).toBe(2);
  });
});
