# Audit: MaxP Agent Architecture vs OpenAI Agents SDK

## Date: 2026-06-02
## Scope: Backend agent system (`backend/services/aiAgent/`)
## Auditor: AI Audit Agent
## Methodology: Code review + SDK docs comparison + gap severity scoring

---

## Executive Summary

نظام MaxP Agent يمتلك بنية متقدمة وقريبة من patterns الـ SDK، لكنه ما زال يفتقر لعدة primitives أساسية تُبسّط التطوير وتُحسّن observability. التوجه الحالي نحو config-driven (عبر `BaseAgent.fromTemplate()`) صحيح، لكن التنفيذ ما زال class-centric بدلاً من config-centric. هذا التقرير يحدد الفجوات بدقة ويُرشّحها حسب الأثر والجهد.

---

## 1. Agent Definition

### OpenAI SDK Pattern

```python
from agents import Agent, Runner

agent = Agent(
    name="Assistant",
    instructions="You are a helpful assistant",
    tools=[get_weather, search_web],
    handoffs=[sales_agent, support_agent],
    output_type=MyPydanticModel,
)
```

- Agent هو **config object** يُمرّر إلى `Runner`.
- `instructions` يمكن أن تكون `str` أو `Callable[[RunContext], str]` (dynamic instructions).
- `tools` قائمة من دوال Python مباشرة.
- `handoffs` قائمة من Agents أخرى للتفويض.
- `output_type` Pydantic model للـ structured output.

### Our Implementation

```js
// BaseAgent.js — class-based with config factory
class BaseAgent {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.role = config.role;
    this.allowedTools = new Set(config.allowedTools || []);
    this.persona = config.persona || {};
    this.policies = config.policies || {};
    // ...
  }

  static fromTemplate(templateSlug, companyId, overrides = {}) {
    // config-driven factory
    return new BaseAgent(config);
  }
}
```

- Agent يُعرّف كـ **class** (`BaseAgent`) مع factory method.
- التوجه نحو الـ config بدأ (via `fromTemplate` و `agentProfileLoaderService`) لكن Agent instance نفسه ليس pure config.
- لا يوجد `output_type` declaration على مستوى Agent.
- `instructions` مبنية من أجزاء static (soul, persona, tools, agents) لا تتغير حسب context كل run.

### Gap Analysis

- ⚠️ **Partial match**: التوجه config-driven موجود لكن Agent يبقى class instance.
- ❌ **Missing**: Dynamic instructions — لا يمكن تمرير function تعيد instructions بناءً على runtime context.
- ❌ **Missing**: `output_type` declaration على مستوى Agent definition.
- ❌ **Missing**: Config-driven handoffs list — handoffs ليست جزءاً من Agent config.

---

## 2. Tools

### OpenAI SDK Pattern

```python
from agents import function_tool

@function_tool
def get_weather(city: str) -> str:
    """Get the weather for a city."""
    return f"The weather in {city} is sunny."
```

- Auto schema generation من function signature + type hints + docstring.
- Pydantic validation تلقائي للـ inputs.
- Native `tool_calls` support مدمج في الـ loop.
- MCP server tools تُعامل مثل function tools بالضبط.

### Our Implementation

```js
// agentToolRegistry.js — manual schema + manual parsing
const TOOLS = {
  'product.search': {
    description: 'Search products',
    params: { query: 'Search term', limit: 'Max results' },
    readOnly: true,
    handler: async (companyId, params) => { ... }
  }
};

function buildNativeParameters(params = {}, requiredParams = []) {
  // Manual JSON schema building based on param name heuristics
  const type = getJsonTypeForParam(name); // heuristic-based
  return { type: 'object', properties, required };
}

// Tool parsing from LLM response text
function parseToolCalls(text) {
  // Parses CALL_TOOL:{...} directives from free text
}
```

- Schema مبني يدوياً via heuristics (`getJsonTypeForParam`) وليس من function signatures.
- Tool parsing يعتمد على `CALL_TOOL:` directives في النص أو native tool_calls (لكن التعامل غير موحد).
- لا يوجد decorator/factory pattern لتسجيل tools.

### Gap Analysis

- ⚠️ **Partial match**: Tool registry شغال لكن manual.
- ❌ **Missing**: Auto schema generation من function signatures/type hints.
- ❌ **Missing**: Pydantic-powered input validation (عندنا validation basic فقط).
- ❌ **Missing**: MCP server integration — لا يوجد دعم لـ Model Context Protocol.
- ⚠️ **Partial match**: Native tool_calls مدعومة في providers لكن Agent layer لا يُدير الـ loop بشكل موحد.

