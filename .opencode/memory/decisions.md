# Architectural & Design Decisions

<!-- Format:
## YYYY-MM-DD — Title
- Context: Why this decision was needed
- Decision: What was chosen
- Rationale: Why this over alternatives
- Rejected: What was considered but not chosen and why

## 2026-07-03 — Feature Toggle via Company Settings JSON
- Context: Need to enable/disable AI tools per company from the activation center without schema migrations for each new toggle
- Decision: Added `aiToolsEnabled` boolean toggled via Switch component in `CompanyActivationCenter`. Backend PUT `/:companyId/features` endpoint reads/writes a `features` JSON field inside `company.settings`
- Rationale: JSON field avoids schema changes per feature flag; simplest possible approach that works now
- Rejected: Creating a separate `company_features` table — overkill for a single boolean toggle; Prisma JSON field is sufficient

## 2026-07-04 — Order Workflow `isOverride` + Enum Status Fallback
- Context: QuickStatusChange page calls `POST /order-workflow/change-status` with enum value like "CONFIRMED", but the backend only finds DB-defined `OrderStatusDefinition` records, and workflow validation rejects the change because no transition rules are defined
- Decision: Modified both frontend (add `isOverride: true`) and backend (add `VALID_STATUSES` array fallback in route handler)
- Rationale: Minimal changes; `isOverride` already existed in the backend, just wasn't being sent; the VALID_STATUSES fallback handles companies without custom `OrderStatusDefinition` records
- Rejected: Creating default `OrderStatusDefinition` records for every company — too heavy; bypass is simpler and safe with `isOverride`

## 2026-07-05 — 5 Medical Human Agents (Named Personas)
- Context: Need to represent medical center staff as human-like AI agents, not generic bots. Each must have a name, role, and human persona.
- Decision: Created 20 files across 5 agents (aesthetic-advisor, physio-coordinator, dental-care-specialist, medical-lab-analyst, mental-health-counselor), each with agent.json, SOUL.md, TOOLS.md, AGENTS.md + quick profiles in systemSettings.agentQuickProfiles with locks (lockIdentity:false, lockPersona:true, lockRules:true, lockCustomPrompt:true)
- Rationale: Per create-premium-human-agent skill (Section ⓺), each agent must = human employee with name, SOUL, anti-detection rules
- Rejected: Single generic "medical-center-agent" — doesn't match human-staff model

## 2026-07-05 — booking_packages Redesign (Thin Wrapper → Value-Add Skill)
- Context: booking_packages skill was a thin filter over booking_info — just returned services with packages field, added no value. SKILL.md had hardcoded example prices (500 EGP).
- Decision: Redesigned packages.py to aggregate pricing data: calculate single_price, per_session cost, has_multi_session_packages boolean. SKILL.md now uses dynamic rules instead of hardcoded prices. Descriptions changed to English per AGENTS.md standard.
- Rationale: 2026 OpenAI Agents SDK standard expects skills that add value, not thin wrappers. Hardcoded prices = stale data risk. Tool descriptions should be in English (machine-readable).
- Rejected: Keeping as-is — violates 2026 progressive disclosure pattern and risks stale pricing

## 2026-07-05 — Packages Location Fix (branchServices aggregation)
- Context: get_center_info() mapped s.get("packages") on service directly, but backend returns packages nested in BookingBranchService[].packages
- Decision: Fixed booking_tools.py to extract packages from branchServices array and aggregate into flat array with branch names
- Rationale: Matches actual backend Prisma schema (BookingBranchService model)
- Rejected: Modifying backend to flatten packages onto service — changes DB layer when tool layer can adapt

## 2026-07-06 — Delete vs Refactor Secrets (Private Repo)
- Context: 50+ files had hardcoded production credentials (DB passwords, JWT secrets, SSH keys, GitHub PAT). The repo is private on GitHub.
- Decision: Delete all ad-hoc debug/test scripts containing hardcoded secrets rather than refactoring to env vars
- Rationale: These were one-off debug scripts, not part of the running service. The production service already uses `.env` properly. 133 files, 9458 lines removed.
- Rejected: Refactoring each script to use env vars — 50+ scripts, most were single-use debug tools. Not worth the effort.

## 2026-07-06 — Dockerize Deferred (Ponytail)
- Context: CI/CD currently uses tarball SCP + SSH script (deploy-remote.sh). Considered containerization.
- Decision: Defer Docker. Current system works reliably, handles all edge cases (blue-green frontend, .env backup/restore, health checks).
- Rationale: Docker adds complexity (registry, server Docker setup, env management, debugging) without solving any actual problem.
- Rejected: Adding Dockerfiles + docker-compose + registry + CI changes — significant effort for marginal benefit.

## 2026-07-06 — AI Agent Doc Rewrite (Complete Inaccuracy)
- Context: `ai-agent-system.md` described a Node.js system (`backend/services/aiAgent/`) that was either never built or replaced years ago. The real system is Python FastAPI + Microsoft Agent Framework.
- Decision: Full rewrite of the doc to match actual architecture.
- Rationale: Onboarding anyone with the old doc would cause deep confusion. The doc was a liability.
- Rejected: Incremental fixes — too many inaccuracies (location, language, agent count, tool system, MCP, providers, workers). Full rewrite was faster.
