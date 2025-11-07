import { useState, useRef, useCallback } from "react";
import type { PermissionMode } from "@repo/agent-cli-sdk";
import type { PromptInputMessage } from "@/client/components/ai-elements/PromptInput";
import type { FileUIPart } from "ai";
import { PERMISSION_MODES } from "@/client/utils/permissionModes";
import {
  insertAtCursor,
  removeAllOccurrences,
} from "@/client/pages/projects/files/utils/fileUtils";

const SUBMITTING_TIMEOUT = 200;
const STREAMING_TIMEOUT = 2000;

export interface UsePromptInputStateParams {
  controller: {
    textInput: {
      value: string;
      setInput: (v: string) => void;
      clear: () => void;
    };
    attachments: {
      files: (FileUIPart & { id: string })[];
      add: (files: File[] | FileList) => void;
      remove: (id: string) => void;
      clear: () => void;
      openFileDialog: () => void;
    };
  };
  permissionMode: PermissionMode;
  onPermissionModeChange: (mode: PermissionMode) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  onSubmit?: (message: PromptInputMessage) => void | Promise<void>;
  onKill?: () => void;
}

export interface UsePromptInputStateReturn {
  // Status state
  status: "submitted" | "streaming" | "ready" | "error";
  setStatus: (status: "submitted" | "streaming" | "ready" | "error") => void;

  // Menu states
  isAtMenuOpen: boolean;
  setIsAtMenuOpen: (open: boolean) => void;
  isSlashMenuOpen: boolean;
  setIsSlashMenuOpen: (open: boolean) => void;

  // Cursor position
  cursorPosition: number;

  // Handlers
  handleTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleFileSelect: (filePath: string) => void;
  handleFileRemove: (filePath: string) => void;
  handleCommandSelect: (params: { command: string; immediateSubmit: boolean }) => void;
  handleSubmit: (message: PromptInputMessage) => Promise<void>;
  cyclePermissionMode: () => void;
  stop: () => void;

  // Current text
  text: string;
}

/**
 * Custom hook for managing ChatPromptInput state and handlers.
 *
 * Extracts state management logic from ChatPromptInput component, including:
 * - Status tracking (submitted/streaming/ready/error)
 * - Menu visibility (file picker @ menu, slash command / menu)
 * - Cursor position for text insertion
 * - Permission mode cycling
 * - Text input handling
 * - File selection/removal
 * - Command selection
 * - Submit handling with timeouts
 *
 * @param params - Configuration object
 * @param params.controller - PromptInput controller from usePromptInputController
 * @param params.permissionMode - Current permission mode
 * @param params.onPermissionModeChange - Callback to change permission mode
 * @param params.textareaRef - Ref to the textarea element for focus management
 * @param params.disabled - Whether the input is disabled
 * @param params.onSubmit - Callback when message is submitted
 *
 * @returns State and handler functions for ChatPromptInput
 *
 * @example
 * ```tsx
 * const controller = usePromptInputController();
 * const textareaRef = useRef<HTMLTextAreaElement>(null);
 *
 * const {
 *   status,
 *   isAtMenuOpen,
 *   handleTextChange,
 *   handleSubmit,
 *   text
 * } = usePromptInputState({
 *   controller,
 *   permissionMode,
 *   onPermissionModeChange: setPermissionMode,
 *   textareaRef,
 *   onSubmit: async (message) => {
 *     await sendMessage(message);
 *   }
 * });
 * ```
 */
