# WhatsApp contact identity fallback

## Context

Production PM2 logs on 2026-05-07 showed repeated `PrismaClientValidationError`
failures from `services/whatsapp/WhatsAppManager.js` while upserting
`WhatsAppContact` records.

Baileys can emit linked-device JIDs such as `14805138174180@lid`. Those IDs do
not always include a real `@s.whatsapp.net` phone JID. The Prisma model requires
`WhatsAppContact.phoneNumber`, so the previous `null` value caused contact
upserts to fail and noisy production logs.

## Change

`services/whatsapp/contactIdentity.js` now centralizes contact identity
normalization:

- phone JIDs continue to normalize to digits plus `@s.whatsapp.net`
- linked-device JIDs are kept as `@lid` and receive `phoneNumber: "lid:<id>"`
- group JIDs are kept as `@g.us` and receive `phoneNumber: "group:<id>"`

The fallback values are stable non-phone contact keys. They satisfy the existing
required schema field without pretending that a linked-device or group ID is a
human phone number.

## Verification

Run:

```bash
npx jest tests/services/whatsappContactIdentity.test.js --runInBand --testTimeout=30000
```
