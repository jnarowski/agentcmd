import { test, expect } from "../../fixtures";

/**
 * Create Session E2E Test
 *
 * Verifies session creation flow:
 * 1. Create project
 * 2. Navigate to project details
 * 3. Click "Create Session" button
 * 4. Fill session form
 * 5. Submit form
 * 6. Verify session appears in list
 * 7. Verify session exists in database
 */

test.describe("Sessions - Create", () => {
  test("should create new session for project", async ({
    authenticatedPage,
    db,
    testUser,
    prisma,
  }) => {
    const sessionTitle = `Test Session ${Date.now()}`;

    // Seed project
    const [project] = await db.seedProjects([
      {
        name: `Session Test Project ${Date.now()}`,
        path: "/tmp/session-test",
        userId: testUser.id,
      },
    ]);

    // Navigate to project details
    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}`);

    // Wait for page load
    await authenticatedPage.waitForLoadState("networkidle");

    // Click create session button
    const createButton = authenticatedPage.locator(
      'button:has-text("Create Session"), button:has-text("New Session"), a:has-text("Start Session")'
    );
    await createButton.first().click();

    // Wait for form
    await authenticatedPage.waitForSelector(
      'input[name="title"], input[placeholder*="title" i], input[placeholder*="session" i]',
      { timeout: 5000 }
    );

    // Fill session form
    const titleInput = authenticatedPage.locator(
      'input[name="title"], input[placeholder*="title" i], input[placeholder*="session" i]'
    );
    await titleInput.first().fill(sessionTitle);

    // Submit form
    await authenticatedPage.click('button[type="submit"], button:has-text("Create"), button:has-text("Start")');

    // Wait for session to appear
    await authenticatedPage.waitForSelector(`text="${sessionTitle}"`, { timeout: 10000 });

    // Verify session visible in UI
    const sessionElement = authenticatedPage.locator(`text="${sessionTitle}"`);
    await expect(sessionElement).toBeVisible();

    // Verify session in database
    const session = await prisma.session.findFirst({
      where: {
        title: sessionTitle,
        projectId: project.id,
        userId: testUser.id,
      },
    });

    expect(session).toBeTruthy();
    expect(session?.title).toBe(sessionTitle);
    expect(session?.projectId).toBe(project.id);
  });

  test("should create session with initial prompt", async ({
    authenticatedPage,
    db,
    testUser,
    prisma,
  }) => {
    const sessionTitle = `Prompted Session ${Date.now()}`;
    const initialPrompt = "Help me debug this function";

    // Seed project
    const [project] = await db.seedProjects([
      {
        name: `Prompt Test Project ${Date.now()}`,
        path: "/tmp/prompt-test",
        userId: testUser.id,
      },
    ]);

    // Navigate to project
    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}`);
    await authenticatedPage.waitForLoadState("networkidle");

    // Create session
    const createButton = authenticatedPage.locator(
      'button:has-text("Create Session"), button:has-text("New Session")'
    );
    await createButton.first().click();

    // Fill form
    await authenticatedPage.waitForSelector('input[name="title"], input[placeholder*="title" i]');

    const titleInput = authenticatedPage.locator('input[name="title"], input[placeholder*="title" i]');
    await titleInput.first().fill(sessionTitle);

    // Check for prompt/message field
    const promptField = authenticatedPage.locator(
      'textarea[name="prompt"], textarea[name="message"], textarea[placeholder*="message" i]'
    );

    if ((await promptField.count()) > 0) {
      await promptField.first().fill(initialPrompt);
    }

    // Submit
    await authenticatedPage.click('button[type="submit"], button:has-text("Create"), button:has-text("Start")');

    // Wait for session
    await authenticatedPage.waitForSelector(`text="${sessionTitle}"`, { timeout: 10000 });

    // Verify in database
    const session = await prisma.session.findFirst({
      where: { title: sessionTitle },
      include: { messages: true },
    });

    expect(session).toBeTruthy();

    // If prompt field was present, verify message was created
    if ((await promptField.count()) > 0) {
      expect(session?.messages.length).toBeGreaterThan(0);
      expect(session?.messages[0].content).toBe(initialPrompt);
    }
  });

  test("should set session status to active on creation", async ({
    authenticatedPage,
    db,
    testUser,
    prisma,
  }) => {
    const sessionTitle = `Active Session ${Date.now()}`;

    // Seed project
    const [project] = await db.seedProjects([
      {
        name: `Active Test Project ${Date.now()}`,
        path: "/tmp/active-test",
        userId: testUser.id,
      },
    ]);

    // Navigate and create session
    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}`);
    await authenticatedPage.waitForLoadState("networkidle");

    const createButton = authenticatedPage.locator(
      'button:has-text("Create Session"), button:has-text("New Session")'
    );
    await createButton.first().click();

    await authenticatedPage.waitForSelector('input[name="title"], input[placeholder*="title" i]');

    const titleInput = authenticatedPage.locator('input[name="title"], input[placeholder*="title" i]');
    await titleInput.first().fill(sessionTitle);

    await authenticatedPage.click('button[type="submit"], button:has-text("Create")');

    await authenticatedPage.waitForSelector(`text="${sessionTitle}"`, { timeout: 10000 });

    // Verify session status in database
    const session = await prisma.session.findFirst({
      where: { title: sessionTitle },
    });

    expect(session).toBeTruthy();
    expect(session?.status).toBe("active");
  });

  test("should validate required fields", async ({ authenticatedPage, db, testUser }) => {
    // Seed project
    const [project] = await db.seedProjects([
      {
        name: `Validation Project ${Date.now()}`,
        path: "/tmp/validation",
        userId: testUser.id,
      },
    ]);

    // Navigate to project
    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}`);
    await authenticatedPage.waitForLoadState("networkidle");

    // Open create form
    const createButton = authenticatedPage.locator(
      'button:has-text("Create Session"), button:has-text("New Session")'
    );
    await createButton.first().click();

    await authenticatedPage.waitForSelector('input[name="title"], input[placeholder*="title" i]');

    // Try to submit without filling title
    await authenticatedPage.click('button[type="submit"], button:has-text("Create")');

    // Check validation
    const titleInput = authenticatedPage.locator('input[name="title"], input[placeholder*="title" i]');
    const isInvalid = await titleInput.first().evaluate((el: HTMLInputElement) => !el.validity.valid);

    if (!isInvalid) {
      // Check for error message
      const errorMessage = authenticatedPage.locator('text=/required/i, text=/cannot be empty/i');
      await expect(errorMessage.first()).toBeVisible({ timeout: 3000 });
    } else {
      expect(isInvalid).toBe(true);
    }
  });
});
