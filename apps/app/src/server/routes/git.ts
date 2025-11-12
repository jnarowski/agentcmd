import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { buildSuccessResponse } from '@/server/utils/response';
import { ValidationError } from '@/server/errors';
import * as gitService from '@/server/domain/git/services';
import * as gitSchemas from '@/server/domain/git/schemas';
import fs from 'node:fs';

/**
 * Determine if git error is a user error (400) or server error (500)
 */
function isGitUserError(errorMessage: string): boolean {
  const userErrorPatterns = [
    /not a git repository/i,
    /no such file or directory/i,
    /permission denied/i,
    /does not exist/i,
    /invalid path/i,
  ];
  return userErrorPatterns.some(pattern => pattern.test(errorMessage));
}

export async function gitRoutes(fastify: FastifyInstance) {
  // POST /api/git/status - Get git status
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitStatusBodySchema>;
  }>(
    '/api/git/status',
    {
      schema: {
        body: gitSchemas.gitStatusBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path } = request.body;

      try {
        // Check if path exists
        if (!fs.existsSync(path)) {
          throw new ValidationError(`Path doesn't exist: ${path}`);
        }

        const status = await gitService.getGitStatus({ projectPath: path });
        return reply.send(buildSuccessResponse(status));
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        if (error instanceof ValidationError) {
          throw error; // Already a ValidationError
        }

        if (isGitUserError(err.message)) {
          throw new ValidationError(err.message);
        }

        throw err; // Re-throw server errors
      }
    }
  );

  // POST /api/git/branches - Get all branches
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitBranchesBodySchema>;
  }>(
    '/api/git/branches',
    {
      schema: {
        body: gitSchemas.gitBranchesBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path } = request.body;
      const userId = request.user?.id;

      try {
        // Check if path exists
        if (!fs.existsSync(path)) {
          throw new ValidationError(`Path doesn't exist: ${path}`);
        }

        fastify.log.debug({ userId, projectPath: path }, 'Getting branches');
        const branches = await gitService.getBranches({ projectPath: path });
        return reply.send(buildSuccessResponse(branches));
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        fastify.log.error(
          {
            err,
            userId,
            projectPath: path,
            operation: 'getBranches',
          },
          `Failed to get branches: ${err.message}`
        );

        if (error instanceof ValidationError) {
          throw error; // Already a ValidationError
        }

        if (isGitUserError(err.message)) {
          throw new ValidationError(err.message);
        }

        throw err; // Re-throw to be handled by global error handler
      }
    }
  );

  // POST /api/git/branch - Create and switch to new branch
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitBranchBodySchema>;
  }>(
    '/api/git/branch',
    {
      schema: {
        body: gitSchemas.gitBranchBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, name, from } = request.body;

      const result = await gitService.createAndSwitchBranch({
        projectPath: path,
        branchName: name,
        from,
      });
      return reply.code(201).send(buildSuccessResponse(result.branch));
    }
  );

  // POST /api/git/branch/switch - Switch to existing branch
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitSwitchBranchBodySchema>;
  }>(
    '/api/git/branch/switch',
    {
      schema: {
        body: gitSchemas.gitSwitchBranchBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, name } = request.body;

      const branch = await gitService.switchBranch({ projectPath: path, branchName: name });
      return reply.send(buildSuccessResponse(branch));
    }
  );

  // POST /api/git/stage - Stage files
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitStageFilesBodySchema>;
  }>(
    '/api/git/stage',
    {
      schema: {
        body: gitSchemas.gitStageFilesBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, files } = request.body;

      await gitService.stageFiles({ projectPath: path, files });
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );

  // POST /api/git/unstage - Unstage files
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitStageFilesBodySchema>;
  }>(
    '/api/git/unstage',
    {
      schema: {
        body: gitSchemas.gitStageFilesBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, files } = request.body;

      await gitService.unstageFiles({ projectPath: path, files });
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );

  // POST /api/git/commit - Commit changes
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitCommitBodySchema>;
  }>(
    '/api/git/commit',
    {
      schema: {
        body: gitSchemas.gitCommitBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, message, files } = request.body;

      const result = await gitService.commitChanges({ projectPath: path, message, files });
      return reply.code(201).send(buildSuccessResponse({ hash: result.commitSha }));
    }
  );

  // POST /api/git/push - Push to remote
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitPushBodySchema>;
  }>(
    '/api/git/push',
    {
      schema: {
        body: gitSchemas.gitPushBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, branch, remote } = request.body;

      await gitService.pushToRemote({ projectPath: path, branch, remote: remote || 'origin' });
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );

  // POST /api/git/fetch - Fetch from remote
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitFetchBodySchema>;
  }>(
    '/api/git/fetch',
    {
      schema: {
        body: gitSchemas.gitFetchBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, remote } = request.body;

      await gitService.fetchFromRemote({ projectPath: path, remote: remote || 'origin' });
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );

  // POST /api/git/pull - Pull from remote
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitPullBodySchema>;
  }>(
    '/api/git/pull',
    {
      schema: {
        body: gitSchemas.gitPullBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, remote, branch } = request.body;

      await gitService.pullFromRemote({ projectPath: path, remote, branch });
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );

  // POST /api/git/diff - Get file diff
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitDiffBodySchema>;
  }>(
    '/api/git/diff',
    {
      schema: {
        body: gitSchemas.gitDiffBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, filepath } = request.body;

      const diff = await gitService.getFileDiff({ projectPath: path, filepath });
      return reply.send(buildSuccessResponse({ diff }));
    }
  );

  // POST /api/git/history - Get commit history
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitHistoryBodySchema>;
  }>(
    '/api/git/history',
    {
      schema: {
        body: gitSchemas.gitHistoryBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, limit, offset } = request.body;

      const commits = await gitService.getCommitHistory({ projectPath: path, limit, offset });
      return reply.send(buildSuccessResponse(commits));
    }
  );

  // POST /api/git/commit-diff - Get commit diff
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitCommitDiffBodySchema>;
  }>(
    '/api/git/commit-diff',
    {
      schema: {
        body: gitSchemas.gitCommitDiffBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, commitHash } = request.body;

      const commitDiff = await gitService.getCommitDiff({ projectPath: path, commitHash });
      return reply.send(buildSuccessResponse(commitDiff));
    }
  );

  // POST /api/git/pr-data - Get PR pre-fill data
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitPrDataBodySchema>;
  }>(
    '/api/git/pr-data',
    {
      schema: {
        body: gitSchemas.gitPrDataBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, baseBranch } = request.body;

      const commits = await gitService.getCommitsSinceBase({ projectPath: path, baseBranch });

      // Construct PR title from most recent commit
      const title = commits.length > 0 ? commits[0].message : 'New Pull Request';

      // Construct description from all commits
      const description = commits
        .map((commit, index) => `${index + 1}. ${commit.message} (${commit.shortHash})`)
        .join('\n');

      return reply.send(buildSuccessResponse({ title, description, commits }));
    }
  );

  // POST /api/git/pr - Create pull request
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitCreatePrBodySchema>;
  }>(
    '/api/git/pr',
    {
      schema: {
        body: gitSchemas.gitCreatePrBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, title, description, baseBranch } = request.body;

      const prResult = await gitService.createPullRequest({
        projectPath: path,
        title,
        description,
        baseBranch,
      });

      return reply.send(buildSuccessResponse(prResult));
    }
  );

  // POST /api/git/generate-commit-message - Generate AI commit message
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitGenerateCommitMessageBodySchema>;
  }>(
    '/api/git/generate-commit-message',
    {
      schema: {
        body: gitSchemas.gitGenerateCommitMessageBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, files } = request.body;

      const message = await gitService.generateCommitMessage({ projectPath: path, files });

      return reply.send(buildSuccessResponse({ message }));
    }
  );

  // POST /api/git/merge - Merge branches
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitMergeBodySchema>;
  }>(
    '/api/git/merge',
    {
      schema: {
        body: gitSchemas.gitMergeBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, sourceBranch, noFf } = request.body;

      const result = await gitService.mergeBranch({ projectPath: path, sourceBranch, options: { noFf } });
      return reply.send(buildSuccessResponse(result));
    }
  );

  // POST /api/git/stash/save - Save stash
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitStashSaveBodySchema>;
  }>(
    '/api/git/stash/save',
    {
      schema: {
        body: gitSchemas.gitStashSaveBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, message } = request.body;

      await gitService.stashSave({ projectPath: path, message });
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );

  // POST /api/git/stash/pop - Pop stash
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitStashPopBodySchema>;
  }>(
    '/api/git/stash/pop',
    {
      schema: {
        body: gitSchemas.gitStashPopBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, index } = request.body;

      await gitService.stashPop({ projectPath: path, index });
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );

  // POST /api/git/stash/list - List stashes
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitStashListBodySchema>;
  }>(
    '/api/git/stash/list',
    {
      schema: {
        body: gitSchemas.gitStashListBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path } = request.body;

      const stashes = await gitService.stashList({ projectPath: path });
      return reply.send(buildSuccessResponse(stashes));
    }
  );

  // POST /api/git/stash/apply - Apply stash
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitStashApplyBodySchema>;
  }>(
    '/api/git/stash/apply',
    {
      schema: {
        body: gitSchemas.gitStashApplyBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, index } = request.body;

      await gitService.stashApply({ projectPath: path, index });
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );

  // POST /api/git/reset - Reset to commit
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitResetBodySchema>;
  }>(
    '/api/git/reset',
    {
      schema: {
        body: gitSchemas.gitResetBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, commitHash, mode } = request.body;

      await gitService.resetToCommit({ projectPath: path, commitHash, mode });
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );

  // POST /api/git/discard - Discard changes
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitDiscardBodySchema>;
  }>(
    '/api/git/discard',
    {
      schema: {
        body: gitSchemas.gitDiscardBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, files } = request.body;

      await gitService.discardChanges({ projectPath: path, files });
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );
}
