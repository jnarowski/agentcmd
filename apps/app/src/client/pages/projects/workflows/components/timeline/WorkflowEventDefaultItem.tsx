import {
  Play,
  CheckCircle,
  XCircle,
  RotateCw,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import type { WorkflowEvent } from "@/client/pages/projects/workflows/types";

// Format event type for display
const formatEventType = (type: string) => {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Event configuration map
const EVENT_CONFIG: Record<
  string,
  {
    icon: LucideIcon;
    color: string;
    bgColor: string;
    generateContent: (data: Record<string, unknown>) => { title: string; body: string };
  }
> = {
  phase_started: {
    icon: Play,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    generateContent: (data) => ({
      title: `Phase Started: ${data.phase || "Unknown"}`,
      body: data.retries ? `Retries: ${data.retries}` : "",
    }),
  },
  phase_completed: {
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    generateContent: (data) => ({
      title: `Phase Completed: ${data.phase || "Unknown"}`,
      body: "",
    }),
  },
  phase_retry: {
    icon: RotateCw,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    generateContent: (data) => ({
      title: `Phase Retry: ${data.phase || "Unknown"}`,
      body: data.attempt ? `Attempt #${data.attempt}` : "",
    }),
  },
  phase_failed: {
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    generateContent: (data) => ({
      title: `Phase Failed: ${data.phase || "Unknown"}`,
      body: String(data.error || ""),
    }),
  },
  step_started: {
    icon: Play,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    generateContent: (data) => ({
      title: `Step Started: ${data.stepName || data.step_name || "Unknown"}`,
      body: `Status: ${data.status || "running"}`,
    }),
  },
  step_running: {
    icon: Play,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    generateContent: (data) => ({
      title: `Step Running: ${data.stepName || data.step_name || "Unknown"}`,
      body: "",
    }),
  },
  step_completed: {
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    generateContent: (data) => ({
      title: `Step Completed: ${data.stepName || data.step_name || "Unknown"}`,
      body: "",
    }),
  },
  step_failed: {
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    generateContent: (data) => ({
      title: `Step Failed: ${data.stepName || data.step_name || "Unknown"}`,
      body: String(data.error || ""),
    }),
  },
};

// Default fallback config for unknown event types
const DEFAULT_CONFIG = {
  icon: MessageSquare,
  color: "text-gray-500",
  bgColor: "bg-gray-500/10",
  generateContent: (data: Record<string, unknown>) => ({
    title: String(data.title || formatEventType(String(data.event_type || "Unknown"))),
    body: String(data.body || data.message || ""),
  }),
};

interface WorkflowEventDefaultItemProps {
  event: WorkflowEvent;
}

export function WorkflowEventDefaultItem({
  event,
}: WorkflowEventDefaultItemProps) {
  // Get config for this event type, or use default
  const config = EVENT_CONFIG[event.event_type] ?? DEFAULT_CONFIG;

  const Icon = config.icon;
  const iconColor = config.color;
  const bgColor = config.bgColor;
  const { title, body } = config.generateContent(event.event_data || {});

  return (
    <div className={`flex items-start gap-3 p-3 ${bgColor} transition-colors`}>
      {/* Event Icon */}
      <Icon className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} />

      {/* Event Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{title}</span>
          <span className="text-xs text-muted-foreground font-mono">
            [EVENT: {event.id}]
          </span>
        </div>

        {body && (
          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
            {body}
          </p>
        )}

        {event.event_data?.error && (
          <p className="text-sm text-red-500 mt-1">
            Error: {event.event_data.error}
          </p>
        )}

        {event.event_data?.attempt && (
          <p className="text-sm text-muted-foreground mt-1">
            Attempt #{event.event_data.attempt}
          </p>
        )}

        <div className="text-xs text-muted-foreground mt-1">
          {new Date(event.created_at).toLocaleString()}
        </div>
      </div>

      {/* Event Type Badge */}
      <span className="px-2 py-1 text-xs font-medium rounded bg-background/50 text-muted-foreground flex-shrink-0">
        {formatEventType(event.event_type)}
      </span>
    </div>
  );
}
