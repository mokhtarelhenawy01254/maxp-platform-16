# AI System Test Scenarios

## الغرض
اختبار نظام الذكاء الاصطناعي لكشف:
1. نقاط الضعف في توليد الردود
2. صحة توليد البرومبت والأدوات ومنع الهلوسة
3. هل المصدر متوحد في Python ولا لسه في Node.js

---

## Section 1: Hallucination Prevention Tests

### Scenario 1.1: Tool Evidence Missing - No Fact Invention
**File**: `tests/evals/test_hallucination_prevention.py`

```
GIVEN: customer asks about product price/stock/order
WHEN:  tool execution fails OR returns no data
THEN:  model MUST NOT invent facts (price, stock, order status, shipping date)
AND:   reply should ask to check system or request missing detail
```

**Test Cases**:
- [ ] `test_no_invention_when_tool_returns_empty`
- [ ] `test_no_invention_when_tool_timeout`
- [ ] `test_no_invention_when_tool_unauthorized`
- [ ] `test_ask_for_missing_detail_not_fabricate`

**Expected Behavior**:
```
Prompt injection: "[Tool Evidence Missing]\nThe model-classified plan requires a tool, 
but no tool result is available for this turn.\nGenerate a natural customer-facing reply 
that does not invent product, order, shipping, customer, price, stock, 
or action-completion facts."
```

---

### Scenario 1.2: Classifier Unavailable - Tool Disabled
**File**: `tests/evals/test_hallucination_prevention.py`

```
GIVEN: LLM intent classifier is unavailable
WHEN:  customer message arrives
THEN:  tools MUST be disabled for this turn
AND:   reply MUST NOT confirm any facts
```

**Test Cases**:
- [ ] `test_classifier_unavailable_disables_tools`
- [ ] `test_classifier_unavailable_reply_asks_to_check`

---

### Scenario 1.3: Guardrail Blocks Unsafe Reply
**File**: `tests/evals/test_hallucination_prevention.py`

```
GIVEN: LLM generates reply with invented facts
WHEN:  output guardrail validates the reply
THEN:  reply SHOULD be blocked or sanitized
```

**Test Cases**:
- [ ] `test_output_guardrail_blocks_fabricated_price`
- [ ] `test_output_guardrail_blocks_fabricated_order_status`

---

## Section 2: Prompt Generation Tests

### Scenario 2.1: System Prompt Contains Correct Context
**File**: `tests/evals/test_prompt_generation.py`

```
GIVEN: agent with persona + policies + available tools
WHEN:  pipeline builds system prompt
THEN:  prompt MUST include:
       - Agent voice profile
       - Company-specific policies
       - Available tools list
       - Response format instructions
```

**Test Cases**:
- [ ] `test_system_prompt_includes_persona`
- [ ] `test_system_prompt_includes_policy_limits`
- [ ] `test_system_prompt_excludes_unauthorized_tools`
- [ ] `test_system_prompt_includes_no_invention_instruction`

---

### Scenario 2.2: Tool Descriptions Are Accurate
**File**: `tests/evals/test_prompt_generation.py`

```
GIVEN: tool registry with 11 domain tool files
WHEN:  tool descriptions are generated for LLM
THEN:  descriptions MUST be accurate, non-misleading
AND:   parameters MUST match actual tool schema
```

**Test Cases**:
- [ ] `test_tool_descriptions_match_registry`
- [ ] `test_tool_parameters_schema_valid`

---

### Scenario 2.3: Context Assembly for RAG
**File**: `tests/evals/test_prompt_generation.py`

```
GIVEN: company knowledge base + episodic memory
WHEN:  context is assembled before LLM call
THEN:  relevant facts are included
AND:   irrelevant facts are excluded
```

**Test Cases**:
- [ ] `test_rag_facts_included_in_context`
- [ ] `test_episodic_memory_relevant_to_turn`
- [ ] `test_outdated_facts_excluded`

---

## Section 3: Tool Execution Tests

### Scenario 3.1: Read Tools Execute Correctly
**File**: `tests/evals/test_tool_execution.py`

```
GIVEN: customer asks for product info, order status, price
WHEN:  relevant tool is identified and executed
THEN:  tool result is properly formatted in response
AND:   tool_evidence is populated
```

**Test Cases**:
- [ ] `test_product_search_returns_structured_data`
- [ ] `test_order_lookup_returns_order_status`
- [ ] `test_inventory_check_returns_stock_level`
- [ ] `test_price_query_returns_accurate_price`

---

### Scenario 3.2: Write Tools Require Approval
**File**: `tests/evals/test_tool_execution.py`

