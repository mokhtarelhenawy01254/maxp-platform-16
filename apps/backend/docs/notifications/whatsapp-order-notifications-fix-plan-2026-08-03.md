# ╪«╪╖╪⌐ ╪º┘ä╪Ñ╪╡┘ä╪º╪¡ ╪º┘ä╪┤╪º┘à┘ä ΓÇö ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ┘ê╪º╪¬╪│╪º╪¿ ┘ä┘ä╪╖┘ä╪¿╪º╪¬ ┘ê╪¡╪º┘ä╪º╪¬ ╪º┘ä╪╖┘ä╪¿

**╪¬╪º╪▒┘è╪« ╪º┘ä╪Ñ┘å╪┤╪º╪í**: 2026-08-03
**╪º┘ä┘à╪ñ┘ä┘ü**: AI Audit (┘à╪▒╪º╪¼╪╣╪⌐ ╪┤╪º┘à┘ä╪⌐)
**╪º┘ä╪¡╪º┘ä╪⌐**: ┘à╪│┘ê╪»╪⌐ ┘à╪╣╪¬┘à╪»╪⌐ ┘ä┘ä╪¬┘å┘ü┘è╪░ ΓÇö ┘à╪«╪╡╪╡╪⌐ ┘ä┘Ç agent ╪¬┘å┘ü┘è╪░┘è
**╪ó╪«╪▒ ╪¬╪¡╪»┘è╪½**: 2026-08-03

---

## 0. ╪º┘é╪▒╪ú ┘ç╪░╪º ╪ú┘ê┘ä╪º┘ï (┘ä┘ä┘Ç agent ╪º┘ä┘à┘å┘ü┘æ╪░)

> ΓÜá∩╕Å **┘ä╪º ╪¬╪«┘ä╪╖ ╪¿┘è┘å ┘ç╪░┘ç ╪º┘ä╪«╪╖╪⌐ ┘ê╪«╪╖╪⌐ ╪º┘ä╪░╪º┘â╪▒╪⌐.** ┘ç╪░┘ç ╪º┘ä┘ê╪½┘è┘é╪⌐ ┘à╪╣┘å┘è╪⌐ ╪¿╪Ñ╪╡┘ä╪º╪¡ **╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ┘ê╪º╪¬╪│╪º╪¿ ┘ä┘ä╪╖┘ä╪¿╪º╪¬** (╪Ñ╪▒╪│╪º┘ä/╪Ñ╪╣╪º╪»╪⌐/╪¬┘â╪▒╪º╪▒/┘é┘ê╪º┘ä╪¿). ╪«╪╖╪⌐ ╪º┘ä╪░╪º┘â╪▒╪⌐ ╪º┘ä┘à┘å┘ü╪╡┘ä╪⌐ (`docs/infrastructure/production-memory-queue-remediation-plan.md`) ┘à╪╣┘å┘è╪⌐ ╪¿┘Ç **╪¬╪│╪▒┘è╪¿ ╪░╪º┘â╪▒╪⌐ Baileys + ╪╖╪º╪¿┘ê╪▒ ┘à╪▓╪º┘à┘å╪⌐ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪¿┘è┘å ╪º┘ä╪┤╪▒┘â╪º╪¬** (`OrderSyncQueue`/`syncQueueService`) ΓÇö ┘ê┘ç┘è ╪╖╪º╪¿┘ê╪▒ **┘à╪«╪¬┘ä┘ü ╪¬┘à╪º┘à╪º┘ï** ╪╣┘å `WhatsAppNotificationQueue` ╪º┘ä╪░┘è ╪¬╪╣╪º┘ä╪¼┘ç ┘ç╪░┘ç ╪º┘ä┘ê╪½┘è┘é╪⌐.

### 0.1 ┘â┘è┘ü ╪¬╪│╪¬╪«╪»┘à ┘ç╪░┘ç ╪º┘ä┘ê╪½┘è┘é╪⌐
- ┘â┘ä ┘à╪▒╪¡┘ä╪⌐ ┘à╪│╪¬┘é┘ä╪⌐ ┘ê┘è┘à┘â┘å ╪¬┘å┘ü┘è╪░┘ç╪º ╪╣┘ä┘ë ╪¡╪»╪⌐ (╪▒╪º╪¼╪╣ "╪¬╪▒╪¬┘è╪¿ ╪º┘ä╪¬┘å┘ü┘è╪░ ╪º┘ä┘à┘ê╪╡┘ë ╪¿┘ç" ┘ü┘è ┬º6).
- ┘â┘ä ┘à┘ç┘à╪⌐ ┘ä┘ç╪º: ╪º┘ä┘à┘ä┘ü/╪º┘ä╪│╪╖╪▒ ╪º┘ä╪»┘é┘è┘é╪î ╪º┘ä┘â┘ê╪» ╪º┘ä╪¡╪º┘ä┘è╪î ╪º┘ä┘â┘ê╪» ╪º┘ä┘à┘é╪¬╪▒╪¡╪î ┘à╪╣╪º┘è┘è╪▒ ╪º┘ä┘å╪¼╪º╪¡╪î ╪«╪╖╪⌐ ╪º┘ä╪¬╪▒╪º╪¼╪╣.
- **┘é╪¿┘ä ╪ú┘è ╪¬╪╣╪»┘è┘ä**╪î ╪┤╪║┘æ┘ä `node --check <file>` ╪╣┘ä┘ë ╪º┘ä┘à┘ä┘ü ╪¿╪╣╪» ┘â┘ä ╪¬╪║┘è┘è╪▒╪î ┘ê╪º╪«╪¬╪¿╪▒ ┘à╪¡┘ä┘è╪º┘ï.
- **╪¿╪╣╪» ┘â┘ä ┘à╪▒╪¡┘ä╪⌐**╪î ╪¡╪»┘æ╪½ ┬º8 (╪│╪¼┘ä ╪º┘ä╪¬┘é╪»┘à) ╪¿╪¬╪º╪▒┘è╪«/┘å╪¬┘è╪¼╪⌐ ╪º┘ä┘à┘ç╪º┘à ╪º┘ä┘à┘å╪¼╪▓╪⌐.
- ≡ƒƒí **┘à╪▒╪º╪¼╪╣╪⌐ ╪½╪º┘å┘è╪⌐ (2026-08-03)**: ╪╡╪¡┘æ╪¡╪¬ ╪ú╪«╪╖╪º╪í┘ï ╪¬┘é┘å┘è╪⌐ ┘ü┘è ╪º┘ä┘å╪│╪«╪⌐ ╪º┘ä╪ú┘ê┘ä┘ë (╪¬┘ê┘é┘è╪╣ `updateOrderStatus`╪î ╪¡┘é┘ê┘ä `Company`╪î mapping ╪º┘ä┘Ç enum╪î ╪º╪│┘à ╪º┘ä╪¼╪»┘ê┘ä╪î ┘à┘å╪╖┘é retry╪î guard ╪º┘ä╪¬╪»╪º╪«┘ä) ┘ê╪ú╪╢╪º┘ü╪¬ ┬º5.2 + ┬º5.3. ╪º╪¿╪¡╪½ ╪╣┘å ╪╣┘ä╪º┘à╪⌐ "≡ƒƒí ╪¬╪╡╪¡┘è╪¡ ┘à┘å ┘à╪▒╪º╪¼╪╣╪⌐ ╪½╪º┘å┘è╪⌐" ┘ü┘è ╪º┘ä┘å╪╡ ┘ä╪▒╪ñ┘è╪⌐ ┘â┘ä ╪¬╪╡╪¡┘è╪¡. **╪º┘ä╪ú┘â┘ê╪º╪» ┘é╪¿┘ä ╪º┘ä┘à╪▒╪º╪¼╪╣╪⌐ ╪º┘ä╪½╪º┘å┘è╪⌐ ┘â╪º┘å╪¬ ╪│╪¬┘â╪│╪▒ ╪º┘ä╪Ñ┘å╪¬╪º╪¼ ΓÇö ╪º╪│╪¬╪«╪»┘à ╪º┘ä╪ú┘â┘ê╪º╪» ╪º┘ä╪¡╪º┘ä┘è╪⌐ ┘ü┘é╪╖.**
- ≡ƒö┤ **┘à╪▒╪º╪¼╪╣╪⌐ ╪½╪º┘ä╪½╪⌐ (2026-08-03)**: ╪ú╪╢╪º┘ü╪¬ **┬º1.1-pre** ΓÇö ┘à╪┤┘â┘ä╪⌐ ╪¡╪º╪¼╪▓╪⌐ ╪¡╪▒╪¼╪⌐: `status: 'COMPLETED'` ┘é┘è┘à╪⌐ enum ╪║┘è╪▒ ╪╡╪º┘ä╪¡╪⌐ ╪¬╪│╪¿╪¿ ┘ü┘è╪▒┘ê╪│ ┘à╪▓╪»┘ê╪¼ ╪╣┘å╪» ╪¬┘ü╪╣┘è┘ä ╪º┘ä╪╖╪º╪¿┘ê╪▒. **┘è╪¼╪¿ ╪¬┘å┘ü┘è╪░ ┬º1.1-pre ┘é╪¿┘ä ┬º1.1 ┘ê╪Ñ┘ä╪º ╪º┘ä╪╣┘à┘è┘ä ┘è╪│╪¬┘ä┘à ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ┘à┘â╪▒╪▒╪⌐.** ╪º╪¿╪¡╪½ ╪╣┘å ╪╣┘ä╪º┘à╪⌐ "≡ƒö┤ ╪¬╪╡╪¡┘è╪¡ ┘à┘å ┘à╪▒╪º╪¼╪╣╪⌐ ╪½╪º┘ä╪½╪⌐".

### 0.2 ╪¡┘é╪º╪ª┘é ┘à╪ñ┘â╪»╪⌐ (┘ä╪º ╪¬╪╣╪¬┘à╪» ╪╣┘ä┘ë ╪º┘ü╪¬╪▒╪º╪╢╪º╪¬ ΓÇö ╪¬╪¡┘é┘é┘å╪º ┘à┘å┘ç╪º)
- Γ£à **BullMQ + ioredis ┘à╪½╪¿╪¬╪º┘å ┘ü╪╣┘ä╪º┘ï** ┘ü┘è `apps/backend/package.json` (`bullmq@^5.66.2`, `ioredis@^5.8.2`). ┘å┘à╪╖ ╪º┘ä╪º╪│╪¬╪«╪»╪º┘à ┘à┘ê╪¼┘ê╪» ┘ü┘è `services/queueService.js`.
- Γ£à **Redis ┘à┘Å╪╣╪»** ╪╣╪¿╪▒ `config/redis.js` (┘è╪»╪╣┘à `REDIS_URL` ╪ú┘ê `REDIS_HOST/PORT/PASSWORD`).
- Γ¥î **`processNotificationQueue()` ╪║┘è╪▒ ┘à╪│╪¬╪»╪╣┘ë ┘à┘å ╪ú┘è ┘à┘â╪º┘å** ┘ü┘è ╪º┘ä╪Ñ┘å╪¬╪º╪¼ ΓÇö verified (┘ä╪º `setInterval`╪î ┘ä╪º cron╪î ┘ä╪º route).
- Γ£à **`orderStatusAutoChangeCron` ┘à╪│╪¼┘æ┘ä** ┘ü┘è `server.js:1112-1113` ┘ä┘â┘å┘ç ┘è╪¬╪¼╪º┘ê╪▓ `orderService.updateOrderStatus`.
- Γ£à **╪«╪▒┘è╪╖╪⌐ ╪º┘ä╪¡╪º┘ä╪º╪¬** (`getWhatsAppOrderEventType` ┘ü┘è `orderService.js:26`) ╪¬╪▒╪│┘à **8 ╪¡╪º┘ä╪º╪¬ ┘ü┘é╪╖** ┘à┘å ╪ú╪╡┘ä 31 (enum `OrderStatus`).
- ≡ƒö┤ **(┘à╪▒╪º╪¼╪╣╪⌐ ╪½╪º┘ä╪½╪⌐)** `WhatsAppNotificationQueueStatus` enum (`schema.prisma:3625`) = `PENDING, PROCESSING, SENT, FAILED, CANCELLED` ΓÇö **┘ä╪º `COMPLETED`**. ┘ä┘â┘å `processNotificationQueue:3509` ┘è┘â╪¬╪¿ `'COMPLETED'` ΓåÆ ┘è╪▒┘à┘è enum error ╪╣┘å╪» ╪º┘ä╪¬┘ü╪╣┘è┘ä ΓåÆ ┘ü┘è╪▒┘ê╪│ ┘à╪▓╪»┘ê╪¼. (╪º┘å╪╕╪▒ ┬º1.1-pre.)
- Γ£à **(┘à╪▒╪º╪¼╪╣╪⌐ ╪½╪º┘ä╪½╪⌐)** `orderService` ┘ç┘ê **singleton** (`module.exports = orderService` ┘ü┘è `:1717`)╪¢ ╪º┘ä┘å┘à╪╖ ╪º┘ä╪╡╪¡┘è╪¡ ┘ä┘ä╪º╪│╪¬╪»╪╣╪º╪í ┘ç┘ê `orderService.setCompanyId(companyId).updateOrderStatus(...)` (┘â┘à╪º ┘ü┘è `routes/orders.js:3031`).
- Γ£à **(┘à╪▒╪º╪¼╪╣╪⌐ ╪½╪º┘ä╪½╪⌐)** `ORDER_RETURNED`/`ORDER_REFUNDED`/`RETURNED_TO_SENDER`/`PARTIAL_REFUND`/`REFUND_PROCESSING` **┘à┘ê╪¼┘ê╪»╪⌐** ┘ü┘è ╪º┘ä┘Ç enums ╪º┘ä╪½┘ä╪º╪½╪⌐ (Templates/Logs/Queue) ╪╢┘à┘å ┘é╪│┘à "New Order Statuses" ΓÇö ┘ä╪º migration ┘à╪╖┘ä┘ê╪¿╪¢ ┘è┘â┘ü┘è mapping ┘ü┘è `getPersistedNotificationEventType`.

---

## 1. ╪º┘ä┘à┘ä╪«╪╡ ╪º┘ä╪¬┘å┘ü┘è╪░┘è

╪º┘â╪¬┘Å╪┤┘ü╪¬ **8 ┘à╪┤╪º┘â┘ä** ┘ü┘è ┘å╪╕╪º┘à ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ┘ê╪º╪¬╪│╪º╪¿ ┘ä┘ä╪╖┘ä╪¿╪º╪¬╪î ╪ú╪▒╪¿╪╣ ┘à┘å┘ç╪º ╪¡╪▒╪¼╪⌐. ╪º┘ä╪ú╪«╪╖╪▒ ╪ú┘å **╪╖╪º╪¿┘ê╪▒ ╪º┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬ (`WhatsAppNotificationQueue`) ┘à┘â╪¬┘ê╪¿ ╪¿╪º┘ä┘â╪º┘à┘ä ┘ä┘â┘å┘ç ┘à╪╣╪╖┘æ┘ä (dead code)** ΓÇö ╪ú┘è ╪Ñ╪┤╪╣╪º╪▒ ┘è╪»╪«┘ä ╪º┘ä╪╖╪º╪¿┘ê╪▒ (╪ú╪¿╪▒╪▓┘ç╪º: ┘â┘ä ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ **quiet-hours / ╪│╪º╪╣╪º╪¬ ╪º┘ä┘ç╪»┘ê╪í**) **┘ä╪º ┘è┘Å╪▒╪│┘ä ╪ú╪¿╪»╪º┘ï**. ┘ê╪¿╪º┘ä╪Ñ╪╢╪º┘ü╪⌐ ┘ä╪░┘ä┘â╪î ╪¬┘ü╪╣┘è┘ä ╪º┘ä╪╖╪º╪¿┘ê╪▒ ╪¿╪»┘ê┘å ╪Ñ╪╡┘ä╪º╪¡ **┬º1.1-pre** ┘è╪¡┘ê┘ä┘ç ╪Ñ┘ä┘ë ┘ü┘è╪▒┘ê╪│ ┘à╪▓╪»┘ê╪¼ (╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ┘à┘â╪▒╪▒╪⌐ ┘ä┘ä╪╣┘à┘è┘ä).

| # | ╪º┘ä┘à╪┤┘â┘ä╪⌐ | ╪º┘ä╪«╪╖┘ê╪▒╪⌐ | ╪º┘ä┘à╪▒╪¡┘ä╪⌐ |
|---|---------|---------|---------|
| 1-pre | ≡ƒåò `status: 'COMPLETED'` ┘é┘è┘à╪⌐ enum ╪║┘è╪▒ ╪╡╪º┘ä╪¡╪⌐ ┘ü┘è `processNotificationQueue:3509` ΓåÆ ┘ü┘è╪▒┘ê╪│ ┘à╪▓╪»┘ê╪¼ ╪╣┘å╪» ╪º┘ä╪¬┘ü╪╣┘è┘ä | ≡ƒö┤ ╪¡╪▒╪¼╪⌐ (╪¡╪º╪¼╪▓) | 1 |
| 1 | ╪╖╪º╪¿┘ê╪▒ ╪º┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ┘à┘è╪¬ (quiet-hours ╪¬╪╢┘è╪╣ ┘ä┘ä╪ú╪¿╪») | ≡ƒö┤ ╪¡╪▒╪¼╪⌐ | 1 |
| 2 | `orderStatusAutoChangeCron` ┘è╪¬╪¼╪º┘ê╪▓ `updateOrderStatus` | ≡ƒö┤ ╪¡╪▒╪¼╪⌐ | 1 |
| 3 | ╪«╪▒┘è╪╖╪⌐ ╪º┘ä╪¡╪º┘ä╪º╪¬ ┘å╪º┘é╪╡╪⌐ (`RETURNED`/`REFUNDED`/`EXCHANGED` ╪¬┘Å╪¬╪«╪╖┘ë ╪¿╪╡┘à╪¬) | ≡ƒö┤ ╪¡╪▒╪¼╪⌐ | 2 |
| 4 | ┘ç╪º╪▒╪»┘â┘ê╪» ╪╣┘ä╪º┘à╪⌐ "Mokhtar Elhenawy" + ╪º┘ä╪▒┘ê╪º╪¿╪╖ (multi-tenant) | ≡ƒö┤ ╪¡╪▒╪¼╪⌐ | 2 |
| 5 | ┘à╪│╪º╪▒ ╪Ñ╪┤╪╣╪º╪▒ ┘à╪▓╪»┘ê╪¼ ┘è╪╣╪¬┘à╪» ╪╣┘ä┘ë ┘å╪º┘ü╪░╪⌐ 10╪½ ┘ü┘é╪╖ | ≡ƒƒá ╪╣╪º┘ä┘è╪⌐ | 3 |
| 6 | ╪º┘ä┘Ç dedup ┘à┘å╪│┘ê╪« ┘ü┘è 4 ╪ú┘à╪º┘â┘å ╪¿┘à┘å╪╖┘é ┘à╪¬┘å╪º┘é╪╢ | ≡ƒƒá ╪╣╪º┘ä┘è╪⌐ | 3 |
| 7 | ┘ä╪º retry ┘ä┘ä╪Ñ╪▒╪│╪º┘ä ╪º┘ä┘ü┘ê╪▒┘è | ≡ƒƒá ╪╣╪º┘ä┘è╪⌐ | 4 |
| 8 | ┘é┘ê╪º┘ä╪¿ ╪╣╪▒╪¿┘è╪⌐ ┘ü┘é╪╖ + 3 ╪╖╪¿┘é╪º╪¬ + ┘à┘ä┘ü 4206 ╪│╪╖╪▒ | ≡ƒƒí ╪╡┘è╪º┘å╪⌐ | 5 |

---

## 2. ╪«╪▒┘è╪╖╪⌐ ╪º┘ä┘å╪╕╪º┘à (┘à╪▒╪¼╪╣ ╪│╪▒┘è╪╣)

### 2.1 ╪º┘ä┘à┘ä┘ü╪º╪¬ ╪º┘ä╪ú╪│╪º╪│┘è╪⌐
| ╪º┘ä┘à┘ä┘ü | ╪º┘ä╪»┘ê╪▒ |
|------|------|
| `services/whatsapp/WhatsAppNotificationService.js` (4206 ╪│╪╖╪▒) | ╪º┘ä┘à┘å╪│┘æ┘é ╪º┘ä╪▒╪ª┘è╪│┘è: ┘é┘ê╪º┘ä╪¿ + ╪Ñ╪▒╪│╪º┘ä + ┘à┘ê╪º╪▓┘å╪⌐ ╪¼┘ä╪│╪º╪¬ + quiet-hours + ╪╖╪º╪¿┘ê╪▒ + ┘â┘ä domain senders |
| `services/orderService.js` | `updateOrderStatus` (L859) + `updateGuestOrderStatus` (L1284) ΓÇö ┘è╪¡┘ê┘è╪º┘å ╪º┘ä┘Ç fire-and-forget send |
| `services/orderWorkflowService.js` | ┘à╪│╪º╪▒ ╪º┘ä╪┤╪║┘æ╪º┘ä╪⌐ ╪º┘ä┘à╪¬┘é╪»┘à╪⌐ ╪º┘ä╪¿╪»┘è┘ä (`sendWorkflowNotification` L529) |
| `services/whatsapp/WhatsAppInteractionService.js` | ╪▒╪»┘ê╪» ╪ú╪▓╪▒╪º╪▒ ╪º┘ä╪╣┘à┘è┘ä (`confirm_order_`, `set_status_...`) ΓåÆ ╪Ñ╪╣╪º╪»╪⌐ ╪»╪«┘ê┘ä ┘ä┘Ç `updateOrderStatus` |
| `cron/orderStatusAutoChangeCron.js` | ╪¬╪║┘è┘è╪▒ ╪¡╪º┘ä╪⌐ ╪¬┘ä┘é╪º╪ª┘è (┘è╪¬╪¼╪º┘ê╪▓ ╪º┘ä╪«╪»┘à╪⌐) |
| `controller/orderStatusController.js` | ╪▓╪▒╪╣ ┘é┘ê╪º┘ä╪¿ ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è╪⌐ (`seedDefaultOrderTemplates` L928) |

### 2.2 ┘å┘é╪º╪╖ ╪»╪«┘ê┘ä ╪¬╪║┘è┘è╪▒ ╪º┘ä╪¡╪º┘ä╪⌐ (┘â┘ä┘ç╪º ┘è╪¼╪¿ ╪ú┘å ╪¬┘à╪▒┘æ ╪¿┘Ç `updateOrderStatus`)
- `POST /order-workflow/change-status` ΓåÆ `routes/orderWorkflowRoutes.js:207`
- `PATCH /api/.../orders-enhanced/:id/status` ΓåÆ `routes/enhancedOrders.js:697`
- `PATCH /:orderNumber/status` ΓåÆ `routes/orders.js:4574`
- `POST /simple/:orderNumber/status` ΓåÆ `routes/orders.js:2822`
- `POST /bulk/status` ΓåÆ `routes/orders.js:5103` ┘ê `/bulk/status/by-filters` ΓåÆ `:5172`

