import { test, expect } from "../../fixtures";
import { NewSessionPage, SessionPage } from "../../pages";

/**
 * Session Creation E2E Tests
 *
 * Tests the UI flow of creating a new session and sending messages.
 *
 * Note: These tests focus on UI interactions and don't require real AI responses.
 * Tests that require agent responses are marked with .skip and need:
 * - Claude Code CLI installed and authenticated locally
 * - Proper API keys configured
 */

test.describe("Sessions - Create Session", () => {
  test("should create a session and display user message", async ({
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
    const testMessage = "Test message for session creation";
    await newSessionPage.sendMessage(testMessage);

    // Wait for navigation to session page (session created)
    await newSessionPage.waitForSessionCreated();

    // Verify we're on the session page
    const sessionId = sessionPage.getSessionId();
    expect(sessionId).toBeTruthy();

    // Verify user message is visible
    await expect(authenticatedPage.locator(`text="${testMessage}"`)).toBeVisible();
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

test.describe("Sessions - With Agent Responses", () => {
  // These tests require Claude Code CLI to be installed and authenticated
  test.skip("should wait for agent response", async ({
    authenticatedPage,
    db,
  }) => {
    const project = await db.seedProject({
      name: "E2E Test Project 3",
      path: "/tmp/e2e-test-project-3",
    });

    const newSessionPage = new NewSessionPage(authenticatedPage);
    const sessionPage = new SessionPage(authenticatedPage);

    await newSessionPage.gotoForProject(project.id);
    await newSessionPage.expectWebSocketConnected();
    await newSessionPage.sendMessage("Say hello and nothing else");
    await newSessionPage.waitForSessionCreated();

    // Wait for the assistant to respond
    await sessionPage.waitForAssistantMessage(60000);
    await sessionPage.expectAssistantMessageVisible();
  });

  test.skip("should allow sending follow-up messages", async ({
    authenticatedPage,
    db,
  }) => {
    const project = await db.seedProject({
      name: "E2E Test Project 4",
      path: "/tmp/e2e-test-project-4",
    });

    const newSessionPage = new NewSessionPage(authenticatedPage);
    const sessionPage = new SessionPage(authenticatedPage);

    await newSessionPage.gotoForProject(project.id);
    await newSessionPage.expectWebSocketConnected();
    await newSessionPage.sendMessage("First message");
    await newSessionPage.waitForSessionCreated();

    await sessionPage.waitForAssistantMessage(60000);

    const followUpMessage = "Follow-up question";
    await sessionPage.sendMessage(followUpMessage);
    await sessionPage.waitForStreamingComplete(60000);

    const assistantMessages = sessionPage.getAssistantMessages();
    await expect(assistantMessages).toHaveCount(2, { timeout: 10000 });
  });
});
