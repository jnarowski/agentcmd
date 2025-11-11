import { useState, useEffect, useMemo } from "react";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/client/components/ui/radio-group";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/client/components/ui/tabs";
import { Combobox } from "@/client/components/ui/combobox";
import { CodeEditor } from "@/client/components/CodeEditor";
import { useCreateWorkflow } from "@/client/pages/projects/workflows/hooks/useWorkflowMutations";
import { useProjectSpecs } from "@/client/pages/projects/hooks/useProjectSpecs";
import { useProjectBranches } from "@/client/pages/projects/hooks/useProjectBranches";
import { api } from "@/client/utils/api";
import type {
  WorkflowDefinition,
  WorkflowRun,
} from "@/client/pages/projects/workflows/types";
import { NewRunFormDialogArgSchemaFields } from "./NewRunFormDialogArgSchemaFields";

interface NewRunFormProps {
  projectId: string;
  definitionId?: string;
  definition?: WorkflowDefinition;
  definitions?: WorkflowDefinition[];
  onSuccess: (run: WorkflowRun) => void;
  onCancel: () => void;
}

export function NewRunForm({
  projectId,
  definitionId,
  definition,
  definitions,
  onSuccess,
  onCancel,
}: NewRunFormProps) {
  const createWorkflow = useCreateWorkflow();

  // Don't set initial value - let useEffect handle it after definitions load
  const [selectedDefinitionId, setSelectedDefinitionId] = useState("");
  const [specInputType, setSpecInputType] = useState<"file" | "content">(
    "file"
  );
  const [specFile, setSpecFile] = useState<string>("");
  const [specContent, setSpecContent] = useState<string>("");
  const [name, setName] = useState("");
  const [args, setArgs] = useState<Record<string, unknown>>({});
  const [baseBranch, setBaseBranch] = useState("main");
  const [mode, setMode] = useState<"stay" | "branch" | "worktree">("branch");
  const [branchName, setBranchName] = useState("");
  const [isGeneratingNames, setIsGeneratingNames] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive actual definition from selectedDefinitionId or prop
  const actualDefinition =
    definition || definitions?.find((d) => d.id === selectedDefinitionId);

  // Auto-select definition: use definitionId prop if provided, else first definition
  useEffect(() => {
    if (definitions && definitions.length > 0) {
      if (definitionId) {
        // Only set if the definition exists in the list
        const definitionExists = definitions.some((d) => d.id === definitionId);
        if (definitionExists) {
          setSelectedDefinitionId(definitionId);
        }
      } else if (!selectedDefinitionId) {
        // Default to first definition
        setSelectedDefinitionId(definitions[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definitionId, definitions]);

  // Reset dependent state when definition changes
  useEffect(() => {
    if (selectedDefinitionId && selectedDefinitionId !== definitionId) {
      setSpecFile("");
      setName("");
      setArgs({});
    }
  }, [selectedDefinitionId, definitionId]);

  // Fetch available spec files
  const { data: specFiles } = useProjectSpecs(projectId, true);

  // Fetch available branches
  const { data: branches } = useProjectBranches(projectId, true);

  // Transform branches to combobox options
  const branchOptions = useMemo(() => {
    if (!branches) return [];
    return branches.map((branch) => ({
      value: branch.name,
      label: branch.name,
      badge: branch.current ? "(current)" : undefined,
    }));
  }, [branches]);

  // Transform spec files to combobox options
  const specFileOptions = useMemo(() => {
    if (!specFiles) return [];
    return specFiles.map((file) => ({
      value: file,
      label: file,
    }));
  }, [specFiles]);

  // Transform definitions to combobox options with scope grouping
  const definitionOptions = useMemo(() => {
    if (!definitions) return [];

    const projectDefs = definitions.filter((def) => def.scope === "project");
    const globalDefs = definitions.filter((def) => def.scope === "global");

    const options: Array<{
      value: string;
      label: string;
      description?: string;
      disabled?: boolean;
    }> = [
      ...projectDefs.map((def) => ({
        value: def.id,
        label: def.name,
        description: def.description || undefined,
      })),
    ];

    // Only add global section if there are global workflows
    if (globalDefs.length > 0) {
      options.push(
        {
          value: "__separator__",
          label: "──────── Global Templates ────────",
          description: undefined,
          disabled: true,
        },
        ...globalDefs.map((def) => ({
          value: def.id,
          label: def.name,
          description: def.description || undefined,
        }))
      );
    }

    return options;
  }, [definitions]);

  // Auto-generate names from spec file using AI
  useEffect(() => {
    if (!specFile || !projectId) return;

    const generateNames = async () => {
      setIsGeneratingNames(true);
      try {
        const response = await api.post<{
          data: { runName: string; branchName: string } | null;
        }>("/api/workflows/generate-names-from-spec", {
          projectId,
          specFile,
        });

        const names = response.data;
        if (names) {
          setName(names.runName);
          setBranchName(names.branchName);
        }
      } catch {
        // Silent failure - user can still manually enter names
      } finally {
        setIsGeneratingNames(false);
      }
    };

    generateNames();
  }, [specFile, projectId]);

  // Auto-generate branch name from run name
  useEffect(() => {
    if (name && mode !== "stay") {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      setBranchName(slug);
    }
  }, [name, mode]);

  const handleSubmit = async () => {
    setError(null);
    setShowValidation(true);

    // Validate workflow definition (only when definitions prop is provided)
    if (
      !definitionId &&
      definitions &&
      definitions.length > 0 &&
      !selectedDefinitionId
    ) {
      setError("Workflow definition is required");
      return;
    }

    // Check if selected workflow has a load error
    if (actualDefinition?.load_error) {
      setError(`Cannot run workflow: ${actualDefinition.load_error}`);
      return;
    }

    // Validate name
    if (!name.trim()) {
      return; // Show inline error instead of global error
    }

    // Validate spec input
    if (specInputType === "file" && !specFile) {
      setError("Spec file is required");
      return;
    }
    if (specInputType === "content" && !specContent.trim()) {
      setError("Spec content is required");
      return;
    }

    // Validate mode (skip validation for 'stay' mode)
    if (mode !== "stay" && !branchName.trim()) {
      setError("Branch name is required");
      return;
    }

    try {
      // At this point, we've validated that we have a definitionId
      const actualDefinitionId = selectedDefinitionId || definitionId!;

      const run = await createWorkflow.mutateAsync({
        projectId,
        definitionId: actualDefinitionId,
        name: name.trim(),
        args,
        spec_file: specInputType === "file" ? specFile : undefined,
        spec_content: specInputType === "content" ? specContent : undefined,
        mode: mode,
        base_branch: mode !== "stay" ? baseBranch || undefined : undefined,
        branch_name: mode !== "stay" ? branchName || undefined : undefined,
      });

      onSuccess(run);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create run");
    }
  };

  return (
    <div className="space-y-6 [&>div]:space-y-2">
      {/* Show error alert if selected workflow has load error */}
      {actualDefinition?.load_error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">
            Workflow Load Error
          </p>
          <p className="text-xs text-destructive/80 mt-1">
            {actualDefinition.load_error}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Fix the error in the workflow file before creating a run.
          </p>
        </div>
      )}

      {/* Workflow definition selection - always show */}
      <div>
        <Label>Workflow Definition</Label>
        <Combobox
          value={selectedDefinitionId}
          onValueChange={setSelectedDefinitionId}
          options={definitionOptions}
          placeholder={
            definitions
              ? "Select workflow definition..."
              : "Loading definitions..."
          }
          searchPlaceholder="Search definitions..."
          emptyMessage="No workflow definitions found"
          disabled={createWorkflow.isPending || !definitions}
        />
      </div>

      {/* Spec input type selection */}
      <div>
        <Label className="mb-2 block">Spec Input</Label>
        <div className="rounded-lg border bg-card">
          <Tabs
            value={specInputType}
            onValueChange={(v) => setSpecInputType(v as "file" | "content")}
            className="w-full !gap-0"
          >
            <TabsList className="w-full rounded-t-lg rounded-b-none border-b h-auto p-0 bg-transparent">
              <TabsTrigger
                value="file"
                className="flex-1 rounded-none data-[state=active]:border-b data-[state=active]:border-primary data-[state=active]:-mb-px rounded-tl-lg"
              >
                Select from file
              </TabsTrigger>
              <TabsTrigger
                value="content"
                className="flex-1 rounded-none data-[state=active]:border-b data-[state=active]:border-primary data-[state=active]:-mb-px rounded-tr-lg"
              >
                Write It
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="space-y-2 p-3 m-0">
              <Combobox
                value={specFile}
                onValueChange={setSpecFile}
                options={specFileOptions}
                placeholder="Select spec file..."
                searchPlaceholder="Search spec files..."
                emptyMessage="No spec files found"
                disabled={createWorkflow.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Select from .agent/specs/todo/
              </p>
            </TabsContent>

            <TabsContent value="content" className="m-0 p-0">
              <CodeEditor
                value={specContent}
                onChange={setSpecContent}
                language="markdown"
                minHeight="200px"
                height="auto"
                showLineNumbers={true}
                wordWrap={true}
                readOnly={createWorkflow.isPending}
                transparentBackground={true}
                fontSize="13px"
                className="rounded-b-lg"
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Name input */}
      <div>
        <Label htmlFor="run-name">Run Name</Label>
        <div className="relative">
          <Input
            id="run-name"
            placeholder="e.g., Feature Implementation - API v2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={createWorkflow.isPending || isGeneratingNames}
            aria-invalid={showValidation && !name.trim()}
          />
          {isGeneratingNames && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg
                className="animate-spin h-4 w-4 text-muted-foreground"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          )}
        </div>
        {isGeneratingNames && (
          <p className="text-xs text-muted-foreground">
            Generating names from spec...
          </p>
        )}
        {showValidation && !name.trim() && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Run Name is required
          </p>
        )}
      </div>

      {/* Setup: stay, branch, or worktree */}
      <div className="space-y-3">
        <Label>Setup Phase</Label>
        <div className="text-xs text-muted-foreground pb-3">
          This runs automatically before your workflow and handles setting up
          the git workspace the branch, worktree etc
        </div>
        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as "stay" | "branch" | "worktree")}
        >
          {/* Branch option */}
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="branch" id="mode-branch" />
              <Label
                htmlFor="mode-branch"
                className="font-normal cursor-pointer"
              >
                Create a new Branch
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Creates and checks out a new branch from base
            </p>
            {mode === "branch" && (
              <div className="ml-2 space-y-3 border-l-2 border-muted pl-3.5 py-3 [&>div]:space-y-2">
                {/* Branch Name */}
                <div>
                  <Label htmlFor="branch-name">Branch Name</Label>
                  <Input
                    id="branch-name"
                    placeholder="Auto-generated from run name"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    disabled={createWorkflow.isPending}
                  />
                </div>
                {/* Branch From (optional) */}
                <div>
                  <Label htmlFor="branch-from">Branch From (optional)</Label>
                  <Combobox
                    value={baseBranch}
                    onValueChange={setBaseBranch}
                    options={branchOptions}
                    placeholder="Select branch (defaults to main)..."
                    searchPlaceholder="Search branches..."
                    emptyMessage="No branches found"
                    disabled={createWorkflow.isPending}
                    renderOption={(option, selected) => (
                      <div className="flex items-center gap-2 flex-1">
                        {selected && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="size-4 shrink-0"
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        )}
                        <span className="flex-1">{option.label}</span>
                        {option.badge && (
                          <span className="text-xs text-muted-foreground">
                            {option.badge}
                          </span>
                        )}
                      </div>
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Defaults to main if not specified
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Worktree option */}
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="worktree" id="mode-worktree" />
              <Label
                htmlFor="mode-worktree"
                className="font-normal cursor-pointer"
              >
                Create a new Worktree
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Creates a git worktree with a new branch for parallel work
            </p>
            {mode === "worktree" && (
              <div className="ml-2 space-y-3 border-l-2 border-muted pl-3.5 py-3 [&>div]:space-y-2">
                {/* Branch Name */}
                <div>
                  <Label htmlFor="worktree-branch-name">Branch Name</Label>
                  <Input
                    id="worktree-branch-name"
                    placeholder="Auto-generated from run name"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    disabled={createWorkflow.isPending}
                  />
                </div>
                {/* Branch From (optional) */}
                <div>
                  <Label htmlFor="worktree-branch-from">
                    Branch From (optional)
                  </Label>
                  <Combobox
                    value={baseBranch}
                    onValueChange={setBaseBranch}
                    options={branchOptions}
                    placeholder="Select branch (defaults to main)..."
                    searchPlaceholder="Search branches..."
                    emptyMessage="No branches found"
                    disabled={createWorkflow.isPending}
                    renderOption={(option, selected) => (
                      <div className="flex items-center gap-2 flex-1">
                        {selected && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="size-4 shrink-0"
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        )}
                        <span className="flex-1">{option.label}</span>
                        {option.badge && (
                          <span className="text-xs text-muted-foreground">
                            {option.badge}
                          </span>
                        )}
                      </div>
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Defaults to main if not specified
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Skip Setup option */}
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="stay" id="mode-stay" />
              <Label htmlFor="mode-stay" className="font-normal cursor-pointer">
                Stay in Current Branch
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Runs in current branch without creating a new branch or worktree
            </p>
          </div>
        </RadioGroup>
      </div>

      {/* Args input - only show if workflow has args_schema with properties */}
      {actualDefinition?.args_schema?.properties &&
        Object.keys(actualDefinition.args_schema.properties).length > 0 && (
          <div>
            <Label htmlFor="run-args" className="text-base pb-2 pt-3">
              Arguments
            </Label>
            <NewRunFormDialogArgSchemaFields
              argsSchema={actualDefinition.args_schema}
              values={args}
              onChange={setArgs}
              disabled={createWorkflow.isPending}
            />
            {actualDefinition?.description && (
              <p className="text-xs text-muted-foreground">
                {actualDefinition.description}
              </p>
            )}
          </div>
        )}

      {/* Error message */}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Submit actions - exposed for wrapper to customize */}
      <div className="flex gap-2 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={createWorkflow.isPending}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            createWorkflow.isPending ||
            (!definitionId &&
              definitions &&
              definitions.length > 0 &&
              !selectedDefinitionId)
          }
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {createWorkflow.isPending ? "Creating..." : "Create Run"}
        </button>
      </div>
    </div>
  );
}
