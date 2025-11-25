import simpleGit from 'simple-git'
import type { GitBranch } from '@/shared/types/git.types'
import type { CreateAndSwitchBranchOptions } from '../types/CreateAndSwitchBranchOptions'

/**
 * Create and switch to a branch (idempotent)
 * - If already on target branch → no-op
 * - If branch exists → switch to it
 * - If branch doesn't exist → create from base branch
 * Automatically commits any uncommitted changes before switching
 */
export async function createAndSwitchBranch({
  projectPath,
  branchName,
  from
}: CreateAndSwitchBranchOptions): Promise<{ branch: GitBranch; commands: string[] }> {
  // Validate branch name
  if (!/^[a-zA-Z0-9_/.-]+$/.test(branchName)) {
    throw new Error('Invalid branch name. Only alphanumeric, dash, underscore, dot, and slash allowed.');
  }

  const git = simpleGit(projectPath);
  const commands: string[] = [];

  // Check current branch and if target branch exists
  const branches = await git.branchLocal();
  const currentBranch = branches.current;
  const branchExists = branches.all.includes(branchName);

  // Already on target branch - idempotent success
  if (currentBranch === branchName) {
    return {
      branch: { name: branchName, current: true },
      commands: [],
    };
  }

  // Check for uncommitted changes
  const status = await git.status();
  const hasChanges = status.files.length > 0;

  // If there are uncommitted changes, commit them first
  if (hasChanges) {
    commands.push('git add .');
    await git.add('.');

    const message = `Auto-commit before switching to branch "${branchName}"`;
    commands.push(`git commit -m "${message.replace(/"/g, '\\"')}"`);
    await git.commit(message);
  }

  if (branchExists) {
    // Branch exists - just switch to it
    commands.push(`git checkout ${branchName}`);
    await git.checkout(branchName);
  } else {
    // Branch doesn't exist - checkout from base and create
    if (from) {
      commands.push(`git checkout ${from}`);
      await git.checkout(from);
    }
    commands.push(`git checkout -b ${branchName}`);
    await git.checkoutLocalBranch(branchName);
  }

  return {
    branch: { name: branchName, current: true },
    commands,
  };
}
