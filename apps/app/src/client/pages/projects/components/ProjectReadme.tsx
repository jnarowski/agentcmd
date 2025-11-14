import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import { Skeleton } from "@/client/components/ui/skeleton";
import { FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { truncatePath } from "@/client/utils/cn";
import { useProjectReadme } from "@/client/pages/projects/hooks/useProjects";
import type { Project } from "@/shared/types/project.types";

interface ProjectReadmeProps {
  project: Project;
}

export function ProjectReadme({ project }: ProjectReadmeProps) {
  const {
    data: readme,
    isLoading: isLoadingReadme,
    error: readmeError,
  } = useProjectReadme(project.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <FileText className="h-5 w-5 shrink-0" />
          <span className="truncate">Project README</span>
        </CardTitle>
        {readme?.path && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <CardDescription className="font-mono text-xs cursor-help break-all">
                  {truncatePath(
                    `${project.path}/${readme.path}`,
                    typeof window !== "undefined" && window.innerWidth < 768
                      ? 35
                      : 70
                  )}
                </CardDescription>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-md break-all">
                <p className="font-mono text-xs">
                  {project.path}/{readme.path}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardHeader>
      <CardContent>
        {isLoadingReadme ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : readmeError ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No README.md found in this project.
            </p>
          </div>
        ) : readme ? (
          <div className="prose prose-sm dark:prose-invert max-w-3xl">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {readme.content}
            </ReactMarkdown>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
