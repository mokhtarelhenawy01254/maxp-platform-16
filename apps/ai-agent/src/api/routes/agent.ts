import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { runAgent } from '../../core/agent-runner'
import prisma from '../../db/client'

export const agentRouter = Router()

const RunSchema = z.object({
  agentId: z.string().min(1).optional(),
  companyId: z.string().min(1),
  message: z.string().min(1),
})

agentRouter.post('/run', async (req: Request, res: Response) => {
  const parsed = RunSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const { companyId, message } = parsed.data
  let { agentId } = parsed.data

  try {
    if (!agentId) {
      const ceo = await prisma.companyAgent.findFirst({
        where: { companyId, parentId: null, status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
      })
      if (!ceo) {
        return res.status(404).json({ error: 'No CEO agent found for this company' })
      }
      agentId = ceo.id
    }

    const result = await runAgent(agentId, message)
    return res.json({ ok: true, ...result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return res.status(500).json({ error: msg })
  }
})
