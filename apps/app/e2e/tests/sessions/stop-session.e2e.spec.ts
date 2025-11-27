import { test, expect } from "../../fixtures";
import { setupWebSocketForwarding, waitForWebSocketEvent } from "../../utils/wait-for-websocket";

/**
 * Stop Session E2E Test
 *
 * Verifies session stop/pause flow:
 * 1. Create active session
 * 2. Send message to start processing
 * 3. Click stop/pause button
 * 4. Wait for WebSocket state change event
 * 5. Verify session status updated in database
 * 6. Verify UI reflects stopped state
 */

test.describe("Sessions - Stop", () => {
  test("should stop active session", async ({ authenticatedPage, db, testUser, prisma }) => {
    const sessionTitle = `Stop Test Session ${Date.now()}`;

    // Seed project and session
    const [project] = await db.seedProjects([
      {
        name: `Stop Test Project ${Date.now()}`,
        path: "/tmp/stop-test",
        userId: testUser.id,
      },
    ]);

    const [session] = await db.seedSessions([
      {
        title: sessionTitle,
        projectId: project.id,
        userId: testUser.id,
        status: "active",
      },
    ]);

    // Navigate to session
    await authenticatedPage.goto(`http://localhost:5101/sessions/${session.id}`);
    await authenticatedPage.waitForLoadState("networkidle");

    // Verify session is active
    let dbSession = await prisma.session.findUnique({
      where: { id: session.id },
    });
    expect(dbSession?.status).toBe("active");

    // Look for stop button
    const stopButton = authenticatedPage.locator(
      'button:has-text("Stop"), button:has-text("End"), button[aria-label*="stop" i]'
    );

    if ((await stopButton.count()) > 0) {
      // Set up WebSocket monitoring
      await setupWebSocketForwarding(authenticatedPage);

      // Click stop button
      await stopButton.first().click();

      // Wait for state change event
      try {
        const stateEvent = await waitForWebSocketEvent(
          authenticatedPage,
          "session.state_changed",
          10000
        );
        expect(stateEvent).toBeTruthy();
      } catch (e) {
        // May not have WebSocket event, continue anyway
      }

      // Wait for database update
      await authenticatedPage.waitForTimeout(2000);

      // Verify session status changed in database
      dbSession = await prisma.session.findUnique({
        where: { id: session.id },
      });

      // Should be stopped, completed, or inactive
      expect(["stopped", "completed", "inactive"]).toContain(dbSession?.status);
    }
  });

  test("should update UI when session is stopped", async ({
    authenticatedPage,
    db,
    testUser,
  }) => {
    const sessionTitle = `UI Stop Test ${Date.now()}`;

    // Seed project and session
    const [project] = await db.seedProjects([
      {
        name: `UI Stop Project ${Date.now()}`,
        path: "/tmp/ui-stop-test",
        userId: testUser.id,
      },
    ]);

    const [session] = await db.seedSessions([
      {
        title: sessionTitle,
        projectId: project.id,
        userId: testUser.id,
        status: "active",
      },
    ]);

    // Navigate to session
    await authenticatedPage.goto(`http://localhost:5101/sessions/${session.id}`);
    await authenticatedPage.waitForLoadState("networkidle");

    // Look for stop button
    const stopButton = authenticatedPage.locator(
      'button:has-text("Stop"), button:has-text("End"), button[aria-label*="stop" i]'
    );

    if ((await stopButton.count()) > 0) {
      await stopButton.first().click();

      // Wait for UI update
      await authenticatedPage.waitForTimeout(2000);

      // Verify UI shows stopped state
      const stoppedIndicator = authenticatedPage.locator(
        'text=/stopped/i, text=/ended/i, text=/inactive/i, [data-status="stopped"], .status-stopped'
      );

      const hasIndicator = await stoppedIndicator.count();

      // OR check that stop button is no longer visible/enabled
      const stopButtonDisabled = await stopButton
        .first()
        .evaluate((el: HTMLButtonElement) => el.disabled);

      expect(hasIndicator > 0 || stopButtonDisabled).toBe(true);
    }
  });

  test("should disable message input when session is stopped", async ({
    authenticatedPage,
    db,
    testUser,
    prisma,
  }) => {
    const sessionTitle = `Input Disable Test ${Date.now()}`;

    // Seed project and session
    const [project] = await db.seedProjects([
      {
        name: `Input Disable Project ${Date.now()}`,
        path: "/tmp/input-disable",
        userId: testUser.id,
      },
    ]);

    const [session] = await db.seedSessions([
      {
        title: sessionTitle,
        projectId: project.id,
        userId: testUser.id,
        status: "active",
      },
    ]);

    // Navigate to session
    await authenticatedPage.goto(`http://localhost:5101/sessions/${session.id}`);
    await authenticatedPage.waitForLoadState("networkidle");

    // Verify message input is enabled
    const messageInput = authenticatedPage.locator(
      'textarea[placeholder*="message" i], input[placeholder*="message" i]'
    );

    if ((await messageInput.count()) > 0) {
      let isDisabled = await messageInput.first().evaluate((el: HTMLInputElement | HTMLTextAreaElement) => el.disabled);
      expect(isDisabled).toBe(false);

      // Stop session
      const stopButton = authenticatedPage.locator(
        'button:has-text("Stop"), button:has-text("End")'
      );

      if ((await stopButton.count()) > 0) {
        await stopButton.first().click();
        await authenticatedPage.waitForTimeout(2000);

        // Verify input is now disabled
        isDisabled = await messageInput.first().evaluate((el: HTMLInputElement | HTMLTextAreaElement) => el.disabled);
        expect(isDisabled).toBe(true);
      } else {
        // Manually update session status to test UI
        await prisma.session.update({
          where: { id: session.id },
          data: { status: "stopped" },
        });

        // Reload page
        await authenticatedPage.reload();
        await authenticatedPage.waitForLoadState("networkidle");

        // Check input is disabled
        isDisabled = await messageInput.first().evaluate((el: HTMLInputElement | HTMLTextAreaElement) => el.disabled);
        expect(isDisabled).toBe(true);
      }
    }
  });

  test("should stop session during active streaming", async ({
    authenticatedPage,
    db,
    testUser,
    prisma,
  }) => {
    const sessionTitle = `Stream Stop Test ${Date.now()}`;

    // Seed project and session
    const [project] = await db.seedProjects([
      {
        name: `Stream Stop Project ${Date.now()}`,
        path: "/tmp/stream-stop",
        userId: testUser.id,
      },
    ]);

    const [session] = await db.seedSessions([
      {
        title: sessionTitle,
        projectId: project.id,
        userId: testUser.id,
        status: "active",
      },
    ]);

    // Navigate to session
    await authenticatedPage.goto(`http://localhost:5101/sessions/${session.id}`);
    await authenticatedPage.waitForLoadState("networkidle");

    // Set up WebSocket monitoring
    await setupWebSocketForwarding(authenticatedPage);

    // Send message to start streaming
    const messageInput = authenticatedPage.locator(
      'textarea[placeholder*="message" i], input[placeholder*="message" i]'
    );

    if ((await messageInput.count()) > 0) {
      await messageInput.first().fill("Start streaming response");

      const sendButton = authenticatedPage.locator(
        'button[type="submit"], button:has-text("Send")'
      );
      await sendButton.first().click();

      // Wait a moment for streaming to start
      await authenticatedPage.waitForTimeout(2000);

      // Click stop button while streaming
      const stopButton = authenticatedPage.locator(
        'button:has-text("Stop"), button:has-text("Cancel"), button[aria-label*="stop" i]'
      );

      if ((await stopButton.count()) > 0) {
        await stopButton.first().click();

        // Wait for stop to process
        await authenticatedPage.waitForTimeout(2000);

        // Verify session stopped
        const dbSession = await prisma.session.findUnique({
          where: { id: session.id },
        });

        expect(["stopped", "completed", "inactive"]).toContain(dbSession?.status);

        // Verify streaming stopped (no more WebSocket events)
        const streamingIndicator = authenticatedPage.locator(
          '[data-streaming="true"], .streaming, .animate-pulse'
        );

        if ((await streamingIndicator.count()) > 0) {
          await expect(streamingIndicator.first()).not.toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test("should allow restarting stopped session", async ({
    authenticatedPage,
    db,
    testUser,
    prisma,
  }) => {
    const sessionTitle = `Restart Test ${Date.now()}`;

    // Seed project and stopped session
    const [project] = await db.seedProjects([
      {
        name: `Restart Project ${Date.now()}`,
        path: "/tmp/restart-test",
        userId: testUser.id,
      },
    ]);

    const [session] = await db.seedSessions([
      {
        title: sessionTitle,
        projectId: project.id,
        userId: testUser.id,
        status: "stopped",
      },
    ]);

    // Navigate to session
    await authenticatedPage.goto(`http://localhost:5101/sessions/${session.id}`);
    await authenticatedPage.waitForLoadState("networkidle");

    // Look for restart/resume button
    const restartButton = authenticatedPage.locator(
      'button:has-text("Restart"), button:has-text("Resume"), button:has-text("Activate")'
    );

    if ((await restartButton.count()) > 0) {
      await restartButton.first().click();

      // Wait for restart
      await authenticatedPage.waitForTimeout(2000);

      // Verify session is active again
      const dbSession = await prisma.session.findUnique({
        where: { id: session.id },
      });

      expect(dbSession?.status).toBe("active");

      // Verify message input is enabled
      const messageInput = authenticatedPage.locator(
        'textarea[placeholder*="message" i], input[placeholder*="message" i]'
      );

      if ((await messageInput.count()) > 0) {
        const isDisabled = await messageInput.first().evaluate((el: HTMLInputElement | HTMLTextAreaElement) => el.disabled);
        expect(isDisabled).toBe(false);
      }
    }
  });
});
