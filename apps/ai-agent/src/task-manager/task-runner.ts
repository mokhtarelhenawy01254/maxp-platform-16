import prisma from '../db/client'
import { runAgent } from '../core/agent-runner'

export async function processTask(taskId: string): Promise<void> {
  const task = await prisma.aiAgentTask.findUniqueOrThrow({ where: { id: taskId } })

  if (task.status !== 'PENDING') return

  await prisma.aiAgentTask.update({
    where: { id: taskId },
    data: { status: 'IN_PROGRESS', checkedOutAt: new Date() },
  })

  const runId = await prisma.aiAgentRun.create({
    data: {
      taskId,
      companyId: task.companyId,
      agentId: task.agentId,
      stepName: 'main',
      stepIndex: 0,
      status: 'IN_PROGRESS',
    },
  })

  const start = Date.now()

  try {
    const result = await runAgent(task.agentId, task.title + (task.description ? `\n${task.description}` : ''))

    await prisma.aiAgentRun.update({
      where: { id: runId.id },
      data: {
        status: 'SUCCESS',
        output: { content: result.content, traceId: result.traceId },
        latencyMs: Date.now() - start,
      },
    })

    await prisma.aiAgentTask.update({
      where: { id: taskId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)

    await prisma.aiAgentRun.update({
      where: { id: runId.id },
      data: {
        status: 'FAILED',
        error: errorMsg,
        latencyMs: Date.now() - start,
      },
    })

    await prisma.aiAgentTask.update({
      where: { id: taskId },
      data: { status: 'FAILED' },
    })

    throw err
  }
}

export async function getPendingTasks(companyId: string): Promise<unknown> {
  return prisma.aiAgentTask.findMany({
    where: { companyId, status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  })
}
