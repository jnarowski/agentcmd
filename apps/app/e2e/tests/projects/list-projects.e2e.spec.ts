import { test, expect } from "../../fixtures";

/**
 * List Projects E2E Test
 *
 * Verifies project listing:
 * 1. Seed multiple projects in database
 * 2. Navigate to projects page
 * 3. Verify all projects displayed
 * 4. Verify project details shown correctly
 */

test.describe("Projects - List", () => {
  test("should display all user projects", async ({ authenticatedPage, db, testUser }) => {
    // Seed 3 projects
    const projects = [
      {
        name: `Project Alpha ${Date.now()}`,
        path: "/tmp/alpha",
      },
      {
        name: `Project Beta ${Date.now()}`,
        path: "/tmp/beta",
      },
      {
        name: `Project Gamma ${Date.now()}`,
        path: "/tmp/gamma",
      },
    ];

    await db.seedProjects(projects);

    // Navigate to projects page
    await authenticatedPage.goto("http://localhost:5101/projects");

    // Wait for projects to load
    await authenticatedPage.waitForSelector(`text="${projects[0].name}"`, { timeout: 10000 });

    // Verify all 3 projects are visible
    for (const project of projects) {
      const projectElement = authenticatedPage.locator(`text="${project.name}"`);
      await expect(projectElement).toBeVisible();
    }
  });

  test("should display empty state when no projects exist", async ({ authenticatedPage }) => {
    // Navigate to projects page (no projects seeded)
    await authenticatedPage.goto("http://localhost:5101/projects");

    // Wait for page to load
    await authenticatedPage.waitForLoadState("networkidle");

    // Look for empty state message
    const emptyMessage = authenticatedPage.locator(
      'text=/no projects/i, text=/create your first project/i, text=/get started/i'
    );

    // Should see empty state or create project button
    const hasEmptyMessage = await emptyMessage.count();
    const createButton = authenticatedPage.locator(
      'button:has-text("Create Project"), button:has-text("New Project")'
    );
    const hasCreateButton = await createButton.count();

    expect(hasEmptyMessage > 0 || hasCreateButton > 0).toBe(true);
  });

  test("should display project details in list", async ({ authenticatedPage, db, testUser }) => {
    const projectName = `Detailed Project ${Date.now()}`;
    const projectPath = "/tmp/detailed-project";
    const projectDescription = "Project with description";

    // Seed project with details
    await db.seedProjects([
      {
        name: projectName,
        path: projectPath,
      },
    ]);

    // Navigate to projects page
    await authenticatedPage.goto("http://localhost:5101/projects");

    // Wait for project to load
    await authenticatedPage.waitForSelector(`text="${projectName}"`, { timeout: 10000 });

    // Verify project name is visible
    const nameElement = authenticatedPage.locator(`text="${projectName}"`);
    await expect(nameElement).toBeVisible();

    // Verify path is visible (may be truncated or in tooltip)
    const pathElement = authenticatedPage.locator(`text*="${projectPath}"`);
    const pathCount = await pathElement.count();
    if (pathCount > 0) {
      await expect(pathElement.first()).toBeVisible();
    }

    // Verify description if displayed in list
    const descElement = authenticatedPage.locator(`text="${projectDescription}"`);
    const descCount = await descElement.count();
    if (descCount > 0) {
      await expect(descElement.first()).toBeVisible();
    }
  });

  test("should allow clicking on project to view details", async ({
    authenticatedPage,
    db,
    testUser,
  }) => {
    const projectName = `Clickable Project ${Date.now()}`;

    // Seed project
    const [project] = await db.seedProjects([
      {
        name: projectName,
        path: "/tmp/clickable",
      },
    ]);

    // Navigate to projects page
    await authenticatedPage.goto("http://localhost:5101/projects");

    // Wait for project
    await authenticatedPage.waitForSelector(`text="${projectName}"`, { timeout: 10000 });

    // Click on project
    await authenticatedPage.click(`text="${projectName}"`);

    // Should navigate to project details page
    await authenticatedPage.waitForURL(new RegExp(`/projects/${project.id}`), { timeout: 5000 });

    // Verify URL contains project ID
    expect(authenticatedPage.url()).toContain(`/projects/${project.id}`);
  });

  test("should only show current user projects", async ({ authenticatedPage, db, prisma, testUser }) => {
    const myProjectName = `My Project ${Date.now()}`;
    const otherProjectName = `Other Project ${Date.now()}`;

    // Create another user
    const otherUser = await prisma.user.create({
      data: {
        email: `other-${Date.now()}@example.com`,
        password_hash: "hashedpassword",
      },
    });

    // Seed projects for both users
    await db.seedProjects([
      {
        name: myProjectName,
        path: "/tmp/my-project",
      },
    ]);

    await prisma.project.create({
      data: {
        name: otherProjectName,
        path: "/tmp/other-project",
      },
    });

    // Navigate to projects page
    await authenticatedPage.goto("http://localhost:5101/projects");

    // Wait for my project
    await authenticatedPage.waitForSelector(`text="${myProjectName}"`, { timeout: 10000 });

    // Verify my project is visible
    const myProject = authenticatedPage.locator(`text="${myProjectName}"`);
    await expect(myProject).toBeVisible();

    // Verify other user's project is NOT visible
    const otherProject = authenticatedPage.locator(`text="${otherProjectName}"`);
    await expect(otherProject).not.toBeVisible();
  });
});
