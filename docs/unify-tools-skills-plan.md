# Plan: توحيد نظامي الأدوات والمهارات

**Generated**: 2026-07-08
**Estimated Complexity**: High
**Estimated Effort**: ~6-8 hours

---

## Overview

توحيد النظامين الحاليين (`ALL_TOOLS` + `SkillRegistry`) في نظام تسجيل واحد مع الحفاظ على التوافقية الكاملة مع DeepSeek API والـ wire format.

### Architecture Target

```
Before:  _execute_one() → SkillRegistry.get()  → fallback ALL_TOOLS.get()  → unknown
After:   _execute_one() → SkillRegistry.resolve() → find or fail

Before:  _resolve_tools() → ALL_TOOLS.values() + manager_tools + mcp_tools
After:   _resolve_tools() → SkillRegistry.get_all() + manager_tools + mcp_tools
```

### الـ SkillRegistry يتوسع عشان يدعم:
- FunctionTool (موجود حالياً Skill فقط)
- Tool groupings (CORE, ADVANCED, READ, WRITE)
- Auto-discovery (زي ALL_TOOLS حالياً)

---

## Success Criteria (معايير النجاح)

1. ✅ `_execute_one()` يستخدم مسار تنفيذ واحد فقط — لا fallback
2. ✅ كل FunctionTool مسجل في SkillRegistry — `registry.get(name)` دايمًا يلقاه
3. ✅ `CORE_TOOLS`, `ADVANCED_TOOLS`, `READ_TOOLS`, `WRITE_TOOLS` تشتغل من SkillRegistry
4. ✅ `ALL_TOOLS` يُلغى — ولا import له في أي ملف
5. ✅ DeepSeek API يشتغل زي ما هو — الـ wire format ماتغيرش
6. ✅ كل agent موجود (23 agent) يشتغل من غير تغيير في agent.json
7. ✅ CI validation يمر — `scripts/validate-agent-skills.js` يرجع 0 errors

## Failure Criteria (معايير الفشل)

1. ❌ أي tool مايلقاش registry → error بدل silent XML (ده مقصود — خطأ المفروض يبان)
2. ❌ `_resolve_tools()` يرجع tools ناقصة مقارنة بالحالة الحالية
3. ❌ `unlock_advanced_tools` tool يضيف tools غلط
4. ❌ الـ backward-compatible re-exports (`ALL_TOOLS.get("product_search")`) تكسر
5. ❌ الأداء يقل (SkillRegistry lookup أبطأ من dict.get)

---

## Prerequisites

- ✅ DeepSeek API docs راجعت — التوافق مضمون (wire format واحد)
- ✅ OpenAI Agents SDK architecture راجعت — نظام واحد هو الـ standard
- ✅ Microsoft Agent Framework راجعت — FunctionTool هو النوع الأساسي
- ✅ CI validation script موجود — `scripts/validate-agent-skills.js`
- ✅ GIT commit للإصلاحات السابقة عشان الـ refactor يكون clean

---

## Sprint 1: Foundation — توسيع SkillRegistry

**Goal**: SkillRegistry يدعم FunctionTool ويحل محل ALL_TOOLS
**Risk**: High — أساس كل حاجة

### Task 1.1: توسيع `SkillRegistry` class

- **Location**: `apps/ai-service/src/skills/registry.py`
- **Description**: SkillRegistry الحالي يدعم `Skill` objects فقط. نوسعه عشان يدعم FunctionTool كمواطن أصلي.

Changes:
- Add `FunctionTool` import
- Add `register_tool(tool: FunctionTool) -> None` — يسجل FunctionTool مباشرة
- Add `resolve(name: str) -> FunctionTool | None` — يبحث عن tool بالاسم (في FunctionTool أو Skill)
- Add `get_all_tools() -> list[FunctionTool]` — يرجع كل المسجلين كـ FunctionTool (يحول Skill لو لزم)
- Add `get_by_group(group: str) -> list[FunctionTool]` — grouping mechanism
- Keep `register(skill: Skill)` موجود — backward compat

**Acceptance Criteria**:
- `register_tool(FunctionTool(...))` يضيفه ويعود بـ `resolve(name)` نفس الـ tool
- `resolve("unknown")` يرجع `None`
- `get_all_tools()` يرجع كل المسجلين (Skill + FunctionTool) كـ FunctionTool list

**Validation**:
- `node scripts/validate-agent-skills.js` — no new errors

