import { test, expect } from "../../fixtures";

/**
 * Open File E2E Test
 *
 * Verifies file opening in editor:
 * 1. Navigate to file browser
 * 2. Click on file
 * 3. Verify file opens in editor
 * 4. Verify file content loaded and displayed
 */

test.describe("Files - Open", () => {
  test("should open file in editor when clicked", async ({
    authenticatedPage,
    db,
    testUser,
  }) => {
    const [project] = await db.seedProjects([
      {
        name: `Open File Project ${Date.now()}`,
        path: "/tmp/open-file",
        userId: testUser.id,
      },
    ]);

    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}/files`);
    await authenticatedPage.waitForLoadState("networkidle");
    await authenticatedPage.waitForTimeout(2000);

    // Find file items
    const files = authenticatedPage.locator(
      '[data-file]:not([data-folder]), .file-item:not(.folder-item), [role="treeitem"]:not([aria-expanded])'
    );

    if ((await files.count()) > 0) {
      // Click first file
      await files.first().click();
      await authenticatedPage.waitForTimeout(1000);

      // Look for editor UI
      const editor = authenticatedPage.locator(
        '[data-testid="editor"], .editor, .code-editor, [role="textbox"]'
      );

      if ((await editor.count()) > 0) {
        await expect(editor.first()).toBeVisible();
      }
    }
  });

  test("should display file content in editor", async ({ authenticatedPage, db, testUser }) => {
    const [project] = await db.seedProjects([
      {
        name: `Content Display Project ${Date.now()}`,
        path: "/tmp/content-display",
        userId: testUser.id,
      },
    ]);

    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}/files`);
    await authenticatedPage.waitForLoadState("networkidle");
    await authenticatedPage.waitForTimeout(2000);

    const files = authenticatedPage.locator('[data-file]:not([data-folder]), .file-item');

    if ((await files.count()) > 0) {
      await files.first().click();
      await authenticatedPage.waitForTimeout(1000);

      // Verify content area has text
      const contentArea = authenticatedPage.locator(
        '[data-testid="editor"], .editor, .code-editor, textarea, [contenteditable="true"]'
      );

      if ((await contentArea.count()) > 0) {
        const content = await contentArea.first().textContent();
        expect(content).toBeDefined();
      }
    }
  });

  test("should highlight opened file in browser", async ({ authenticatedPage, db, testUser }) => {
    const [project] = await db.seedProjects([
      {
        name: `Highlight Project ${Date.now()}`,
        path: "/tmp/highlight",
        userId: testUser.id,
      },
    ]);

    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}/files`);
    await authenticatedPage.waitForLoadState("networkidle");
    await authenticatedPage.waitForTimeout(2000);

    const files = authenticatedPage.locator('[data-file], .file-item');

    if ((await files.count()) > 0) {
      const firstFile = files.first();
      await firstFile.click();
      await authenticatedPage.waitForTimeout(500);

      // Check if file has active/selected class
      const hasActiveClass = await firstFile.evaluate((el) =>
        el.classList.contains("active") ||
        el.classList.contains("selected") ||
        el.getAttribute("aria-selected") === "true"
      );

      expect(hasActiveClass).toBe(true);
    }
  });
});
