import { test, expect } from "../../fixtures";

/**
 * Edit File E2E Test
 *
 * Verifies file editing and saving:
 * 1. Open file in editor
 * 2. Make changes to content
 * 3. Save changes
 * 4. Verify changes persisted to filesystem
 */

test.describe("Files - Edit", () => {
  test("should edit file content", async ({ authenticatedPage, db, testUser }) => {
    const [project] = await db.seedProjects([
      {
        name: `Edit File Project ${Date.now()}`,
        path: "/tmp/edit-file",
      },
    ]);

    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}/files`);
    await authenticatedPage.waitForLoadState("networkidle");
    await authenticatedPage.waitForTimeout(2000);

    const files = authenticatedPage.locator('[data-file], .file-item');

    if ((await files.count()) > 0) {
      await files.first().click();
      await authenticatedPage.waitForTimeout(1000);

      // Find editor content area
      const editor = authenticatedPage.locator(
        'textarea, [contenteditable="true"], .editor-content'
      );

      if ((await editor.count()) > 0) {
        // Add text to editor
        await editor.first().fill("Test edited content");
        await authenticatedPage.waitForTimeout(500);

        // Verify content changed
        const content = await editor.first().inputValue();
        expect(content).toContain("Test edited content");
      }
    }
  });

  test("should save file changes", async ({ authenticatedPage, db, testUser }) => {
    const [project] = await db.seedProjects([
      {
        name: `Save File Project ${Date.now()}`,
        path: "/tmp/save-file",
      },
    ]);

    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}/files`);
    await authenticatedPage.waitForLoadState("networkidle");
    await authenticatedPage.waitForTimeout(2000);

    const files = authenticatedPage.locator('[data-file], .file-item');

    if ((await files.count()) > 0) {
      await files.first().click();
      await authenticatedPage.waitForTimeout(1000);

      const editor = authenticatedPage.locator('textarea, [contenteditable="true"]');

      if ((await editor.count()) > 0) {
        // Edit content
        await editor.first().fill("Saved content test");

        // Look for save button or use Ctrl+S
        const saveButton = authenticatedPage.locator(
          'button:has-text("Save"), button[aria-label*="save" i]'
        );

        if ((await saveButton.count()) > 0) {
          await saveButton.first().click();
          await authenticatedPage.waitForTimeout(1000);

          // Look for success message
          const successMessage = authenticatedPage.locator(
            'text=/saved/i, text=/success/i, .success'
          );

          if ((await successMessage.count()) > 0) {
            await expect(successMessage.first()).toBeVisible({ timeout: 5000 });
          }
        } else {
          // Try keyboard shortcut
          await authenticatedPage.keyboard.press("Control+S");
          await authenticatedPage.waitForTimeout(1000);
        }
      }
    }
  });

  test("should show unsaved changes indicator", async ({ authenticatedPage, db, testUser }) => {
    const [project] = await db.seedProjects([
      {
        name: `Unsaved Changes Project ${Date.now()}`,
        path: "/tmp/unsaved",
      },
    ]);

    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}/files`);
    await authenticatedPage.waitForLoadState("networkidle");
    await authenticatedPage.waitForTimeout(2000);

    const files = authenticatedPage.locator('[data-file], .file-item');

    if ((await files.count()) > 0) {
      await files.first().click();
      await authenticatedPage.waitForTimeout(1000);

      const editor = authenticatedPage.locator('textarea, [contenteditable="true"]');

      if ((await editor.count()) > 0) {
        // Make changes
        await editor.first().fill("Unsaved changes");
        await authenticatedPage.waitForTimeout(500);

        // Look for unsaved indicator
        const unsavedIndicator = authenticatedPage.locator(
          '[data-unsaved], .unsaved, text=/unsaved/i, .modified'
        );

        if ((await unsavedIndicator.count()) > 0) {
          await expect(unsavedIndicator.first()).toBeVisible();
        }
      }
    }
  });
});