### Task 1.2: Auto-register ALL FunctionTools في SkillRegistry

- **Location**: `apps/ai-service/src/tools/registry.py` + `apps/ai-service/src/skills/register_all.py`
- **Description**: بدل ما ALL_TOOLS يتجمع في dict منفصل، نستخدم SkillRegistry

Changes:
- In `tools/registry.py`: بعد `_discover_domain_tools()` و `ALL_TOOLS` dict،
  نسجل كل tool في SkillRegistry عبر `registry.register_tool(t)`
- `ALL_TOOLS` dict يفضل موجود مؤقتاً (للـ Sprint 2) لكن كل tool يتسجل في SkillRegistry
- Skill tools (`SKILL_TOOLS`) يتسجلوا برضه في SkillRegistry

**Acceptance Criteria**:
- `get_skill_registry().get_all_tools().length == len(ALL_TOOLS) + len(SKILL_TOOLS)`
- كل اسم tool يشتغل مع `registry.resolve(name)`
- تسجيل مزدوج (نفس الاسم) مايعملش duplicate

**Validation**:
- Run: `python -c "from src.skills.registry import get_skill_registry; r = get_skill_registry(); print(len(r.get_all_tools()))"`
- Count should = 47 (ALL_TOOLS) + 2 (SKILL_TOOLS) + 19 (existing Skills) = 68 total

---

## Sprint 2: Pipeline — إزالة ALL_TOOLS fallback

**Goal**: `_execute_one()` يستخدم SkillRegistry فقط — لا fallback
**Risk**: High — لو غلط، كل tool calls هتفشل

### Task 2.1: تحديث `_execute_one()` في skills_pipeline.py

- **Location**: `apps/ai-service/src/pipeline/stages/skills_pipeline.py:110-125`
- **Description**: إزالة fallback إلى `ALL_TOOLS.get(func_name)`.

Before:
```python
skill = registry.get(func_name)
if not skill:
    tool = ALL_TOOLS.get(func_name)  # ← fallback
    if tool:
        ... execute tool ...
        return ...
    logger.warning("unknown_skill_called", name=func_name)
    return {"tool": func_name, "status": "unknown"}
...
result = await skill.execute(**arguments)
```

After:
```python
tool = registry.resolve(func_name)
if not tool:
    logger.warning("unknown_tool_called", name=func_name)
    return {"tool": func_name, "status": "unknown"}
...
result = await tool.func(validated)
...
```

**Key**: بعد التوحيد، `registry.resolve()` بترجع `FunctionTool` دايماً (لأن SkillRegistry بتحول Skill → FunctionTool). فـ `tool.func(validated)` يشتغل للاتنين.

**Acceptance Criteria**:
- كل tool موجودة في SkillRegistry → تشتغل عادي
- أي tool مش مسجلة → ترجع `"status": "unknown"` (زي قبل كده بالظبط، نفس الـ behavior)
- DeepSeek wire format ماتغيرش

**Validation**:
- Test: same tool calls producing same results

### Task 2.2: تحديث `_llm_call()` — إزالة ALL_TOOLS

- **Location**: `apps/ai-service/src/pipeline/stages/skills_pipeline.py:286-293`
- **Description**: إزالة استخدام `ALL_TOOLS` عند بناء tool_dicts

Before:
```python
for tool_name in allowed:
    tname = tool_name.lower()
    if tname not in skill_names and tname in ALL_TOOLS:
        tool_dicts.append(ALL_TOOLS[tname].to_json_schema_spec())
```

After:
```python
for tool_name in allowed:
    tname = tool_name.lower()
    if tname not in skill_names:
        tool = registry.resolve(tname)
        if tool:
            tool_dicts.append(tool.to_json_schema_spec())
```

**Acceptance Criteria**:
- نفس tools تتضاف لـ tool_dicts
- `ALL_TOOLS` import يُزال من الملف

### Task 2.3: تحديث `_build_tool_dicts()` — إزالة ALL_TOOLS

- **Location**: `apps/ai-service/src/pipeline/stages/skills_pipeline.py:354-364`
- **Description**: نفس pattern — استخدم SkillRegistry بدل ALL_TOOLS

**Acceptance Criteria**:
- `_build_tool_dicts()` يرجع نفس tools زي قبل
- مافيش ALL_TOOLS import في الملف

---

## Sprint 3: BaseAgent — تحديث _resolve_tools()