### 2.3 ┘å┘à╪º╪░╪¼ ┘é╪º╪╣╪»╪⌐ ╪º┘ä╪¿┘è╪º┘å╪º╪¬ ╪░╪º╪¬ ╪º┘ä╪╡┘ä╪⌐
- `WhatsAppNotificationQueue` (`schema.prisma:7138`) ΓÇö ╪º┘ä╪╖╪º╪¿┘ê╪▒ ╪º┘ä┘à╪╣╪╖┘æ┘ä
- `WhatsAppNotificationLog` (`schema.prisma:7090`) ΓÇö ╪│╪¼┘ä ╪º┘ä╪Ñ╪▒╪│╪º┘ä (┘à╪╡╪»╪▒ ╪º┘ä┘Ç dedup)
- `WhatsAppNotificationTemplate` (`schema.prisma:7317`) ΓÇö ╪º┘ä┘é┘ê╪º┘ä╪¿ ┘ä┘â┘ä ╪┤╪▒┘â╪⌐
- `WhatsAppNotificationSettings` (`schema.prisma:~7200`) ΓÇö ┘à┘Å╪╣┘ä┘æ┘à ╪╣┘ä┘è┘ç╪º `UNUSED - Planned feature` ┘ä┘â┘å `scheduleNotification` ┘è┘é╪▒╪ñ┘ç╪º ┘ü╪╣┘ä╪º┘ï
- `OrderStatusConfig` (`schema.prisma:8740`) ΓÇö ╪¡┘é┘ä `notifyCustomer Boolean @default(false)`

---

## 3. ╪º┘ä┘à╪▒╪¡┘ä╪⌐ 1: ╪º┘ä╪Ñ╪╡┘ä╪º╪¡╪º╪¬ ╪º┘ä╪¡╪▒╪¼╪⌐ (╪ú╪╣┘ä┘ë ╪ú┘ê┘ä┘ê┘è╪⌐)

### ≡ƒö┤ 1.1-pre ╪Ñ╪╡┘ä╪º╪¡ ┘é┘è┘à╪⌐ enum ╪║┘è╪▒ ╪╡╪º┘ä╪¡╪⌐ ┘ü┘è `processNotificationQueue` (╪┤╪▒╪╖ ╪¡╪º╪¼╪▓)

> ≡ƒåò **╪ú┘Å╪╢┘è┘ü ┘à┘å ┘à╪▒╪º╪¼╪╣╪⌐ ╪½╪º┘ä╪½╪⌐ (2026-08-03)** ΓÇö **┘è╪¼╪¿ ╪¬┘å┘ü┘è╪░┘ç ┘é╪¿┘ä ┬º1.1**╪î ┘ê╪Ñ┘ä╪º ┘è╪¬╪¡┘ê┘ä ╪¬┘ü╪╣┘è┘ä ╪º┘ä╪╖╪º╪¿┘ê╪▒ ╪Ñ┘ä┘ë **┘ü┘è╪▒┘ê╪│ ┘à╪▓╪»┘ê╪¼** (╪Ñ╪┤╪╣╪º╪▒ + ╪¬┘â╪▒╪º╪▒ ┘ä┘ä╪╣┘à┘è┘ä).

**╪º┘ä╪¼╪░╪▒**: `processNotificationQueue` ┘ü┘è `WhatsAppNotificationService.js:3509` ┘è┘â╪¬╪¿ `status: 'COMPLETED'` ╪╣┘å╪» ┘å╪¼╪º╪¡ ╪º┘ä╪Ñ╪▒╪│╪º┘ä:
```js
// ╪¬╪¡╪»┘è╪½ ╪º┘ä╪╖╪º╪¿┘ê╪▒
await prisma.whatsAppNotificationQueue.update({
  where: { id: notification.id },
  data: { status: 'COMPLETED', processedAt: new Date() }   // ΓåÉ :3509
});
```

┘ä┘â┘å `WhatsAppNotificationQueueStatus` enum (`schema.prisma:3625`) ┘è╪¡╪¬┘ê┘è ┘ü┘é╪╖ ╪╣┘ä┘ë:
```
PENDING, PROCESSING, SENT, FAILED, CANCELLED   ΓåÉ ┘ä╪º ┘è┘ê╪¼╪» COMPLETED
```

**╪º┘ä┘å╪¬┘è╪¼╪⌐ ╪º┘ä┘â╪º╪▒╪½┘è╪⌐ ╪╣┘å╪» ╪¬┘ü╪╣┘è┘ä ┬º1.1**:
1. ┘è┘å╪¼╪¡ ╪º┘ä╪Ñ╪▒╪│╪º┘ä ΓåÆ ┘è┘Å┘â╪¬╪¿ ╪╡┘ü ╪º┘ä┘Ç log ╪¿┘Ç `status: 'SENT'` (`:3500`) ╪¿┘å╪¼╪º╪¡.
2. ╪¬╪¡╪»┘è╪½ ╪º┘ä╪╖╪º╪¿┘ê╪▒ ╪Ñ┘ä┘ë `'COMPLETED'` **┘è╪▒┘à┘è enum error** (Prisma validation).
3. ╪º┘ä╪«╪╖╪ú ┘è┘Å┘ä╪¬┘é╪╖ ┘ü┘è ╪º┘ä┘Ç catch (`:3514`) ┘â┘ü╪┤┘ä ΓåÆ `retryCount++` + ╪Ñ╪╣╪º╪»╪⌐ ╪¼╪»┘ê┘ä╪⌐ `PENDING` ╪¿╪╣╪» 5 ╪»┘é╪º╪ª┘é.
4. ╪º┘ä┘Ç worker ┘è╪╣┘è╪» ╪º┘ä┘à╪╣╪º┘ä╪¼╪⌐ ╪¿╪╣╪» 5 ╪»┘é╪º╪ª┘é ΓåÆ **╪º┘ä╪▒╪│╪º┘ä╪⌐ ╪¬┘Å╪╣╪º╪» ┘ä┘ä╪╣┘à┘è┘ä ┘ü╪╣┘ä┘è┘ï╪º** (╪º┘ä╪│╪¼┘ä ╪º┘ä┘Ç log ┘à┘â╪¬┘ê╪¿ SENT ┘ä┘â┘å ╪º┘ä╪╖╪º╪¿┘ê╪▒ ┘ä╪º ┘è╪╣╪▒┘ü).
5. ╪¬╪¬┘â╪▒╪▒ ╪º┘ä╪»╪º╪ª╪▒╪⌐ ╪¡╪¬┘ë `maxRetries` (3) ΓåÆ ╪º┘ä╪╣┘à┘è┘ä ┘è╪│╪¬┘ä┘à **╪¡╪¬┘ë 4 ┘å╪│╪«** ┘à┘å ┘å┘ü╪│ ╪º┘ä╪Ñ╪┤╪╣╪º╪▒.

**╪º┘ä╪Ñ╪╡┘ä╪º╪¡** (╪│╪╖╪▒ ┘ê╪º╪¡╪»╪î ╪¿╪»┘ê┘å migration):

**╪º┘ä┘à┘ä┘ü**: `apps/backend/services/whatsapp/WhatsAppNotificationService.js:3509`

**╪º┘ä┘â┘ê╪» ╪º┘ä╪¡╪º┘ä┘è**:
```js
data: { status: 'COMPLETED', processedAt: new Date() }
```

**╪º┘ä┘â┘ê╪» ╪¿╪╣╪» ╪º┘ä╪Ñ╪╡┘ä╪º╪¡**:
```js
// ≡ƒÜ¿ PRODUCTION-FIX (notifications-fix-plan ┬º1.1-pre):
// 'COMPLETED' ┘ä┘è╪│╪¬ ┘é┘è┘à╪⌐ ┘ü┘è WhatsAppNotificationQueueStatus enum (PENDING/PROCESSING/SENT/FAILED/CANCELLED).
// ╪º╪│╪¬╪«╪»┘à 'SENT' ┘ä╪¬╪╖╪º╪¿┘é ╪»┘ä╪º┘ä╪⌐ ╪º┘ä┘Ç log row (:3500) ┘ê┘ä╪¬┘ü╪º╪»┘è enum error ΓåÆ retry ┘ä╪º┘å┘ç╪º╪ª┘è ΓåÆ ╪Ñ╪╣╪º╪»╪⌐ ╪Ñ╪▒╪│╪º┘ä ┘à┘â╪▒╪▒.
data: { status: 'SENT', processedAt: new Date() }
```

#### ΓÜá∩╕Å ╪¬┘å╪¿┘è┘ç╪º╪¬
- **╪▒╪º╪¼╪╣ ╪º┘ä┘é╪▒╪º╪í╪º╪¬ ╪º┘ä╪ú╪«╪▒┘ë ┘ä┘Ç `status` ┘ü┘è ╪º┘ä╪╖╪º╪¿┘ê╪▒** ┘ä┘ä╪¬╪ú┘â╪» ┘à┘å ╪º╪¬╪│╪º┘é┘ç╪º ┘à╪╣ ╪º┘ä┘Ç enum: `:3433` (PENDING)╪î `:3449` (PROCESSING)╪î `:3521` (FAILED)╪î `:3528` (PENDING). ┘â┘ä┘ç╪º ╪╡╪º┘ä╪¡╪⌐ ΓÇö ┘ü┘é╪╖ `:3509` ╪«╪º╪╖╪ª╪⌐.
- **╪º╪¿╪¡╪½ ╪╣┘å ╪ú┘è ╪╕┘ç┘ê╪▒ ╪ó╪«╪▒ ┘ä┘Ç `'COMPLETED'`** ╪╣┘ä┘ë `whatsAppNotificationQueue`:
  ```bash
  grep -rn "status: 'COMPLETED'" apps/backend/services/whatsapp/ apps/backend/controller/
  ```

**┘à╪╣╪º┘è┘è╪▒ ╪º┘ä┘å╪¼╪º╪¡ ┬º1.1-pre**:
- [ ] `node --check` ╪╣┘ä┘ë ╪º┘ä┘à┘ä┘ü ╪│┘ä┘è┘à.
- [ ] ╪¿╪╣╪» ┬º1.1: ╪Ñ╪┤╪╣╪º╪▒ ╪╣╪¿╪▒ ╪º┘ä╪╖╪º╪¿┘ê╪▒ ┘è┘Å╪▒╪│┘ä **┘à╪▒╪⌐ ┘ê╪º╪¡╪»╪⌐ ┘ü┘é╪╖** (┘ä╪º ╪¬┘â╪▒╪º╪▒ ╪¡╪¬┘ë ╪¿╪╣╪» `maxRetries`).
- [ ] `whatsapp_notification_queue` ┘ä╪º ┘è╪¿┘é┘ë ╪╡┘ü┘ê┘ü `PENDING` ┘ä┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä┘à┘Å╪▒╪│┘ä╪⌐ ┘ü╪╣┘ä╪º┘ï.
- [ ] `processNotificationQueue` ┘ä╪º ┘è╪▒┘à┘è `PrismaClientValidationError` ╪¿╪┤╪ú┘å enum.

**╪«╪╖╪⌐ ╪º┘ä╪¬╪▒╪º╪¼╪╣ ┬º1.1-pre**: `git checkout -- services/whatsapp/WhatsAppNotificationService.js` (┘ä┘â┘å ┘ç╪░╪º ┘è╪╣┘è╪» ╪º┘ä┘ü┘è╪▒┘ê╪│╪î ┘ä╪░╪º ╪º┘ä╪¬╪▒╪º╪¼╪╣ ┘è╪╣┘å┘è **╪╣╪»┘à ╪¬┘ü╪╣┘è┘ä ┬º1.1** ╪ú┘è╪╢┘ï╪º).

---

### ≡ƒö┤ 1.1 ╪¬┘ü╪╣┘è┘ä ╪╖╪º╪¿┘ê╪▒ ╪º┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬ (`processNotificationQueue`)

**╪º┘ä╪¼╪░╪▒**: `processNotificationQueue()` ┘ü┘è `WhatsAppNotificationService.js:3413` ┘à┘â╪¬┘ê╪¿╪⌐ ╪¿╪º┘ä┘â╪º┘à┘ä ┘ä┘â┘å **┘ä╪º ╪¬┘Å╪│╪¬╪»╪╣┘ë**. `scheduleNotification()` (L2460) ┘è┘â╪¬╪¿ ╪╡┘ü┘ê┘ü╪º┘ï ┘ü┘è `WhatsAppNotificationQueue`╪î ┘ä┘â┘å ┘ä╪º ╪┤┘è╪í ┘è╪╣╪º┘ä╪¼┘ç╪º. ╪º┘ä┘å╪¬┘è╪¼╪⌐: ┘â┘ä ╪Ñ╪┤╪╣╪º╪▒ ┘è╪»╪«┘ä ╪º┘ä╪╖╪º╪¿┘ê╪▒ (╪«╪º╪╡╪⌐ **quiet-hours deferral** ┘ü┘è `:2035-2049`) **┘è┘Å┘å╪│┘ë ┘ä┘ä╪ú╪¿╪»**.

**╪º┘ä╪¡┘ä ╪º┘ä┘à┘é╪¬╪▒╪¡**: ╪º╪│╪¬╪«╪»┘à BullMQ ╪º┘ä┘à┘ê╪¼┘ê╪» ╪¿╪º┘ä┘ü╪╣┘ä (┘å┘ü╪│ ┘å┘à╪╖ `services/queueService.js`) ┘ä╪¬╪¼┘å┘æ╪¿ `setInterval` ╪º┘ä┘ç╪┤.

**╪º┘ä┘à┘ä┘ü ╪º┘ä╪¼╪»┘è╪»**: `apps/backend/services/whatsapp/notificationQueueWorker.js`

```js
/**
 * ≡ƒÜ¿ PRODUCTION-FIX (notifications-fix-plan ┬º1.1):
 * ╪╖╪º╪¿┘ê╪▒ ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ┘ê╪º╪¬╪│╪º╪¿ ΓÇö ┘à╪╣╪º┘ä╪¼╪⌐ WhatsAppNotificationQueue ╪╣╪¿╪▒ BullMQ.
 * ┘è╪¡┘ä ┘à╪┤┘â┘ä╪⌐ processNotificationQueue() ╪º┘ä┘à┘è╪¬╪⌐ ΓåÆ quiet-hours + ╪º┘ä┘à╪¼╪»┘ê┘ä╪⌐ ╪¬┘Å╪▒╪│┘ä ╪º┘ä╪ó┘å.
 *
 * ┘à╪▒╪¼╪╣ ╪º┘ä┘å┘à╪╖: services/queueService.js (BullMQ + ioredis ┘à╪½╪¿╪¬╪º┘å ╪¿╪º┘ä┘ü╪╣┘ä).
 */
const { Worker, QueueEvents } = require('bullmq');
const redisConfig = require('../../config/redis');
const { processNotificationQueue } = require('./WhatsAppNotificationService');

const QUEUE_NAME = 'whatsapp-notifications';

let worker = null;
let started = false;

function isRedisConfigured() {
  const env = process.env;
  return Boolean(
    env.REDIS_URL ||
    (env.REDIS_HOST && env.REDIS_HOST !== 'production-redis-host')
  );
}

/**
 * ┘à╪¡┘ü┘æ╪▓ (trigger) BullMQ ΓÇö ╪º┘ä┘Ç Worker ┘ç┘å╪º ┘ü┘é╪╖ "┘è┘ê┘é╪╕" ╪º┘ä┘à╪╣╪º┘ä╪¼ ╪º┘ä╪»┘ê╪▒┘è
 * ╪º┘ä╪░┘è ┘è┘ä╪¬┘é╪╖ PENDING ┘à┘å WhatsAppNotificationQueue.
 * ╪ú╪¿┘é┘è┘å╪º processNotificationQueue ┘â┘à╪╡╪»╪▒ ╪º┘ä╪¡┘é┘è┘é╪⌐ ╪º┘ä┘ê╪¡┘è╪» (┘ä╪º ╪¬┘â╪▒╪º╪▒ ┘à┘å╪╖┘é).
 */
function startNotificationQueueWorker() {
  if (started || !isRedisConfigured()) {
    if (!isRedisConfigured()) {
      console.warn('ΓÜá∩╕Å [NOTIF-QUEUE] Redis ╪║┘è╪▒ ┘à┘Å╪╣╪» ΓÇö ╪º┘ä╪╖╪º╪¿┘ê╪▒ ╪│┘è╪╣┘à┘ä ╪¿┘Ç fallback polling');
      startFallbackPolling();
    }
    return;
  }

  worker = new Worker(
    QUEUE_NAME,
    async (_job) => {
      await processNotificationQueue();
    },
    {
      connection: redisConfig,
      concurrency: 1,
      // ╪º┘ä┘à┘ç┘à╪⌐ ┘à╪¬┘â╪▒╪▒╪⌐ ┘â┘ä ╪»┘é┘è┘é╪⌐ (repeat) ΓÇö ╪¬╪╣╪º┘ä╪¼ PENDING ╪º┘ä┘à╪│╪¬╪¡┘é╪⌐ ┘ü┘é╪╖.
    }
  );

  worker.on('failed', (job, err) =>
    console.error(`Γ¥î [NOTIF-QUEUE] Job ${job?.id} failed:`, err.message)
  );
  worker.on('error', (err) =>
    console.error(`Γ¥î [NOTIF-QUEUE] Worker error:`, err.message)
  );

  // ╪¼╪»┘ê┘ä╪⌐ ╪¬┘â╪▒╪º╪▒┘è╪⌐: ╪»┘ü╪╣╪⌐ ┘â┘ä 60 ╪½╪º┘å┘è╪⌐
  const { Queue } = require('bullmq');
  const queue = new Queue(QUEUE_NAME, { connection: redisConfig });
  queue.add(
    'process-pending',
    {},
    {
      repeat: { pattern: '* * * * *' }, // ┘â┘ä ╪»┘é┘è┘é╪⌐
      removeOnComplete: 100,
      removeOnFail: 500
    }
  ).catch((e) => console.error('[NOTIF-QUEUE] schedule failed:', e.message));

  started = true;
  console.log('Γ£à [NOTIF-QUEUE] WhatsApp notification queue worker started');
}

/**
 * fallback: polling ╪¿╪│┘è╪╖ ╪¿╪»┘ê┘å Redis (┘è╪¡╪º┘â┘è ╪º┘ä╪│┘ä┘ê┘â ╪º┘ä┘é╪»┘è┘à ╪º┘ä┘à┘é╪╡┘ê╪»).
 * ╪º╪│╪¬╪«╪»┘à ┘ü┘è ╪º┘ä╪¿┘è╪ª╪º╪¬ ╪¿╪»┘ê┘å Redis ┘ü┘é╪╖.
 */
function startFallbackPolling() {
  if (started) return;
  const id = setInterval(async () => {
    try {
      await processNotificationQueue();
    } catch (e) {
      console.error('[NOTIF-QUEUE] fallback tick failed:', e.message);
    }
  }, 60000);
  id.unref?.();
  started = true;
  console.log('Γ£à [NOTIF-QUEUE] Fallback polling started (60s)');
}

async function stopNotificationQueueWorker() {
  if (worker) await worker.close();
  started = false;
}

module.exports = {
  startNotificationQueueWorker,
  stopNotificationQueueWorker
};
```

**╪º┘ä╪¬╪│╪¼┘è┘ä ┘ü┘è** `apps/backend/server.js` (╪¿╪╣╪» ~L1113╪î ┘é╪▒╪¿ ╪¿┘é┘è╪⌐ ╪º┘ä┘Ç crons):

```js
// ≡ƒÜ¿ PRODUCTION-FIX (notifications-fix-plan ┬º1.1): ┘ü╪╣┘æ┘ä ╪╖╪º╪¿┘ê╪▒ ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ┘ê╪º╪¬╪│╪º╪¿
try {
  const { startNotificationQueueWorker } = require('./services/whatsapp/notificationQueueWorker');
  startNotificationQueueWorker();
  console.log('Γ£à [NOTIF-QUEUE] WhatsApp notification queue worker registered');
} catch (err) {
  console.error('Γ¥î [NOTIF-QUEUE] Failed to start notification queue worker:', err.message);
}
```

#### ΓÜá∩╕Å ╪¬┘å╪¿┘è┘ç ╪ú┘à┘å┘è ┘ä┘ä┘à╪╣╪º┘ä╪¼ ╪º┘ä╪¡╪º┘ä┘è (╪╣┘è╪¿ ┘è╪¼╪¿ ╪Ñ╪╡┘ä╪º╪¡┘ç ╪ú╪½┘å╪º╪í ╪º┘ä╪¬┘ü╪╣┘è┘ä)
`processNotificationQueue` ╪º┘ä╪¡╪º┘ä┘è (`WhatsAppNotificationService.js:3413-3545`) **┘ä╪º ┘è╪»╪╣┘à META_CLOUD** ΓÇö ┘è┘ü╪¬╪▒╪╢ Baileys ┘ü┘é╪╖ (`WhatsAppManager.getSession` + `WhatsAppMessageHandler.sendText`). ╪Ñ╪╡┘ä╪º╪¡:
- ╪º╪│╪¬╪¿╪»┘ä ┘à┘å╪╖┘é ╪º┘ä╪Ñ╪▒╪│╪º┘ä ╪»╪º╪«┘ä ╪º┘ä┘à╪╣╪º┘ä╪¼ ╪¿╪º╪│╪¬╪»╪╣╪º╪í `sendNotification({...})` ╪º┘ä╪▒╪ª┘è╪│┘è (╪º┘ä╪░┘è ┘ü┘è┘ç DB fallback + META_CLOUD) ╪¿╪»┘ä╪º┘ï ┘à┘å `sendText` ╪º┘ä┘à╪¿╪º╪┤╪▒╪î **╪ú┘ê** ╪ú╪╢┘ü ┘ü╪▒╪╣ META_CLOUD ╪╡╪▒╪º╪¡╪⌐┘ï ┘é╪¿┘ä ┘â╪¬┘ä╪⌐ `sendText`.
- ╪▒╪º╪¼╪╣ `sendNotification` (L~2010) ┘ä┘ä┘å┘à╪╖ ╪º┘ä┘â╪º┘à┘ä (sticky session + Meta special-casing).
- ≡ƒƒí **╪¬╪╡╪¡┘è╪¡ ┘à┘å ┘à╪▒╪º╪¼╪╣╪⌐ ╪½╪º┘å┘è╪⌐**: ┘ç╪░╪º ╪º┘ä╪Ñ╪╡┘ä╪º╪¡ ┘ç┘ê ┘å┘ü╪│┘ç "╪º┘ä╪¼╪▓╪í ╪ú" ┘à┘å ┬º4.1 (┘ü╪╡┘ä ╪¡┘ä ╪º┘ä╪¼┘ä╪│╪⌐ ╪╣┘å ╪º┘ä╪¼╪»┘ê┘ä╪⌐). ┘è┘å╪╡╪¡ ╪¿╪»┘à╪¼┘ç┘à╪º ┘ü┘è ┘à┘ç┘à╪⌐ ┘ê╪º╪¡╪»╪⌐.

