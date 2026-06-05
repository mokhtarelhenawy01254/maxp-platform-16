import prisma from '../db/client'
import { callGemini, GeminiCallOptions, GeminiResponse } from './gemini-provider'
import { recordSuccess, recordFailure, ModelKey } from './usage-tracker'

export class ProviderExhaustedError extends Error {
  constructor() {
    super('All Gemini models/keys exhausted')
    this.name = 'ProviderExhaustedError'
  }
}

const ENV_FALLBACK_MODELS = [
  process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
]

type Attempt = ModelKey & { modelName: string }

export async function callWithFailover(
  options: GeminiCallOptions,
  companyId?: string
): Promise<GeminiResponse> {
  const attempts: Attempt[] = await buildAttemptList(companyId)

  let lastError: unknown
  for (const attempt of attempts) {
    const excluded = await prisma.excludedModel.findFirst({
      where: { modelName: attempt.modelName, retryAt: { gt: new Date() } },
    })
    if (excluded) continue

    const start = Date.now()
    try {
      const result = await callGemini(attempt.apiKey, attempt.modelName, options)
      await recordSuccess(attempt, Date.now() - start, companyId)
      return result
    } catch (err) {
      lastError = err
      await recordFailure(attempt, err, Date.now() - start, companyId)
    }
  }

  if (lastError) throw lastError
  throw new ProviderExhaustedError()
}

async function buildAttemptList(companyId?: string): Promise<Attempt[]> {
  const attempts: Attempt[] = []

  // DB keys (company-specific first, then central)
  const dbKeys = await prisma.aiKey.findMany({
    where: { isActive: true, provider: 'GOOGLE' },
    orderBy: { priority: 'asc' },
    include: {
      aiModelConfigs: { where: { isEnabled: true }, orderBy: { priority: 'asc' } },
    },
  })

  for (const key of dbKeys) {
    if (key.currentUsage >= key.maxRequestsPerDay) continue
    for (const mc of key.aiModelConfigs) {
      attempts.push({ apiKey: key.apiKey, keyId: key.id, modelName: mc.modelName })
    }
  }

  // Env key fallback
  const envKey = process.env.GEMINI_API_KEY
  if (envKey) {
    for (const modelName of ENV_FALLBACK_MODELS) {
      attempts.push({ apiKey: envKey, modelName })
    }
  }

  return attempts
}
