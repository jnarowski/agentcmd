import { useEffect } from "react";

export interface HotkeyAction {
  key: string;
  handler: () => void;
  enabled?: boolean;
}

/**
 * Hook to enable keyboard shortcuts for dropdown menu actions.
 * Only active when menu is open.
 *
 * @param isOpen - Whether the menu is currently open
 * @param actions - Array of hotkey actions to bind
 *
 * @example
 * ```tsx
 * const hotkeyActions: HotkeyAction[] = [
 *   { key: "e", handler: handleEdit },
 *   { key: "a", handler: handleArchive },
 *   { key: "v", handler: handleView, enabled: hasViewPermission },
 * ];
 *
 * useDropdownMenuHotkeys(isMenuOpen, hotkeyActions);
 * ```
 */
export function useDropdownMenuHotkeys(
  isOpen: boolean,
  actions: HotkeyAction[]
) {
  useEffect(() => {
    if (!isOpen) return;

    const enabledActions = actions.filter((action) => action.enabled !== false);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Skip if modifier keys are pressed
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
        return;
      }

      const key = e.key.toLowerCase();
      const action = enabledActions.find((a) => a.key.toLowerCase() === key);

      if (action) {
        e.preventDefault();
        e.stopPropagation();
        action.handler();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, actions]);
}
