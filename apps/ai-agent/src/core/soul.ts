import { CompanyAgent } from '../../../backend/generated/postgresql_v2'

export interface MemoryContext {
  facts: string[]
}

export function buildSystemPrompt(agent: CompanyAgent, memory: MemoryContext): string {
  const parts: string[] = []

  parts.push(`أنت ${agent.name}.`)
  parts.push(`دورك: ${agent.role}`)

  if (agent.description) {
    parts.push(`\nوصفك: ${agent.description}`)
  }

  if (agent.soul) {
    parts.push(`\n## شخصيتك وأسلوبك\n${agent.soul}`)
  }

  if (agent.rules) {
    parts.push(`\n## القواعد والقيود\n${agent.rules}`)
  }

  if (memory.facts.length > 0) {
    parts.push(`\n## معلومات مهمة تعرفها`)
    memory.facts.forEach(f => parts.push(`- ${f}`))
  }

  parts.push(`\nالتاريخ الحالي: ${new Date().toLocaleDateString('ar-EG')}`)

  return parts.join('\n')
}
