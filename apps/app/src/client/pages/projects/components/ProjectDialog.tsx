import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown } from "lucide-react";
import { useCreateProject, useUpdateProject } from "@/client/pages/projects/hooks/useProjects";
import { BaseDialog } from "@/client/components/BaseDialog";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Button } from "@/client/components/ui/button";
import { LoadingButton } from "@/client/components/ui/loading-button";
import { ErrorAlert } from "@/client/components/ui/error-alert";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { Textarea } from "@/client/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/client/components/ui/collapsible";
import type { Project, ProjectPreviewConfig } from "@/shared/types/project.types";

// Form validation schema
const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required").max(255),
  path: z.string().min(1, "Project path is required"),
  // Preview config fields (all optional strings for form handling)
  dockerFilePath: z.string().optional(),
  ports: z.string().optional(),
  env: z.string().optional(),
  maxMemory: z.string().optional(),
  maxCpus: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

// Helper functions for parsing/conversion (task 3.2)

function parsePortsString(str: string): string[] {
  if (!str.trim()) return [];
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

function parseEnvString(str: string): Record<string, string> {
  if (!str.trim()) return {};
  const result: Record<string, string> = {};
  for (const line of str.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (key) result[key] = value;
    }
  }
  return result;
}

function portsToString(arr?: string[]): string {
  if (!arr || arr.length === 0) return "";
  return arr.join(", ");
}

function envToString(obj?: Record<string, string>): string {
  if (!obj || Object.keys(obj).length === 0) return "";
  return Object.entries(obj)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
}

function buildPreviewConfig(formData: ProjectFormData): ProjectPreviewConfig | null {
  const config: ProjectPreviewConfig = {};

  if (formData.dockerFilePath?.trim()) {
    config.dockerFilePath = formData.dockerFilePath.trim();
  }
  if (formData.ports?.trim()) {
    config.ports = parsePortsString(formData.ports);
  }
  if (formData.env?.trim()) {
    config.env = parseEnvString(formData.env);
  }
  if (formData.maxMemory?.trim()) {
    config.maxMemory = formData.maxMemory.trim();
  }
  if (formData.maxCpus?.trim()) {
    config.maxCpus = formData.maxCpus.trim();
  }

  // Return null if no fields have values
  if (Object.keys(config).length === 0) return null;
  return config;
}

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
  onProjectCreated?: (projectId: string) => void;
}

export function ProjectDialog({
  open,
  onOpenChange,
  project,
  onProjectCreated,
}: ProjectDialogProps) {
  const isEditMode = !!project;
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const [previewOpen, setPreviewOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ProjectFormData>({
    // @ts-ignore - Zod version mismatch with @hookform/resolvers
    resolver: zodResolver(projectFormSchema),
    defaultValues: project
      ? {
          name: project.name,
          path: project.path,
        }
      : {
          name: "",
          path: "",
        },
  });

  // Reset form when dialog opens/closes or project changes
  useEffect(() => {
    if (open) {
      const previewConfig = project?.preview_config;
      reset(
        project
          ? {
              name: project.name,
              path: project.path,
              dockerFilePath: previewConfig?.dockerFilePath || "",
              ports: portsToString(previewConfig?.ports),
              env: envToString(previewConfig?.env),
              maxMemory: previewConfig?.maxMemory || "",
              maxCpus: previewConfig?.maxCpus || "",
            }
          : {
              name: "",
              path: "",
              dockerFilePath: "",
              ports: "",
              env: "",
              maxMemory: "",
              maxCpus: "",
            }
      );
      // Close preview section when dialog reopens
      setPreviewOpen(false);
    }
  }, [open, project, reset]);

  // Extract folder name from path
  const extractFolderName = (path: string): string => {
    if (!path) return "";
    // Remove trailing slashes
    const cleanPath = path.replace(/\/+$/, "");
    // Get last segment
    const segments = cleanPath.split("/");
    return segments[segments.length - 1] || "";
  };

  // Watch path changes and auto-populate name (only when creating new project)
  const currentPath = watch("path");

  useEffect(() => {
    // Only auto-populate name when creating (not editing) and name hasn't been manually changed
    if (!isEditMode && currentPath && !project) {
      const extractedName = extractFolderName(currentPath);
      if (extractedName) {
        setValue("name", extractedName);
      }
    }
  }, [currentPath, isEditMode, project, setValue]);

  const onSubmit = (data: ProjectFormData) => {
    const previewConfig = buildPreviewConfig(data);

    if (isEditMode) {
      updateMutation.mutate(
        {
          id: project.id,
          data: {
            name: data.name,
            path: data.path,
            preview_config: previewConfig,
          },
        },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        }
      );
    } else {
      createMutation.mutate(
        { name: data.name, path: data.path },
        {
          onSuccess: (newProject) => {
            if (onProjectCreated) {
              onProjectCreated(newProject.id);
            } else {
              onOpenChange(false);
            }
          },
        }
      );
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error || updateMutation.error;

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      contentProps={{ className: "sm:max-w-md" }}
    >
      <DialogHeader>
        <DialogTitle>
          {isEditMode ? "Edit Project" : "Create Project"}
        </DialogTitle>
        <DialogDescription>
          {isEditMode
            ? "Update your project information."
            : "Enter the full path to your project folder to create a new project."}
        </DialogDescription>
      </DialogHeader>

      <ErrorAlert error={mutationError?.message} className="mx-6 mt-4" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="path">Project Folder Path</Label>
            <Input
              id="path"
              {...register("path")}
              placeholder="/Users/username/projects/my-project"
              className="font-mono text-sm"
              disabled={isLoading}
            />
            {errors.path && (
              <p className="text-sm text-destructive">{errors.path.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Paste the full absolute path to your project folder. The project name will be auto-extracted.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="my-project"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Auto-filled from path. You can customize it if needed.
            </p>
          </div>

          {/* Preview Settings - only shown in edit mode */}
          {isEditMode && (
            <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex w-full justify-between px-0 hover:bg-transparent"
                >
                  <span className="text-sm font-medium">Preview Settings</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      previewOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="dockerFilePath">Docker File Path</Label>
                  <Input
                    id="dockerFilePath"
                    {...register("dockerFilePath")}
                    placeholder="docker-compose.yml"
                    className="font-mono text-sm"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Relative path to Docker file (e.g., docker-compose.yml)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ports">Port Names</Label>
                  <Input
                    id="ports"
                    {...register("ports")}
                    placeholder="app, server"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated port names (e.g., app, server)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="env">Environment Variables</Label>
                  <Textarea
                    id="env"
                    {...register("env")}
                    placeholder={"NODE_ENV=preview\nAPI_KEY=test"}
                    className="font-mono text-sm min-h-20"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    One per line: KEY=value
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxMemory">Max Memory</Label>
                    <Input
                      id="maxMemory"
                      {...register("maxMemory")}
                      placeholder="1g"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      e.g., 512m, 1g
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxCpus">Max CPUs</Label>
                    <Input
                      id="maxCpus"
                      {...register("maxCpus")}
                      placeholder="1.0"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      e.g., 0.5, 1.0
                    </p>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              isLoading={isLoading}
              loadingText={isEditMode ? "Updating..." : "Creating..."}
            >
              {isEditMode ? "Update" : "Create"}
            </LoadingButton>
          </DialogFooter>
        </form>
    </BaseDialog>
  );
}
