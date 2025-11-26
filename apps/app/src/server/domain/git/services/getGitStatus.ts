import simpleGit from 'simple-git'
import type {
  GitStatus,
  GitFileStatus,
} from '@/shared/types/git.types'
import type { GetGitStatusOptions } from '../types/GetGitStatusOptions'

/**
 * Get the full git status including files, branch, and ahead/behind counts
 */
export async function getGitStatus({ projectPath }: GetGitStatusOptions): Promise<GitStatus> {
  const git = simpleGit(projectPath);

  // Check if directory is a git repository
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    return {
      branch: '',
      files: [],
      ahead: 0,
      behind: 0,
      isRepo: false,
    };
  }

  // Get status
  const status = await git.status();

  // Map files to GitFileStatus format
  const files: GitFileStatus[] = [];

  // Staged files
  for (const file of status.staged) {
    files.push({
      path: file,
      status: 'M',
      staged: true,
    });
  }

  // Modified files (unstaged)
  for (const file of status.modified) {
    if (!status.staged.includes(file)) {
      files.push({
        path: file,
        status: 'M',
        staged: false,
      });
    }
  }

  // Created files (new staged files)
  for (const file of status.created) {
    files.push({
      path: file,
      status: 'A',
      staged: true,
    });
  }

  // Deleted files
  for (const file of status.deleted) {
    files.push({
      path: file,
      status: 'D',
      staged: status.staged.includes(file),
    });
  }

  // Untracked files
  for (const file of status.not_added) {
    files.push({
      path: file,
      status: '??',
      staged: false,
    });
  }

  // Renamed files
  for (const file of status.renamed) {
    files.push({
      path: file.to || file.from,
      status: 'R',
      staged: true,
    });
  }

  return {
    branch: status.current || '',
    files,
    ahead: status.ahead,
    behind: status.behind,
    isRepo: true,
  };
}
