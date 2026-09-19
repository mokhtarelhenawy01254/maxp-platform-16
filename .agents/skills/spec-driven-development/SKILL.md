---
name: spec-driven-development
description: Spec-Driven Development (SDD) framework inspired by Fission-AI/OpenSpec. Eliminates unstructured "vibe coding" in complex multi-tenant SaaS features through proposal.md, delta specifications (specs/), and verifiable task checklists (tasks.md) before code modifications.
---

# Spec-Driven Development (SDD) Skill

Inspired by **Fission-AI's `OpenSpec`**, this skill enforces **Spec-Driven Development (SDD)** across the MaxP platform codebase. It replaces intuitive, trial-and-error changes ("vibe coding") with verifiable contracts and formal delta specifications, preventing architectural drift and breaking regressions in complex business modules.

---

## 🎯 When to Mandate SDD?

Apply the SDD workflow whenever a task involves:
1. **Multi-File Refactoring:** Modifying 3 or more interconnected files or database schemas.
2. **Domain Business Logic:** Accounting, commission calculations, dental technician wages, order attribution, or checkout flows.
3. **Database Migrations:** Modifying PostgreSQL tables, indexes, or adding tenant-scoped foreign keys.
4. **New Feature Domains:** Adding a new subsystem or external API integration.

*For simple one-line bug fixes or typo corrections, SDD can be fast-tracked or omitted.*

---

## 📐 The 3-Artifact OpenSpec Pipeline

Before writing production code, the agent generates or updates 3 distinct artifacts in `.specs/<feature-name>/`:

```
.specs/<feature-name>/
├── proposal.md     # Why: Architecture Decision Record, Trade-offs & Boundaries
├── spec.md         # What: Exact Behaviors, State Machines, Data Contracts
└── tasks.md        # How: Ordered, Atomic, Verifiable Implementation Steps
```

### 1. `proposal.md` (The Architectural Decision)
- **Problem Statement:** What pain point or requirement is being addressed?
- **Scope & Non-Goals:** Explicitly what will *not* be touched to prevent scope creep.
- **Security & Tenant Boundary:** How is `companyId` and role isolation preserved?
- **Performance Impact:** Latency implications, database indexing requirements, bundle size impact.

### 2. `spec.md` (The Delta Specification)
- **State Machine / Flow:** Define all permissible states (e.g. `PENDING -> IN_PROGRESS -> COMPLETED -> REJECTED`).
- **Data Contracts (Pydantic / TypeScript Schemas):** Define explicit types for inputs and outputs.
- **Edge Cases & Error Matrix:** What happens on network disconnect? What if the tenant quota is exceeded? What if the record belongs to another company?

### 3. `tasks.md` (The Verifiable Checklist)
Every task MUST follow the atomic pattern:
```markdown
- [ ] Task 1: Create migration file `migrations/20260919_add_wage_ledger.sql`
  - Validation: Run `pnpm db:migrate` and verify table schema.
- [ ] Task 2: Implement isolated wage calculation utility in `packages/dental-core/wages.ts`
  - Validation: Run unit test `pnpm test wages.spec.ts`.
- [ ] Task 3: Build modular UI tab `DentalTechWageTab.tsx` (< 350 lines)
  - Validation: Verify responsive layout with `pnpm lint` and single-depth styling.
```

---

## 🛡️ The Spec Guard Protocol

1. **Spec First, Code Second:** No implementation code may be committed until the specification artifacts are reviewed and validated.
2. **Deterministic Task Execution:** The agent checks off each task in `tasks.md` sequentially, executing the specified validation command after each step.
3. **No Unspecified Side-Effects:** Any modification to files outside the declared scope in `proposal.md` is strictly rejected.
4. **Living Docs:** When requirements change during development, update `spec.md` first, then adapt the code to match the new spec.