---

## 3. Handoffs

### OpenAI SDK Pattern

```python
sales_agent = Agent(name="Sales", instructions="...")
support_agent = Agent(name="Support", instructions="...")

triage_agent = Agent(
    name="Triage",
    instructions="Route to the right agent",
    handoffs=[sales_agent, support_agent],
)
```

- LLM يقرر متى يتم handoff بناءً on conversation context.
- Handoff يحدث تلقائياً داخل `Runner` loop.
- Context (conversation history) يُنقل تلقائياً.
- Filter + custom handoff prompts مدعومة.

### Our Implementation

```js
// agentHandoffService.js — manual handoff logging
initiateHandoff(companyId, { fromAgentId, toAgentId, conversationId, context }) {
  const handoff = {
    id: `handoff_${crypto.randomUUID()}`,
    fromAgentId, toAgentId, context,
    status: 'COMPLETED',
  };
  // Logs to DB, but no LLM-driven decision
}

// CEOAgent.js — programmatic orchestration
async discussWithAgent({ specialistAgentId, topic, initialTask }) {
  const session = await agentConversationBroker.openSession({...});
  // CEO decides programmatically, not LLM-driven
}
```

- Handoff يحدث programmatically (CEOAgent يقرر) وليس LLM-driven.
- `agentHandoffService` هو log/audit tool أكثر منه runtime mechanism.
- لا يوجد `handoffs` list في Agent config.

### Gap Analysis

- ❌ **Missing entirely**: LLM-driven handoff decisions — لا يوجد mechanism يتيح للـ LLM اختيار agent آخر للتفويض.
- ❌ **Missing**: Handoffs list in Agent config.
- ⚠️ **Partial match**: Context transfer موجود لكن manual via `agentConversationBroker`.
- ⚠️ **Partial match**: `orchestrateMultiAgentWorkflow` في CEOAgent يعمل كـ Manager pattern لكنه programmatic وليس config-driven.

---

## 4. Guardrails

### OpenAI SDK Pattern

```python
from agents import GuardrailFunctionOutput, InputGuardrail, OutputGuardrail

@input_guardrail
async def check_sensitive(ctx, agent, input):
    if is_sensitive(input):
        return GuardrailFunctionOutput(
            output_info=SensitiveInfo(),
            tripwire_triggered=True,
        )
```

- **Input guardrails**: تعمل بشكل parallel قبل بدء agent run.
- **Output guardrails**: تعمل بعد انتهاء agent run.
- **Tripwire**: يمكن إيقاف التنفيذ فوراً (`tripwire_triggered`).
- **Fail fast**: Guardrails تُنفذ بشكل concurrent مع agent execution في بعض الحالات.

### Our Implementation

```js
// policyEnforcementEngine.js — deterministic business rules
validateAction(companyId, action) {
  const violations = [];
  if (policies.blockedActions.includes(action.type)) {
    violations.push({ rule: 'BLOCKED_ACTION', severity: 'CRITICAL' });
  }
  return { allowed: violations.length === 0, violations };
}

// intentValidationService.js — classification validation
validateClassification(result, context) {
  // Schema validation + business rules + confidence policy
}

// aiMessageProcessor.js — RAG guardrails
console.warn(`Query blocked by RAG guardrails: ${ragBlockedReason}`);
```

- Guardrails موجودة لكنها **scattered** عبر عدة services.
- لا يوجد unified guardrail interface أو parallel execution.
- لا يوجد `tripwire` abstraction.
- `policyEnforcementEngine` يعمل على tool execution level فقط، لا يغطي input/output validation بشكل شامل.

### Gap Analysis

- ⚠️ **Partial match**: Deterministic policy enforcement موجود لكن scattered.
- ❌ **Missing**: Unified input/output guardrail interface.
- ❌ **Missing**: Parallel guardrail execution.
- ❌ **Missing**: Tripwire mechanism (`tripwire_triggered`) لإيقاف التنفيذ فوراً.
- ❌ **Missing**: LLM-based guardrails (مثل `input_guardrail` functions).

---

## 5. Sessions & Conversation State

### OpenAI SDK Pattern

