# Core AI Prompt Leak Guard

## Date

- 2026-05-05

## Summary

- Tightened `CoreAIAgent` reply sanitization so leaked internal prompt fragments such as numbered `Constraint` lines do not reach customers.
- If the sanitizer cannot extract a safe customer-facing reply, the agent now stays silent instead of delivering the unsafe text.
- Extended the same guard to longer English behavior-instruction leaks such as `follow-ups`, `Current state`, and `first greeting in the conversation`.
- Extended the guard again for checklist-style self-evaluation leaks such as `* Question:` and `* Egyptian dialect? Yes.` that appeared inside customer replies.

## Why

- A production `/test-chat` verification surfaced a reply that leaked internal prompt instructions in English before a partial Arabic sentence.
- The older sanitizer handled common `Role:` and `Constraints:` drafts, but missed numbered `Constraint 5:` / `Constraint 6:` variants and could fall back to the original leaked text.
- A follow-up production verification still exposed another leak shape where English behavior rules survived sanitization and wrapped the closing Arabic sentence.
- A later `/test-chat` verification exposed a third leak shape where the model emitted a prompt-review checklist before repeating the final Arabic reply.

## Changes

- Detect numbered `Constraint <n>:` prompt leakage as internal reasoning.
- Strip internal English lead-in text before the first Arabic customer-facing sentence when possible.
- Extract Arabic reply tails from numbered-constraint leaks.
- Strip short transliterated prompt fragments like `ya fandem) or` when they appear before the first Arabic customer sentence.
- Treat `follow-ups`, `Current state`, `customer started`, and `first greeting in the conversation` style lead-ins as unsafe prompt leakage.
- Treat checklist markers like `Question`, `Egyptian dialect`, `Polite and concise`, and `Short greeting` as prompt leakage and recover the final Arabic reply tail.
- Return an empty sanitized reply when no safe content can be extracted.
- Abort delivery in production, reply-adapter, and `/test-chat` paths when the post-sanitization reply is still unsafe or empty.

## Verification

- `node --check backend/services/CoreAIAgent.js`
- `node --check backend/tests/services/CoreAIAgent.catalogVariantContext.test.js`
- `jest --runTestsByPath tests/services/CoreAIAgent.catalogVariantContext.test.js --runInBand --forceExit --testNamePattern "numbered constraint leakage|transliterated leak prefixes|english behavior instructions|checklist-style prompt leakage|does not return an internal leak|extracts the final customer answer"`
- `jest --runTestsByPath tests/services/CoreAIAgent.catalogVariantContext.test.js --runInBand --forceExit --testNamePattern "stays silent instead of sending a canned low-risk reply"`
