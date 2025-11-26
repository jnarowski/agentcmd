import simpleGit from 'simple-git'
import type { GitBranch } from '@/shared/types/git.types'
import type { SwitchBranchOptions } from '../types/SwitchBranchOptions'

/**
 * Switch to an existing branch
 */
export async function switchBranch({ projectPath, branchName }: SwitchBranchOptions): Promise<GitBranch> {
  const git = simpleGit(projectPath);
  await git.checkout(branchName);

  return {
    name: branchName,
    current: true,
  };
}