#### ΓÜá∩╕Å ╪¬┘å╪¿┘è┘ç: ╪¡┘à╪º┘è╪⌐ ┘à┘å ╪º┘ä╪¬╪»╪º╪«┘ä (re-entrancy guard)
≡ƒƒí **┘à┘å ┘à╪▒╪º╪¼╪╣╪⌐ ╪½╪º┘å┘è╪⌐**: ┘ä┘ê ╪¼┘ê┘ä╪⌐ `processNotificationQueue` ╪¬╪¼╪º┘ê╪▓╪¬ 60╪½ (fallback polling ┘â┘ä 60╪½╪î ╪ú┘ê BullMQ repeat job)╪î ┘é╪» ╪¬╪¬╪»╪º╪«┘ä ╪¼┘ê┘ä╪¬╪º┘å ╪╣┘ä┘ë ┘å┘ü╪│ ╪º┘ä╪╡┘ü┘ê┘ü. ╪ú╪╢┘ü guard ╪»╪º╪«┘ä `processNotificationQueue` ┘å┘ü╪│┘ç╪º:
```js
// ≡ƒ¢í∩╕Å notifications-fix-plan ┬º1.1: ┘à┘å╪╣ ╪º┘ä╪¬╪»╪º╪«┘ä
let processingQueue = false;
async function processNotificationQueue() {
  if (processingQueue) {
    console.log('[WHATSAPP-QUEUE] Already processing, skipping tick');
    return;
  }
  processingQueue = true;
  try {
    // ... ╪º┘ä┘à┘å╪╖┘é ╪º┘ä╪¡╪º┘ä┘è ...
  } finally {
    processingQueue = false;
  }
}
```
┘à┘ä╪º╪¡╪╕╪⌐: ╪º┘ä╪¡╪º╪▒╪│ ╪º┘ä╪¡╪º┘ä┘è `isRunning` ┘ü┘è ╪º┘ä┘â╪▒┘ê┘å (┬º1.2) ┘ä╪º ┘è╪║╪╖┘è ┘ç╪░╪º ΓÇö ┘ç╪░╪º ╪¡╪º╪▒╪│ ╪╣┘ä┘ë ┘à╪│╪¬┘ê┘ë ╪º┘ä┘à╪╣╪º┘ä╪¼ ┘å┘ü╪│┘ç.

**┘à╪╣╪º┘è┘è╪▒ ╪º┘ä┘å╪¼╪º╪¡ ┬º1.1**:
- [ ] ╪¿╪╣╪» ╪¬┘ü╪╣┘è┘ä `quietHoursEnabled` ┘à╪╣ ┘å╪º┘ü╪░╪⌐ ┘ä┘è┘ä┘è╪⌐╪î ╪Ñ╪┤╪╣╪º╪▒ ┘à┘Å╪¼╪»┘ê┘ä ┘ü┘è ╪º┘ä╪╖╪º╪¿┘ê╪▒ ┘è┘Å╪▒╪│┘ä **╪«┘ä╪º┘ä 60 ╪½╪º┘å┘è╪⌐** ╪¿╪╣╪» ╪º┘å╪¬┘ç╪º╪í ┘å╪º┘ü╪░╪⌐ ╪º┘ä┘ç╪»┘ê╪í.
- [ ] ╪¼╪»┘ê┘ä `whatsapp_notification_queue` ┘ä╪º ┘è╪¬╪▒╪º┘â┘à ╪╡┘ü┘ê┘ü `PENDING` ┘à╪│╪¬╪¡┘é╪⌐ (`scheduledAt <= now()`) ┘ä╪ú┘â╪½╪▒ ┘à┘å ╪»┘é┘è┘é╪¬┘è┘å.
- [ ] ┘ä╪º ╪¬╪ú╪½┘è╪▒ ╪╣┘ä┘ë ╪º┘ä╪Ñ╪▒╪│╪º┘ä ╪º┘ä┘ü┘ê╪▒┘è (sync) ╪«╪º╪▒╪¼ ╪º┘ä┘Ç quiet-hours.
- [ ] ╪│╪¡╪¿ Redis: ┘ä┘ê Redis ┘à┘Å╪╖┘ü╪ú╪î fallback polling ┘è╪╣┘à┘ä ┘ê┘è╪│╪¼┘æ┘ä ╪¬╪¡╪░┘è╪▒.
- [ ] ≡ƒƒí ┘ä╪º ╪¬╪»╪º╪«┘ä: ┘ä┘ê ╪¼┘ê┘ä╪⌐ > 60╪½╪î ╪º┘ä╪¼┘ê┘ä╪⌐ ╪º┘ä╪¬╪º┘ä┘è╪⌐ ╪¬╪¬╪«╪╖┘ë ╪¿┘å╪º╪í┘ï ╪╣┘ä┘ë `processingQueue`.

**╪«╪╖╪⌐ ╪º┘ä╪¬╪▒╪º╪¼╪╣ ┬º1.1**: ╪╣┘ä┘æ┘é ┘â╪¬┘ä╪⌐ ╪º┘ä┘Ç require ┘ü┘è `server.js` + ╪º╪¡╪░┘ü `notificationQueueWorker.js`. ┘ä╪º ╪¬╪ú╪½┘è╪▒ ╪╣┘ä┘ë ╪º┘ä╪Ñ┘å╪¬╪º╪¼ (╪º┘ä╪╖╪º╪¿┘ê╪▒ ┘â╪º┘å ┘à┘è╪¬╪º┘ï ╪ú╪╡┘ä╪º┘ï).

---

### ≡ƒö┤ 1.2 ╪Ñ╪╡┘ä╪º╪¡ `orderStatusAutoChangeCron` ┘ä┘è┘à╪▒┘æ ╪¿┘Ç `updateOrderStatus`

**╪º┘ä╪¼╪░╪▒**: `cron/orderStatusAutoChangeCron.js:95` ┘è╪│╪¬╪«╪»┘à `prisma.order.updateMany` ╪«╪º┘à ΓåÆ ┘è╪¬╪¼╪º┘ê╪▓ ┘â┘ä ╪┤┘è╪í: ┘ä╪º ╪Ñ╪┤╪╣╪º╪▒╪º╪¬╪î ┘ä╪º `metadata.preparationStatus` sync╪î ┘ä╪º commission/loyalty/invoice.

**╪º┘ä╪¡┘ä**: ╪º╪│╪¬╪¿╪»┘ä ╪º┘ä┘Ç `updateMany` ╪º┘ä╪¼┘à╪º╪╣┘è ╪¿╪¡┘ä┘é╪⌐ ╪¬┘å╪º╪»┘è `orderService.updateOrderStatus` ┘ä┘â┘ä ╪╖┘ä╪¿.

**╪º┘ä┘à┘ä┘ü**: `apps/backend/cron/orderStatusAutoChangeCron.js` ΓÇö ╪º╪│╪¬╪¿╪»┘ä ┘â╪¬┘ä╪⌐ `// Batch update` (L82-100).

**╪º┘ä┘â┘ê╪» ╪º┘ä╪¡╪º┘ä┘è** (L82-100):
```js
// Batch update
await prisma.order.updateMany({
  where: {
    id: { in: orders.map(o => o.id) },
    status: rule.fromStatus,
  },
  data: {
    status: rule.toStatus,
    updatedAt: now,
  },
});

// Log status history for each order
const historyEntries = orders.map(order => ({ ... }));
await prisma.orderStatusHistory.createMany({ data: historyEntries, skipDuplicates: true });
```

#### ≡ƒö┤ ╪º┘ä╪¬┘ê┘é┘è╪╣ ╪º┘ä╪╡╪¡┘è╪¡ (╪¬╪╡╪¡┘è╪¡ ┘à┘å ┘à╪▒╪º╪¼╪╣╪⌐ ╪½╪º┘å┘è╪⌐)

> ΓÜá∩╕Å **╪¬╪¡╪░┘è╪▒**: ╪º┘ä╪¬┘ê┘é┘è╪╣ ╪º┘ä┘ü╪╣┘ä┘è ┘ä┘Ç `updateOrderStatus` (`orderService.js:870`) ┘ç┘ê:
> ```js
> updateOrderStatus(orderNumber, companyId, status, notes = null, userId = null,
>                   userName = null, existingOrderObject = null, isOverride = false,
>                   options = null)
> ```
> ╪¡┘è╪½ `options` ┘è╪»╪╣┘à **┘ü┘é╪╖** `{ skipCallAttemptGuard, skipTransitionValidation }`. ┘ä╪º ╪¬┘ê╪¼╪» ╪«┘è╪º╪▒╪º╪¬ `changedBy`/`reason`/`skipNotifications`. ╪º┘ä┘å╪│╪«╪⌐ ╪º┘ä╪ú┘ê┘ä┘ë ┘à┘å ┘ç╪░┘ç ╪º┘ä╪«╪╖╪⌐ ╪º╪│╪¬╪«╪»┘à╪¬ ╪¬┘ê┘é┘è╪╣┘ï╪º ╪½┘ä╪º╪½┘è┘ï╪º ╪«╪º╪╖╪ª┘ï╪º (`updateOrderStatus(order.id, rule.toStatus, {...})`) ΓÇö **┘ä╪º ╪¬╪│╪¬╪«╪»┘à┘ç**.
>
> ┘â╪░┘ä┘â `orderService` ┘ç┘ê **class instance method** (┘è╪│╪¬╪«╪»┘à `this.getPrisma()`)╪î ┘ä╪░╪º ┘è╪¼╪¿ ╪¬┘à╪▒┘è╪▒ `companyId` ╪ú┘ê ╪╢╪¿╪╖┘ç ╪╣╪¿╪▒ `orderService.setCompanyId(companyId)` ┘é╪¿┘ä ╪º┘ä╪º╪│╪¬╪»╪╣╪º╪í. ╪¬╪¡┘é┘é ┘à┘å ┘â┘è┘ü ┘è╪│╪¬╪»╪╣┘è┘ç ╪º┘ä┘à╪¬╪╡┘ä┘ê┘å ╪º┘ä╪¡╪º┘ä┘è┘ê┘å (┘à╪½┘ä `services/codDepositService.js:227`).

**╪º┘ä┘â┘ê╪» ╪¿╪╣╪» ╪º┘ä╪Ñ╪╡┘ä╪º╪¡** (┘à╪╖╪º╪¿┘é ┘ä┘ä╪¬┘å┘ü┘è╪░ ╪º┘ä┘ü╪╣┘ä┘è ┘ü┘è `cron/orderStatusAutoChangeCron.js`):
```js
// ≡ƒÜ¿ PRODUCTION-FIX (notifications-fix-plan ┬º1.2):
// ┘à╪▒┘æ ╪╣╪¿╪▒ updateOrderStatus ┘ä╪╢┘à╪º┘å: ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ┘ê╪º╪¬╪│╪º╪¿ + metadata.preparationStatus +
// commission/loyalty/invoice side-effects.
// ┘à┘ä╪º╪¡╪╕╪⌐ (╪¬╪╡╪¡┘è╪¡ ┬º3.1): updateOrderStatus ┘è┘â╪¬╪¿ OrderStatusHistory ┘à╪¬╪»╪º╪«┘ä╪º┘ï
// (statusHistory.create ╪»╪º╪«┘ä order.update ΓÇö orderService.js) ΓÇö ┘ä╪░╪º ┘ä╪º createMany ┘à┘å┘ü╪╡┘ä
// ┘ä╪¬╪¼┘å┘æ╪¿ ╪╡┘ü┘æ┘è history ┘à┘â╪▒╪▒┘è┘å. changedBy = 'SYSTEM_AUTO' ╪╣╪¿╪▒ userId.
const orderService = require('../services/orderService');   // singleton (module.exports = orderService)
const reason = `Auto-changed by rule: after ${rule.waitTime} ${rule.timeUnit}`;

let updated = 0;
let failed = 0;

for (const order of orders) {
  try {
    await orderService.setCompanyId(companyId).updateOrderStatus(
      order.id,           // orderNumber (┘è┘é╪¿┘ä id ╪ú┘ê orderNumber)
      companyId,          // companyId
      rule.toStatus,      // status
      reason,             // notes
      'SYSTEM_AUTO',      // userId ΓåÆ changedBy ┘ü┘è OrderStatusHistory
      'System Automation',// userName
      null,               // existingOrderObject
      false,              // isOverride
      {                   // options
        skipTransitionValidation: true, // ╪º┘ä┘é╪º╪╣╪»╪⌐ ┘à┘ê╪½┘ê┘é╪⌐╪¢ ╪¬╪¼╪º┘ê╪▓ ┘ü╪¡╪╡ allowedNextStatuses
        skipCallAttemptGuard: true,     // ┘ä╪º ┘è┘ê╪¼╪» ┘à┘â╪º┘ä┘à╪⌐ ╪╣┘à┘è┘ä ┘ü┘è ╪º┘ä╪ú╪¬┘à╪¬╪⌐
      }
    );
    updated++;
  } catch (err) {
    failed++;
    console.error(`[ORDER-STATUS-AUTO-CHANGE-CRON] Order ${order.id} failed:`, err.message);
  }
}

console.log(`[ORDER-STATUS-AUTO-CHANGE-CRON] Rule ${rule.fromStatus}ΓåÆ${rule.toStatus}: ${updated} ok, ${failed} failed`);
```

> ≡ƒÜ¿ **╪¬┘å╪¿┘è┘ç (╪¬╪╡╪¡┘è╪¡ ┘à┘å ╪º┘ä╪¬┘å┘ü┘è╪░ ΓÇö ┘à┘ç┘à ╪¼╪»╪º┘ï)**: `updateOrderStatus` ┘è┘â╪¬╪¿ `OrderStatusHistory` **┘à╪¬╪»╪º╪«┘ä╪º┘ï** ╪╣╪¿╪▒ `statusHistory: { create: {...} }` ╪»╪º╪«┘ä `prisma.order.update` (╪º┘å╪╕╪▒ `orderService.js` ~L1065-1073). **┘ä╪º ╪¬╪│╪¬╪«╪»┘à `createMany` ┘à┘å┘ü╪╡┘ä** ┘ê╪Ñ┘ä╪º ╪│╪¬┘å╪¬╪¼ ╪╡┘ü┘ê┘ü history ┘à┘â╪▒╪▒╪⌐. ┘à╪▒┘æ╪▒ ┘ç┘ê┘è╪⌐ ╪º┘ä┘à┘å┘ü┘æ╪░ ╪╣╪¿╪▒ ╪º┘ä┘à╪╣╪º┘à┘ä `userId` (┘è╪╕┘ç╪▒ ┘â┘Ç `changedBy` ┘ü┘è ╪º┘ä┘Ç history) ΓÇö ┘è╪│╪¬╪«╪»┘à ╪º┘ä┘Ç cron `'SYSTEM_AUTO'` ┘ä┘ç╪░╪º ╪º┘ä╪║╪▒╪╢. ╪º┘ä┘å╪│╪«╪⌐ ╪º┘ä╪ú┘ê┘ä┘ë ┘à┘å ┘ç╪░┘ç ╪º┘ä╪«╪╖╪⌐ ╪º┘é╪¬╪▒╪¡╪¬ createMany ┘à┘å┘ü╪╡┘ä ╪¿┘å╪º╪í┘ï ╪╣┘ä┘ë ╪º┘ü╪¬╪▒╪º╪╢ ╪«╪º╪╖╪ª ("updateOrderStatus ┘ä╪º ┘è┘â╪¬╪¿ history") ΓÇö ╪º┘Å┘â╪¬╪┤┘ü ╪ú╪½┘å╪º╪í ╪º┘ä╪¬┘å┘ü┘è╪░ ┘ê╪ú┘Å╪▓┘è┘ä.

#### ΓÜá∩╕Å ╪¬┘å╪¿┘è┘ç╪º╪¬ ┘ç╪º┘à╪⌐
1. ≡ƒƒí **┘å┘à╪╖ ╪º┘ä╪º╪│╪¬╪»╪╣╪º╪í (┘à╪▒╪º╪¼╪╣╪⌐ ╪½╪º┘ä╪½╪⌐)**: ╪º╪│╪¬╪«╪»┘à `orderService.setCompanyId(companyId).updateOrderStatus(...)` ΓÇö ┘å┘ü╪│ ┘å┘à╪╖ `routes/orders.js:3031`. `orderService` ┘ç┘ê **singleton** (`module.exports = orderService` ┘ü┘è `:1717`)╪î ┘ê╪º┘ä┘Ç constructor ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è ┘è╪¬╪▒┘â `companyId = null`. ╪¬┘à╪▒┘è╪▒ `companyId` ┘â┘à╪╣╪º┘à┘ä ┘ê╪¡╪»┘ç ┘ä╪º ┘è┘â┘ü┘è ┘ä╪ú┘å ╪¿╪╣╪╢ ╪º┘ä╪º╪│╪¬╪╣┘ä╪º┘à╪º╪¬ ╪º┘ä╪»╪º╪«┘ä┘è╪⌐ ╪¬╪╣╪¬┘à╪» ╪╣┘ä┘ë `this.companyId`╪¢ ┘ä╪░╪º ╪º╪╢╪¿╪╖ ╪º┘ä╪│┘è╪º┘é ╪╡╪▒╪º╪¡╪⌐┘ï ┘é╪¿┘ä ┘â┘ä ╪º╪│╪¬╪»╪╣╪º╪í ┘ä╪¬╪¼┘å╪¿ ╪¬╪│╪▒┘è╪¿ ╪¿┘è╪º┘å╪º╪¬ tenant.
2. **`order.id` vs `orderNumber`**: `updateOrderStatus` ┘è┘é╪¿┘ä ┘â┘ä┘è┘ç┘à╪º ╪»╪º╪«┘ä┘è┘ï╪º (OR query)╪î ┘ä┘â┘å `order.id` ╪ú╪│╪▒╪╣. ╪º╪│╪¬╪«╪»┘à ┘à╪º ┘è╪╖┘ä╪¿┘ç ╪º┘ä┘Ç API.
3. **╪º┘ä╪ú╪»╪º╪í**: ┘ä┘ê ╪º┘ä┘é╪º╪╣╪»╪⌐ ╪¬╪╖╪º╪¿┘é ┘à╪ª╪º╪¬ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪»┘ü╪╣╪⌐╪î ╪º╪│╪¬╪»╪╣╪º╪í `updateOrderStatus` ┘ä┘â┘ä ╪╖┘ä╪¿ ┘è╪╡╪¿╪¡ ╪ú╪¿╪╖╪ú ┘à┘å `updateMany`. ╪¡┘ä┘ê┘ä:
   - ╪¡╪»┘æ `findMany` ╪º┘ä╪ú┘ê┘ä┘è ╪¿┘Ç `take: 50` ┘ä┘â┘ä ╪»┘ü╪╣╪⌐ (╪º┘ä┘â╪▒┘ê┘å ┘è╪╣┘à┘ä ┘â┘ä ╪»┘é┘è┘é╪⌐╪î ┘ü╪│┘è┘ä╪¡┘é).
4. **╪º┘ä┘Ç mutex/re-entrancy**: `isRunning` guard ╪º┘ä╪¡╪º┘ä┘è ┘â╪º┘ü┘ì. ┘ä┘â┘å `updateOrderStatus` ╪º┘ä╪»╪º╪«┘ä┘è ┘é╪» ┘è┘â┘ê┘å ╪ú╪¿╪╖╪ú ΓÇö ╪¬╪ú┘â╪» ╪ú┘å ╪º┘ä┘â╪▒┘ê┘å ╪º┘ä╪¬╪º┘ä┘è ┘ä╪º ┘è╪¬╪»╪º╪«┘ä (╪º╪│╪¬┘à╪▒ ╪¿┘ü╪¡╪╡ `isRunning`).

**┘à╪╣╪º┘è┘è╪▒ ╪º┘ä┘å╪¼╪º╪¡ ┬º1.2**:
- [ ] ╪╖┘ä╪¿ ┘è╪╖╪º╪¿┘é ┘é╪º╪╣╪»╪⌐ auto-change ΓåÆ ┘è╪¬┘ä┘é┘ë ╪º┘ä╪╣┘à┘è┘ä ╪Ñ╪┤╪╣╪º╪▒ ┘ê╪º╪¬╪│╪º╪¿ (┘ä┘ê ╪º┘ä╪¡╪º┘ä╪⌐ ┘ü┘è ╪«╪▒┘è╪╖╪⌐ ┬º3╪î ┘ê┘à╪╣ ┬º2.1-pre mapping).
- [ ] `metadata.preparationStatus` ┘è┘Å╪¡╪»┘æ╪½ ┘ä┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä╪¬┘è ┘ü┘è `PREPARATION_PIPELINE_STATUSES`.
- [ ] `OrderStatusHistory` ╪¬┘Å╪│╪¼┘æ┘ä ╪¿┘Ç `changedBy: 'SYSTEM_AUTO'` (╪╣╪¿╪▒ `userId` ╪º┘ä┘à┘Å┘à╪▒┘Ä┘æ╪▒ ┘ä┘Ç `updateOrderStatus` ΓÇö ┘è┘â╪¬╪¿ ╪º┘ä┘Ç history ┘à╪¬╪»╪º╪«┘ä╪º┘ï).
- [ ] ┘ä╪º ╪º┘å╪¡╪»╪º╪▒ ┘ü┘è ╪▓┘à┘å ╪º┘ä┘â╪▒┘ê┘å (┘è╪¿┘é┘ë < 30╪½ ┘ä┘â┘ä ╪»┘ü╪╣╪⌐ 50 ╪╖┘ä╪¿).

**╪«╪╖╪⌐ ╪º┘ä╪¬╪▒╪º╪¼╪╣ ┬º1.2**: `git checkout -- cron/orderStatusAutoChangeCron.js`.

---

## 4. ╪º┘ä┘à╪▒╪¡┘ä╪⌐ 2: ╪Ñ╪╡┘ä╪º╪¡╪º╪¬ ╪╡╪¡┘è╪¡╪⌐ ╪╣╪º┘ä┘è╪⌐ ╪º┘ä╪ú┘ê┘ä┘ê┘è╪⌐

### ≡ƒö┤ 2.1 ╪¬┘ê╪│┘è╪╣ ╪«╪▒┘è╪╖╪⌐ ╪º┘ä╪¡╪º┘ä╪º╪¬ (`getWhatsAppOrderEventType`)

**╪º┘ä╪¼╪░╪▒**: `services/orderService.js:26` ╪¬╪▒╪│┘à **8 ╪¡╪º┘ä╪º╪¬ ┘ü┘é╪╖**. ╪¿╪º┘é┘è ╪º┘ä╪¡╪º┘ä╪º╪¬ (RETURNED, REFUNDED, PARTIALLY_RETURNED, EXCHANGED, READY, QUALITY_CHECK...) ╪¬╪▒╪¼╪╣ `null` ΓåÆ ╪º┘ä┘Ç guard ┘ü┘è `orderService.js:1227` ┘è╪¬╪«╪╖┘ë ╪º┘ä╪Ñ╪┤╪╣╪º╪▒ **╪¿╪╡┘à╪¬**. ┘ê╪º┘ä┘à┘ü╪º╪▒┘é╪⌐ ╪ú┘å `sendOrderStatusNotification` (`WhatsAppNotificationService.js:2714`) ╪╣┘å╪»┘ç╪º ╪«╪▒┘è╪╖╪⌐ ╪ú┘ê╪│╪╣ + DB fallback ┘ä┘â┘å┘ç╪º **┘ä╪º ╪¬┘Å╪╡┘ä ╪Ñ┘ä┘è┘ç╪º**.

