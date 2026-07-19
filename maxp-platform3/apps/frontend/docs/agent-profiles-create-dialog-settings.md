# Agent Profiles — Create Dialog with Full Settings

## Changes

- **Create dialog is now a multi‑step wizard** (3 steps: Template+Identity → Personality → Behavior) instead of one long scroll, making creation easier.
- **Create dialog now includes all settings fields** when creating a new agent (no longer just name + icon + description). Fields: Persona, Goal, Tone, Language, Tasks, Boundaries, Welcome Message, Escalation, Custom Instructions.
- **Config + SOUL.md saved at creation time** via a chained PUT to `/agent/agents/:id/files` after the POST creates the agent. No need to edit the agent after creation to configure it.
- **`buildSoulContent`** extracted as a pure function from `generateSoulFromConfig` (previously inline) so the create flow can generate SOUL.md without depending on `setDraftFiles`.

## Files Changed

- `apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx` — main change
- `apps/frontend/src/components/ui/table.tsx` — text-left → text-start (RTL)
- `apps/frontend/src/locales/ar/translation.json` — sandbox tab label
- `apps/frontend/src/locales/en/translation.json` — sandbox tab label
- `apps/frontend/src/pages/super-admin/DevTasksList.tsx` — markup fixes
