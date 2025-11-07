import simpleGit from 'simple-git'
import type { CommitChangesOptions } from '../types/CommitChangesOptions'

/**
 * Commit changes with a message
 */
export async function commitChanges({
  projectPath,
  message,
  files
}: CommitChangesOptions): Promise<string> {
  const git = simpleGit(projectPath);

  // Stage files first
  await git.add(files);

  // Commit
  const result = await git.commit(message);

  return result.commit;
}
