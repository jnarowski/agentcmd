import type { WorkflowRun } from "@/client/pages/projects/workflows/types";

interface LogsTabProps {
  run: WorkflowRun;
}

interface TraceEntry {
  command: string;
  output?: string;
}

interface StepOutputWithTrace {
  trace?: TraceEntry[];
}

export function LogsTab({ run }: LogsTabProps) {
  const steps = run.steps || [];
  const stepsWithTrace = steps.filter((s) => {
    const output = s.output as StepOutputWithTrace | null | undefined;
    return output && Array.isArray(output.trace) && output.trace.length > 0;
  });

  if (stepsWithTrace.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        No logs available
      </div>
    );
  }

  const currentStep = stepsWithTrace[0];
  const output = currentStep?.output as StepOutputWithTrace | null | undefined;
  const trace = output?.trace || [];

  return (
    <div className="space-y-4">
      {stepsWithTrace.length > 1 && (
        <div>
          <label className="text-sm font-medium block mb-2">Select Step:</label>
          <select className="w-full border rounded px-3 py-2 text-sm">
            {stepsWithTrace.map((step) => (
              <option key={step.id} value={step.id}>
                {step.name} ({step.status})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-muted p-4 rounded">
        <pre className="text-xs font-mono whitespace-pre-wrap">
          {trace.length > 0
            ? trace.map((entry: TraceEntry) => `$ ${entry.command}${entry.output ? '\n' + entry.output : ''}`).join('\n\n')
            : "No logs available"}
        </pre>
        <div className="text-sm text-muted-foreground mt-2">
          (Real-time log streaming will be implemented with WebSocket)
        </div>
      </div>
    </div>
  );
}
