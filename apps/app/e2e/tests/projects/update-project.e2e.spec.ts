import { test, expect } from "../../fixtures";

/**
 * Update Project E2E Test
 *
 * Verifies project update flow:
 * 1. Seed project in database
 * 2. Navigate to project details/edit page
 * 3. Click edit button
 * 4. Update project fields
 * 5. Submit changes
 * 6. Verify updates in UI and database
 */

test.describe("Projects - Update", () => {
  test("should update project name", async ({ authenticatedPage, db, testUser, prisma }) => {
    const originalName = `Original Project ${Date.now()}`;
    const updatedName = `Updated Project ${Date.now()}`;

    // Seed project
    const [project] = await db.seedProjects([
      {
        name: originalName,
        path: "/tmp/update-test",
        userId: testUser.id,
      },
    ]);

    // Navigate to project details
    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}`);

    // Wait for page load
    await authenticatedPage.waitForSelector(`text="${originalName}"`, { timeout: 10000 });

    // Click edit button
    const editButton = authenticatedPage.locator(
      'button:has-text("Edit"), a:has-text("Edit"), button[aria-label*="edit" i]'
    );
    await editButton.first().click();

    // Wait for edit form
    await authenticatedPage.waitForSelector('input[name="name"], input[value*="' + originalName + '"]', {
      timeout: 5000,
    });

    // Clear and update name
    const nameInput = authenticatedPage.locator('input[name="name"]').first();
    await nameInput.clear();
    await nameInput.fill(updatedName);

    // Submit form
    await authenticatedPage.click('button[type="submit"], button:has-text("Save"), button:has-text("Update")');

    // Wait for update to complete
    await authenticatedPage.waitForSelector(`text="${updatedName}"`, { timeout: 10000 });

    // Verify updated name in UI
    const nameElement = authenticatedPage.locator(`text="${updatedName}"`);
    await expect(nameElement).toBeVisible();

    // Verify in database
    const updatedProject = await prisma.project.findUnique({
      where: { id: project.id },
    });

    expect(updatedProject?.name).toBe(updatedName);
  });

  test("should update project description", async ({
    authenticatedPage,
    db,
    testUser,
    prisma,
  }) => {
    const projectName = `Project for Description Update ${Date.now()}`;
    const originalDescription = "Original description";
    const updatedDescription = "Updated description with new content";

    // Seed project
    const [project] = await db.seedProjects([
      {
        name: projectName,
        path: "/tmp/desc-update",
        description: originalDescription,
        userId: testUser.id,
      },
    ]);

    // Navigate to project details
    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}`);

    // Wait for page load
    await authenticatedPage.waitForSelector(`text="${projectName}"`, { timeout: 10000 });

    // Click edit button
    const editButton = authenticatedPage.locator(
      'button:has-text("Edit"), a:has-text("Edit"), button[aria-label*="edit" i]'
    );
    await editButton.first().click();

    // Wait for edit form
    await authenticatedPage.waitForSelector(
      'textarea[name="description"], input[name="description"]',
      { timeout: 5000 }
    );

    // Update description
    const descInput = authenticatedPage.locator(
      'textarea[name="description"], input[name="description"]'
    );
    await descInput.first().clear();
    await descInput.first().fill(updatedDescription);

    // Submit
    await authenticatedPage.click('button[type="submit"], button:has-text("Save"), button:has-text("Update")');

    // Wait for update
    await authenticatedPage.waitForTimeout(2000);

    // Verify in database
    const updatedProject = await prisma.project.findUnique({
      where: { id: project.id },
    });

    expect(updatedProject?.description).toBe(updatedDescription);
  });

  test("should update project path", async ({ authenticatedPage, db, testUser, prisma }) => {
    const projectName = `Path Update Project ${Date.now()}`;
    const originalPath = "/tmp/original-path";
    const updatedPath = "/tmp/updated-path";

    // Seed project
    const [project] = await db.seedProjects([
      {
        name: projectName,
        path: originalPath,
        userId: testUser.id,
      },
    ]);

    // Navigate to project details
    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}`);

    // Wait for page load
    await authenticatedPage.waitForSelector(`text="${projectName}"`, { timeout: 10000 });

    // Click edit button
    const editButton = authenticatedPage.locator(
      'button:has-text("Edit"), a:has-text("Edit"), button[aria-label*="edit" i]'
    );
    await editButton.first().click();

    // Wait for edit form
    await authenticatedPage.waitForSelector('input[name="path"]', { timeout: 5000 });

    // Update path
    const pathInput = authenticatedPage.locator('input[name="path"]');
    await pathInput.clear();
    await pathInput.fill(updatedPath);

    // Submit
    await authenticatedPage.click('button[type="submit"], button:has-text("Save"), button:has-text("Update")');

    // Wait for update
    await authenticatedPage.waitForTimeout(2000);

    // Verify in database
    const updatedProject = await prisma.project.findUnique({
      where: { id: project.id },
    });

    expect(updatedProject?.path).toBe(updatedPath);
  });

  test("should validate required fields during update", async ({
    authenticatedPage,
    db,
    testUser,
  }) => {
    const projectName = `Validation Project ${Date.now()}`;

    // Seed project
    const [project] = await db.seedProjects([
      {
        name: projectName,
        path: "/tmp/validation",
        userId: testUser.id,
      },
    ]);

    // Navigate to project details
    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}`);

    // Wait for page load
    await authenticatedPage.waitForSelector(`text="${projectName}"`, { timeout: 10000 });

    // Click edit button
    const editButton = authenticatedPage.locator(
      'button:has-text("Edit"), a:has-text("Edit"), button[aria-label*="edit" i]'
    );
    await editButton.first().click();

    // Wait for edit form
    await authenticatedPage.waitForSelector('input[name="name"]', { timeout: 5000 });

    // Clear name field
    const nameInput = authenticatedPage.locator('input[name="name"]');
    await nameInput.clear();

    // Try to submit
    await authenticatedPage.click('button[type="submit"], button:has-text("Save"), button:has-text("Update")');

    // Should show validation error
    const isInvalid = await nameInput.evaluate((el: HTMLInputElement) => !el.validity.valid);

    if (!isInvalid) {
      // Check for error message
      const errorMessage = authenticatedPage.locator('text=/required/i, text=/cannot be empty/i');
      await expect(errorMessage.first()).toBeVisible({ timeout: 3000 });
    } else {
      expect(isInvalid).toBe(true);
    }
  });

  test("should cancel edit without saving changes", async ({
    authenticatedPage,
    db,
    testUser,
    prisma,
  }) => {
    const originalName = `Cancel Edit Project ${Date.now()}`;
    const attemptedName = `Should Not Save ${Date.now()}`;

    // Seed project
    const [project] = await db.seedProjects([
      {
        name: originalName,
        path: "/tmp/cancel-edit",
        userId: testUser.id,
      },
    ]);

    // Navigate to project details
    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}`);

    // Wait for page load
    await authenticatedPage.waitForSelector(`text="${originalName}"`, { timeout: 10000 });

    // Click edit button
    const editButton = authenticatedPage.locator(
      'button:has-text("Edit"), a:has-text("Edit"), button[aria-label*="edit" i]'
    );
    await editButton.first().click();

    // Wait for edit form
    await authenticatedPage.waitForSelector('input[name="name"]', { timeout: 5000 });

    // Change name
    const nameInput = authenticatedPage.locator('input[name="name"]');
    await nameInput.clear();
    await nameInput.fill(attemptedName);

    // Click cancel button
    const cancelButton = authenticatedPage.locator(
      'button:has-text("Cancel"), button[aria-label*="cancel" i]'
    );

    if ((await cancelButton.count()) > 0) {
      await cancelButton.first().click();

      // Wait for form to close
      await authenticatedPage.waitForTimeout(1000);

      // Verify database still has original name
      const unchangedProject = await prisma.project.findUnique({
        where: { id: project.id },
      });

      expect(unchangedProject?.name).toBe(originalName);
      expect(unchangedProject?.name).not.toBe(attemptedName);
    }
  });
});
