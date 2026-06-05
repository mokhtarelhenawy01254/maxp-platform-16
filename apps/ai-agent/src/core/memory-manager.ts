import prisma from '../db/client'

export interface MemoryContext {
  facts: string[]
}

export async function loadMemory(companyId: string): Promise<MemoryContext> {
  const facts = await prisma.agenticMemoryFact.findMany({
    where: {
      companyId,
      type: { in: ['FACT', 'PREFERENCE'] },
      OR: [{ validTo: null }, { validTo: { gt: new Date() } }],
    },
    orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
    take: 20,
    select: { content: true },
  })

  return { facts: facts.map(f => f.content) }
}

export async function saveMemoryFacts(
  companyId: string,
  facts: string[]
): Promise<void> {
  if (!facts || facts.length === 0) return

  await prisma.agenticMemoryFact.createMany({
    data: facts.map(content => ({
      companyId,
      content,
      type: 'FACT',
      confidence: 0.9,
      importance: 3,
    })),
    skipDuplicates: true,
  })
}
