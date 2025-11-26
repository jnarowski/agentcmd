import simpleGit from 'simple-git'
import type { PushToRemoteOptions } from '../types/PushToRemoteOptions'

/**
 * Push changes to remote repository
 */
export async function pushToRemote({
  projectPath,
  branch,
  remote = 'origin'
}: PushToRemoteOptions): Promise<void> {
  const git = simpleGit(projectPath);
  await git.push(remote, branch, ['--set-upstream']);
}
