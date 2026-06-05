import { GoogleGenerativeAI, FunctionDeclaration, Tool } from '@google/generative-ai'

export interface ToolDefinition {
  name: string
  description: string
  parameters: object
}

export interface GeminiCallOptions {
  systemPrompt: string
  message: string
  tools?: ToolDefinition[]
  history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>
}

export interface ToolCall {
  name: string
  args: Record<string, unknown>
}

export interface GeminiResponse {
  content: string
  toolCalls: ToolCall[]
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export async function callGemini(
  apiKey: string,
  modelName: string,
  options: GeminiCallOptions
): Promise<GeminiResponse> {
  const genAI = new GoogleGenerativeAI(apiKey)

  const functionDeclarations: FunctionDeclaration[] = (options.tools ?? []).map(t => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters as any,
  }))

  const tools: Tool[] | undefined =
    functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: options.systemPrompt,
    tools,
  })

  const chat = model.startChat({ history: options.history ?? [] })
  const result = await chat.sendMessage(options.message)
  const response = result.response

  const toolCalls: ToolCall[] = []
  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content.parts) {
      if (part.functionCall) {
        toolCalls.push({
          name: part.functionCall.name,
          args: (part.functionCall.args ?? {}) as Record<string, unknown>,
        })
      }
    }
  }

  const usage = response.usageMetadata ?? {}
  return {
    content: response.text(),
    toolCalls,
    usage: {
      promptTokens: usage.promptTokenCount ?? 0,
      completionTokens: usage.candidatesTokenCount ?? 0,
      totalTokens: usage.totalTokenCount ?? 0,
    },
  }
}
