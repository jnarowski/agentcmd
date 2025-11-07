import { ExternalLink } from "lucide-react";
import type { WorkflowRun } from "../../types";
import { useInngestRunStatus } from "../../hooks/useInngestRunStatus";

interface DetailsTabProps {
  run: WorkflowRun;
}

export function DetailsTab({ run }: DetailsTabProps) {
  const hasArgs = run.args && Object.keys(run.args).length > 0;
  const { data: inngestStatus, isLoading: inngestLoading } = useInngestRunStatus(run.id);

  return (
    <div className="space-y-4">
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
            <dd className="font-mono text-xs">{run.id}</dd>
          </div>

          <div className="grid grid-cols-2 gap-2 py-2">
            <dt className="text-muted-foreground">Status:</dt>
            <dd className="capitalize">{run.status}</dd>
          </div>

          <div className="grid grid-cols-2 gap-2 py-2">
            <dt className="text-muted-foreground">Created:</dt>
            <dd>{new Date(run.created_at).toLocaleString()}</dd>
          </div>

          {run.started_at && (
            <div className="grid grid-cols-2 gap-2 py-2">
              <dt className="text-muted-foreground">Started:</dt>
              <dd>{new Date(run.started_at).toLocaleString()}</dd>
            </div>
          )}

          {run.completed_at && (
            <div className="grid grid-cols-2 gap-2 py-2">
              <dt className="text-muted-foreground">Completed:</dt>
              <dd>{new Date(run.completed_at).toLocaleString()}</dd>
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
