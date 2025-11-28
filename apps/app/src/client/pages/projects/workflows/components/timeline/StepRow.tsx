import { StepDefaultRow } from "@/client/pages/projects/workflows/components/timeline/StepDefaultRow";
import { StepAgentRow } from "@/client/pages/projects/workflows/components/timeline/StepAgentRow";
import { StepGitRow } from "@/client/pages/projects/workflows/components/timeline/StepGitRow";
import { StepPreviewRow } from "@/client/pages/projects/workflows/components/timeline/StepPreviewRow";
import type { WorkflowRunStep } from "@/shared/types/workflow-step.types";
import type { WorkflowTab } from "@/client/pages/projects/workflows/hooks/useWorkflowDetailPanel";

interface StepRowProps {
  step: WorkflowRunStep;
  projectId: string;
  onSelectSession?: (sessionId: string) => void;
  onSelectStep?: (stepId: string) => void;
  onSetActiveTab?: (tab: WorkflowTab) => void;
}

/**
 * Step row wrapper that delegates to specific component based on step_type
 */
export function StepRow({ step, projectId, onSelectSession, onSelectStep, onSetActiveTab }: StepRowProps) {
  // Discriminate by step_type for different display styles
  switch (step.step_type) {
    case "git":
    case "cli":
      // Compact display for git/cli operations
      return <StepGitRow step={step} onSelectStep={onSelectStep} onSetActiveTab={onSetActiveTab} />;

    case "agent":
    case "ai":
      // Agent steps with session modal, trace display
      return (
        <StepAgentRow
          step={step}
          projectId={projectId}
          onSelectSession={onSelectSession}
          onSelectStep={onSelectStep}
          onSetActiveTab={onSetActiveTab}
        />
      );

    case "preview":
      // Preview steps with URL links
      return <StepPreviewRow step={step} onSelectStep={onSelectStep} onSetActiveTab={onSetActiveTab} />;

    case "artifact":
    case "annotation":
    case "conditional":
    case "loop":
    default:
      // Simple display for other step types
      return (
        <StepDefaultRow
          step={step}
          onSelectStep={onSelectStep}
          onSetActiveTab={onSetActiveTab}
        />
      );
  }
}
