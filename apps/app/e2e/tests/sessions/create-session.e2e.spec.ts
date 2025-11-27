import { test, expect } from "../../fixtures";
import { NewSessionPage, SessionPage } from "../../pages";

/**
 * Session Creation E2E Tests
 *
 * Tests the full flow of creating a new session and receiving an agent response.
 *
 * Prerequisites:
 * - E2E server running
 * - Claude Code CLI installed and authenticated locally
 * - WebSocket connection must be established
 *
 * Note: These tests use Claude Code CLI for AI responses. Locally this works
 * with your Claude Code auth. CI/CD setup TBD.
 */

test.describe("Sessions - Create Session", () => {
  test("should create a session and wait for agent response", async ({
    authenticatedPage,
    db,
  }) => {
    // Seed a project for testing
    const project = await db.seedProject({
      name: "E2E Test Project",
      path: "/tmp/e2e-test-project",
    });

    // Create page objects
    const newSessionPage = new NewSessionPage(authenticatedPage);
    const sessionPage = new SessionPage(authenticatedPage);

    // Navigate to new session page
    await newSessionPage.gotoForProject(project.id);
    await newSessionPage.expectNewSessionPage();

    // Wait for WebSocket connection
    await newSessionPage.expectWebSocketConnected();

    // Send a simple message to the agent
    const testMessage = "Say hello and nothing else";
    await newSessionPage.sendMessage(testMessage);

    // Wait for navigation to session page (session created)
    await newSessionPage.waitForSessionCreated();

    // Verify we're on the session page
    const sessionId = sessionPage.getSessionId();
    expect(sessionId).toBeTruthy();

    // Wait for the assistant to respond (may take some time for AI to process)
    // Using a longer timeout since AI responses can be slow
    await sessionPage.waitForAssistantMessage(60000);

    // Verify assistant message is visible
    await sessionPage.expectAssistantMessageVisible();
  });

  test("should display user message after sending", async ({
    authenticatedPage,
    db,
  }) => {
    // Seed a project for testing
    const project = await db.seedProject({
      name: "E2E Test Project 2",
      path: "/tmp/e2e-test-project-2",
    });

    // Create page objects
    const newSessionPage = new NewSessionPage(authenticatedPage);

    // Navigate to new session page
    await newSessionPage.gotoForProject(project.id);

    // Wait for WebSocket connection
    await newSessionPage.expectWebSocketConnected();

    // Send a message
    const testMessage = "Test user message";
    await newSessionPage.sendMessage(testMessage);

    // Wait for navigation to session page
    await newSessionPage.waitForSessionCreated();

    // The user message should be visible on the page
    await expect(authenticatedPage.locator(`text="${testMessage}"`)).toBeVisible();
  });
});

test.describe("Sessions - Session Page", () => {
  test("should allow sending follow-up messages", async ({
    authenticatedPage,
    db,
  }) => {
    // Seed a project for testing
    const project = await db.seedProject({
      name: "E2E Test Project 3",
      path: "/tmp/e2e-test-project-3",
    });

    // Create page objects
    const newSessionPage = new NewSessionPage(authenticatedPage);
    const sessionPage = new SessionPage(authenticatedPage);

    // Navigate and create initial session
    await newSessionPage.gotoForProject(project.id);
    await newSessionPage.expectWebSocketConnected();
    await newSessionPage.sendMessage("First message");
    await newSessionPage.waitForSessionCreated();

    // Wait for first response
    await sessionPage.waitForAssistantMessage(60000);

    // Send a follow-up message
    const followUpMessage = "Follow-up question";
    await sessionPage.sendMessage(followUpMessage);

    // Wait for streaming to complete
    await sessionPage.waitForStreamingComplete(60000);

    // Should have multiple assistant messages now
    const assistantMessages = sessionPage.getAssistantMessages();
    await expect(assistantMessages).toHaveCount(2, { timeout: 10000 });
  });
});
