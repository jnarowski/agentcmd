import {
  Play,
  CheckCircle,
  XCircle,
  RotateCw,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import type { WorkflowEvent } from "@/client/pages/projects/workflows/types";
import { TimelineRow } from "./TimelineRow";
import { TimelineItemHeader } from "./TimelineItemHeader";
import { formatDate } from "@/shared/utils/formatDate";

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
    generateContent: (data: Record<string, unknown>) => { title: string; body: string };
  }
> = {
  phase_started: {
    icon: Play,
    color: "text-blue-500",
    generateContent: (data) => ({
      title: `Phase Started: ${data.phase || "Unknown"}`,
      body: data.retries ? `Retries: ${data.retries}` : "",
    }),
  },
  phase_completed: {
    icon: CheckCircle,
    color: "text-green-500",
    generateContent: (data) => ({
      title: `Phase Completed: ${data.phase || "Unknown"}`,
      body: "",
    }),
  },
  phase_retry: {
    icon: RotateCw,
    color: "text-yellow-500",
    generateContent: (data) => ({
      title: `Phase Retry: ${data.phase || "Unknown"}`,
      body: data.attempt ? `Attempt #${data.attempt}` : "",
    }),
  },
  phase_failed: {
    icon: XCircle,
    color: "text-red-500",
    generateContent: (data) => ({
      title: `Phase Failed: ${data.phase || "Unknown"}`,
      body: String(data.error || ""),
    }),
  },
  step_started: {
    icon: Play,
    color: "text-blue-500",
    generateContent: (data) => ({
      title: `Step Started: ${data.stepName || data.step_name || "Unknown"}`,
      body: `Status: ${data.status || "running"}`,
    }),
  },
  step_running: {
    icon: Play,
    color: "text-blue-500",
    generateContent: (data) => ({
      title: `Step Running: ${data.stepName || data.step_name || "Unknown"}`,
      body: "",
    }),
  },
  step_completed: {
    icon: CheckCircle,
    color: "text-green-500",
    generateContent: (data) => ({
      title: `Step Completed: ${data.stepName || data.step_name || "Unknown"}`,
      body: "",
    }),
  },
  step_failed: {
    icon: XCircle,
    color: "text-red-500",
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
  const { title, body } = config.generateContent(event.event_data || {});

  return (
    <TimelineRow
      icon={<Icon className={`h-5 w-5 ${iconColor}`} />}
      tooltipLabel={formatEventType(event.event_type)}
    >
      <TimelineItemHeader
        title={title}
        date={formatDate(event.created_at)}
        duration={
          typeof event.event_data?.duration === "number"
            ? event.event_data.duration
            : null
        }
        id={event.id}
      />

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
    </TimelineRow>
  );
}
