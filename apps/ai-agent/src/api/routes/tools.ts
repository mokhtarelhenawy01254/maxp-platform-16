import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../../db/client'

export const toolsRouter = Router()

toolsRouter.get('/', async (req: Request, res: Response) => {
  const companyId = req.query.companyId as string | undefined

  const tools = await prisma.agentToolDefinition.findMany({
    where: {
      isActive: true,
      ...(companyId ? { OR: [{ companyId }, { companyId: null }] } : {}),
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  return res.json(tools)
})

const CreateToolSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  parameters: z.string(),
  isWrite: z.boolean().default(false),
  companyId: z.string().optional(),
})

toolsRouter.post('/', async (req: Request, res: Response) => {
  const parsed = CreateToolSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  try {
    const tool = await prisma.agentToolDefinition.create({ data: parsed.data })
    return res.status(201).json(tool)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Create failed'
    return res.status(500).json({ error: msg })
  }
})

toolsRouter.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const allowed = ['label', 'description', 'isActive', 'parameters'] as const
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in req.body) update[key] = req.body[key]
  }

  try {
    const tool = await prisma.agentToolDefinition.update({ where: { id }, data: update })
    return res.json(tool)
  } catch {
    return res.status(404).json({ error: 'Tool not found' })
  }
})
