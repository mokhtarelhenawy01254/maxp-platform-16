# Company Assistant for Telegram and WhatsApp

## Scope

This change adds the first production path for company-owned operator bots. A company can authorize a Telegram user/chat or WhatsApp phone number, give it read/write scopes, and route incoming messages to a shared Company Assistant agent.

## Backend Pieces

- `CompanyAssistantChannel` stores authorized operators per company/channel/provider.
- `CompanyAssistantCommandLog` stores every assistant command, tool decision, status, result, and error.
- `CompanyAssistantPendingAction` stores write actions waiting for explicit confirmation.
- `CompanyAssistantMemory` stores company/channel/user memories that can be injected into future assistant prompts.
- `CompanyAssistantAgent` routes messages to safe tools and requires confirmation for writes.
- `CompanyAssistantPrompt` builds the per-message agent prompt from company context, channel scopes, tool affordances, safety rules, and channel-specific instructions.
- `CompanyAssistantSkills` maps human-facing skills to low-level assistant tools, then filters available tools per channel metadata.
- `CompanyAssistantChannelRouter` resolves authorized channel identities before any tool can run.

## Agent Runtime Prompt

The assistant now follows an OpenClaw-style runtime shape instead of only static reply templates:

- Each incoming message gets a compact agent prompt with identity, company context, channel/provider, active scopes, allowed tools, denied tools, safety rules, and custom channel instructions.
- The model first chooses one action: `conversation`, `clarify`, or `tool`.
- Tool access is still enforced outside the model through channel scopes and confirmation records.
- Conversational replies and tool-result summaries can be AI-composed from the runtime prompt, with deterministic fallbacks when no AI key is available.
- Channel metadata can include `agentInstructions`, `agentRules`, `responseStyle`, or `agentName` for company-specific behavior.
- Channel metadata can include `enabledSkillIds`; missing metadata falls back to safe read-oriented skills.
- Runtime memory injects durable memories plus recent safe command context, while secret-looking messages are skipped.

## Skills And Memory

Default enabled skills:

- `sales_analysis`
- `inventory_watch`
- `customer_support`
- `operations_manager`

Disabled by default:

- `task_manager`, because it includes `create_task` and requires `tasks:write` plus confirmation.

Memory behavior:

- Explicit memory commands such as `remember that...`, `افتكر...`, or `احفظ...` create durable facts.
- Preference commands such as `call me Max` or `خلي ردك: مختصر` create user-scoped preferences.
- Messages that look like credentials, tokens, API keys, passwords, OTPs, sessions, or cookies are not saved.


## Supported Tools

- `get_dashboard_summary`
- `search_orders`
- `search_products`
- `list_tasks`
- `list_recent_conversations`
- `create_task` with confirmation

## Channels

### Telegram

`TelegramBotService` now configures a webhook when `TELEGRAM_WEBHOOK_BASE_URL` or `PUBLIC_API_BASE_URL` is available.

Webhook shape:

```text
/api/v1/telegram/webhook/:configId/:secret
```

The secret is derived from the config id and bot token. Without a webhook base URL, the service keeps long polling disabled unless `TELEGRAM_ENABLE_LONG_POLLING=true`.

The webhook route is public in `globalSecurity`; Telegram authentication is the derived secret path segment, not a dashboard JWT.
### WhatsApp

Baileys sessions call the assistant before the existing customer-service AI. If no authorized assistant channel matches, the current customer AI path continues unchanged.

Meta Cloud webhook messages are also routed to the assistant after inbound persistence.

## Admin API

Base path:

```text
/api/v1/company-assistant
```

Endpoints:

- `GET /admin/context`
- `POST /admin/channels`
- `PATCH /admin/channels/:channelId`
- `DELETE /admin/channels/:channelId`
- `GET /admin/memories`
- `POST /admin/memories`
- `PATCH /admin/memories/:memoryId`
- `DELETE /admin/memories/:memoryId`
- `POST /admin/test-message`

## Frontend

Settings page:

```text
/settings/company-assistant
```

The integrations settings page links to it.

The page has operational tabs for:

