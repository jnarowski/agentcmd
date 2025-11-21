import { Button } from "@/client/components/ui/button";
import { Workflow, Settings, ExternalLink } from "lucide-react";
import { getWebsiteUrl } from "@/client/utils/envConfig";

interface WorkflowDefinitionEmptyStateProps {
  onManageWorkflows: () => void;
}

/**
 * Shared empty state for workflow definitions
 * Used in ProjectHomeWorkflows and other definition list views
 */
export function WorkflowDefinitionEmptyState({ onManageWorkflows }: WorkflowDefinitionEmptyStateProps) {
  return (
    <div className="py-12 text-center space-y-4">
      <div className="flex justify-center">
        <div className="p-3 bg-primary/10 rounded-full">
          <Workflow className="size-6 text-primary" />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">No workflows configured</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Set up workflow definitions to automate your tasks
        </p>
      </div>
      <div className="flex gap-2 justify-center">
        <Button onClick={onManageWorkflows} className="gap-2">
          <Settings className="size-4" />
          Setup workflows
        </Button>
        <Button variant="outline" className="gap-2" asChild>
          <a
            href={`${getWebsiteUrl()}/docs/workflows/definitions`}
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
