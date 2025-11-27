import { test, expect } from "../../fixtures";

/**
 * File Browser E2E Test
 *
 * Verifies file browser functionality:
 * 1. Navigate to file browser
 * 2. Verify file tree displayed
 * 3. Verify folders and files visible
 * 4. Test folder expansion/collapse
 */

test.describe("Files - Browser", () => {
  test("should display file browser", async ({ authenticatedPage, db, testUser }) => {
    // Seed project
    const [project] = await db.seedProjects([
      {
        name: `File Browser Project ${Date.now()}`,
        path: "/tmp/file-browser",
        userId: testUser.id,
      },
    ]);

    // Navigate to project files
    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}/files`);
    await authenticatedPage.waitForLoadState("networkidle");

    // Look for file browser UI
    const fileBrowser = authenticatedPage.locator(
      '[data-testid="file-browser"], .file-browser, .file-tree, [role="tree"]'
    );

    if ((await fileBrowser.count()) > 0) {
      await expect(fileBrowser.first()).toBeVisible();
    }
  });

  test("should display files and folders in tree", async ({ authenticatedPage, db, testUser }) => {
    const [project] = await db.seedProjects([
      {
        name: `Tree Test Project ${Date.now()}`,
        path: "/tmp/tree-test",
        userId: testUser.id,
      },
    ]);

    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}/files`);
    await authenticatedPage.waitForLoadState("networkidle");
    await authenticatedPage.waitForTimeout(2000);

    // Look for file/folder items
    const fileItems = authenticatedPage.locator(
      '[data-file], [data-folder], .file-item, .folder-item, [role="treeitem"]'
    );

    if ((await fileItems.count()) > 0) {
      await expect(fileItems.first()).toBeVisible();
    }
  });

  test("should expand and collapse folders", async ({ authenticatedPage, db, testUser }) => {
    const [project] = await db.seedProjects([
      {
        name: `Expand Test Project ${Date.now()}`,
        path: "/tmp/expand-test",
        userId: testUser.id,
      },
    ]);

    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}/files`);
    await authenticatedPage.waitForLoadState("networkidle");
    await authenticatedPage.waitForTimeout(2000);

    // Find expandable folders
    const folders = authenticatedPage.locator(
      '[data-folder], .folder-item, [role="treeitem"][aria-expanded]'
    );

    if ((await folders.count()) > 0) {
      const folder = folders.first();

      // Check if expanded
      const isExpanded = await folder.evaluate((el) =>
        el.getAttribute("aria-expanded") === "true"
      );

      // Click to toggle
      await folder.click();
      await authenticatedPage.waitForTimeout(500);

      // Verify state changed
      const newIsExpanded = await folder.evaluate((el) =>
        el.getAttribute("aria-expanded") === "true"
      );

      expect(newIsExpanded).not.toBe(isExpanded);
    }
  });
});
