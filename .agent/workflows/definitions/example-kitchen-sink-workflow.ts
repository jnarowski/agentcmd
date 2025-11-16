import {
  buildSlashCommand,
  defineWorkflow,
  type CmdImplementSpecResponse,
} from "../../../packages/agentcmd-workflows/dist";

/**
 * Kitchen Sink Example - demonstrates all available step capabilities
 *
 * Available step methods:
 * - step.phase() - Organize steps into phases
 * - step.agent() - Execute AI agent (Claude/Codex/Gemini)
 * - step.git() - Git operations (commit/branch/pr)
 * - step.cli() - Shell command execution
 * - step.artifact() - Upload files/directories
 * - step.annotation() - Progress notes
 * - step.ai() - AI text/structured generation
 * - step.log() - Log messages (including .warn, .error)
 * - step.run() - Native Inngest step
 * - step.sleep() - Native Inngest sleep
 * - step.waitForEvent() - Native Inngest event wait
 */

export default defineWorkflow(
  {
    id: "example-kitchen-sink-workflow",
    name: "Kitchen Sink Example",
    description: "Demonstrates all available step capabilities",
    phases: [
      { id: "logging", label: "Logging Examples" },
      { id: "ai-generation", label: "AI Generation" },
      { id: "agent-execution", label: "Agent Execution" },
      { id: "cli-commands", label: "CLI Commands" },
      { id: "git-operations", label: "Git Operations" },
      { id: "artifacts", label: "Artifacts" },
      { id: "annotations", label: "Annotations" },
      { id: "inngest-native", label: "Native Inngest Steps" },
    ],
  },
  async ({ event, step }) => {
    const { workingDir, specFile } = event.data;

    // ========================================================================
    // AI GENERATION (step.ai)
    // ========================================================================

    await step.phase("ai-generation", async () => {
      // Simple text generation
      const textResult = await step.ai("generate-text", {
        prompt: "Write a short commit message for adding a new feature",
        provider: "anthropic",
        model: "claude-sonnet-4-5-20250929",
        temperature: 0.7,
        maxTokens: 100,
      });
      step.log("Generated text:", textResult.data.text);
      step.log("Token usage:", textResult.result?.usage);
    });

    // ========================================================================
    // AGENT EXECUTION (step.agent)
    // ========================================================================

    await step.phase("agent-execution", async () => {
      // Standard mode (streaming output)
      await step.agent("agent-standard", {
        agent: "claude",
        prompt: "List files in current directory",
        workingDir,
        permissionMode: "default",
      });

      // Plan mode (non-interactive)
      await step.agent("agent-plan", {
        agent: "claude",
        prompt: "Create implementation plan for feature X",
        workingDir,
        permissionMode: "plan",
      });

      // JSON mode (extract structured data)
      interface CodeAnalysis {
        files: string[];
        totalLines: number;
      }

      const jsonResult = await step.agent<CodeAnalysis>("agent-json", {
        agent: "claude",
        prompt:
          "Analyze codebase and return JSON: { files: string[], totalLines: number }",
        workingDir,
        json: true,
      });
      step.log("Extracted JSON:", jsonResult.data);

      // Resume existing session
      // const resumeResult = await step.agent("agent-resume", {
      //   agent: "claude",
      //   prompt: "Continue previous work",
      //   workingDir,
      //   resume: "session-id-from-previous-step",
      // });
    });

    // ========================================================================
    // LOGGING EXAMPLES
    // ========================================================================

    await step.phase("logging", async () => {
      step.log("Regular log message");
      step.log("Multiple", "arguments", { foo: "bar" });
      step.log.warn("Warning message");
      step.log.error("Error message");

      await step.annotation("logging-done", {
        message: "Logging examples completed",
      });
    });

    // ========================================================================
    // CLI COMMANDS (step.cli)
    // ========================================================================

    await step.phase("cli-commands", async () => {
      // Simple command
      const listResult = await step.cli("list-files", {
        name: "List Files",
        command: "ls -la",
        cwd: workingDir,
      });
      step.log("Exit code:", listResult.data.exitCode);
      step.log("Output:", listResult.data.stdout);

      // Command with environment variables
      const envResult = await step.cli("env-command", {
        name: "Echo with Env",
        command: "echo $MY_VAR",
        env: { MY_VAR: "hello-world" },
        cwd: workingDir,
      });
      step.log("Env result:", envResult.data.stdout);

      // Custom shell
      const bashResult = await step.cli("bash-command", {
        command: "echo 'Using bash'",
        shell: "/bin/bash",
        cwd: workingDir,
      });

      // Handle errors
      try {
        await step.cli("failing-command", {
          command: "exit 1",
          cwd: workingDir,
        });
      } catch (error) {
        step.log.warn("Command failed as expected:", error);
      }
    });

    // ========================================================================
    // GIT OPERATIONS (step.git)
    // ========================================================================

    // await step.phase("git-operations", async () => {
    //   // Commit changes
    //   const commitResult = await step.git("git-commit", {
    //     name: "Commit Changes",
    //     operation: "commit",
    //     message: "feat: add new feature",
    //   });
    //   step.log("Commit SHA:", commitResult.data.commitSha);

    //   // Create branch
    //   const branchResult = await step.git("git-branch", {
    //     name: "Create Branch",
    //     operation: "branch",
    //     branch: "feature/new-feature",
    //     baseBranch: "main",
    //   });
    //   step.log("Branch:", branchResult.data.branch);

    //   // Commit + branch (atomic operation)
    //   const commitBranchResult = await step.git("git-commit-and-branch", {
    //     operation: "commit-and-branch",
    //     commitMessage: "WIP: work in progress",
    //     branch: "feature/another-feature",
    //     baseBranch: "main",
    //   });
    //   step.log(
    //     "Had uncommitted changes:",
    //     commitBranchResult.data.hadUncommittedChanges
    //   );
    //   step.log("Already on branch:", commitBranchResult.data.alreadyOnBranch);

    //   // Create pull request
    //   const prResult = await step.git("git-pr", {
    //     name: "Create PR",
    //     operation: "pr",
    //     title: "Add new feature",
    //     body: "This PR adds a new feature\n\n## Changes\n- Feature X\n- Feature Y",
    //     branch: "feature/new-feature",
    //     baseBranch: "main",
    //   });
    //   step.log("PR URL:", prResult.data.prUrl);
    //   step.log("PR Number:", prResult.data.prNumber);
    // });

    // ========================================================================
    // ARTIFACTS (step.artifact)
    // ========================================================================

    await step.phase("artifacts", async () => {
      // Text artifact
      const textArtifact = await step.artifact("text-artifact", {
        name: "analysis-notes.txt",
        type: "text",
        content: "Analysis notes:\n- Point 1\n- Point 2",
        description: "Analysis notes from workflow",
      });
      step.log("Text artifact uploaded:", textArtifact.data.count);

      // File artifact
      const fileArtifact = await step.artifact("file-artifact", {
        name: "package.json",
        type: "file",
        file: `${workingDir}/package.json`,
        description: "Package configuration",
      });

      // Image artifact (if you have an image file)
      // const imageArtifact = await step.artifact("screenshot", {
      //   name: "app-screenshot.png",
      //   type: "image",
      //   file: `${workingDir}/screenshot.png`,
      //   description: "Application screenshot",
      // });
    });

    // ========================================================================
    // ANNOTATIONS (step.annotation)
    // ========================================================================

    await step.phase("annotations", async () => {
      await step.annotation("progress-note-1", {
        message: "Starting complex operation...",
      });

      // Do some work...
      await step.run("some-work", async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { done: true };
      });

      await step.annotation("progress-note-2", {
        message: "Complex operation completed successfully",
      });

      await step.annotation("milestone-reached", {
        message: "🎉 Milestone: All features implemented",
      });
    });

    // ========================================================================
    // NATIVE INNGEST STEPS
    // ========================================================================

    await step.phase("inngest-native", async () => {
      // step.run - Execute function with automatic retry
      const runResult = await step.run("compute-something", async () => {
        const result = Math.random() * 100;
        return { value: result, timestamp: new Date() };
      });
      step.log("Computed value:", runResult.value);

      // step.sleep - Sleep for duration
      step.log("Sleeping for 2 seconds...");
      await step.sleep("short-sleep", "2s");
      step.log("Sleep complete");

      // step.waitForEvent - Wait for external event
      // Note: This will timeout if event doesn't arrive
      // const eventData = await step.waitForEvent("wait-for-approval", {
      //   event: "workflow/approval-received",
      //   timeout: "5m",
      // });
      // step.log("Received event:", eventData);

      // Demonstrate error handling
      try {
        await step.run("failing-step", async () => {
          throw new Error("Intentional failure");
        });
      } catch (error) {
        step.log.error("Caught expected error:", error);

        // Create error artifact
        await step.artifact("error-log", {
          name: "error-details.txt",
          type: "text",
          content: `Error: ${error}\nStack: ${(error as Error).stack}`,
        });
      }
    });

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================

    await step.run("final-summary", async () => {
      step.log("=".repeat(60));
      step.log("Workflow complete!");
      step.log("Demonstrated steps:");
      step.log("  ✓ step.log() - Logging");
      step.log("  ✓ step.ai() - AI text/structured generation");
      step.log("  ✓ step.agent() - Agent execution");
      step.log("  ✓ step.cli() - CLI commands");
      step.log("  ✓ step.git() - Git operations");
      step.log("  ✓ step.artifact() - Artifact uploads");
      step.log("  ✓ step.annotation() - Progress notes");
      step.log("  ✓ step.run() - Native Inngest run");
      step.log("  ✓ step.sleep() - Native Inngest sleep");
      step.log("=".repeat(60));
    });

    await step.annotation("workflow-complete", {
      message: "Kitchen sink workflow completed - all step types demonstrated",
    });
  }
);
