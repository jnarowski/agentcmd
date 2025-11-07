import simpleGit from 'simple-git'
import { formatDistanceToNow } from 'date-fns'
import type { GitCommit } from '@/shared/types/git.types'
import type { GetCommitHistoryOptions } from '../types/GetCommitHistoryOptions'

/**
 * Get commit history with pagination
 */
export async function getCommitHistory({
  projectPath,
  limit = 100,
  offset = 0
}: GetCommitHistoryOptions): Promise<GitCommit[]> {
  const git = simpleGit(projectPath);
  const log = await git.log({
    maxCount: limit,
    from: offset > 0 ? `HEAD~${offset}` : undefined,
  });

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
