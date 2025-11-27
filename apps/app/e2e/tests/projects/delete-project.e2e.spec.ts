import { test, expect } from "../../fixtures";

/**
 * Delete Project E2E Test
 *
 * Verifies project deletion flow:
 * 1. Seed project in database
 * 2. Navigate to project details page
 * 3. Click delete button
 * 4. Confirm deletion
 * 5. Verify project removed from UI and database
 */

test.describe("Projects - Delete", () => {
  test("should delete project via UI", async ({ authenticatedPage, db, testUser, prisma }) => {
    const projectName = `Delete Test Project ${Date.now()}`;

    // Seed project
    const [project] = await db.seedProjects([
      {
        name: projectName,
        path: "/tmp/delete-test",
      },
    ]);

    // Navigate to project details
    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}`);

    // Wait for page load
    await authenticatedPage.waitForSelector(`text="${projectName}"`, { timeout: 10000 });

    // Click delete button
    const deleteButton = authenticatedPage.locator(
      'button:has-text("Delete"), button[aria-label*="delete" i]'
    );
    await deleteButton.first().click();

    // Handle confirmation dialog if present
    authenticatedPage.once("dialog", (dialog) => {
      dialog.accept();
    });

    // Wait for confirmation modal or direct deletion
    const confirmButton = authenticatedPage.locator(
      'button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")'
    );

    if ((await confirmButton.count()) > 0) {
      await confirmButton.first().click();
    }

    // Wait for redirect to projects list
    await authenticatedPage.waitForURL(/\/projects\/?$/, { timeout: 10000 });

    // Verify project not in list
    const projectElement = authenticatedPage.locator(`text="${projectName}"`);
    await expect(projectElement).not.toBeVisible();

    // Verify project deleted from database
    const deletedProject = await prisma.project.findUnique({
      where: { id: project.id },
    });

    expect(deletedProject).toBeNull();
  });

  test("should show confirmation dialog before deleting", async ({
    authenticatedPage,
    db,
    testUser,
  }) => {
    const projectName = `Confirm Delete Project ${Date.now()}`;

    // Seed project
    const [project] = await db.seedProjects([
      {
        name: projectName,
        path: "/tmp/confirm-delete",
      },
    ]);

    // Navigate to project details
    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}`);

    // Wait for page load
    await authenticatedPage.waitForSelector(`text="${projectName}"`, { timeout: 10000 });

    // Track if dialog appears
    let dialogAppeared = false;
    authenticatedPage.once("dialog", (dialog) => {
      dialogAppeared = true;
      dialog.dismiss(); // Cancel deletion
    });

    // Click delete button
    const deleteButton = authenticatedPage.locator(
      'button:has-text("Delete"), button[aria-label*="delete" i]'
    );
    await deleteButton.first().click();

    // Wait for confirmation modal or dialog
    await authenticatedPage.waitForTimeout(1000);

    const confirmModal = authenticatedPage.locator(
      'text=/are you sure/i, text=/confirm delete/i, text=/cannot be undone/i'
    );

    const hasModal = await confirmModal.count();

    // Should have either browser dialog or modal confirmation
    expect(dialogAppeared || hasModal > 0).toBe(true);
  });

  test("should cancel deletion if user dismisses confirmation", async ({
    authenticatedPage,
    db,
    testUser,
    prisma,
  }) => {
    const projectName = `Cancel Delete Project ${Date.now()}`;

    // Seed project
    const [project] = await db.seedProjects([
      {
        name: projectName,
        path: "/tmp/cancel-delete",
      },
    ]);

    // Navigate to project details
    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}`);

    // Wait for page load
    await authenticatedPage.waitForSelector(`text="${projectName}"`, { timeout: 10000 });

    // Handle dialog by canceling
    authenticatedPage.once("dialog", (dialog) => {
      dialog.dismiss();
    });

    // Click delete button
    const deleteButton = authenticatedPage.locator(
      'button:has-text("Delete"), button[aria-label*="delete" i]'
    );
    await deleteButton.first().click();

    // Check for modal cancel button
    const cancelButton = authenticatedPage.locator(
      'button:has-text("Cancel"), button:has-text("No")'
    );

    if ((await cancelButton.count()) > 0) {
      await cancelButton.first().click();
    }

    // Wait a moment
    await authenticatedPage.waitForTimeout(1000);

    // Verify still on project page
    expect(authenticatedPage.url()).toContain(`/projects/${project.id}`);

    // Verify project still in database
    const stillExists = await prisma.project.findUnique({
      where: { id: project.id },
    });

    expect(stillExists).toBeTruthy();
    expect(stillExists?.name).toBe(projectName);
  });

  test("should delete project and its associated sessions", async ({
    authenticatedPage,
    db,
    testUser,
    prisma,
  }) => {
    const projectName = `Project with Sessions ${Date.now()}`;

    // Seed project
    const [project] = await db.seedProjects([
      {
        name: projectName,
        path: "/tmp/project-with-sessions",
      },
    ]);

    // Seed sessions for the project
    const [session] = await db.seedSessions([
      {
        name: `Session for ${projectName}`,
        projectId: project.id,
        userId: testUser.id,
        state: "idle",
      },
    ]);

    // Navigate to project details
    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}`);

    // Wait for page load
    await authenticatedPage.waitForSelector(`text="${projectName}"`, { timeout: 10000 });

    // Delete project
    const deleteButton = authenticatedPage.locator(
      'button:has-text("Delete"), button[aria-label*="delete" i]'
    );
    await deleteButton.first().click();

    // Confirm deletion
    authenticatedPage.once("dialog", (dialog) => dialog.accept());

    const confirmButton = authenticatedPage.locator(
      'button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")'
    );

    if ((await confirmButton.count()) > 0) {
      await confirmButton.first().click();
    }

    // Wait for redirect
    await authenticatedPage.waitForURL(/\/projects\/?$/, { timeout: 10000 });

    // Verify project deleted
    const deletedProject = await prisma.project.findUnique({
      where: { id: project.id },
    });
    expect(deletedProject).toBeNull();

    // Verify associated sessions also deleted (cascade)
    const deletedSession = await prisma.agentSession.findUnique({
      where: { id: session.id },
    });
    expect(deletedSession).toBeNull();
  });

  test("should not delete other user's project", async ({
    authenticatedPage,
    prisma,
  }) => {
    // Create another user
    const otherUser = await prisma.user.create({
      data: {
        email: `other-${Date.now()}@example.com`,
        password_hash: "hashedpassword",
      },
    });

    // Create project for other user
    const otherProject = await prisma.project.create({
      data: {
        name: `Other User Project ${Date.now()}`,
        path: "/tmp/other-user-project",
      },
    });

    // Try to navigate to other user's project
    await authenticatedPage.goto(`http://localhost:5101/projects/${otherProject.id}`);

    // Should not be able to access or should show error
    await authenticatedPage.waitForLoadState("networkidle");

    const deleteButton = authenticatedPage.locator(
      'button:has-text("Delete"), button[aria-label*="delete" i]'
    );

    // Delete button should not be visible OR page should show error
    const errorMessage = authenticatedPage.locator(
      'text=/not found/i, text=/access denied/i, text=/unauthorized/i'
    );

    const hasError = await errorMessage.count();
    const hasDeleteButton = await deleteButton.count();

    // Should either show error or not show delete button
    if (hasError === 0) {
      expect(hasDeleteButton).toBe(0);
    }
  });
});
