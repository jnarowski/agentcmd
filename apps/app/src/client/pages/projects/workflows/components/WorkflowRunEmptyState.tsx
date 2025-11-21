import { Button } from "@/client/components/ui/button";
import { Workflow, Plus, ExternalLink } from "lucide-react";
import { getWebsiteUrl } from "@/client/utils/envConfig";

interface WorkflowRunEmptyStateProps {
  onCreateRun: () => void;
}

/**
 * Shared empty state for workflow runs
 * Used in ProjectHomeWorkflows and other run list views
 */
export function WorkflowRunEmptyState({ onCreateRun }: WorkflowRunEmptyStateProps) {
  return (
    <div className="py-12 text-center space-y-4">
      <div className="flex justify-center">
        <div className="p-3 bg-primary/10 rounded-full">
          <Workflow className="size-6 text-primary" />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">No workflow runs yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Execute workflows to automate tasks with AI agents
        </p>
      </div>
      <div className="flex gap-2 justify-center">
        <Button onClick={onCreateRun} className="gap-2">
          <Plus className="size-4" />
          Create your first run
        </Button>
        <Button variant="outline" className="gap-2" asChild>
          <a
            href={`${getWebsiteUrl()}/docs/workflows/runs`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="size-4" />
            Learn More
          </a>
        </Button>
      </div>
    </div>
  );
}
