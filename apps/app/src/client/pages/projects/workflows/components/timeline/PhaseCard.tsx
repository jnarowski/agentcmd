import { useState, useMemo, useEffect } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { StepRow } from "./StepRow";
import { ArtifactRow } from "./ArtifactRow";
import { EventRow } from "./EventRow";
import type {
  WorkflowRunStep,
  WorkflowEvent,
  WorkflowArtifact,
} from "@/client/pages/projects/workflows/types";
import type { WorkflowTab } from "@/client/pages/projects/workflows/hooks/useWorkflowDetailPanel";

interface PhaseCardProps {
  phaseId: string;
  phaseName: string;
  steps: WorkflowRunStep[];
  events: WorkflowEvent[];
  artifacts: WorkflowArtifact[];
  currentPhase: string | null;
  projectId: string;
  onSelectSession?: (sessionId: string) => void;
  onSetActiveTab?: (tab: WorkflowTab) => void;
}

type PhaseStatus = "pending" | "running" | "completed" | "failed";

interface PhaseMetadata {
  status: PhaseStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  retryCount: number;
  duration: number | null;
}

export function PhaseCard({
  phaseId,
  phaseName,
  steps,
  events,
  artifacts,
  currentPhase,
  projectId,
  onSelectSession,
  onSetActiveTab,
}: PhaseCardProps) {
  const [isExpanded, setIsExpanded] = useState(phaseId === currentPhase);

  // Calculate phase status and metadata
  const metadata = useMemo((): PhaseMetadata => {
    let status: PhaseStatus = "pending";
    let startedAt: Date | null = null;
    let completedAt: Date | null = null;
    let retryCount = 0;

    // Extract metadata from events
    for (const event of events) {
      if (
        event.event_type === "phase_started" &&
        event.event_data?.phase === phaseId
      ) {
        startedAt = new Date(event.created_at);
      } else if (
        event.event_type === "phase_completed" &&
        event.event_data?.phase === phaseId
      ) {
        completedAt = new Date(event.created_at);
      } else if (
        event.event_type === "phase_retry" &&
        event.event_data?.phase === phaseId
      ) {
        retryCount++;
      }
    }

    // Calculate status from steps and events
    const stepStatuses = steps.map((s) => s.status);

    // Check for phase completion/failure events
    const hasPhaseCompletedEvent = events.some(
      (e) =>
        e.event_type === "phase_completed" && e.event_data?.phase === phaseId
    );
    const hasPhaseFailedEvent = events.some(
      (e) => e.event_type === "phase_failed" && e.event_data?.phase === phaseId
    );

    if (hasPhaseFailedEvent || stepStatuses.some((s) => s === "failed")) {
      status = "failed";
    } else if (hasPhaseCompletedEvent) {
      status = "completed";
    } else if (
      stepStatuses.some((s) => s === "running") ||
      currentPhase === phaseId
    ) {
      status = "running";
    } else {
      status = "pending";
    }

    // Calculate duration
    const duration =
      startedAt && completedAt
        ? completedAt.getTime() - startedAt.getTime()
        : null;

    return {
      status,
      startedAt,
      completedAt,
      retryCount,
      duration,
    };
  }, [steps, events, phaseId, currentPhase]);

  // Sync expansion state with currentPhase changes
  // Only current phase should be expanded, collapse when phase moves on
  useEffect(() => {
    if (phaseId === currentPhase) {
      setIsExpanded(true);
    } else {
      setIsExpanded(false);
    }
  }, [phaseId, currentPhase]);

  // Combine and sort timeline items by created_at ASC (oldest first)
  const timelineItems = useMemo(() => {
    const items: Array<
      | { type: "step"; data: WorkflowRunStep }
      | { type: "artifact"; data: WorkflowArtifact }
      | { type: "event"; data: WorkflowEvent }
    > = [];

    // Add steps
    steps.forEach((step) => {
      items.push({ type: "step", data: step });
    });

    // Add phase-level artifacts
    artifacts.forEach((artifact) => {
      items.push({ type: "artifact", data: artifact });
    });

    // Add lifecycle and annotation events
    // Note: phase_started/phase_completed excluded from display (used for header metadata only)
    events.forEach((event) => {
      const isLifecycle = [
        "phase_retry",
        "phase_failed",
        "step_started",
        "step_running",
        "step_completed",
        "step_failed",
      ].includes(event.event_type);
      const isAnnotation = event.event_type === "annotation_added";

      if (isLifecycle || isAnnotation) {
        items.push({ type: "event", data: event });
      }
    });

    // Sort by created_at ASC (oldest first)
    items.sort((a, b) => {
      const aTime = new Date(a.data.created_at).getTime();
      const bTime = new Date(b.data.created_at).getTime();
      return aTime - bTime;
    });

    return items;
  }, [steps, artifacts, events]);

  // Status badge color
  const statusColor = {
    pending: "bg-gray-500",
    running: "bg-blue-500",
    completed: "bg-green-500",
    failed: "bg-red-500",
  }[metadata.status];

  // Format duration
  const formatDuration = (ms: number | null) => {
    if (!ms) return null;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Detect system phases
  const isSystemPhase = phaseName.startsWith("_system_");

  return (
    <div className="border-b bg-card">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between py-5 px-4 transition-colors border-l-2 ${
          isSystemPhase
            ? "bg-muted/30 hover:bg-muted/50 border-muted-foreground/20"
            : "bg-background hover:bg-muted/80 border-primary/20"
        }`}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}

          <h3
            className={`text-xl font-bold ${
              isSystemPhase ? "text-muted-foreground" : ""
            }`}
          >
            {phaseName}
          </h3>

          {isSystemPhase && (
            <span className="px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded border border-muted-foreground/30">
              SYSTEM
            </span>
          )}

          <span
            className={`px-2 py-1 text-xs font-medium text-white rounded ${statusColor}`}
          >
            {metadata.status}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {metadata.retryCount > 0 && (
            <span>Retries: {metadata.retryCount}</span>
          )}
          {metadata.duration && (
            <span>Duration: {formatDuration(metadata.duration)}</span>
          )}
          <span>{timelineItems.length} items</span>
        </div>
      </button>

      {/* Body */}
      {isExpanded && (
        <div className="border-t">
          {timelineItems.length > 0 && (
            <div className="divide-y">
              {timelineItems.map((item, index) => (
                <div key={`${item.type}-${item.data.id}-${index}`}>
                  {item.type === "step" && (
                    <StepRow
                      step={item.data}
                      projectId={projectId}
                      onSelectSession={onSelectSession}
                      onSetActiveTab={onSetActiveTab}
                    />
                  )}
                  {item.type === "artifact" && (
                    <ArtifactRow artifact={item.data} />
                  )}
                  {item.type === "event" && <EventRow event={item.data} />}
                </div>
              ))}
            </div>
          )}

          {/* Loading indicator at bottom when phase is actively running and has no steps yet */}
          {metadata.status === "running" && steps.length === 0 && (
            <div className="px-4 py-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
