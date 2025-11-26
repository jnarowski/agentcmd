import simpleGit from 'simple-git'
import type { FetchFromRemoteOptions } from '../types/FetchFromRemoteOptions'

/**
 * Fetch changes from remote repository
 */
export async function fetchFromRemote({ projectPath, remote = 'origin' }: FetchFromRemoteOptions): Promise<void> {
  const git = simpleGit(projectPath);
  await git.fetch(remote);
}
