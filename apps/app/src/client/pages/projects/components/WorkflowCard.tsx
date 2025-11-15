import { useNavigate } from "react-router-dom";
import { Card } from "@/client/components/ui/card";
import { Badge } from "@/client/components/ui/badge";
import { getWorkflowStatusConfig } from "@/client/pages/projects/workflows/utils/workflowStatus";
import type { WorkflowStatus } from "@/shared/schemas/workflow.schemas";

interface WorkflowCardProps {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  status: WorkflowStatus;
  workflowDefinitionId: string;
  showProjectName?: boolean;
}

/**
 * Card-based workflow run display for project home page
 * Adapted from sidebar WorkflowItem for larger layout
 */
export function WorkflowCard({
  id,
  name,
  projectId,
  projectName,
  status,
  workflowDefinitionId,
  showProjectName = false,
}: WorkflowCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/projects/${projectId}/workflows/${workflowDefinitionId}/runs/${id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case "completed":
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
      case "failed":
        return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
    }
  };

  const statusConfig = getWorkflowStatusConfig(status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={handleClick}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <StatusIcon
            className={`size-5 shrink-0 mt-0.5 ${statusConfig.textColor} ${status === "running" ? "animate-spin" : ""}`}
          />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate mb-2">{name}</div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={`px-2 py-0.5 text-xs justify-center ${getStatusColor(status)}`}
              >
                {status}
              </Badge>
              {showProjectName && (
                <Badge
                  variant="secondary"
                  className="px-2 py-0.5 text-xs bg-muted/50 text-muted-foreground hover:bg-muted/50 truncate"
                >
                  {projectName}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
