/**
 * Example Basic Workflow
 *
 * Demonstrates core workflow features without AI/agent functionality:
 * - Phases for organizing work
 * - Annotations for progress tracking
 * - CLI command execution
 * - Git operations
 * - Artifact generation
 * - Sleep delays to simulate processing
 */

import { defineWorkflow } from "../../../packages/agentcmd-workflows/dist";

export default defineWorkflow(
  {
    id: "example-basic-workflow",
    name: "Example Basic Workflow",
    description:
      "Demonstrates workflow features: phases, annotations, CLI commands, git operations, and artifacts",
    phases: ["setup", "build", "test", "deploy"],
  },
  async ({ event, step }) => {
    // Extract project path from event data
    const projectPath = (event.data.projectPath as string) || process.cwd();

    // ========================================
    // PHASE 1: Setup
    // ========================================
    await step.phase("setup", async () => {
      await step.annotation("setup-start", {
        message: "🚀 Starting setup phase",
      });

      // Simulate checking project structure
      await step.cli("check-project", {
        command: "ls -la",
        cwd: projectPath,
      });

      // Sleep to simulate processing
      await step.sleep("wait-after-check", "3s");

      await step.annotation("project-verified", {
        message: "✅ Project structure verified",
      });

      // Note: Git status check removed (not a supported git operation)
      // Supported operations: commit, branch, pr, commit-and-branch

      await step.sleep("wait-after-git", "2s");

      await step.annotation("setup-complete", {
        message: "✅ Setup phase complete",
      });
    });

    // ========================================
    // PHASE 2: Build
    // ========================================
    await step.phase("build", async () => {
      await step.annotation("build-start", {
        message: "🔨 Starting build phase",
      });

      // Simulate linting
      await step.cli(
        "lint-code",
        {
          command:
            "echo 'Running linter...' && sleep 2 && echo 'Linting complete - no issues found'",
          cwd: projectPath,
        },
        { timeout: 30000 }
      );

      await step.sleep("wait-after-lint", "2s");

      // Simulate type checking
      await step.cli(
        "type-check",
        {
          command:
            "echo 'Running type checker...' && sleep 3 && echo 'Type checking complete - all types valid'",
          cwd: projectPath,
        },
        { timeout: 30000 }
      );

      await step.sleep("wait-after-types", "2s");

      // Simulate building
      await step.cli(
        "build-project",
        {
          command:
            "echo 'Building project...' && sleep 4 && echo 'Build successful'",
          cwd: projectPath,
        },
        { timeout: 60000 }
      );

      // Create build artifact
      await step.artifact("build-summary", {
        name: "build-summary.txt",
        type: "text",
        content: `Build Summary
=============
Linting: ✓ Passed
Type Check: ✓ Passed
Build: ✓ Success
Time: ${new Date().toISOString()}
`,
      });

      await step.annotation("build-complete", {
        message: "✅ Build phase complete",
      });
    });

    // ========================================
    // PHASE 3: Test
    // ========================================
    await step.phase("test", async () => {
      await step.annotation("test-start", {
        message: "🧪 Starting test phase",
      });

      // Simulate unit tests
      await step.cli(
        "run-unit-tests",
        {
          command:
            "echo 'Running unit tests...' && sleep 3 && echo '✓ 45 tests passed'",
          cwd: projectPath,
        },
        { timeout: 60000 }
      );

      await step.sleep("wait-after-unit", "2s");

      // Simulate integration tests
      await step.cli(
        "run-integration-tests",
        {
          command:
            "echo 'Running integration tests...' && sleep 4 && echo '✓ 12 tests passed'",
          cwd: projectPath,
        },
        { timeout: 120000 }
      );

      await step.sleep("wait-after-integration", "2s");

      // Create test results artifact
      await step.artifact("test-results", {
        name: "test-results.json",
        type: "text",
        content: JSON.stringify(
          {
            summary: {
              total: 57,
              passed: 57,
              failed: 0,
              skipped: 0,
            },
            suites: [
              { name: "unit", passed: 45, total: 45 },
              { name: "integration", passed: 12, total: 12 },
            ],
            timestamp: new Date().toISOString(),
          },
          null,
          2
        ),
      });

      await step.annotation("tests-passed", {
        message: "✅ All tests passed",
      });
    });

    // ========================================
    // PHASE 4: Deploy
    // ========================================
    await step.phase("deploy", async () => {
      await step.annotation("deploy-start", {
        message: "🚢 Starting deployment phase",
      });

      // Create a commit with changes
      await step.git("commit-changes", {
        operation: "commit",
        message: "chore: example workflow execution",
      });

      await step.sleep("wait-after-commit", "2s");

      // Simulate deployment
      await step.cli(
        "deploy-staging",
        {
          command:
            "echo 'Deploying to staging...' && sleep 3 && echo '✓ Deployed to staging'",
          cwd: projectPath,
          env: {
            NODE_ENV: "staging",
            DEPLOY_TARGET: "staging",
          },
        },
        { timeout: 120000 }
      );

      await step.sleep("wait-after-deploy", "2s");

      // Create deployment artifact
      await step.artifact("deployment-log", {
        name: "deployment.log",
        type: "text",
        content: `Deployment Log
==============
Environment: staging
Status: SUCCESS
Timestamp: ${new Date().toISOString()}
Commit: example-workflow-run

Services deployed:
- api: ✓
- web: ✓
- worker: ✓

Health checks:
- api: HEALTHY
- web: HEALTHY
- worker: HEALTHY
`,
      });

      await step.annotation("deploy-success", {
        message: "✅ Deployment successful",
      });
    });

    // ========================================
    // Completion
    // ========================================
    await step.annotation("workflow-complete", {
      message: "🎉 Workflow completed successfully!",
    });

    return {
      success: true,
      summary: {
        phases: ["setup", "build", "test", "deploy"],
        totalTests: 57,
        deploymentTarget: "staging",
        completedAt: new Date().toISOString(),
      },
    };
  }
);
