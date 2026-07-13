# Tool Calling Abstraction Layer — Migration Plan

**Status:** Draft  
**Date:** 2026-07-09  
**Based on:** `tool-calling-abstraction-layer-research-2026-07-09.md`

---

## 1. الأهداف (Goals)

1. **توحيد واجهة tool calling** — Base class واحد لجميع الـ parsers بدلاً من 3 مسارات مختلفة (GemmaClient، DSML parser، OpenAI pass-through)
2. **تبسيط `client.py`** — إزالة inline DSML parsing، توجيه Google/Gemma عبر نفس المسار
3. **إزالة `gemma_client.py`** (~340 lines) — تشغيل Gemma 4 عبر HTTP العادي + parser
4. **إزالة `build_gemma_client()` و `is_gemma_model()`** من مسارات الإنتاج
5. **تثبيت التنسيق** — `ProviderResponse.tool_calls` يبقى نفسه، الـ agent pipeline ما يتأثرش
6. **تغطية اختبارات كاملة** — unit لكل parser، integration للـ routing، A/B comparison

## 2. معايير النجاح (Success Criteria)

| # | المعيار | القياس |
|---|---------|--------|
| 1 | كل الاختبارات القديمة تفضل شغالة | `pytest tests/llm/` يمر بدون تغيير |
| 2 | `ProviderResponse` ما تغيرش | الـ schema نفسه بالضبط |
| 3 | Gemma 4 يشتغل من غير `GemmaClient` | routing عبر `LLMClient` + native Gemini API |
| 4 | DeepSeek DSML يفضل شغال | كل تنسيقات DSML تستخرج صح |
| 5 | Feature flag يسمح بالرجوع للقديم | `USE_LEGACY_GEMMA_PARSER=true` أو `USE_LEGACY_DSML_PARSER=true` |
| 6 | Code size يقل | من ~680 lines → ~500 lines |
| 7 | كل provider يشتغل A/B comparison من غير silent failures | logging الاختلافات تظهر في logs |

## 3. معمارية الـ Parser Abstraction

```
┌─────────────────────────────────────────────┐
│               BaseToolParser                │
│  (ABC)                                      │
│  render_tools(tools) → str                  │
│  parse_calls(text) → list[tool_calls]       │
│  parse_stream(prev, curr, delta) → list     │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┼───────────────┐
       │       │               │
  ┌────▼────┐ ┌▼───────┐ ┌────▼───────┐
  │OpenAI   │ │DeepSeek│ │Gemma4     │
  │Compat   │ │V4      │ │           │
  │Parser   │ │Parser  │ │Parser     │
  └─────────┘ └────────┘ └───────────┘
  (pass-through,  (from client.py  (from gemma_
   11 providers)   DSML parser)    chat_template)
```

### `BaseToolParser` Interface

```python
class BaseToolParser(ABC):
    supports_streaming: bool = False
    supports_required_and_named: bool = True

    @abstractmethod
    def render_tools(self, tools: list[dict]) -> str:
        ...

    @abstractmethod
    def parse_calls(self, text: str) -> list[dict]:
        ...

    def parse_stream(self, prev: str, curr: str, delta: str) -> list[dict]:
        raise NotImplementedError("streaming not supported")
```

### الـ Routing Logic في `LLMClient.generate()`

```
def generate(messages, tools):
    parser = get_parser(model_name, provider)

    # Render
    rendered_prompt = parser.render_tools(tools) if tools else None

    # Call
    response = call_model(messages, rendered_prompt)

    # Parse
    tool_calls = parser.parse_calls(response.text)

    return ProviderResponse(text=..., tool_calls=...)
```

## 4. الخطة التفصيلية (4 Phases)

### Phase 1: Foundation ⚙️ (Day 1-2)

**What:**
- إنشاء `src/llm/tool_parsers/` package
- `base.py`: `BaseToolParser` ABC
- `openai_compat.py`: pass-through parser (same format, no transformation)
- `__init__.py`: registry + `get_parser()` factory
- ربط الـ parser مع `LLMClient` (موازي للقديم، feature flag)

**Files:**
```
src/llm/tool_parsers/
├── __init__.py      → registry + get_parser()
├── base.py          → BaseToolParser ABC
└── openai_compat.py → OpenAIToolParser (pass-through)
```

**Tests:** `tests/llm/tool_parsers/`
- `test_base.py`: contract tests (كل parser لازم يمر على `test_parser_contract`)
- `test_openai_compat.py`: pass-through بترجع نفس الحاجة
- Integration test: `LLMClient` routing مع parser feature flag

**Self-Correction (اصلاح ذاتي):**
- Contract tests: كل Parser جديد لازم يعدي على نفس suite
- Parser registry: `get_parser()` ترجع `UnsupportedModelError` لو مفيش parser (fail fast)
- Logging: تسجيل أي parser بيدخل الشغل
- **A/B comparison:** `LLMClient` يشتغل بالقديم والجديد ويقارن `tool_calls` — لو في اختلاف، log warning وما يغيرش السلوك