**╪º┘ä╪¡┘ä ╪º┘ä╪ú┘å╪╕┘ü (╪¿╪»┘ä ╪¬┘â╪▒╪º╪▒ ╪º┘ä┘é┘ê╪º╪ª┘à)**: ╪º╪¡╪░┘ü ╪º┘ä┘Ç guard ┘ü┘è `orderService.js` ┘ê╪º╪¬╪▒┘â `sendOrderStatusNotification` ┘è┘é╪▒╪▒ (┘ä╪»┘è┘ç╪º DB `orderStatusConfig.notifyCustomer` + fallback `isFallback:true`).

**╪º┘ä┘à┘ä┘ü**: `apps/backend/services/orderService.js` ΓÇö ╪º┘ä┘â╪¬┘ä╪⌐ ╪╣┘å╪» L1220-1249 (updateOrderStatus) ┘ê L1451-1484 (updateGuestOrderStatus).

**╪º┘ä┘â┘ê╪» ╪º┘ä╪¡╪º┘ä┘è** (L1224-1249 ╪¬┘é╪▒┘è╪¿╪º┘ï):
```js
const notificationStatus = normalizeWhatsAppOrderStatus(status);
const eventType = getWhatsAppOrderEventType(status);
// ...dedup 10s on eventType...
if (!notificationStatus || !eventType) {
  return;  // ΓåÉ ╪º┘ä╪╡┘à╪¬ ┘ç┘å╪º ┘è╪«┘ü┘è RETURNED/REFUNDED/╪Ñ┘ä╪«
}
// ...await WhatsAppNotificationService.sendOrderStatusNotification(order, notificationStatus);
```

#### ≡ƒö┤ ╪┤╪▒╪╖ ┘à╪│╪¿┘é ╪Ñ┘ä╪▓╪º┘à┘è: mapping ╪º┘ä┘Ç event type ╪Ñ┘ä┘ë ┘é┘è┘à ╪º┘ä┘Ç enum ╪º┘ä╪╡╪º┘ä╪¡╪⌐

> ΓÜá∩╕Å **╪¬╪¡╪░┘è╪▒ ┘à┘å ┘à╪▒╪º╪¼╪╣╪⌐ ╪½╪º┘å┘è╪⌐**: ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä┘Ç enum ╪º┘ä┘à┘ê╪¼┘ê╪»╪⌐ ┘ü┘è ╪º┘ä┘Ç schema (`WhatsAppNotificationLogsEventType` / `WhatsAppNotificationQueueEventType`╪î `schema.prisma:3669` ┘ê `3832`) ╪¬╪¡╪¬┘ê┘è ╪╣┘ä┘ë `ORDER_RETURNED`╪î `ORDER_REFUNDED`╪î `RETURNED_TO_SENDER`╪î `PARTIAL_REFUND`╪î `REFUND_PROCESSING` ΓÇö ┘ä┘â┘å `getPersistedNotificationEventType` (`WhatsAppNotificationService.js:1064`) **┘ä╪º ┘è╪¡┘ê┘æ┘ä** `RETURNED` ╪º┘ä╪«╪º┘à ╪Ñ┘ä┘ë `ORDER_RETURNED`. ╪º┘ä┘å╪¬┘è╪¼╪⌐: ┘ä┘ê ┘à╪▒┘æ╪▒┘å╪º `notificationStatus = 'RETURNED'` ┘à╪¿╪º╪┤╪▒╪⌐╪î ╪º┘ä╪Ñ╪»╪▒╪º╪¼ ┘ü┘è `whatsAppNotificationLog`/`whatsAppNotificationQueue` ╪│┘è┘ü╪┤┘ä (┘é┘è┘à╪⌐ enum ╪║┘è╪▒ ╪╡╪º┘ä╪¡╪⌐) ΓåÆ ╪º┘ä╪Ñ╪┤╪╣╪º╪▒ ┘è╪╢┘è╪╣ ╪╡╪º┘à╪¬╪º┘ï.

**╪Ñ╪¼╪▒╪º╪í ╪Ñ┘ä╪▓╪º┘à┘è (┘é╪¿┘ä ╪ú┘ê ┘à╪╣ ┬º2.1)**: ╪ú╪╢┘ü mapping ┘ü┘è `getPersistedNotificationEventType` (`WhatsAppNotificationService.js:1017`):

```js
// ≡ƒÜ¿ PRODUCTION-FIX (notifications-fix-plan ┬º2.1-pre):
// ╪¡┘ê┘ä raw order status codes ╪Ñ┘ä┘ë ┘é┘è┘à enum ╪╡╪º┘ä╪¡╪⌐ ┘ä┘Ç WhatsAppNotificationLog/Queue.
// ╪º┘ä┘Ç enums ╪¬╪¡╪¬┘ê┘è ╪¿╪º┘ä┘ü╪╣┘ä ╪╣┘ä┘ë ORDER_RETURNED/ORDER_REFUNDED/PARTIAL_REFUND/RETURNED_TO_SENDER/REFUND_PROCESSING.
const ORDER_STATUS_TO_EVENT_TYPE = {
  RETURNED: 'ORDER_RETURNED',
  PARTIALLY_RETURNED: 'ORDER_RETURNED',   // ╪ú┘ê 'PARTIAL_REFUND' ╪¡╪│╪¿ ╪º┘ä╪▒╪║╪¿╪⌐ ┘ü┘è ╪º┘ä╪¬┘à┘è┘è╪▓
  REFUNDED: 'ORDER_REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIAL_REFUND',
  EXCHANGED: 'ORDER_RETURNED',            // ┘ä╪º ┘è┘ê╪¼╪» EXCHANGED ┘à┘å┘ü╪╡┘ä╪¢ ╪º╪│╪¬╪«╪»┘à ORDER_RETURNED ╪ú┘ê ╪ú╪╢┘ü enum ╪¼╪»┘è╪»
};

function getPersistedNotificationEventType(eventType) {
  if (String(eventType || '').toUpperCase().startsWith('TASK_')) {
    return 'ANNOUNCEMENT';
  }
  const upper = String(eventType || '').toUpperCase();
  // ≡ƒÜ¿ NEW: map raw order status codes to valid enum values
  if (ORDER_STATUS_TO_EVENT_TYPE[upper]) {
    return ORDER_STATUS_TO_EVENT_TYPE[upper];
  }
  return PERSISTED_EVENT_TYPE_FALLBACKS[eventType] || eventType;
}
```

> **┘é╪▒╪º╪▒ ╪¬╪╡┘à┘è┘à┘è ┘à╪╖┘ä┘ê╪¿**: `EXCHANGED` ┘ê `PARTIALLY_RETURNED` ┘ä┘è╪│ ┘ä┘ç┘à╪º ┘à┘é╪º╪¿┘ä ┘à╪¿╪º╪┤╪▒ ┘ü┘è ╪º┘ä┘Ç enum. ╪º┘ä╪«┘è╪º╪▒╪º╪¬: (╪ú) ╪º╪│╪¬╪«╪»╪º┘à `ORDER_RETURNED` ┘â┘Ç fallback╪î ╪ú┘ê (╪¿) ╪Ñ╪╢╪º┘ü╪⌐ ┘é┘è┘à enum ╪¼╪»┘è╪»╪⌐ ╪╣╪¿╪▒ migration. ╪│╪¼┘æ┘ä ╪º┘ä┘é╪▒╪º╪▒ ┘ü┘è ┬º8.

**╪º┘ä┘â┘ê╪» ╪¿╪╣╪» ╪º┘ä╪Ñ╪╡┘ä╪º╪¡** (╪º┘ä╪«┘è╪º╪▒ ╪º┘ä┘à┘ê╪╡┘ë ╪¿┘ç ΓÇö ╪¬┘ü┘ê┘è╪╢ ┘â╪º┘à┘ä╪î **╪¿╪»┘ê┘å `contains`**):

```js
// ≡ƒÜ¿ PRODUCTION-FIX (notifications-fix-plan ┬º2.1):
// ┘ä╪º ╪¬╪¡╪¼╪¿ ╪º┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ┘ç┘å╪º ΓÇö ╪»╪╣ sendOrderStatusNotification ┘è┘é╪▒╪▒ ╪╣╪¿╪▒:
//   1) DB OrderStatusConfig.notifyCustomer
//   2) ╪«╪▒┘è╪╖╪¬┘ç ╪º┘ä╪«╪º╪╡╪⌐ ╪º┘ä╪ú┘ê╪│╪╣
//   3) fallback isFallback
// ╪º┘ä╪º╪¡╪¬┘ü╪º╪╕ ╪¿┘Ç normalizeWhatsAppOrderStatus ┘ü┘é╪╖ ┘ä┘ä╪¬╪╖╪¿┘è╪╣ (PREPARINGΓåÆPICKING).
const notificationStatus = normalizeWhatsAppOrderStatus(status) || status;

// dedup 10s ΓÇö ╪º╪│╪¬╪«╪»┘à ╪º┘ä┘Ç eventType ╪º┘ä┘à┘Å╪¡┘ê┘æ┘ä (┘à┘ê╪¡┘æ╪» ╪╣╪¿╪▒ getPersistedNotificationEventType)
// ┘â┘à┘ü╪¬╪º╪¡╪î ┘à╪╣ ┘à╪╖╪º╪¿┘é╪⌐ ╪¬╪º┘à╪⌐ (┘ä┘è╪│ contains) ┘ä╪¬┘ü╪º╪»┘è STATUS_1/STATUS_10 false match.
// (╪▒╪º╪¼╪╣ ┬º3.1: ┘ä╪º╪¡┘é┘ï╪º ┘è╪│╪¬╪¿╪»┘ä ┘ç╪░╪º ╪¿╪º┘ä┘Ç helper ╪º┘ä┘à┘ê╪¡┘æ╪» isDuplicateNotification)
const persistedEventType = getPersistedNotificationEventType(notificationStatus);
const recent = await prisma.whatsAppNotificationLog.findFirst({
  where: {
    orderId: order.id,
    eventType: persistedEventType,   // ΓåÉ ╪¬╪╖╪º╪¿┘é ╪¬╪º┘à (equals)
    createdAt: { gte: new Date(Date.now() - 10000) },
  },
  select: { id: true },
});
if (recent) {
  console.log(`[ORDER] duplicate status notification skipped: ${order.id}/${persistedEventType}`);
  return;
}

try {
  await WhatsAppNotificationService.sendOrderStatusNotification(order, notificationStatus);
} catch (notifErr) {
  console.error('[ORDER] status notification failed:', notifErr.message);
  // ┘ä╪º ╪¬╪▒┘à┘É ΓÇö ╪º┘ä╪Ñ╪┤╪╣╪º╪▒ ┘ü╪┤┘ä ┘ä┘â┘å ╪¬╪¡╪»┘è╪½ ╪º┘ä╪¡╪º┘ä╪⌐ ┘å╪¼╪¡
}
```

> ΓÜá∩╕Å **╪¬╪╡╪¡┘è╪¡ ┘à┘å ┘à╪▒╪º╪¼╪╣╪⌐ ╪½╪º┘å┘è╪⌐**: ╪º┘ä┘å╪│╪«╪⌐ ╪º┘ä╪ú┘ê┘ä┘ë ┘à┘å ┘ç╪░╪º ╪º┘ä┘â┘ê╪» ╪º╪│╪¬╪«╪»┘à╪¬ `eventType: { contains: notificationStatus }` ΓÇö ┘ç╪░╪º ┘è╪╣┘è╪» ╪Ñ╪»╪«╪º┘ä ┘å┘ü╪│ ╪╣┘è╪¿ ┬º3.1 (┘à╪╖╪º╪¿┘é╪⌐ ┘â╪º╪░╪¿╪⌐ `STATUS_1`/`STATUS_10`). ╪º╪│╪¬╪«╪»┘à ╪º┘ä╪¬╪╖╪º╪¿┘é ╪º┘ä╪¬╪º┘à ╪╣┘ä┘ë `persistedEventType` ╪º┘ä┘à╪¡┘ê┘æ┘ä.

#### ΓÜá∩╕Å ╪¬┘å╪¿┘è┘ç╪º╪¬
- **╪▒╪º╪¼╪╣ `sendOrderStatusNotification` (WhatsAppNotificationService.js:2714)** ┘ä╪¬╪ú┘â┘è╪» ╪ú┘å┘ç ┘è╪¬╪╣╪º┘à┘ä ┘à╪╣ ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪║┘è╪▒ ╪º┘ä┘à╪▒╪│┘ê┘à╪⌐ ╪¿┘Ç fallback ╪ó┘à┘å (┘ä╪º ┘è╪▒┘à┘è). ┘ä┘ê ┘è╪▒┘à┘è╪î ╪ú╪╢┘ü `try/catch` ╪»╪º╪«┘ä┘è + ╪Ñ╪╣╪º╪»╪⌐ ╪º┘ä╪¡╪º┘ä╪⌐ `null` ╪¿╪»┘ä `throw`.
- **╪º┘ü╪¡╪╡ `orderStatusConfig.notifyCustomer`**: ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä┘ä┘è `notifyCustomer: false` ┘è╪¼╪¿ ╪ú┘ä╪º ╪¬┘Å╪▒╪│┘ä ╪¡╪¬┘ë ╪¿╪╣╪» ╪º┘ä╪¬┘ü┘ê┘è╪╢. ╪¬╪ú┘â╪» ╪Ñ┘å `sendOrderStatusNotification` ┘è╪¡╪¬╪▒┘à ┘ç╪░╪º ╪º┘ä╪¡┘é┘ä (╪▒╪º╪¼╪╣ L~2730).
- **╪º╪«╪¬╪¿╪º╪▒ ╪º┘ä╪º┘å╪¡╪»╪º╪▒**: ┘é╪¿┘ä ╪º┘ä╪Ñ╪╡┘ä╪º╪¡╪î RETURNED ┘â╪º┘å ┘è┘Å╪¬╪«╪╖┘ë ╪¿╪╡┘à╪¬. ╪¿╪╣╪» ╪º┘ä╪Ñ╪╡┘ä╪º╪¡ ┘é╪» ┘è╪¿╪»╪ú ╪º┘ä╪Ñ╪▒╪│╪º┘ä ΓÇö ╪¬╪ú┘â╪» ┘à┘å ┘ê╪¼┘ê╪» ┘é╪º┘ä╪¿ DB ┘ä┘â┘ä ╪¡╪º┘ä╪⌐ `notifyCustomer: true` (╪º╪│╪¬╪«╪»┘à `seedDefaultOrderTemplates`).

**┘à╪╣╪º┘è┘è╪▒ ╪º┘ä┘å╪¼╪º╪¡ ┬º2.1**:
- [ ] ╪╖┘ä╪¿ ┘è┘Å╪║┘è┘æ╪▒ ┘ä┘Ç `RETURNED` ┘à╪╣ `OrderStatusConfig.notifyCustomer: true` ΓåÆ ╪º┘ä╪╣┘à┘è┘ä ┘è╪¬┘ä┘é┘ë ╪Ñ╪┤╪╣╪º╪▒╪º┘ï.
- [ ] ≡ƒƒí ╪╖┘ä╪¿ ┘è┘Å╪║┘è┘æ╪▒ ┘ä┘Ç `RETURNED` ╪«┘ä╪º┘ä **quiet-hours** (┘è╪»╪«┘ä ╪º┘ä╪╖╪º╪¿┘ê╪▒) ΓåÆ ╪º┘ä╪Ñ╪┤╪╣╪º╪▒ ┘è╪╡┘ä ╪ú┘è╪╢┘ï╪º ╪╣╪¿╪▒ ╪º┘ä╪╖╪º╪¿┘ê╪▒ ╪¿╪╣╪» ┘å┘ç╪º┘è╪⌐ ╪º┘ä┘ç╪»┘ê╪í. (┘ä╪ú┘å ┘à╪│╪º╪▒ ╪º┘ä┘Ç queue ┘è╪│╪¬╪«╪»┘à `getPersistedNotificationEventType` ╪ú┘è╪╢┘ï╪º ┘ü┘è `:3493`╪î ┘ü╪º┘ä╪¡┘ä ╪┤╪º┘à┘ä╪¢ ┘è╪│╪¬╪¡┘é ╪º╪«╪¬╪¿╪º╪▒┘ï╪º ╪╡╪▒┘è╪¡┘ï╪º.)
- [ ] ╪╖┘ä╪¿ ┘è┘Å╪║┘è┘æ╪▒ ┘ä╪¡╪º┘ä╪⌐ `notifyCustomer: false` ΓåÆ ┘ä╪º ╪Ñ╪┤╪╣╪º╪▒ (┘à╪¡╪¬╪▒┘à).
- [ ] ┘ä╪º ╪¬┘â╪▒╪º╪▒ ╪Ñ╪┤╪╣╪º╪▒ ┘ä┘å┘ü╪│ ╪º┘ä╪¬╪║┘è┘è╪▒ ╪«┘ä╪º┘ä 10╪½.
- [ ] ┘ä╪º ╪º┘å╪¡╪»╪º╪▒ ┘ä┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä┘Ç 8 ╪º┘ä┘à╪▒╪│┘ê┘à╪⌐ ╪ú╪╡┘ä╪º┘ï.

**╪«╪╖╪⌐ ╪º┘ä╪¬╪▒╪º╪¼╪╣ ┬º2.1**: `git checkout -- services/orderService.js`.

---

### ≡ƒö┤ 2.2 ╪Ñ╪▓╪º┘ä╪⌐ ┘ç╪º╪▒╪»┘â┘ê╪» ╪╣┘ä╪º┘à╪⌐ "Mokhtar Elhenawy" + ╪º┘ä╪▒┘ê╪º╪¿╪╖

**╪º┘ä╪¼╪░╪▒**: ┘à┘å╪╡╪⌐ SaaS ┘à╪¬╪╣╪»╪»╪⌐ ╪º┘ä┘à╪│╪¬╪ú╪¼╪▒┘è┘å ╪¬╪▒╪│┘ä ╪º╪│┘à/╪▒┘ê╪º╪¿╪╖ ╪┤╪▒┘â╪⌐ ┘à╪¡╪»╪»╪⌐ ┘ä┘â┘ä ╪º┘ä╪╣┘à┘ä╪º╪í.

| ╪º┘ä┘à┘ä┘ü:╪º┘ä╪│╪╖╪▒ | ╪º┘ä┘ç╪º╪▒╪»┘â┘ê╪» |
|-------------|-----------|
| `WhatsAppNotificationService.js:49` | `footer: "Mokhtar Elhenawy Store"` |
| `WhatsAppNotificationService.js:2331` | `"Mokhtar Elhenawy Store"` |
| `WhatsAppNotificationService.js:2136` | `https://mokhtarelhenawy.online/track/...` |
| `WhatsAppNotificationService.js:2658` | `https://${company.slug}.mokhtarelhenawy.online` |

**╪º┘ä╪¡┘ä**: ╪º╪│╪¬╪¿╪»┘ä ╪¿┘Ç `company.name` + `company.customDomain`/`company.website` ┘à┘å DB╪î ┘à╪╣ fallback ╪╣╪º┘à ┘à╪¡╪º┘è╪».

**╪º┘ä┘â┘ê╪» ╪º┘ä┘à┘é╪¬╪▒╪¡** (╪»╪º┘ä╪⌐ ┘à╪│╪º╪╣╪»╪⌐ ┘ü┘è ╪ú╪╣┘ä┘ë ╪º┘ä┘à┘ä┘ü):

> ≡ƒƒí **╪¬╪╡╪¡┘è╪¡ ┘à┘å ┘à╪▒╪º╪¼╪╣╪⌐ ╪½╪º┘å┘è╪⌐**: ╪º┘ä┘å╪│╪«╪⌐ ╪º┘ä╪ú┘ê┘ä┘ë ╪º╪│╪¬╪«╪»┘à╪¬ `displayName`/`domain`/`websiteUrl` ΓÇö **┘ç╪░┘ç ╪º┘ä╪¡┘é┘ê┘ä ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐** ┘ü┘è ┘å┘à┘ê╪░╪¼ `Company` (`schema.prisma:1900`). ╪º┘ä╪¡┘é┘ê┘ä ╪º┘ä┘ü╪╣┘ä┘è╪⌐ ╪º┘ä┘à╪ñ┘â╪»╪⌐: `name` (`:1902`╪î ╪║┘è╪▒ nullable)╪î `website` (`:1905`╪î String╪ƒ)╪î `slug` (`:1913`╪î @unique)╪î `customDomain` (`:1928`╪î @unique).

```js
// ≡ƒÜ¿ PRODUCTION-FIX (notifications-fix-plan ┬º2.2): multi-tenant brand resolution
// ╪¡┘é┘ê┘ä Company ╪º┘ä┘à╪ñ┘â╪»╪⌐ (schema.prisma): name, website?, slug?, customDomain?
function resolveCompanyBrand(company) {
  // company ┘é╪» ┘è┘â┘ê┘å undefined ┘ü┘è ╪│┘è╪º┘é╪º╪¬ ┘à╪╣┘è┘å╪⌐ ΓÇö fallback ┘à╪¡╪º┘è╪»
  const name = company?.name || 'Store';
  const slug = company?.slug || 'store';
  // ╪ú┘ê┘ä┘ê┘è╪⌐: customDomain (╪º┘ä┘å╪╖╪º┘é ╪º┘ä┘à╪«╪╡╪╡) ΓåÆ website ΓåÆ slug.platformDomain
  const customDomain = company?.customDomain?.trim() || null;
  const websiteHost = company?.website
    ? String(company.website).replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim()
    : null;
  const domain =
    customDomain ||
    websiteHost ||
    `${slug}.${process.env.PLATFORM_BASE_DOMAIN || 'maxp.online'}`;
  return { name, domain, trackingBaseUrl: `https://${domain}` };
}