```python
from agents import Session

session = Session()  # Auto-managed conversation history
result = Runner.run_sync(agent, "Hello", session=session)
result = Runner.run_sync(agent, "Follow-up", session=session)
```

- **Automatic memory**: Session تحتفظ بـ conversation history تلقائياً.
- **Persistence**: SQLAlchemy, SQLite, Redis backends.
- **Resumable**: يمكن استئناف أي session في أي وقت.
- **Multi-turn**: Loop مدمج يدير turns والـ state.

### Our Implementation

```js
// agentConversationBroker.js — multi-turn discussion (CEO ↔ specialist)
class AgentConversationBroker {
  async openSession({ companyId, parentAgentId, specialistAgentId, topic }) {
    // Redis-backed session with turns array
  }
  async sendMessage(sessionId, { fromAgentId, content }) {
    // Push to turns[]
  }
  async awaitResponse(sessionId, { specialistAgentId }) {
    // Runs specialist agent with conversation history
  }
}
```

- `agentConversationBroker`: Session management موجود لكن **مخصص** للـ multi-agent discussions (CEO + specialist).
- لا يوجد **general session** للـ customer conversation history across runs.
- `stateManager.js`: يدير circuit breakers و rate limits وليس conversation state.
- Conversation history يُدار في `aiChatService` / `aiMessageProcessor` لكن لا يوجد unified `Session` abstraction.

### Gap Analysis

- ⚠️ **Partial match**: `agentConversationBroker` يدير sessions لكن فقط بين agents.
- ❌ **Missing**: Unified `Session` abstraction لـ customer conversations.
- ❌ **Missing**: Auto-managed conversation history across agent runs.
- ❌ **Missing**: Persistent session backends (SQLAlchemy/SQLite/Redis) ك abstraction.
- ❌ **Missing**: Session resumption بعد server restart.

---

## 6. Streaming Responses

### OpenAI SDK Pattern

```python
from agents import Runner

result = Runner.run_streamed(agent, "Hello")
async for event in result.stream_events():
    if event.type == "agent_updated":
        print(f"Agent: {event.data.agent.name}")
    elif event.type == "tool_called":
        print(f"Tool: {event.data.tool.name}")
```

- **Event-driven streaming**: أنواع events واضحة (agent_updated, tool_called, run_item, etc.).
- **Real-time**: UI يمكنها متابعة progress step-by-step.
- **Agent loop streaming**: يتدفق عبر كل turn.

### Our Implementation

```js
// providers/GoogleProvider.js — provider-level streaming
async generateContentStream(request) {
  const result = await generativeModel.generateContentStream(requestBody);
  return {
    stream: (async function* () {
      for await (const chunk of result.stream) {
        yield chunk.text();
      }
    })()
  };
}

// Other providers: stream parameter exists but agent layer ignores it
// BaseAgent.generateWithLLMResult(): always awaits full response
```

- Streaming موجود على مستوى **Provider** فقط (GoogleProvider).
- `BaseAgent` و `aiMessageProcessor` لا يستخدمان streaming — يستنيون الـ response الكامل.
- لا يوجد **event types** أو **stream_events()** abstraction.
- Frontend يستلم النتيجة النهائية فقط.

### Gap Analysis

- ⚠️ **Partial match**: Provider-level streaming موجود.
- ❌ **Missing**: Agent-level streaming events (`agent_updated`, `tool_called`, etc.).
- ❌ **Missing**: `Runner.run_streamed()` equivalent.
- ❌ **Missing**: Event-driven architecture للـ agent loop.
- ❌ **Missing**: Real-time progress reporting للـ frontend.

---

## 7. Tracing & Observability

### OpenAI SDK Pattern

```python
from agents import trace

with trace("My Workflow"):
    result = Runner.run_sync(agent, "Task")
    # Auto-traced: spans, tool calls, LLM calls, handoffs
```

- **Built-in tracing**: OpenAI Tracing UI مع visualization.
- **Auto-instrumentation**: لا حاجة لكود إضافي — `Runner` يسجل تلقائياً.
- **Spans**: LLM calls, tool execution, guardrails كلها spans.
- **Export**: OpenAI suite (eval, fine-tuning, distillation).

### Our Implementation

```js
// telemetryTracerService.js — Prisma-based manual tracing
class TelemetryTracerService {
  async startTrace({ companyId, channel, provider }) {
    return await this.prisma.telemetryTrace.create({...});
  }
  async startSpan({ traceId, name, type, input }) {
    return await this.prisma.telemetrySpan.create({...});
  }
  async endSpan(spanId, { output, status, error }) {
    return await this.prisma.telemetrySpan.update({...});
  }
}
```

