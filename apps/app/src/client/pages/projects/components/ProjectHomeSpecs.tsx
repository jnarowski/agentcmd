import { useState, useMemo } from "react";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/client/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/client/components/ui/tabs";
import { useSpecs } from "@/client/hooks/useSpecs";
import { useRescanSpecs } from "@/client/hooks/useRescanSpecs";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw,
  Loader2,
  FileText,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { formatDate } from "@/shared/utils/formatDate";
import { getWebsiteUrl } from "@/client/utils/envConfig";
import type { Spec } from "@/shared/types/spec.types";

interface ProjectHomeSpecsProps {
  projectId: string;
}

/**
 * Specs tab content for project home page
 * Shows Specs
 */
export function ProjectHomeSpecs({ projectId }: ProjectHomeSpecsProps) {
  const navigate = useNavigate();
  const { data, isLoading, error } = useSpecs(projectId);
  const rescanMutation = useRescanSpecs();
  const [activeTab, setActiveTab] = useState<"todo" | "done" | "backlog">("todo");

  const handleRescan = () => {
    rescanMutation.mutate();
  };

  const handleSpecClick = (specId: string, taskProjectId: string) => {
    navigate(`/projects/${taskProjectId}/specs/${specId}`);
  };

  const { todoSpecs, doneSpecs, backlogSpecs } = useMemo(() => {
    if (!data?.specs) {
      return { todoSpecs: [], doneSpecs: [], backlogSpecs: [] };
    }

    const todo: Spec[] = [];
    const done: Spec[] = [];
    const backlog: Spec[] = [];

    for (const spec of data.specs) {
      if (spec.status === "completed") {
        done.push(spec);
      } else if (spec.status === "backlog") {
        backlog.push(spec);
      } else {
        // draft, in-progress, review → Todo
        todo.push(spec);
      }
    }

    // Sort by created_at descending (newest first)
    const sortByDate = (a: Spec, b: Spec) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

    todo.sort(sortByDate);
    done.sort(sortByDate);
    backlog.sort(sortByDate);

    return { todoSpecs: todo, doneSpecs: done, backlogSpecs: backlog };
  }, [data?.specs]);

  const renderSpecGrid = (specs: Spec[]) => {
    if (specs.length === 0) {
      return (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">No specs found</p>
        </div>
      );
    }

    return (
      <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
        {specs.map((task) => (
          <div
            key={task.id}
            className="p-3 cursor-pointer hover:bg-accent/50 transition-colors rounded-lg border bg-card min-w-0"
            onClick={() => handleSpecClick(task.id, task.projectId)}
          >
            <div className="flex items-center min-w-0">
              <FileText className="size-4 shrink-0 mr-2.5" />
              <div className="flex flex-1 flex-col gap-0 min-w-0">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-sm min-w-0 truncate">{task.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDate(task.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{task.status}</span>
                  <span>•</span>
                  <span className="truncate">{task.spec_type}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">
          Failed to load specs
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading specs...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <span className="truncate">Specs</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-8 w-8 p-0"
            onClick={handleRescan}
            disabled={rescanMutation.isPending || isLoading}
            aria-label="Refresh specs"
          >
            {rescanMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0">
        {/* Global empty state - no specs at all */}
        {data && data.specs.length === 0 && (
          <div className="py-12 text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-primary/10 rounded-full">
                <Sparkles className="size-6 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">No specs yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Specs are structured documents that guide AI agents to
                implement features, fix bugs, or plan projects.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Create specs using slash commands like:
              </p>
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <code className="bg-muted px-2 py-1 rounded mx-auto">
                  /cmd:generate-feature-spec
                </code>
              </div>
            </div>
            <Button variant="link" size="sm" asChild className="text-primary">
              <a
                href={`${getWebsiteUrl()}/docs/specs`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1"
              >
                Learn more about specs
                <ExternalLink className="size-3" />
              </a>
            </Button>
          </div>
        )}

        {/* Tabs when specs exist */}
        {data && data.specs.length > 0 && (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "todo" | "done" | "backlog")}>
            <TabsList className="w-full grid grid-cols-3 mb-4">
              <TabsTrigger value="todo">Todo</TabsTrigger>
              <TabsTrigger value="done">Done</TabsTrigger>
              <TabsTrigger value="backlog">Backlog</TabsTrigger>
            </TabsList>

            <TabsContent value="todo" className="mt-0">
              {renderSpecGrid(todoSpecs)}
            </TabsContent>

            <TabsContent value="done" className="mt-0">
              {renderSpecGrid(doneSpecs)}
            </TabsContent>

            <TabsContent value="backlog" className="mt-0">
              {renderSpecGrid(backlogSpecs)}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
