import simpleGit from 'simple-git'
import type { GitBranch } from '@/shared/types/git.types'
import type { CreateAndSwitchBranchOptions } from '../types/CreateAndSwitchBranchOptions'

/**
 * Create and switch to a new branch
 * Automatically commits any uncommitted changes before creating the branch
 */
export async function createAndSwitchBranch({
  projectPath,
  branchName,
  from
}: CreateAndSwitchBranchOptions): Promise<GitBranch> {
  // Validate branch name
  if (!/^[a-zA-Z0-9_/-]+$/.test(branchName)) {
    throw new Error('Invalid branch name. Only alphanumeric, dash, underscore, and slash allowed.');
  }

  const git = simpleGit(projectPath);

  // Check for uncommitted changes
  const status = await git.status();
  const hasChanges = status.files.length > 0;

  // If there are uncommitted changes, commit them first
  if (hasChanges) {
    // Stage all files (including untracked)
    await git.add('.');

    // Commit with auto-generated message
    await git.commit(`Auto-commit before creating branch "${branchName}"`);
  }

  // If from branch is specified, checkout from that branch first
  if (from) {
    await git.checkout(from);
  }

  // Create and switch to new branch
  await git.checkoutLocalBranch(branchName);

  return {
    name: branchName,
    current: true,
  };
}