- **Manual tracing**: يتطلب استدعاء `startTrace` / `startSpan` / `endSpan` يدوياً.
- **Database-backed**: Prisma (`telemetryTrace`, `telemetrySpan`) — جيد لكن بدون visualization.
- **Agent pipeline** (`processTask`) لا تُسجل spans تلقائياً — يجب على كل stage أن يُسجل بنفسه.
- **No distributed tracing**: لا يوجد trace context propagation بين services.

### Gap Analysis

- ⚠️ **Partial match**: Telemetry service موجود لكن manual.
- ❌ **Missing**: Auto-instrumentation — pipeline stages لا تُسجل تلقائياً.
- ❌ **Missing**: Trace visualization UI (OpenAI Tracing equivalent).
- ❌ **Missing**: Span context propagation across async boundaries.
- ❌ **Missing**: Built-in eval/fine-tuning integration.

---

## 8. Multi-Agent Orchestration

### OpenAI SDK Pattern

**Handoffs (LLM-driven delegation):**
```python
agent = Agent(name="Triage", handoffs=[sales_agent, support_agent])
```

**Manager pattern (programmatic):**
```python
# Orchestrator-workers pattern
tasks = await orchestrator.break_down(goal)
results = await asyncio.gather(*[worker.run(t) for t in tasks])
```

- SDK يدعم كلا النمطين: **Handoffs** (dynamic) و **Manager** (programmatic).
- Handoffs هي config-driven (list في Agent definition).

### Our Implementation

```js
// CEOAgent.js — Manager pattern (programmatic only)
async orchestrateMultiAgentWorkflow({ goal, agents, constraints }) {
  const inputs = [];
  for (const agentConfig of agents) {
    const discussion = await this.discussWithAgent({...});
    inputs.push(discussion.reply);
  }
  const synthesis = await planSynthesisEngine.synthesizePlan({ goal, inputs });
  return { plan: synthesis.plan, actionItems: synthesis.actionItems };
}
```

- **Manager pattern**: موجود عبر `CEOAgent.orchestrateMultiAgentWorkflow()`.
- **Handoffs pattern**: **غير موجود** — لا يوجد mechanism يتيح للـ LLM تفويض agent آخر.
- **Agent-as-tools**: **غير موجود** — لا يمكن استخدام agent كـ tool.

### Gap Analysis

- ✅ **Match**: Manager-style orchestration موجود (CEOAgent).
- ❌ **Missing entirely**: Handoffs (LLM-driven delegation).
- ❌ **Missing entirely**: Agent-as-tools pattern.
- ⚠️ **Partial match**: `discussWithAgent` يعمل كـ conversation لكنه programmatic.

---

## 9. MCP (Model Context Protocol) Support

### OpenAI SDK Pattern

```python
from agents import Agent, MCPServerStdio

server = MCPServerStdio(
    params={"command": "python", "args": ["mcp_server.py"]}
)
agent = Agent(name="Assistant", mcp_servers=[server])
```

- **Native MCP support**: MCP servers تُعامل مثل function tools بالضبط.
- **Auto-discovery**: Tools من MCP server تُسجل تلقائياً.
- **Any MCP server**: Filesystem, GitHub, databases, etc.

### Our Implementation

```bash
# grep results: NO MCP SUPPORT FOUND
```

- **لا يوجد أي ذكر** لـ MCP في الكود.
- Tool registry يدوي (`agentToolRegistry.js`) — لا يوجد external tool discovery.
- كل tool يجب تعريفه يدوياً في الكود.

### Gap Analysis

- ❌ **Missing entirely**: لا يوجد دعم لـ Model Context Protocol.
- ❌ **Missing**: Auto-discovery من external tool servers.
- ❌ **Missing**: Ability to wrap any MCP server as tool provider.

---

## 10. Human-in-the-Loop

### OpenAI SDK Pattern

```python
from agents import Agent, RunConfig
from agents.human_in_the_loop import HumanApproval

agent = Agent(name="Assistant", tools=[delete_database])
result = Runner.run_sync(
    agent, "Delete the DB",
    run_config=RunConfig(human_approval=HumanApproval.ALWAYS)
)
```

