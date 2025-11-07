import type { WorkflowStatus } from "@/shared/schemas/workflow.schemas";
import type { WorkflowRun } from "../types";
import { WorkflowRunCard } from "./WorkflowRunCard";
import { getWorkflowStatusConfig } from "../utils/workflowStatus";

export interface WorkflowKanbanColumnProps {
  status: WorkflowStatus;
  runs: WorkflowRun[];
  onExecutionClick: (run: WorkflowRun) => void;
}

export function WorkflowKanbanColumn({
  status,
  runs,
  onExecutionClick,
}: WorkflowKanbanColumnProps) {
  const config = getWorkflowStatusConfig(status);
  const Icon = config.icon;

  return (
    <div className="flex min-h-[600px] flex-col rounded-lg border bg-muted/50 p-4">

      {/* Column header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${config.textColor}`} />
          <h2 className="font-semibold text-base">{config.label}</h2>
          <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">
            {runs.length}
          </span>
        </div>
      </div>

      {/* Execution cards */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Icon className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No {config.label.toLowerCase()} workflows
            </p>
          </div>
        ) : (
          runs.map((run) => (
            <WorkflowRunCard
              key={run.id}
              run={run}
              onClick={() => onExecutionClick(run)}
            />
          ))
        )}
      </div>
    </div>
  );
}