- `القنوات`: connect, select, edit, and revoke Telegram/WhatsApp assistant channels.
- `المهارات`: enable or disable channel skills without editing raw metadata.
- `الذاكرة`: add and delete durable assistant memories.
- `السجلات`: inspect recent commands, intents, tool choices, statuses, and results.
- `الإعدادات`: edit assistant name, response style, rules, and channel prompt.

Existing linked channels can be edited in place. The channel card exposes `تعديل القواعد`, opens the same scope chips used during creation, and persists changes through:

```text
PATCH /api/v1/company-assistant/admin/channels/:channelId
```

The same edit surface also stores channel-level `agentInstructions` in metadata so every company can give its Telegram/WhatsApp assistant a lightweight custom prompt.

## Permission Edit Test Scenarios

1. Active channel starts read-only.
   - Open `/settings/company-assistant`.
   - Confirm the channel card shows `قراءة البيانات`.
   - Send `ملخص الموقع` from the test panel and expect a handled read reply.

2. Enable command execution on an existing channel.
   - Click `تعديل الصلاحيات`.
   - Select `تنفيذ أوامر`.
   - Save and confirm the card shows both `قراءة البيانات` and `تنفيذ أوامر`.
   - Confirm the PATCH response persists `assistant:write`; future generic write tools use this scope.

3. Enable task creation on an existing channel.
   - Click `تعديل الصلاحيات`.
   - Select `مهام`.
   - Save and confirm the card shows `مهام`.
   - Send `اعمل مهمة متابعة طلبات بكرة` and expect the assistant to request confirmation before creating the task.
   - Remove `مهام` and send the same prompt to confirm the assistant refuses with `tasks:write`.

4. Preserve at least one scope.
   - Open permission editing for a channel with only `قراءة البيانات`.
   - Click `قراءة البيانات` again.
   - The UI keeps `قراءة البيانات` selected so a channel is never saved with empty scopes.

5. Cancel does not persist.
   - Open permission editing, toggle a scope, then click `إلغاء`.
   - Confirm the visible card scopes stay unchanged and no PATCH request is needed.

6. Conversational smoke replies.
   - Send `السلام عليكم` and expect a natural greeting, not a dashboard summary.
   - Send `السلام عليكم يا مساعد` and expect the same natural greeting.
   - Send `السلام عليكم عايز ملخص الموقع` and expect the dashboard summary path to still run.
   - Send `انت ai؟` and expect the assistant to identify itself as the company assistant.
   - Send `مساعدة` and expect examples of supported read and task prompts.

7. Prompt-driven behavior.
   - Add channel instructions such as `رد بلهجة مصرية مختصرة وابدأ بالخلاصة`.
   - Send a greeting and expect a natural response following those instructions when an AI key is available.
   - Send a data request and confirm the assistant still uses the correct tool instead of inventing data.

8. Skill gating.
   - Open the `المهارات` tab for a channel.
   - Disable `إدارة المهام`.
   - Send `اعمل مهمة متابعة طلبات بكرة` and expect a refusal that the skill is disabled.
   - Enable `إدارة المهام` while keeping `tasks:write` off and expect a missing-scope refusal.
   - Enable `tasks:write` and expect a confirmation prompt before creation.

9. Durable memory.
   - Send `افتكر إن سياسة الاسترجاع 14 يوم`.
   - Ask later `سياسة الاسترجاع كام يوم؟`.
   - Expect the assistant to use the saved memory instead of saying it does not know.
   - Send a password/API-key-looking memory and confirm it is not stored.

10. Admin memory.
   - Open the `الذاكرة` tab.
   - Add a manual memory linked to the selected channel.
   - Confirm it appears in `/admin/context` and future prompts.
   - Delete it and confirm the prompt no longer includes it.
## Safety

- No unregistered Telegram/WhatsApp identity can execute assistant tools.
- Read and write scopes are separated.
- Skill allowlists are enforced outside the model.
- Memory writes are company-scoped and skip secret-looking content.
- Write tools require a confirmation token.
- Tool handlers are company-scoped and do not expose raw database access to the model.

## Next Tool Additions

- Order status updates with confirmation.
- Product stock updates with confirmation.
- Customer lookup and conversation summarization.
- Shipping/tracking lookup.
- Dashboard approval queue for high-risk actions.
