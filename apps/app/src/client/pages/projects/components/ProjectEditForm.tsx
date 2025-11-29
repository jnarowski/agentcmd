import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUpdateProject } from "@/client/pages/projects/hooks/useProjects";
import { Button } from "@/client/components/ui/button";
import { LoadingButton } from "@/client/components/ui/loading-button";
import { ErrorAlert } from "@/client/components/ui/error-alert";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { Textarea } from "@/client/components/ui/textarea";
import { FileSelectCombobox } from "@/client/components/FileSelectCombobox";
import { Plus, X } from "lucide-react";
import type { Project, ProjectPreviewConfig } from "@/shared/types/project.types";

// Form validation schema
const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required").max(255),
  path: z.string().min(1, "Project path is required"),
  // Preview config fields (all optional strings for form handling)
  dockerFilePath: z.string().optional(),
  // ports managed separately via state (key-value pairs)
  env: z.string().optional(),
  maxMemory: z.string().optional(),
  maxCpus: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

// Port entry for the UI
interface PortEntry {
  envVar: string;
  containerPort: string;
}

// Helper functions for parsing/conversion

/** Convert absolute path to relative path */
function toRelativePath(absolutePath: string, projectPath: string): string {
  if (!projectPath || !absolutePath) return absolutePath;

  // Normalize project path (remove trailing slash)
  const normalizedProjectPath = projectPath.endsWith("/")
    ? projectPath.slice(0, -1)
    : projectPath;

  // If the path starts with the project path, make it relative
  if (absolutePath.startsWith(normalizedProjectPath + "/")) {
    return absolutePath.slice(normalizedProjectPath.length + 1);
  }

  return absolutePath;
}

/** Convert relative path to absolute path */
function toAbsolutePath(relativePath: string, projectPath: string): string {
  if (!relativePath || !projectPath) return relativePath;

  // If already absolute, return as is
  if (relativePath.startsWith("/")) return relativePath;

  // Normalize project path (remove trailing slash)
  const normalizedProjectPath = projectPath.endsWith("/")
    ? projectPath.slice(0, -1)
    : projectPath;

  return `${normalizedProjectPath}/${relativePath}`;
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

function envToString(obj?: Record<string, string>): string {
  if (!obj || Object.keys(obj).length === 0) return "";
  return Object.entries(obj)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
}

function portsToEntries(ports?: Record<string, number>): PortEntry[] {
  if (!ports || Object.keys(ports).length === 0) return [];
  return Object.entries(ports).map(([envVar, containerPort]) => ({
    envVar,
    containerPort: String(containerPort),
  }));
}

function entriesToPorts(entries: PortEntry[]): Record<string, number> | undefined {
  const validEntries = entries.filter((e) => e.envVar.trim() && e.containerPort.trim());
  if (validEntries.length === 0) return undefined;
  const result: Record<string, number> = {};
  for (const entry of validEntries) {
    const port = parseInt(entry.containerPort, 10);
    if (!isNaN(port) && port > 0) {
      result[entry.envVar.trim()] = port;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function buildPreviewConfig(
  formData: ProjectFormData,
  portEntries: PortEntry[]
): ProjectPreviewConfig | null {
  const config: ProjectPreviewConfig = {};

  if (formData.dockerFilePath?.trim()) {
    config.dockerFilePath = formData.dockerFilePath.trim();
  }
  const ports = entriesToPorts(portEntries);
  if (ports) {
    config.ports = ports;
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

  // Port entries managed separately from react-hook-form
  const [portEntries, setPortEntries] = useState<PortEntry[]>(() =>
    portsToEntries(previewConfig?.ports)
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<ProjectFormData>({
    // @ts-ignore - Zod version mismatch with @hookform/resolvers
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: project.name,
      path: project.path,
      dockerFilePath: previewConfig?.dockerFilePath || "",
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
      env: envToString(config?.env),
      maxMemory: config?.maxMemory || "",
      maxCpus: config?.maxCpus || "",
    });
    setPortEntries(portsToEntries(config?.ports));
  }, [project, reset]);

  // Port entry handlers
  const addPortEntry = () => {
    setPortEntries([...portEntries, { envVar: "", containerPort: "" }]);
  };

  const removePortEntry = (index: number) => {
    setPortEntries(portEntries.filter((_, i) => i !== index));
  };

  const updatePortEntry = (index: number, field: keyof PortEntry, value: string) => {
    setPortEntries(
      portEntries.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      )
    );
  };

  const onSubmit = (data: ProjectFormData) => {
    const previewConfig = buildPreviewConfig(data, portEntries);

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
              <Controller
                name="dockerFilePath"
                control={control}
                render={({ field }) => (
                  <FileSelectCombobox
                    value={toAbsolutePath(field.value || "", project.path)}
                    onValueChange={(absolutePath) => {
                      const relativePath = toRelativePath(absolutePath, project.path);
                      field.onChange(relativePath);
                    }}
                    projectId={project.id}
                    projectPath={project.path}
                    placeholder="Select Docker file..."
                    disabled={isLoading}
                    buttonClassName="font-mono text-sm"
                  />
                )}
              />
              {errors.dockerFilePath && (
                <p className="text-sm text-destructive">{errors.dockerFilePath.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Select Docker Compose file, Dockerfile, or other container config
              </p>
            </div>

            <div className="space-y-2">
              <Label>Port Mappings</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Map environment variable names to container ports. The env var will be set to an available host port.
              </p>
              <div className="space-y-2">
                {portEntries.length > 0 && (
                  <div className="flex gap-2 items-center text-xs text-muted-foreground font-medium">
                    <div className="flex-1">Name</div>
                    <div className="flex-1">Default Port</div>
                    <div className="w-8" />
                  </div>
                )}
                {portEntries.map((entry, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="ENV_VAR (e.g., PORT)"
                      value={entry.envVar}
                      onChange={(e) => updatePortEntry(index, "envVar", e.target.value)}
                      className="font-mono text-sm flex-1"
                      disabled={isLoading}
                    />
                    <Input
                      placeholder="3000"
                      value={entry.containerPort}
                      onChange={(e) => updatePortEntry(index, "containerPort", e.target.value)}
                      className="font-mono text-sm flex-1"
                      type="number"
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePortEntry(index)}
                      disabled={isLoading}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPortEntry}
                  disabled={isLoading}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Port
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Example: PORT = 3000 means docker-compose should use {`\${PORT:-3000}:3000`}
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
