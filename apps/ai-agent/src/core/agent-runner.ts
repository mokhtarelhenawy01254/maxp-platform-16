import prisma from '../db/client'
import { callWithFailover } from '../providers/provider-manager'
import { executeTool } from '../tools/executor'
import { buildSystemPrompt } from './soul'
import { loadMemory, saveMemoryFacts } from './memory-manager'
import { route } from './router'
import { loadAgentSkills, buildSkillsPromptSection } from './skills-engine'
import { startTrace, endTrace } from '../telemetry/tracer'
import { ApprovalRequiredError } from '../tools/implementations/write'

const MAX_TOOL_TURNS = 10
const MAX_ROUTING_DEPTH = Number(process.env.MAX_ROUTING_DEPTH ?? 3)

export interface RunResult {
  content: string
  traceId?: string
  approvalRequired?: { approvalId: string; toolName: string }
}

export async function runAgent(
  agentId: string,
  message: string,
  depth = 0
): Promise<RunResult> {
  if (depth > MAX_ROUTING_DEPTH) {
    throw new Error('Max routing depth exceeded')
  }

  // Load agent
  const agent = await prisma.companyAgent.findUniqueOrThrow({ where: { id: agentId } })

  // Route to sub-agent if applicable
  const subAgents = await prisma.companyAgent.findMany({
    where: { parentId: agentId, status: 'ACTIVE' },
  })

  if (subAgents.length > 0) {
    const decision = await route(message, agent, subAgents)
    if (decision.targetAgentId !== 'self') {
      return runAgent(decision.targetAgentId, message, depth + 1)
    }
  }

  // Execution
  const [memory, skills] = await Promise.all([
    loadMemory(agent.companyId),
    loadAgentSkills(agent),
  ])

  const skillsSection = buildSkillsPromptSection(skills)
  let systemPrompt = buildSystemPrompt(agent, memory)
  if (skillsSection) systemPrompt += '\n\n' + skillsSection

  // Load tool definitions assigned to this agent's skills
  const toolNames = skills.flatMap(s => s.tools)
  const toolDefs =
    toolNames.length > 0
      ? await prisma.agentToolDefinition.findMany({
          where: { name: { in: toolNames }, isActive: true },
        })
      : await prisma.agentToolDefinition.findMany({
          where: { companyId: agent.companyId, isActive: true },
        })

  const tools = toolDefs.map(t => ({
    name: t.name,
    description: t.description,
    parameters: JSON.parse(t.parameters),
  }))

  const trace = await startTrace(agent.companyId)

  try {
    let currentMessage = message
    const history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []
    let finalContent = ''
    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }

    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const response = await callWithFailover(
        { systemPrompt, message: currentMessage, tools, history },
        agent.companyId
      )

      totalUsage.promptTokens += response.usage.promptTokens
      totalUsage.completionTokens += response.usage.completionTokens
      totalUsage.totalTokens += response.usage.totalTokens

      if (response.toolCalls.length === 0) {
        finalContent = response.content
        break
      }

      // Execute tool calls
      const toolResults: string[] = []
      for (const tc of response.toolCalls) {
        try {
          const result = await executeTool(tc.name, tc.args, agent.companyId)
          toolResults.push(`Tool ${tc.name} result: ${JSON.stringify(result)}`)
        } catch (err) {
          if (err instanceof ApprovalRequiredError) {
            await endTrace(trace.id, totalUsage, 'APPROVAL_REQUIRED')
            return {
              content: `تم إرسال طلب الموافقة على تنفيذ "${tc.name}". سيتم تنفيذ الأمر بعد الموافقة.`,
              traceId: trace.id,
              approvalRequired: { approvalId: err.approvalId, toolName: tc.name },
            }
          }
          toolResults.push(`Tool ${tc.name} error: ${err instanceof Error ? err.message : String(err)}`)
        }
      }

      // Update history and continue
      history.push({ role: 'user', parts: [{ text: currentMessage }] })
      history.push({ role: 'model', parts: [{ text: response.content }] })
      currentMessage = toolResults.join('\n')
    }

    // Extract facts from response for memory
    const newFacts = extractFacts(finalContent)
    if (newFacts.length > 0) {
      await saveMemoryFacts(agent.companyId, newFacts)
    }

    await endTrace(trace.id, totalUsage, 'SUCCESS')
    return { content: finalContent, traceId: trace.id }
  } catch (err) {
    await endTrace(trace.id, { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, 'ERROR')
    throw err
  }
}

function extractFacts(content: string): string[] {
  // Simple heuristic: lines that look like facts (start with "تعلمت" or contain key patterns)
  return content
    .split('\n')
    .filter(line => line.startsWith('حقيقة:') || line.startsWith('ملاحظة:'))
    .map(line => line.replace(/^(حقيقة:|ملاحظة:)\s*/, '').trim())
    .filter(Boolean)
}
