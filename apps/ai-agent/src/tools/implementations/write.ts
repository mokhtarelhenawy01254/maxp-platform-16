import { Prisma } from '../../../../backend/generated/postgresql_v2'
import prisma from '../../db/client'
import { randomUUID } from 'crypto'

export class ApprovalRequiredError extends Error {
  approvalId: string
  constructor(approvalId: string, toolName: string) {
    super(`Tool "${toolName}" requires human approval (requestId: ${approvalId})`)
    this.name = 'ApprovalRequiredError'
    this.approvalId = approvalId
  }
}

async function requireApproval(
  toolName: string,
  args: Record<string, unknown>,
  companyId: string
): Promise<void> {
  const existing = await prisma.aiToolApprovalRequest.findFirst({
    where: { toolName, companyId, status: 'APPROVED' },
  })
  if (existing) return

  const req = await prisma.aiToolApprovalRequest.create({
    data: {
      companyId,
      requestKey: randomUUID(),
      toolName,
      status: 'PENDING',
      channel: 'DASHBOARD',
      source: 'agent',
      sideEffects: 'write',
      approvalMode: 'required',
      inputSnapshot: JSON.stringify(args),
      expiresAt: new Date(Date.now() + 30 * 60_000),
    },
  })

  throw new ApprovalRequiredError(req.id, toolName)
}

export async function updateOrderStatus(
  args: Record<string, unknown>,
  companyId: string
): Promise<unknown> {
  await requireApproval('updateOrderStatus', args, companyId)

  const { orderId, status } = args as { orderId: string; status: string }

  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE orders
      SET status = ${status}::\"OrderStatus\", "updatedAt" = NOW()
      WHERE id = ${orderId} AND "companyId" = ${companyId}
    `
  )

  return { success: true, orderId, status }
}

export async function createOrder(
  args: Record<string, unknown>,
  companyId: string
): Promise<unknown> {
  await requireApproval('createOrder', args, companyId)

  const { customerName, customerPhone, items } = args as {
    customerName: string
    customerPhone: string
    items: Array<{ productId: string; quantity: number; price: number }>
  }

  const orderId = randomUUID()
  const orderNumber = `ORD-${Date.now()}`
  const total = (items ?? []).reduce((s, i) => s + i.price * i.quantity, 0)

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO orders (id, "orderNumber", "customerName", "customerPhone",
                          total, subtotal, "companyId", "createdAt", "updatedAt")
      VALUES (${orderId}, ${orderNumber}, ${customerName}, ${customerPhone},
              ${total}, ${total}, ${companyId}, NOW(), NOW())
    `
  )

  return { success: true, orderId, orderNumber }
}

export async function createTask(
  args: Record<string, unknown>,
  companyId: string
): Promise<unknown> {
  const { title, description, agentId, priority } = args as {
    title: string
    description?: string
    agentId: string
    priority?: string
  }

  const task = await prisma.aiAgentTask.create({
    data: {
      companyId,
      agentId,
      title,
      description,
      priority: priority ?? 'medium',
      status: 'PENDING',
    },
  })

  return { success: true, taskId: task.id }
}
