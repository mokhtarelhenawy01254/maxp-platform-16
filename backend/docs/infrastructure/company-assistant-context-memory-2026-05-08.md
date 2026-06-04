# Company Assistant Context Memory - 2026-05-08

## Problem

Swan's Telegram assistant could answer a dashboard question, but it lost the conversational turn immediately before short follow-up messages. A user could ask whether the assistant remembered their name, receive a prompt to provide it, then answer with only the name. The next assistant turn treated the one-word reply as a new unsupported request because recent context only contained user inputs and command metadata.

## Change

- Company assistant command logs now store a compact `reply` field inside `result` for conversational replies, tool-result replies, denials, and confirmation prompts.
- Runtime memory now injects recent turns as user plus assistant snippets, not just user text.
- The memory capture path can infer a user preferred name when a short name-like answer follows a recent assistant reply that explicitly asked for the user's name.
- Secret-like content continues to be filtered out from both recent context and durable memory.
- The legacy Telegram userbot chat routes are mounted at `/api/v1/userbot` so the production `/telegram-userbot` page can fetch dialogs, message history, and send messages through its existing API paths.
- Telegram userbot dialogs now return reusable `inputPeer` metadata, including `accessHash`, and the chat routes accept that reference when fetching history, sending text, sending files, or downloading media. This prevents private user/bot chats from failing with GramJS "Could not find the input entity" errors when an id-only lookup misses cache.

## Verification

- `npm test -- companyAssistantMemory.test.js`
- `npm test -- telegramUserbotRouteMount.test.js`
- `npm test -- TelegramUserbotService.test.js`
- `node -c services/companyAssistant/CompanyAssistantMemory.js`
- `node -c services/companyAssistant/CompanyAssistantAgent.js`