**Success:**
```
pytest tests/llm/tool_parsers/ -v  ← 100% pass
pytest tests/llm/test_deepseek_stabilization.py -v  ← same (تستخدم القديم لسه)
pytest tests/llm/test_gemma_chat_template.py -v  ← same
```

### Phase 2: DeepSeek V4 Parser (Day 2-3)

**What:**
- استخراج `_parse_dsml_tool_calls()` من `client.py` → `DeepSeekV4ToolParser`
- Parser بيدعم: XML format، spaced format، legacy JSON fallback
- ربط الـ parser مع `get_parser(model_name)`
- Feature flag: `USE_LEGACY_DSML_PARSER` (default: False)

**Files:**
```
src/llm/tool_parsers/
├── deepseek_v4.py  → DeepSeekV4ToolParser
```

**Changes to `client.py`:**
- خط DSML القديم: `if not raw_tool_calls and text and (... DSML ...)` يشوف feature flag
- لو `USE_LEGACY_DSML_PARSER=false`: يستخدم parser الجديد
- لو `true` أو حصل mismatch: يرجع للقديم

**Tests:**
- نفس اختبارات `test_deepseek_stabilization.py` + تحويلها للـ parser الجديد
- A/B test: نفس النص، parser قديم vs جديد — لازم يطلع نفس النتيجة
- Streaming test: `parse_stream()` ترجع partial tool calls

**Self-Correction:**
- **Dual parsing:** كل request يشتغل بالقديم والجديد، يقارن `tool_calls`
- لو النتيجة مختلفة: `logger.warning("dsml_parser_mismatch", old=..., new=...)`
- لو الـ parser الجديد fail: `logger.error("dsml_parser_failed", fallback="legacy")` → auto fallback
- Metric: `dsml_parser_success`, `dsml_parser_mismatch`, `dsml_parser_fallback`

**Success:**
```
# كل اختبارات DeepSeek تفضل صحيحة
pytest tests/llm/test_deepseek_stabilization.py -v
# نفس الاختبارات للـ parser الجديد
pytest tests/llm/tool_parsers/test_deepseek_v4.py -v
# A/B comparison: مفيش mismatch warnings في logs
```

### Phase 3: Gemma 4 Parser (Day 4-7)

**What:**
- تحويل `gemma_chat_template.py` → `Gemma4ToolParser`
- الـ parser بيدعم: render tools + parse calls + parse streaming
- تحديث `LLMClient.generate()`: Gemini API native للـ Gemma 4 (بدلاً من GemmaClient)
- تحديث `agent_client_factory.py`: Gemma 4 يروح على parser + Google provider مش GemmaClient
- Feature flag: `USE_LEGACY_GEMMA_CLIENT` (default: False)

**Key Decision:**
بدلاً من API native (Gemini API HTTP مباشر)، Gemma 4 يمشي على:
```
LLMClient(provider="GOOGLE", model="gemma-4-31b-it")
  → _generate_openai_compat() → OpenAI compat endpoint → Gemma4ToolParser
```

أو نحتفظ بـ native Gemini API endpoint ولكن نمرر على الـ parser بدلاً من GemmaClient.

الاختيار: **نحتفظ بـ native Gemini API** (أسرع، بدون openai-compat layer layer overhead) ولكن نشيل `GemmaClient` ونحط الـ logic في `_generate_google()` مباشرة مع `Gemma4ToolParser`.

**Files:**
```
src/llm/tool_parsers/
├── gemma4.py       → Gemma4ToolParser (من gemma_chat_template.py)
```

**Removed files:**
- `gemma_client.py` ← بالكامل (بعد Phase 4)
- `gemma_chat_template.py` ← محتواه يندمج في `gemma4.py`

**Updates to `client.py`:**
- `_generate_google()`: لو model = Gemma 4، يستخدم `Gemma4ToolParser` للـ render/parse
- لسه بيستخدم `google.genai` SDK للـ API call

**Updates to `agent_client_factory.py`:**
- `is_gemma_model()` → `get_parser(model).__class__.__name__ == "Gemma4ToolParser"`
- `build_gemma_client()` → يرجع `None` (أو يحذف)

**Tests:**
- نقل اختبارات `test_gemma_chat_template.py` للـ parser الجديد
- نقل اختبارات `test_gemma_client.py` (بس للـ parsing, مش للـ HTTP)
- Integration test: Gemma 4 routing عبر `LLMClient` + parser