- **Built-in HITL**: `HumanApproval` modes (ALWAYS, NEVER, ON_WRITE).
- **Agent loop pause**: Loop يتوقف وينتظر موافقة human.
- **Resume**: يمكن استئناف التنفيذ بعد الرد.
- **UI integration**: Built-in support لطلب input من human أثناء التنفيذ.

### Our Implementation

```js
// humanApprovalService.js — draft proposals + approval codes
class HumanApprovalService {
  async notifyMerchant(companyId, draft, channels = ['DASHBOARD']) {
    // Creates AiNotification
  }
  async processApprovalResponse(companyId, draftId, approvalCode) {
    // Validates code, max 3 attempts
    return { approved: true/false };
  }
}

// draftProposalService.js — tool execution drafts
```

- **Draft proposals**: Write tools تُنشئ draft يتطلب approval.
- **Dashboard notifications**: Merchant يرى pending approvals في UI.
- **Approval codes**: Code validation لكنه basic.
- **لا يوجد pause/resume للـ agent loop**: Loop يستمر وينفذ draft proposal، لا يتوقف وينتظر human.
- **لا يوجد interactive human input** أثناء التنفيذ (مثل "What is your email?" مع pause).

### Gap Analysis

- ⚠️ **Partial match**: Draft proposals + approval workflow موجودة.
- ❌ **Missing**: Agent loop pause/resume mechanism.
- ❌ **Missing**: Interactive human input mid-run (input guardrail-style).
- ❌ **Missing**: Human approval modes (ALWAYS, NEVER, ON_WRITE) كـ config.
- ❌ **Missing**: Human review of agent outputs قبل التسليم للعميل.

---

## 11. Agent-as-Tools Pattern

### OpenAI SDK Pattern

```python
sales_agent = Agent(name="Sales", instructions="...")

orchestrator = Agent(
    name="Orchestrator",
    tools=[sales_agent.as_tool()],  # Agent becomes a tool!
)
```

- **Agent-as-tool**: أي agent يمكن تحويله إلى tool يُستدعى من agent آخر.
- **Encapsulation**: الـ agent يحتفظ بـ internal state و logic.
- **Composability**: يُبسّط بناء أنظمة معقدة.

### Our Implementation

- **غير موجود**. Agents يمكنها "التكليف" لكنها لا تُستخدم كـ tools.
- `agentManagerService.registerToolHandlers()` تُسجل tools للـ orchestrator لكن هذه tools تُنفذ methods programmatically وليست agents.

### Gap Analysis

- ❌ **Missing entirely**: لا يوجد `agent.as_tool()` mechanism.
- ❌ **Missing**: Agent encapsulation كـ callable unit.

---

## 12. Dynamic Instructions

### OpenAI SDK Pattern

```python
def dynamic_instructions(ctx, agent):
    return f"You are helping {ctx.context.user_name}. Be {agent.persona.tone}."

agent = Agent(
    name="Assistant",
    instructions=dynamic_instructions,  # Function!
)
```

- **Instructions as functions**: يمكن تمرير function تعود بـ string بناءً على `RunContext`.
- **Per-run personalization**: كل run يمكن أن تحصل على instructions مختلفة.
- **Runtime context access**: user data, conversation state, etc.

### Our Implementation

```js
// BaseAgent._getSystemPrompt() — static build
_getSystemPrompt() {
  const sections = [
    this._instructions.soul ? `[الروح]\n${this._instructions.soul}` : '',
    this._instructions.persona ? `[الشخصية]\n${this._instructions.persona}` : '',
    `[الأدوات المتاحة]\n${toolsList.map(t => `- ${t}`).join('\n')}`,
  ];
  return sections.filter(Boolean).join('\n\n');
}
```

- **Static instructions**: System prompt يُبنى من static config sections (soul, persona, tools, agents).
- **No function support**: لا يمكن تمرير function تُبني instructions بناءً على runtime context.
- **Cache**: `_systemPromptCache` يفترض static content (TTL 5 min).

### Gap Analysis

- ❌ **Missing entirely**: Dynamic instructions (functions as instructions).
- ❌ **Missing**: Per-run instruction customization بناءً على context.
- ⚠️ **Partial match**: `_customerVoiceProfile` يمكن أن يُضيف dynamic content لكنه limited.

---

## 13. Output Types / Structured Output

### OpenAI SDK Pattern

