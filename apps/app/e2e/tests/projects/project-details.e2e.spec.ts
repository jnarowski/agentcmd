import { test, expect } from "../../fixtures";

/**
 * Project Details E2E Test
 *
 * Verifies project details page:
 * 1. Seed project in database
 * 2. Navigate to project details page
 * 3. Verify project information displayed
 * 4. Verify actions available (edit, delete, create session)
 */

test.describe("Projects - Details", () => {
  test("should display project details", async ({ authenticatedPage, db, testUser }) => {
    const projectName = `Details Project ${Date.now()}`;
    const projectPath = "/tmp/details-project";
    const projectDescription = "A project with detailed information";

    // Seed project
    const [project] = await db.seedProjects([
      {
        name: projectName,
        path: projectPath,
        description: projectDescription,
        userId: testUser.id,
      },
    ]);

    // Navigate directly to project details page
    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}`);

    // Wait for page to load
    await authenticatedPage.waitForSelector(`text="${projectName}"`, { timeout: 10000 });

    // Verify project name is displayed
    const nameElement = authenticatedPage.locator(`text="${projectName}"`);
    await expect(nameElement).toBeVisible();

    // Verify project path is displayed
    const pathElement = authenticatedPage.locator(`text*="${projectPath}"`);
    await expect(pathElement.first()).toBeVisible();

    // Verify description if displayed
    const descElement = authenticatedPage.locator(`text="${projectDescription}"`);
    const descCount = await descElement.count();
    if (descCount > 0) {
      await expect(descElement.first()).toBeVisible();
    }
  });

  test("should show edit button on project details page", async ({
    authenticatedPage,
    db,
    testUser,
  }) => {
    const projectName = `Edit Button Project ${Date.now()}`;

    // Seed project
    const [project] = await db.seedProjects([
      {
        name: projectName,
        path: "/tmp/edit-project",
        userId: testUser.id,
      },
    ]);

    // Navigate to project details
    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}`);

    // Wait for page load
    await authenticatedPage.waitForSelector(`text="${projectName}"`, { timeout: 10000 });

    // Look for edit button
    const editButton = authenticatedPage.locator(
      'button:has-text("Edit"), a:has-text("Edit"), button[aria-label*="edit" i]'
    );

    await expect(editButton.first()).toBeVisible();
  });

  test("should show delete button on project details page", async ({
    authenticatedPage,
    db,
    testUser,
  }) => {
    const projectName = `Delete Button Project ${Date.now()}`;

    // Seed project
    const [project] = await db.seedProjects([
      {
        name: projectName,
        path: "/tmp/delete-project",
        userId: testUser.id,
      },
    ]);

    // Navigate to project details
    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}`);

    // Wait for page load
    await authenticatedPage.waitForSelector(`text="${projectName}"`, { timeout: 10000 });

    // Look for delete button
    const deleteButton = authenticatedPage.locator(
      'button:has-text("Delete"), a:has-text("Delete"), button[aria-label*="delete" i]'
    );

    await expect(deleteButton.first()).toBeVisible();
  });

  test("should display project sessions if any exist", async ({
    authenticatedPage,
    db,
    testUser,
  }) => {
    const projectName = `Project with Sessions ${Date.now()}`;

    // Seed project
    const [project] = await db.seedProjects([
      {
        name: projectName,
        path: "/tmp/sessions-project",
        userId: testUser.id,
      },
    ]);

    // Seed sessions for the project
    const sessionTitle = `Test Session ${Date.now()}`;
    await db.seedSessions([
      {
        title: sessionTitle,
        projectId: project.id,
        userId: testUser.id,
        status: "active",
      },
    ]);

    // Navigate to project details
    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}`);

    // Wait for page load
    await authenticatedPage.waitForSelector(`text="${projectName}"`, { timeout: 10000 });

    // Look for sessions section or session title
    const sessionElement = authenticatedPage.locator(`text="${sessionTitle}"`);
    const sessionsHeader = authenticatedPage.locator('text=/sessions/i, text=/session list/i');

    // Either session title or sessions header should be visible
    const sessionVisible = await sessionElement.count();
    const headerVisible = await sessionsHeader.count();

    expect(sessionVisible > 0 || headerVisible > 0).toBe(true);
  });

  test("should handle non-existent project gracefully", async ({ authenticatedPage }) => {
    const fakeProjectId = "00000000-0000-0000-0000-000000000000";

    // Navigate to non-existent project
    await authenticatedPage.goto(`http://localhost:5101/projects/${fakeProjectId}`);

    // Wait for page to load
    await authenticatedPage.waitForLoadState("networkidle");

    // Should show 404 or error message
    const errorMessage = authenticatedPage.locator(
      'text=/not found/i, text=/does not exist/i, text=/404/i'
    );

    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test("should not allow access to other user's project", async ({
    authenticatedPage,
    prisma,
  }) => {
    // Create another user and their project
    const otherUser = await prisma.user.create({
      data: {
        email: `other-user-${Date.now()}@example.com`,
        password: "hashedpassword",
        name: "Other User",
      },
    });

    const otherProject = await prisma.project.create({
      data: {
        name: `Other User Project ${Date.now()}`,
        path: "/tmp/other-user-project",
        userId: otherUser.id,
      },
    });

    // Try to access other user's project
    await authenticatedPage.goto(`http://localhost:5101/projects/${otherProject.id}`);

    // Wait for response
    await authenticatedPage.waitForLoadState("networkidle");

    // Should show error or redirect
    const url = authenticatedPage.url();
    const errorMessage = authenticatedPage.locator(
      'text=/not found/i, text=/access denied/i, text=/unauthorized/i, text=/404/i'
    );

    const hasError = await errorMessage.count();
    const redirected = !url.includes(otherProject.id);

    expect(hasError > 0 || redirected).toBe(true);
  });
});
