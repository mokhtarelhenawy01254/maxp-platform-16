import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { runAgent } from '../../core/agent-runner'

export const agentRouter = Router()

const RunSchema = z.object({
  agentId: z.string().min(1),
  companyId: z.string().min(1),
  message: z.string().min(1),
})

agentRouter.post('/run', async (req: Request, res: Response) => {
  const parsed = RunSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const { agentId, message } = parsed.data

  try {
    const result = await runAgent(agentId, message)
    return res.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return res.status(500).json({ error: message })
  }
})
