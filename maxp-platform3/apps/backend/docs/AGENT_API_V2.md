# Agent API V2 Documentation

## Streaming Events

### Endpoint
`POST /api/v1/ai/sandbox/stream`

### Description
يُرسل رسالة إلى الوكيل ويستقبل events في real-time عبر Server-Sent Events (SSE).

### Request Body
```json
{
  "message": "عندك إيه منتجات؟",
  "agentId": "agent_123",
  "sessionId": "sess_456",
  "model": "gemini-2.5-flash",
  "provider": "GOOGLE"
}
```

### Event Types

| Event Type | Description | Payload |
|------------|-------------|---------|
| `agent_start` | بدء تشغيل الوكيل | `{ agentId, agentName, task }` |
| `agent_thinking` | الوكيل بيفكر | `{ stage, message }` |
| `tool_calling` | الوكيل هيستخدم tools | `{ tools: [...] }` |
| `tool_executing` | Tool بيشتغل دلوقتي | `{ tool, params }` |
| `tool_result` | Tool خلص | `{ tool, result }` |
| `agent_reply` | الوكيل جاوب | `{ reply, modelUsed }` |
| `run_complete` | Run خلص | `{ runId, reply, toolCalls, tokens, latencyMs }` |
| `run_error` | حصل error | `{ error, stack }` |

### Example (JavaScript)
```javascript
const response = await fetch('/api/v1/ai/sandbox/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Hello', agentId: 'abc' })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = decoder.decode(value);
  const events = text.split('\n\n')
    .filter(line => line.startsWith('data: '))
    .map(line => JSON.parse(line.slice(6)));

  for (const event of events) {
    console.log(event.type, event);
  }
}
```

## Run Management

### List Runs
`GET /api/v1/ai/runs?agentId=&state=`

### Get Run
`GET /api/v1/ai/runs/:runId`

### Resume Run
`POST /api/v1/ai/runs/:runId/resume`

#### Request Body
```json
{
  "decision": {
    "approved": true,
    "notes": "Approved by merchant"
  }
}
```

#### States
- `PENDING` — Run اتعمل بس مشتغلش
- `RUNNING` — بيشتغل دلوقتي
- `PAUSED_APPROVAL` — مستني موافقة human
- `PAUSED_INPUT` — مستني input من human
- `COMPLETED` — خلص
- `ERROR` — فيه error
- `CANCELLED` — اتلغي

## LLM-Driven Handoffs

### Description
الوكيل يقدر يفوّض المهمة لوكيل تاني لو شاف إن الـ customer محتاج specialization مختلف.

### Configuration
في `agent.json`:
```json
{
  "handoffs": [
    {
      "role": "SUPPORT",
      "description": "Transfer for complaints, refunds, or complex issues"
    }
  ]
}
```

### How It Works
1. LLM يشوف إن الـ request خارج scope بتاعه
2. LLM بيستخدم `agent.handoff_to` tool
3. System بتنقل المحادثة للـ target agent
4. Context بيتنقل تلقائياً

### Tool Schema
```json
{
  "name": "agent.handoff_to",
  "params": {
    "targetRole": "SALES | SUPPORT | SHIPPING | ...",
    "reason": "Brief reason",
    "context": "Key info to pass (JSON)"
  }
}
```

## MCP (Model Context Protocol)

### Description
MaxP بيدعم MCP servers. أي tool من MCP server ممكن يتضاف للوكيل من غير ما نكتب كود.

### Configuration
في `agent.json`:
```json
{
  "mcpServers": [
    {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    }
  ]
}
```

### How It Works
1. Agent provisioning بيسجل MCP servers
2. Tools من MCP server بتضاف تلقائياً للوكيل (prefix: `mcp_{serverName}_{toolName}`)
3. LLM يقدر يستخدمها زي أي tool تانية

### Supported MCP Servers
- Filesystem
- GitHub
- Databases (PostgreSQL, SQLite)
- Slack
- Any custom MCP server

## Guardrails

### Input Guardrails (بتشتغل قبل ما الوكيل يبدأ)
- `sensitive_data` — بتمنع input فيه credit cards, passwords
- `prompt_injection` — بتكشف محاولات injection

### Output Guardrails (بتشتغل قبل ما الرد يروح للـ customer)
- `tool_name_exposure` — بتمنع تسريب أسماء internal tools
- `arabic_language` — بتتأكد إن الرد بالعربي للوكلاء العرب

### Configuration
في `agent.json`:
```json
{
  "guardrails": {
    "input": ["sensitive_data", "prompt_injection"],
    "output": ["tool_name_exposure", "arabic_language"]
  }
}
```

## Dynamic Instructions

### Description
الـ instructions ممكن تكون function بدل static string.

### Example
```javascript
agent.setDynamicInstruction('persona', ({ agent, context }) => {
  return `You are ${agent.name}. Customer: ${context.customerName}.`;
});
```

### Use Cases
- Personalization حسب اسم الـ customer
- تغيير tone حسب time of day
- إضافة context من external APIs

## Structured Output

### Description
الوكيل يرجع JSON validated بدل free text.

### Configuration
في `agent.json`:
```json
{
  "outputSchema": {
    "type": "object",
    "properties": {
      "products": { "type": "array" },
      "summary": { "type": "string" }
    }
  }
}
```

### Fallback
لو الـ LLM مردش JSON صحيح، الوكيل بيعمل retry مرة واحدة، وبعدين يرجع degraded result.