// ┘à┘â╪º┘å ╪º┘ä╪º╪│╪¬╪«╪»╪º┘à:
// footer: resolveCompanyBrand(company).name
// trackingLink: variables.trackingLink ||
//   (variables.orderNumber ? `${brand.trackingBaseUrl}/track/${variables.orderNumber}` : '')
```

#### ΓÜá∩╕Å ╪¬┘å╪¿┘è┘ç╪º╪¬
- **╪º┘ä╪¿╪¡╪½ ╪º┘ä╪┤╪º┘à┘ä**: ╪¿╪╣╪» ╪º┘ä╪º╪│╪¬╪¿╪»╪º┘ä╪î ╪┤╪║┘æ┘ä `grep -rn "Mokhtar Elhenawy\|mokhtarelhenawy" apps/backend/services/whatsapp/` ┘ä┘ä╪¬╪ú┘â╪» ┘à┘å ╪╣╪»┘à ╪¿┘é╪º╪í ╪ú┘è ╪╕┘ç┘ê╪▒.
- **╪º╪«╪¬╪▒╪º┘é ╪º┘ä╪╣┘ä╪º┘à╪⌐ ╪º┘ä┘é╪»┘è┘à╪⌐**: ╪┤╪▒┘â╪⌐ Mokhtar ╪º┘ä╪¡┘é┘è┘é┘è╪⌐ ┘è╪¼╪¿ ╪ú┘å ╪¬╪▒┘ë ╪º╪│┘à┘ç╪º ╪º┘ä╪╡╪¡┘è╪¡ ┘à┘å DB (`company.name === 'Mokhtar Elhenawy Store'`) ΓÇö ╪¬╪ú┘â╪» ╪Ñ┘å ╪│╪¼┘ä┘ç╪º ┘ü┘è DB ┘è╪¡┘ê┘è ╪º┘ä╪º╪│┘à ╪º┘ä╪╡╪¡┘è╪¡╪î ┘ê╪Ñ┘ä╪º ╪¡╪»┘æ╪½ ╪º┘ä╪│╪¼┘ä.
- **`customDomain` ╪¿╪»┘ê┘å ╪¿╪▒┘ê╪¬┘ê┘â┘ê┘ä**: ╪º┘ä╪¡┘é┘ä ┘è┘Å╪«╪▓┘Ä┘æ┘å ╪╣╪º╪»╪⌐┘ï ╪¿╪»┘ê┘å `https://`╪¢ ╪º┘ä┘Ç helper ╪ú╪╣┘ä╪º┘ç ┘è╪╢┘è┘ü ╪º┘ä╪¿╪▒┘ê╪¬┘ê┘â┘ê┘ä. ╪¬╪¡┘é┘é ┘à┘å ╪╡┘è╪║╪⌐ ╪º┘ä╪¬╪«╪▓┘è┘å ╪º┘ä┘ü╪╣┘ä┘è╪⌐ ┘ü┘è ╪º┘ä╪Ñ┘å╪¬╪º╪¼ ┘é╪¿┘ä ╪º┘ä╪º╪╣╪¬┘à╪º╪».

**┘à╪╣╪º┘è┘è╪▒ ╪º┘ä┘å╪¼╪º╪¡ ┬º2.2**:
- [ ] ╪┤╪▒┘â╪⌐ ╪¼╪»┘è╪»╪⌐ ╪¬╪▒┘ë ╪º╪│┘à┘ç╪º + ┘å╪╖╪º┘é┘ç╪º ┘ü┘è ╪º┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬╪î ┘ä╪º ╪º╪│┘à Mokhtar.
- [ ] ╪┤╪▒┘â╪⌐ Mokhtar ╪¬╪▒┘ë ╪º╪│┘à┘ç╪º ╪º┘ä╪╡╪¡┘è╪¡ (┘à┘å DB).
- [ ] `grep -rn "mokhtarelhenawy" apps/backend/services/whatsapp/` ΓåÆ ┘ä╪º ╪╕┘ç┘ê╪▒ (╪¿╪╣╪» ╪º╪│╪¬╪½┘å╪º╪í╪º╪¬ migration/seed).
- [ ] ┘ä╪º ╪º┘å┘â╪│╪º╪▒ ┘ü┘è ╪▒┘ê╪º╪¿╪╖ ╪º┘ä╪¬╪¬╪¿╪╣ ┘ä┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘é╪»┘è┘à╪⌐.

**╪«╪╖╪⌐ ╪º┘ä╪¬╪▒╪º╪¼╪╣ ┬º2.2**: `git checkout -- services/whatsapp/WhatsAppNotificationService.js`.

---

## 5. ╪º┘ä┘à╪▒╪¡┘ä╪⌐ 3ΓÇô5: ╪¬╪¡╪│┘è┘å╪º╪¬ ╪╣╪º┘ä┘è╪⌐/┘à╪¬┘ê╪│╪╖╪⌐ ╪º┘ä╪ú┘ê┘ä┘ê┘è╪⌐

### ≡ƒƒá 3.1 ╪¬┘ê╪¡┘è╪» ╪º┘ä┘Ç dedup + ┘é┘è╪» DB ┘ü╪▒┘è╪» (┘è╪¡┘ä ╪º┘ä┘à╪┤╪º┘â┘ä #5 ┘ê #6)

**╪º┘ä╪¼╪░╪▒**: ╪º┘ä┘Ç dedup ┘à┘å╪│┘ê╪« ┘ü┘è 4 ╪ú┘à╪º┘â┘å ╪¿┘à┘å╪╖┘é ┘à╪¬┘å╪º┘é╪╢ + ┘å╪º┘ü╪░╪⌐ 10╪½ ┘ü┘é╪╖ (┘ä╪º `idempotency key` ╪¡┘é┘è┘é┘è).

**╪º┘ä┘à┘ê╪º┘é╪╣**:
1. `WhatsAppNotificationService.js:2671` ΓÇö key: `orderId`+`ORDER_CREATED`
2. `orderService.js:1230` ΓÇö key: `orderId`+`eventType`
3. `orderService.js:1460` ΓÇö key: `recipientPhone`+`eventType` (guest)
4. `orderWorkflowService.js:610` ΓÇö key: `eventType contains statusCode` (╪º┘ä╪ú╪╢╪╣┘ü ΓÇö ┘à╪╖╪º╪¿┘é╪⌐ ┘â╪º╪░╪¿╪⌐ ┘à╪¡╪¬┘à┘ä╪⌐)

**╪º┘ä╪¡┘ä**:
1. **╪ú┘å╪┤╪ª ╪»╪º┘ä╪⌐ ┘à╪│╪º╪╣╪»╪⌐ ┘à┘ê╪¡┘æ╪»╪⌐** ┘ü┘è `WhatsAppNotificationService.js`:
   ```js
   async function isDuplicateNotification({ companyId, orderId, recipientPhone, eventType, windowMs = 10000 }) {
     const prisma = getSharedPrismaClient();
     const where = {
       companyId,
       eventType,
       createdAt: { gte: new Date(Date.now() - windowMs) },
       OR: [
         ...(orderId ? [{ orderId }] : []),
         ...(recipientPhone ? [{ recipientPhone }] : []),
       ],
     };
     const found = await prisma.whatsAppNotificationLog.findFirst({ where, select: { id: true } });
     return Boolean(found);
   }
   ```
2. **╪º╪│╪¬╪¿╪»┘ä** ┘â┘ä ╪º┘ä┘Ç 4 ┘à┘ê╪º┘é╪╣ ╪¿┘ç╪░┘ç ╪º┘ä╪»╪º┘ä╪⌐ (╪ú┘ê ╪╡┘Ä╪»┘É┘æ╪▒┘ç╪º ┘à┘å┘ç╪º).
3. **╪ú╪╢┘ü ┘é┘è╪» DB ┘ü╪▒┘è╪»** (migration):
   ```prisma
   // ┘ü┘è WhatsAppNotificationLog:
   @@unique([companyId, orderId, eventType], map: "notif_log_order_event_uniq")
   // ┘à┘ä╪º╪¡╪╕╪⌐: ╪º╪│╪¬╪«╪»┘à partial unique index ┘ä┘ê ┘ä╪º╪▓┘à ╪º┘ä╪│┘à╪º╪¡ ╪¿╪Ñ╪╣╪º╪»╪⌐ ┘à╪¡╪º┘ê┘ä╪⌐ ╪¿╪╣╪» ┘ü╪┤┘ä:
   // CREATE UNIQUE INDEX ... WHERE status = 'SENT'
   ```

#### ≡ƒöÆ ╪º┘ä┘é╪▒╪º╪▒ ╪º┘ä┘å┘ç╪º╪ª┘è (╪¿╪╣╪» ╪º┘ä╪¬┘å┘ü┘è╪░)

> **╪▒┘Å┘ü╪╢ ╪º┘ä┘é┘è╪» ╪º┘ä┘ü╪▒┘è╪» ╪º┘ä╪»╪º╪ª┘à** ΓÇö ╪¬┘à ╪º╪╣╪¬┘à╪º╪» `isDuplicateNotification` ╪¿┘å╪º┘ü╪░╪⌐ ╪▓┘à┘å┘è╪⌐ (10 ╪½┘ê╪º┘å┘ì) ┘ü┘é╪╖╪î ┘ê**┘ä╪º migration ┘à╪╖┘ä┘ê╪¿╪⌐**.
> **╪º┘ä╪│╪¿╪¿**: ╪º┘ä┘é┘è╪» ╪º┘ä╪»╪º╪ª┘à ╪╣┘ä┘ë `(companyId, orderId, eventType)` ┘è┘à┘å╪╣ ╪Ñ╪╣╪º╪»╪⌐ ╪º┘ä╪Ñ╪▒╪│╪º┘ä ╪º┘ä┘à╪┤╪▒┘ê╪╣╪⌐ ╪¿╪╣╪» ╪º┘å╪¬┘ç╪º╪í ╪º┘ä┘å╪º┘ü╪░╪⌐ ╪º┘ä╪▓┘à┘å┘è╪⌐ ΓÇö ┘à╪½┘ä╪º┘ï flip-flop `CONFIRMED ΓåÆ CANCELLED ΓåÆ CONFIRMED` ╪¿╪╣╪» >10╪½: ╪ú┘ê┘ä `CONFIRMED` ╪ú╪╡╪¿╪¡ `SENT` ┘ü┘è╪¿┘é┘ë ╪º┘ä┘é┘è╪» (╪¡╪¬┘ë partial ╪╣┘ä┘ë `status='SENT'`) ┘è╪▒┘ü╪╢ ╪º┘ä┘Ç CONFIRMED ╪º┘ä╪½╪º┘å┘è ╪▒╪║┘à ╪ú┘å┘ç ╪Ñ╪┤╪╣╪º╪▒ ┘à╪┤╪▒┘ê╪╣ ┘ä╪º╪¡┘é. ╪º┘ä┘Ç dedup ┘ç┘å╪º **╪▓┘à┘å┘è ╪¿╪╖╪¿┘è╪╣╪¬┘ç** (┘å╪º┘ü╪░╪⌐)╪î ┘ä╪░╪º ╪º┘ä╪ó┘ä┘è╪⌐ ╪º┘ä╪╡╪¡┘è╪¡╪⌐ ┘ç┘è ┘ü╪¡╪╡ ╪º┘ä┘å╪º┘ü╪░╪⌐ ┘ü┘è ╪╖╪¿┘é╪⌐ ╪º┘ä╪¬╪╖╪¿┘è┘é ╪º┘ä┘à┘ê╪¡┘æ╪» ΓÇö ┘ê┘ä┘è╪│ ┘é┘è╪»╪º┘ï DB ╪»╪º╪ª┘à╪º┘ï.

#### ΓÜá∩╕Å ╪¬┘å╪¿┘è┘ç╪º╪¬
- **╪º┘ä┘é┘è╪» ╪º┘ä┘ü╪▒┘è╪» ┘é╪» ┘è┘ü╪┤┘ä** ┘ä┘ê ┘ü┘è┘ç ╪╡┘ü┘ê┘ü ┘à┘â╪▒╪▒╪⌐ ┘à┘ê╪¼┘ê╪»╪⌐ ┘ü┘è ╪º┘ä╪Ñ┘å╪¬╪º╪¼. ╪┤╪║┘æ┘ä ╪│┘â╪▒╪¿╪¬ ╪¬┘å╪╕┘è┘ü ╪ú┘ê┘ä╪º┘ï. ≡ƒƒí **╪¬╪╡╪¡┘è╪¡ ┘à┘å ┘à╪▒╪º╪¼╪╣╪⌐ ╪½╪º┘å┘è╪⌐**: ╪º╪│┘à ╪º┘ä╪¼╪»┘ê┘ä ╪º┘ä┘ü╪╣┘ä┘è `whatsapp_notification_logs` (**╪¼┘à╪╣**╪î `@@map` ┘ü┘è `schema.prisma`):
  ```sql
  DELETE FROM "whatsapp_notification_logs" a USING "whatsapp_notification_logs" b
  WHERE a.id > b.id AND a."orderId" = b."orderId" AND a."eventType" = b."eventType"
    AND a."companyId" = b."companyId";
  ```
- **╪▒╪º╪¼╪╣ ┘å┘à┘ê╪░╪¼ `WhatsAppNotificationLog`** ┘ä┘ä╪¬╪ú┘â╪» ┘à┘å ┘ê╪¼┘ê╪» `companyId`, `orderId`, `recipientPhone`, `eventType` ┘â╪ú╪╣┘à╪»╪⌐ (╪▒╪º╪¼╪╣ `schema.prisma:7090`).
- **`orderWorkflowService.js:610`** ┘è╪│╪¬╪«╪»┘à `contains` ΓåÆ ╪º╪│╪¬╪¿╪»┘ä ╪¿┘à╪╖╪º╪¿┘é╪⌐ ╪¬╪º┘à╪⌐ (`equals`) ╪╣┘ä┘ë `persistedEventType` ╪º┘ä┘à╪¡┘ê┘æ┘ä (┘å┘ü╪│ ┘à┘å┘ç╪¼ ┬º2.1) ╪¿╪╣╪» ╪º┘ä╪¬┘ê╪¡┘è╪».

**┘à╪╣╪º┘è┘è╪▒ ╪º┘ä┘å╪¼╪º╪¡ ┬º3.1**: flip-flop (CONFIRMEDΓåÆCANCELLEDΓåÆCONFIRMED) ╪«┘ä╪º┘ä > 10╪½ ┘ä╪º ┘è┘å╪¬╪¼ ╪Ñ╪┤╪╣╪º╪▒┘è┘å ┘à╪¬╪╖╪º╪¿┘é┘è┘å╪¢ ┘à╪╖╪º╪¿┘é╪⌐ ┘â╪º╪░╪¿╪⌐ `STATUS_1`/`STATUS_10` ┘à╪│╪¬╪¡┘è┘ä╪⌐.

---

### ≡ƒƒá 4.1 ╪Ñ╪╢╪º┘ü╪⌐ retry ┘ä┘ä╪Ñ╪▒╪│╪º┘ä ╪º┘ä┘ü┘ê╪▒┘è

**╪º┘ä╪¼╪░╪▒**: `sendNotification` catch (`:2387-2410`) ┘è╪│╪¼┘æ┘ä `FAILED` + ┘è╪¡╪│╪¿ `retryable` ┘ä┘â┘å ┘ä╪º ╪┤┘è╪í ┘è╪¬╪╡╪▒┘ü ╪╣┘ä┘è┘ç.

#### ≡ƒö┤ ┘é┘è┘ê╪» ╪¬╪╡┘à┘è┘à┘è╪⌐ (╪¬╪╡╪¡┘è╪¡ ┘à┘å ┘à╪▒╪º╪¼╪╣╪⌐ ╪½╪º┘å┘è╪⌐)

> ΓÜá∩╕Å **╪¬╪¡╪░┘è╪▒ ┘à┘ç┘à**: ╪º┘ä┘å╪│╪«╪⌐ ╪º┘ä╪ú┘ê┘ä┘ë ┘à┘å ┘ç╪░╪º ╪º┘ä┘é╪│┘à ╪º┘é╪¬╪▒╪¡╪¬ `scheduleNotification(...)` ┘ä┘ä┘Ç retry. ┘ä┘â┘å `scheduleNotification` (`WhatsAppNotificationService.js:2495-2519`) **┘è╪¡┘ä ╪º┘ä╪¼┘ä╪│╪⌐ ┘ê┘è┘Å╪½╪¿┘æ╪¬┘ç╪º ┘ê┘é╪¬ ╪º┘ä╪¼╪»┘ê┘ä╪⌐** ΓÇö ┘ä┘ê ╪º┘ä╪¼┘ä╪│╪⌐ ┘à┘é╪╖┘ê╪╣╪⌐ ┘ê┘é╪¬ ╪º┘ä┘ü╪┤┘ä╪î ┘è╪▒╪¼╪╣ `{success: false, reason: 'no_session'}` **┘é╪¿┘ä** ╪ú┘å ┘è┘â╪¬╪¿ ╪╡┘ü┘ï╪º ┘ü┘è ╪º┘ä╪╖╪º╪¿┘ê╪▒. ╪º┘ä┘å╪¬┘è╪¼╪⌐: retry ┘ä┘ü╪┤┘ä ╪º┘ä╪¼┘ä╪│╪⌐ **╪╣╪»┘è┘à ╪º┘ä┘ü╪º╪ª╪»╪⌐** ╪¿┘ç╪░╪º ╪º┘ä╪ú╪│┘ä┘ê╪¿.
>
> **╪º┘ä╪Ñ╪╡┘ä╪º╪¡ ╪º┘ä┘à╪╖┘ä┘ê╪¿**: ╪º┘ä╪Ñ╪╡┘ä╪º╪¡ ╪º┘ä╪¡┘é┘è┘é┘è ┘ä┘ü╪┤┘ä ╪º┘ä╪¼┘ä╪│╪⌐ ┘ç┘ê **╪¬╪ú╪¼┘è┘ä ╪¡┘ä ╪º┘ä╪¼┘ä╪│╪⌐ ╪Ñ┘ä┘ë ┘ê┘é╪¬ ╪º┘ä┘à╪╣╪º┘ä╪¼╪⌐** ╪»╪º╪«┘ä `processNotificationQueue` (┘ê┘ä┘è╪│ ┘ê┘é╪¬ ╪º┘ä╪¼╪»┘ê┘ä╪⌐). ┘ê┘ç╪░╪º **┘å┘ü╪│┘ç** ╪º┘ä╪Ñ╪╡┘ä╪º╪¡ ╪º┘ä╪░┘è ┘è╪¡┘ä ╪»╪╣┘à META_CLOUD ╪º┘ä┘à╪░┘â┘ê╪▒ ┘ü┘è ╪¬┘å╪¿┘è┘ç ┬º1.1. ┘ä╪░╪º:
> - **┘ä╪ú╪«╪╖╪º╪í ╪º┘ä╪Ñ╪▒╪│╪º┘ä ╪º┘ä╪╣╪º╪¿╪▒╪⌐ ╪║┘è╪▒ ╪º┘ä╪¼┘ä╪│╪⌐** (timeout ╪┤╪¿┘â╪⌐╪î rate limit): ╪º┘ä╪¼╪»┘ê┘ä╪⌐ ╪╣╪¿╪▒ ╪º┘ä╪╖╪º╪¿┘ê╪▒ **╪¿╪╣╪»** ┘ü╪╡┘ä ╪¡┘ä ╪º┘ä╪¼┘ä╪│╪⌐ ╪¬╪╣┘à┘ä.
> - **┘ä╪ú╪«╪╖╪º╪í ╪º┘ä╪¼┘ä╪│╪⌐ ╪º┘ä┘à┘é╪╖┘ê╪╣╪⌐**: ┘ä╪º ┘ü╪º╪ª╪»╪⌐ ┘à┘å retry ╪¡╪¬┘ë ┘è┘Å╪╖╪¿┘Ä┘æ┘é ╪º┘ä╪Ñ╪╡┘ä╪º╪¡ ╪º┘ä┘ç┘è┘â┘ä┘è ╪ú╪»┘å╪º┘ç.

**╪º┘ä╪¡┘ä ╪º┘ä┘à┘é╪¬╪▒╪¡ (╪¼╪▓╪ª╪º┘å)**:

**╪º┘ä╪¼╪▓╪í ╪ú ΓÇö ┘ü╪╡┘ä ╪¡┘ä ╪º┘ä╪¼┘ä╪│╪⌐ ╪╣┘å ╪º┘ä╪¼╪»┘ê┘ä╪⌐ (╪Ñ╪╡┘ä╪º╪¡ ┘ç┘è┘â┘ä┘è╪î ┘à╪▒╪¬╪¿╪╖ ╪¿┘Ç ┬º1.1)**:
┘ü┘è `scheduleNotification` (`:2495-2519`) ┘ê`processNotificationQueue` (`:3413`):
1. **┘ä╪º ╪¬╪¡┘ä ╪º┘ä╪¼┘ä╪│╪⌐ ┘ê┘é╪¬ `scheduleNotification`** ΓÇö ╪¿╪»┘ä ╪░┘ä┘â╪î ╪«╪▓┘æ┘å `companyId` ┘ü┘é╪╖ ┘ü┘è ╪╡┘ü ╪º┘ä╪╖╪º╪¿┘ê╪▒ (╪º┘ä╪¡┘é┘ä ┘à┘ê╪¼┘ê╪» ╪¿╪º┘ä┘ü╪╣┘ä ┘ü┘è `WhatsAppNotificationQueue.companyId`).
2. **╪¡┘Å┘ä ╪º┘ä╪¼┘ä╪│╪⌐ ┘ê┘é╪¬ `processNotificationQueue`** (╪╣┘å╪» ╪º┘ä╪Ñ╪▒╪│╪º┘ä ╪º┘ä┘ü╪╣┘ä┘è) ΓÇö ┘ç╪░╪º ┘è╪│┘à╪¡ ╪¿╪Ñ╪╣╪º╪»╪⌐ ╪º┘ä┘à╪¡╪º┘ê┘ä╪⌐ ┘ä╪º╪¡┘é┘ï╪º ╪╣┘å╪»┘à╪º ╪¬╪╣┘ê╪» ╪º┘ä╪¼┘ä╪│╪⌐/META_CLOUD ┘à╪¬╪╡┘ä╪⌐.
3. ┘ç╪░╪º ╪º┘ä╪¬╪║┘è┘è╪▒ **┘è╪¡┘ä ╪ú┘è╪╢┘ï╪º** ╪»╪╣┘à META_CLOUD ┘ü┘è ╪º┘ä╪╖╪º╪¿┘ê╪▒: ╪º┘ä┘à╪╣╪º┘ä╪¼ ┘è╪│╪¬╪«╪»┘à `sendNotification({...})` ╪º┘ä╪▒╪ª┘è╪│┘è (╪º┘ä╪░┘è ┘ü┘è┘ç DB fallback + META special-casing) ╪¿╪»┘ä╪º┘ï ┘à┘å `WhatsAppMessageHandler.sendText` ╪º┘ä┘à╪¿╪º╪┤╪▒.

**╪º┘ä╪¼╪▓╪í ╪¿ ΓÇö retry ┘ä┘ä╪Ñ╪▒╪│╪º┘ä ╪º┘ä╪╣╪º╪¿╪▒** (┘ü┘è `sendNotification` catch `:2387`):
```js
} catch (sendErr) {
  const retryable = isRetryableError(sendErr);  // timeout/rate-limit╪î ┘ê┘ä┘è╪│ no_session
  if (retryable && (attempt ?? 0) < 3) {
    const backoffMs = Math.min(30000, 5000 * Math.pow(2, attempt ?? 0));
    // ╪¿╪╣╪» ╪º┘ä╪¼╪▓╪í ╪ú: scheduleNotification ┘ä┘à ┘è╪╣╪» ┘è╪¡╪¬╪º╪¼ sessionId ┘à╪│╪¿┘é┘ï╪º
    await scheduleNotification({
      ...originalOptions,
      scheduleAt: new Date(Date.now() + backoffMs),
      priority: Math.max(priority ?? 5, 8),  // ╪ú┘é┘ä ╪ú┘ê┘ä┘ê┘è╪⌐ (╪ú╪▒┘é╪º┘à ╪ú╪╣┘ä┘ë)
    });
    return { status: 'RETRYING', scheduledAt: new Date(Date.now() + backoffMs) };
  }
  // ╪│╪¼┘æ┘ä FAILED ┘å┘ç╪º╪ª┘è
}
```

