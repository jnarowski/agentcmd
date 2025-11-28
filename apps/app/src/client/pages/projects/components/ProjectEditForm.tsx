import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUpdateProject } from "@/client/pages/projects/hooks/useProjects";
import { Button } from "@/client/components/ui/button";
import { LoadingButton } from "@/client/components/ui/loading-button";
import { ErrorAlert } from "@/client/components/ui/error-alert";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { Textarea } from "@/client/components/ui/textarea";
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

// Helper functions for parsing/conversion

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

interface ProjectEditFormProps {
  project: Project;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProjectEditForm({
  project,
  onSuccess,
  onCancel,
}: ProjectEditFormProps) {
  const updateMutation = useUpdateProject();

  const previewConfig = project.preview_config;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProjectFormData>({
    // @ts-ignore - Zod version mismatch with @hookform/resolvers
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: project.name,
      path: project.path,
      dockerFilePath: previewConfig?.dockerFilePath || "",
      ports: portsToString(previewConfig?.ports),
      env: envToString(previewConfig?.env),
      maxMemory: previewConfig?.maxMemory || "",
      maxCpus: previewConfig?.maxCpus || "",
    },
  });

  // Reset form when project changes
  useEffect(() => {
    const config = project.preview_config;
    reset({
      name: project.name,
      path: project.path,
      dockerFilePath: config?.dockerFilePath || "",
      ports: portsToString(config?.ports),
      env: envToString(config?.env),
      maxMemory: config?.maxMemory || "",
      maxCpus: config?.maxCpus || "",
    });
  }, [project, reset]);

  const onSubmit = (data: ProjectFormData) => {
    const previewConfig = buildPreviewConfig(data);

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
          onSuccess();
        },
      }
    );
  };

  const isLoading = updateMutation.isPending;
  const mutationError = updateMutation.error;

  return (
    <>
      {/* Body */}
      <div className="px-6 py-4 space-y-6">
        <ErrorAlert error={mutationError?.message} />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Basic Settings
            </h3>

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
                The full absolute path to your project folder.
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
            </div>
          </div>

          {/* Preview Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Preview Container Settings
            </h3>
            <p className="text-xs text-muted-foreground">
              Configure how preview containers are built and run for this project.
            </p>

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
                Comma-separated port names (e.g., app, server). These map to PREVIEW_PORT_APP, PREVIEW_PORT_SERVER env vars.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="env">Environment Variables</Label>
              <Textarea
                id="env"
                {...register("env")}
                placeholder={"NODE_ENV=preview\nAPI_KEY=test"}
                className="font-mono text-sm min-h-24"
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
          </div>

          {/* Footer - Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              isLoading={isLoading}
              loadingText="Saving..."
            >
              Save Changes
            </LoadingButton>
          </div>
        </form>
      </div>
    </>
  );
}
