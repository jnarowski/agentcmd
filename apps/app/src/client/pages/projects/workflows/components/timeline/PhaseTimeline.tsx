import { useMemo } from "react";
import { PhaseCard } from "./PhaseCard";
import { getPhaseId, getPhaseLabel } from "@/shared/utils/phase.utils";
import type {
  WorkflowRun,
  WorkflowRunStep,
  WorkflowEvent,
  WorkflowArtifact,
} from "../../types";
import type { WorkflowTab } from "../../hooks/useWorkflowDetailPanel";

interface PhaseTimelineProps {
  run: WorkflowRun;
  projectId: string;
  onSelectSession?: (sessionId: string) => void;
  onSetActiveTab?: (tab: WorkflowTab) => void;
}

interface PhaseGroup {
  phaseId: string;
  phaseLabel: string;
  steps: WorkflowRunStep[];
  events: WorkflowEvent[];
  artifacts: WorkflowArtifact[];
}

export function PhaseTimeline({ run, projectId, onSelectSession, onSetActiveTab }: PhaseTimelineProps) {
  // Group data by phase
  const phaseGroups = useMemo((): PhaseGroup[] => {
    const phases = run.workflow_definition?.phases || [];
    const steps = run.steps || [];
    const events = run.events || [];
    const artifacts = run.artifacts || [];

    return phases.map((phase) => {
      const phaseId = getPhaseId(phase);
      const phaseLabel = getPhaseLabel(phase);

      // Filter steps for this phase (use ID for matching)
      const phaseSteps = steps.filter((step) => step.phase === phaseId);

      // Filter events for this phase (includes lifecycle + annotations)
      const phaseEvents = events.filter((event) => {
        // Phase-level lifecycle events
        if (
          [
            "phase_started",
            "phase_completed",
            "phase_retry",
            "phase_failed",
          ].includes(event.event_type)
        ) {
          return event.event_data?.phase === phaseId;
        }

        // Step-level lifecycle events (match by step's phase)
        if (
          [
            "step_started",
            "step_running",
            "step_completed",
            "step_failed",
          ].includes(event.event_type)
        ) {
          const eventStepId = event.event_data?.stepId || event.event_data?.step_id;
          if (eventStepId) {
            const step = phaseSteps.find((s) => s.id === eventStepId);
            return !!step;
          }
        }

        // Annotations - match by phase column
        if (event.event_type === "annotation_added") {
          return event.phase === phaseId;
        }

        return false;
      });

      // Filter artifacts for this phase using the phase column
      const phaseArtifacts = artifacts.filter(
        (artifact) => artifact.phase === phaseId
      );

      return {
        phaseId,
        phaseLabel,
        steps: phaseSteps,
        events: phaseEvents,
        artifacts: phaseArtifacts,
      };
    });
  }, [run]);

  if (!run.workflow_definition?.phases) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No phases defined for this workflow
      </div>
    );
  }

  return (
    <div>
      {phaseGroups.map((group) => (
        <PhaseCard
          key={group.phaseId}
          phaseId={group.phaseId}
          phaseName={group.phaseLabel}
          steps={group.steps}
          events={group.events}
          artifacts={group.artifacts}
          currentPhase={run.current_phase}
          projectId={projectId}
          onSelectSession={onSelectSession}
          onSetActiveTab={onSetActiveTab}
        />
      ))}
    </div>
  );
}
