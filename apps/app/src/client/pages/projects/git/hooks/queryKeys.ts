/**
 * Query key factory for git operations
 * Flat structure - operations are diverse, not hierarchical CRUD
 */
export const gitKeys = {
  all: ["git"] as const,

  // Status
  status: (path: string) => [...gitKeys.all, "status", path] as const,

  // Diffs
  diff: (path: string, filepath: string | null) =>
    [...gitKeys.all, "diff", path, filepath] as const,

  // History
  history: (path: string, limit: number, offset: number) =>
    [...gitKeys.all, "history", path, limit, offset] as const,
  commit: (path: string, commitHash: string | null) =>
    [...gitKeys.all, "commit", path, commitHash] as const,

  // Stash
  stashList: (path: string) => [...gitKeys.all, "stash", "list", path] as const,

  // PR
  prData: (path: string, baseBranch: string) =>
    [...gitKeys.all, "pr-data", path, baseBranch] as const,

  // Branches
  branches: (path: string) => [...gitKeys.all, "branches", path] as const,
};
