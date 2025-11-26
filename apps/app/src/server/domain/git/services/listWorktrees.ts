import simpleGit from "simple-git";

export interface ListWorktreesOptions {
  projectPath: string;
}

export interface WorktreeInfo {
  path: string;
  branch: string | null;
}

/**
 * List all git worktrees for a repository
 * @param options - Configuration for listing worktrees
 * @returns Array of worktree info objects
 */
export async function listWorktrees({
  projectPath,
}: ListWorktreesOptions): Promise<WorktreeInfo[]> {
  const git = simpleGit(projectPath);

  try {
    const output = await git.raw(["worktree", "list", "--porcelain"]);
    const worktrees: WorktreeInfo[] = [];

    // Parse porcelain output
    // Format:
    // worktree /path/to/worktree
    // HEAD <sha>
    // branch refs/heads/branch-name
    // (blank line between entries)

    const lines = output.split("\n");
    let currentWorktree: Partial<WorktreeInfo> = {};

    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        const path = line.substring(9).trim();
        currentWorktree.path = path;
      } else if (line.startsWith("branch ")) {
        const branchRef = line.substring(7).trim();
        // Extract branch name from refs/heads/branch-name
        currentWorktree.branch = branchRef.replace("refs/heads/", "");
      } else if (line === "" && currentWorktree.path) {
        // End of entry
        worktrees.push({
          path: currentWorktree.path,
          branch: currentWorktree.branch ?? null,
        });
        currentWorktree = {};
      }
    }

    // Handle last entry (no trailing blank line)
    if (currentWorktree.path) {
      worktrees.push({
        path: currentWorktree.path,
        branch: currentWorktree.branch ?? null,
      });
    }

    return worktrees;
  } catch (error) {
    throw new Error(
      `Failed to list worktrees: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