> ╪▒╪¿╪╖ ┘à╪╣ ┬º1.1: ╪º┘ä┘Ç retry ┘è╪╣╪¬┘à╪» ╪╣┘ä┘ë (╪ú) ╪╖╪º╪¿┘ê╪▒ ╪º┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä┘å╪┤╪╖╪î ┘ê(╪¿) ╪º┘ä╪¼╪▓╪í ╪ú (┘ü╪╡┘ä ╪¡┘ä ╪º┘ä╪¼┘ä╪│╪⌐). ╪¿╪»┘ê┘å ╪º┘ä╪¼╪▓╪í ╪ú╪î ╪º┘ä┘Ç retry ┘è╪╣┘à┘ä ┘ü┘é╪╖ ┘ä┘ä╪ú╪«╪╖╪º╪í ╪║┘è╪▒ ╪º┘ä╪¼┘ä╪│┘è╪⌐.

---

### ≡ƒƒí 5.1 ╪¬┘é╪│┘è┘à ╪º┘ä┘à┘ä┘ü ╪º┘ä╪╣┘à┘ä╪º┘é + ╪¬┘ê╪¡┘è╪» ╪º┘ä┘é┘ê╪º┘ä╪¿ (╪¬╪¡╪│┘è┘å ╪╡┘è╪º┘å╪⌐)

**╪º┘ä╪¼╪░╪▒**: `WhatsAppNotificationService.js` = **4206 ╪│╪╖╪▒** ┘è╪¼┘à╪╣ templates + queue + send + balancing + ┘â┘ä domain. ╪º┘ä┘é┘ê╪º┘ä╪¿ ╪╣╪▒╪¿┘è╪⌐ ┘ü┘é╪╖ ┘ê┘à╪¿╪╣╪½╪▒╪⌐ ┘ü┘è 3 ╪╖╪¿┘é╪º╪¬.

**╪º┘ä╪¡┘ä ╪º┘ä┘à┘é╪¬╪▒╪¡ (╪¬╪»╪▒┘è╪¼┘è╪î ┘ä╪º rewrite ┘â╪¿┘è╪▒)**:
1. **╪º╪│╪¬╪«╪▒╪º╪¼ ╪º┘ä┘é┘ê╪º┘ä╪¿**: `services/whatsapp/templates/defaultTemplates.js` (┘å┘é┘ä `DEFAULT_TEMPLATES` L15-904).
2. **╪º╪│╪¬╪«╪▒╪º╪¼ ╪º┘ä┘à┘ê╪º╪▓┘å╪⌐**: `services/whatsapp/sessionBalancer.js` (`getOrAssignSession`, sticky session, DB fallback).
3. **╪º╪│╪¬╪«╪▒╪º╪¼ ╪º┘ä╪╖╪º╪¿┘ê╪▒**: ┘à┘å╪╖┘é `processNotificationQueue` + `scheduleNotification` ╪Ñ┘ä┘ë module ┘à┘å┘ü╪╡┘ä.
4. **i18n ┘ä┘ä┘é┘ê╪º┘ä╪¿**: ╪ú╪╢┘ü ╪»╪╣┘à ╪º┘ä┘ä╪║╪⌐ ╪╣┘ä┘ë ┘à╪│╪¬┘ê┘ë `Company.locale` (╪ú┘ê `Customer.locale`) ΓÇö ╪º┘ä┘é╪º┘ä╪¿ ┘è┘Å╪«╪¬╪º╪▒ ╪¿╪º┘ä┘ä╪║╪⌐. ╪º╪¿╪»╪ú ╪¿╪º┘ä╪╣╪▒╪¿┘è╪⌐ (╪º┘ä╪¡╪º┘ä┘è) + skeleton ╪Ñ┘å╪¼┘ä┘è╪▓┘è.

> ┘ç╪░┘ç ╪º┘ä┘à╪▒╪¡┘ä╪⌐ **╪º╪«╪¬┘è╪º╪▒┘è╪⌐/╪¬╪»╪▒┘è╪¼┘è╪⌐** ΓÇö ┘ä╪º ╪¬╪ñ╪½╪▒ ╪╣┘ä┘ë ╪º┘ä╪Ñ╪╡┘ä╪º╪¡╪º╪¬ ╪º┘ä╪¡╪▒╪¼╪⌐. ┘å┘ü┘æ╪░┘ç╪º ┘ü┘é╪╖ ╪¿╪╣╪» ╪º╪│╪¬┘é╪▒╪º╪▒ ┬º1ΓÇô┬º4.

### ≡ƒôï ┘à╪º ┘å┘Å┘ü┘æ╪░ ┘ü╪╣┘ä┘è╪º┘ï (╪¡╪¬┘ë 2026-08-03) ┘à┘é╪º╪¿┘ä ┘à╪º ╪¬╪ú╪¼┘æ┘ä

**┘å┘Å┘ü┘æ╪░ (╪º┘ä┘à┘ä┘ü ┘å╪▓┘ä ┘à┘å 4206 ΓåÆ ~3227 ╪│╪╖╪▒):**
- Γ£à `DEFAULT_TEMPLATES` ΓåÆ `services/whatsapp/templates/defaultTemplates.js` (╪¿┘è╪º┘å╪º╪¬ ┘å┘é┘è╪⌐╪î ~890 ╪│╪╖╪▒).
- Γ£à ┘à┘ê╪º╪▓┘å╪⌐ ╪º┘ä╪¼┘ä╪│╪º╪¬ (Sticky / Round-Robin / JIT init) ΓåÆ `services/whatsapp/sessionBalancer.js` (+ `sessionRotation`, `sessionInitializationInFlight`).
- Γ£à `formatPhoneNumber` ΓåÆ `utils/phoneFormat.js` (┘à╪┤╪¬╪▒┘â ╪¿┘è┘å ╪º┘ä╪«╪»┘à╪⌐ ┘ê╪º┘ä┘Ç balancer).
- Γ£à ┘å┘ê╪º╪⌐ ╪º┘ä╪ú┘å┘ê╪º╪╣ ╪º┘ä┘å┘é┘è╪⌐ ΓåÆ `services/whatsapp/notificationTypes.js` (`getPersistedNotificationEventType` / `getPersistedNotificationCategory` / `getPersistedNotificationRecipientType` / `isOrderCategory`) ΓÇö ╪¬┘Å╪│╪¬╪«╪»┘à ┘à┘å ╪º┘ä╪«╪»┘à╪⌐ ┘ê╪º┘ä┘Ç dedup ┘à╪╣╪º┘ï╪î ┘ê╪¬┘Å╪╣╪º╪» ╪¬╪╡╪»┘è╪▒┘ç╪º ┘à┘å `WhatsAppNotificationService` ┘ä┘ä┘à╪¬┘ê╪º┘ü┘é┘è┘å ╪º┘ä╪¡╪º┘ä┘è┘è┘å.
- Γ£à ┘â┘ä ╪º┘ä╪¬╪╡╪»┘è╪▒╪º╪¬ ╪º┘ä╪«╪º╪▒╪¼┘è╪⌐ ┘à╪¡┘ü┘ê╪╕╪⌐ (`DEFAULT_TEMPLATES`, `formatPhoneNumber`, `resolveDeliveryCompanyId`, `getPersistedNotificationEventType`, ...) ΓÇö ╪¬╪¡┘é┘æ┘é ┘à┘å `adminWhatsAppController` / `customerWhatsAppController` / `whatsappNotificationController`.

**┘à╪¬╪ú╪¼┘æ┘ä (╪¿╪│╪¿╪¿ ┘à╪¡╪»╪»):**
- ΓÅ╕∩╕Å **╪º╪│╪¬╪«╪▒╪º╪¼ ╪º┘ä╪╖╪º╪¿┘ê╪▒/`senders`** (╪º┘ä╪¿┘å╪» 3 + ╪¬┘ü╪╡┘è┘ä ╪│╪º╪¿┘é): ╪»┘ê╪º┘ä ╪º┘ä╪Ñ╪▒╪│╪º┘ä (HR/loyalty/signup/orders) ┘ê╪º┘ä╪╖╪º╪¿┘ê╪▒ ╪¬╪╣╪¬┘à╪» ╪╣┘ä┘ë ~20 ╪»╪º┘ä╪⌐ ┘à╪┤╪¬╪▒┘â╪⌐ ┘ü┘è ╪º┘ä┘à┘ä┘ü ╪º┘ä╪▒╪ª┘è╪│┘è ΓÇö ╪º┘ä╪º╪│╪¬╪«╪▒╪º╪¼ ┘è╪¬╪╖┘ä╪¿ module ┘å┘ê╪º╪⌐ ╪Ñ╪╢╪º┘ü┘è╪º┘ï ┘ê┘è╪╣╪▒┘æ╪╢ ┘ä┘Ç circular dependencies. ┘é┘è┘æ┘à ┘ä╪º╪¡┘é╪º┘ï ┘â┘Ç refactor ┘à╪│╪¬┘é┘ä.
- ΓÅ╕∩╕Å **i18n ┘ä┘ä╪▒╪│╪º╪ª┘ä** (╪º┘ä╪¿┘å╪» 4): ┘à┘è╪▓╪⌐ ┘à┘å╪¬╪¼ ┘â╪º┘à┘ä╪⌐ ΓÇö ╪¬╪¬╪╖┘ä╪¿ ╪¡┘é┘ä ┘ä╪║╪⌐ ╪╣┘ä┘ë ╪º┘ä┘é╪º┘ä╪¿/╪º┘ä╪┤╪▒┘â╪⌐ + UI ┘ü┘è ╪╡┘ü╪¡╪⌐ status-templates + ╪¿╪░╪▒ ┘é┘ê╪º┘ä╪¿ ╪Ñ┘å╪¼┘ä┘è╪▓┘è╪⌐. ╪«╪º╪▒╪¼ ┘å╪╖╪º┘é ╪Ñ╪╡┘ä╪º╪¡ ╪º┘ä╪ú╪«╪╖╪º╪í.

---

### ≡ƒƒá 5.2 ╪│╪»┘æ ╪¬╪¼╪º┘ê╪▓╪º╪¬ ╪º┘ä╪┤╪║┘æ╪º┘ä╪⌐ ╪º┘ä┘à╪¬┘é╪»┘à╪⌐ (workflow raw updates)

> ≡ƒåò **╪ú┘Å╪╢┘è┘ü ┘à┘å ┘à╪▒╪º╪¼╪╣╪⌐ ╪½╪º┘å┘è╪⌐**: ┘à╪┤┘â┘ä╪⌐ ╪╡╪¡╪⌐ ╪¿┘è╪º┘å╪º╪¬ ┘ü╪╣┘ä┘è╪⌐╪î ┘ä┘è╪│╪¬ ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ┘ü┘é╪╖.

**╪º┘ä╪¼╪░╪▒**: `services/orderWorkflowService.js:351` ┘ê `:471` ┘è╪│╪¬╪«╪»┘à╪º┘å `prisma.order.update` ╪«╪º┘à ┘ä╪¬╪╖╪¿┘è┘é ┘å╪¬┘è╪¼╪⌐ ╪º┘ä╪¬╪¡┘é┘é (`validateStatusChange`) ΓÇö ┘ç╪░╪º ┘è╪¬╪¼╪º┘ê╪▓ `orderService.updateOrderStatus`╪î ┘ü┘ä╪º ┘à╪▓╪º┘à┘å╪⌐ `metadata.preparationStatus` ┘ä┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä╪¬┘è ╪¬┘å╪¬┘é┘ä ╪╣╪¿╪▒ ╪º┘ä╪┤╪║┘æ╪º┘ä╪⌐ ╪º┘ä┘à╪¬┘é╪»┘à╪⌐.

**╪º┘ä╪¬╪ú╪½┘è╪▒**: ╪╖╪º╪¿┘ê╪▒ ╪º┘ä╪¬╪¡╪╢┘è╪▒ (`preparationQueueService` ┘è┘é╪▒╪ú `metadata.preparationStatus` ┘â┘à╪╡╪»╪▒ ┘ä┘ä╪¡┘é┘è┘é╪⌐) ┘ä╪º ┘è╪▒┘ë ╪¬╪║┘è┘è╪▒╪º╪¬ ╪º┘ä╪┤╪║┘æ╪º┘ä╪⌐ ΓåÆ ╪╖┘ä╪¿╪º╪¬ ╪¬╪╢┘è╪╣ ┘à┘å ┘é╪º╪ª┘à╪⌐ ╪º┘ä╪¬╪¡╪╢┘è╪▒ ╪ú┘ê ╪¬╪¬╪ú╪«╪▒.

**╪º┘ä╪¡┘ä ╪º┘ä┘à┘é╪¬╪▒╪¡** (╪«┘è╪º╪▒╪º┘å ΓÇö ╪º╪«╪¬╪▒ ╪¡╪│╪¿ ╪º┘ä╪¬╪╣┘é┘è╪» ╪º┘ä┘à┘é╪¿┘ê┘ä):

**╪º┘ä╪«┘è╪º╪▒ ╪ú (┘à┘ê╪╡┘ë ╪¿┘ç ΓÇö ╪ú┘é┘ä ╪¬╪║┘è┘è╪▒)**: ╪¿╪╣╪» `prisma.order.update` ╪º┘ä╪«╪º┘à ┘ü┘è ┘â┘ä╪º ╪º┘ä┘à┘ê┘é╪╣┘è┘å╪î ╪º╪│╪¬╪»╪╣┘É ╪»╪º┘ä╪⌐ ┘à╪▓╪º┘à┘å╪⌐ `metadata.preparationStatus` ┘à╪¿╪º╪┤╪▒╪⌐. ┘ç╪░┘ç ╪º┘ä╪»╪º┘ä╪⌐ ┘à┘ê╪¼┘ê╪»╪⌐ ╪¿╪º┘ä┘ü╪╣┘ä ╪»╪º╪«┘ä `orderService.updateOrderStatus` (╪º┘ä┘à┘å╪╖┘é ╪╣┘å╪» `orderService.js:1025-1034`) ΓÇö ╪º╪│╪¬╪«╪▒╪¼┘ç╪º ┘â╪»╪º┘ä╪⌐ ┘à╪│╪¬┘é┘ä╪⌐ ┘é╪º╪¿┘ä╪⌐ ┘ä┘ä╪º╪│╪¬╪»╪╣╪º╪í:
```js
// ≡ƒÜ¿ PRODUCTION-FIX (notifications-fix-plan ┬º5.2):
// ╪¿╪╣╪» ┘â┘ä prisma.order.update ╪«╪º┘à ┘ü┘è orderWorkflowService.js:351/:471:
const orderService = require('./orderService');
await orderService.syncPreparationMetadata(orderId, newStatus);
```
> **┘à╪╖┘ä┘ê╪¿ ┘à┘å ╪º┘ä┘à┘å┘ü┘æ╪░**: ╪¬╪ú┘â╪» ╪Ñ┘å `syncPreparationMetadata` ╪»╪º┘ä╪⌐ ┘à╪│╪¬┘é┘ä╪⌐ (╪ú┘ê ╪º╪│╪¬╪«╪▒╪¼┘ç╪º ┘à┘å `updateOrderStatus`). ┘ä╪º ╪¬┘Å┘â╪▒╪▒ ┘à┘å╪╖┘é ╪º┘ä╪¬╪╖╪¿┘è╪╣ ┘ü┘è ┘à┘â╪º┘å┘è┘å.

**╪º┘ä╪«┘è╪º╪▒ ╪¿ (╪ú┘å╪╕┘ü ┘ä┘â┘å ╪ú┘â╪¿╪▒)**: ╪º╪│╪¬╪¿╪»┘ä `prisma.order.update` ╪º┘ä╪«╪º┘à ┘ü┘è `orderWorkflowService` ╪¿╪º┘ä╪º╪│╪¬╪»╪╣╪º╪í ╪º┘ä┘â╪º┘à┘ä ┘ä┘Ç `updateOrderStatus` (╪¿┘å┘ü╪│ ╪¬┘ê┘é┘è╪╣ ┬º1.2). ┘ä┘â┘å ┘ç╪░╪º ┘é╪» ┘è╪│╪¿╪¿ ╪¬┘â╪▒╪º╪▒ ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ (┘è┘Å╪╣╪º┘ä╪¼ ╪¿┘Ç ┬º3.1 dedup).

**┘à╪╣╪º┘è┘è╪▒ ╪º┘ä┘å╪¼╪º╪¡ ┬º5.2**:
- [ ] ╪╖┘ä╪¿ ┘è┘å╪¬┘é┘ä ╪╣╪¿╪▒ workflow transition (┘à╪½┘ä╪º┘ï READY_FOR_PROCESSINGΓåÆPROCESSING) ΓåÆ `metadata.preparationStatus` ┘è┘Å╪¡╪»┘æ╪½.
- [ ] ╪╖╪º╪¿┘ê╪▒ ╪º┘ä╪¬╪¡╪╢┘è╪▒ ┘è╪▒┘ë ╪º┘ä╪╖┘ä╪¿ ┘ü┘è ╪º┘ä┘é╪º╪ª┘à╪⌐ ╪º┘ä╪╡╪¡┘è╪¡╪⌐ ╪¿╪╣╪» transition.

**╪«╪╖╪⌐ ╪º┘ä╪¬╪▒╪º╪¼╪╣ ┬º5.2**: `git checkout -- services/orderWorkflowService.js`.

---

### ≡ƒƒá 5.3 ┘à╪▒╪º┘é╪¿╪⌐ ╪º┘ä╪╖╪º╪¿┘ê╪▒ (queue stats endpoint + alert)

> ≡ƒåò **╪ú┘Å╪╢┘è┘ü ┘à┘å ┘à╪▒╪º╪¼╪╣╪⌐ ╪½╪º┘å┘è╪⌐**: ╪│╪»┘æ ┘ü╪¼┘ê╪⌐ #12 ┘à┘å ╪º┘ä╪¬╪»┘é┘è┘é ╪º┘ä╪ú╪╡┘ä┘è.

**╪º┘ä╪¼╪░╪▒**: ╪¿╪╣╪» ╪¬┘ü╪╣┘è┘ä ╪º┘ä╪╖╪º╪¿┘ê╪▒ (┬º1.1)╪î ┘ä╪º ┘è┘ê╪¼╪» endpoint ┘è╪╣╪▒╪╢ "┘â┘à ╪Ñ╪┤╪╣╪º╪▒ ╪╣╪º┘ä┘é" ┘ê┘ä╪º alert ┘ä┘ê ╪º┘ä╪╖╪º╪¿┘ê╪▒ ╪¿┘è┘â╪¿╪▒. ┘à╪┤┘â┘ä╪⌐ #1 ╪º┘ä╪ú╪╡┘ä┘è╪⌐ (╪º┘ä╪╖╪º╪¿┘ê╪▒ ╪º┘ä┘à┘è╪¬) ┘à┘à┘â┘å ╪¬╪│╪¬┘à╪▒ ╪┤┘ç┘ê╪▒ ╪¿╪»┘ê┘å ┘à╪º ╪¡╪» ┘è┘ä╪º╪¡╪╕╪¢ ┘à╪╣ ╪¬┘ü╪╣┘è┘ä┘ç╪î ╪╣┘â╪│ ╪░┘ä┘â ΓÇö ╪ú┘è ╪¬╪╣╪╖┘ä ╪╡╪º┘à╪¬ ┘ä╪º╪▓┘à ┘è╪╕┘ç╪▒ ╪¿╪│╪▒╪╣╪⌐.

**╪º┘ä╪¡┘ä ╪º┘ä┘à┘é╪¬╪▒╪¡** (╪¼╪▓╪í╪º┘å):

**╪º┘ä╪¼╪▓╪í ╪ú ΓÇö endpoint ╪Ñ╪¡╪╡╪º╪ª┘è╪º╪¬**: ╪ú╪╢┘ü ┘ü┘è `controller/whatsappNotificationController.js`:

> ≡ƒƒí **╪¬╪╡╪¡┘è╪¡ ┘à┘å ┘à╪▒╪º╪¼╪╣╪⌐ ╪½╪º┘ä╪½╪⌐**: ╪º┘ä┘å╪│╪«╪⌐ ╪º┘ä╪ú┘ê┘ä┘ë ╪º╪│╪¬╪«╪»┘à╪¬ `status: { notIn: ['COMPLETED', 'PENDING', 'PROCESSING'] }` ┘ä┘Ç failed ΓÇö ┘ç╪░╪º ╪«╪º╪╖╪ª ┘ä╪│╪¿╪¿┘è┘å: (1) `'COMPLETED'` ┘ä┘è╪│╪¬ ┘é┘è┘à╪⌐ enum ╪╡╪º┘ä╪¡╪⌐ (╪▒╪º╪¼╪╣ ┬º1.1-pre)╪î (2) ╪º┘ä┘Ç enum ┘è╪¡╪¬┘ê┘è `FAILED` ┘ê`CANCELLED` ╪╡╪▒╪º╪¡╪⌐┘ï. ╪º╪│╪¬╪«╪»┘à ╪¬╪╖╪º╪¿┘é┘ï╪º ╪¬╪º┘à┘ï╪º ╪╣┘ä┘ë ┘é┘è┘à ╪º┘ä┘Ç enum ╪º┘ä╪«┘à╪│: `PENDING, PROCESSING, SENT, FAILED, CANCELLED`.

```js
// ≡ƒÜ¿ PRODUCTION-FIX (notifications-fix-plan ┬º5.3): queue stats endpoint
async function getNotificationQueueStats(req, res) {
  const prisma = getSharedPrismaClient();
  const companyId = req.user.companyId;

  const [pending, processing, sent, failed, cancelled, overdue] = await Promise.all([
    prisma.whatsAppNotificationQueue.count({ where: { companyId, status: 'PENDING' } }),
    prisma.whatsAppNotificationQueue.count({ where: { companyId, status: 'PROCESSING' } }),
    prisma.whatsAppNotificationQueue.count({ where: { companyId, status: 'SENT' } }),          // ≡ƒƒí SENT ╪¿╪»┘ä COMPLETED
    prisma.whatsAppNotificationQueue.count({ where: { companyId, status: 'FAILED' } }),
    prisma.whatsAppNotificationQueue.count({ where: { companyId, status: 'CANCELLED' } }),
    // overdue = PENDING ┘à╪│╪¬╪¡┘é╪⌐ ┘ä┘à ╪¬┘Å╪╣╪º┘ä╪¼ (> 2 ╪»┘é┘è┘é╪⌐) ΓÇö ┘à╪ñ╪┤╪▒ ╪╡╪¡╪⌐ ╪º┘ä╪╖╪º╪¿┘ê╪▒
    prisma.whatsAppNotificationQueue.count({
      where: { companyId, status: 'PENDING', scheduledAt: { lte: new Date(Date.now() - 120000) } }
    }),
  ]);

  res.json({ pending, processing, sent, failed, cancelled, overdue, healthy: overdue === 0 });
}
```
╪│╪¼┘æ┘ä┘ç ┘ü┘è `routes/whatsappNotificationRoutes.js` ┘â┘Ç `GET /stats` (┘à╪¡┘à┘è ╪¿╪╡┘ä╪º╪¡┘è╪⌐).

