# WhatsApp Inbox Message Visibility Fix - 2026-05-09

## Summary

Fixed a WhatsApp workspace issue where an outbound message was delivered and visible in the sidebar preview, but the selected chat body stayed blank.

## Symptoms

- Sidebar preview showed the last outbound message.
- The chat header selected the expected customer.
- The message area rendered the wallpaper but no message bubbles.
- Delivery to the customer still succeeded.

## Root Cause

The issue was a read/display mismatch rather than a delivery failure:

- `getConversations` grouped latest messages by `remoteJid` only. In `All` sessions mode, the same customer JID can exist under multiple WhatsApp sessions, so one session's latest message could be attached to another contact row.
- `WhatsAppMessageHandler.getMessages` queried an exact `remoteJid`, so a device-suffixed phone JID could miss normalized stored messages.
- `WhatsAppChat` built the virtualizer from `visibleMessages`, but passed `messages` to `ChatWindow`, leaving room for render/index drift when non-visible records such as reactions are present.

## Fix

- Group latest inbox messages by `sessionId + remoteJid`.
- Map last-message previews back to contacts with the same `sessionId:jid` key.
- Resolve message history by raw and normalized phone JIDs while leaving linked-device `@lid` JIDs exact.
- Pass `visibleMessages` into `ChatWindow`.

## Verification

```bash
cd backend
npx jest tests/controller/whatsappController.getConversations.test.js tests/services/whatsappContactIdentity.test.js tests/services/WhatsAppMessageHandler.markAsRead.test.js tests/services/WhatsAppMessageHandler.getMessages.test.js --runInBand --testTimeout=30000
npm run check:syntax
```

- `frontend: npm run build`
- `repo: node scripts/verify-docs.js`
- `scripts: "C:\Program Files\Git\bin\bash.exe" -n deploy.sh`
- `scripts: "C:\Program Files\Git\bin\bash.exe" -n backend/deploy.sh`

Frontend production build completed successfully. Non-blocking warnings remain for large Vite chunks and runtime-resolved Geist font files.

## Deployment Notes

- No database migration is required.
- The production deploy script is still `deploy.sh`.
- Pushes to `main` trigger `.github/workflows/deploy.yml`, which performs the production SSH deploy through GitHub secrets.
- Direct workstation SSH access to `root@153.92.223.119` is still blocked with `Permission denied (publickey,password)`, so local script-based deployment cannot run from this workstation yet.