**Goal**: `_resolve_tools()` يقرا من SkillRegistry مش ALL_TOOLS
**Risk**: Medium — agents ممكن تفقد tools لو lookup غلط

### Task 3.1: تحديث `_resolve_tools()` في base.py

- **Location**: `apps/ai-service/src/agents/base.py:449-559`
- **Description**: استبدال `get_all_tools()` التي تستخدم `ALL_TOOLS.values()` بنظيرتها من SkillRegistry

Changes:
- `get_all_tools()` في `tools/registry.py` يتغير عشان يستخدم SkillRegistry
- الـ `_resolve_tool_set()` يتغير عشان يستخدم SkillRegistry.resolve()

**Acceptance Criteria**:
- `_resolve_tools()` يرجع نفس tools لكل agent (قارن before/after)
- الـ progressive disclosure (CORE_TOOLS → unlock_advanced) يشتغل صح
- `unlock_advanced_tools` يضيف نفس tools

### Task 3.2: تحديث `resolve_tools_from_names()` و `get_tools_for_role()`

- **Location**: `apps/ai-service/src/tools/registry.py:298-329`
- **Description**: هالدوال تستخدم `ALL_TOOLS[n]` — نغيرها لـ `SkillRegistry.resolve(n)`

**Acceptance Criteria**:
- `get_tools_for_role("SALES")` يرجع نفس tools الحالية
- `resolve_tools_from_names([...])` يرجع نفس results

### Task 3.3: تحديث backward-compatible re-exports

- **Location**: `apps/ai-service/src/tools/registry.py:152-206`
- **Description**: `product_search_tool = ALL_TOOLS.get("product_search")` — نغيرها كلها لـ `SkillRegistry.resolve("product_search")`
- **Risk**: Low — مجرد تغيير المصدر

Must ensure: لو أي كود برا `registry.py` يستورد `from src.tools.registry import product_search_tool` — الشغل يفضل زي ما هو.

**Acceptance Criteria**:
- `product_search_tool` قابل للإستيراد وبيشتغل

---

## Sprint 4: Settings Approval modes

**Goal**: Approval modes عالأدوات تشتغل من SkillRegistry
**Risk**: Medium — approvals لو انكسرت، كل write tools هتفشل أو تعمل silent approvals

### Task 4.1: نقل approval mode logic

- **Location**: `apps/ai-service/src/tools/registry.py:136-145`
- **Description**: الـ approval mode حاليًا بيتضبط على FunctionTool instances في ALL_TOOLS. ننقلها للـ SkillRegistry.

Current:
```python
for _name in WRITE_TOOL_NAMES:
    _tool = ALL_TOOLS.get(_name)
    if _tool:
        _tool.approval_mode = "always_require"
```

After: نفس الشغل لكن من SkillRegistry:
```python
for _name in WRITE_TOOL_NAMES:
    _tool = registry.resolve(_name)
    if _tool:
        _tool.approval_mode = "always_require"
```

**Acceptance Criteria**:
- WRITE_TOOLS approval_mode = "always_require"
- DIRECT_WRITE_TOOL_NAMES approval_mode = "never_require"
- READ_TOOLS / CORE_TOOLS = approval_mode مش متغير (default)

---

## Sprint 5: تنظيف وحذف ALL_TOOLS

**Goal**: إزالة `ALL_TOOLS` dict بالكامل — ولا import له
**Risk**: Medium — أي import منسي في أي ملف يسبب runtime error

### Task 5.1: البحث عن ALL_TOOLS imports

- **Location**: كل الـ repo
- **Description**: `grep -r "ALL_TOOLS" --include="*.py" apps/ai-service/`

**Expected findings (بعد التنفيذ)**:
- `/src/tools/registry.py` — التعريف نفسه + backward-compat layer
- `/src/skills/registry.py` — ممكن reference
- أي ملفات خارج الـ 3 الأساسيين (skills_pipeline, base, registry) لازم يتحدثوا

### Task 5.2: إزالة `ALL_TOOLS` dict

- **Location**: `apps/ai-service/src/tools/registry.py:48-52`
- **Description**: إزالة `ALL_TOOLS: dict[str, FunctionTool] = {}` وخط البناء
- استبدال بـ SkillRegistry auto-registration

### Task 5.3: تحديث `get_all_tools()` في tools/registry.py

- **Location**: `apps/ai-service/src/tools/registry.py:340-342`
- **Description**: تغيير `list(ALL_TOOLS.values())` → `registry.get_all_tools()`

