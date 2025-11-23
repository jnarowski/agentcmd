/**
 * Permission mode configuration
 */

type PermissionMode = "default" | "plan" | "acceptEdits" | "bypassPermissions";

interface PermissionModeConfig {
  label: string;
  badgeClasses: string;
  borderClass: string;
  buttonClasses: string;
  textColor: string;
}

export const PERMISSION_MODE_CONFIG: Record<
  PermissionMode,
  PermissionModeConfig
> = {
  plan: {
    label: "Plan",
    badgeClasses: "bg-primary/10 text-primary border-primary/20",
    borderClass: "border-primary",
    buttonClasses: "bg-primary hover:bg-primary/90 text-primary-foreground",
    textColor: "text-primary",
  },
  acceptEdits: {
    label: "Accept Edits",
    badgeClasses: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    borderClass: "border-purple-500",
    buttonClasses: "bg-purple-500 hover:bg-purple-600 text-white",
    textColor: "text-purple-600",
  },
  bypassPermissions: {
    label: "Bypass",
    badgeClasses: "bg-red-500/10 text-red-600 border-red-500/20",
    borderClass: "border-red-500",
    buttonClasses: "bg-red-500 hover:bg-red-600 text-white",
    textColor: "text-red-600",
  },
  default: {
    label: "Default",
    badgeClasses: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    borderClass: "border-gray-500",
    buttonClasses: "bg-gray-500 hover:bg-gray-600 text-white",
    textColor: "text-gray-600",
  },
};
