import simpleGit from "simple-git";
import path from "node:path";

export interface CreateWorktreeOptions {
  projectPath: string;
  branch: string;
  worktreePath?: string;
}

/**
 * Create a git worktree for the specified branch
 * @param options - Configuration for worktree creation
 * @returns Absolute path to the created worktree
 */
export async function createWorktree({
  projectPath,
  branch,
  worktreePath,
}: CreateWorktreeOptions): Promise<string> {
  const git = simpleGit(projectPath);

  // Default worktree path if not provided
  const targetPath =
    worktreePath ?? path.join(projectPath, ".worktrees", branch);
  const absolutePath = path.resolve(targetPath);

  try {
    // Check if worktree already exists
    const worktrees = await git.raw(["worktree", "list", "--porcelain"]);
    const existingWorktree = worktrees
      .split("\n")
      .some((line) => line.startsWith(`worktree ${absolutePath}`));

    if (existingWorktree) {
      // Remove existing worktree and recreate
      await git.raw(["worktree", "remove", absolutePath, "--force"]);
    }

    // Create new worktree
    await git.raw(["worktree", "add", absolutePath, branch]);

    return absolutePath;
  } catch (error) {
    throw new Error(
      `Failed to create worktree at ${absolutePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
