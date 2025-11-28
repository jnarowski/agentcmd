import { ExternalLink, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { WorkflowRun } from "@/client/pages/projects/workflows/types";
import { useInngestRunStatus } from "@/client/pages/projects/workflows/hooks/useInngestRunStatus";
import { useInngestUrl } from "@/client/hooks/useSettings";
import { Button } from "@/client/components/ui/button";
import { formatDate } from "@/shared/utils/formatDate";

interface DetailsTabProps {
  run: WorkflowRun;
}

export function DetailsTab({ run }: DetailsTabProps) {
  const hasArgs = run.args && Object.keys(run.args).length > 0;
  const { data: inngestStatus, isLoading: inngestLoading } = useInngestRunStatus(run.id);
  const inngestUrl = useInngestUrl();
  const [copied, setCopied] = useState(false);

  const handleCopyRunId = async () => {
    await navigator.clipboard.writeText(run.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasSpec = run.spec_content || run.spec_file;
  const hasSourceControl = run.mode || run.branch_name || run.base_branch || run.worktree_name || run.preserve !== null;

  return (
    <div className="space-y-4">
      {/* Metadata Section */}
      <div>
        <h3 className="text-sm font-medium mb-2">Metadata</h3>
        <dl className="divide-y text-sm">
          <div className="grid grid-cols-[120px_1fr] gap-2 py-2">
            <dt className="text-muted-foreground">Run ID</dt>
            <dd className="font-mono text-xs flex items-center gap-2">
              <span className="flex-1 truncate">{run.id}</span>
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
            <div className="grid grid-cols-[120px_1fr] gap-2 py-2">
              <dt className="text-muted-foreground">Workflow</dt>
              <dd className="font-medium">{run.workflow_definition.name}</dd>
            </div>
          )}

          <div className="grid grid-cols-[120px_1fr] gap-2 py-2">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="capitalize">{run.status}</dd>
          </div>

          <div className="grid grid-cols-[120px_1fr] gap-2 py-2">
            <dt className="text-muted-foreground">Created</dt>
            <dd>{formatDate(run.created_at)}</dd>
          </div>

          {run.started_at && (
            <div className="grid grid-cols-[120px_1fr] gap-2 py-2">
              <dt className="text-muted-foreground">Started</dt>
              <dd>{formatDate(run.started_at)}</dd>
            </div>
          )}

          {run.completed_at && (
            <div className="grid grid-cols-[120px_1fr] gap-2 py-2">
              <dt className="text-muted-foreground">Completed</dt>
              <dd>{formatDate(run.completed_at)}</dd>
            </div>
          )}

          {run.planning_session_id && (
            <div className="grid grid-cols-[120px_1fr] gap-2 py-2">
              <dt className="text-muted-foreground">Planning Session</dt>
              <dd className="font-mono text-xs truncate">{run.planning_session_id}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Spec Section */}
      {hasSpec && (
        <div>
          <h3 className="text-sm font-medium mb-2">Spec</h3>
          <dl className="divide-y text-sm">
            {run.spec_content && (
              <div className="grid grid-cols-[120px_1fr] gap-2 py-2">
                <dt className="text-muted-foreground">Content</dt>
                <dd className="font-mono text-xs whitespace-pre-wrap">{run.spec_content}</dd>
              </div>
            )}
            {run.spec_file && (
              <div className="grid grid-cols-[120px_1fr] gap-2 py-2">
                <dt className="text-muted-foreground">File</dt>
                <dd className="font-mono text-xs truncate">{run.spec_file}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Workflow Arguments */}
      {hasArgs && (
        <div>
          <h3 className="text-sm font-medium mb-2">Arguments</h3>
          <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
            {JSON.stringify(run.args, null, 2)}
          </pre>
        </div>
      )}

      {/* Source Control Section */}
      {hasSourceControl && (
        <div>
          <h3 className="text-sm font-medium mb-2">Source Control</h3>
          <dl className="divide-y text-sm">
            {run.mode && (
              <div className="grid grid-cols-[120px_1fr] gap-2 py-2">
                <dt className="text-muted-foreground">Mode</dt>
                <dd className="capitalize">{run.mode}</dd>
              </div>
            )}

            {run.branch_name && (
              <div className="grid grid-cols-[120px_1fr] gap-2 py-2">
                <dt className="text-muted-foreground">Branch</dt>
                <dd className="font-mono text-xs truncate">{run.branch_name}</dd>
              </div>
            )}

            {run.base_branch && (
              <div className="grid grid-cols-[120px_1fr] gap-2 py-2">
                <dt className="text-muted-foreground">Base Branch</dt>
                <dd className="font-mono text-xs truncate">{run.base_branch}</dd>
              </div>
            )}

            {run.worktree_name && (
              <div className="grid grid-cols-[120px_1fr] gap-2 py-2">
                <dt className="text-muted-foreground">Worktree</dt>
                <dd className="font-mono text-xs truncate">{run.worktree_name}</dd>
              </div>
            )}

            {run.preserve !== null && run.preserve !== undefined && (
              <div className="grid grid-cols-[120px_1fr] gap-2 py-2">
                <dt className="text-muted-foreground">Preserve</dt>
                <dd>{run.preserve ? "Yes" : "No"}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Container / Preview Section */}
      {run.container && (
        <div>
          <h3 className="text-sm font-medium mb-2">Preview Container</h3>
          <dl className="divide-y text-sm">
            <div className="grid grid-cols-[120px_1fr] gap-2 py-2">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="capitalize">{run.container.status}</dd>
            </div>

            {run.container.urls && Object.keys(run.container.urls).length > 0 && (
              <div className="grid grid-cols-[120px_1fr] gap-2 py-2">
                <dt className="text-muted-foreground">URL</dt>
                <dd className="space-y-1">
                  {Object.entries(run.container.urls).map(([name, url]) => (
                    <div key={name} className="flex items-center gap-1 font-mono text-xs">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        {url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <span className="text-muted-foreground">- {name}</span>
                    </div>
                  ))}
                </dd>
              </div>
            )}

            {run.container.started_at && (
              <div className="grid grid-cols-[120px_1fr] gap-2 py-2">
                <dt className="text-muted-foreground">Started</dt>
                <dd>{formatDate(run.container.started_at)}</dd>
              </div>
            )}

            {run.container.stopped_at && (
              <div className="grid grid-cols-[120px_1fr] gap-2 py-2">
                <dt className="text-muted-foreground">Stopped</dt>
                <dd>{formatDate(run.container.stopped_at)}</dd>
              </div>
            )}

            {run.container.error_message && (
              <div className="grid grid-cols-[120px_1fr] gap-2 py-2">
                <dt className="text-muted-foreground">Error</dt>
                <dd className="text-destructive text-xs">{run.container.error_message}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

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
                  href={`${inngestUrl}/run?runID=${run.inngest_run_id}`}
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
                  href={`${inngestUrl}/run?runID=${run.inngest_run_id}`}
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
