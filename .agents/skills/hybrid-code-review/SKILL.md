---
name: hybrid-code-review
description: Hybrid code review system combining deterministic rule-based AST/diff guards with targeted line-level AI critiques, inspired by Alibaba's open-code-review (OCR). Audits changes against MaxP platform laws (modular screens < 400 lines, banned AI keys, mobile responsive rules, OLED single-surface chassis).
---

# Hybrid Code Review Skill (MaxP Standards)

Inspired by **Alibaba's `open-code-review` (OCR)**, this skill implements a high-precision, low-token hybrid code review architecture. It couples **fast deterministic rule engines** (for structural laws, file size bounds, and banned patterns) with **targeted LLM reasoning** (for architectural coherence, memory leaks, and logic flaws).

---

## 🏗️ Architecture: Why Hybrid?

Traditional LLM code reviews consume excessive tokens, miss deterministic formatting violations, and suffer from attention drift. The hybrid approach splits the review:

```
[ Git Diff / Staged Changes ]
          │
          ├──► [ Pipeline 1: Deterministic Guardrails (AST & Regex) ]
          │    ├── 1. File Length Bounds (< 400 lines per UI screen)
          │    ├── 2. Banned Keys in .env (public.ai_keys compliance)
          │    ├── 3. Mobile Single-Depth (Ban nested p-6 cards)
          │    ├── 4. Design Slop Detector (Ban purple neon / emojis)
          │    └── 5. TypeScript Strictness & Missing Catch blocks
          │
          └──► [ Pipeline 2: Targeted LLM Line-Level Review ]
               ├── 1. State machine & race condition analysis
               ├── 2. Tenant scoping & memory leak checks
               └── 3. Actionable GitHub diff suggestions
```

---

## 🛑 Layer 1: The Deterministic Guardrails (Automatic Failures)

The deterministic pipeline flags violations instantly with zero LLM hallucination:

1. **Modular Screen Rule (Max 400 Lines):**
   - No single screen or tab file in `src/pages/` or UI components may exceed **400 lines**.
   - God-components aggregating multiple screens must be split into dedicated child tabs.

2. **Zero AI Keys in `.env`:**
   - Any commit adding `*_API_KEY=` or `*TOKEN=` related to OpenAI, Gemini, Claude, DeepSeek, or Groq into `.env` or local files is immediately blocked.

3. **Mobile Anti-Pattern Detector (MOB-015):**
   - Flag any `p-6` or `p-8` on container cards that lacks a responsive prefix (`sm:p-6`).
   - Flag nested border cards inside other bordered cards on screens `< 640px`.

4. **Design Slop & Visual Guard (2026 SaaS Cockpit):**
   - Flag purple/cyan dark mesh clichés, fake glowing neon borders, and banned emoji littering (`🤖`, `🚀`, `⚡`, `✨`, `🔥`, `💡`, `🎯`, `🛒`, `🧠`) in production UI copy.
   - Mandate `tabular-nums` on numbers, prices, and telemetry badges.

5. **Defensive Error Handling:**
   - Flag naked `try { ... } catch (e) {}` blocks that swallow errors silently.
   - Flag unhandled Promise rejections in async routes.

---

## 🧠 Layer 2: Targeted LLM Line-Level Critique

Once deterministic checks pass, the LLM analyzes modified hunks (`git diff -U3`) focusing exclusively on:

1. **Tenant Scoping & Data Leaks:**
   - Did the author remember `WHERE company_id = $1` in the updated DB query?
2. **React Re-render & Hook Hazards:**
   - Are `useEffect` dependency arrays stable? Are expensive objects or functions memoized (`useMemo`, `useCallback`) where needed?
3. **UX & State Transitions:**
   - Are loading states, error states, and empty states rendered defensively?

---

## 📋 Review Output Format

Every hybrid review outputs concise, actionable comments using this format:

```markdown
### 🔍 Hybrid Code Review Report

#### 🛑 Deterministic Guardrail Status: [PASS / FAIL]
- [x] File line count under 400 lines: PASS
- [x] Zero AI keys in environment files: PASS
- [x] Mobile single-depth responsiveness: PASS
- [x] Single-surface chassis compliance: PASS

#### 💡 Line-Level Architectural Findings:
**File:** `src/pages/dental-lab/technician/DentalTechWageTab.tsx`
**Line:** `142-148`
**Issue:** Potential memory leak with un-cleared WebSocket/interval listener on unmount.
**Suggested Fix:**
```tsx
useEffect(() => {
  const interval = setInterval(fetchLedger, 10000);
  return () => clearInterval(interval); // <-- added cleanup
}, [companyId]);
```
```

---

## ⚡ Running the Review Tool

Use the built-in deterministic check script:
```bash
node scripts/hybrid-code-review.cjs
```