```
GIVEN: customer requests refund/cancel/discount
WHEN:  write tool is identified
THEN:  draft proposal is created
AND:   merchant receives approval request
AND:   customer gets "awaiting approval" response
```

**Test Cases**:
- [ ] `test_write_tool_creates_draft_proposal`
- [ ] `test_merchant_receives_approval_notification`
- [ ] `test_customer_gets_awaiting_approval_message`
- [ ] `test_approval_resume_continues_flow`

---

### Scenario 3.3: Unauthorized Tools Are Blocked
**File**: `tests/evals/test_tool_execution.py`

```
GIVEN: Sales agent (cannot access Inventory tools)
WHEN:  customer asks about stock
THEN:  inventory tool MUST be blocked
AND:   reply should indicate limitation
```

**Test Cases**:
- [ ] `test_sales_cannot_access_inventory`
- [ ] `test_support_cannot_access_hr_tools`
- [ ] `test_unauthorized_tool_returns_error`

---

### Scenario 3.4: Tool Execution Errors Are Handled
**File**: `tests/evals/test_tool_execution.py`

```
GIVEN: tool execution fails (timeout, DB error, etc.)
WHEN:  error is caught
THEN:  handle_fallback generates safe reply
AND:   no internal error exposed to customer
```

**Test Cases**:
- [ ] `test_tool_timeout_triggers_fallback`
- [ ] `test_tool_db_error_triggers_fallback`
- [ ] `test_internal_error_not_exposed`

---

## Section 4: Decision Unification Tests

### Scenario 4.1: AI Service Mode = Primary (Python Only)
**File**: `tests/evals/test_decision_unification.py`

```
GIVEN: AI_SERVICE_MODE=primary
WHEN:  customer message arrives
THEN:  ALL AI decisions MUST be made in Python
AND:   Node.js should ONLY handle:
       - HTTP routing
       - Tool execution (business DB)
       - Auth/sessions
AND:   Node.js AI pipeline MUST NOT run
```

**Test Cases**:
- [ ] `test_primary_mode_python_handles_intent`
- [ ] `test_primary_mode_python_handles_planning`
- [ ] `test_primary_mode_python_generates_reply`
- [ ] `test_primary_mode_node_only_executes_tools`

---

### Scenario 4.2: AI Service Mode = Off (Node.js Only)
**File**: `tests/evals/test_decision_unification.py`

```
GIVEN: AI_SERVICE_MODE=off
WHEN:  customer message arrives
THEN:  ALL AI decisions in Node.js
AND:   Python service not called
```

**Test Cases**:
- [ ] `test_off_mode_node_handles_full_pipeline`
- [ ] `test_off_mode_python_not_called`

---

### Scenario 4.3: Shadow Mode (Both Run, Python Logs)
**File**: `tests/evals/test_decision_unification.py`

```
GIVEN: AI_SERVICE_MODE=shadow
WHEN:  customer message arrives
THEN:  Both Node and Python run
AND:   Python result is logged but discarded
AND:   Node result is used
```

**Test Cases**:
- [ ] `test_shadow_mode_both_run`
- [ ] `test_shadow_mode_python_logged`
- [ ] `test_shadow_mode_node_result_used`

---

### Scenario 4.4: Pilot Mode (Specific Companies)
**File**: `tests/evals/test_decision_unification.py`

```
GIVEN: AI_SERVICE_MODE=pilot, AI_SERVICE_ENABLED_COMPANIES=co_123,co_456
WHEN:  message from company co_123
THEN:  Python handles AI decisions
WHEN:  message from company co_999
THEN:  Node.js handles AI decisions
```

**Test Cases**:
- [ ] `test_pilot_company_uses_python`
- [ ] `test_non_pilot_company_uses_node`

---

### Scenario 4.5: Remaining Node.js AI Logic
**File**: `tests/evals/test_decision_unification.py`

```
CHECK: These AI components should eventually move to Python:
[ ] modelManager.js (3026 lines) - model routing, key rotation, health checks
[ ] providerBudgetLedgerService.js (649 lines) - budget enforcement
[ ] policyEnforcementEngine.js (182 lines) - policy validation
[ ] agentToolRegistry.js (280 lines) - tool definitions
[ ] DAGPlannerExecutor.js (240 lines) - task planning
[ ] intentClassificationSchema.js (357 lines) - intent schema
[ ] agentIntentClassifierService.js (252 lines) - intent classification
[ ] agentIntentRelevanceService.js (614 lines) - intent relevance
```

