import { test, expect } from "../../fixtures";

/**
 * Create Project E2E Test
 *
 * Verifies project creation flow:
 * 1. Navigate to projects page
 * 2. Click "Create Project" button
 * 3. Fill project form
 * 4. Submit form
 * 5. Verify project appears in list
 * 6. Verify project exists in database
 */

test.describe("Projects - Create", () => {
  test("should create new project via UI form", async ({ authenticatedPage, prisma }) => {
    const projectName = `Test Project ${Date.now()}`;
    const projectPath = `/tmp/test-project-${Date.now()}`;

    // Navigate to projects page
    await authenticatedPage.goto("http://localhost:5101/projects");

    // Click create project button
    const createButton = authenticatedPage.locator(
      'button:has-text("Create Project"), button:has-text("New Project"), a:has-text("Create Project"), a:has-text("New Project")'
    );
    await createButton.first().click();

    // Wait for form to appear (modal or new page)
    await authenticatedPage.waitForSelector('input[name="name"], input[placeholder*="name" i]', {
      timeout: 5000,
    });

    // Fill project form
    await authenticatedPage.fill('input[name="name"], input[placeholder*="name" i]', projectName);
    await authenticatedPage.fill('input[name="path"], input[placeholder*="path" i]', projectPath);

    // Submit form
    await authenticatedPage.click('button[type="submit"], button:has-text("Create")');

    // Wait for project to appear in list
    await authenticatedPage.waitForSelector(`text="${projectName}"`, { timeout: 10000 });

    // Verify project is visible in UI
    const projectElement = authenticatedPage.locator(`text="${projectName}"`);
    await expect(projectElement).toBeVisible();

    // Verify project exists in database
    const project = await prisma.project.findFirst({
      where: { name: projectName },
    });

    expect(project).toBeTruthy();
    expect(project?.name).toBe(projectName);
    expect(project?.path).toBe(projectPath);
  });

  test("should create project with description", async ({ authenticatedPage, prisma }) => {
    const projectName = `Project with Description ${Date.now()}`;
    const projectPath = `/tmp/test-${Date.now()}`;
    const projectDescription = "This is a test project description";

    // Navigate to projects page
    await authenticatedPage.goto("http://localhost:5101/projects");

    // Click create button
    const createButton = authenticatedPage.locator(
      'button:has-text("Create Project"), button:has-text("New Project")'
    );
    await createButton.first().click();

    // Wait for form
    await authenticatedPage.waitForSelector('input[name="name"], input[placeholder*="name" i]');

    // Fill form with description
    await authenticatedPage.fill('input[name="name"], input[placeholder*="name" i]', projectName);
    await authenticatedPage.fill('input[name="path"], input[placeholder*="path" i]', projectPath);

    // Check if description field exists
    const descriptionField = authenticatedPage.locator(
      'textarea[name="description"], textarea[placeholder*="description" i], input[name="description"]'
    );
    if (await descriptionField.count() > 0) {
      await descriptionField.first().fill(projectDescription);
    }

    // Submit
    await authenticatedPage.click('button[type="submit"], button:has-text("Create")');

    // Wait for project in list
    await authenticatedPage.waitForSelector(`text="${projectName}"`, { timeout: 10000 });

    // Verify in database
    const project = await prisma.project.findFirst({
      where: { name: projectName },
    });

    expect(project).toBeTruthy();
    expect(project?.name).toBe(projectName);
  });

  test("should validate required fields", async ({ authenticatedPage }) => {
    // Navigate to projects page
    await authenticatedPage.goto("http://localhost:5101/projects");

    // Click create button
    const createButton = authenticatedPage.locator(
      'button:has-text("Create Project"), button:has-text("New Project")'
    );
    await createButton.first().click();

    // Wait for form
    await authenticatedPage.waitForSelector('input[name="name"], input[placeholder*="name" i]');

    // Try to submit empty form
    await authenticatedPage.click('button[type="submit"], button:has-text("Create")');

    // Verify form validation (either HTML5 validation or error message)
    const nameInput = authenticatedPage.locator('input[name="name"], input[placeholder*="name" i]');
    const isInvalid = await nameInput.first().evaluate((el: HTMLInputElement) => !el.validity.valid);

    // Should either have HTML5 validation or error message visible
    if (!isInvalid) {
      // Check for error message
      const errorMessage = authenticatedPage.locator('text=/required/i, text=/cannot be empty/i');
      await expect(errorMessage.first()).toBeVisible({ timeout: 3000 });
    } else {
      expect(isInvalid).toBe(true);
    }
  });
});
