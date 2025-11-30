import { test, expect } from "../../fixtures";
import { NewSessionPage, SessionPage } from "../../pages";

/**
 * Session Context E2E Tests
 *
 * Tests session context persistence and memory:
 * - Agent remembers information from earlier in conversation
 * - Context persists across multiple messages
 */

test.describe("Sessions - Context & Resume", () => {
  test.setTimeout(120000); // Real agent responses need time

  test("should maintain session context across messages", async ({
    authenticatedPage,
    db,
  }) => {
    // ======== ARRANGE ========
    // Seed project
    const project = await db.seedProject({
      name: `Context Test ${Date.now()}`,
    });

    // Create directory for project (needed for Claude CLI)
    const { mkdirSync } = await import("node:fs");
    mkdirSync(project.path, { recursive: true });

    // Create page objects
    const newSessionPage = new NewSessionPage(authenticatedPage);
    const sessionPage = new SessionPage(authenticatedPage);

    // ======== ACT ========
    // Navigate to new session page
    await newSessionPage.gotoForProject(project.id);
    await newSessionPage.expectWebSocketConnected();

    // Send first message with name
    await newSessionPage.sendMessage("Hey, my name is Nancy");
    await newSessionPage.waitForSessionCreated();

    // Wait for agent to respond
    await sessionPage.waitForAssistantMessage(60000);

    // Send follow-up question about name
    await sessionPage.sendMessage("What is my name?");
    await sessionPage.waitForStreamingComplete(60000);

    // ======== ASSERT ========
    // Get the last assistant message
    const assistantMessages = sessionPage.getAssistantMessages();
    const lastMessage = assistantMessages.last();

    // Verify response contains "nancy" (case-insensitive)
    const messageText = await lastMessage.textContent();
    expect(messageText?.toLowerCase()).toContain("nancy");
  });
});
