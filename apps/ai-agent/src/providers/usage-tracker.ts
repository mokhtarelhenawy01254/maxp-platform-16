import prisma from '../db/client'

export interface ModelKey {
  apiKey: string
  modelName: string
  keyId?: string
}

export async function recordSuccess(
  key: ModelKey,
  latencyMs: number,
  companyId?: string
): Promise<void> {
  const tasks: Promise<unknown>[] = [
    prisma.aiProviderLog.create({
      data: {
        provider: 'gemini',
        keyId: key.keyId,
        companyId,
        action: 'llm_call',
        status: 'success',
        latencyMs,
        model: key.modelName,
        scope: 'agent',
      },
    }),
  ]

  if (key.keyId) {
    tasks.push(
      prisma.aiKey.update({
        where: { id: key.keyId },
        data: { currentUsage: { increment: 1 } },
      })
    )
  }

  await Promise.all(tasks)
}

export async function recordFailure(
  key: ModelKey,
  error: unknown,
  latencyMs: number,
  companyId?: string
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error)

  await prisma.aiProviderLog.create({
    data: {
      provider: 'gemini',
      keyId: key.keyId,
      companyId,
      action: 'llm_call',
      status: resolveStatus(errorMessage),
      latencyMs,
      model: key.modelName,
      message: errorMessage,
      scope: 'agent',
    },
  })

  await maybeExcludeModel(key, errorMessage)
}

function resolveStatus(msg: string): string {
  if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) return 'rate_limited'
  if (msg.includes('503') || msg.toLowerCase().includes('overloaded')) return 'overloaded'
  if (msg.toLowerCase().includes('quota')) return 'quota_exceeded'
  return 'error'
}

async function maybeExcludeModel(key: ModelKey, msg: string): Promise<void> {
  let retryAt: Date | null = null
  let reason = ''

  if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
    retryAt = new Date(Date.now() + 60_000)
    reason = 'rate_limit'
  } else if (msg.includes('503') || msg.toLowerCase().includes('overloaded')) {
    retryAt = new Date(Date.now() + 5 * 60_000)
    reason = 'overloaded'
  } else if (msg.toLowerCase().includes('quota')) {
    retryAt = new Date(Date.now() + 24 * 60 * 60_000)
    reason = 'quota_exceeded'
  }

  if (!retryAt) return

  await prisma.excludedModel.create({
    data: { modelName: key.modelName, keyId: key.keyId, reason, retryAt },
  })
}
