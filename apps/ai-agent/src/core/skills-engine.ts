import { CompanyAgent } from '@prisma/client'
import prisma from '../db/client'

export interface ActiveSkill {
  name: string
  instructions: string
  tools: string[]
}

export async function loadAgentSkills(agent: CompanyAgent): Promise<ActiveSkill[]> {
  let skillNames: string[] = []
  if (agent.skills) {
    try { skillNames = JSON.parse(agent.skills) } catch { skillNames = [] }
  }

  if (skillNames.length === 0) return []

  const skills = await prisma.companySkill.findMany({
    where: { companyId: agent.companyId, enabled: true, name: { in: skillNames } },
    orderBy: { priority: 'desc' },
  })

  return skills.map(s => ({
    name: s.name,
    instructions: s.instructions,
    tools: (() => { try { return JSON.parse(s.tools) } catch { return [] } })(),
  }))
}

export function buildSkillsPromptSection(skills: ActiveSkill[]): string {
  if (skills.length === 0) return ''

  const lines = ['## المهارات والتعليمات الخاصة']
  for (const skill of skills) {
    lines.push(`\n### ${skill.name}`)
    lines.push(skill.instructions)
  }
  return lines.join('\n')
}
