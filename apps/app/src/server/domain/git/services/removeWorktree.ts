import simpleGit from "simple-git";
import path from "node:path";

export interface RemoveWorktreeOptions {
  projectPath: string;
  worktreePath: string;
}

/**
 * Remove a git worktree
 * @param options - Configuration for worktree removal
 */
export async function removeWorktree({
  projectPath,
  worktreePath,
}: RemoveWorktreeOptions): Promise<void> {
  const git = simpleGit(projectPath);
  const absolutePath = path.resolve(worktreePath);

  try {
    // Check if worktree exists
    const worktrees = await git.raw(["worktree", "list", "--porcelain"]);
    const exists = worktrees
      .split("\n")
      .some((line) => line.startsWith(`worktree ${absolutePath}`));

    if (!exists) {
      // Worktree doesn't exist - return success (idempotent)
      return;
    }

    // Remove worktree
    await git.raw(["worktree", "remove", absolutePath, "--force"]);
  } catch (error) {
    // Gracefully handle already-removed worktrees
    const errorMsg =
      error instanceof Error ? error.message : String(error);
    if (errorMsg.includes("is not a working tree") || errorMsg.includes("not found")) {
      return; // Already removed
    }
    throw new Error(
      `Failed to remove worktree at ${absolutePath}: ${errorMsg}`
    );
  }
}
