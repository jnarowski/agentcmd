import simpleGit from 'simple-git'
import type { CommitChangesOptions } from '../types/CommitChangesOptions'

/**
 * Commit changes with a message
 * Returns commit SHA and commands executed
 */
export async function commitChanges({
  projectPath,
  message,
  files
}: CommitChangesOptions): Promise<{ commitSha: string; commands: string[] }> {
  const git = simpleGit(projectPath);

  const commands: string[] = [];

  // Stage files first
  const addCmd = `git add ${files.join(' ')}`;
  commands.push(addCmd);
  await git.add(files);

  // Commit
  const commitCmd = `git commit -m "${message.replace(/"/g, '\\"')}"`;
  commands.push(commitCmd);
  const result = await git.commit(message);

  return {
    commitSha: result.commit,
    commands,
  };
}
