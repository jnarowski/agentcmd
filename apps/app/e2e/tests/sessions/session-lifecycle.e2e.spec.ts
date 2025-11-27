import { test, expect } from "../../fixtures";
import {
  setupWebSocketForwarding,
  waitForWebSocketEvent,
  waitForWebSocketEventMatching,
} from "../../utils/wait-for-websocket";

/**
 * GOLD STANDARD E2E TEST (Refactored)
 *
 * Complete session lifecycle using extracted fixtures:
 * - authenticatedPage: Auto-auth via API + localStorage
 * - testUser: User object with id, email, token
 * - prisma: PrismaClient for direct DB access
 * - db: Seeding helpers
 *
 * Complete user journey:
 * 1. Seed project in database
 * 2. Navigate to project page (auto-authenticated)
 * 3. Create session via UI
 * 4. Wait for WebSocket session.created event
 * 5. Send message via input
 * 6. Wait for WebSocket streaming events
 * 7. Verify UI displays response
 * 8. Stop session via button
 * 9. Wait for WebSocket session.state_changed event
 * 10. Verify database: session state = 'completed'
 */

test.describe("Session Lifecycle (Gold Standard)", () => {
  test("should complete full session lifecycle with WebSocket events", async ({
    authenticatedPage,
    testUser,
    prisma,
  }) => {
    // ============================================
    // PATTERN 1: Database Seeding (Using Fixtures)
    // ============================================

    // Seed a project directly in database
    const project = await prisma.project.create({
      data: {
        name: "E2E Test Project",
        path: "/tmp/e2e-project",
      },
    });

    expect(project.id).toBeDefined();

    // ============================================
    // PATTERN 2: WebSocket Event Forwarding Setup
    // ============================================

    // Setup WebSocket event capturing
    const wsEvents = await setupWebSocketForwarding(authenticatedPage);

    // ============================================
    // PATTERN 3: UI Navigation (Using authenticatedPage)
    // ============================================

    // Navigate to projects page (already authenticated via fixture)
    await authenticatedPage.goto("http://localhost:5101/projects");
    await authenticatedPage.waitForLoadState("networkidle");

    // Verify project is visible
    await expect(
      authenticatedPage.getByText(project.name, { exact: false })
    ).toBeVisible();

    // Click on project to navigate to project details
    await authenticatedPage.click(`text=${project.name}`);
    await authenticatedPage.waitForURL(`**/projects/${project.id}`);

    // ============================================
    // PATTERN 4: Create Session via UI
    // ============================================

    // Click "New Session" button
    await authenticatedPage.click('button:has-text("New Session")');

    // Wait for session create form/dialog
    await expect(
      authenticatedPage.getByLabel("Session Name")
    ).toBeVisible();

    // Fill in session name
    await authenticatedPage.fill('input[name="name"]', "E2E Test Session");

    // Submit form
    await authenticatedPage.click('button[type="submit"]:has-text("Create")');

    // ============================================
    // PATTERN 5: Wait for WebSocket Events (Using Utilities)
    // ============================================

    // Wait for session.created WebSocket event (timeout 10s)
    const sessionCreatedEvent = await waitForWebSocketEvent(
      authenticatedPage,
      wsEvents,
      "session.created",
      10_000
    );

    expect(sessionCreatedEvent).toBeDefined();
    // @ts-ignore - data shape from WebSocket
    const sessionId = sessionCreatedEvent.data.sessionId;
    expect(sessionId).toBeDefined();

    // ============================================
    // PATTERN 6: Send Message via UI
    // ============================================

    // Wait for session page to load
    await authenticatedPage.waitForURL(`**/sessions/${sessionId}`);

    // Wait for message input to be ready
    await expect(
      authenticatedPage.getByPlaceholder("Type a message...")
    ).toBeVisible();

    // Type message
    await authenticatedPage.fill(
      'textarea[placeholder="Type a message..."]',
      "Hello, this is an E2E test message"
    );

    // Send message
    await authenticatedPage.click('button[aria-label="Send message"]');

    // ============================================
    // PATTERN 7: Wait for Streaming WebSocket Events
    // ============================================

    // Wait for session.stream_output event
    const streamEvent = await waitForWebSocketEvent(
      authenticatedPage,
      wsEvents,
      "session.stream_output",
      30_000 // Longer timeout for AI response
    );

    expect(streamEvent).toBeDefined();

    // ============================================
    // PATTERN 8: Verify UI Displays Response
    // ============================================

    // Verify assistant response is visible in UI
    await expect(
      authenticatedPage.locator('[data-role="assistant-message"]')
    ).toBeVisible({
      timeout: 30_000,
    });

    // ============================================
    // PATTERN 9: Stop Session via UI
    // ============================================

    // Click stop session button
    await authenticatedPage.click('button:has-text("Stop Session")');

    // ============================================
    // PATTERN 10: Wait for Session State Change (Using Utilities)
    // ============================================

    // Wait for session.state_changed event with state = 'completed'
    await waitForWebSocketEventMatching(
      authenticatedPage,
      wsEvents,
      (e) => {
        // @ts-ignore - data shape from WebSocket
        return e.type === "session.state_changed" && e.data.state === "completed";
      },
      10_000
    );

    // ============================================
    // PATTERN 11: Verify Database State (Using Prisma)
    // ============================================

    // Verify session state in database
    const sessionInDb = await prisma.agentSession.findUnique({
      where: { id: sessionId },
    });

    expect(sessionInDb).toBeDefined();
    expect(sessionInDb!.state).toBe("completed");

    // Messages are stored in JSONL files, not in database
    // so we skip message verification here

    // ============================================
    // Cleanup
    // ============================================

    // Clean up test data
    await prisma.agentSession.delete({
      where: { id: sessionId },
    });
    await prisma.project.delete({
      where: { id: project.id },
    });
  });
});
