/**
 * Demo: Build Todo App Workflow
 *
 * A realistic demo workflow for screenshots and demonstrations.
 * Uses generic prompts that won't trigger actual AI work.
 *
 * Features demonstrated:
 * - Multi-phase execution (Plan → Build → Test → Review → Ship)
 * - AI agent steps with realistic prompts
 * - CLI execution simulation
 * - Git operations
 * - Annotations for progress tracking
 * - Artifacts generation
 * - Type-safe schema with priorities
 */

import { defineWorkflow, defineSchema } from "../../../packages/agentcmd-workflows/dist";

// Define schema for workflow arguments
const argsSchema = defineSchema({
  type: "object",
  properties: {
    priority: {
      enum: ["urgent", "high", "normal", "low"],
      description: "Development priority level"
    },
    includeTests: {
      type: "boolean",
      description: "Generate test files"
    },
    includeE2e: {
      type: "boolean",
      description: "Generate E2E tests"
    },
    deployToStaging: {
      type: "boolean",
      description: "Deploy to staging environment"
    },
  },
  required: ["priority"],
});

export default defineWorkflow(
  {
    id: "demo-build-todo-app",
    name: "Demo: Build Todo App",
    description: "Complete workflow for building a todo application - perfect for demos and screenshots",
    argsSchema,
    phases: [
      { id: "plan", label: "Planning" },
      { id: "build", label: "Building" },
      { id: "test", label: "Testing" },
      { id: "review", label: "Review" },
      { id: "ship", label: "Ship" },
    ],
  },
  async ({ event, step }) => {
    const projectPath = (event.data.projectPath as string) || process.cwd();
    const {
      priority,
      includeTests = true,
      includeE2e = false,
      deployToStaging = false
    } = event.data.args;

    // ========================================
    // PHASE 1: Planning
    // ========================================
    await step.phase("plan", async () => {
      await step.annotation("start-planning", {
        message: `Starting ${priority} priority todo app development`,
      });

      // AI planning step with demo prompt
      const planningResult = await step.agent<{
        features: string[];
        techStack: string[];
        estimatedHours: number;
      }>("plan-architecture", {
        agent: "claude",
        json: true,
        prompt: `Plan a todo application with the following requirements:

Requirements:
- User authentication
- Create, read, update, delete todos
- Categories and tags
- Due dates and reminders
- Dark mode support
- Mobile responsive design

Return a JSON plan with:
{
  "features": ["list of features"],
  "techStack": ["list of technologies"],
  "estimatedHours": number
}

Note: This is a DEMO workflow - return a realistic but generic plan.`,
        workingDir: projectPath,
      });

      await step.annotation("planning-complete", {
        message: `Planned ${planningResult.features?.length || 8} features with ${planningResult.techStack?.length || 6} technologies`,
      });

      // Create planning artifact
      await step.artifact("architecture-plan", {
        name: "architecture-plan.json",
        type: "text",
        content: JSON.stringify({
          priority,
          features: planningResult.features || [
            "User Authentication",
            "Todo CRUD Operations",
            "Categories & Tags",
            "Due Dates",
            "Search & Filter",
            "Dark Mode",
            "Mobile Responsive",
            "Data Export"
          ],
          techStack: planningResult.techStack || [
            "React 19",
            "TypeScript",
            "Tailwind CSS",
            "Zustand",
            "Vite",
            "Vitest"
          ],
          estimatedHours: planningResult.estimatedHours || 24,
        }, null, 2),
      });
    });

    // ========================================
    // PHASE 2: Building
    // ========================================
    await step.phase("build", async () => {
      await step.annotation("start-implementation", {
        message: "Implementing todo app features",
      });

      // AI implementation step with demo prompt
      const implementResult = await step.agent<{
        filesCreated: number;
        linesOfCode: number;
        componentsBuilt: string[];
      }>("implement-todo-app", {
        agent: "claude",
        json: true,
        prompt: `Implement a modern todo application with these features:

Features to Implement:
1. Authentication (login/signup)
2. Todo list with CRUD operations
3. Categories and tags system
4. Due date tracking
5. Dark mode toggle
6. Responsive mobile design

Technical Requirements:
- Use React 19 with TypeScript
- Tailwind CSS for styling
- Zustand for state management
- Clean, maintainable code
- Accessibility best practices

Return JSON with:
{
  "filesCreated": number,
  "linesOfCode": number,
  "componentsBuilt": ["list of components"]
}

Note: This is a DEMO workflow - return realistic metrics without actual file changes.`,
        workingDir: projectPath,
      });

      await step.annotation("implementation-progress", {
        message: `Built ${implementResult.componentsBuilt?.length || 12} components, ${implementResult.linesOfCode || 2847} lines of code`,
      });

      // Simulate build process
      await step.cli("build-app", {
        command: "echo '🔨 Building application...\n✓ Compiled successfully\n✓ Bundle size optimized\n✓ Assets generated' && sleep 2",
        cwd: projectPath,
      });

      await step.annotation("build-complete", {
        message: "Application built successfully",
      });

      // Create implementation artifact
      await step.artifact("implementation-summary", {
        name: "implementation-summary.md",
        type: "text",
        content: `# Todo App Implementation Summary

## Components Built
${(implementResult.componentsBuilt || [
  'TodoList',
  'TodoItem',
  'TodoForm',
  'CategoryFilter',
  'TagManager',
  'AuthForm',
  'DarkModeToggle',
  'SearchBar',
  'DatePicker',
  'ExportButton',
  'SettingsPanel',
  'Navbar'
]).map(c => `- ${c}`).join('\n')}

## Metrics
- Files Created: ${implementResult.filesCreated || 24}
- Lines of Code: ${implementResult.linesOfCode || 2847}
- Components: ${implementResult.componentsBuilt?.length || 12}

## Tech Stack
- React 19
- TypeScript
- Tailwind CSS
- Zustand
- Vite

## Status
✅ Implementation Complete
`,
      });
    });

    // ========================================
    // PHASE 3: Testing
    // ========================================
    await step.phase("test", async () => {
      if (!includeTests) {
        await step.annotation("tests-skipped", {
          message: "Test generation skipped (includeTests flag not set)",
        });
        return;
      }

      await step.annotation("start-testing", {
        message: "Running test suite",
      });

      // Unit tests
      await step.cli("run-unit-tests", {
        command: "echo '🧪 Running unit tests...\n✓ TodoList.test.tsx (8 tests)\n✓ TodoItem.test.tsx (5 tests)\n✓ TodoForm.test.tsx (6 tests)\n✓ CategoryFilter.test.tsx (4 tests)\n✓ All tests passed!' && sleep 2",
        cwd: projectPath,
      });

      // E2E tests (conditional)
      if (includeE2e) {
        await step.annotation("start-e2e", {
          message: "Running E2E tests",
        });

        await step.cli("run-e2e-tests", {
          command: "echo '🌐 Running E2E tests...\n✓ User can create todo\n✓ User can edit todo\n✓ User can delete todo\n✓ User can filter by category\n✓ Dark mode toggle works\n✓ All E2E tests passed!' && sleep 3",
          cwd: projectPath,
        });
      }

      // Create test results artifact
      await step.artifact("test-results", {
        name: "test-results.json",
        type: "text",
        content: JSON.stringify({
          unitTests: {
            total: 23,
            passed: 23,
            failed: 0,
            coverage: "94%",
            duration: "2.4s",
          },
          e2eTests: includeE2e ? {
            total: 12,
            passed: 12,
            failed: 0,
            duration: "45.2s",
          } : null,
          timestamp: new Date().toISOString(),
        }, null, 2),
      });

      await step.annotation("testing-complete", {
        message: `All tests passed - ${includeE2e ? '35 total (23 unit + 12 E2E)' : '23 unit tests'}`,
      });
    });

    // ========================================
    // PHASE 4: Review
    // ========================================
    await step.phase("review", async () => {
      await step.annotation("start-review", {
        message: "Conducting code review",
      });

      // AI code review step
      const reviewResult = await step.agent<{
        score: number;
        issues: string[];
        suggestions: string[];
      }>("review-code", {
        agent: "claude",
        json: true,
        prompt: `Review the todo application implementation for:

Quality Criteria:
- Code organization and structure
- TypeScript type safety
- React best practices
- Accessibility compliance
- Performance optimization
- Security considerations
- Test coverage

Return JSON with:
{
  "score": number (0-100),
  "issues": ["list of issues found"],
  "suggestions": ["list of improvement suggestions"]
}

Note: This is a DEMO workflow - return a positive review with minor suggestions.`,
        workingDir: projectPath,
      });

      await step.annotation("review-complete", {
        message: `Code review score: ${reviewResult.score || 94}/100 - ${reviewResult.issues?.length || 2} minor issues found`,
      });

      // Create review artifact
      await step.artifact("code-review", {
        name: "code-review.md",
        type: "text",
        content: `# Code Review Summary

## Overall Score: ${reviewResult.score || 94}/100

## ✅ Strengths
- Clean component architecture
- Strong TypeScript typing
- Comprehensive test coverage
- Accessible UI components
- Responsive design implementation

## ⚠️ Issues Found
${(reviewResult.issues || [
  'Missing error boundary in TodoList component',
  'Consider memoizing expensive filter operations'
]).map(i => `- ${i}`).join('\n')}

## 💡 Suggestions
${(reviewResult.suggestions || [
  'Add loading states for async operations',
  'Implement virtual scrolling for large todo lists',
  'Add keyboard shortcuts for power users',
  'Consider adding undo/redo functionality'
]).map(s => `- ${s}`).join('\n')}

## Recommendation
✅ Approved for merge with minor improvements
`,
      });
    });

    // ========================================
    // PHASE 5: Ship
    // ========================================
    await step.phase("ship", async () => {
      await step.annotation("start-deployment", {
        message: "Preparing for deployment",
      });

      // Commit changes
      await step.git("commit-changes", {
        operation: "commit",
        message: `feat: implement todo application with ${priority} priority

Features:
- User authentication
- Todo CRUD operations
- Categories and tags
- Due dates and reminders
- Dark mode support
- Mobile responsive design

Tests: ${includeTests ? '✓ Passed' : 'Not included'}
Review Score: ${(reviewResult as any)?.score || 94}/100`,
      });

      // Create PR
      await step.git("create-pr", {
        operation: "pr",
        title: `feat: Complete todo application implementation`,
        body: `## Summary
Implemented a full-featured todo application with modern React architecture.

## Features
✅ User Authentication
✅ Todo CRUD Operations
✅ Categories & Tags
✅ Due Dates & Reminders
✅ Dark Mode Support
✅ Mobile Responsive Design

## Test Results
- Unit Tests: 23/23 passed (94% coverage)
${includeE2e ? '- E2E Tests: 12/12 passed' : ''}

## Code Review
Score: ${(reviewResult as any)?.score || 94}/100
Status: ✅ Approved

## Priority
${priority.toUpperCase()} priority implementation

${deployToStaging ? '\n## Deployment\n🚀 Ready for staging deployment' : ''}`,
      });

      // Conditional staging deployment
      if (deployToStaging) {
        await step.annotation("deploying-staging", {
          message: "Deploying to staging environment",
        });

        await step.cli("deploy-staging", {
          command: "echo '🚀 Deploying to staging...\n✓ Building production bundle\n✓ Uploading assets\n✓ Running migrations\n✓ Deployment successful!\n📍 https://staging.todo-app.demo' && sleep 3",
          cwd: projectPath,
        });

        await step.annotation("deployment-complete", {
          message: "Successfully deployed to staging",
        });
      }

      await step.annotation("workflow-complete", {
        message: `🎉 Todo app shipped successfully - ${priority} priority complete!`,
      });

      // Create final deployment artifact
      await step.artifact("deployment-summary", {
        name: "deployment-summary.json",
        type: "text",
        content: JSON.stringify({
          success: true,
          priority,
          metrics: {
            components: (implementResult as any)?.componentsBuilt?.length || 12,
            linesOfCode: (implementResult as any)?.linesOfCode || 2847,
            testsPassed: includeE2e ? 35 : 23,
            reviewScore: (reviewResult as any)?.score || 94,
          },
          deployment: deployToStaging ? {
            environment: "staging",
            url: "https://staging.todo-app.demo",
            timestamp: new Date().toISOString(),
          } : null,
          completedAt: new Date().toISOString(),
        }, null, 2),
      });
    });

    // Return final summary
    return {
      success: true,
      priority,
      componentsBuilt: (implementResult as any)?.componentsBuilt?.length || 12,
      linesOfCode: (implementResult as any)?.linesOfCode || 2847,
      testsRun: {
        unit: includeTests,
        e2e: includeE2e,
        totalPassed: includeE2e ? 35 : (includeTests ? 23 : 0),
      },
      reviewScore: (reviewResult as any)?.score || 94,
      deployed: deployToStaging,
      completedAt: new Date().toISOString(),
    };
  }
);
