import simpleGit from 'simple-git'
import type { GitCommitDiff } from '@/shared/types/git.types'
import type { GetCommitDiffOptions } from '../types/GetCommitDiffOptions'

/**
 * Get detailed diff for a specific commit
 */
export async function getCommitDiff({ projectPath, commitHash }: GetCommitDiffOptions): Promise<GitCommitDiff> {
  const git = simpleGit(projectPath);

  // Get commit details
  const commits = await git.log({ maxCount: 1, from: commitHash });
  const commit = commits.all[0];

  if (!commit) {
    throw new Error('Commit not found');
  }

  // Get full diff
  const diff = await git.diff([`${commitHash}^`, commitHash]);

  // Get stats using show
  const showOutput = await git.show([commitHash, '--stat', '--format=']);

  // Parse stats from show output
  const statsMatch = showOutput.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/);
  const filesChanged = statsMatch ? parseInt(statsMatch[1], 10) : 0;
  const insertions = statsMatch && statsMatch[2] ? parseInt(statsMatch[2], 10) : 0;
  const deletions = statsMatch && statsMatch[3] ? parseInt(statsMatch[3], 10) : 0;

  return {
    hash: commit.hash,
    message: commit.message,
    author: commit.author_name,
    email: commit.author_email,
    date: new Date(commit.date).toISOString(),
    filesChanged,
    insertions,
    deletions,
    diff,
  };
}
