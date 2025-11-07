import simpleGit from 'simple-git'
import { formatDistanceToNow } from 'date-fns'
import type { GitCommit } from '@/shared/types/git.types'
import type { GetCommitsSinceBaseOptions } from '../types/GetCommitsSinceBaseOptions'

/**
 * Get commits since a base branch (for PR creation)
 */
export async function getCommitsSinceBase({
  projectPath,
  baseBranch = 'main'
}: GetCommitsSinceBaseOptions): Promise<GitCommit[]> {
  const git = simpleGit(projectPath);
  const log = await git.log([`${baseBranch}..HEAD`]);

  const commits: GitCommit[] = log.all.map((commit) => {
    const date = new Date(commit.date);
    return {
      hash: commit.hash,
      shortHash: commit.hash.substring(0, 7),
      message: commit.message,
      author: commit.author_name,
      email: commit.author_email,
      date: date.toISOString(),
      relativeDate: formatDistanceToNow(date, { addSuffix: true }),
    };
  });

  return commits;
}