```python
from pydantic import BaseModel
from agents import Agent

class WeatherReport(BaseModel):
    city: str
    temperature: float
    summary: str

agent = Agent(
    name="WeatherBot",
    instructions="...",
    output_type=WeatherReport,
)
```

- **Pydantic models**: Output validation و type safety.
- **Auto schema**: يُولد JSON schema تلقائياً من Pydantic model.
- **Retry**: إذا فشل الـ LLM في إنتاج output صالح، يُعاد المحاولة مع feedback.
- **Any agent output**: ليس فقط intent classification.

### Our Implementation

```js
// structuredOutputProviderAdapter.js — intent classification only
class OpenAIStructuredOutputAdapter extends BaseStructuredOutputAdapter {
  async classify(params) {
    const schema = getProviderSchema('openai');
    // Uses response_format / responseSchema for intent classification
  }
}

// intentClassificationSchema.js
const INTENT_CLASSIFICATION_SCHEMA = {
  type: 'object',
  properties: { intent: { type: 'string' }, slots: { type: 'object' }, confidence: { type: 'number' } },
  required: ['intent', 'confidence'],
};
```

- **Structured output موجود**: Intent classification تستخدم JSON schema.
- **Limited scope**: Structured output يقتصر على intent classification.
- **No general output types**: Agent لا يعلن `output_type` — يُرجع free text دائماً.
- **No validation retry**: إذا فشل JSON parse، نعود إلى fallback result بدون retry.

### Gap Analysis

- ⚠️ **Partial match**: Structured output موجود لكنه limited لـ intent classification.
- ❌ **Missing**: General `output_type` declaration على مستوى Agent.
- ❌ **Missing**: Pydantic/Zod-like validation مع auto retry.
- ❌ **Missing**: Schema generation من class/type definitions.

---

## Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Streaming Events (Agent-level) | High | Medium | P0 |
| Human-in-the-Loop Loop Pause/Resume | High | High | P0 |
| MCP Support | High | Medium | P0 |
| Dynamic Instructions | High | Low | P1 |
| LLM-Driven Handoffs | High | Medium | P1 |
| General Structured Output (`output_type`) | High | Low | P1 |
| Unified Guardrails Interface | Medium | Medium | P1 |
| Auto-Tracing (Pipeline instrumentation) | Medium | Low | P1 |
| Agent-as-Tools | Medium | Medium | P2 |
| Session Abstraction (General) | Medium | Medium | P2 |
| Config-Driven Agent Definition (pure config) | Low | High | P2 |
| Auto Schema Generation from Functions | Low | High | P3 |

---

## Recommendations

### 1. Build an Event-Driven Agent Loop (P0)

أعيد تصميم `BaseAgent.processTask()` لتُصدّر events (START, THINK, TOOL_CALL, TOOL_RESULT, GUARDRAIL_HIT, COMPLETE) بدلاً من الانتظار للـ response الكامل. هذا يُمكّن Frontend من عرض progress في real-time ويُقرّبنا من OpenAI SDK `stream_events()`.

**Code sketch:**
```js
async function* runAgentStreamed(agent, task) {
  yield { type: 'agent_start', agentId: agent.id };
  const intent = yield* resolveIntentStream(agent, task);
  yield { type: 'tool_calls', calls: intent.toolCalls };
  // ...
}
```

### 2. Implement Human-in-the-Loop Pause/Resume (P0)

حوّل `humanApprovalService` من "draft proposal" إلى "execution checkpoint". عندما يحتاج tool إلى approval، يجب أن يتوقف الـ agent loop وينتظر `resumeRun(runId, humanResponse)`.

**Implementation:**
- أضف `RunState` abstraction (PENDING_APPROVAL, RUNNING, COMPLETED).
- غيّر `toolExecutionEngine` ليتحقق من approval قبل التنفيذ، وإذا لم يكن موجوداً يرمي `PauseRequired`.
- أنشئ `resumeRun(runId, decision)` endpoint.

### 3. Add MCP Server Integration (P0)

أضف `mcpServerRegistry` يُسجّل MCP servers ويُحوّل tools منها إلى `TOOLS` entries تلقائياً. هذا يُمكّن MaxP من استخدام أي MCP-compatible tool بدون كتابة كود integration.

**Implementation:**
- استخدم `@modelcontextprotocol/sdk` (JavaScript MCP SDK).
- أنشئ `McpToolAdapter` يُحوّل `McpTool` إلى `agentToolRegistry` entry.
- أضف `mcpServers` array إلى Agent config.