**╪º┘ä╪¼╪▓╪í ╪¿ ΓÇö alert ┘ü┘è ╪º┘ä┘Ç worker**: ┘ü┘è `notificationQueueWorker.js` (┘à┘å ┬º1.1)╪î ╪│╪¼┘æ┘ä ╪¬╪¡╪░┘è╪▒ ╪╡╪▒┘è╪¡ ┘ä┘ê `overdue > 0`:
```js
// ┘â┘ä ╪»┘é┘è┘é╪⌐╪î ╪¿╪╣╪» processNotificationQueue╪î ╪º┘ü╪¡╪╡ overdue
const overdue = await prisma.whatsAppNotificationQueue.count({
  where: { status: 'PENDING', scheduledAt: { lte: new Date(Date.now() - 120000) } }
});
if (overdue > 10) {
  console.error(`≡ƒÜ¿ [NOTIF-QUEUE] ${overdue} notifications overdue (>2min) ΓÇö check worker/Redis/META_CLOUD`);
}
```

#### ΓÜá∩╕Å ╪¬┘å╪¿┘è┘ç╪º╪¬
- ≡ƒƒí **┘à╪ñ┘â╪» (┘à╪▒╪º╪¼╪╣╪⌐ ╪½╪º┘ä╪½╪⌐)**: `WhatsAppNotificationQueueStatus` enum (`schema.prisma:3625`) ┘é┘è┘à┘ç: `PENDING, PROCESSING, SENT, FAILED, CANCELLED`. ┘ä╪º `COMPLETED` ΓÇö ┘ä╪░╪º stats ┘è╪│╪¬╪«╪»┘à `SENT` ┘ä┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä┘å╪º╪¼╪¡╪⌐ (╪▒╪º╪¼╪╣ ┬º1.1-pre).
- **╪º┘ä╪¡╪» (threshold)**: ╪º╪¿╪»╪ú ╪¿┘Ç 10 ┘â┘Ç alert threshold╪î ╪º╪╢╪¿╪╖┘ç ╪¿┘å╪º╪í┘ï ╪╣┘ä┘ë ╪º┘ä╪¡┘à┘ä ╪º┘ä┘ü╪╣┘ä┘è.

**┘à╪╣╪º┘è┘è╪▒ ╪º┘ä┘å╪¼╪º╪¡ ┬º5.3**:
- [ ] `GET /api/v1/whatsapp-notifications/stats` ┘è╪▒╪¼╪╣ counts ╪╡╪¡┘è╪¡╪⌐.
- [ ] ┘ä┘ê ╪º┘ä╪╖╪º╪¿┘ê╪▒ ┘è╪¬╪▒╪º┘â┘à (>10 overdue)╪î ┘è╪╕┘ç╪▒ ╪«╪╖╪ú ┘ê╪º╪╢╪¡ ┘ü┘è ╪º┘ä┘Ç logs.
- [ ] ╪º┘ä┘ä┘ê╪¡╪⌐ ╪º┘ä╪Ñ╪»╪º╪▒┘è╪⌐ (╪º╪«╪¬┘è╪º╪▒┘è) ╪¬╪╣╪▒╪╢ ┘ç╪░┘ç ╪º┘ä╪ú╪▒┘é╪º┘à.

**╪«╪╖╪⌐ ╪º┘ä╪¬╪▒╪º╪¼╪╣ ┬º5.3**: ╪º╪¡╪░┘ü endpoint + ╪º┘ä┘Ç alert block. ┘ä╪º ╪¬╪ú╪½┘è╪▒ ┘ê╪╕┘è┘ü┘è (┘à╪▒╪º┘é╪¿╪⌐ ┘ü┘é╪╖).

---

### ≡ƒöº ┘à╪¬╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘å╪┤╪▒ (┘à┘å┘ü┘æ╪░ ΓÇö ╪¿╪╣╪» ╪º┘â╪¬┘à╪º┘ä ┬º1.1ΓÇô┬º5.3)

- **Redis**: `REDIS_URL` ╪ú┘ê `REDIS_HOST/PORT/PASSWORD` ┘ü┘è `.env` ΓÇö ┘ä┘ê ╪║┘è╪▒ ┘à┘â┘ê┘æ┘å╪î ╪º┘ä┘Ç worker ┘è╪╣┘à┘ä ╪¿┘Ç fallback polling (setInterval 60s) ┘à╪╣ ╪¬╪¡╪░┘è╪▒╪î ┘ê╪º┘ä╪ú╪»╪º╪í ╪ú┘é┘ä ╪¬╪╣╪»╪»╪º┘ï ┘ä┘ä┘Ç instances.
- **┘ä╪º schema migration ┘à╪╖┘ä┘ê╪¿╪⌐**: ┘ä╪º ╪¬╪║┘è┘è╪▒ enums ┘ê┘ä╪º ┘é┘è┘ê╪» DB (┘é╪▒╪º╪▒ ┬º3.1). ╪º┘ä╪¬╪║┘è┘è╪▒╪º╪¬ ┘â┘ä┘ç╪º app-level.
- **╪┤╪▒┘â╪⌐ Mokhtar**: ╪¬╪ú┘â╪» ╪ú┘å `company.name` ┘ü┘è DB ┘è╪¡┘ê┘è "Mokhtar Elhenawy Store" ΓÇö ╪º┘ä┘Ç footer/╪º┘ä╪▒┘ê╪º╪¿╪╖ ╪º┘ä╪ó┘å ╪¬┘Å┘é╪▒╪ú ┘à┘å DB (┘ä╪º ┘ç╪º╪▒╪»┘â┘ê╪»).
- **╪º┘ä╪¬╪¡┘é┘é ╪¿╪╣╪» ╪º┘ä┘å╪┤╪▒**: `GET /api/v1/whatsapp-notifications/queue-stats` ┘è╪╣┘à┘ä╪î ┘ê`psql` ┘ä┘ä╪╖╪º╪¿┘ê╪▒ ┘ä╪º ┘è╪¬╪▒╪º┘â┘à PENDING ┘à╪│╪¬╪¡┘é╪⌐.

---

## 6. ╪¬╪▒╪¬┘è╪¿ ╪º┘ä╪¬┘å┘ü┘è╪░ ╪º┘ä┘à┘ê╪╡┘ë ╪¿┘ç + ╪º┘ä╪¼╪»┘ê┘ä ╪º┘ä╪▓┘à┘å┘è

| ╪º┘ä╪¬╪▒╪¬┘è╪¿ | ╪º┘ä┘à┘ç┘à╪⌐ | ╪º┘ä╪¼┘ç╪» | ╪º┘ä┘à╪«╪º╪╖╪▒╪⌐ | ┘è╪╣╪¬┘à╪» ╪╣┘ä┘ë |
|---------|--------|------|---------|-----------|
| 1 | ≡ƒö┤ ┬º1.1-pre ╪¬╪╡╪¡┘è╪¡ enum `'COMPLETED'ΓåÆ'SENT'` (╪¡╪º╪¼╪▓) | ╪╡╪║┘è╪▒ | ┘à┘å╪«┘ü╪╢╪⌐ (╪│╪╖╪▒ ┘ê╪º╪¡╪») | ΓÇö |
| 2 | ┬º1.1 ╪¬┘ü╪╣┘è┘ä ╪º┘ä╪╖╪º╪¿┘ê╪▒ | ┘à╪¬┘ê╪│╪╖ | ┘à┘å╪«┘ü╪╢╪⌐ (┘â╪º┘å ┘à┘è╪¬╪º┘ï) | ┬º1.1-pre (╪Ñ┘ä╪▓╪º┘à┘è) |
| 3 | ┬º2.1-pre mapping event type (╪┤╪▒╪╖ ┘à╪│╪¿┘é) | ╪╡╪║┘è╪▒ | ┘à┘å╪«┘ü╪╢╪⌐ | ΓÇö |
| 4 | ┬º2.1 ╪¬┘ê╪│┘è╪╣ ╪«╪▒┘è╪╖╪⌐ ╪º┘ä╪¡╪º┘ä╪º╪¬ | ╪╡╪║┘è╪▒ | ┘à╪¬┘ê╪│╪╖╪⌐ (┘é╪» ┘è╪¿╪»╪ú ╪Ñ╪▒╪│╪º┘ä╪º╪¬ ╪¼╪»┘è╪»╪⌐) | ┬º1.1╪î ┬º2.1-pre |
| 5 | ┬º1.2 ╪Ñ╪╡┘ä╪º╪¡ ╪º┘ä┘â╪▒┘ê┘å | ╪╡╪║┘è╪▒ | ┘à┘å╪«┘ü╪╢╪⌐ | ┬º2.1 (╪¡╪¬┘ë ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä╪¼╪»┘è╪»╪⌐ ╪¬┘Å╪▒╪│┘ä) |
| 6 | ┬º2.2 ╪Ñ╪▓╪º┘ä╪⌐ ╪º┘ä┘ç╪º╪▒╪»┘â┘ê╪» | ╪╡╪║┘è╪▒ | ┘à┘å╪«┘ü╪╢╪⌐ | ΓÇö |
| 7 | ┬º3.1 ╪¬┘ê╪¡┘è╪» dedup + DB unique | ┘à╪¬┘ê╪│╪╖ | ┘à╪¬┘ê╪│╪╖╪⌐ (migration) | ΓÇö |
| 8 | ┬º4.1 retry + ┘ü╪╡┘ä ╪¡┘ä ╪º┘ä╪¼┘ä╪│╪⌐ | ┘à╪¬┘ê╪│╪╖ | ┘à╪¬┘ê╪│╪╖╪⌐ (┘ç┘è┘â┘ä┘è) | ┬º1.1 (┘è╪¡┘ä META_CLOUD ╪ú┘è╪╢┘ï╪º) |
| 9 | ┬º5.2 ╪│╪»┘æ ╪¬╪¼╪º┘ê╪▓╪º╪¬ workflow | ╪╡╪║┘è╪▒ | ┘à┘å╪«┘ü╪╢╪⌐ | ΓÇö |
| 10 | ┬º5.3 ┘à╪▒╪º┘é╪¿╪⌐ ╪º┘ä╪╖╪º╪¿┘ê╪▒ | ╪╡╪║┘è╪▒ | ┘à┘å╪«┘ü╪╢╪⌐ | ┬º1.1 |
| 11 | ┬º5.1 ╪º┘ä╪¬┘é╪│┘è┘à + i18n | ┘â╪¿┘è╪▒ | ┘à┘å╪«┘ü╪╢╪⌐ (╪¬╪»╪▒┘è╪¼┘è) | ┘â┘ä ┘à╪º ╪│╪¿┘é |

**╪º┘ä╪¡╪» ╪º┘ä╪▓┘à┘å┘è ╪º┘ä┘à┘é╪¬╪▒╪¡**: ┬º1.1-pre+┬º1.1+┬º2.1-pre+┬º2.1+┬º1.2+┬º2.2 = 1ΓÇô2 ┘è┘ê┘à ╪╣┘à┘ä (╪º┘ä╪¡╪▒╪¼╪⌐)╪¢ ┬º3.1+┬º4.1+┬º5.2+┬º5.3 = 2ΓÇô3 ╪ú┘è╪º┘à╪¢ ┬º5.1 = ╪ú╪│╪¿┘ê╪╣+.

---

## 7. ╪º╪│╪¬╪▒╪º╪¬┘è╪¼┘è╪⌐ ╪º┘ä╪º╪«╪¬╪¿╪º╪▒ ┘ê╪º┘ä╪╖╪▒╪¡

### 7.1 ╪│┘è┘å╪º╪▒┘è┘ê┘ç╪º╪¬ ╪º╪«╪¬╪¿╪º╪▒ ┘è╪»┘ê┘è╪⌐ (┘ä┘â┘ä ┘à╪▒╪¡┘ä╪⌐)
| # | ╪º┘ä╪│┘è┘å╪º╪▒┘è┘ê | ╪º┘ä┘à╪¬┘ê┘é╪╣ | ╪º┘ä┘à╪▒╪¡┘ä╪⌐ |
|---|-----------|---------|---------|
| 1 | ╪Ñ╪┤╪╣╪º╪▒ ┘ü┘è quiet-hours | ┘è┘Å╪▒╪│┘ä ╪«┘ä╪º┘ä 60╪½ ╪¿╪╣╪» ┘å┘ç╪º┘è╪⌐ ╪º┘ä┘ç╪»┘ê╪í | ┬º1.1 |
| 2 | ╪╖╪º╪¿┘ê╪▒ Redis ┘à┘Å╪╖┘ü╪ú | fallback polling ┘è╪╣┘à┘ä | ┬º1.1 |
| 3 | ┘é╪º╪╣╪»╪⌐ auto-change (╪¿╪╣╪» X ╪»┘é┘è┘é╪⌐ ΓåÆ SHIPPED) | ╪Ñ╪┤╪╣╪º╪▒ ╪┤╪¡┘å ┘è╪╡┘ä ┘ä┘ä╪╣┘à┘è┘ä | ┬º1.2 |
| 4 | ╪¬╪║┘è┘è╪▒ ╪╖┘ä╪¿ ┘ä┘Ç RETURNED (notifyCustomer:true) | ╪Ñ╪┤╪╣╪º╪▒ ┘è╪╡┘ä | ┬º2.1 |
| 5 | ╪¬╪║┘è┘è╪▒ ╪╖┘ä╪¿ ┘ä╪¡╪º┘ä╪⌐ notifyCustomer:false | ┘ä╪º ╪Ñ╪┤╪╣╪º╪▒ | ┬º2.1 |
| 6 | ╪┤╪▒┘â╪⌐ ╪¼╪»┘è╪»╪⌐ (╪║┘è╪▒ Mokhtar) | ╪º╪│┘à┘ç╪º + ┘å╪╖╪º┘é┘ç╪º ┘ü┘è ╪º┘ä╪Ñ╪┤╪╣╪º╪▒ | ┬º2.2 |
| 7 | flip-flop CONFIRMEDΓåÆCANCELLEDΓåÆCONFIRMED (>10╪½) | ┘ä╪º ╪Ñ╪┤╪╣╪º╪▒ ┘à╪¬┘â╪▒╪▒ ┘à╪╖╪º╪¿┘é | ┬º3.1 |
| 8 | ≡ƒƒí ╪╖┘ä╪¿ ┘è┘å╪¬┘é┘ä ┘ä┘Ç RETURNED ╪╣╪¿╪▒ ╪┤╪▒┘â┘ç META_CLOUD | ╪º┘ä╪Ñ╪┤╪╣╪º╪▒ ┘è╪╡┘ä (┘ä╪º ┘è┘Å╪¬╪«╪╖┘ë) | ┬º1.1+┬º4.1 |
| 9 | ≡ƒƒí ╪¼┘ê┘ä╪⌐ processNotificationQueue > 60╪½ | ╪º┘ä╪¼┘ê┘ä╪⌐ ╪º┘ä╪¬╪º┘ä┘è╪⌐ ╪¬╪¬╪«╪╖┘ë (┘ä╪º ╪¬╪»╪º╪«┘ä) | ┬º1.1 |

### 7.2 ╪ú┘ê╪º┘à╪▒ ╪¬╪¡┘é┘é
```bash
# ╪º┘ä╪╖╪º╪¿┘ê╪▒ ┘ä╪º ┘è╪¬╪▒╪º┘â┘à PENDING ┘à╪│╪¬╪¡┘é╪⌐
psql -d maxp -c "SELECT COUNT(*) FROM whatsapp_notification_queue
  WHERE status='PENDING' AND \"scheduledAt\" <= NOW();"

# ┘ä╪º ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ┘à┘â╪▒╪▒╪⌐ ┘ü┘è ╪º┘ä┘Ç 10╪½ ╪º┘ä╪ú╪«┘è╪▒╪⌐ (≡ƒƒí ╪º╪│┘à ╪º┘ä╪¼╪»┘ê┘ä ╪¼┘à╪╣: whatsapp_notification_logs)
psql -d maxp -c "SELECT \"orderId\", \"eventType\", COUNT(*)
  FROM whatsapp_notification_logs
  WHERE \"createdAt\" >= NOW() - INTERVAL '10 seconds'
  GROUP BY \"orderId\", \"eventType\" HAVING COUNT(*) > 1;"

# ╪º┘ä╪¿╪¡╪½ ╪╣┘å ┘ç╪º╪▒╪»┘â┘ê╪» ┘à╪¬╪¿┘é┘æ┘ì
grep -rn "Mokhtar Elhenawy\|mokhtarelhenawy" apps/backend/services/whatsapp/

# ≡ƒƒí ┘à╪▒╪º┘é╪¿╪⌐ ╪º┘ä╪╖╪º╪¿┘ê╪▒ (╪¿╪╣╪» ┬º5.3): ╪╣╪»╪» ╪º┘ä╪╣╪º┘ä┘é┘è┘å ╪¡╪│╪¿ ╪º┘ä╪¡╪º┘ä╪⌐/╪º┘ä╪╣┘à╪▒
psql -d maxp -c "SELECT status, COUNT(*),
    MAX(EXTRACT(EPOCH FROM (NOW() - \"scheduledAt\"))::INT) AS max_age_sec
  FROM whatsapp_notification_queue
  WHERE status IN ('PENDING','PROCESSING')
  GROUP BY status;"
```

---

## 8. ╪│╪¼┘ä ╪º┘ä╪¬┘é╪»┘à (┘è╪¡╪»┘æ╪½┘ç ╪º┘ä┘à┘å┘ü┘æ╪░ ╪¿╪╣╪» ┘â┘ä ┘à┘ç┘à╪⌐)

