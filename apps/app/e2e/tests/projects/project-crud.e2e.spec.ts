import { test, expect } from "../../fixtures";
import { ProjectsPage, ProjectDetailPage, ProjectEditPage } from "../../pages";

/**
 * Project CRUD E2E Tests
 *
 * Tests the full CRUD flow for projects including:
 * - Creating projects via API (fast)
 * - Viewing project details
 * - Editing project name
 * - Verifying persistence in list and database
 */

test.describe("Projects - CRUD Operations", () => {
  test("should update project name and persist changes", async ({
    authenticatedPage,
    db,
  }) => {
    // ======== ARRANGE ========
    // Seed test project with fixture
    const { project } = await db.seedTestProject({
      name: `E2E Test Project ${Date.now()}`,
      copyFixture: true,
    });

    // Create page objects
    const projectsPage = new ProjectsPage(authenticatedPage);
    const projectDetailPage = new ProjectDetailPage(authenticatedPage);
    const projectEditPage = new ProjectEditPage(authenticatedPage);

    // ======== ACT ========
    // Navigate to project detail page
    await projectDetailPage.goto(project.id);
    await projectDetailPage.expectOnProjectPage();

    // Click edit button to navigate to edit page
    await projectDetailPage.clickEditButton();
    await projectEditPage.expectOnEditPage();

    // Update project name
    const newName = `Updated Project ${Date.now()}`;
    await projectEditPage.fillName(newName);
    await projectEditPage.clickSave();

    // Wait for redirect back to project detail page
    await projectDetailPage.expectOnProjectPage();

    // ======== ASSERT ========
    // Verify name updated in UI
    const displayedName = await projectDetailPage.getProjectName();
    expect(displayedName).toBe(newName);

    // Verify name updated in database
    const updatedProject = await db.prisma.project.findUnique({
      where: { id: project.id },
    });
    expect(updatedProject?.name).toBe(newName);

    // Navigate back to projects list
    await projectsPage.goto();
    await projectsPage.expectOnProjectsPage();

    // Verify updated name visible in list
    await expect(
      authenticatedPage.locator(`text="${newName}"`).first()
    ).toBeVisible({ timeout: 5000 });
  });
});
