import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, StopCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import type { Container } from "../types/container.types";
import { useStopContainer } from "../hooks/useStopContainer";
import { formatRelativeTime } from "@/client/pages/projects/workflows/utils/workflowFormatting";
import { DeleteDialog } from "@/client/components/DeleteDialog";

export interface ContainerCardProps {
  container: Container;
}

function getStatusConfig(status: Container["status"]) {
  switch (status) {
    case "running":
      return {
        label: "Running",
        bgColor: "bg-green-100 dark:bg-green-900/30",
        textColor: "text-green-700 dark:text-green-400",
      };
    case "stopped":
      return {
        label: "Stopped",
        bgColor: "bg-gray-100 dark:bg-gray-800",
        textColor: "text-gray-700 dark:text-gray-400",
      };
    case "failed":
      return {
        label: "Failed",
        bgColor: "bg-red-100 dark:bg-red-900/30",
        textColor: "text-red-700 dark:text-red-400",
      };
    case "starting":
      return {
        label: "Starting",
        bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
        textColor: "text-yellow-700 dark:text-yellow-400",
      };
    default:
      return {
        label: "Pending",
        bgColor: "bg-gray-100 dark:bg-gray-800",
        textColor: "text-gray-700 dark:text-gray-400",
      };
  }
}

export function ContainerCard({ container }: ContainerCardProps) {
  const [showLogs, setShowLogs] = useState(false);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const stopContainer = useStopContainer();
  const statusConfig = getStatusConfig(container.status);

  const handleStop = async () => {
    try {
      await stopContainer.mutateAsync(container.id);
      toast.success("Container stopped successfully");
      setStopDialogOpen(false);
    } catch (error) {
      console.error("Failed to stop container:", error);
      toast.error("Failed to stop container");
      setStopDialogOpen(false);
    }
  };

  const timeDisplay = container.started_at
    ? formatRelativeTime(container.started_at)
    : formatRelativeTime(container.created_at);

  const containerName = container.compose_project || `Container ${container.id.slice(0, 8)}`;

  return (
    <div className="relative rounded-lg border bg-card p-4 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground truncate">
            {containerName}
          </h3>
          {container.workflow_run_id && container.workflow_definition_id ? (
            <Link
              to={`/projects/${container.project_id}/workflows/${container.workflow_definition_id}/runs/${container.workflow_run_id}`}
              className="text-xs text-muted-foreground hover:text-primary truncate block"
            >
              {container.workflow_run_name || "View Workflow Run"}
            </Link>
          ) : container.compose_project ? (
            <p className="text-xs text-muted-foreground truncate">
              {container.id.slice(0, 8)}
            </p>
          ) : null}
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}
        >
          {statusConfig.label}
        </span>
      </div>

      {/* Error message */}
      {container.error_message && (
        <div className="mb-3 rounded-md bg-red-50 dark:bg-red-900/20 p-2 text-xs text-red-600 dark:text-red-400">
          {container.error_message}
        </div>
      )}

      {/* Port URLs */}
      {container.urls && Object.keys(container.urls).length > 0 && (
        <div className="mb-3 space-y-1">
          {Object.entries(container.urls).map(([name, url]) => (
            <div key={name} className="flex items-center gap-1 text-xs">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {url}
              </a>
              <span className="text-muted-foreground">- {name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {container.status === "running" && (
            <button
              onClick={() => setStopDialogOpen(true)}
              className="inline-flex items-center gap-1 rounded-md bg-red-100 dark:bg-red-900/30 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
            >
              <StopCircle className="h-3 w-3" />
              Stop
            </button>
          )}
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground hover:bg-muted/80"
          >
            <FileText className="h-3 w-3" />
            {showLogs ? "Hide" : "View"} Logs
          </button>
        </div>
        <span className="text-xs text-muted-foreground">{timeDisplay}</span>
      </div>

      {/* Logs (if shown) */}
      {showLogs && (
        <div className="mt-3 rounded-md bg-muted/50 p-3">
          <pre className="text-xs text-foreground whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
            {container.container_ids
              ? `Container IDs: ${container.container_ids.join(", ")}`
              : "No logs available"}
          </pre>
        </div>
      )}

      {/* Stop Container Dialog */}
      <DeleteDialog
        open={stopDialogOpen}
        onOpenChange={setStopDialogOpen}
        title="Stop container?"
        description={`This will stop "${containerName}". You can restart it later if needed.`}
        onConfirm={handleStop}
        isPending={stopContainer.isPending}
        confirmText="Stop"
        loadingText="Stopping..."
      />
    </div>
  );
}
