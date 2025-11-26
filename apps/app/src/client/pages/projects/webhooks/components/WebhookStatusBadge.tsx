import {
  FileText,
  CheckCircle2,
  PauseCircle,
  AlertCircle,
} from "lucide-react";
import type { WebhookStatus } from "../types/webhook.types";

export interface WebhookStatusBadgeProps {
  status: WebhookStatus;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

interface StatusConfig {
  label: string;
  icon: typeof FileText;
  bgColor: string;
  textColor: string;
}

function getStatusConfig(status: WebhookStatus): StatusConfig {
  switch (status) {
    case "draft":
      return {
        label: "Draft",
        icon: FileText,
        bgColor: "bg-gray-100 dark:bg-gray-800",
        textColor: "text-gray-700 dark:text-gray-300",
      };
    case "active":
      return {
        label: "Active",
        icon: CheckCircle2,
        bgColor: "bg-green-100 dark:bg-green-900/30",
        textColor: "text-green-700 dark:text-green-400",
      };
    case "paused":
      return {
        label: "Paused",
        icon: PauseCircle,
        bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
        textColor: "text-yellow-700 dark:text-yellow-400",
      };
    case "error":
      return {
        label: "Error",
        icon: AlertCircle,
        bgColor: "bg-red-100 dark:bg-red-900/30",
        textColor: "text-red-700 dark:text-red-400",
      };
  }
}

export function WebhookStatusBadge({
  status,
  size = "md",
  showIcon = true,
  className = "",
}: WebhookStatusBadgeProps) {
  const config = getStatusConfig(status);
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-sm gap-1.5",
    lg: "px-3 py-1.5 text-base gap-2",
  };

  const iconSizeClasses = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${config.bgColor} ${config.textColor} ${className}`}
      role="status"
      aria-label={`Webhook status: ${config.label}`}
    >
      {showIcon && <Icon className={iconSizeClasses[size]} />}
      <span>{config.label}</span>
    </span>
  );
}
