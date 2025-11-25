import { ExternalLink, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { WorkflowRun } from "@/client/pages/projects/workflows/types";
import { useInngestRunStatus } from "@/client/pages/projects/workflows/hooks/useInngestRunStatus";
import { Button } from "@/client/components/ui/button";
import { formatDate } from "@/shared/utils/formatDate";

interface DetailsTabProps {
  run: WorkflowRun;
}

export function DetailsTab({ run }: DetailsTabProps) {
  const hasArgs = run.args && Object.keys(run.args).length > 0;
  const { data: inngestStatus, isLoading: inngestLoading } = useInngestRunStatus(run.id);
  const [copied, setCopied] = useState(false);

  const handleCopyRunId = async () => {
    await navigator.clipboard.writeText(run.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {run.spec_content && (
        <div>
          <h3 className="text-sm font-medium mb-2">Spec Content</h3>
          <pre className="bg-muted p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap">
            {run.spec_content}
          </pre>
        </div>
      )}

      {hasArgs && (
        <div>
          <h3 className="text-sm font-medium mb-2">Workflow Arguments</h3>
          <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
            {JSON.stringify(run.args, null, 2)}
          </pre>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium mb-2">Metadata</h3>
        <dl className="divide-y text-sm">
          <div className="grid grid-cols-2 gap-2 py-2">
            <dt className="text-muted-foreground">Run ID:</dt>
            <dd className="font-mono text-xs flex items-center gap-2">
              <span className="flex-1">{run.id}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCopyRunId}
                className="shrink-0"
                title="Copy Run ID"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </dd>
          </div>

          {run.workflow_definition && (
            <div className="grid grid-cols-2 gap-2 py-2">
              <dt className="text-muted-foreground">Workflow:</dt>
              <dd className="font-medium">{run.workflow_definition.name}</dd>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 py-2">
            <dt className="text-muted-foreground">Status:</dt>
            <dd className="capitalize">{run.status}</dd>
          </div>

          <div className="grid grid-cols-2 gap-2 py-2">
            <dt className="text-muted-foreground">Created:</dt>
            <dd>{formatDate(run.created_at)}</dd>
          </div>

          {run.started_at && (
            <div className="grid grid-cols-2 gap-2 py-2">
              <dt className="text-muted-foreground">Started:</dt>
              <dd>{formatDate(run.started_at)}</dd>
            </div>
          )}

          {run.completed_at && (
            <div className="grid grid-cols-2 gap-2 py-2">
              <dt className="text-muted-foreground">Completed:</dt>
              <dd>{formatDate(run.completed_at)}</dd>
            </div>
          )}

          {run.spec_file && (
            <div className="grid grid-cols-2 gap-2 py-2">
              <dt className="text-muted-foreground">Spec File:</dt>
              <dd className="font-mono text-xs">{run.spec_file}</dd>
            </div>
          )}

          {run.mode && (
            <div className="grid grid-cols-2 gap-2 py-2">
              <dt className="text-muted-foreground">Mode:</dt>
              <dd className="capitalize">{run.mode}</dd>
            </div>
          )}

          {run.preserve !== null && run.preserve !== undefined && (
            <div className="grid grid-cols-2 gap-2 py-2">
              <dt className="text-muted-foreground">Preserve:</dt>
              <dd>{run.preserve ? "Yes" : "No"}</dd>
            </div>
          )}

          {run.planning_session_id && (
            <div className="grid grid-cols-2 gap-2 py-2">
              <dt className="text-muted-foreground">Planning Session:</dt>
              <dd className="font-mono text-xs">{run.planning_session_id}</dd>
            </div>
          )}

        </dl>
      </div>

      {run.inngest_run_id && (
        <div>
          <h3 className="text-sm font-medium mb-2">Inngest Run</h3>
          <div className="bg-muted p-4 rounded space-y-3">
            {inngestLoading ? (
              <div className="text-xs text-muted-foreground">Loading status...</div>
            ) : inngestStatus?.success && inngestStatus.data ? (
              <>
                <div className="text-sm">
                  <span className="text-muted-foreground">Status: </span>
                  <span className="font-medium">{inngestStatus.data.status}</span>
                </div>
                <a
                  href={`http://localhost:8288/run?runID=${run.inngest_run_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  View in Inngest Dev UI
                  <ExternalLink className="h-4 w-4" />
                </a>
              </>
            ) : (
              <>
                <div className="text-xs text-destructive">
                  {inngestStatus?.error || "Failed to fetch Inngest run status"}
                </div>
                <a
                  href={`http://localhost:8288/run?runID=${run.inngest_run_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  View in Inngest Dev UI
                  <ExternalLink className="h-4 w-4" />
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
