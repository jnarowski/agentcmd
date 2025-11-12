import simpleGit from 'simple-git'
import type { GitBranch } from '@/shared/types/git.types'
import type { CreateAndSwitchBranchOptions } from '../types/CreateAndSwitchBranchOptions'

/**
 * Create and switch to a new branch
 * Automatically commits any uncommitted changes before creating the branch
 * Returns branch info and commands executed
 */
export async function createAndSwitchBranch({
  projectPath,
  branchName,
  from
}: CreateAndSwitchBranchOptions): Promise<{ branch: GitBranch; commands: string[] }> {
  // Validate branch name
  if (!/^[a-zA-Z0-9_/-]+$/.test(branchName)) {
    throw new Error('Invalid branch name. Only alphanumeric, dash, underscore, and slash allowed.');
  }

  const git = simpleGit(projectPath);
  const commands: string[] = [];

  // Check for uncommitted changes
  const status = await git.status();
  const hasChanges = status.files.length > 0;

  // If there are uncommitted changes, commit them first
  if (hasChanges) {
    // Stage all files (including untracked)
    commands.push('git add .');
    await git.add('.');

    // Commit with auto-generated message
    const message = `Auto-commit before creating branch "${branchName}"`;
    commands.push(`git commit -m "${message.replace(/"/g, '\\"')}"`);
    await git.commit(message);
  }

  // If from branch is specified, checkout from that branch first
  if (from) {
    commands.push(`git checkout ${from}`);
    await git.checkout(from);
  }

  // Create and switch to new branch
  commands.push(`git checkout -b ${branchName}`);
  await git.checkoutLocalBranch(branchName);

  return {
    branch: {
      name: branchName,
      current: true,
    },
    commands,
  };
}
