import simpleGit from 'simple-git'
import type { PullFromRemoteOptions } from '../types/PullFromRemoteOptions'

/**
 * Pull changes from remote repository
 */
export async function pullFromRemote({
  projectPath,
  remote,
  branch
}: PullFromRemoteOptions): Promise<void> {
  const git = simpleGit(projectPath);
  await git.pull(remote, branch);
}
