import { CompanyAgent } from '@prisma/client'
import { callWithFailover } from '../providers/provider-manager'

const ROUTE_TOOL = {
  name: 'route',
  description: 'اختر الوكيل المناسب لمعالجة الرسالة',
  parameters: {
    type: 'object',
    required: ['targetAgentId'],
    properties: {
      targetAgentId: {
        type: 'string',
        description: 'معرّف الوكيل المستهدف، أو "self" إذا ستعالج الرسالة بنفسك',
      },
      reason: { type: 'string', description: 'سبب الاختيار' },
    },
  },
}

export interface RouteDecision {
  targetAgentId: string
  reason?: string
}

export async function route(
  message: string,
  currentAgent: CompanyAgent,
  subAgents: CompanyAgent[]
): Promise<RouteDecision> {
  if (subAgents.length === 0) return { targetAgentId: 'self' }

  const agentList = subAgents
    .map(a => `- ${a.id} (${a.name}): ${a.description ?? a.role}`)
    .join('\n')

  const systemPrompt = `أنت router للوكيل "${currentAgent.name}".
مهمتك: تحديد أي وكيل فرعي يجب أن يعالج الرسالة.

الوكلاء الفرعيون المتاحون:
${agentList}

- اختر "self" إذا كان يجب أن تعالج الرسالة الوكيل الحالي مباشرة.
- استخدم أداة route دائماً للرد.`

  const response = await callWithFailover(
    { systemPrompt, message, tools: [ROUTE_TOOL] },
    currentAgent.companyId
  )

  const toolCall = response.toolCalls.find(t => t.name === 'route')
  if (toolCall) {
    return {
      targetAgentId: (toolCall.args.targetAgentId as string) ?? 'self',
      reason: toolCall.args.reason as string | undefined,
    }
  }

  return { targetAgentId: 'self' }
}
