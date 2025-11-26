import { config } from "@/server/config";

export interface InngestRunStatusData {
  run_id: string;
  run_started_at: string;
  function_id: string;
  function_version: number;
  environment_id: string;
  event_id: string;
  status: string;
  ended_at: string | null;
}

export interface InngestRunStatusResponse {
  data: InngestRunStatusData;
  metadata: {
    fetched_at: string;
    cached_until: string;
  };
}

export interface InngestRunStatusResult {
  success: boolean;
  data?: InngestRunStatusData;
  error?: string;
}

export async function getInngestRunStatus(
  inngestRunId: string
): Promise<InngestRunStatusResult> {
  try {
    const inngestPort = config.workflow.inngestDevPort;
    const url = `http://localhost:${inngestPort}/v1/runs/${inngestRunId}`;

    const response = await fetch(url);

    if (!response.ok) {
      return {
        success: false,
        error: `Inngest API returned ${response.status}`,
      };
    }

    const json = (await response.json()) as InngestRunStatusResponse;

    return {
      success: true,
      data: json.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