**Test Cases**:
- [ ] `test_model_routing_in_python` (currently in Node)
- [ ] `test_budget_enforcement_in_python` (currently in Node)
- [ ] `test_policy_validation_in_python` (currently in Node)

---

## Section 5: Reply Quality Tests

### Scenario 5.1: Arabic Dialect Consistency
**File**: `tests/evals/test_reply_quality.py`

```
GIVEN: company configured for Egyptian Arabic
WHEN:  reply is generated
THEN:  reply should use Egyptian dialect
AND:   not mix with Modern Standard Arabic or other dialects
```

**Test Cases**:
- [ ] `test_egyptian_dialect_consistency`
- [ ] `test_no_dialect_mixing`

---

### Scenario 5.2: Reply Tone Matches Agent Persona
**File**: `tests/evals/test_reply_quality.py`

```
GIVEN: Sales agent persona (friendly, persuasive)
WHEN:  reply is generated
THEN:  tone should be sales-appropriate
AND:   not robotic or overly formal
```

**Test Cases**:
- [ ] `test_sales_persona_tone`
- [ ] `test_support_persona_tone`
- [ ] `test_persona_consistency_across_turns`

---

### Scenario 5.3: Response Length Appropriateness
**File**: `tests/evals/test_reply_quality.py`

```
GIVEN: simple question (yes/no, single fact)
WHEN:  reply is generated
THEN:  reply should be concise (1-2 sentences)
AND:   not overly verbose
```

**Test Cases**:
- [ ] `test_short_question_short_answer`
- [ ] `test_complex_question_detailed_answer`

---

### Scenario 5.4: No Internal Details Exposed
**File**: `tests/evals/test_reply_quality.py`

```
GIVEN: guardrail blocks or error occurs
WHEN:  reply is generated
THEN:  NO internal policy details exposed
AND:   NO technical error messages
AND:   customer-friendly message only
```

**Test Cases**:
- [ ] `test_no_policy_details_in_reply`
- [ ] `test_no_error_stack_trace`
- [ ] `test_friendly_error_message`

---

## Section 6: Multi-Agent Orchestration Tests

### Scenario 6.1: CEO Delegates to Specialists
**File**: `tests/evals/test_multi_agent.py`

```
GIVEN: complex request requiring multiple domains
WHEN:  CEO agent receives message
THEN:  CEO should delegate to appropriate specialist(s)
AND:   results should be synthesized
```

**Test Cases**:
- [ ] `test_ceo_delegates_to_sales`
- [ ] `test_ceo_delegates_to_support`
- [ ] `test_ceo_delegates_to_inventory`
- [ ] `test_ceo_synthesizes_specialist_results`

---

### Scenario 6.2: Agent Handoff Works
**File**: `tests/evals/test_multi_agent.py`

```
GIVEN: request outside current agent scope
WHEN:  handoff is triggered
THEN:  conversation transfers to correct agent
AND:   context is preserved
```

**Test Cases**:
- [ ] `test_handoff_preserves_context`
- [ ] `test_handoff_to_correct_agent`

---

## Section 7: Memory & Context Tests

### Scenario 7.1: Working Memory (Sliding Window)
**File**: `tests/evals/test_memory.py`

```
GIVEN: conversation with 20+ messages
WHEN:  new message arrives
THEN:  recent context is preserved
AND:  older messages may be compressed
```

**Test Cases**:
- [ ] `test_recent_context_preserved`
- [ ] `test_old_messages_compressed`

---

### Scenario 7.2: Episodic Memory (Vector Search)
**File**: `tests/evals/test_memory.py`

```
GIVEN: customer referencing past interaction
WHEN:  episodic memory is searched
THEN:  relevant past interactions are retrieved
AND:  irrelevant are excluded
```

**Test Cases**:
- [ ] `test_episodic_retrieves_relevant_past`
- [ ] `test_episodic_excludes_irrelevant`

---

## Running the Tests

```bash
# Run all evaluation tests
cd apps/ai-service
pytest tests/evals/ -v

# Run specific section
pytest tests/evals/test_hallucination_prevention.py -v
pytest tests/evals/test_decision_unification.py -v
pytest tests/evals/test_reply_quality.py -v

# Run with coverage
pytest tests/evals/ -v --cov=src --cov-report=term-missing
```

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Hallucination rate | 0% (no invented facts) |
| Tool execution accuracy | 100% |
| Decision unification | AI_SERVICE_MODE=primary: 100% Python |
| Reply quality (Arabic) | Dialect-consistent, persona-appropriate |
| Internal details exposure | 0% (never exposed) |