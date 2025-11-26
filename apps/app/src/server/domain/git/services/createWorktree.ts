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

    // Check if branch exists (locally or remotely)
    const branchExists = await checkBranchExists(git, branch);

    if (branchExists) {
      // Checkout existing branch
      await git.raw(["worktree", "add", absolutePath, branch]);
    } else {
      // Create new branch from current HEAD
      await git.raw(["worktree", "add", "-b", branch, absolutePath]);
    }

    return absolutePath;
  } catch (error) {
    throw new Error(
      `Failed to create worktree at ${absolutePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

async function checkBranchExists(
  git: ReturnType<typeof simpleGit>,
  branch: string
): Promise<boolean> {
  try {
    // Check local branches
    const localBranches = await git.branchLocal();
    if (localBranches.all.includes(branch)) {
      return true;
    }

    // Check remote branches (origin/<branch>)
    const remoteBranches = await git.branch(["-r"]);
    const remoteBranchName = `origin/${branch}`;
    if (remoteBranches.all.includes(remoteBranchName)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