**Acceptance Criteria**:
- `get_all_tools()` يرجع نفس القائمة before/after
- `from src.tools.registry import product_search_tool` يفضل شغال

---

## Sprint 6: CI Validation — تحديث

**Goal**: CI validation script يتأكد من unity ويضيف checks إضافية
**Risk**: Low

### Task 6.1: تحديث validate-agent-skills.js

- **Location**: `scripts/validate-agent-skills.js`
- **Description**: إضافة فحص: كل FunctionTool في definitions/ لازم يكون مسجل في SkillRegistry

**Acceptance Criteria**:
- `node scripts/validate-agent-skills.js` يمر ب 0 errors
- يكتشف أي tool مش مسجل

---

## Sprint 7: Tests

**Goal**: Testing كامل للـ refactor
**Risk**: Low — standalone tests

### Task 7.1: SkillRegistry unit test

- **Location**: `apps/ai-service/tests/test_skill_registry.py` (جديد)
- **Description**: Test كل وظائف الـ registry الجديدة

Test cases:
- `register` + `resolve` — basic
- `resolve("unknown")` → None
- `get_all_tools()` — counts match
- `register_tool(FunctionTool(...))` — round trip
- Duplicate registration — ignores or warns
- Skill → FunctionTool conversion

### Task 7.2: Integration test — pipeline

- **Location**: `apps/ai-service/tests/test_pipeline_unified.py` (جديد)
- **Description**: Mock LLM response with tool_calls, verify _execute_one resolves from SkillRegistry

Test cases:
- Tool in registry → executed
- Tool not in registry → "unknown" status
- Same tool call before/after refactor returns same result

### Task 7.3: Agent tool resolution test

- **Location**: `apps/ai-service/tests/test_resolve_tools.py` (جديد)
- **Description**: For each agent, verify `_resolve_tools()` returns same tools before/after

---

## Testing Strategy

### Unit Tests
| Test | What | Coverage |
|------|------|----------|
| SkillRegistry.register_tool | Add + resolve | محوري |
| SkillRegistry.resolve | Find by name, return None | محوري |
| SkillRegistry.get_all_tools | Count, content | محوري |
| register_all | Every tool registered | Sprint 1 |

### Integration Tests
| Test | What | Coverage |
|------|------|----------|
| _execute_one with registry | tool in/out of registry | Sprint 2 |
| _llm_call tool_dicts | ALL_TOOLS removed, same output | Sprint 2 |
| _resolve_tools for each agent | Before/after comparison | Sprint 3 |

### CI Checks
| Check | When | What |
|-------|------|------|
| validate-agent-skills.js | Every PR touching agents/skills/tools | All refs valid |
| Python Syntax | CI | No import errors |
| Registered tools == defined tools | validate script | No missing registrations |

### Manual Verification (before merge)
1. `node scripts/validate-agent-skills.js` — 0 errors
2. Python imports — `python -c "from src.skills.registry import get_skill_registry; r = get_skill_registry(); print('OK', len(r.get_all_tools()))"` — OK 68
3. `grep -r "from src.tools.registry import ALL_TOOLS" --include="*.py" apps/ai-service/` — 0 matches (except in registry.py itself)

---

## Potential Risks & Gotchas

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Tool name collision (SkillRegistry + ALL_TOOLS names) | Low | High | Testing in Sprint 7 |
| Manager tools not in ALL_TOOLS (agent.handoff etc) | Medium | High | `get_all_tools()` يرجعهم برضه |
| _unlock.py imports ALL_TOOLS internally | Low | Medium | Check carefully |
| agent.json tool names don't match registry names (camelCase) | High | Medium | CI validation يمسكهم (بالفعل شغال) |
| DeepSeek unexpected behavior with tool_choice | Low | High | Same wire format, no change |

## Rollback Plan

1. `git stash` changes → revert to 2026-07-08 pre-refactor commit
2. Re-run CI validation — should pass as before
3. Re-deploy via existing GitHub Actions

All changes are backward-compatible per-task because:
- Sprint 1: ALL_TOOLS يفضل موجود → الـ old code يفضل شغال
- Sprint 2: `_execute_one()` fallback يفضل موجود → لو registry فشل، يروح لـ ALL_TOOLS
- Sprint 5: بس بعد Verification نمسح ALL_TOOLS

يعني أي Sprint ممكن نوقفه ونرجع بسهولة من غير break.
