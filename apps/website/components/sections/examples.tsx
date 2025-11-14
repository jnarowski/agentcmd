import { FeatureSelector } from "@/components/feature-selector";
import { Section } from "@/components/section";
import { codeToHtml } from "shiki";

interface FeatureOption {
  id: number;
  title: string;
  description: string;
  code: string;
}

const featureOptions: FeatureOption[] = [
  {
    id: 1,
    title: "Complete SDLC Automation",
    description: "Stop babysitting - fully automate your development cycle from spec to implementation to review.",
    code: `import { defineWorkflow, buildSlashCommand } from "agentcmd-workflows";

export default defineWorkflow({
  id: "full-sdlc",
  name: "Spec → Implement → Review → Fix",
  description: "Stop babysitting - fully automate your development cycle"
}, async ({ event, step }) => {
  const { specFile } = event.data;

  // Generate spec
  await step.agent("generate-spec", {
    agent: "claude",
    prompt: buildSlashCommand("/cmd:generate-feature-spec", {
      context: specFile
    })
  });

  // Implement
  const impl = await step.agent("implement", {
    agent: "claude",
    json: true,
    prompt: buildSlashCommand("/cmd:implement-spec", {
      specIdOrNameOrPath: specFile
    })
  });

  // Review implementation
  const review = await step.agent("review", {
    agent: "codex",
    json: true,
    prompt: buildSlashCommand("/cmd:review-spec-implementation", {
      specIdOrNameOrPath: specFile
    })
  });

  // Fix issues if found
  if (review.issuesFound > 0) {
    await step.annotate("Fixing issues found in review...");

    await step.agent("fix-issues", {
      agent: "claude",
      prompt: \`Fix these issues: \${JSON.stringify(review.issues)}\`
    });
  }
});`,
  },
  {
    id: 2,
    title: "Your Process, Your Commands",
    description: "Build workflows that match your team's exact process. Create custom slash commands and orchestrate them.",
    code: `// 1. Create custom slash command in .claude/commands/
// File: .claude/commands/your-company-deploy.md
/*
# /your-company-deploy

Run your company's specific deployment process:
1. Run YOUR test suite
2. Check YOUR code standards
3. Update YOUR changelog format
4. Deploy to YOUR infrastructure
*/

// 2. Orchestrate it in a workflow
import { defineWorkflow } from "agentcmd-workflows";

export default defineWorkflow({
  id: "custom-deploy",
  name: "Your Company Deploy Process"
}, async ({ step }) => {
  // Use your custom slash command
  await step.agent("deploy", {
    agent: "claude",
    prompt: "/your-company-deploy"
  });

  await step.annotate("Deployed using YOUR process");
});`,
  },
  {
    id: 3,
    title: "Parallel Testing with Worktrees",
    description:
      "Test multiple features in parallel using git worktrees. Run workflows simultaneously without conflicts.",
    code: `import { defineWorkflow } from "agentcmd-workflows";

export default defineWorkflow({
  id: "parallel-tests",
  name: "Multi-Branch Testing",
  description: "Test multiple features in parallel using git worktrees"
}, async ({ step }) => {

  const branches = ["feature-auth", "feature-payments", "feature-analytics"];

  // Run tests in parallel across worktrees
  const results = await Promise.all(
    branches.map(branch =>
      step.cli(\`test-\${branch}\`, {
        command: \`git worktree add ../test-\${branch} \${branch} && cd ../test-\${branch} && pnpm test\`,
        workingDir: process.cwd()
      })
    )
  );

  // Aggregate results with AI
  const summary = await step.ai("summarize", {
    model: "gpt-4o",
    prompt: \`Summarize these test results: \${JSON.stringify(results)}\`
  });

  await step.annotate(\`Test Summary: \${summary}\`);
});`,
  },
  {
    id: 4,
    title: "E2E Testing with Visual Artifacts",
    description: "Run Playwright tests and capture screenshots for AI analysis. Automatically detect and fix visual bugs.",
    code: `import { defineWorkflow } from "agentcmd-workflows";

export default defineWorkflow({
  id: "e2e-visual-testing",
  name: "E2E Tests + Visual Regression",
  description: "Run tests and capture screenshots for AI analysis"
}, async ({ step }) => {

  // Run E2E tests
  await step.cli("run-playwright", {
    command: "pnpm playwright test --headed"
  });

  // Capture screenshots
  await step.artifact("test-screenshots", {
    path: "./test-results/screenshots/*.png",
    description: "E2E test screenshots"
  });

  // AI analyzes screenshots for issues
  const analysis = await step.ai("analyze-visuals", {
    model: "gpt-4o",
    prompt: "Analyze these test screenshots. Are there any visual bugs or UI issues?",
    attachments: ["./test-results/screenshots/*.png"]
  });

  if (analysis.issuesFound) {
    await step.annotate(\`⚠️ Visual issues detected: \${analysis.summary}\`);

    // Auto-fix with agent
    await step.agent("fix-ui-issues", {
      agent: "claude",
      prompt: \`Fix these UI issues: \${analysis.issues}\`
    });
  }
});`,
  },
  {
    id: 5,
    title: "Multi-Agent Code Review",
    description:
      "Get different AI perspectives on your code. Claude focuses on architecture, Codex on bugs, GPT on readability.",
    code: `import { defineWorkflow } from "agentcmd-workflows";

export default defineWorkflow({
  id: "multi-agent-review",
  name: "360° Code Review",
  description: "Get different AI perspectives on your code"
}, async ({ step }) => {

  // Claude focuses on architecture
  const architectureReview = await step.agent("claude-architecture", {
    agent: "claude",
    prompt: "Review this PR focusing on architecture and design patterns"
  });

  // Codex focuses on bugs and edge cases
  const bugReview = await step.agent("codex-bugs", {
    agent: "codex",
    prompt: "Review this PR focusing on potential bugs and edge cases"
  });

  // GPT-4 focuses on readability
  const readabilityReview = await step.ai("gpt-readability", {
    model: "gpt-4o",
    prompt: "Review this PR focusing on code readability and documentation"
  });

  // Synthesize reviews
  const synthesis = await step.ai("synthesize", {
    model: "gpt-4o",
    prompt: \`Synthesize these reviews into actionable feedback:
    Architecture: \${architectureReview}
    Bugs: \${bugReview}
    Readability: \${readabilityReview}\`
  });

  await step.annotate(\`📋 Final Review:\\n\${synthesis}\`);
});`,
  },
];

export async function Examples() {
  const features = await Promise.all(
    featureOptions.map(async (feature) => ({
      ...feature,
      code: await codeToHtml(feature.code, {
        lang: "typescript",
        theme: "github-dark",
      }),
    }))
  );

  return (
    <Section id="examples">
      <div className="border-x border-t">
        <FeatureSelector features={features} />
      </div>
    </Section>
  );
}
