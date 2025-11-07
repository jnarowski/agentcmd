import { z } from 'zod'
import type { AgentExecuteResult } from './index'

export const handleExecutionFailureOptionsSchema = z.object({
  sessionId: z.string().min(1, 'Session ID required'),
  result: z.custom<AgentExecuteResult>(),
  shouldBroadcast: z.boolean().optional()
})

export type HandleExecutionFailureOptions = z.infer<typeof handleExecutionFailureOptionsSchema>