**Self-Correction:**
- **Dual parsing:** Gemma نموذج يشتغل بالقديم (`GemmaClient._parse_response()`) والجديد (`Gemma4ToolParser.parse_calls()`)
- **Auto-detection:** لو parser عرف يستخرج tool calls بس القديم لأ → log diff، استخدم الجديد
- لو العكس → log warning، استخدم القديم
- لو الاتنين مختلفين → `logger.critical`, auto fallback للقديم
- **Streaming A/B:** قارن streaming results (نادر الاختلاف لكن ممكن)

**Success:**
```
pytest tests/llm/test_gemma_chat_template.py -v  ← نفس الاختبارات
pytest tests/llm/tool_parsers/test_gemma4.py -v
# Gemma 4 يشتغل من غير GemmaClient
# A/B comparison: صفر mismatch warnings
```

### Phase 4: Cleanup & Polish (Day 8-9)

**What:**
- إزالة `gemma_client.py` بالكامل
- إزالة inline `_parse_dsml_tool_calls()` من `client.py`
- إزالة `is_gemma_model()` و `build_gemma_client()` من `agent_client_factory.py`
- تحديث `__init__.py`: تصدير `get_parser()` بدلاً من `build_gemma_client`
- تشغيل `pytest` كامل
- رفع الـ feature flags بعد N أيام

**Files Removed:**
```
src/llm/gemma_client.py          ← حذف
src/llm/gemma_chat_template.py   ← حذف (محتواه في tool_parsers/gemma4.py)
```

**Files Changed:**
```
src/llm/__init__.py              ← تحديث exports
src/llm/agent_client_factory.py  ← إزالة is_gemma_model + build_gemma_client
src/llm/client.py                ← إزالة DSML parser inline
tests/llm/test_gemma_client.py   ← حذف (أو تحويل لاختبارات parser)
tests/llm/test_deepseek_stabilization.py ← تحويل لاختبارات parser
```

**Self-Correction:**
- **Full regression:** `pytest tests/llm/` لازم يمر 100%
- **Type check:** `mypy src/llm/` لازم clean
- **Lint:** `ruff src/llm/` لازم clean
- **Integration:** اختبار يدوي لـ Gemma 4 و DeepSeek و OpenAI-compat providers

**Success:**
```
pytest tests/ -v  ← 100% pass
ruff src/llm/     ← clean
mypy src/llm/     ← clean
# System: 3 files removed (~500 lines), 1 package added (~400 lines)
```

## 5. Feature Flags

| Flag | Default | Purpose | Lifecycle |
|------|---------|---------|-----------|
| `USE_TOOL_PARSER` | `true` | تشغيل الـ parser abstraction كلها | دائم |
| `USE_LEGACY_GEMMA_CLIENT` | `false` | الرجوع لـ GemmaClient القديم | مؤقت (يزال بعد Phase 4) |
| `USE_LEGACY_DSML_PARSER` | `false` | الرجوع لـ DSML parser القديم | مؤقت (يزال بعد Phase 4) |
| `LOG_PARSER_A_B_COMPARISON` | `true` | تسجيل مقارنة القديم والجديد | يفضل دائم |

تنفيذ feature flags: environment variables في `src/config.py` + `Settings` class.

```python
# src/config.py
use_tool_parser: bool = True
use_legacy_gemma_client: bool = False
use_legacy_dsml_parser: bool = False
log_parser_a_b_comparison: bool = True
```

## 6. Self-Correction Mechanisms (آليات الإصلاح الذاتي)

### 6.1 A/B Comparison Framework

```
for every request with tools:
    new_parser = get_parser(model)
    new_calls = new_parser.parse_calls(response_text)
    
    if USE_LEGACY_DSML_PARSER or model is Gemma 4 LEGACY:
        old_calls = legacy_parse(response_text)
        
        if new_calls != old_calls:
            logger.warning("parser_ab_mismatch",
                model=model,
                old=old_calls,
                new=new_calls,
                text_snippet=response_text[:200],
            )
            # لا نغير السلوك — نسجل بس
            # في الإنتاج: استخدم old_calls (آمن)
            # في التطوير: استخدم new_calls (اختبار)
```

### 6.2 Parser Health Metrics

```
parser_parse_attempts{parser="gemma4"} += 1
parser_parse_success{parser="gemma4"} += 1  # لو استخرج tool calls
parser_parse_failure{parser="gemma4"} += 1  # لو fail
parser_parse_fallback{parser="gemma4", from="new", to="legacy"} += 1
parser_ab_mismatch{parser="deepseek_v4"} += 1
```

### 6.3 Automatic Rollback Conditions

| Condition | Action |
|-----------|--------|
| Parser fail rate > 5% في آخر 10 requests | Auto-enable legacy flag، log alert |
| A/B mismatch rate > 1% | Log warning، auto-disable parser |
| Critical error في template rendering | Fail fast (لا نرسل prompt مشوه) |
| Stream parser يطلع tool calls مختلفة عن non-stream | Disable streaming للـ model ده |

