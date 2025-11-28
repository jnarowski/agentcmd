import { useState } from "react";
import { ExternalLink, StopCircle, FileText, Loader2 } from "lucide-react";
import type { Container } from "../types/container.types";
import { useStopContainer } from "../hooks/useStopContainer";
import { formatRelativeTime } from "@/client/pages/projects/workflows/utils/workflowFormatting";

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
  const stopContainer = useStopContainer();
  const statusConfig = getStatusConfig(container.status);

  const handleStop = async () => {
    if (
      !window.confirm(
        "Are you sure you want to stop this container? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      await stopContainer.mutateAsync(container.id);
    } catch (error) {
      console.error("Failed to stop container:", error);
    }
  };

  const timeDisplay = container.started_at
    ? formatRelativeTime(container.started_at)
    : formatRelativeTime(container.created_at);

  return (
    <div className="relative rounded-lg border bg-card p-4 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground truncate">
            Container {container.id.slice(0, 8)}
          </h3>
          {container.compose_project && (
            <p className="text-xs text-muted-foreground truncate">
              {container.compose_project}
            </p>
          )}
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
      {Object.keys(container.ports).length > 0 && (
        <div className="mb-3 space-y-1">
          {Object.entries(container.ports).map(([name, port]) => (
            <a
              key={name}
              href={`http://localhost:${port}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              <span className="font-medium">{name}:</span>
              <span>localhost:{port}</span>
            </a>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {container.status === "running" && (
            <button
              onClick={handleStop}
              disabled={stopContainer.isPending}
              className="inline-flex items-center gap-1 rounded-md bg-red-100 dark:bg-red-900/30 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {stopContainer.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <StopCircle className="h-3 w-3" />
              )}
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
    </div>
  );
}
