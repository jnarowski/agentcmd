/**
 * Seed workflow data for testing and development.
 *
 * Usage:
 *   pnpm prisma:seed                    # Seed workflows for first available project
 *   pnpm prisma:seed <project-id>       # Seed workflows for specific project
 *
 * Examples:
 *   pnpm prisma:seed
 *   pnpm prisma:seed cmhj99cvg0000ya2nunnnglq9
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting workflow seeding...");

  // Parse command line arguments for optional project ID
  const targetProjectId = process.argv[2];

  // Get existing projects and users for linking
  const projects = targetProjectId
    ? await prisma.project.findMany({ where: { id: targetProjectId } })
    : await prisma.project.findMany({ take: 3 });
  const users = await prisma.user.findMany({ take: 3 });

  if (projects.length === 0) {
    if (targetProjectId) {
      console.log(`❌ Project with ID "${targetProjectId}" not found.`);
    } else {
      console.log("❌ No projects found. Please seed projects first.");
    }
    return;
  }

  if (users.length === 0) {
    console.log("❌ No users found. Please seed users first.");
    return;
  }

  if (targetProjectId) {
    console.log(
      `🎯 Seeding workflows for project: ${projects[0].name} (${projects[0].id})`
    );
  } else {
    console.log(`Found ${projects.length} projects and ${users.length} users`);
  }

  // Use single project for all workflows when targeting specific project
  const projectId = projects[0].id;

  // Clear existing workflow data for the target project(s)
  if (targetProjectId) {
    console.log(
      `\n🧹 Clearing existing workflow data for project: ${projects[0].name}...`
    );
  } else {
    console.log(
      `\n🧹 Clearing existing workflow data for ${projects.length} project(s)...`
    );
  }

  // Get workflow runs for the target project(s)
  const projectIds = projects.map((p) => p.id);
  const existingRuns = await prisma.workflowRun.findMany({
    where: { project_id: { in: projectIds } },
    select: { id: true },
  });
  const runIds = existingRuns.map((e) => e.id);

  // Get workflow definitions for the target project(s)
  const existingDefinitions = await prisma.workflowDefinition.findMany({
    where: { project_id: { in: projectIds } },
    select: { id: true },
  });
  const definitionIds = existingDefinitions.map((d) => d.id);

  // Delete in correct order (respecting foreign key constraints)
  if (runIds.length > 0) {
    await prisma.workflowArtifact.deleteMany({
      where: {
        workflow_run_id: { in: runIds },
      },
    });

    await prisma.workflowEvent.deleteMany({
      where: { workflow_run_id: { in: runIds } },
    });

    await prisma.workflowRunStep.deleteMany({
      where: { workflow_run_id: { in: runIds } },
    });

    await prisma.workflowRun.deleteMany({
      where: { id: { in: runIds } },
    });
  }

  // Delete workflow definitions for the target project(s)
  if (definitionIds.length > 0) {
    await prisma.workflowDefinition.deleteMany({
      where: { id: { in: definitionIds } },
    });
  }

  console.log(
    `✅ Cleared workflow data (${runIds.length} runs, ${definitionIds.length} definitions)`
  );

  // Create Workflow Definitions (Templates)
  const featureWorkflow = await prisma.workflowDefinition.create({
    data: {
      project_id: projectId,
      identifier: "feature-implementation",
      name: "Feature Implementation Workflow",
      description:
        "Complete workflow for implementing a new feature from research to deployment",
      type: "code",
      path: "./.agent/workflows/templates/feature-implementation.yaml",
      status: "active",
      file_exists: true,
      load_error: null,
      archived_at: null,
      phases: JSON.stringify([
        {
          name: "Research",
          steps: [
            "Analyze requirements",
            "Review similar implementations",
            "Design architecture",
          ],
        },
        {
          name: "Design",
          steps: [
            "Create technical spec",
            "Design database schema",
            "Plan API endpoints",
          ],
        },
        {
          name: "Implementation",
          steps: [
            "Set up project structure",
            "Implement core logic",
            "Add tests",
            "Code review",
          ],
        },
        {
          name: "Testing",
          steps: ["Run unit tests", "Run integration tests", "Manual QA"],
        },
        {
          name: "Deployment",
          steps: [
            "Build application",
            "Deploy to staging",
            "Deploy to production",
          ],
        },
      ]),
      args_schema: JSON.stringify({
        type: "object",
        properties: {
          featureName: {
            type: "string",
            description: "Name of the feature to implement",
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            default: "medium",
          },
          targetDate: { type: "string", format: "date" },
        },
        required: ["featureName"],
      }),
      is_template: true,
    },
  });

  const bugFixWorkflow = await prisma.workflowDefinition.create({
    data: {
      project_id: projectId,
      identifier: "bug-fix",
      name: "Bug Fix Workflow",
      description: "Streamlined workflow for investigating and fixing bugs",
      type: "code",
      path: "./.agent/workflows/templates/bug-fix.yaml",
      status: "active",
      file_exists: true,
      load_error: null,
      archived_at: null,
      phases: JSON.stringify([
        {
          name: "Investigation",
          steps: ["Reproduce bug", "Analyze logs", "Identify root cause"],
        },
        {
          name: "Fix",
          steps: [
            "Write fix",
            "Add regression tests",
            "Code review",
            "Test fix",
          ],
        },
        {
          name: "Verification",
          steps: ["Deploy to staging", "Verify fix works"],
        },
      ]),
      args_schema: JSON.stringify({
        type: "object",
        properties: {
          bugId: { type: "string", description: "Bug tracking ID" },
          severity: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
            default: "medium",
          },
          description: { type: "string", description: "Bug description" },
        },
        required: ["bugId", "description"],
      }),
      is_template: true,
    },
  });

  const codeReviewWorkflow = await prisma.workflowDefinition.create({
    data: {
      project_id: projectId,
      identifier: "code-review",
      name: "Code Review Workflow",
      description:
        "Comprehensive code review process with automated checks and feedback",
      type: "code",
      path: "./.agent/workflows/templates/code-review.yaml",
      status: "active",
      file_exists: true,
      load_error: null,
      archived_at: null,
      phases: JSON.stringify([
        {
          name: "Analysis",
          steps: ["Run linters", "Run type checker", "Check test coverage"],
        },
        {
          name: "Feedback",
          steps: ["Manual review", "Security audit", "Performance review"],
        },
        {
          name: "Revision",
          steps: ["Address feedback", "Update tests", "Re-run checks"],
        },
        {
          name: "Approval",
          steps: ["Final review", "Approve PR"],
        },
      ]),
      args_schema: JSON.stringify({
        type: "object",
        properties: {
          prNumber: { type: "number", description: "Pull request number" },
          branch: { type: "string", description: "Branch name" },
          autoMerge: { type: "boolean", default: false },
        },
        required: ["prNumber", "branch"],
      }),
      is_template: true,
    },
  });

  console.log("Created 3 workflow definitions");

  // Create Workflow Runs with various statuses
  const runs = [];

  // Pending runs (2)
  runs.push(
    await prisma.workflowRun.create({
      data: {
        name: "Feature: User Profile Settings",
        workflow_definition_id: featureWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: "pending",
        current_phase: null,
        args: JSON.stringify({
          featureName: "User Profile Settings",
          priority: "high",
        }),
        spec_file: null,
        spec_content: null,
        spec_type: null,
        planning_session_id: null,
        mode: null,
        branch_name: null,
        base_branch: null,
        pr_url: null,
        inngest_run_id: null,
        created_at: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      },
    }),
    await prisma.workflowRun.create({
      data: {
        name: "Review: PR #456 - Authentication Updates",
        workflow_definition_id: codeReviewWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: "pending",
        current_phase: null,
        args: JSON.stringify({ prNumber: 456, branch: "feature/auth-updates" }),
        spec_file: null,
        spec_content: null,
        spec_type: null,
        planning_session_id: null,
        mode: null,
        branch_name: null,
        base_branch: null,
        pr_url: null,
        inngest_run_id: null,
        created_at: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
      },
    })
  );

  // Running runs (7)
  runs.push(
    await prisma.workflowRun.create({
      data: {
        name: "Feature: Dark Mode Support",
        workflow_definition_id: featureWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: "running",
        current_phase: "Implementation",
        args: JSON.stringify({
          featureName: "Dark Mode Support",
          priority: "medium",
        }),
        spec_file: null,
        spec_content: null,
        spec_type: null,
        planning_session_id: null,
        mode: null,
        branch_name: null,
        base_branch: null,
        pr_url: null,
        inngest_run_id: null,
        started_at: new Date(Date.now() - 1000 * 60 * 45), // 45 min ago
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      },
    }),
    await prisma.workflowRun.create({
      data: {
        name: "Bug Fix: Login Form Validation Error",
        workflow_definition_id: bugFixWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: "running",
        current_phase: "Fix",
        args: JSON.stringify({
          bugId: "BUG-123",
          severity: "high",
          description: "Validation not triggering on empty password",
        }),
        spec_file: null,
        spec_content: null,
        spec_type: null,
        planning_session_id: null,
        mode: null,
        branch_name: null,
        base_branch: null,
        pr_url: null,
        inngest_run_id: null,
        started_at: new Date(Date.now() - 1000 * 60 * 20), // 20 min ago
        created_at: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      },
    }),
    await prisma.workflowRun.create({
      data: {
        name: "Review: PR #789 - Database Migration",
        workflow_definition_id: codeReviewWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: "running",
        current_phase: "Feedback",
        args: JSON.stringify({ prNumber: 789, branch: "feature/db-migration" }),
        spec_file: null,
        spec_content: null,
        spec_type: null,
        planning_session_id: null,
        mode: null,
        branch_name: null,
        base_branch: null,
        pr_url: null,
        inngest_run_id: null,
        started_at: new Date(Date.now() - 1000 * 60 * 15), // 15 min ago
        created_at: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      },
    }),
    await prisma.workflowRun.create({
      data: {
        name: "Feature: Real-time Chat System",
        workflow_definition_id: featureWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: "running",
        current_phase: "Design",
        args: JSON.stringify({
          featureName: "Real-time Chat System",
          priority: "high",
        }),
        spec_file: null,
        spec_content: null,
        spec_type: null,
        planning_session_id: null,
        mode: null,
        branch_name: null,
        base_branch: null,
        pr_url: null,
        inngest_run_id: null,
        started_at: new Date(Date.now() - 1000 * 60 * 90), // 1.5 hours ago
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2.5), // 2.5 hours ago
      },
    }),
    await prisma.workflowRun.create({
      data: {
        name: "Bug Fix: Performance Issues on Dashboard",
        workflow_definition_id: bugFixWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: "running",
        current_phase: "Investigation",
        args: JSON.stringify({
          bugId: "BUG-567",
          severity: "medium",
          description: "Dashboard taking 5+ seconds to load",
        }),
        spec_file: null,
        spec_content: null,
        spec_type: null,
        planning_session_id: null,
        mode: null,
        branch_name: null,
        base_branch: null,
        pr_url: null,
        inngest_run_id: null,
        started_at: new Date(Date.now() - 1000 * 60 * 35), // 35 min ago
        created_at: new Date(Date.now() - 1000 * 60 * 50), // 50 min ago
      },
    }),
    await prisma.workflowRun.create({
      data: {
        name: "Feature: File Upload Service",
        workflow_definition_id: featureWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: "running",
        current_phase: "Testing",
        args: JSON.stringify({
          featureName: "File Upload Service",
          priority: "medium",
        }),
        spec_file: null,
        spec_content: null,
        spec_type: null,
        planning_session_id: null,
        mode: null,
        branch_name: null,
        base_branch: null,
        pr_url: null,
        inngest_run_id: null,
        started_at: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
      },
    }),
    await prisma.workflowRun.create({
      data: {
        name: "Review: PR #912 - Refactor Auth Module",
        workflow_definition_id: codeReviewWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: "running",
        current_phase: "Analysis",
        args: JSON.stringify({
          prNumber: 912,
          branch: "refactor/auth-module",
        }),
        spec_file: null,
        spec_content: null,
        spec_type: null,
        planning_session_id: null,
        mode: null,
        branch_name: null,
        base_branch: null,
        pr_url: null,
        inngest_run_id: null,
        started_at: new Date(Date.now() - 1000 * 60 * 25), // 25 min ago
        created_at: new Date(Date.now() - 1000 * 60 * 40), // 40 min ago
      },
    })
  );

  // Paused runs (2)
  runs.push(
    await prisma.workflowRun.create({
      data: {
        name: "Feature: Export to CSV",
        workflow_definition_id: featureWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: "paused",
        current_phase: "Testing",
        args: JSON.stringify({ featureName: "Export to CSV", priority: "low" }),
        spec_file: null,
        spec_content: null,
        spec_type: null,
        planning_session_id: null,
        mode: null,
        branch_name: null,
        base_branch: null,
        pr_url: null,
        inngest_run_id: null,
        started_at: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
        paused_at: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
      },
    }),
    await prisma.workflowRun.create({
      data: {
        name: "Bug Fix: Memory Leak in Dashboard",
        workflow_definition_id: bugFixWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: "paused",
        current_phase: "Investigation",
        args: JSON.stringify({
          bugId: "BUG-456",
          severity: "critical",
          description: "Dashboard consuming increasing memory over time",
        }),
        spec_file: null,
        spec_content: null,
        spec_type: null,
        planning_session_id: null,
        mode: null,
        branch_name: null,
        base_branch: null,
        pr_url: null,
        inngest_run_id: null,
        started_at: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
        paused_at: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
      },
    })
  );

  // Completed runs (7)
  runs.push(
    await prisma.workflowRun.create({
      data: {
        name: "Feature: Notification System",
        workflow_definition_id: featureWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: "completed",
        current_phase: "Deployment",
        args: JSON.stringify({
          featureName: "Notification System",
          priority: "high",
        }),
        spec_file: null,
        spec_content: null,
        spec_type: null,
        planning_session_id: null,
        mode: null,
        branch_name: null,
        base_branch: null,
        pr_url: null,
        inngest_run_id: null,
        started_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
        completed_at: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      },
    }),
    await prisma.workflowRun.create({
      data: {
        name: "Bug Fix: Incorrect Date Formatting",
        workflow_definition_id: bugFixWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: "completed",
        current_phase: "Verification",
        args: JSON.stringify({
          bugId: "BUG-789",
          severity: "low",
          description: "Dates showing in wrong timezone",
        }),
        spec_file: null,
        spec_content: null,
        spec_type: null,
        planning_session_id: null,
        mode: null,
        branch_name: null,
        base_branch: null,
        pr_url: null,
        inngest_run_id: null,
        started_at: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        completed_at: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 30), // 30 hours ago
      },
    }),
    await prisma.workflowRun.create({
      data: {
        name: "Review: PR #234 - API Rate Limiting",
        workflow_definition_id: codeReviewWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: "completed",
        current_phase: "Approval",
        args: JSON.stringify({
          prNumber: 234,
          branch: "feature/rate-limiting",
          autoMerge: true,
        }),
        spec_file: null,
        spec_content: null,
        spec_type: null,
        planning_session_id: null,
        mode: null,
        branch_name: null,
        base_branch: null,
        pr_url: null,
        inngest_run_id: null,
        started_at: new Date(Date.now() - 1000 * 60 * 60 * 10), // 10 hours ago
        completed_at: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
      },
    }),
    await prisma.workflowRun.create({
      data: {
        name: "Feature: User Authentication Improvements",
        workflow_definition_id: featureWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: "completed",
        current_phase: "Deployment",
        args: JSON.stringify({
          featureName: "User Authentication Improvements",
          priority: "high",
        }),
        spec_file: null,
        spec_content: null,
        spec_type: null,
        planning_session_id: null,
        mode: null,
        branch_name: null,
        base_branch: null,
        pr_url: null,
        inngest_run_id: null,
        started_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4), // 4 days ago
        completed_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
      },
    }),
    await prisma.workflowRun.create({
      data: {
        name: "Bug Fix: Page Refresh Losing State",
        workflow_definition_id: bugFixWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: "completed",
        current_phase: "Verification",
        args: JSON.stringify({
          bugId: "BUG-345",
          severity: "medium",
          description: "User state lost on page refresh",
        }),
        spec_file: null,
        spec_content: null,
        spec_type: null,
        planning_session_id: null,
        mode: null,
        branch_name: null,
        base_branch: null,
        pr_url: null,
        inngest_run_id: null,
        started_at: new Date(Date.now() - 1000 * 60 * 60 * 18), // 18 hours ago
        completed_at: new Date(Date.now() - 1000 * 60 * 60 * 14), // 14 hours ago
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 20), // 20 hours ago
      },
    }),
    await prisma.workflowRun.create({
      data: {
        name: "Feature: Advanced Filtering Options",
        workflow_definition_id: featureWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: "completed",
        current_phase: "Deployment",
        args: JSON.stringify({
          featureName: "Advanced Filtering Options",
          priority: "medium",
        }),
        spec_file: null,
        spec_content: null,
        spec_type: null,
        planning_session_id: null,
        mode: null,
        branch_name: null,
        base_branch: null,
        pr_url: null,
        inngest_run_id: null,
        started_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
        completed_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6), // 6 days ago
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8), // 8 days ago
      },
    }),
    await prisma.workflowRun.create({
      data: {
        name: "Review: PR #567 - Component Library Update",
        workflow_definition_id: codeReviewWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: "completed",
        current_phase: "Approval",
        args: JSON.stringify({
          prNumber: 567,
          branch: "feat/component-library-v2",
          autoMerge: false,
        }),
        spec_file: null,
        spec_content: null,
        spec_type: null,
        planning_session_id: null,
        mode: null,
        branch_name: null,
        base_branch: null,
        pr_url: null,
        inngest_run_id: null,
        started_at: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
        completed_at: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 9), // 9 hours ago
      },
    })
  );

  // Failed runs (2)
  runs.push(
    await prisma.workflowRun.create({
      data: {
        name: "Feature: Advanced Search",
        workflow_definition_id: featureWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: "failed",
        current_phase: "Testing",
        args: JSON.stringify({
          featureName: "Advanced Search",
          priority: "medium",
        }),
        spec_file: null,
        spec_content: null,
        spec_type: null,
        planning_session_id: null,
        mode: null,
        branch_name: null,
        base_branch: null,
        pr_url: null,
        inngest_run_id: null,
        started_at: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
        error_message:
          "Integration tests failed: 3 tests failed with timeout errors",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 10), // 10 hours ago
      },
    }),
    await prisma.workflowRun.create({
      data: {
        name: "Bug Fix: API Endpoint 500 Error",
        workflow_definition_id: bugFixWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: "failed",
        current_phase: "Fix",
        args: JSON.stringify({
          bugId: "BUG-999",
          severity: "critical",
          description: "GET /api/users returns 500",
        }),
        spec_file: null,
        spec_content: null,
        spec_type: null,
        planning_session_id: null,
        mode: null,
        branch_name: null,
        base_branch: null,
        pr_url: null,
        inngest_run_id: null,
        started_at: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
        error_message:
          "Code review failed: Security vulnerability detected in SQL query",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
      },
    })
  );

  console.log(`Created ${runs.length} workflow runs`);

  // Create Workflow Run Steps
  const steps = [];
  let stepCount = 0;

  // Helper to create steps for a run
  const createSteps = async (
    run: { id: string },
    definition: { id: string },
    stepsToCreate: Array<{
      name: string;
      phase: string;
      status: "pending" | "running" | "completed" | "failed" | "skipped";
      order: number;
      logs?: string;
      error?: string;
    }>
  ) => {
    for (const stepData of stepsToCreate) {
      const step = await prisma.workflowRunStep.create({
        data: {
          inngest_step_id: `step-${stepData.order}`,
          name: stepData.name,
          phase: stepData.phase,
          workflow_run_id: run.id,
          status: stepData.status,
          step_type: "system",
          args: null,
          output: stepData.logs ? { logs: stepData.logs } : null,
          error_message: stepData.error || null,
          started_at:
            stepData.status !== "pending"
              ? new Date(Date.now() - 1000 * 60 * (30 - stepData.order * 2))
              : null,
          completed_at:
            stepData.status === "completed" || stepData.status === "failed"
              ? new Date(Date.now() - 1000 * 60 * (25 - stepData.order * 2))
              : null,
        },
      });
      steps.push(step);
      stepCount++;
    }
  };

  // Running run: Dark Mode Support (in Implementation phase)
  await createSteps(runs[2], featureWorkflow, [
    {
      name: "Analyze requirements",
      phase: "Research",
      status: "completed",
      order: 0,
      logs: "[2025-01-03 10:15:23] Starting requirements analysis\n[2025-01-03 10:16:45] Analyzed 15 user stories\n[2025-01-03 10:18:12] Requirements analysis complete",
    },
    {
      name: "Review similar implementations",
      phase: "Research",
      status: "completed",
      order: 1,
      logs: "[2025-01-03 10:20:05] Searching for similar implementations\n[2025-01-03 10:22:30] Found 8 relevant examples\n[2025-01-03 10:25:00] Review complete",
    },
    {
      name: "Design architecture",
      phase: "Research",
      status: "completed",
      order: 2,
      logs: "[2025-01-03 10:27:00] Starting architecture design\n[2025-01-03 10:30:15] Created component hierarchy\n[2025-01-03 10:32:45] Architecture design complete",
    },
    {
      name: "Create technical spec",
      phase: "Design",
      status: "completed",
      order: 3,
      logs: "[2025-01-03 10:35:00] Writing technical specification\n[2025-01-03 10:40:20] Spec reviewed and approved\n[2025-01-03 10:42:00] Technical spec complete",
    },
    {
      name: "Design database schema",
      phase: "Design",
      status: "completed",
      order: 4,
      logs: "[2025-01-03 10:45:00] Designing database schema\n[2025-01-03 10:48:30] Schema reviewed\n[2025-01-03 10:50:00] Database schema complete",
    },
    {
      name: "Plan API endpoints",
      phase: "Design",
      status: "completed",
      order: 5,
      logs: "[2025-01-03 10:52:00] Planning API endpoints\n[2025-01-03 10:55:00] Endpoints documented\n[2025-01-03 10:57:00] API planning complete",
    },
    {
      name: "Set up project structure",
      phase: "Implementation",
      status: "completed",
      order: 6,
      logs: "[2025-01-03 11:00:00] Creating project structure\n[2025-01-03 11:02:30] Files and folders created\n[2025-01-03 11:05:00] Project structure complete",
    },
    {
      name: "Implement core logic",
      phase: "Implementation",
      status: "running",
      order: 7,
      logs: "[2025-01-03 11:07:00] Starting implementation\n[2025-01-03 11:15:30] Implemented theme context\n[2025-01-03 11:25:00] Building color palette...",
    },
    { name: "Add tests", phase: "Implementation", status: "pending", order: 8 },
    {
      name: "Code review",
      phase: "Implementation",
      status: "pending",
      order: 9,
    },
  ]);

  // Running run: Bug Fix (in Fix phase)
  await createSteps(runs[3], bugFixWorkflow, [
    {
      name: "Reproduce bug",
      phase: "Investigation",
      status: "completed",
      order: 0,
      logs: "[2025-01-03 11:40:00] Attempting to reproduce bug\n[2025-01-03 11:42:15] Bug reproduced successfully\n[2025-01-03 11:43:00] Reproduction complete",
    },
    {
      name: "Analyze logs",
      phase: "Investigation",
      status: "completed",
      order: 1,
      logs: "[2025-01-03 11:45:00] Analyzing error logs\n[2025-01-03 11:47:30] Found validation error in form handler\n[2025-01-03 11:48:00] Log analysis complete",
    },
    {
      name: "Identify root cause",
      phase: "Investigation",
      status: "completed",
      order: 2,
      logs: "[2025-01-03 11:50:00] Investigating root cause\n[2025-01-03 11:52:45] Root cause: Missing required field validation\n[2025-01-03 11:55:00] Root cause identified",
    },
    {
      name: "Write fix",
      phase: "Fix",
      status: "completed",
      order: 3,
      logs: "[2025-01-03 11:57:00] Writing fix for validation\n[2025-01-03 12:00:30] Added password validation check\n[2025-01-03 12:02:00] Fix complete",
    },
    {
      name: "Add regression tests",
      phase: "Fix",
      status: "running",
      order: 4,
      logs: "[2025-01-03 12:05:00] Writing regression tests\n[2025-01-03 12:08:15] Created test suite...",
    },
    { name: "Code review", phase: "Fix", status: "pending", order: 5 },
    { name: "Test fix", phase: "Fix", status: "pending", order: 6 },
  ]);

  // Running run: Code Review (in Feedback phase)
  await createSteps(runs[4], codeReviewWorkflow, [
    {
      name: "Run linters",
      phase: "Analysis",
      status: "completed",
      order: 0,
      logs: "[2025-01-03 12:45:00] Running ESLint\n[2025-01-03 12:46:30] No linting errors found\n[2025-01-03 12:47:00] Linting complete",
    },
    {
      name: "Run type checker",
      phase: "Analysis",
      status: "completed",
      order: 1,
      logs: "[2025-01-03 12:48:00] Running TypeScript compiler\n[2025-01-03 12:50:15] Type checking passed\n[2025-01-03 12:51:00] Type checking complete",
    },
    {
      name: "Check test coverage",
      phase: "Analysis",
      status: "completed",
      order: 2,
      logs: "[2025-01-03 12:52:00] Running test coverage\n[2025-01-03 12:55:30] Coverage: 87% (target: 80%)\n[2025-01-03 12:56:00] Coverage check complete",
    },
    {
      name: "Manual review",
      phase: "Feedback",
      status: "running",
      order: 3,
      logs: "[2025-01-03 12:58:00] Starting manual code review\n[2025-01-03 13:05:15] Reviewing database migration files...",
    },
    { name: "Security audit", phase: "Feedback", status: "pending", order: 4 },
    {
      name: "Performance review",
      phase: "Feedback",
      status: "pending",
      order: 5,
    },
  ]);

  // Completed run: Notification System
  await createSteps(runs[5], featureWorkflow, [
    {
      name: "Analyze requirements",
      phase: "Research",
      status: "completed",
      order: 0,
      logs: "[2025-01-01 09:00:00] Requirements analysis started\n[2025-01-01 09:15:00] Analyzed notification requirements\n[2025-01-01 09:30:00] Analysis complete",
    },
    {
      name: "Review similar implementations",
      phase: "Research",
      status: "completed",
      order: 1,
      logs: "[2025-01-01 09:35:00] Reviewing similar systems\n[2025-01-01 09:50:00] Review complete",
    },
    {
      name: "Design architecture",
      phase: "Research",
      status: "completed",
      order: 2,
      logs: "[2025-01-01 10:00:00] Architecture design started\n[2025-01-01 10:30:00] Design complete",
    },
    {
      name: "Create technical spec",
      phase: "Design",
      status: "completed",
      order: 3,
      logs: "[2025-01-01 10:45:00] Writing technical spec\n[2025-01-01 11:15:00] Spec complete",
    },
    {
      name: "Design database schema",
      phase: "Design",
      status: "completed",
      order: 4,
      logs: "[2025-01-01 11:30:00] Database schema design\n[2025-01-01 12:00:00] Schema complete",
    },
    {
      name: "Plan API endpoints",
      phase: "Design",
      status: "completed",
      order: 5,
      logs: "[2025-01-01 13:00:00] API endpoint planning\n[2025-01-01 13:30:00] Planning complete",
    },
    {
      name: "Set up project structure",
      phase: "Implementation",
      status: "completed",
      order: 6,
      logs: "[2025-01-01 14:00:00] Project structure setup\n[2025-01-01 14:30:00] Structure complete",
    },
    {
      name: "Implement core logic",
      phase: "Implementation",
      status: "completed",
      order: 7,
      logs: "[2025-01-01 15:00:00] Core logic implementation\n[2025-01-01 17:00:00] Implementation complete",
    },
    {
      name: "Add tests",
      phase: "Implementation",
      status: "completed",
      order: 8,
      logs: "[2025-01-01 17:30:00] Writing tests\n[2025-01-01 18:30:00] Tests complete",
    },
    {
      name: "Code review",
      phase: "Implementation",
      status: "completed",
      order: 9,
      logs: "[2025-01-02 09:00:00] Code review\n[2025-01-02 10:00:00] Review approved",
    },
    {
      name: "Run unit tests",
      phase: "Testing",
      status: "completed",
      order: 10,
      logs: "[2025-01-02 10:30:00] Running unit tests\n[2025-01-02 10:45:00] All tests passed (45/45)",
    },
    {
      name: "Run integration tests",
      phase: "Testing",
      status: "completed",
      order: 11,
      logs: "[2025-01-02 11:00:00] Running integration tests\n[2025-01-02 11:30:00] Integration tests passed (12/12)",
    },
    {
      name: "Manual QA",
      phase: "Testing",
      status: "completed",
      order: 12,
      logs: "[2025-01-02 12:00:00] Manual QA testing\n[2025-01-02 13:00:00] QA approved",
    },
    {
      name: "Build application",
      phase: "Deployment",
      status: "completed",
      order: 13,
      logs: "[2025-01-02 13:30:00] Building application\n[2025-01-02 14:00:00] Build successful",
    },
    {
      name: "Deploy to staging",
      phase: "Deployment",
      status: "completed",
      order: 14,
      logs: "[2025-01-02 14:15:00] Deploying to staging\n[2025-01-02 14:45:00] Staging deployment complete",
    },
    {
      name: "Deploy to production",
      phase: "Deployment",
      status: "completed",
      order: 15,
      logs: "[2025-01-02 15:00:00] Deploying to production\n[2025-01-02 15:30:00] Production deployment complete",
    },
  ]);

  // Failed run: Advanced Search
  await createSteps(runs[8], featureWorkflow, [
    {
      name: "Analyze requirements",
      phase: "Research",
      status: "completed",
      order: 0,
      logs: "[2025-01-02 19:00:00] Requirements analysis\n[2025-01-02 19:30:00] Analysis complete",
    },
    {
      name: "Review similar implementations",
      phase: "Research",
      status: "completed",
      order: 1,
      logs: "[2025-01-02 19:45:00] Reviewing similar implementations\n[2025-01-02 20:00:00] Review complete",
    },
    {
      name: "Design architecture",
      phase: "Research",
      status: "completed",
      order: 2,
      logs: "[2025-01-02 20:15:00] Architecture design\n[2025-01-02 20:45:00] Design complete",
    },
    {
      name: "Create technical spec",
      phase: "Design",
      status: "completed",
      order: 3,
      logs: "[2025-01-02 21:00:00] Technical spec\n[2025-01-02 21:30:00] Spec complete",
    },
    {
      name: "Design database schema",
      phase: "Design",
      status: "completed",
      order: 4,
      logs: "[2025-01-02 21:45:00] Database schema\n[2025-01-02 22:00:00] Schema complete",
    },
    {
      name: "Plan API endpoints",
      phase: "Design",
      status: "completed",
      order: 5,
      logs: "[2025-01-02 22:15:00] API planning\n[2025-01-02 22:30:00] Planning complete",
    },
    {
      name: "Set up project structure",
      phase: "Implementation",
      status: "completed",
      order: 6,
      logs: "[2025-01-03 08:00:00] Project setup\n[2025-01-03 08:30:00] Setup complete",
    },
    {
      name: "Implement core logic",
      phase: "Implementation",
      status: "completed",
      order: 7,
      logs: "[2025-01-03 09:00:00] Core implementation\n[2025-01-03 11:00:00] Implementation complete",
    },
    {
      name: "Add tests",
      phase: "Implementation",
      status: "completed",
      order: 8,
      logs: "[2025-01-03 11:30:00] Writing tests\n[2025-01-03 12:00:00] Tests complete",
    },
    {
      name: "Code review",
      phase: "Implementation",
      status: "completed",
      order: 9,
      logs: "[2025-01-03 12:30:00] Code review\n[2025-01-03 13:00:00] Review approved",
    },
    {
      name: "Run unit tests",
      phase: "Testing",
      status: "completed",
      order: 10,
      logs: "[2025-01-03 13:30:00] Running unit tests\n[2025-01-03 13:45:00] All unit tests passed",
    },
    {
      name: "Run integration tests",
      phase: "Testing",
      status: "failed",
      order: 11,
      logs: "[2025-01-03 14:00:00] Running integration tests\n[2025-01-03 14:15:00] ERROR: 3 tests timed out\n[2025-01-03 14:16:00] Test failures detected",
      error_message:
        "Integration tests failed: 3 tests failed with timeout errors",
    },
  ]);

  console.log(`Created ${stepCount} workflow run steps`);

  // Create Events (workflow lifecycle + comments)
  const events = [];

  // Helper to create workflow lifecycle events
  const createLifecycleEvent = async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    run: any,
    eventType: string,
    title: string,
    body: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    additionalData: Record<string, any> = {},
    createdAt: Date
  ) => {
    return await prisma.workflowEvent.create({
      data: {
        workflow_run_id: run.id,
        created_by_user_id: users[0].id,
        event_type: eventType,
        event_data: {
          title,
          body,
          ...additionalData,
        },
        created_at: createdAt,
      },
    });
  };

  // RUNNING WORKFLOWS - Add lifecycle events

  // Dark Mode Support (runs[2]) - Started → Phase transitions → Currently running
  events.push(
    await createLifecycleEvent(
      runs[2],
      "workflow_started",
      "Workflow Started",
      "Workflow execution has begun",
      {},
      new Date(Date.now() - 1000 * 60 * 45)
    ),
    await createLifecycleEvent(
      runs[2],
      "phase_started",
      "Research Phase Started",
      "Started Research phase",
      { phase: "Research" },
      new Date(Date.now() - 1000 * 60 * 44)
    ),
    await createLifecycleEvent(
      runs[2],
      "phase_completed",
      "Research Phase Completed",
      "Completed Research phase - all requirements analyzed",
      { phase: "Research" },
      new Date(Date.now() - 1000 * 60 * 36)
    ),
    await createLifecycleEvent(
      runs[2],
      "phase_started",
      "Design Phase Started",
      "Started Design phase",
      { phase: "Design" },
      new Date(Date.now() - 1000 * 60 * 35)
    ),
    await createLifecycleEvent(
      runs[2],
      "phase_completed",
      "Design Phase Completed",
      "Completed Design phase - technical spec approved",
      { phase: "Design" },
      new Date(Date.now() - 1000 * 60 * 31)
    ),
    await createLifecycleEvent(
      runs[2],
      "phase_started",
      "Implementation Phase Started",
      "Started Implementation phase",
      { phase: "Implementation" },
      new Date(Date.now() - 1000 * 60 * 30)
    )
  );

  // Bug Fix (execution[3]) - Started → Phase transitions → Currently running
  events.push(
    await createLifecycleEvent(
      runs[3],
      "workflow_started",
      "Workflow Started",
      "Workflow execution started",
      {},
      new Date(Date.now() - 1000 * 60 * 20)
    ),
    await createLifecycleEvent(
      runs[3],
      "phase_started",
      "Investigation Phase Started",
      "Started Investigation phase",
      { phase: "Investigation" },
      new Date(Date.now() - 1000 * 60 * 19)
    ),
    await createLifecycleEvent(
      runs[3],
      "phase_completed",
      "Investigation Phase Completed",
      "Completed Investigation phase - root cause identified",
      { phase: "Investigation" },
      new Date(Date.now() - 1000 * 60 * 16)
    ),
    await createLifecycleEvent(
      runs[3],
      "phase_started",
      "Fix Phase Started",
      "Started Fix phase",
      { phase: "Fix" },
      new Date(Date.now() - 1000 * 60 * 15)
    )
  );

  // Code Review (execution[4]) - Started → Phase transitions → Currently running
  events.push(
    await createLifecycleEvent(
      runs[4],
      "workflow_started",
      "Workflow Started",
      "Workflow execution started",
      {},
      new Date(Date.now() - 1000 * 60 * 15)
    ),
    await createLifecycleEvent(
      runs[4],
      "phase_started",
      "Analysis Phase Started",
      "Started Analysis phase",
      { phase: "Analysis" },
      new Date(Date.now() - 1000 * 60 * 14)
    ),
    await createLifecycleEvent(
      runs[4],
      "phase_completed",
      "Analysis Phase Completed",
      "Completed Analysis phase - all checks passed",
      { phase: "Analysis" },
      new Date(Date.now() - 1000 * 60 * 13)
    ),
    await createLifecycleEvent(
      runs[4],
      "phase_started",
      "Feedback Phase Started",
      "Started Feedback phase",
      { phase: "Feedback" },
      new Date(Date.now() - 1000 * 60 * 12)
    )
  );

  // PAUSED WORKFLOWS - Add started → paused events

  // Export to CSV (execution[5]) - Started → Paused
  events.push(
    await createLifecycleEvent(
      runs[5],
      "workflow_started",
      "Workflow Started",
      "Workflow execution started",
      {},
      new Date(Date.now() - 1000 * 60 * 60 * 4)
    ),
    await createLifecycleEvent(
      runs[5],
      "phase_started",
      "Research Phase Started",
      "Started Research phase",
      { phase: "Research" },
      new Date(Date.now() - 1000 * 60 * 60 * 4)
    ),
    await createLifecycleEvent(
      runs[5],
      "phase_completed",
      "Research Phase Completed",
      "Completed Research phase",
      { phase: "Research" },
      new Date(Date.now() - 1000 * 60 * 60 * 3)
    ),
    await createLifecycleEvent(
      runs[5],
      "phase_started",
      "Design Phase Started",
      "Started Design phase",
      { phase: "Design" },
      new Date(Date.now() - 1000 * 60 * 60 * 3)
    ),
    await createLifecycleEvent(
      runs[5],
      "phase_completed",
      "Design Phase Completed",
      "Completed Design phase",
      { phase: "Design" },
      new Date(Date.now() - 1000 * 60 * 60 * 2)
    ),
    await createLifecycleEvent(
      runs[5],
      "phase_started",
      "Implementation Phase Started",
      "Started Implementation phase",
      { phase: "Implementation" },
      new Date(Date.now() - 1000 * 60 * 60 * 2)
    ),
    await createLifecycleEvent(
      runs[5],
      "phase_completed",
      "Implementation Phase Completed",
      "Completed Implementation phase",
      { phase: "Implementation" },
      new Date(Date.now() - 1000 * 60 * 60 * 1.5)
    ),
    await createLifecycleEvent(
      runs[5],
      "phase_started",
      "Testing Phase Started",
      "Started Testing phase",
      { phase: "Testing" },
      new Date(Date.now() - 1000 * 60 * 60 * 1.5)
    ),
    await createLifecycleEvent(
      runs[5],
      "workflow_paused",
      "Workflow Paused",
      "Workflow paused by user - waiting for QA team",
      { reason: "user_request" },
      new Date(Date.now() - 1000 * 60 * 60)
    )
  );

  // Memory Leak (execution[6]) - Started → Paused
  events.push(
    await createLifecycleEvent(
      runs[6],
      "workflow_started",
      "Workflow Started",
      "Workflow execution started",
      {},
      new Date(Date.now() - 1000 * 60 * 60 * 6)
    ),
    await createLifecycleEvent(
      runs[6],
      "phase_started",
      "Investigation Phase Started",
      "Started Investigation phase",
      { phase: "Investigation" },
      new Date(Date.now() - 1000 * 60 * 60 * 5)
    ),
    await createLifecycleEvent(
      runs[6],
      "workflow_paused",
      "Workflow Paused",
      "Workflow paused by user - need more time to analyze profiling data",
      { reason: "user_request" },
      new Date(Date.now() - 1000 * 60 * 60 * 2)
    )
  );

  // COMPLETED WORKFLOWS - Add full lifecycle

  // Notification System (execution[7]) - Complete lifecycle
  events.push(
    await createLifecycleEvent(
      runs[7],
      "workflow_started",
      "Workflow Started",
      "Workflow execution started",
      {},
      new Date(Date.now() - 1000 * 60 * 60 * 24 * 3)
    ),
    await createLifecycleEvent(
      runs[7],
      "phase_started",
      "Research Phase Started",
      "Started Research phase",
      { phase: "Research" },
      new Date(Date.now() - 1000 * 60 * 60 * 24 * 3)
    ),
    await createLifecycleEvent(
      runs[7],
      "phase_completed",
      "Research Phase Completed",
      "Completed Research phase",
      { phase: "Research" },
      new Date(Date.now() - 1000 * 60 * 60 * 24 * 2.5)
    ),
    await createLifecycleEvent(
      runs[7],
      "phase_started",
      "Design Phase Started",
      "Started Design phase",
      { phase: "Design" },
      new Date(Date.now() - 1000 * 60 * 60 * 24 * 2.5)
    ),
    await createLifecycleEvent(
      runs[7],
      "phase_completed",
      "Design Phase Completed",
      "Completed Design phase",
      { phase: "Design" },
      new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
    ),
    await createLifecycleEvent(
      runs[7],
      "phase_started",
      "Implementation Phase Started",
      "Started Implementation phase",
      { phase: "Implementation" },
      new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
    ),
    await createLifecycleEvent(
      runs[7],
      "phase_completed",
      "Implementation Phase Completed",
      "Completed Implementation phase",
      { phase: "Implementation" },
      new Date(Date.now() - 1000 * 60 * 60 * 24 * 1.5)
    ),
    await createLifecycleEvent(
      runs[7],
      "phase_started",
      "Testing Phase Started",
      "Started Testing phase",
      { phase: "Testing" },
      new Date(Date.now() - 1000 * 60 * 60 * 24 * 1.5)
    ),
    await createLifecycleEvent(
      runs[7],
      "phase_completed",
      "Testing Phase Completed",
      "Completed Testing phase - all tests passed",
      { phase: "Testing" },
      new Date(Date.now() - 1000 * 60 * 60 * 24 * 1.2)
    ),
    await createLifecycleEvent(
      runs[7],
      "phase_started",
      "Deployment Phase Started",
      "Started Deployment phase",
      { phase: "Deployment" },
      new Date(Date.now() - 1000 * 60 * 60 * 24 * 1.2)
    ),
    await createLifecycleEvent(
      runs[7],
      "phase_completed",
      "Deployment Phase Completed",
      "Completed Deployment phase - production deployment successful",
      { phase: "Deployment" },
      new Date(Date.now() - 1000 * 60 * 60 * 24)
    ),
    await createLifecycleEvent(
      runs[7],
      "workflow_completed",
      "Workflow Completed",
      "Workflow completed successfully",
      {},
      new Date(Date.now() - 1000 * 60 * 60 * 24)
    )
  );

  // Date Formatting Bug (execution[8]) - Complete lifecycle
  events.push(
    await createLifecycleEvent(
      runs[8],
      "workflow_started",
      "Workflow Started",
      "Workflow execution started",
      {},
      new Date(Date.now() - 1000 * 60 * 60 * 30)
    ),
    await createLifecycleEvent(
      runs[8],
      "phase_started",
      "Investigation Phase Started",
      "Started Investigation phase",
      { phase: "Investigation" },
      new Date(Date.now() - 1000 * 60 * 60 * 29)
    ),
    await createLifecycleEvent(
      runs[8],
      "phase_completed",
      "Investigation Phase Completed",
      "Completed Investigation phase",
      { phase: "Investigation" },
      new Date(Date.now() - 1000 * 60 * 60 * 26)
    ),
    await createLifecycleEvent(
      runs[8],
      "phase_started",
      "Fix Phase Started",
      "Started Fix phase",
      { phase: "Fix" },
      new Date(Date.now() - 1000 * 60 * 60 * 26)
    ),
    await createLifecycleEvent(
      runs[8],
      "phase_completed",
      "Fix Phase Completed",
      "Completed Fix phase",
      { phase: "Fix" },
      new Date(Date.now() - 1000 * 60 * 60 * 18)
    ),
    await createLifecycleEvent(
      runs[8],
      "phase_started",
      "Verification Phase Started",
      "Started Verification phase",
      { phase: "Verification" },
      new Date(Date.now() - 1000 * 60 * 60 * 18)
    ),
    await createLifecycleEvent(
      runs[8],
      "phase_completed",
      "Verification Phase Completed",
      "Completed Verification phase - fix verified in staging",
      { phase: "Verification" },
      new Date(Date.now() - 1000 * 60 * 60 * 12)
    ),
    await createLifecycleEvent(
      runs[8],
      "workflow_completed",
      "Workflow Completed",
      "Workflow completed successfully",
      {},
      new Date(Date.now() - 1000 * 60 * 60 * 12)
    )
  );

  // API Rate Limiting PR (execution[9]) - Complete lifecycle
  events.push(
    await createLifecycleEvent(
      runs[9],
      "workflow_started",
      "Workflow Started",
      "Workflow execution started",
      {},
      new Date(Date.now() - 1000 * 60 * 60 * 12)
    ),
    await createLifecycleEvent(
      runs[9],
      "phase_started",
      "Analysis Phase Started",
      "Started Analysis phase",
      { phase: "Analysis" },
      new Date(Date.now() - 1000 * 60 * 60 * 11)
    ),
    await createLifecycleEvent(
      runs[9],
      "phase_completed",
      "Analysis Phase Completed",
      "Completed Analysis phase - all automated checks passed",
      { phase: "Analysis" },
      new Date(Date.now() - 1000 * 60 * 60 * 10)
    ),
    await createLifecycleEvent(
      runs[9],
      "phase_started",
      "Feedback Phase Started",
      "Started Feedback phase",
      { phase: "Feedback" },
      new Date(Date.now() - 1000 * 60 * 60 * 10)
    ),
    await createLifecycleEvent(
      runs[9],
      "phase_completed",
      "Feedback Phase Completed",
      "Completed Feedback phase - code review approved",
      { phase: "Feedback" },
      new Date(Date.now() - 1000 * 60 * 60 * 8)
    ),
    await createLifecycleEvent(
      runs[9],
      "phase_started",
      "Revision Phase Started",
      "Started Revision phase",
      { phase: "Revision" },
      new Date(Date.now() - 1000 * 60 * 60 * 8)
    ),
    await createLifecycleEvent(
      runs[9],
      "phase_completed",
      "Revision Phase Completed",
      "Completed Revision phase - feedback addressed",
      { phase: "Revision" },
      new Date(Date.now() - 1000 * 60 * 60 * 7)
    ),
    await createLifecycleEvent(
      runs[9],
      "phase_started",
      "Approval Phase Started",
      "Started Approval phase",
      { phase: "Approval" },
      new Date(Date.now() - 1000 * 60 * 60 * 7)
    ),
    await createLifecycleEvent(
      runs[9],
      "phase_completed",
      "Approval Phase Completed",
      "Completed Approval phase - PR approved and merged",
      { phase: "Approval" },
      new Date(Date.now() - 1000 * 60 * 60 * 6)
    ),
    await createLifecycleEvent(
      runs[9],
      "workflow_completed",
      "Workflow Completed",
      "Workflow completed successfully",
      {},
      new Date(Date.now() - 1000 * 60 * 60 * 6)
    )
  );

  // FAILED WORKFLOWS - Add lifecycle with failure

  // Advanced Search (execution[10]) - Failed at Testing phase
  events.push(
    await createLifecycleEvent(
      runs[10],
      "workflow_started",
      "Workflow Started",
      "Workflow execution started",
      {},
      new Date(Date.now() - 1000 * 60 * 60 * 10)
    ),
    await createLifecycleEvent(
      runs[10],
      "phase_started",
      "Research Phase Started",
      "Started Research phase",
      { phase: "Research" },
      new Date(Date.now() - 1000 * 60 * 60 * 10)
    ),
    await createLifecycleEvent(
      runs[10],
      "phase_completed",
      "Research Phase Completed",
      "Completed Research phase",
      { phase: "Research" },
      new Date(Date.now() - 1000 * 60 * 60 * 9)
    ),
    await createLifecycleEvent(
      runs[10],
      "phase_started",
      "Design Phase Started",
      "Started Design phase",
      { phase: "Design" },
      new Date(Date.now() - 1000 * 60 * 60 * 9)
    ),
    await createLifecycleEvent(
      runs[10],
      "phase_completed",
      "Design Phase Completed",
      "Completed Design phase",
      { phase: "Design" },
      new Date(Date.now() - 1000 * 60 * 60 * 8)
    ),
    await createLifecycleEvent(
      runs[10],
      "phase_started",
      "Implementation Phase Started",
      "Started Implementation phase",
      { phase: "Implementation" },
      new Date(Date.now() - 1000 * 60 * 60 * 8)
    ),
    await createLifecycleEvent(
      runs[10],
      "phase_completed",
      "Implementation Phase Completed",
      "Completed Implementation phase",
      { phase: "Implementation" },
      new Date(Date.now() - 1000 * 60 * 60 * 7)
    ),
    await createLifecycleEvent(
      runs[10],
      "phase_started",
      "Testing Phase Started",
      "Started Testing phase",
      { phase: "Testing" },
      new Date(Date.now() - 1000 * 60 * 60 * 7)
    ),
    await createLifecycleEvent(
      runs[10],
      "workflow_failed",
      "Workflow Failed",
      "Workflow failed during Testing phase",
      {
        phase: "Testing",
        error: "Integration tests failed: 3 tests failed with timeout errors",
      },
      new Date(Date.now() - 1000 * 60 * 60 * 6)
    )
  );

  // API Endpoint 500 Error (execution[11]) - Failed at Fix phase
  events.push(
    await createLifecycleEvent(
      runs[11],
      "workflow_started",
      "Workflow Started",
      "Workflow execution started",
      {},
      new Date(Date.now() - 1000 * 60 * 60 * 5)
    ),
    await createLifecycleEvent(
      runs[11],
      "phase_started",
      "Investigation Phase Started",
      "Started Investigation phase",
      { phase: "Investigation" },
      new Date(Date.now() - 1000 * 60 * 60 * 5)
    ),
    await createLifecycleEvent(
      runs[11],
      "phase_completed",
      "Investigation Phase Completed",
      "Completed Investigation phase",
      { phase: "Investigation" },
      new Date(Date.now() - 1000 * 60 * 60 * 4.5)
    ),
    await createLifecycleEvent(
      runs[11],
      "phase_started",
      "Fix Phase Started",
      "Started Fix phase",
      { phase: "Fix" },
      new Date(Date.now() - 1000 * 60 * 60 * 4.5)
    ),
    await createLifecycleEvent(
      runs[11],
      "workflow_failed",
      "Workflow Failed",
      "Workflow failed during Fix phase - security vulnerability detected",
      {
        phase: "Fix",
        error:
          "Code review failed: Security vulnerability detected in SQL query",
      },
      new Date(Date.now() - 1000 * 60 * 60 * 3)
    )
  );

  // Comment events disabled - 'comment_added' is not a valid WorkflowEventType in schema
  // TODO: Add comment_added to WorkflowEventType enum if user comments are needed

  // // Events for running workflows
  // events.push(...);

  // // Events for completed workflows
  // events.push(...);

  // // Events for failed workflows
  // events.push(...);

  // // Events for paused workflows
  // events.push(...);

  console.log(`Created ${events.length} workflow events`);

  // Create Artifacts
  const artifacts = [];

  artifacts.push(
    // Artifacts for completed run: Notification System (runs[5])
    await prisma.workflowArtifact.create({
      data: {
        workflow_run_id: runs[5].id,
        name: "test-results.json",
        file_type: "document",
        file_path: "/artifacts/test-results-notification-system.json",
        mime_type: "application/json",
        size_bytes: 15420,
        phase: "Testing",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 26),
      },
    }),
    await prisma.workflowArtifact.create({
      data: {
        workflow_run_id: runs[5].id,
        name: "coverage-report.html",
        file_type: "document",
        file_path: "/artifacts/coverage-report-notification-system.html",
        mime_type: "text/html",
        size_bytes: 328540,
        phase: "Testing",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 26),
      },
    }),
    await prisma.workflowArtifact.create({
      data: {
        workflow_run_id: runs[5].id,
        name: "deployment-logs.txt",
        file_type: "document",
        file_path: "/artifacts/deployment-logs-notification-system.txt",
        mime_type: "text/plain",
        size_bytes: 45680,
        phase: "Deployment",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
    }),

    // Artifacts for completed run: Bug Fix Date Formatting (runs[6])
    await prisma.workflowArtifact.create({
      data: {
        workflow_run_id: runs[6].id,
        name: "bug-fix-verification.png",
        file_type: "image",
        file_path: "/artifacts/bug-fix-verification-screenshot.png",
        mime_type: "image/png",
        size_bytes: 125400,
        phase: "Verification",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 12),
      },
    }),

    // Artifacts for failed run: Advanced Search (runs[8])
    await prisma.workflowArtifact.create({
      data: {
        workflow_run_id: runs[8].id,
        name: "integration-test-failures.log",
        file_type: "document",
        file_path: "/artifacts/integration-test-failures.log",
        mime_type: "text/plain",
        size_bytes: 28940,
        phase: "Testing",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 6),
      },
    }),

    // Artifacts for paused run: Memory Leak (runs[4])
    await prisma.workflowArtifact.create({
      data: {
        workflow_run_id: runs[4].id,
        name: "memory-profile.json",
        file_type: "document",
        file_path: "/artifacts/memory-profile-dashboard.json",
        mime_type: "application/json",
        size_bytes: 87230,
        phase: "Investigation",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2),
      },
    }),
    await prisma.workflowArtifact.create({
      data: {
        workflow_run_id: runs[4].id,
        name: "heap-snapshot.heapsnapshot",
        file_type: "other",
        file_path: "/artifacts/heap-snapshot-dashboard.heapsnapshot",
        mime_type: "application/octet-stream",
        size_bytes: 1543200,
        phase: "Investigation",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2),
      },
    }),

    // Artifacts for running run: Dark Mode (runs[2])
    await prisma.workflowArtifact.create({
      data: {
        workflow_run_id: runs[2].id,
        name: "dark-mode-design-mockup.png",
        file_type: "image",
        file_path: "/artifacts/dark-mode-mockup.png",
        mime_type: "image/png",
        size_bytes: 245800,
        phase: "Design",
        created_at: new Date(Date.now() - 1000 * 60 * 35),
      },
    }),
    await prisma.workflowArtifact.create({
      data: {
        workflow_run_id: runs[2].id,
        name: "color-palette.json",
        file_type: "code",
        file_path: "/artifacts/dark-mode-color-palette.json",
        mime_type: "application/json",
        size_bytes: 3420,
        phase: "Implementation",
        created_at: new Date(Date.now() - 1000 * 60 * 30),
      },
    }),

    // Artifacts for running run: Code Review PR #789 (runs[4])
    await prisma.workflowArtifact.create({
      data: {
        workflow_run_id: runs[4].id,
        name: "migration-schema.sql",
        file_type: "code",
        file_path: "/artifacts/migration-schema-pr789.sql",
        mime_type: "text/plain",
        size_bytes: 8920,
        phase: "Feedback",
        created_at: new Date(Date.now() - 1000 * 60 * 12),
      },
    }),
    await prisma.workflowArtifact.create({
      data: {
        workflow_run_id: runs[4].id,
        name: "performance-analysis.md",
        file_type: "document",
        file_path: "/artifacts/performance-analysis-pr789.md",
        mime_type: "text/markdown",
        size_bytes: 12540,
        phase: "Feedback",
        created_at: new Date(Date.now() - 1000 * 60 * 10),
      },
    }),

    // Artifacts for running run: Bug Fix Login Form (runs[3])
    await prisma.workflowArtifact.create({
      data: {
        workflow_run_id: runs[3].id,
        name: "validation-tests.spec.ts",
        file_type: "code",
        file_path: "/artifacts/validation-tests-bug123.spec.ts",
        mime_type: "text/plain",
        size_bytes: 5680,
        phase: "Fix",
        created_at: new Date(Date.now() - 1000 * 60 * 8),
      },
    })
  );

  console.log(`Created ${artifacts.length} workflow artifacts`);

  // Use existing agent sessions from the database instead of scanning filesystem
  console.log("\n📂 Finding existing agent sessions in database...");

  // Get up to 5 most recent agent sessions for this project
  // Order by created_at to match UI query (UI sorts by created_at, not updated_at)
  const existingAgentSessions = await prisma.agentSession.findMany({
    where: { projectId: projectId },
    orderBy: { created_at: "desc" },
    take: 5,
  });

  const agentSessions = [];

  if (existingAgentSessions.length > 0) {
    console.log(
      `\n  Found ${existingAgentSessions.length} existing agent session(s) to link to workflows...`
    );

    for (const session of existingAgentSessions) {
      agentSessions.push(session);
      const displayName =
        session.name || session.cli_session_id || "Unnamed session";
      console.log(`    ✅ Using: ${displayName.substring(0, 60)}`);
    }

    // Link agent sessions to workflow steps (if we have enough sessions and steps)
    if (agentSessions.length > 0 && steps.length > 0) {
      console.log(`\n  Linking agent sessions to workflow steps...`);

      // Map sessions to meaningful workflow steps
      const stepMappings = [
        { stepIndex: 7, sessionIndex: 0 }, // Dark Mode - Implementation step
        { stepIndex: 14, sessionIndex: 1 }, // Bug Fix - Fix step
        { stepIndex: 20, sessionIndex: 2 }, // Code Review - Manual review step
      ];

      // Add mappings for completed/failed workflows if we have enough sessions
      if (agentSessions.length > 3 && steps.length > 31) {
        stepMappings.push({ stepIndex: 31, sessionIndex: 3 }); // Notification System - Implementation
      }
      if (agentSessions.length > 4 && steps.length > 44) {
        stepMappings.push({ stepIndex: 44, sessionIndex: 4 }); // Advanced Search - Implementation
      }

      let linkedCount = 0;
      for (const { stepIndex, sessionIndex } of stepMappings) {
        if (steps[stepIndex] && agentSessions[sessionIndex]) {
          await prisma.workflowRunStep.update({
            where: { id: steps[stepIndex].id },
            data: { agent_session_id: agentSessions[sessionIndex].id },
          });
          linkedCount++;
        }
      }

      console.log(`    ✅ Linked ${linkedCount} session(s) to workflow steps`);
    }

    console.log(
      `\n✅ Using ${agentSessions.length} existing agent session(s) from database`
    );
  } else {
    console.log(`  ℹ️  No agent sessions found in database`);
    console.log(
      `     Run the app and create some sessions first, then re-run this seed script`
    );
  }

  // Events with Attachments disabled - 'comment_added' is not a valid WorkflowEventType
  // TODO: Add comment_added to WorkflowEventType enum if user comments with attachments are needed

  const eventsWithAttachments = [];

  // // Example 1: User comment with screenshot attachment
  // eventsWithAttachments.push(...);

  // // Example 2: Agent comment with test results
  // eventsWithAttachments.push(...);

  // // Example 3: System comment with deployment logs
  // eventsWithAttachments.push(...);

  // // Example 4: User comment with verification screenshot
  // eventsWithAttachments.push(...);

  // // Example 5: Agent comment with multiple attachments
  // eventsWithAttachments.push(...);

  console.log(
    `Created ${eventsWithAttachments.length} events with attachments`
  );

  // Output direct links to workflow executions for easy preview
  const baseUrl = process.env.VITE_WS_HOST
    ? `http://${process.env.VITE_WS_HOST}:${process.env.VITE_PORT || 5173}`
    : `http://localhost:${process.env.VITE_PORT || 5173}`;

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📋 WORKFLOW RUN PREVIEW LINKS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("🟡 PENDING WORKFLOWS (2):");
  console.log(
    `   1. ${baseUrl}/projects/${projectId}/workflows/${runs[0].workflow_definition_id}/runs/${runs[0].id}`
  );
  console.log(`      └─ Feature: User Profile Settings (no steps started)`);
  console.log(
    `   2. ${baseUrl}/projects/${projectId}/workflows/${runs[1].workflow_definition_id}/runs/${runs[1].id}`
  );
  console.log(
    `      └─ Review: PR #456 - Authentication Updates (no steps started)\n`
  );

  console.log("🔵 RUNNING WORKFLOWS (7):");
  console.log(
    `   3. ${baseUrl}/projects/${projectId}/workflows/${runs[2].workflow_definition_id}/runs/${runs[2].id}`
  );
  console.log(
    `      └─ Feature: Dark Mode Support (Implementation phase)`
  );
  console.log(
    `   4. ${baseUrl}/projects/${projectId}/workflows/${runs[3].workflow_definition_id}/runs/${runs[3].id}`
  );
  console.log(
    `      └─ Bug Fix: Login Form Validation (Fix phase)`
  );
  console.log(
    `   5. ${baseUrl}/projects/${projectId}/workflows/${runs[4].workflow_definition_id}/runs/${runs[4].id}`
  );
  console.log(
    `      └─ Review: PR #789 - Database Migration (Feedback phase)`
  );
  console.log(
    `   6. ${baseUrl}/projects/${projectId}/workflows/${runs[5].workflow_definition_id}/runs/${runs[5].id}`
  );
  console.log(
    `      └─ Feature: Real-time Chat System (Design phase)`
  );
  console.log(
    `   7. ${baseUrl}/projects/${projectId}/workflows/${runs[6].workflow_definition_id}/runs/${runs[6].id}`
  );
  console.log(
    `      └─ Bug Fix: Performance Issues on Dashboard (Investigation phase)`
  );
  console.log(
    `   8. ${baseUrl}/projects/${projectId}/workflows/${runs[7].workflow_definition_id}/runs/${runs[7].id}`
  );
  console.log(
    `      └─ Feature: File Upload Service (Testing phase)`
  );
  console.log(
    `   9. ${baseUrl}/projects/${projectId}/workflows/${runs[8].workflow_definition_id}/runs/${runs[8].id}`
  );
  console.log(
    `      └─ Review: PR #912 - Refactor Auth Module (Analysis phase)\n`
  );

  console.log("⏸️  PAUSED WORKFLOWS (2):");
  console.log(
    `  10. ${baseUrl}/projects/${projectId}/workflows/${runs[9].workflow_definition_id}/runs/${runs[9].id}`
  );
  console.log(
    `      └─ Feature: Export to CSV (Testing phase, paused for QA)`
  );
  console.log(
    `  11. ${baseUrl}/projects/${projectId}/workflows/${runs[10].workflow_definition_id}/runs/${runs[10].id}`
  );
  console.log(
    `      └─ Bug Fix: Memory Leak in Dashboard (Investigation phase)\n`
  );

  console.log("✅ COMPLETED WORKFLOWS (7):");
  console.log(
    `  12. ${baseUrl}/projects/${projectId}/workflows/${runs[11].workflow_definition_id}/runs/${runs[11].id}`
  );
  console.log(
    `      └─ Feature: Notification System (Deployment phase)`
  );
  console.log(
    `  13. ${baseUrl}/projects/${projectId}/workflows/${runs[12].workflow_definition_id}/runs/${runs[12].id}`
  );
  console.log(
    `      └─ Bug Fix: Incorrect Date Formatting (Verification phase)`
  );
  console.log(
    `  14. ${baseUrl}/projects/${projectId}/workflows/${runs[13].workflow_definition_id}/runs/${runs[13].id}`
  );
  console.log(
    `      └─ Review: PR #234 - API Rate Limiting (Approval phase)`
  );
  console.log(
    `  15. ${baseUrl}/projects/${projectId}/workflows/${runs[14].workflow_definition_id}/runs/${runs[14].id}`
  );
  console.log(
    `      └─ Feature: User Authentication Improvements (Deployment phase)`
  );
  console.log(
    `  16. ${baseUrl}/projects/${projectId}/workflows/${runs[15].workflow_definition_id}/runs/${runs[15].id}`
  );
  console.log(
    `      └─ Bug Fix: Page Refresh Losing State (Verification phase)`
  );
  console.log(
    `  17. ${baseUrl}/projects/${projectId}/workflows/${runs[16].workflow_definition_id}/runs/${runs[16].id}`
  );
  console.log(
    `      └─ Feature: Advanced Filtering Options (Deployment phase)`
  );
  console.log(
    `  18. ${baseUrl}/projects/${projectId}/workflows/${runs[17].workflow_definition_id}/runs/${runs[17].id}`
  );
  console.log(
    `      └─ Review: PR #567 - Component Library Update (Approval phase)\n`
  );

  console.log("❌ FAILED WORKFLOWS (2):");
  console.log(
    `  19. ${baseUrl}/projects/${projectId}/workflows/${runs[18].workflow_definition_id}/runs/${runs[18].id}`
  );
  console.log(
    `      └─ Feature: Advanced Search (Failed at Testing phase)`
  );
  console.log(
    `  20. ${baseUrl}/projects/${projectId}/workflows/${runs[19].workflow_definition_id}/runs/${runs[19].id}`
  );
  console.log(
    `      └─ Bug Fix: API Endpoint 500 Error (Failed at Fix phase)\n`
  );

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("\nWorkflow seeding complete!");
  console.log(`Summary:`);
  console.log(`  - 3 workflow definitions`);
  console.log(`  - ${runs.length} workflow runs`);
  console.log(`  - ${stepCount} workflow run steps`);
  console.log(
    `  - ${agentSessions.length} agent sessions (linked to real Claude sessions)`
  );
  console.log(`  - ${events.length} workflow events`);
  console.log(`  - ${artifacts.length} artifacts`);
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
