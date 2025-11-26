import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { Kbd } from "@/client/components/ui/kbd";
import { PERMISSION_MODES } from "@/client/utils/permissionModes";
import type { PermissionMode } from "agent-cli-sdk";
import { cn } from "@/client/utils/cn";

export interface PermissionModeSelectorProps {
  permissionMode: PermissionMode;
  onPermissionModeChange: (mode: PermissionMode) => void;
}

/**
 * Permission mode selector component for ChatPromptInput.
 *
 * Displays a dropdown to select between different permission modes:
 * - default: Standard approval flow
 * - plan: Planning mode (green indicator)
 * - acceptEdits: Auto-accept edits (purple indicator)
 * - bypassPermissions: Bypass all permissions (red indicator)
 *
 * Shows a colored dot indicator with short name on mobile,
 * full name with dot on desktop.
 *
 * Supports keyboard shortcuts when dropdown is open:
 * - D: Default mode
 * - P: Plan mode
 * - A: Accept Edits mode
 * - B: Bypass Permissions mode
 *
 * @param props.permissionMode - Current permission mode
 * @param props.onPermissionModeChange - Callback when mode changes
 */
export function PermissionModeSelector({
  permissionMode,
  onPermissionModeChange,
}: PermissionModeSelectorProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Ensure we always have a valid permission mode, fallback to 'acceptEdits'
  const safePermissionMode = permissionMode || 'acceptEdits';
  const currentMode = PERMISSION_MODES.find((m) => m.id === safePermissionMode);

  const handleModeChange = (mode: PermissionMode) => {
    onPermissionModeChange(mode);
    setIsMenuOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

    const key = e.key.toLowerCase();
    const modes: Record<string, PermissionMode> = {
      d: "default",
      p: "plan",
      a: "acceptEdits",
      b: "bypassPermissions",
    };

    const mode = modes[key];
    if (mode) {
      e.preventDefault();
      e.stopPropagation();
      handleModeChange(mode);
    }
  };

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger
        className={cn(
          "border-none bg-transparent font-medium text-muted-foreground shadow-none transition-colors",
          "hover:bg-accent hover:text-foreground",
          "data-[state=open]:bg-accent data-[state=open]:text-foreground",
          "rounded-md px-2 py-1.5 text-sm"
        )}
      >
        <div className="flex items-center gap-2">
          {/* Mobile: dot + short name */}
          <div
            className={`size-2 rounded-full md:hidden ${currentMode?.color}`}
          />
          <span className="md:hidden">{currentMode?.shortName}</span>

          {/* Desktop: dot + full name */}
          <div className="hidden md:flex md:items-center md:gap-2">
            <div className={`size-2 rounded-full ${currentMode?.color}`} />
            <span>{currentMode?.name}</span>
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onKeyDown={handleKeyDown}>
        {PERMISSION_MODES.map((mode) => (
          <DropdownMenuItem
            key={mode.id}
            onClick={() => handleModeChange(mode.id)}
          >
            <div className="flex items-center gap-2">
              <div className={`size-2 rounded-full ${mode.color}`} />
              <span>{mode.name}</span>
            </div>
            <Kbd className="ml-auto">
              {mode.id === "default"
                ? "D"
                : mode.id === "plan"
                  ? "P"
                  : mode.id === "acceptEdits"
                    ? "A"
                    : "B"}
            </Kbd>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