export function usePromptInputState({
  controller,
  permissionMode,
  onPermissionModeChange,
  textareaRef,
  disabled = false,
  onSubmit,
  onKill,
}: UsePromptInputStateParams): UsePromptInputStateReturn {
  // State
  const [status, setStatus] = useState<"submitted" | "streaming" | "ready" | "error">("ready");
  const [isAtMenuOpen, setIsAtMenuOpen] = useState(false);
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get text from controller
  const text = controller.textInput.value;

  // Permission mode cycling
  const cyclePermissionMode = useCallback(() => {
    const currentIndex = PERMISSION_MODES.findIndex((m) => m.id === permissionMode);
    const nextIndex = (currentIndex + 1) % PERMISSION_MODES.length;
    const nextMode = PERMISSION_MODES[nextIndex].id;
    onPermissionModeChange(nextMode);
  }, [permissionMode, onPermissionModeChange]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Escape to stop streaming
      if (e.key === "Escape" && status === "streaming") {
        e.preventDefault();
        onKill?.();
        return;
      }

      // Handle Enter key for submission (before Tab handling)
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        e.currentTarget.form?.requestSubmit();
        return;
      }

      // Shift+Tab to cycle permission modes
      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        cyclePermissionMode();
        return;
      }
      // Shift+Enter creates new line (default textarea behavior)
    },
    [cyclePermissionMode, status, onKill]
  );

  // Handle text change and detect @ and / commands
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      controller.textInput.setInput(newValue);

      // Track cursor position
      setCursorPosition(e.target.selectionStart);

      // Check if user just typed "@" at the end
      if (newValue.endsWith("@")) {
        setIsAtMenuOpen(true);
        // Remove the @ from the text and update cursor position
        const textWithoutAt = newValue.slice(0, -1);
        controller.textInput.setInput(textWithoutAt);
        setCursorPosition(textWithoutAt.length);
      }

      // Slash command menu disabled - "/" will not trigger the menu
      // if (newValue.endsWith("/")) {
      //   setIsSlashMenuOpen(true);
      //   // Remove the / from the text and update cursor position
      //   const textWithoutSlash = newValue.slice(0, -1);
      //   controller.textInput.setInput(textWithoutSlash);
      //   setCursorPosition(textWithoutSlash.length);
      // }
    },
    [controller.textInput]
  );

  // Handle file selection from file picker
  const handleFileSelect = useCallback(
    (filePath: string) => {
      // Add a space after the file path for better formatting
      const filePathWithSpace = `${filePath} `;
      const result = insertAtCursor(text, filePathWithSpace, cursorPosition);

      // Update controller state
      controller.textInput.setInput(result.text);
      setCursorPosition(result.cursorPosition);
      setIsAtMenuOpen(false);

      // Focus and update cursor position
      if (textareaRef.current) {
        textareaRef.current.focus();

        // Update cursor position after a short delay to ensure DOM is updated
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(
              result.cursorPosition,
              result.cursorPosition
            );
          }
        }, 0);
      }
    },
    [text, cursorPosition, controller.textInput, textareaRef]
  );

  // Handle file removal from file picker
  const handleFileRemove = useCallback(
    (filePath: string) => {
      const newText = removeAllOccurrences(text, filePath);
      controller.textInput.setInput(newText);
    },
    [text, controller.textInput]
  );

  // Handle command selection from slash menu
  const handleCommandSelect = useCallback(
    ({
      command,
      immediateSubmit,
    }: {
      command: string;
      immediateSubmit: boolean;
    }) => {
      // Insert command at position 0 with trailing space
      const commandText = `${command} `;
      const newText = commandText + text;
      controller.textInput.setInput(newText);

      // Close menu
      setIsSlashMenuOpen(false);

      if (immediateSubmit) {
        // Submit immediately with current files
        void handleSubmit({
          text: newText,
          files: controller.attachments.files,
        });
      } else {
        // Focus textarea and position cursor after command
        if (textareaRef.current) {
          textareaRef.current.focus();
          setTimeout(() => {
            if (textareaRef.current) {
              const newPosition = commandText.length;
              textareaRef.current.setSelectionRange(newPosition, newPosition);
              setCursorPosition(newPosition);
            }
          }, 0);
        }
      }
    },
    // handleSubmit is defined below and is stable (useCallback with explicit deps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, controller.textInput, controller.attachments.files, textareaRef]
  );

  // Stop streaming/submission
  const stop = useCallback(() => {
    // Clear any pending timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setStatus("ready");
  }, []);

  // Handle submit
  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      // If currently streaming or submitted, stop instead of submitting
      if (status === "streaming" || status === "submitted") {
        stop();
        return;
      }

      const hasText = Boolean(message.text);
      const hasAttachments = Boolean(message.files?.length);

      if (!(hasText || hasAttachments)) {
        return;
      }

      if (disabled) {
        return;
      }

      setStatus("submitted");

      // If external onSubmit provided, use it
      if (onSubmit) {
        try {
          await onSubmit(message);
        } catch (error) {
          console.error("[ChatPromptInput] Error submitting message:", error);
          setStatus("error");
          return;
        }
      } else {
        // Mock behavior for demo
        setTimeout(() => {
          setStatus("streaming");
        }, SUBMITTING_TIMEOUT);

        timeoutRef.current = setTimeout(() => {
          setStatus("ready");
          timeoutRef.current = null;
        }, STREAMING_TIMEOUT);
      }
    },
    [status, disabled, onSubmit, stop]
  );

  return {
    status,
    setStatus,
    isAtMenuOpen,
    setIsAtMenuOpen,
    isSlashMenuOpen,
    setIsSlashMenuOpen,
    cursorPosition,
    handleTextChange,
    handleKeyDown,
    handleFileSelect,
    handleFileRemove,
    handleCommandSelect,
    handleSubmit,
    cyclePermissionMode,
    stop,
    text,
  };
}
