import type { WorkflowRun } from "../../types";

interface LogsTabProps {
  run: WorkflowRun;
}

export function LogsTab({ run }: LogsTabProps) {
  const steps = run.steps || [];
  const stepsWithLogs = steps.filter((s) => s.logs);

  if (stepsWithLogs.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        No logs available
      </div>
    );
  }

  const currentStep = stepsWithLogs[0];

  return (
    <div className="space-y-4">
      {stepsWithLogs.length > 1 && (
        <div>
          <label className="text-sm font-medium block mb-2">Select Step:</label>
          <select className="w-full border rounded px-3 py-2 text-sm">
            {stepsWithLogs.map((step) => (
              <option key={step.id} value={step.id}>
                {step.name} ({step.status})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-muted p-4 rounded">
        <pre className="text-xs font-mono whitespace-pre-wrap">
          {currentStep?.logs || "No logs available"}
        </pre>
        <div className="text-sm text-muted-foreground mt-2">
          (Real-time log streaming will be implemented with WebSocket)
        </div>
      </div>
    </div>
  );
}