### 4. Add Dynamic Instructions (P1)

اسمح بأن تكون `instructions` function بدلاً من string فقط.

**Implementation:**
```js
// BaseAgent
_getSystemPrompt(context = {}) {
  if (typeof this._instructions.soul === 'function') {
    return this._instructions.soul({ agent: this, context });
  }
  // existing static build
}
```

### 5. Implement LLM-Driven Handoffs (P1)

أضف `handoffs` array إلى Agent config. عندما يُرجع LLM `handoff_to` tool call، يُنفّذ `Runner` handoff إلى الـ agent المستهدف مع نقل context تلقائياً.

**Implementation:**
- أضف `handoffs: Agent[]` إلى `BaseAgent` config.
- أنشئ `HandoffTool` يُعرّف agents المتاحة للـ LLM.
- في `processTask`، إذا كان الـ response `handoff_to`، استدعِ `targetAgent.processTask(context)`.

### 6. Generalize Structured Output (P1)

استخرج `structuredOutputProviderAdapter` من intent classification فقط إلى general agent output type.

**Implementation:**
```js
class BaseAgent {
  constructor(config) {
    this.outputSchema = config.outputSchema || null; // JSON Schema or Zod
  }
  
  async processTask(task) {
    const result = await this.generateWithLLM(prompt, {
      responseFormat: this.outputSchema, // pass to provider
    });
    // validate + retry on failure
  }
}
```

### 7. Unified Guardrails Interface (P1)

أنشئ `Guardrail` class مع `InputGuardrail` و `OutputGuardrail`، ونفّذهم بشكل parallel قبل وبعد agent run.

**Implementation:**
```js
class InputGuardrail {
  async check(context, agent, input) {
    return { tripwireTriggered: false, outputInfo: {} };
  }
}

// In processTask:
const guardrailResults = await Promise.all(
  this.inputGuardrails.map(g => g.check(context, this, task))
);
if (guardrailResults.some(r => r.tripwireTriggered)) {
  return { status: 'GUARDRAIL_BLOCKED' };
}
```

### 8. Auto-Instrument Tracing (P1)

أضف tracing hooks داخل `pipeline.execute()` بحيث كل stage يُسجل `startSpan` / `endSpan` تلقائياً.

**Implementation:**
```js
// pipeline/index.js
async function execute(context, stages, { traceId } = {}) {
  for (const stage of stages) {
    const span = traceId ? await telemetryTracerService.startSpan({ traceId, name: stage.name }) : null;
    ctx = await stage(ctx);
    if (span) await telemetryTracerService.endSpan(span.id, { status: 'SUCCESS' });
  }
}
```

---

## Summary

| Category | Status | Notes |
|----------|--------|-------|
| Agent Definition | ⚠️ Close | Config-driven factory موجود لكن class-centric |
| Tools | ⚠️ Functional | Manual schema, no MCP, no auto-generation |
| Handoffs | ❌ Weak | Programmatic only, no LLM-driven delegation |
| Guardrails | ⚠️ Scattered | Deterministic rules موجودة لكن لا unified interface |
| Sessions | ❌ Weak | Broker موجود لكن لا general session abstraction |
| Streaming | ❌ Missing | Provider-level فقط, لا agent events |
| Tracing | ⚠️ Basic | Manual Prisma-backed, no auto-instrumentation |
| Multi-Agent | ⚠️ Partial | Manager pattern فقط, لا handoffs |
| MCP | ❌ Missing | لا يوجد دعم |
| Human-in-the-Loop | ⚠️ Partial | Draft approvals فقط, لا loop pause/resume |
| Agent-as-Tools | ❌ Missing | لا يوجد |
| Dynamic Instructions | ❌ Missing | Static instructions فقط |
| Structured Output | ⚠️ Partial | Intent classification فقط |

**Top 5 Gaps (الأهم):**
1. **Agent-level Streaming Events** — Frontend يحتاج real-time visibility.
2. **Human-in-the-Loop Pause/Resume** — Critical للـ safety والـ merchant trust.
3. **MCP Support** — يُضاعف قدرات Tools بدون كتابة integration code.
4. **LLM-Driven Handoffs** — يُحسّن routing ويُقلّل من hardcoded logic.
5. **Dynamic Instructions** — يُمكّن personalization بناءً على runtime context.

---

*End of Audit Report*
