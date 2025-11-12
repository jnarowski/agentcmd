import { StepDefaultRow } from "@/client/pages/projects/workflows/components/timeline/StepDefaultRow";
import { StepGitRow } from "@/client/pages/projects/workflows/components/timeline/StepGitRow";
import type { WorkflowRunStep } from "@/shared/types/workflow-step.types";
import type { WorkflowTab } from "@/client/pages/projects/workflows/hooks/useWorkflowDetailPanel";

interface StepRowProps {
  step: WorkflowRunStep;
  projectId: string;
  onSelectSession?: (sessionId: string) => void;
  onSetActiveTab?: (tab: WorkflowTab) => void;
}

/**
 * Step row wrapper that delegates to specific component based on step_type
 */
export function StepRow({ step, projectId, onSelectSession, onSetActiveTab }: StepRowProps) {
  // Discriminate by step_type for different display styles
  switch (step.step_type) {
    case "git":
    case "cli":
      // Compact display for git/cli operations
      return <StepGitRow step={step} />;

    case "agent":
    case "ai":
    case "artifact":
    case "annotation":
    case "conditional":
    case "loop":
    default:
      // Full display for agent/AI/other steps
      return (
        <StepDefaultRow
          step={step}
          projectId={projectId}
          onSelectSession={onSelectSession}
          onSetActiveTab={onSetActiveTab}
        />
      );
  }
}
