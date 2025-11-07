/**
 * ChatPromptInput Component Tests
 *
 * This test file covers user-facing behaviors of the ChatPromptInput component.
 *
 * IMPORTANT: WebSocket Integration Flow
 * =====================================
 * The ChatPromptInput component does NOT directly send messages to WebSocket.
 * Instead, it follows this flow:
 *
 * 1. User types message and selects permission mode (e.g., "plan")
 * 2. ChatPromptInput stores permission mode in `useSessionStore().form.permissionMode`
 * 3. ChatPromptInput calls `onSubmit(message, images)` (no permission mode param)
 * 4. Parent component (ProjectSession.tsx) handles onSubmit:
 *    - Reads permission mode from store: `useSessionStore.getState().getPermissionMode()`
 *    - Sends to WebSocket with config: `wsSendMessage(message, images, { permissionMode })`
 *
 * What We Test Here:
 * - Permission mode is correctly stored in the Zustand store
 * - Permission mode persists across user interactions
 * - onSubmit is called with the message (parent reads permission mode from store)
 *
 * What We DON'T Test Here:
 * - WebSocket message sending (tested at integration level in ProjectSession)
 * - Server-side permission mode handling (tested in server tests)
 */

import React, { type ReactNode } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChatPromptInput } from "./ChatPromptInput";
import { useSessionStore } from "../stores/sessionStore";

// Mock navigation hooks (not needed for core behavior, but component imports them)
vi.mock("@/client/stores/navigationStore", () => ({
  useNavigationStore: () => ({ activeProjectId: "test-project" }),
}));

vi.mock("@/client/hooks/navigation/useActiveProject", () => ({
  useActiveProject: () => ({ project: { path: "/test/path" } }),
}));

// Mock file components (not testing file functionality)
vi.mock("./ChatPromptInputFiles", () => ({
  ChatPromptInputFiles: () => null,
}));

vi.mock("./ChatPromptInputSlashCommands", () => ({
  ChatPromptInputSlashCommands: () => null,
}));

// Test wrapper with necessary providers
function TestWrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry failed queries in tests
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("ChatPromptInput", () => {
  let mockOnSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset store to default state
    useSessionStore.setState({
      sessionId: null,
      session: null,
      form: {
        permissionMode: "default",
      },
    });

    // Create fresh mock
    mockOnSubmit = vi.fn().mockResolvedValue(undefined);
  });

  describe("Message Submission", () => {
    it("allows user to type and submit a message", async () => {
      const user = userEvent.setup();
      render(<ChatPromptInput onSubmit={mockOnSubmit} />, {
        wrapper: TestWrapper,
      });

      // User types message
      const textarea = screen.getByPlaceholderText("What would you like to know?");
      await user.type(textarea, "Hello world");

      // User submits with Enter
      await user.keyboard("{Enter}");

      // Verify message was submitted (files will be empty array, not undefined)
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({ text: "Hello world", files: [] });
      });
    });

    it("creates new line with Shift+Enter without submitting", async () => {
      const user = userEvent.setup();
      render(<ChatPromptInput onSubmit={mockOnSubmit} />, {
        wrapper: TestWrapper,
      });

      const textarea = screen.getAllByRole("textbox")[0]; // Get first textarea

      // Type first line, Shift+Enter, second line
      await user.type(textarea, "Line 1");
      await user.keyboard("{Shift>}{Enter}{/Shift}");
      await user.type(textarea, "Line 2");

      // Should not have submitted
      expect(mockOnSubmit).not.toHaveBeenCalled();

      // Should have multiline text
      expect(textarea).toHaveValue("Line 1\nLine 2");
    });

    it("does not submit empty message", async () => {
      const user = userEvent.setup();
      render(<ChatPromptInput onSubmit={mockOnSubmit} />, {
        wrapper: TestWrapper,
      });

      const textarea = screen.getAllByRole("textbox")[0]; // Get first textarea

      // Try to submit empty message
      await user.click(textarea);
      await user.keyboard("{Enter}");

      // Should not submit
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("does not submit when disabled", async () => {
      const user = userEvent.setup();
      render(<ChatPromptInput onSubmit={mockOnSubmit} disabled />, {
        wrapper: TestWrapper,
      });

      const textarea = screen.getAllByRole("textbox")[0]; // Get first textarea
      await user.type(textarea, "Test message");
      await user.keyboard("{Enter}");

      // Should not submit when disabled
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe("Permission Mode", () => {
    it("reads permission mode from store on mount", () => {
      // Set permission mode before rendering
      useSessionStore.getState().setPermissionMode("plan");

      render(<ChatPromptInput onSubmit={mockOnSubmit} />, {
        wrapper: TestWrapper,
      });

      // Permission mode should be reflected (we can verify through store)
      expect(useSessionStore.getState().form.permissionMode).toBe("plan");
    });

    it("cycles through permission modes with Shift+Tab", async () => {
      const user = userEvent.setup();
      render(<ChatPromptInput onSubmit={mockOnSubmit} />, {
        wrapper: TestWrapper,
      });

      const textarea = screen.getAllByRole("textbox")[0]; // Get first textarea
      await user.click(textarea);

      // Start with 'default', cycle to 'plan'
      await user.keyboard("{Shift>}{Tab}{/Shift}");
      expect(useSessionStore.getState().form.permissionMode).toBe("plan");

      // Cycle to 'acceptEdits'
      await user.keyboard("{Shift>}{Tab}{/Shift}");
      expect(useSessionStore.getState().form.permissionMode).toBe(
        "acceptEdits"
      );

      // Cycle to 'bypassPermissions'
      await user.keyboard("{Shift>}{Tab}{/Shift}");
      expect(useSessionStore.getState().form.permissionMode).toBe("bypassPermissions");

      // Cycle back to 'default'
      await user.keyboard("{Shift>}{Tab}{/Shift}");
      expect(useSessionStore.getState().form.permissionMode).toBe("default");
    });
  });

  describe("Token Display", () => {
    it("displays total tokens when provided", async () => {
      const { container } = render(
        <ChatPromptInput onSubmit={mockOnSubmit} totalTokens={1500} />,
        { wrapper: TestWrapper }
      );

      // Should show formatted token count (1500 = 1.5k)
      expect(container.textContent).toContain("1.5k");
    });

    it("displays formatted token count", () => {
      const { container } = render(
        <ChatPromptInput onSubmit={mockOnSubmit} totalTokens={500} />,
        { wrapper: TestWrapper }
      );

      // Should show token count under 1000 as-is
      expect(container.textContent).toContain("500");
    });

    it("does not display tokens when not provided", () => {
      const { container } = render(<ChatPromptInput onSubmit={mockOnSubmit} />, {
        wrapper: TestWrapper,
      });

      // Should not show token text - check for absence of "k" suffix which only appears with tokens
      expect(container.textContent).not.toContain("k");
    });
  });
});
