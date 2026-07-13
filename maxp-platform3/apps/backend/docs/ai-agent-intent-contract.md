# AI Agent Intent Contract

Updated: 2026-05-23

## Purpose

The CEO Agent must not depend on ad-hoc keyword growth for routing. Every turn is resolved into a typed intent contract before tools are exposed to the model or executed by the Tool Gateway.

## Contract Fields

- `schemaVersion`: current contract schema version.
- `intent`: canonical intent id, for example `orders.create_draft` or `agents.run_task`.
- `confidence`: planner confidence from `0` to `1`.
- `source`: planner source such as `state-machine`, `tool-policy-gate`, or `semantic-chat`.
- `decision`: `answer`, `execute_tool`, `delegate`, `continue_goal`, or `ask_followup`.
- `actionType`: `chat`, `analysis`, `read`, `write`, `workflow`, or `handoff`.
- `riskLevel`: `low`, `medium`, or `high`.
- `route`: primary tool, allowed tools, and blocked tools.
- `requiredSlots` and `missingSlots`: structured fields needed by the intent.
- `guardrails`: runtime controls that must wrap execution.
- `nextState`: the next workflow state.

## Engineering Rule

New agent behaviors must be added as typed policies in `agentIntentPlannerService.js` and covered by tests. Do not add new keyword-only arrays or branches to `agentIntentRelevanceService.js`.

The legacy relevance service may continue to provide conservative signals while the planner is being migrated, but it is not the long-term source of truth. The typed planner contract is the object logged to audit and passed to the CEO runtime.

## Required Tests

- Intent contract tests for every new canonical intent.
- Tool allowlist tests proving unrelated tools are not exposed.
- Audit metadata tests when the contract shape changes.
- Architecture guard tests must keep blocking new keyword-only intent branches.
