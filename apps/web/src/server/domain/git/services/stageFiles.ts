import simpleGit from 'simple-git'
import type { StageFilesOptions } from '../types/StageFilesOptions'

/**
 * Stage files for commit
 */
export async function stageFiles({ projectPath, files }: StageFilesOptions): Promise<void> {
  const git = simpleGit(projectPath);
  await git.add(files);
}
