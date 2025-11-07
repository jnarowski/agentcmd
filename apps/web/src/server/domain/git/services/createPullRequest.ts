import simpleGit from 'simple-git'
import { exec } from 'child_process'
import { promisify } from 'util'
import type { PrResult } from '@/shared/types/git.types'
import type { CreatePullRequestOptions } from '../types/CreatePullRequestOptions'
import { checkGhCliAvailable } from './checkGhCliAvailable'

const execAsync = promisify(exec)

/**
 * Create a pull request (tries gh CLI, falls back to web URL)
 */
export async function createPullRequest({
  projectPath,
  title,
  description,
  baseBranch = 'main'
}: CreatePullRequestOptions): Promise<PrResult> {
  try {
    const git = simpleGit(projectPath);

    // Check gh CLI availability
    const ghAvailable = await checkGhCliAvailable({ projectPath });

    if (ghAvailable) {
      // Try using gh CLI
      try {
        const { stdout } = await execAsync(
          `gh pr create --title "${title.replace(/"/g, '\\"')}" --body "${description.replace(/"/g, '\\"')}" --base ${baseBranch}`,
          { cwd: projectPath }
        );

        // Extract PR URL from output
        const urlMatch = stdout.match(/https:\/\/github\.com\/[^\s]+/);
        const prUrl = urlMatch ? urlMatch[0] : undefined;

        return {
          success: true,
          useGhCli: true,
          prUrl,
        };
      } catch {
        // Fall through to web URL method
      }
    }

    // Fallback: construct GitHub compare URL
    const remotes = await git.getRemotes(true);
    const origin = remotes.find((r) => r.name === 'origin');

    if (!origin || !origin.refs.push) {
      throw new Error('No origin remote found');
    }

    // Parse GitHub URL from remote
    // Supports both HTTPS and SSH formats
    let repoPath = '';
    if (origin.refs.push.startsWith('https://')) {
      // HTTPS: https://github.com/owner/repo.git
      const match = origin.refs.push.match(/https:\/\/github\.com\/([^/]+\/[^/]+?)(\.git)?$/);
      repoPath = match ? match[1] : '';
    } else if (origin.refs.push.startsWith('git@')) {
      // SSH: git@github.com:owner/repo.git
      const match = origin.refs.push.match(/git@github\.com:([^/]+\/[^/]+?)(\.git)?$/);
      repoPath = match ? match[1] : '';
    }

    if (!repoPath) {
      throw new Error('Could not parse GitHub repository from remote URL');
    }

    // Get current branch
    const status = await git.status();
    const currentBranch = status.current || 'HEAD';

    const compareUrl = `https://github.com/${repoPath}/compare/${baseBranch}...${currentBranch}?expand=1&title=${encodeURIComponent(title)}&body=${encodeURIComponent(description)}`;

    return {
      success: true,
      useGhCli: false,
      prUrl: compareUrl,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      success: false,
      useGhCli: false,
      error: err.message,
    };
  }
}
