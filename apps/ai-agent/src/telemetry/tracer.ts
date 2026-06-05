import prisma from '../db/client'

export interface Trace {
  id: string
  companyId: string
}

export async function startTrace(companyId: string): Promise<Trace> {
  const trace = await prisma.telemetryTrace.create({
    data: { companyId, channel: 'DASHBOARD', status: 'RUNNING' },
  })
  return { id: trace.id, companyId }
}

export async function endTrace(
  traceId: string,
  usage: { promptTokens: number; completionTokens: number; totalTokens: number },
  status: 'SUCCESS' | 'ERROR' | 'APPROVAL_REQUIRED' = 'SUCCESS'
): Promise<void> {
  await prisma.telemetryTrace.update({
    where: { id: traceId },
    data: {
      status,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
    },
  })
}

export async function addSpan(
  traceId: string,
  name: string,
  type: 'LLM' | 'TOOL' | 'ROUTER',
  input: unknown,
  output: unknown,
  latencyMs: number,
  status: 'SUCCESS' | 'ERROR' = 'SUCCESS',
  error?: string
): Promise<void> {
  await prisma.telemetrySpan.create({
    data: {
      traceId,
      name,
      type,
      latencyMs,
      status,
      input: JSON.stringify(input),
      output: JSON.stringify(output),
      error,
      endTime: new Date(),
    },
  })
}
