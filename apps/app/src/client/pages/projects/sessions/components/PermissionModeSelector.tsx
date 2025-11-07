import {
  PromptInputPermissionModeSelect,
  PromptInputPermissionModeSelectContent,
  PromptInputPermissionModeSelectItem,
  PromptInputPermissionModeSelectTrigger,
  PromptInputPermissionModeSelectValue,
} from "@/client/components/ai-elements/PromptInput";
import { PERMISSION_MODES } from "@/client/utils/permissionModes";
import type { PermissionMode } from "agent-cli-sdk";

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
 * @param props.permissionMode - Current permission mode
 * @param props.onPermissionModeChange - Callback when mode changes
 */
export function PermissionModeSelector({
  permissionMode,
  onPermissionModeChange,
}: PermissionModeSelectorProps) {
  return (
    <PromptInputPermissionModeSelect
      onValueChange={onPermissionModeChange}
      value={permissionMode}
    >
      <PromptInputPermissionModeSelectTrigger>
        <div className="flex items-center gap-2">
          {/* Show dot + short name on mobile */}
          <div
            className={`size-2 rounded-full md:hidden ${
              PERMISSION_MODES.find((m) => m.id === permissionMode)?.color
            }`}
          />
          <span className="md:hidden">
            {PERMISSION_MODES.find((m) => m.id === permissionMode)?.shortName}
          </span>
          {/* Show full name with dot on desktop (via SelectValue) */}
          <span className="hidden md:inline">
            <PromptInputPermissionModeSelectValue />
          </span>
        </div>
      </PromptInputPermissionModeSelectTrigger>
      <PromptInputPermissionModeSelectContent>
        {PERMISSION_MODES.map((mode) => (
          <PromptInputPermissionModeSelectItem key={mode.id} value={mode.id}>
            <div className="flex items-center gap-2">
              <div className={`size-2 rounded-full ${mode.color}`} />
              <span>{mode.name}</span>
            </div>
          </PromptInputPermissionModeSelectItem>
        ))}
      </PromptInputPermissionModeSelectContent>
    </PromptInputPermissionModeSelect>
  );
}
