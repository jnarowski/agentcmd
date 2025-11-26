import simpleGit from 'simple-git'
import type { CommitChangesOptions } from '../types/CommitChangesOptions'

/**
 * Commit all changes with a message
 * Returns commit SHA and commands executed
 */
export async function commitChanges({
  projectPath,
  message,
}: CommitChangesOptions): Promise<{ commitSha: string; commands: string[] }> {
  const git = simpleGit(projectPath);

  // Stage all and commit
  const cmd = `git add . && git commit -m "${message.replace(/"/g, '\\"')}"`;
  await git.add('.');
  const result = await git.commit(message);

  return {
    commitSha: result.commit,
    commands: [cmd],
  };
}