| ╪º┘ä┘à┘ç┘à╪⌐ | ╪º┘ä┘à┘å┘ü┘æ╪░ | ╪º┘ä╪¬╪º╪▒┘è╪« | ╪º┘ä╪¡╪º┘ä╪⌐ | ┘à┘ä╪º╪¡╪╕╪º╪¬ / PR |
|--------|---------|---------|--------|---------------|
| ┬º1.1-pre enum COMPLETEDΓåÆSENT | agent | 2026-08-03 | Γ£à ┘à┘å┘ü┘æ╪░ | ≡ƒö┤ ╪¡╪º╪¼╪▓ ┘é╪¿┘ä ┬º1.1 ΓÇö WhatsAppNotificationService.js:3509 ΓåÆ 'SENT' |
| ┬º1.1 ╪¬┘ü╪╣┘è┘ä ╪º┘ä╪╖╪º╪¿┘ê╪▒ | agent | 2026-08-03 | Γ£à ┘à┘å┘ü┘æ╪░ | `notificationQueueWorker.js` (╪¼╪»┘è╪») + ╪¬╪│╪¼┘è┘ä ┘ü┘è server.js + ╪¡╪º╪▒╪│ ╪¬╪»╪º╪«┘ä ┘ü┘è processNotificationQueue |
| ┬º1.2 ╪Ñ╪╡┘ä╪º╪¡ ╪º┘ä┘â╪▒┘ê┘å | agent | 2026-08-03 | Γ£à ┘à┘å┘ü┘æ╪░ | ┘à╪▒┘ê╪▒ ╪╣╪¿╪▒ updateOrderStatus (setCompanyId + take:50 + changedBy='SYSTEM_AUTO'). **╪¬╪╡╪¡┘è╪¡**: updateOrderStatus ┘è┘â╪¬╪¿ history ┘à╪¬╪»╪º╪«┘ä╪º┘ï ΓÇö ╪ú┘Å╪▓┘è┘ä createMany (┘â╪º┘å ╪│┘è┘Å┘å╪¬╪¼ ╪╡┘ü┘æ┘è┘å) |
| ┬º2.1-pre mapping event type | agent | 2026-08-03 | Γ£à ┘à┘å┘ü┘æ╪░ | ORDER_STATUS_TO_EVENT_TYPE (┘à┘ê╪│┘æ╪╣╪⌐ ╪¿╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä╪│╪¬ ╪º┘ä┘é┘è╪º╪│┘è╪⌐ ┘ü┘è ┬º3.1) + ╪¬╪╡╪»┘è╪▒ getPersistedNotificationEventType |
| ┬º2.1 ╪«╪▒┘è╪╖╪⌐ ╪º┘ä╪¡╪º┘ä╪º╪¬ | agent | 2026-08-03 | Γ£à ┘à┘å┘ü┘æ╪░ | ╪¡╪░┘ü guard + ╪¬┘ü┘ê┘è╪╢ sendOrderStatusNotification + ╪¬╪╖╪º╪¿┘é ╪¬╪º┘à (╪¿╪»┘ä contains) + ╪¡╪░┘ü getWhatsAppOrderEventType |
| ┬º2.2 ╪Ñ╪▓╪º┘ä╪⌐ ╪º┘ä┘ç╪º╪▒╪»┘â┘ê╪» | agent | 2026-08-03 | Γ£à ┘à┘å┘ü┘æ╪░ | `utils/companyBranding.js` (╪¼╪»┘è╪») + ╪º╪│╪¬╪¿╪»╪º┘ä ╪º┘ä┘à┘ê╪º╪╢╪╣ ╪º┘ä╪ú╪▒╪¿╪╣╪⌐ + orderWorkflowService |
| ┬º2.3 auto-seed ┘é┘ê╪º┘ä╪¿ (╪»┘ü╪º╪╣┘è) | agent | 2026-08-03 | Γ£à ┘à┘å┘ü┘æ╪░ | `services/orderTemplateSeeding.js` (╪¼╪»┘è╪») ΓÇö `ensureOrderTemplate` ┘ü┘è sendNotification ╪╣┘å╪» ╪║┘è╪º╪¿ ┘é╪º┘ä╪¿ ╪╖┘ä╪¿ (╪┤╪▒┘â╪⌐ ╪¼╪»┘è╪»╪⌐ ┘ä┘à ╪¬╪╣╪» ╪¬┘ü╪┤┘ä ╪¿╪╡┘à╪¬ ╪¿┘Ç no_template)╪¢ orderStatusController ┘è╪│╪¬┘ê╪▒╪» ╪º┘ä╪¿╪░╪▒ ┘à┘å ╪º┘ä╪«╪»┘à╪⌐ |
| ┬º3.1 ╪¬┘ê╪¡┘è╪» dedup | agent | 2026-08-03 | Γ£à ┘à┘å┘ü┘æ╪░ | helper `isDuplicateNotification` ┘à┘ê╪¡┘æ╪» + ╪º╪│╪¬╪¿╪»╪º┘ä ╪º┘ä┘à┘ê╪º┘é╪╣ ╪º┘ä╪ú╪▒╪¿╪╣╪⌐ (╪Ñ╪╡┘ä╪º╪¡ contains). **┘é╪▒╪º╪▒**: DB unique ┘à╪▒┘ü┘ê╪╢ ΓÇö permanent ┘è┘à┘å╪╣ ╪Ñ╪╣╪º╪»╪⌐ ╪º┘ä╪Ñ╪▒╪│╪º┘ä ╪º┘ä┘à╪┤╪▒┘ê╪╣╪⌐ ╪¿╪╣╪» ╪º┘ä┘å╪º┘ü╪░╪⌐ (flip-flop)╪¢ ╪º┘ä┘Ç dedup ╪º┘ä╪▓┘à┘å┘è ┘ç┘ê ╪º┘ä╪ó┘ä┘è╪⌐ ╪º┘ä╪╡╪¡┘è╪¡╪⌐ |
| ┬º4.1 retry + ┘ü╪╡┘ä ╪º┘ä╪¼┘ä╪│╪⌐ | agent | 2026-08-03 | Γ£à ┘à┘å┘ü┘æ╪░ | ╪¡┘ä┘æ ╪º┘ä╪¼┘ä╪│╪⌐ ┘à╪ñ╪¼┘æ┘ä ┘ä┘ä┘à╪╣╪º┘ä╪¼╪⌐ ┘ü┘è ╪º┘ä╪╖╪º╪¿┘ê╪▒ (┘è╪»╪╣┘à META_CLOUD + ╪º┘ä╪¼┘ä╪│╪º╪¬ ╪º┘ä┘à┘å┘ü╪╡┘ä╪⌐)╪¢ scheduleNotification ┘è┘é╪¿┘ä ╪º┘ä╪¼╪»┘ê┘ä╪⌐ ╪¿┘ä╪º ╪¼┘ä╪│╪⌐ (sessionId='')╪¢ retry ╪╣╪¿╪▒ ╪º┘ä╪╖╪º╪¿┘ê╪▒ ┘ä┘ä╪ú╪«╪╖╪º╪í ╪º┘ä╪╣╪º╪¿╪▒╪⌐ (retryable) |
| ┬º5.1 ╪º┘ä╪¬┘é╪│┘è┘à | agent | 2026-08-03 | Γ£à ╪¼╪▓╪ª┘è | ╪º╪│╪¬╪«╪▒╪¼╪¬ `DEFAULT_TEMPLATES` ΓåÆ `templates/defaultTemplates.js`╪î ┘à┘ê╪º╪▓┘å╪⌐ ╪º┘ä╪¼┘ä╪│╪º╪¬ ΓåÆ `sessionBalancer.js` + `formatPhoneNumber` ΓåÆ `utils/phoneFormat.js`╪î ┘ê┘å┘ê╪º╪⌐ ╪º┘ä╪ú┘å┘ê╪º╪╣ ╪º┘ä┘å┘é┘è╪⌐ ΓåÆ `notificationTypes.js` (╪º┘ä┘à┘ä┘ü 4205ΓåÆ2797 ╪│╪╖╪▒). **┘à╪¬╪¿┘é┘æ┘è**: ╪º┘ä╪╖╪º╪¿┘ê╪▒/senders + i18n (┘à╪ñ╪¼┘ä╪⌐ ΓÇö ╪¬┘å╪╖┘ê┘è ╪╣┘ä┘ë circular deps ┘ê┘à┘è╪▓╪⌐ ┘à┘å╪¬╪¼) |
| ┬º5.2 ╪│╪» bypasses workflow | agent | 2026-08-03 | Γ£à ┘à┘å┘ü┘æ╪░ | ╪º╪│╪¬╪«╪▒╪º╪¼ `syncPreparationMetadata` + ╪º╪│╪¬╪»╪╣╪º╪ñ┘ç ╪¿╪╣╪» ╪º┘ä┘Ç raw updates ┘ü┘è :351/:471 |
| ┬º5.3 ┘à╪▒╪º┘é╪¿╪⌐ ╪º┘ä╪╖╪º╪¿┘ê╪▒ | agent | 2026-08-03 | Γ£à ┘à┘å┘ü┘æ╪░ | `GET /api/v1/whatsapp-notifications/queue-stats` (╪¼╪»┘è╪») + ╪¬┘å╪¿┘è┘ç overdue>10 ┘ü┘è ╪º┘ä┘Ç worker |
| **╪º╪«╪¬╪¿╪º╪▒╪º╪¬ Jest (task 1)** | agent | 2026-08-03 | Γ£à ┘à┘å┘ü┘æ╪░ | 4 ┘à┘ä┘ü╪º╪¬ ╪¼╪»┘è╪»╪⌐: `tests/services/whatsapp/notificationTypes.test.js` (25)╪î `tests/services/whatsapp/isDuplicateNotification.test.js` (7)╪î `tests/utils/companyBranding.test.js` (7)╪î `tests/services/syncPreparationMetadata.test.js` (7) ΓÇö **52/52 ╪ú╪«╪╢╪▒** |
| **╪¬┘ê╪¡┘è╪» ╪º┘ä┘ê╪½┘è┘é╪⌐ (task 2)** | agent | 2026-08-03 | Γ£à ┘à┘å┘ü┘æ╪░ | ┬º1.2 ┘â┘ê╪» ┘à╪╖╪º╪¿┘é ┘ä┘ä┘ü╪╣┘ä (╪¿┘ä╪º createMany + ╪¬┘å╪¿┘è┘ç ╪º┘ä┘Ç nested history)╪¢ ┬º3.1 ╪ú┘Å╪╢┘è┘ü "╪º┘ä┘é╪▒╪º╪▒ ╪º┘ä┘å┘ç╪º╪ª┘è" (╪▒┘ü╪╢ ╪º┘ä┘Ç DB unique)╪¢ ┬º5.1 ┘ê╪½┘æ┘é ╪º┘ä┘à┘å┘ü┘æ╪░/╪º┘ä┘à╪ñ╪¼┘æ┘ä ╪¿╪»┘é╪⌐ |
| **╪¬╪¡┘é┘é ╪│┘ä┘ê┘â┘è (task 3)** | agent | 2026-08-03 | Γ£à ┘à┘å┘ü┘æ╪░ | scheduleNotification ┘ä╪º ┘è╪▒╪¼╪╣ no_session Γ£ô╪¢ re-entrancy guard Γ£ô╪¢ ┘à┘ä╪º╪¡╪╕╪⌐: processNotificationQueue ┘è╪▒╪│┘ä ┘à╪¿╪º╪┤╪▒╪⌐ ╪╣╪¿╪▒ WhatsAppMessageHandler (┘è╪▒┘ê┘æ╪¬ META_CLOUD) ┘ê┘ä┘è╪│ sendNotification ΓÇö ┘à┘é╪¿┘ê┘ä ┘ê╪╕┘è┘ü┘è╪º┘ï╪î ┘è┘Å┘ê╪½┘æ┘é ┘ü┘è ╪º┘ä╪¬┘é╪▒┘è╪▒ |
| **╪Ñ╪╡┘ä╪º╪¡ ╪º╪«╪¬╪¿╪º╪▒╪º╪¬ ┘à╪│╪¿┘é╪⌐ ╪º┘ä┘ü╪┤┘ä** | agent | 2026-08-03 | Γ£à ┘à┘å┘ü┘æ╪░ | `orderService.limit.test.js` (mock ┘å╪º┘é╪╡ product.findUnique) + `WhatsAppSyncService.test.js` ΓÇö **≡ƒö┤ ╪º┘â╪¬┘Å╪┤┘ü ┘ê╪╡┘Å╪¡┘æ╪¡ deadlock ╪¡┘é┘è┘é┘è ┘ü┘è `withKeyLock`** (WhatsAppSyncService.js:23-43): `gate = prev.then(() => current)` ┘â╪º┘å ┘è╪¼╪╣┘ä ╪ú┘ê┘ä ╪º╪│╪¬╪»╪╣╪º╪í ┘ä╪ú┘è ┘à┘ü╪¬╪º╪¡ ┘è┘å╪¬╪╕╪▒ `current` ╪º┘ä╪░┘è ┘ä╪º ┘è┘Å╪¡┘ä┘æ ╪Ñ┘ä╪º ╪¿╪╣╪» fn ΓåÆ **╪ú┘ê┘ä ╪▒╪│╪º┘ä╪⌐ WhatsApp ╪¬┘å╪┤╪ª ╪╣┘à┘è┘ä╪º┘ï ┘â╪º┘å╪¬ ╪│╪¬╪¬╪¼┘à┘æ╪» ┘ä┘ä╪ú╪¿╪» ┘ü┘è ╪º┘ä╪Ñ┘å╪¬╪º╪¼**. ╪º┘ä╪Ñ╪╡┘ä╪º╪¡: `gate = prev` (┘ê╪╣╪» ╪Ñ╪╖┘ä╪º┘é ╪º┘ä┘à┘Å╪¬╪╡┘ä ╪º┘ä╪│╪º╪¿┘é) + ╪¬╪«╪▓┘è┘å `current` ┘â┘à┘ü╪¬╪º╪¡ ╪º┘ä╪¬╪º┘ä┘è. ╪¬╪¡┘é┘æ┘é: ╪¬╪│┘ä╪│┘ä ╪╡╪¡┘è╪¡ (maxConcurrent=1) + ╪¬┘å╪╕┘è┘ü ╪º┘ä╪«╪▒┘è╪╖╪⌐. + mock `executeWithRetry` ┘ü┘è ╪º┘ä╪º╪«╪¬╪¿╪º╪▒ + ╪¬┘ê┘é┘æ╪╣ `whatsappId` ┘ü┘è ╪º┘ä┘Ç backfill. ╪º┘ä┘à╪¼┘à┘ê╪╣╪⌐: **8/8 ╪│┘ê┘è╪¬╪º╪¬ / 59/59 ╪ú╪«╪╢╪▒ (┘à╪│╪¬┘é╪▒ ╪╣╪¿╪▒ 3 ╪¬╪┤╪║┘è┘ä╪º╪¬)** |

---

## 9. ┘à╪▒╪º╪¼╪╣

### 9.1 ┘à┘ä┘ü╪º╪¬ ┘à╪¬╪ú╪½╪▒╪⌐
| ╪º┘ä┘à┘ä┘ü | ╪º┘ä╪¬╪║┘è┘è╪▒╪º╪¬ |
|------|-----------|
| `services/whatsapp/WhatsAppNotificationService.js` | ┬º1.1-pre (enum `'COMPLETED'ΓåÆ'SENT'`)╪î ┬º2.1-pre (mapping)╪î ┬º2.2 (┘ç╪º╪▒╪»┘â┘ê╪»)╪î ┬º3.1 (dedup)╪î ┬º4.1 (retry + ┘ü╪╡┘ä ╪º┘ä╪¼┘ä╪│╪⌐)╪î ┬º5.1 (╪¬┘é╪│┘è┘à)╪î ┬º5.3 (alert) |
| `services/whatsapp/templates/defaultTemplates.js` | **╪¼╪»┘è╪»** (┬º5.1) ΓÇö DEFAULT_TEMPLATES ┘à╪│╪¬╪«╪▒╪¼ |
| `services/whatsapp/sessionBalancer.js` | **╪¼╪»┘è╪»** (┬º5.1) ΓÇö ┘à┘ê╪º╪▓┘å╪⌐ ╪º┘ä╪¼┘ä╪│╪º╪¬ + JIT init |
| `services/whatsapp/notificationTypes.js` | **╪¼╪»┘è╪»** (┬º5.1) ΓÇö ┘å┘ê╪º╪⌐ ╪ú┘å┘ê╪º╪╣ ╪º┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä┘å┘é┘è╪⌐ (persisted mapping + isOrderCategory) |
| `services/whatsapp/notificationQueueWorker.js` | **╪¼╪»┘è╪»** (┬º1.1 + ┬º5.3 alert) |
| `utils/companyBranding.js` | **╪¼╪»┘è╪»** (┬º2.2) |
| `utils/phoneFormat.js` | **╪¼╪»┘è╪»** (┬º5.1) |
| `services/orderService.js` | ┬º2.1 (╪«╪▒┘è╪╖╪⌐ ╪º┘ä╪¡╪º┘ä╪º╪¬ + guard)╪î ┬º3.1 (dedup)╪î ┬º5.2 (╪º╪│╪¬╪«╪▒╪º╪¼ syncPreparationMetadata) |
| `services/orderWorkflowService.js` | ┬º3.1 (dedup)╪î ┬º5.2 (╪│╪» raw update bypass) |
| `cron/orderStatusAutoChangeCron.js` | ┬º1.2 (╪¬┘à╪▒┘è╪▒ ╪╣╪¿╪▒ updateOrderStatus ΓÇö ╪ú┘Å╪▓┘è┘ä createMany ┘ä╪¬╪¼┘å┘æ╪¿ ╪º╪▓╪»┘ê╪º╪¼ history) |
| `controller/whatsappNotificationController.js` | ┬º5.3 (getNotificationQueueStats) |
| `routes/whatsappNotificationRoutes.js` | ┬º5.3 (╪¬╪│╪¼┘è┘ä /queue-stats) |
| `server.js` | ┬º1.1 (╪¬╪│╪¼┘è┘ä ╪º┘ä┘Ç worker) |

### 9.2 ┘ê╪½╪º╪ª┘é ╪░╪º╪¬ ╪╡┘ä╪⌐
- `docs/infrastructure/production-memory-queue-remediation-plan.md` ΓÇö **╪╖╪º╪¿┘ê╪▒ ┘à╪«╪¬┘ä┘ü** (`OrderSyncQueue`/┘à╪▓╪º┘à┘å╪⌐ ╪¿┘è┘å ╪º┘ä╪┤╪▒┘â╪º╪¬ + ╪¬╪│╪▒┘è╪¿ ╪º┘ä╪░╪º┘â╪▒╪⌐). ┘ä╪º ┘è╪«┘ä╪╖.
- `docs/orders/order-status-auto-change-2026-07-01.md` ΓÇö ╪¬┘ê╪½┘è┘é ┘à┘è╪▓╪⌐ ╪º┘ä┘â╪▒┘ê┘å (┘è╪¡╪¬┘ê┘è ╪¬╪¡╪░┘è╪▒ ┬º1.2).
- `docs/orders/order-status-preparation-sync-2026-08-03.md` ΓÇö ┘à╪▓╪º┘à┘å╪⌐ `metadata.preparationStatus` (┘à╪▒╪¬╪¿╪╖╪⌐ ╪¿┘Ç ┬º1.2 ┘ê┬º5.2).

### 9.3 ┘à┘ä╪º╪¡╪╕╪º╪¬ ┘ä┘ä┘à┘Å╪▒╪º╪¼┘É╪╣
- ╪▒┘â┘æ╪▓ ╪º┘ä┘à╪▒╪º╪¼╪╣╪⌐ ╪╣┘ä┘ë: (╪ú) ╪╡╪¡╪⌐ ╪¬┘ê┘é┘è╪╣╪º╪¬ ╪º┘ä╪»┘ê╪º┘ä ┘é╪¿┘ä ╪º┘ä╪º╪│╪¬╪»╪╣╪º╪í (╪▒╪º╪¼╪╣ ┬º1.2 ΓÇö ╪º┘ä╪¬┘ê┘é┘è╪╣ ╪º┘ä┘ü╪╣┘ä┘è 9 ┘à╪╣╪º┘à┘ä╪º╪¬)╪î (╪¿) ╪╣╪»┘à ┘â╪│╪▒ META_CLOUD path (┬º1.1 + ┬º4.1 ╪º┘ä╪¼╪▓╪í ╪ú)╪î (╪¼) **┬º3.1**: ┘é┘Å╪»┘æ╪▒ ╪ú┘å ┘é┘è╪» DB ╪º┘ä┘ü╪▒┘è╪» ╪º┘ä╪»╪º╪ª┘à ┘è┘Å╪╣┘è┘é ╪Ñ╪╣╪º╪»╪⌐ ╪º┘ä╪Ñ╪▒╪│╪º┘ä ╪º┘ä┘à╪┤╪▒┘ê╪╣╪⌐ ╪¿╪╣╪» ╪º┘ä┘å╪º┘ü╪░╪⌐ ΓÇö ╪º╪╣╪¬┘à╪»┘å╪º ╪º┘ä┘Ç dedup ╪º┘ä╪▓┘à┘å┘è ╪º┘ä┘à┘ê╪¡┘æ╪» ┘ü┘é╪╖ (┘ä╪º migration).
- ╪ú┘è ╪¬╪╣╪»┘è┘ä ╪╣┘ä┘ë `orderService.updateOrderStatus` ┘è╪¼╪¿ ╪º╪«╪¬╪¿╪º╪▒┘ç ╪╣┘ä┘ë ┘à╪│╪º╪▒╪º╪¬ ╪º┘ä┘Ç 7 ╪º┘ä┘à╪░┘â┘ê╪▒╪⌐ ┘ü┘è ┬º2.2 (┘å┘é╪º╪╖ ╪»╪«┘ê┘ä ╪¬╪║┘è┘è╪▒ ╪º┘ä╪¡╪º┘ä╪⌐).
- ≡ƒƒí **┘à╪▒╪º╪¼╪╣╪⌐ ╪½╪º┘å┘è╪⌐ (2026-08-03)** ╪╖┘Å╪¿┘æ┘é╪¬: ╪╡╪¡┘æ╪¡╪¬ ╪¬┘ê┘é┘è╪╣ `updateOrderStatus`╪î ╪¡┘é┘ê┘ä `Company`╪î mapping ╪º┘ä┘Ç enum╪î ╪º╪│┘à ╪º┘ä╪¼╪»┘ê┘ä (`whatsapp_notification_logs`)╪î ┘à┘å╪╖┘é retry ┘ä┘ü╪┤┘ä ╪º┘ä╪¼┘ä╪│╪⌐╪î guard ╪º┘ä╪¬╪»╪º╪«┘ä╪î ┘ê╪ú╪╢┘ü╪¬ ┬º5.2 (workflow bypass) ┘ê┬º5.3 (┘à╪▒╪º┘é╪¿╪⌐).
- ≡ƒƒí **┘à╪▒╪º╪¼╪╣╪⌐ ╪▒╪º╪¿╪╣╪⌐ (╪º┘ä╪¬┘å┘ü┘è╪░)**: ╪º┘â╪¬┘Å╪┤┘ü ╪ú┘å `updateOrderStatus` ┘è┘â╪¬╪¿ OrderStatusHistory ┘à╪¬╪»╪º╪«┘ä╪º┘ï ΓÇö ╪ú┘Å╪▓┘è┘ä createMany ┘à┘å ┬º1.2 ┘ä╪¬╪¼┘å┘æ╪¿ ╪º┘ä╪º╪▓╪»┘ê╪º╪¼. ╪º┘â╪¬┘à┘ä╪¬ ┬º1.1-preΓåÆ┬º5.3 ┘à╪º ╪╣╪»╪º i18n ┘ê╪¿┘é┘è╪⌐ ╪¬┘é╪│┘è┘à ┬º5.1 (┘à╪ñ╪¼┘ä╪⌐).
- ≡ƒƒí **┘à╪▒╪º╪¼╪╣╪⌐ ╪«╪º┘à╪│╪⌐ (╪¬╪│┘ä┘è┘à/╪º╪«╪¬╪¿╪º╪▒╪º╪¬)**: ╪ú┘Å╪╢┘è┘ü╪¬ 4 ┘à┘ä┘ü╪º╪¬ ╪º╪«╪¬╪¿╪º╪▒ Jest (52/52 ╪ú╪«╪╢╪▒). ╪¬╪¡┘é┘é ╪│┘ä┘ê┘â┘è: `scheduleNotification` ┘ä╪º ┘è┘Å╪│┘é╪╖ ╪╣┘å╪» ╪║┘è╪º╪¿ ╪¼┘ä╪│╪⌐ Γ£ô╪î guard ╪º┘ä╪¬╪»╪º╪«┘ä Γ£ô╪î ┘ä┘â┘å `processNotificationQueue` ┘è╪▒╪│┘ä ┘à╪¿╪º╪┤╪▒╪⌐ ╪╣╪¿╪▒ `WhatsAppMessageHandler` (┘è╪▒┘ê┘æ╪¬ META_CLOUD ╪»╪º╪«┘ä┘è╪º┘ï + ╪¡┘ä ╪º┘ä╪¼┘ä╪│╪⌐ ┘à╪ñ╪¼┘æ┘ä) ┘ê┘ä┘è╪│ ╪╣╪¿╪▒ `sendNotification` ΓÇö ┘à┘é╪¿┘ê┘ä ┘ê╪╕┘è┘ü┘è╪º┘ï╪î deviation ┘à┘ê╪½┘æ┘é ┘à┘å ╪¬┘ê╪╡┘è╪⌐ ┬º1.1. ┘à┘ä╪º╪¡╪╕╪⌐: `getPersistedNotificationEventType('PREPARING'|'PACKAGED')` ┘è┘Å╪▒╪¼╪╣ ╪º┘ä┘é┘è┘à╪⌐ ╪º┘ä╪«╪º┘à (┘ä┘è╪│╪¬ ┘é┘è┘à enum) ΓÇö ╪ó┘à┘å╪⌐ ╪¡╪º┘ä┘è╪º┘ï ┘ä╪ú┘å `normalizeWhatsAppOrderStatus` ╪¬╪¡┘ê┘æ┘ä┘ç┘à╪º ╪Ñ┘ä┘ë PICKING/PACKED ┘é╪¿┘ä ╪º┘ä╪Ñ╪▒╪│╪º┘ä╪î ┘ä┘â┘å ╪ú┘è ┘à┘Å╪│╪¬╪»╪╣┘ì ┘à╪│╪¬┘é╪¿┘ä┘è ┘è┘à╪▒┘æ╪▒┘ç╪º ┘à╪¿╪º╪┤╪▒╪⌐ ╪│┘è┘Å╪╡╪º╪¿ ╪¿┘Ç enum error.

---

*┘ç╪░╪º ╪º┘ä┘à╪│╪¬┘å╪» ┘ç┘ê ╪º┘ä┘à╪▒╪¼╪╣ ╪º┘ä╪▒╪│┘à┘è ┘ä╪Ñ╪╡┘ä╪º╪¡ ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ┘ê╪º╪¬╪│╪º╪¿ ┘ä┘ä╪╖┘ä╪¿╪º╪¬. ╪¡╪»┘æ╪½ ┬º8 ╪¿╪╣╪» ┘â┘ä ┘à┘ç┘à╪⌐. ╪º┘ä┘à╪▒╪º╪¼╪╣╪⌐ ╪º┘ä╪½╪º┘å┘è╪⌐ (2026-08-03) ╪»┘à╪¼╪¬ ╪¬╪╡╪¡┘è╪¡╪º╪¬ ╪¬┘é┘å┘è╪⌐ ┘à╪ñ┘â╪»╪⌐ ┘à┘å ┘à╪▒╪º╪¼╪╣╪⌐ ╪«╪º╪▒╪¼┘è╪⌐.*
