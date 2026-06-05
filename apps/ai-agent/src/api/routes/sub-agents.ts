import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../../db/client'

export const subAgentsRouter = Router()

subAgentsRouter.get('/', async (req: Request, res: Response) => {
  const companyId = req.query.companyId as string | undefined
  if (!companyId) return res.status(400).json({ error: 'companyId required' })

  const agents = await prisma.companyAgent.findMany({
    where: { companyId, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  })
  return res.json(agents)
})

const CreateAgentSchema = z.object({
  id: z.string().optional(),
  companyId: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  description: z.string().optional(),
  soul: z.string().optional(),
  rules: z.string().optional(),
  skills: z.string().optional(),
  model: z.string().optional(),
  parentId: z.string().optional(),
})

subAgentsRouter.post('/', async (req: Request, res: Response) => {
  const parsed = CreateAgentSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const data = parsed.data
  const id = data.id ?? `agent-${Date.now()}`

  try {
    const agent = await prisma.companyAgent.create({
      data: { ...data, id },
    })
    return res.status(201).json(agent)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Create failed'
    return res.status(500).json({ error: msg })
  }
})

subAgentsRouter.patch('/:id/tools', async (req: Request, res: Response) => {
  const { id } = req.params
  const { skills } = req.body as { skills: string[] }

  try {
    const agent = await prisma.companyAgent.update({
      where: { id },
      data: { skills: JSON.stringify(skills) },
    })
    return res.json(agent)
  } catch {
    return res.status(404).json({ error: 'Agent not found' })
  }
})

subAgentsRouter.get('/:id/tree', async (req: Request, res: Response) => {
  const { id } = req.params

  async function buildTree(agentId: string): Promise<unknown> {
    const agent = await prisma.companyAgent.findUnique({ where: { id: agentId } })
    if (!agent) return null

    const children = await prisma.companyAgent.findMany({
      where: { parentId: agentId, status: 'ACTIVE' },
    })

    const childTrees = await Promise.all(children.map(c => buildTree(c.id)))

    return { ...agent, children: childTrees }
  }

  const tree = await buildTree(id)
  if (!tree) return res.status(404).json({ error: 'Agent not found' })
  return res.json(tree)
})