### 6.4 Guard: Template Validation

قبل إرسال أي request مع tools:
1. `parser.render_tools(tools)` → تأكد إنها مش فارغة
2. Validate: إن الـ tool definitions فيها name + description + parameters
3. لو `render_tools` رجعت `None` أو `""`: `logger.error` و `raise`

### 6.5 Guard: Output Validation

بعد استخراج tool calls:
1. كل tool call لازم يكون فيها `name` + `arguments`
2. `name` لازم يكون من الـ tools اللي أرسلناها
3. `arguments` لازم تكون JSON valid
4. لو validation fail: `logger.warning` + return `[]` (بدلاً من crash)

## 7. Test Strategy

### 7.1 Parser Contract Tests (Mandatory لكل Parser)

```python
@pytest.mark.parametrize("parser_cls", [OpenAIToolParser, DeepSeekV4ToolParser, Gemma4ToolParser])
def test_parser_contract(parser_cls):
    parser = parser_cls()
    # 1. render_tools يرجع str
    assert isinstance(parser.render_tools(sample_tools), str)
    # 2. parse_calls يرجع list
    calls = parser.parse_calls(sample_output)
    assert isinstance(calls, list)
    # 3. parse_stream يرجع list (لو supported)
    ...
```

### 7.2 Parser-Specific Tests

| Parser | Tests |
|--------|-------|
| OpenAIToolParser | pass-through، no transformation |
| DeepSeekV4ToolParser | XML format، spaced format، legacy JSON، Arabic parameters، type inference (int/bool/None) |
| Gemma4ToolParser | نفس `test_gemma_chat_template.py` بالكامل + streaming + Google hosted format + symmetric/asymmetric end tokens |

### 7.3 Integration Tests

| Test | What |
|------|------|
| `test_llm_client_routes_parser` | `LLMClient.generate()` يمرر tools للـ parser الصحيح |
| `test_gemma4_through_llm_client` | Gemma 4 مشطوب من GemmaClient |
| `test_deepseek_dsml_with_new_parser` | DSML يتعامل مع الـ parser الجديد |
| `test_a_b_comparison_logging` | A/B logging يشتغل من غير crash |

### 7.4 Regression Tests (نفس الحالية)

| Test File | يفضل بدون تغيير؟ |
|-----------|-----------------|
| `test_gemma_chat_template.py` | نعم — testing نفس الـ functions (بس من parser) |
| `test_gemma_client.py` | يتحول لاختبارات `Gemma4ToolParser` (HTTP tests يلغوا) |
| `test_deepseek_stabilization.py` | نفس الاختبارات مع parser جديد |
| `test_model_capabilities.py` | ما يتغيرش |
| `test_model_manager_config.py` | ما يتغيرش |

## 8. Rollout & Rollback

### 8.1 Deployment Sequence

```
Environment: Staging → Production (per provider)
```

1. **Staging:** Activate all parsers + A/B comparison logging
2. **Production (DeepSeek first):** Activate DeepSeekV4ToolParser فقط
3. **Monitor:** 24h مع A/B comparison
4. **Production (OpenAI-compat):** Activate OpenAIToolParser (low risk)
5. **Production (Gemma 4):** Activate Gemma4ToolParser + disable GemmaClient
6. **Cleanup:** Remove legacy code + feature flags بعد أسبوع

### 8.2 Quick Rollback (في أي وقت)

```bash
# Rollback Gemma 4 للقديم
export USE_LEGACY_GEMMA_CLIENT=true
# Rollback DeepSeek للقديم
export USE_LEGACY_DSML_PARSER=true
# Disable كل الـ parsers
export USE_TOOL_PARSER=false
# Restart service
pm2 restart ai-service
```

## 9. Summary: File Changes

### New Files
```
src/llm/tool_parsers/__init__.py       ← 30 lines (registry + factory)
src/llm/tool_parsers/base.py           ← 40 lines (ABC)
src/llm/tool_parsers/openai_compat.py  ← 30 lines (pass-through)
src/llm/tool_parsers/deepseek_v4.py    ← 100 lines (DSML parser)
src/llm/tool_parsers/gemma4.py         ← 200 lines (من gemma_chat_template)
                                     ─────
                                      ~400 lines
```

### Modified Files
```
src/llm/client.py                ← إزالة DSML parser inline (~50 lines)
src/llm/agent_client_factory.py  ← إزالة is_gemma_model/build_gemma_client (~40 lines)
src/llm/__init__.py              ← تحديث exports (~10 lines)
src/llm/config.py                ← إضافة feature flags (~10 lines)
```

### Removed Files
```
src/llm/gemma_client.py          ← −340 lines
src/llm/gemma_chat_template.py   ← −280 lines
                                  ─────
                                  −620 lines
```

**Net Change:** −220 lines بعد إضافة الـ parser package
