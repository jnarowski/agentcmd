import simpleGit from 'simple-git'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { config } from '@/server/config'
import type { GenerateCommitMessageOptions } from '../types/GenerateCommitMessageOptions'

/**
 * Generate an AI-powered commit message based on staged file diffs
 * Requires ANTHROPIC_API_KEY environment variable to be set
 */
export async function generateCommitMessage({ projectPath, files }: GenerateCommitMessageOptions): Promise<string> {
  const apiKey = config.apiKeys.anthropicApiKey;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured. Please set the environment variable to use AI-generated commit messages.');
  }

  if (!files || files.length === 0) {
    throw new Error('No files provided for commit message generation');
  }

  try {
    const git = simpleGit(projectPath);

    // Get diffs for all selected files
    const diffPromises = files.map(async (file) => {
      try {
        const diff = await git.diff(['--cached', '--text', '--', file]);
        return { file, diff };
      } catch {
        return { file, diff: '' };
      }
    });

    const fileDiffs = await Promise.all(diffPromises);

    // Combine all diffs with file headers
    const combinedDiff = fileDiffs
      .filter((fd) => fd.diff.trim().length > 0)
      .map((fd) => `=== ${fd.file} ===\n${fd.diff}`)
      .join('\n\n');

    if (!combinedDiff || combinedDiff.trim().length === 0) {
      throw new Error('No staged changes found. Please stage files before generating a commit message.');
    }

    // Truncate diff to control token costs (keep first 4000 chars)
    const truncatedDiff = combinedDiff.substring(0, 4000);

    // Generate commit message using AI
    const result = await generateText({
      model: anthropic('claude-sonnet-4-5-20250929'),
      system: `You are an expert at writing clear, concise git commit messages following conventional commit format.

Rules:
1. Use conventional commit format: <type>: <description>
2. Types: feat, fix, refactor, docs, style, test, chore, perf
3. Keep description under 72 characters
4. Be specific about WHAT changed, not HOW
5. Use imperative mood (e.g., "Add feature" not "Added feature")
6. Do NOT include quotes, periods at the end, or explanations
7. Focus on the most significant change if multiple changes exist

Examples:
- "feat: Add user authentication with JWT"
- "fix: Resolve memory leak in file watcher"
- "refactor: Extract git operations to service layer"
- "docs: Update API endpoint documentation"

Response:
Your response must be ONLY the commit message, nothing else.`,
      prompt: `Generate a commit message for these changes:\n\n${truncatedDiff}`,
      temperature: 0.7,
    });

    // Clean up the generated message
    const message = result.text.trim().replace(/['"]/g, '');

    return message || 'Update files';
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    throw err;
  }
}
