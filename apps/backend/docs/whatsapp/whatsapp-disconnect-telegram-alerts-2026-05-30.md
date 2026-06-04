# WhatsApp Disconnect Telegram Alerts - 2026-05-30

MaxP now sends an operations Telegram alert whenever a WhatsApp Baileys number disconnects unexpectedly.

## Runtime Behavior

- `WhatsAppManager.js` queues a Telegram alert from `connection.update` close events for both relink-required failures and transient disconnects that enter auto-reconnect.
- The health-check loop also queues an alert when it detects a previously connected socket is no longer alive without a normal Baileys close event.
- Manual user logout is excluded because it is an intentional action rather than an incident to repair.
- Alerts include company ID, session ID, phone number, reason, next MaxP status, recovery action, and source.
- Duplicate alerts are throttled per session and alert category for 10 minutes by default. Set `WHATSAPP_DISCONNECT_ALERT_COOLDOWN_MS` to tune this interval.

## Configuration

Alerts use the existing `telegramAlertService` target resolver:

- Preferred Bot API path: `TELEGRAM_ALERT_BOT_TOKEN` or `TELEGRAM_BOT_TOKEN`, plus `TELEGRAM_ADMIN_CHAT_ID` / `TELEGRAM_ALERT_CHAT_ID` / comma-separated `*_CHAT_IDS`.
- If a chat ID is configured but the token is not, the service can use the active site `TelegramConfig` bot token from the database.
- If no Bot API chat ID is configured, the service falls back to the active Telegram userbot for the active site bot company and sends the alert to that account's Saved Messages (`chatId = me`).
- Optional selectors: `TELEGRAM_ALERT_BOT_CONFIG_ID`, `TELEGRAM_ALERT_COMPANY_ID`, `TELEGRAM_ALERT_USERBOT_CONFIG_ID`, `TELEGRAM_ALERT_USERBOT_COMPANY_ID`.

If no Bot API or userbot target can be resolved, the service logs one warning and the disconnect flow continues without blocking reconnect.

## Verification

Regression coverage was added to `backend/tests/services/WhatsAppManager.messageCapture.test.js` for alert categorization, duplicate throttling, and Telegram message content for transient auto-reconnect disconnects.
`backend/tests/services/telegramAlertService.test.js` covers Bot API env targets, database bot-token fallback, Telegram userbot Saved Messages fallback, and missing-target behavior.
