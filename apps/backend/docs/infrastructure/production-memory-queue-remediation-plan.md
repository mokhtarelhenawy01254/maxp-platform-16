# ╪«╪╖╪⌐ ╪º┘ä╪Ñ╪╡┘ä╪º╪¡ ╪º┘ä╪┤╪º┘à┘ä ΓÇö ┘à╪┤╪º┘â┘ä ╪º┘ä╪░╪º┘â╪▒╪⌐ ┘ê╪╖╪º╪¿┘ê╪▒ ╪º┘ä┘à╪▓╪º┘à┘å╪⌐

**╪¬╪º╪▒┘è╪« ╪º┘ä╪Ñ┘å╪┤╪º╪í**: 2026-07-27
**╪ó╪«╪▒ ╪¬╪¡╪»┘è╪½**: 2026-08-03 (╪Ñ╪╢╪º┘ü╪⌐ ╪¿┘è╪º┘å ╪º┘ä╪¬┘à┘è┘è╪▓ + ╪▒╪¿╪╖ ╪¿╪«╪╖╪⌐ ╪º┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬)
**╪º┘ä┘à╪ñ┘ä┘ü**: AI Audit
**╪º┘ä╪¡╪º┘ä╪⌐**: ┘à╪│┘ê╪»╪⌐ ΓÇö ╪¬┘å╪¬╪╕╪▒ ╪º┘ä┘à╪▒╪º╪¼╪╣╪⌐ ┘ê╪º┘ä╪º╪╣╪¬┘à╪º╪»

> ## ≡ƒöÄ ╪¿┘è╪º┘å ╪¬┘à┘è┘è╪▓ ┘à┘ç┘à (╪º┘é╪▒╪ú ┘é╪¿┘ä ╪º┘ä╪¿╪»╪í) ΓÇö ╪ú┘Å╪╢┘è┘ü 2026-08-03
>
> **┘ç╪░┘ç ╪º┘ä╪«╪╖╪⌐ ╪¬╪╣╪º┘ä╪¼ ╪╖╪º╪¿┘ê╪▒╪º┘ï ┘à╪«╪¬┘ä┘ü╪º┘ï ╪¬┘à╪º┘à╪º┘ï** ╪╣┘å ╪╖╪º╪¿┘ê╪▒ ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ┘ê╪º╪¬╪│╪º╪¿. ┘ä╪º ╪¬╪«┘ä╪╖ ╪¿┘è┘å┘ç┘à╪º:
>
> | | ┘ç╪░┘ç ╪º┘ä┘ê╪½┘è┘é╪⌐ (╪º┘ä╪░╪º┘â╪▒╪⌐/╪º┘ä┘à╪▓╪º┘à┘å╪⌐) | ╪«╪╖╪⌐ ╪º┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬ (┘à┘å┘ü╪╡┘ä╪⌐) |
> |---|---|---|
> | **╪º┘ä╪╖╪º╪¿┘ê╪▒** | `OrderSyncQueue` (`syncQueueService`) ΓÇö ┘à╪▓╪º┘à┘å╪⌐ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪¿┘è┘å ╪º┘ä╪┤╪▒┘â╪º╪¬ ╪º┘ä╪ú┘à/╪º┘ä╪¬╪º╪¿╪╣╪⌐ | `WhatsAppNotificationQueue` ΓÇö ╪Ñ╪▒╪│╪º┘ä ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ┘ê╪º╪¬╪│╪º╪¿ ┘ä┘ä╪╣┘à┘ä╪º╪í |
> | **╪º┘ä┘à╪┤┘â┘ä╪⌐** | ╪¬╪│╪▒┘è╪¿ ╪░╪º┘â╪▒╪⌐ Baileys + ╪¬╪╣┘ä┘è┘é ╪º┘ä┘à╪▓╪º┘à┘å╪⌐ ╪¿┘è┘å ╪º┘ä╪┤╪▒┘â╪º╪¬ | ╪╖╪º╪¿┘ê╪▒ ┘à┘è╪¬ + ┘â╪▒┘ê┘å ┘è╪¬╪¼╪º┘ê╪▓ ╪º┘ä╪«╪»┘à╪⌐ + ┘é┘ê╪º┘ä╪¿/┘ç╪º╪▒╪»┘â┘ê╪» |
> | **╪º┘ä╪¼╪░╪▒** | `services/syncQueueService.js` + ╪¼┘ä╪│╪º╪¬ Baileys | `services/whatsapp/WhatsAppNotificationService.js` + `orderService.js` |
>
> **╪º┘ä┘ê╪½┘è┘é╪⌐ ╪º┘ä╪ú╪«╪▒┘ë**: `docs/notifications/whatsapp-order-notifications-fix-plan-2026-08-03.md` ΓÇö ╪▒╪º╪¼╪╣┘ç╪º ┘ä┘ê ┘à╪┤┘â┘ä╪¬┘â ┘ç┘è ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä╪╣┘à┘ä╪º╪í ╪╣┘å ╪º┘ä╪╖┘ä╪¿╪º╪¬.
>
> ┘à┘ä╪º╪¡╪╕╪⌐: `bullmq` ┘ê `ioredis` **┘à╪½╪¿╪¬╪º┘å ╪¿╪º┘ä┘ü╪╣┘ä** ┘ü┘è ╪º┘ä┘à╪┤╪▒┘ê╪╣ (`bullmq@^5.66.2`╪î `ioredis@^5.8.2`) ┘ê┘à╪│╪¬╪«╪»┘à╪º┘å ┘ü┘è `services/queueService.js` ┘ê `queues/webhookQueue.js` ΓÇö ┘ä╪░╪º ╪º┘ü╪¬╪▒╪º╪╢ ┬º2.1 ╪¿╪º╪│╪¬╪«╪»╪º┘à BullMQ ╪╡╪¡┘è╪¡ ┘ê┘à╪¿╪º╪┤╪▒.

---

## ┘ü┘ç╪▒╪│ ╪º┘ä┘à╪¡╪¬┘ê┘è╪º╪¬

1. [╪º┘ä┘à┘ä╪«╪╡ ╪º┘ä╪¬┘å┘ü┘è╪░┘è](#1-╪º┘ä┘à┘ä╪«╪╡-╪º┘ä╪¬┘å┘ü┘è╪░┘è)
2. [╪¬╪¡┘ä┘è┘ä ╪┤╪¼╪▒╪⌐ ╪º┘ä┘à╪┤╪º┘â┘ä](#2-╪¬╪¡┘ä┘è┘ä-╪┤╪¼╪▒╪⌐-╪º┘ä┘à╪┤╪º┘â┘ä)
3. [╪º┘ä┘à╪▒╪¡┘ä╪⌐ 0: ╪º┘ä╪¬╪┤╪«┘è╪╡ ┘ê╪º┘ä┘à╪▒╪º┘é╪¿╪⌐](#3-╪º┘ä┘à╪▒╪¡┘ä╪⌐-0-╪º┘ä╪¬╪┤╪«┘è╪╡-┘ê╪º┘ä┘à╪▒╪º┘é╪¿╪⌐)
4. [╪º┘ä┘à╪▒╪¡┘ä╪⌐ 1: ╪º┘ä╪Ñ╪╡┘ä╪º╪¡╪º╪¬ ╪º┘ä┘ü┘ê╪▒┘è╪⌐ (╪ú┘è╪º┘à 1-2)](#4-╪º┘ä┘à╪▒╪¡┘ä╪⌐-1-╪º┘ä╪Ñ╪╡┘ä╪º╪¡╪º╪¬-╪º┘ä┘ü┘ê╪▒┘è╪⌐-╪ú┘è╪º┘à-1-2)
5. [╪º┘ä┘à╪▒╪¡┘ä╪⌐ 2: ╪¬╪¡╪│┘è┘å╪º╪¬ ╪º┘ä╪ú╪»╪º╪í (╪ú┘è╪º┘à 3-7)](#5-╪º┘ä┘à╪▒╪¡┘ä╪⌐-2-╪¬╪¡╪│┘è┘å╪º╪¬-╪º┘ä╪ú╪»╪º╪í-╪ú┘è╪º┘à-3-7)
6. [╪º┘ä┘à╪▒╪¡┘ä╪⌐ 3: ╪Ñ╪╣╪º╪»╪⌐ ╪º┘ä┘ç┘è┘â┘ä╪⌐ (╪ú╪│╪º╪¿┘è╪╣ 2-4)](#6-╪º┘ä┘à╪▒╪¡┘ä╪⌐-3-╪Ñ╪╣╪º╪»╪⌐-╪º┘ä┘ç┘è┘â┘ä╪⌐-╪ú╪│╪º╪¿┘è╪╣-2-4)
7. [┘â┘è┘ü┘è╪⌐ ╪º┘ä╪¬╪╖╪¿┘è┘é ΓÇö ╪ú╪»┘ä╪⌐ ╪¬┘ü╪╡┘è┘ä┘è╪⌐](#7-┘â┘è┘ü┘è╪⌐-╪º┘ä╪¬╪╖╪¿┘è┘é--╪ú╪»┘ä╪⌐-╪¬┘ü╪╡┘è┘ä┘è╪⌐)
8. [╪º╪│╪¬╪▒╪º╪¬┘è╪¼┘è╪⌐ ╪º┘ä╪º╪«╪¬╪¿╪º╪▒ ┘ê╪º┘ä╪╖╪▒╪¡](#8-╪º╪│╪¬╪▒╪º╪¬┘è╪¼┘è╪⌐-╪º┘ä╪º╪«╪¬╪¿╪º╪▒-┘ê╪º┘ä╪╖╪▒╪¡)
9. [╪º┘ä┘à╪▒╪º┘é╪¿╪⌐ ┘ê╪º┘ä╪¬╪¡┘é┘é](#9-╪º┘ä┘à╪▒╪º┘é╪¿╪⌐-┘ê╪º┘ä╪¬╪¡┘é┘é)
10. [╪«╪╖╪╖ ╪º┘ä╪¬╪▒╪º╪¼╪╣ (Rollback)](#10-╪«╪╖╪╖-╪º┘ä╪¬╪▒╪º╪¼╪╣-rollback)
11. [╪º┘ä┘à╪▒╪º╪¼╪╣](#11-╪º┘ä┘à╪▒╪º╪¼╪╣)

---

## 1. ╪º┘ä┘à┘ä╪«╪╡ ╪º┘ä╪¬┘å┘ü┘è╪░┘è

╪¬┘à ╪º┘â╪¬╪┤╪º┘ü ┘à╪┤┘â┘ä╪¬┘è┘å ╪▒╪ª┘è╪│┘è╪¬┘è┘å ┘ü┘è ╪¿┘è╪ª╪⌐ ╪º┘ä╪Ñ┘å╪¬╪º╪¼ ╪¬╪ñ╪½╪▒╪º┘å ╪╣┘ä┘ë ╪º╪│╪¬┘é╪▒╪º╪▒ ╪º┘ä┘à┘å╪╡╪⌐:

| ╪º┘ä┘à╪┤┘â┘ä╪⌐ | ╪º┘ä╪ú╪╣╪▒╪º╪╢ | ╪º┘ä╪¼╪░╪▒ ╪º┘ä┘ü┘å┘è | ╪«╪╖┘ê╪▒╪¬┘ç╪º |
|---------|---------|-------------|---------|
| **╪º╪│╪¬┘å╪▓╪º┘ü ╪º┘ä╪░╪º┘â╪▒╪⌐ (Memory)** | RSS = 6.2GB╪î Heap = 304MB ┘ü┘é╪╖ | ╪¼┘ä╪│╪º╪¬ Baileys WhatsApp + Prisma $extends overhead | **╪╣╪º┘ä┘è╪⌐ ΓÇö ┘é╪» ╪¬╪ñ╪»┘è ┘ä┘Ç OOM Kill** |
| **╪¬╪╣┘ä┘è┘é ╪╖╪º╪¿┘ê╪▒ ╪º┘ä┘à╪▓╪º┘à┘å╪⌐ (Sync Queue)** | ╪▒╪│╪º┘ä╪⌐ `Already processing` ┘â┘ä 5-10 ╪½┘ê╪º┘å┘ì | `setInterval` + ╪¬┘å┘ü┘è╪░ ┘à╪¬╪│┘ä╪│┘ä ┘ä┘ä┘Ç Transactions | **┘à╪¬┘ê╪│╪╖╪⌐ ΓÇö ╪¬╪ñ╪«╪▒ ┘à╪▓╪º┘à┘å╪⌐ ╪º┘ä╪╖┘ä╪¿╪º╪¬** |

### 1.1 ┘à┘å ┘è╪¬╪ú╪½╪▒╪ƒ

- **╪¼┘à┘è╪╣ ┘à╪│╪¬╪«╪»┘à┘è ┘ê╪º╪¬╪│╪º╪¿**: ┘â┘ä ╪┤╪▒┘â╪⌐ ┘ä╪»┘è┘ç╪º ╪¼┘ä╪│╪⌐ Baileys ┘å╪┤╪╖╪⌐ ╪¬╪│╪º┘ç┘à ┘ü┘è ╪º┘ä┘Ç RSS
- **╪¼┘à┘è╪╣ ╪╖┘ä╪¿╪º╪¬ ╪º┘ä╪¬┘ê╪½┘è┘é (Orders sync)**: ┘è╪¬╪ú╪«╪▒ ╪¬╪▓╪º┘à┘å ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪¿┘è┘å ╪º┘ä╪┤╪▒┘â╪º╪¬ ╪º┘ä┘à╪¬╪╡┘ä╪⌐ (Affiliate/Internal Sync)
- **╪«╪º╪»┘à ╪º┘ä╪Ñ┘å╪¬╪º╪¼**: ╪º╪¡╪¬┘à╪º┘ä┘è╪⌐ OOM Kill ╪¬╪▓╪»╪º╪» ┘à╪╣ ┘â┘ä ╪¼┘ä╪│╪⌐ ┘ê╪º╪¬╪│╪º╪¿ ╪¼╪»┘è╪»╪⌐

### 1.2 ╪º┘ä╪¼╪»┘ê┘ä ╪º┘ä╪▓┘à┘å┘è ╪º┘ä┘à┘é╪¬╪▒╪¡

| ╪º┘ä┘à╪▒╪¡┘ä╪⌐ | ╪º┘ä┘à╪»╪⌐ | ╪º┘ä╪ú╪½╪▒ | ╪º┘ä┘à╪«╪º╪╖╪▒╪⌐ |
|---------|-------|-------|----------|
| **╪º┘ä┘à╪▒╪¡┘ä╪⌐ 0**: ╪¬╪┤╪«┘è╪╡ + ┘à╪▒╪º┘é╪¿╪⌐ | ┘è┘ê┘à ┘ê╪º╪¡╪» | ┘ä╪º ╪¬╪║┘è┘è╪▒ ┘ü┘è ╪º┘ä┘â┘ê╪» | **╪╡┘ü╪▒** |
| **╪º┘ä┘à╪▒╪¡┘ä╪⌐ 1**: ╪Ñ╪╡┘ä╪º╪¡╪º╪¬ ┘ü┘ê╪▒┘è╪⌐ | ┘è┘ê┘à 1-2 | ┘è┘ê┘é┘ü ╪¬╪│╪▒┘è╪¿ ╪º┘ä╪░╪º┘â╪▒╪⌐ %40 | **┘à┘å╪«┘ü╪╢╪⌐ ╪¼╪»╪º┘ï** |
| **╪º┘ä┘à╪▒╪¡┘ä╪⌐ 2**: ╪¬╪¡╪│┘è┘å╪º╪¬ ╪ú╪»╪º╪í | ┘è┘ê┘à 3-7 | ┘è┘é┘ä┘ä ┘ê┘é╪¬ Sync Queue %90 | **┘à╪¬┘ê╪│╪╖╪⌐** |
| **╪º┘ä┘à╪▒╪¡┘ä╪⌐ 3**: ╪Ñ╪╣╪º╪»╪⌐ ┘ç┘è┘â┘ä╪⌐ | ╪ú╪│╪¿┘ê╪╣ 2-4 | ┘è┘é┘ä┘ä RSS ┘à┘å 6.2GB ΓåÆ 2-3GB | **╪╣╪º┘ä┘è╪⌐ ΓÇö ╪¬╪¡╪¬╪º╪¼ ╪¬╪«╪╖┘è╪╖** |

---

## 2. ╪¬╪¡┘ä┘è┘ä ╪┤╪¼╪▒╪⌐ ╪º┘ä┘à╪┤╪º┘â┘ä

### 2.1 ╪┤╪¼╪▒╪⌐ ╪º┘ä┘à╪┤╪º┘â┘ä ╪º┘ä┘â╪º┘à┘ä╪⌐

```
RSS 6.2GB + Heap 304MB (= 5.9GB Off-heap)
Γöé
Γö£ΓöÇΓöÇ Baileys Sessions (╪º┘ä┘à╪│╪º┘ç┘à ╪º┘ä╪ú┘â╪¿╪▒: ~3-4GB)
Γöé   Γö£ΓöÇΓöÇ activeSessions Map ΓÇö ┘â┘ä ╪¼┘ä╪│╪⌐ ╪¬╪¡╪¬┘ü╪╕ ╪¿┘Ç socket + auth keys
Γöé   Γö£ΓöÇΓöÇ keysData (DatabaseAuthState.js:179) ΓÇö ╪ó┘ä╪º┘ü Buffers ┘ä┘à┘ü╪º╪¬┘è╪¡ ╪º┘ä╪¬╪┤┘ü┘è╪▒
Γöé   Γöé   ΓööΓöÇΓöÇ ┘â┘ä Buffer = Native memory (off-heap)╪î ┘à╪┤ V8 heap
Γöé   Γö£ΓöÇΓöÇ WebSocket TLS buffers ΓÇö ┘ä┘â┘ä ╪º╪¬╪╡╪º┘ä
Γöé   Γö£ΓöÇΓöÇ protobuf decode buffers ΓÇö ┘ä┘â┘ä ╪▒╪│╪º┘ä╪⌐
Γöé   ΓööΓöÇΓöÇ authStateCache (DatabaseAuthState.js:22) ΓÇö 50 ╪¼┘ä╪│╪⌐ ┘â╪¡╪» ╪ú┘é╪╡┘ë ├ù 1 ╪│╪º╪╣╪⌐ TTL
Γöé
Γö£ΓöÇΓöÇ Prisma Query Engine (Rust) (~500MB-1GB)
Γöé   Γö£ΓöÇΓöÇ @prisma/engines binary ΓÇö 40MB ╪½╪º╪¿╪¬
Γöé   Γö£ΓöÇΓöÇ Per-query Rust memory pools
Γöé   ΓööΓöÇΓöÇ 80 connection pool
Γöé
Γö£ΓöÇΓöÇ Sharp (libvips) (~200MB-500MB)
Γöé   Γö£ΓöÇΓöÇ Image processing buffers
Γöé   ΓööΓöÇΓöÇ Concurrency default = ╪╣╪»╪» CPU cores
Γöé
ΓööΓöÇΓöÇ Node.js Streams + ArrayBuffer backing (~200MB)
    ΓööΓöÇΓöÇ defaultHighWaterMark = 64KB ┘ä┘â┘ä stream (Node 22+)
```

### 2.2 ╪│┘ä╪│┘ä╪⌐ ╪º┘ä╪ú╪¡╪»╪º╪½ ╪º┘ä╪¬┘è ╪¬╪ñ╪»┘è ┘ä┘ä┘Ç OOM

```
Client connects WhatsApp ΓåÆ createSession() ΓåÆ activeSessions.set()
  ΓåÆ authState loaded (keysData = ~2MB Buffers)
  ΓåÆ WebSocket opened (TLS ~500KB)
  ΓåÆ 10 event listeners registered (closures capture keysData)

Session disconnects ΓåÆ reconnect timer scheduled (5s-300s backoff)
  ΓåÆ reconnect creates NEW session without full cleanup of OLD
  ΓåÆ OLD socket + keysData + listeners survive in closure chain

Over days/weeks: orphaned sessions accumulate
  ΓåÆ RSS grows linearly with disconnect/reconnect cycles
  ΓåÆ Eventually: OOM Kill or PM2 restart
```

```
Sync Queue flow:
setInterval(5000) ΓåÆ processBatch(5)
  ΓåÆ ┘ä┘â┘ä item: Prisma transaction (set_config + query + commit)
    ΓåÆ pushOrderToProvider ΓåÆ 10-15 transactions per order
      ΓåÆ 5 orders ├ù 15 transactions = 75 sequential transactions
      ΓåÆ ┘â┘ä transaction ╪¬╪ú╪«╪░ 100-200ms
      ΓåÆ Total: 75 ├ù 200ms = 15 ╪½╪º┘å┘è╪⌐ ΓåÉ ╪ú╪╖┘ê┘ä ┘à┘å ╪º┘ä┘Ç 5 ╪½┘ê╪º┘å┘è interval
  ΓåÆ ╪¬╪¬╪▒╪º┘â┘à: "Already processing" ├ù N
```

---

## 3. ╪º┘ä┘à╪▒╪¡┘ä╪⌐ 0: ╪º┘ä╪¬╪┤╪«┘è╪╡ ┘ê╪º┘ä┘à╪▒╪º┘é╪¿╪⌐

*┘é╪¿┘ä ╪ú┘è ╪¬╪║┘è┘è╪▒╪î ┘å╪╢┘è┘ü ╪ú╪»┘ê╪º╪¬ ┘à╪▒╪º┘é╪¿╪⌐ ┘ä┘é┘è╪º╪│ ╪º┘ä╪¬┘é╪»┘à*

### 3.1 ╪Ñ╪╢╪º┘ü╪⌐ Memory Snapshot ╪╣┘ä┘ë ╪º┘ä╪Ñ╪┤╪º╪▒╪⌐

**╪º┘ä┘à┘ä┘ü**: `apps/backend/server.js` ΓÇö ╪ú╪╢┘ü ╪¿╪╣╪» imports

```js
// ≡ƒÜÇ PRODUCTION-MEMORY: Signal-triggered heap snapshot
// Usage: kill -USR2 <pid>  ΓåÆ  takes snapshot to /tmp
if (process.env.NODE_ENV === 'production') {
  process.on('SIGUSR2', () => {
    const { writeHeapSnapshot } = require('v8');
    const path = require('path');
    const snapshotPath = path.join('/tmp', `heap-${process.pid}-${Date.now()}.heapsnapshot`);
    writeHeapSnapshot(snapshotPath);
    console.log(`≡ƒÆ╛ [MEMORY] Heap snapshot saved to ${snapshotPath}`);
  });
}
```

**╪º┘ä┘ç╪»┘ü**: ┘å┘é╪»╪▒ ┘å╪º╪«╪» snapshot ┘ü┘è ╪ú┘è ┘ê┘é╪¬ ╪¿╪»┘ê┘å ╪Ñ╪╣╪º╪»╪⌐ ╪¬╪┤╪║┘è┘ä.

### 3.2 ╪Ñ╪╢╪º┘ü╪⌐ PM2 Memory Restart

**╪º┘ä┘à┘ä┘ü**: `ecosystem.config.js` (╪ú┘ê ╪ú┘å╪┤╪ª┘ç ┘ü┘è ╪¼╪░╪▒ ╪º┘ä┘à╪┤╪▒┘ê╪╣)

```js
module.exports = {
  apps: [
    {
      name: 'maxp-backend',
      script: 'apps/backend/server.js',
      max_memory_restart: '3G',        // ≡ƒåò Restart ┘ä┘ê RSS ╪¬╪¼╪º┘ê╪▓ 3GB
      kill_timeout: 10000,             // ┘à┘ç┘ä╪⌐ graceful shutdown
      autorestart: true,
      exp_backoff_restart_delay: 5000, // ╪¿┘è┘å ╪º┘ä┘à╪¡╪º┘ê┘ä╪º╪¬
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=4096'
      }
    },
    {
      name: 'maxp-frontend',
      script: 'apps/frontend/server.js',
      max_memory_restart: '1G'
    }
  ]
};
```

### 3.3 ╪Ñ╪╢╪º┘ü╪⌐ Logging ┘ä┘à╪¬┘ê╪│╪╖ ╪▓┘à┘å Sync Queue

**╪º┘ä┘à┘ä┘ü**: `apps/backend/services/syncQueueService.js` ΓÇö ╪ú╪╢┘ü ┘ü┘è `processBatch`

```js
async processBatch(batchSize = 5) {
    const batchStart = Date.now();  // ≡ƒåò
    // ...existing code...
    } finally {
        const elapsed = Date.now() - batchStart;  // ≡ƒåò
        if (elapsed > 3000) {  // ╪¬┘å╪¿┘è┘ç ┘ä┘ê > 3 ╪½┘ê╪º┘å┘è
            console.warn(`ΓÜá∩╕Å [SYNC-QUEUE] Batch took ${elapsed}ms (threshold: 3000ms)`);
        }
        this.processing = false;  // ┘à┘ê╪¼┘ê╪»
    }
}
```

### 3.4 ╪Ñ╪╢╪º┘ü╪⌐ Metric ┘ä╪¬╪│╪▒┘è╪¿╪º╪¬ ╪º┘ä┘Ç activeSessions

**╪º┘ä┘à┘ä┘ü**: `apps/backend/services/whatsapp/WhatsAppManager.js` ΓÇö ┘ü┘è `runHealthCheck`

```js
// ≡ƒåò ┘ü┘è ╪¿╪»╪º┘è╪⌐ runHealthCheck ╪ú┘ê ┘ü┘è interval ┘à┘å┘ü╪╡┘ä ┘â┘ä 5 ╪»┘é╪º╪ª┘é
function logSessionMetrics() {
    console.log(`≡ƒôè [WA-METRICS] Active sessions: ${activeSessions.size}` +
        ` | Company map: ${companySessionMap.size}` +
        ` | Reconnect timers: ${reconnectTimers.size}` +
        ` | Auth cache: ${authStateCache.size}` +
        ` | RSS: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
}
// ╪º╪│╪¬╪»╪╣┘ç╪º ┘â┘ä 5 ╪»┘é╪º╪ª┘é
setInterval(logSessionMetrics, 300000).unref();
```

### Γ£à ┘à╪╣╪º┘è┘è╪▒ ╪º┘ä┘å╪¼╪º╪¡ ┘ä┘ä┘à╪▒╪¡┘ä╪⌐ 0

- [ ] `kill -USR2 <pid>` ┘è┘å╪¬╪¼ ┘à┘ä┘ü `.heapsnapshot` ┘ü┘è `/tmp`
- [ ] PM2 ┘è╪╣┘è╪» ╪¬╪┤╪║┘è┘ä ╪º┘ä╪«╪»┘à╪⌐ ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ╪Ñ╪░╪º RSS ╪¬╪¼╪º┘ê╪▓ 3GB
- [ ] Log ┘è╪╕┘ç╪▒ ╪▓┘à┘å ┘â┘ä Batch ┘ü┘è Sync Queue
- [ ] Metric ┘è╪╕┘ç╪▒ ╪╣╪»╪» ╪º┘ä╪¼┘ä╪│╪º╪¬ ╪º┘ä┘å╪┤╪╖╪⌐ ┘â┘ä 5 ╪»┘é╪º╪ª┘é

---

## 4. ╪º┘ä┘à╪▒╪¡┘ä╪⌐ 1: ╪º┘ä╪Ñ╪╡┘ä╪º╪¡╪º╪¬ ╪º┘ä┘ü┘ê╪▒┘è╪⌐ (╪ú┘è╪º┘à 1-2)

### ≡ƒöº 1.1 ╪Ñ╪╡┘ä╪º╪¡ Orphaned Sockets ┘ü┘è `createSession()`

**╪º┘ä┘à┘ä┘ü**: `apps/backend/services/whatsapp/WhatsAppManager.js`  
**╪º┘ä╪ú╪│╪╖╪▒**: 1343-1346

**╪º┘ä┘â┘ê╪» ╪º┘ä╪¡╪º┘ä┘è** ΓÇö ┘è╪▒┘à┘è ╪º┘ä╪«╪╖╪ú ╪¿╪»┘ê┘å ╪¬┘å╪╕┘è┘ü:
```js
} catch (error) {
    console.error(`Γ¥î Error creating session ${sessionId}:`, error);
    throw error;  // ΓåÉ ╪¿╪»┘ê┘å cleanup ΓÇö ┘è╪¬╪│╪▒╪¿ socket + listeners + keysData
}
```

**╪º┘ä┘â┘ê╪» ╪¿╪╣╪» ╪º┘ä╪Ñ╪╡┘ä╪º╪¡** ΓÇö ┘è┘å╪╕┘ü ┘â┘ä ╪┤┘è╪í ┘é╪¿┘ä ╪Ñ╪╣╪º╪»╪⌐ ╪▒┘à┘è ╪º┘ä╪«╪╖╪ú:
```js
} catch (error) {
    console.error(`Γ¥î Error creating session ${sessionId}:`, error);

    // ≡ƒ¢í∩╕Å PRODUCTION-FIX: Clean up partial session state to prevent memory leak
    // ╪º┘ä╪¬┘ü╪º╪╡┘è┘ä: ┘ä┘ê ╪º┘ä┘Ç createSession ┘ü╪┤┘ä ╪¿╪╣╪» activeSessions.set() ╪ú┘ê sock.ev.on()╪î
    // ┘è╪¬╪▒┘â orphaned socket ┘à╪╣ 10+ listeners ┘ü┘è closure chain
    // ┘è╪¡╪¬┘ü╪╕ ╪¿┘Ç keysData (2MB+ Buffers) ┘ê┘è┘à┘å╪╣ GC
    try {
        activeSessions.delete(sessionId);
        if (sock) {
            cleanupSocketListeners(sock);
            await endSocketQuietly(sock, 'Session creation failed');
        }
    } catch (cleanupErr) {
        console.error(`ΓÜá∩╕Å [WA] Cleanup error during failed session creation:`, cleanupErr.message);
    }
    cleanupSessionState(sessionId, companyId);

    throw error;  // ΓåÉ ┘å┘ü╪│ ╪º┘ä╪«╪╖╪ú╪î ┘å┘ü╪│ ╪º┘ä╪│┘ä┘ê┘â ┘ä┘ä┘Ç Caller
}
```

**┘ä┘à╪º╪░╪º ┘ç╪░╪º ╪ó┘à┘å╪ƒ**
- `cleanupSocketListeners()` ┘à╪╣╪▒┘ü╪⌐ ┘ê idempotent (╪¬╪│╪¬╪»╪╣┘ë `removeAllListeners`)
- `endSocketQuietly()` ╪¬╪║┘ä┘é ╪º┘ä┘Ç WebSocket ╪¿╪│┘ä╪º┘à (╪»╪º╪«┘ä┘ç╪º try-catch╪î ╪«╪╖ 682)
- `cleanupSessionState()` ╪¬┘à╪│╪¡ `reconnectTimers` ┘ê `sessionHealthChecks` ┘ê `companySessionMap` ┘ê `whatsappDisconnectAlertTimestamps`
- ╪º┘ä┘â┘ê╪» ╪º┘ä╪ú╪╡┘ä┘è ┘è╪▒┘à┘è error anyway ΓÇö ╪º┘ä╪Ñ╪╢╪º┘ü╪⌐ ╪¬┘å╪╕┘ü ┘ü┘é╪╖ ┘é╪¿┘ä ╪º┘ä┘Ç throw

### ≡ƒöº 1.2 ╪Ñ╪╢╪º┘ü╪⌐ flush ┘ä┘ä┘Ç facebookDebounceService ╪╣┘å╪» ┘é╪╖╪╣ ╪º┘ä╪¼┘ä╪│╪⌐

**╪º┘ä┘à┘ä┘ü**: `apps/backend/services/facebookDebounceService.js`

╪ú╪╢┘ü ╪»╪º┘ä╪⌐ ╪¼╪»┘è╪»╪⌐:
```js
// ≡ƒ¢í∩╕Å PRODUCTION-FIX: Flush debounce buckets for a specific session
// ╪¬┘Å╪│╪¬╪»╪╣┘ë ┘à┘å WhatsAppManager ╪╣┘å╪» ┘é╪╖╪╣ ╪º┘ä╪¼┘ä╪│╪⌐ ┘ä┘à┘å╪╣ ╪¬╪▒╪º┘â┘à ╪º┘ä┘Ç Map entries
function flushSessionKeys(sessionId) {
    const prefix = `:${sessionId}:`;
    for (const [key, timer] of buckets) {
        if (key.includes(prefix)) {
            clearTimeout(timer);
            buckets.delete(key);
        }
    }
}

module.exports = {
    accumulate,
    flush,
    flushSessionKeys  // ≡ƒåò
};
```

╪½┘à ┘ü┘è `apps/backend/services/whatsapp/WhatsAppManager.js` ┘ü┘è `cleanupSessionState`:
```js
// ≡ƒåò ╪¿╪╣╪» ╪º┘ä╪│╪╖╪▒ 133 (╪ú┘ê ┘ü┘è ╪ú┘è ┘à┘â╪º┘å cleanupSessionState ┘è┘Å╪│╪¬╪»╪╣┘ë)
const { flushSessionKeys } = require('../facebookDebounceService');
flushSessionKeys(sessionId);
```

### ≡ƒöº 1.3 ╪Ñ╪╢╪º┘ü╪⌐ ┘à╪╣╪º┘ä╪¼╪⌐ ╪¡╪º┘ä╪⌐ PROCESSING ╪º┘ä╪╣╪º┘ä┘é╪⌐ ┘ü┘è Sync Queue

**╪º┘ä┘à┘ä┘ü**: `apps/backend/services/syncQueueService.js` ΓÇö ┘ü┘è `processBatch`

╪ú╪╢┘ü ┘ü┘è ╪¿╪»╪º┘è╪⌐ `processBatch`:
```js
async processBatch(batchSize = 5) {
    if (this.processing) {
        console.log('ΓÅ│ [SYNC-QUEUE] Already processing');
        return;
    }
    this.processing = true;
    try {
        // ≡ƒ¢í∩╕Å PRODUCTION-FIX: Release stuck PROCESSING items
        // ┘ä┘ê ╪º┘ä╪«╪º╪»┘à ╪º┘å╪╖┘ü╪ú ╪ú╪½┘å╪º╪í ┘à╪╣╪º┘ä╪¼╪⌐ ╪╖┘ä╪¿╪î ┘è╪╣┘ä┘é ┘ü┘è ╪¡╪º┘ä╪⌐ PROCESSING ┘ä┘ä╪ú╪¿╪»
        await this.prisma.orderSyncQueue.updateMany({
            where: {
                status: 'PROCESSING',
                updatedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) } // ΓåÉ ╪ú┘é╪»┘à ┘à┘å 30 ╪»┘é┘è┘é╪⌐
            },
            data: {
                status: 'PENDING',
                lastError: 'Released from stale PROCESSING state (server restart)',
                nextRetryAt: new Date()
            }
        });

        const items = await this.prisma.orderSyncQueue.findMany({ ...existing... });
        // ... rest of existing code
    } finally {
        this.processing = false;
    }
}
```

### Γ£à ┘à╪╣╪º┘è┘è╪▒ ╪º┘ä┘å╪¼╪º╪¡ ┘ä┘ä┘à╪▒╪¡┘ä╪⌐ 1

- [ ] ┘ä╪º ╪¬╪╕┘ç╪▒ ╪¼┘ä╪│╪º╪¬ orphaned ┘ü┘è `activeSessions` Map ╪¿╪╣╪» ┘ü╪┤┘ä `createSession()`
- [ ] ╪º┘ä┘Ç `authStateCache` ┘ä╪º ┘è╪¡╪¬┘ê┘è ╪¼┘ä╪│╪º╪¬ ┘à╪╣╪╖┘ä╪⌐
- [ ] `facebookDebounceService` ┘ä╪º ┘è╪¬╪▒╪º┘â┘à keys ┘ä┘ä╪¼┘ä╪│╪º╪¬ ╪º┘ä┘à┘å┘é╪╖╪╣╪⌐
- [ ] ╪╖┘ä╪¿╪º╪¬ `PROCESSING` ╪º┘ä╪ú┘é╪»┘à ┘à┘å 30 ╪»┘é┘è┘é╪⌐ ╪¬╪¬╪¡╪▒╪▒ ╪¬┘ä┘é╪º╪ª┘è╪º┘ï
- [ ] ┘ä╪º ╪¬╪║┘è┘è╪▒ ┘ü┘è ╪│┘ä┘ê┘â ╪º┘ä╪¼┘ä╪│╪º╪¬ ╪º┘ä┘å╪┤╪╖╪⌐ ΓÇö ╪º┘ä╪╡┘ê╪¬ ┘ê╪º┘ä╪╡┘ê╪▒╪⌐ ┘ê╪º┘ä╪▒╪│╪º╪ª┘ä ┘â┘ä┘ç╪º ╪┤╪║╪º┘ä╪⌐

---

## 5. ╪º┘ä┘à╪▒╪¡┘ä╪⌐ 2: ╪¬╪¡╪│┘è┘å╪º╪¬ ╪º┘ä╪ú╪»╪º╪í (╪ú┘è╪º┘à 3-7)

### ≡ƒÜÇ 2.1 ╪º╪│╪¬╪¿╪»╪º┘ä Sync Queue ╪¿┘Ç BullMQ

**╪º┘ä┘à┘ä┘ü**: `apps/backend/services/syncQueueService.js` ΓÇö ╪Ñ╪╣╪º╪»╪⌐ ┘â╪¬╪º╪¿╪⌐ ┘â╪º┘à┘ä╪⌐

```js
const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');

// ≡ƒÜÇ PRODUCTION-PERF: Replace setInterval queue with BullMQ
// BullMQ ┘à┘ê╪¼┘ê╪» ╪¿╪º┘ä┘ü╪╣┘ä ┘ü┘è stack (┘à╪│╪¬╪«╪»┘à ┘ü┘è queueService.js)
// ╪º┘ä┘à┘à┘è╪▓╪º╪¬: job timeout╪î retry backoff╪î stalled detection╪î zero polling

const REDIS_CONFIG = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null,
    enableReadyCheck: false
};

class SyncQueueService {
    constructor() {
        this.prisma = getSharedPrismaClient();

        // Fallback: ╪º╪│╪¬╪«╪»┘à setInterval ┘ä┘ê Redis ┘à╪┤ ┘à╪¬╪º╪¡
        this.useFallback = false;
        try {
            this.queue = new Queue('sync-orders', {
                connection: REDIS_CONFIG,
                defaultJobOptions: {
                    attempts: 10,
                    backoff: { type: 'exponential', delay: 10000 },
                    removeOnComplete: 100,
                    removeOnFail: 500
                }
            });
            this.worker = new Worker('sync-orders', async (job) => {
                return this.pushOrder(job.data.orderId, job.data.consumerId);
            }, {
                connection: REDIS_CONFIG,
                concurrency: 5,
                stalledInterval: 30000,  // 30s ╪¿╪»┘ê┘å progress = stalled
                maxStalledCount: 3
            });
            this.worker.on('failed', (job, err) => {
                console.error(`Γ¥î [SYNC-QUEUE] Job ${job.id} failed:`, err.message);
            });
            this.worker.on('completed', (job) => {
                console.log(`Γ£à [SYNC-QUEUE] Job ${job.id} completed`);
            });
        } catch (redisErr) {
            console.warn(`ΓÜá∩╕Å [SYNC-QUEUE] Redis unavailable, using fallback polling:`, redisErr.message);
            this.useFallback = true;
            this.startFallbackPolling();
        }
    }

    async enqueue(orderId, consumerId) {
        if (this.useFallback) {
            return this.enqueueFallback(orderId, consumerId);  // ΓåÉ ╪º┘ä┘â┘ê╪» ╪º┘ä┘é╪»┘è┘à
        }
        await this.queue.add(`sync-${orderId}`, { orderId, consumerId }, {
            jobId: `sync-order-${orderId}`,  // dedup
        });
    }

    async pushOrder(orderId, consumerId) {
        const internalSyncService = require('./internalSyncService');
        // ┘à╪╣ timeout 60 ╪½╪º┘å┘è╪⌐ ┘ä┘â┘ä push (┘è┘à┘å╪╣ ╪º┘ä╪¬╪╣┘ä┘è┘é ┘ä┘ä╪ú╪¿╪»)
        await Promise.race([
            internalSyncService.pushOrderToProvider(orderId, consumerId),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('pushOrderToProvider timed out after 60s')), 60000)
            )
        ]);
    }

    startFallbackPolling() {
        // ┘å┘ü╪│ ╪º┘ä┘Ç setInterval ╪º┘ä┘é╪»┘è┘à ┘â╪«╪╖╪⌐ ╪¿╪»┘è┘ä╪⌐
        setInterval(() => this.processBatchFallback(5), 5000);
    }
}

module.exports = new SyncQueueService();
```

**╪½┘à ┘ü┘è** `apps/backend/server.js` ╪º┘ä╪│╪╖╪▒ 1257-1259:

```js
// ≡ƒÜÇ PRODUCTION-PERF: BullMQ handles polling ΓÇö no setInterval needed
// ┘è╪¬┘à ╪¬┘ç┘è╪ª╪⌐ ╪º┘ä┘Ç Worker ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ┘ü┘è constructor ╪º┘ä┘Ç SyncQueueService
const syncQueueService = require('./services/syncQueueService');
// Γå│ ┘ä╪º ╪»╪º╪╣┘è ┘ä┘Ç setInterval ╪¿╪╣╪» ╪º┘ä╪ó┘å
```

### ≡ƒÜÇ 2.2 ╪¬┘é┘ä┘è┘ä INTERACTIVE_TRANSACTION_TIMEOUT

**╪º┘ä┘à┘ä┘ü**: `apps/backend/services/sharedDatabase.js`

```js
// ≡ƒÜÇ PRODUCTION-PERF: Reduce transaction timeout from 30s to 5s
// ╪º┘ä┘é┘è┘à╪⌐ ╪º┘ä╪ú╪╡┘ä┘è╪⌐ 30000 ╪¬┘à┘å╪╣ GC ┘ê╪¬╪¿┘é┘è connections ┘à┘ü╪¬┘ê╪¡╪⌐ ┘ü┘è pool
// 5 ╪½┘ê╪º┘å┘è ┘â╪º┘ü┘è╪⌐ ┘ä╪ú┘è query ╪╣╪º╪»┘è ΓÇö ┘ä┘ê ╪ú╪«╪░ ╪ú╪╖┘ê┘ä╪î ┘ü┘è┘ç ┘à╪┤┘â┘ä╪⌐ ┘ü┘è DB
const INTERACTIVE_TRANSACTION_TIMEOUT = 5000;   // ┘â╪º┘å 30000
const INTERACTIVE_TRANSACTION_MAX_WAIT = 3000;  // ┘â╪º┘å 10000
```

**┘ä┘à╪º╪░╪º ┘ç╪░╪º ╪ó┘à┘å╪ƒ**
- PostgreSQL queries ╪º┘ä┘å┘à┘ê╪░╪¼┘è╪⌐ ╪¬╪ú╪«╪░ < 100ms
- 5 ╪½┘ê╪º┘å┘ì ╪ú┘â╪½╪▒ ┘à┘å ┘â╪º┘ü┘è╪⌐ ┘ä╪ú┘è query
- ┘ä┘ê query ╪ú╪«╪░ > 5 ╪½┘ê╪º┘å┘ì╪î ┘ü┘è┘ç ┘à╪┤┘â┘ä╪⌐ ┘ü┘è ╪º┘ä┘Ç DB anyway
- ┘è╪¡╪▒╪▒ connections ┘ü┘è ╪º┘ä┘Ç pool ╪ú╪│╪▒╪╣ ╪¿ 6 ┘à╪▒╪º╪¬

### ≡ƒÜÇ 2.3 ╪Ñ╪╢╪º┘ü╪⌐ AbortSignal ┘ä┘Ç pushOrderToProvider

**╪º┘ä┘à┘ä┘ü**: `apps/backend/services/internalSyncService.js`

╪ú╪╢┘ü support ┘ä┘Ç AbortSignal ┘ü┘è `pushOrderToProvider`:

```js
async pushOrderToProvider(orderId, consumerId, signal) {
    // ≡ƒÜÇ PRODUCTION-PERF: Support abort signal for BullMQ timeout
    const abortHandler = () => {
        // Signal the running operations to stop
        throw new Error(`[INTERNAL-SYNC] pushOrderToProvider aborted for order ${orderId}`);
    };
    signal?.addEventListener('abort', abortHandler, { once: true });
    
    try {
        // ...existing code...
        const result = await tenantContext.run(consumerId, async () => {
            await Promise.race([
                // ...existing queries...,
                signal ? new Promise((_, reject) => 
                    signal.addEventListener('abort', () => reject(new Error('Aborted')))
                ) : Promise.resolve()
            ]);
            // ...rest...
        });
    } finally {
        signal?.removeEventListener('abort', abortHandler);
    }
}
```

### Γ£à ┘à╪╣╪º┘è┘è╪▒ ╪º┘ä┘å╪¼╪º╪¡ ┘ä┘ä┘à╪▒╪¡┘ä╪⌐ 2

- [ ] BullMQ ┘è╪│╪¬┘ä┘à jobs ┘ê┘è╪┤╪¬╪║┘ä┘ç╪º ┘à╪╣ timeout 60 ╪½╪º┘å┘è╪⌐
- [ ] ┘ä┘ê Redis ┘ê┘é╪╣╪î fallback polling ┘è╪┤╪¬╪║┘ä ╪¬┘ä┘é╪º╪ª┘è╪º┘ï
- [ ] ┘à╪¬┘ê╪│╪╖ ╪▓┘à┘å ╪º┘ä┘Ç Batch < 3 ╪½┘ê╪º┘å┘ì (╪¿╪»┘ê┘å ╪▒╪│╪º┘ä╪⌐ "Already processing")
- [ ] ╪º┘ä┘Ç Transactions ╪¬┘å╪¬┘ç┘è ╪¿╪│╪▒╪╣╪⌐ (16x ╪ú╪│╪▒╪╣ ┘à┘å ╪º┘ä╪│╪º╪¿┘é)
- [ ] `abortSignal` ┘è┘é╪╖╪╣ pushOrderToProvider ╪Ñ╪░╪º ╪¬╪¼╪º┘ê╪▓ ╪º┘ä┘Ç timeout

---

## 6. ╪º┘ä┘à╪▒╪¡┘ä╪⌐ 3: ╪Ñ╪╣╪º╪»╪⌐ ╪º┘ä┘ç┘è┘â┘ä╪⌐ (╪ú╪│╪º╪¿┘è╪╣ 2-4)

### ≡ƒÅù∩╕Å 3.1 ╪╣╪▓┘ä ╪¼┘ä╪│╪º╪¬ Baileys ┘ü┘è Worker Threads

**┘ç╪░┘ç ╪ú┘â╪¿╪▒ ┘ê╪ú╪«╪╖╪▒ ┘à╪▒╪¡┘ä╪⌐ ΓÇö ┘ä╪º ╪¬┘å┘ü╪░ ╪¿╪»┘ê┘å ╪º╪«╪¬╪¿╪º╪▒ ╪┤╪º┘à┘ä**

**╪º┘ä┘à╪¿╪»╪ú**: ┘â┘ä 3-5 ╪¼┘ä╪│╪º╪¬ ┘ü┘è Worker ┘à┘å┘ü╪╡┘ä ╪¿╪╣╪▓┘ä╪⌐ ╪░╪º┘â╪▒╪⌐ ┘â╪º┘à┘ä╪⌐

**╪º┘ä┘à┘ä┘ü ╪º┘ä╪¼╪»┘è╪»**: `apps/backend/workers/whatsappSessionWorker.js`

```js
const { parentPort, workerData } = require('worker_threads');
const makeWASocket = require('@whiskeysockets/baileys');
const { useDatabaseAuthState } = require('../services/whatsapp/DatabaseAuthState');

// ≡ƒÅù∩╕Å PRODUCTION-ARCH: Baileys session worker
// ┘â┘ä Worker ┘è╪¬╪╣╪º┘à┘ä ┘à╪╣ 3-5 ╪¼┘ä╪│╪º╪¬ ┘â╪¡╪» ╪ú┘é╪╡┘ë
// resourceLimits.maxOldGenerationSizeMb = 400 ┘è╪╣┘å┘è ╪ú┘é╪╡┘ë RSS = ~500MB

class SessionWorker {
    constructor() {
        this.sessions = new Map();  // local, ┘ê┘ä┘è╪│ global
        this.setupIPC();
    }

    setupIPC() {
        parentPort.on('message', async (msg) => {
            try {
                switch (msg.type) {
                    case 'create':
                        await this.createSession(msg.sessionId, msg.companyId, msg.options);
                        break;
                    case 'send':
                        await this.sendMessage(msg.sessionId, msg.jid, msg.content);
                        break;
                    case 'disconnect':
                        await this.disconnectSession(msg.sessionId);
                        break;
                    case 'health':
                        const health = this.checkHealth(msg.sessionId);
                        parentPort.postMessage({ type: 'health', sessionId: msg.sessionId, healthy: health });
                        break;
                }
            } catch (error) {
                parentPort.postMessage({
                    type: 'error',
                    sessionId: msg.sessionId,
                    error: error.message
                });
            }
        });
    }

    async createSession(sessionId, companyId, options) {
        const { state, saveCreds } = await useDatabaseAuthState(sessionId);
        const sock = makeWASocket({ auth: state, ...options });

        this.sessions.set(sessionId, { sock, saveCreds });

        sock.ev.on('connection.update', (update) => {
            parentPort.postMessage({
                type: 'connection.update',
                sessionId,
                update
            });
        });
        // ... ╪¿╪º┘é┘è listeners ╪¬╪▒╪│┘ä events ╪Ñ┘ä┘ë parent

        parentPort.postMessage({ type: 'created', sessionId });
    }

    checkHealth(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return false;
        try {
            return session.sock?.ws?._socket?.readyState === 'open';
        } catch { return false; }
    }

    async disconnectSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session?.sock) {
            session.sock.removeAllListeners();
            session.sock.ws?.close();
            session.sock.end(undefined);
        }
        this.sessions.delete(sessionId);
    }
}

new SessionWorker();
```

**╪º┘ä╪¬╪╣╪»┘è┘ä ╪╣┘ä┘ë** `apps/backend/services/whatsapp/WhatsAppManager.js`:

╪¿╪»┘ä╪º┘ï ┘à┘å `createSession` ╪º┘ä┘à╪¿╪º╪┤╪▒:
```js
// ╪¿╪»┘ä╪º┘ï ┘à┘å:
// activeSessions.set(sessionId, sessionData);
// const sock = makeWASocket(socketOptions);

// ≡ƒÅù∩╕Å PRODUCTION-ARCH: Use worker pool instead
const sessionWorker = workerPool.assignSession(sessionId, companyId);
```

**┘à┘ä┘ü ╪¼╪»┘è╪»**: `apps/backend/services/whatsapp/BaileysWorkerPool.js`

```js
const { Worker } = require('worker_threads');
const path = require('path');

class BaileysWorkerPool {
    constructor(maxSessionsPerWorker = 5, minWorkers = 2) {
        this.workers = [];
        this.sessionToWorker = new Map();
        this.maxSessionsPerWorker = maxSessionsPerWorker;
        this.minWorkers = minWorkers;

        // Start with minimum workers
        for (let i = 0; i < minWorkers; i++) {
            this.spawnWorker();
        }
    }

    spawnWorker() {
        const worker = new Worker(
            path.join(__dirname, '../../workers/whatsappSessionWorker.js'),
            {
                resourceLimits: {
                    maxOldGenerationSizeMb: 400,
                    maxYoungGenerationSizeMb: 80
                }
            }
        );

        const entry = {
            worker,
            sessionIds: new Set(),
            messageQueue: []
        };

        worker.on('message', (msg) => this.handleMessage(msg, entry));
        worker.on('error', (err) => console.error(`[WORKER] Error:`, err.message));
        worker.on('exit', (code) => {
            console.warn(`[WORKER] Exited with code ${code}, respawning...`);
            this.respawnWorker(entry);
        });

        this.workers.push(entry);
        return entry;
    }

    assignSession(sessionId, companyId, options) {
        // Find least loaded worker
        let best = this.workers[0];
        for (const w of this.workers) {
            if (w.sessionIds.size < best.sessionIds.size) best = w;
        }

        // If all workers full, spawn new
        if (best.sessionIds.size >= this.maxSessionsPerWorker) {
            best = this.spawnWorker();
        }

        best.worker.postMessage({ type: 'create', sessionId, companyId, options });
        best.sessionIds.add(sessionId);
        this.sessionToWorker.set(sessionId, best);
    }

    sendMessage(sessionId, jid, content) {
        const entry = this.sessionToWorker.get(sessionId);
        if (!entry) throw new Error(`Session ${sessionId} not found in any worker`);
        entry.worker.postMessage({ type: 'send', sessionId, jid, content });
    }

    respawnWorker(oldEntry) {
        // Migrate sessions? For now, just log
        console.warn(`[WORKER] Respawn needed, lost ${oldEntry.sessionIds.size} sessions`);
    }

    async disconnectAll() {
        for (const w of this.workers) {
            w.worker.postMessage({ type: 'disconnect' });
            await w.worker.terminate();
        }
        this.workers = [];
        this.sessionToWorker.clear();
    }
}

module.exports = BaileysWorkerPool;
```

### ≡ƒÅù∩╕Å 3.2 ╪º╪│╪¬╪¿╪»╪º┘ä $extends RLS ╪¿┘Ç Postgres Native RLS

**┘ç╪░┘ç ╪º┘ä┘à╪▒╪¡┘ä╪⌐ ┘à┘â┘à┘ä╪⌐ ┘ä┘ä┘Ç Worker threads ΓÇö ╪¬╪¡╪¬╪º╪¼ ╪¬┘å╪│┘è┘é**

**╪º┘ä┘à┘ä┘ü**: `apps/backend/services/sharedDatabase.js`

**╪«╪╖┘ê╪⌐ 1**: ╪Ñ┘å╪┤╪º╪í ╪º┘ä┘Ç Migration SQL

```sql
-- ≡ƒÅù∩╕Å PRODUCTION-ARCH: Replace $extends RLS with native Postgres RLS
-- ┘ç╪░╪º ┘è┘ä╪║┘è 3-step transaction overhead ┘ä┘â┘ä query

DO $$ DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN (
            'Order', 'OrderItem', 'Customer', 'Product', 'WhatsAppMessage',
            'WhatsAppContact', 'BroadcastRecipient', 'Broadcast',
            'CompanyConnection', -- ≡ƒÜ½ ╪º╪│╪¬╪½┘å╪º╪í ┘ä┘ä╪¼╪»╪º┘ê┘ä ╪º┘ä┘à╪┤╪¬╪▒┘â╪⌐
            'Affiliate', 'Commission', 'Inventory', 'Invoice'
          )
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %I FOR ALL USING (
                "companyId" = current_setting(''app.current_company_id'')::text
            )', tbl
        );
    END LOOP;
END $$;
```

**╪«╪╖┘ê╪⌐ 2**: ╪¬╪╣╪»┘è┘ä `sharedDatabase.js`

```js
// ≡ƒÜÇ PRODUCTION-ARCH: Remove $extends RLS, use native Postgres RLS
function createStablePrismaClient() {
    // ...existing code until line 180...

    const client = new PrismaClientConstructor({
        datasources: { db: { url: urlWithParams.toString() } },
        log: ['error'],
        errorFormat: 'minimal',
        transactionOptions: {
            maxWait: INTERACTIVE_TRANSACTION_MAX_WAIT,
            timeout: INTERACTIVE_TRANSACTION_TIMEOUT
        }
    });

    // Γ¥î ╪¡╪░┘ü ┘â╪¬┘ä╪⌐ $extends ╪¿╪º┘ä┘â╪º┘à┘ä:
    // const extendedClient = client.$extends({ query: { $allOperations: ... } });
    // ≡ƒåò ┘å╪│╪¬╪«╪»┘à middleware ╪╣┘ä┘ë ┘à╪│╪¬┘ê┘ë ╪º┘ä╪¬╪╖╪¿┘è┘é ╪¿╪»┘ä╪º┘ï ┘à┘å ╪░┘ä┘â
    // (┘ü┘è apps/backend/server.js)

    return client;  // ┘â╪º┘å return extendedClient;
}
```

**╪«╪╖┘ê╪⌐ 3**: ╪Ñ╪╢╪º┘ü╪⌐ middleware ┘ü┘è `server.js`

```js
// ≡ƒÅù∩╕Å PRODUCTION-ARCH: Set tenant context at request boundary, not per-query
// ┘è╪¡┘ä ┘à╪¡┘ä $extends RLS ΓÇö set_config ┘à╪▒╪⌐ ┘ê╪º╪¡╪»╪⌐ ┘ä┘â┘ä ╪╖┘ä╪¿
app.use(async (req, res, next) => {
    const companyId = req.companyId || (req.user && req.user.companyId);
    if (companyId) {
        try {
            const prisma = getSharedPrismaClient();
            await prisma.$executeRaw`SELECT set_config('app.current_company_id', ${companyId}, true)`;
        } catch (err) {
            // Silent fail ΓÇö RLS ┘à┘ç┘à╪¬┘ç ╪º┘ä╪¬╪╡┘ü┘è╪⌐╪î ┘ä┘ê ┘ü╪┤┘ä ╪º┘ä┘Ç request ┘è╪┤╪¬╪║┘ä ╪¿╪»┘ê┘å RLS
            console.warn(`ΓÜá∩╕Å [RLS] Failed to set tenant context:`, err.message);
        }
    }
    next();
});
```

**╪¬╪¡╪░┘è╪▒ ╪ú┘à┘å┘è**: ┘ç╪░╪º ╪º┘ä╪¬╪║┘è┘è╪▒ ┘è╪ñ╪½╪▒ ╪╣┘ä┘ë **┘â┘ä Query ┘ü┘è ┘â┘ä Request**. ╪ú┘è ╪«╪╖╪ú ┘ü┘è ╪º┘ä┘Ç RLS Policy ┘è╪ñ╪»┘è ┘ä╪¬╪│╪▒┘è╪¿ ╪¿┘è╪º┘å╪º╪¬ ╪╣╪¿╪▒ ╪º┘ä╪╣┘à┘ä╪º╪í. ┘è╪¼╪¿ ╪º╪«╪¬╪¿╪º╪▒┘ç ╪╣┘ä┘ë staging database ╪ú┘ê┘ä╪º┘ï ┘à╪╣ ┘å╪│╪«╪⌐ ┘à┘å ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪Ñ┘å╪¬╪º╪¼.

### Γ£à ┘à╪╣╪º┘è┘è╪▒ ╪º┘ä┘å╪¼╪º╪¡ ┘ä┘ä┘à╪▒╪¡┘ä╪⌐ 3

- [ ] Worker pool ┘è╪┤╪║┘ä 3-5 ╪¼┘ä╪│╪º╪¬ ┘ä┘â┘ä Worker
- [ ] ┘ä┘ê Worker ┘à╪º╪¬╪î ╪º┘ä┘Ç Pool ┘è╪╣┘è╪» ╪¬╪┤╪║┘è┘ä┘ç
- [ ] ┘ä╪º ╪¬╪║┘è┘è╪▒ ┘ü┘è ╪│┘ä┘ê┘â ╪Ñ╪▒╪│╪º┘ä/╪º╪│╪¬┘é╪¿╪º┘ä ╪▒╪│╪º╪ª┘ä ┘ê╪º╪¬╪│╪º╪¿
- [ ] ╪º┘ä┘Ç `set_config` ┘è┘Å╪│╪¬╪»╪╣┘ë ┘à╪▒╪⌐ ┘ê╪º╪¡╪»╪⌐ ┘ä┘â┘ä Request (╪¿╪»┘ä╪º┘ï ┘à┘å ┘â┘ä Query)
- [ ] ┘â┘ä ╪º┘ä╪¼╪»╪º┘ê┘ä ╪º┘ä┘à╪│╪¬┘ç╪»┘ü╪⌐ ┘ä╪»┘è┘ç╪º RLS policies ┘ü╪╣╪º┘ä╪⌐
- [ ] ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪┤╪▒┘â╪⌐ (╪ú) ┘ä╪º ╪¬╪╕┘ç╪▒ ╪ú╪¿╪»╪º┘ï ┘ä┘ä╪┤╪▒┘â╪⌐ (╪¿)

---

## 7. ┘â┘è┘ü┘è╪⌐ ╪º┘ä╪¬╪╖╪¿┘è┘é ΓÇö ╪ú╪»┘ä╪⌐ ╪¬┘ü╪╡┘è┘ä┘è╪⌐

### 7.1 ╪»┘ä┘è┘ä ╪¬╪╖╪¿┘è┘é ╪Ñ╪╡┘ä╪º╪¡ `createSession`

```bash
# 1. ╪¬╪ú┘â╪» ┘à┘å ╪º┘ä┘Ç file path
ls -la apps/backend/services/whatsapp/WhatsAppManager.js

# 2. ╪º╪¿╪¡╪½ ╪╣┘å ╪º┘ä┘Ç catch block
grep -n "catch (error)" apps/backend/services/whatsapp/WhatsAppManager.js | head -5
# ╪º┘ä┘å╪º╪¬╪¼: 1343: } catch (error) {

# 3. ╪╖╪¿┘é ╪º┘ä╪¬╪║┘è┘è╪▒

# 4. ╪º╪«╪¬╪¿╪▒ ╪ú┘å ╪º┘ä╪¬╪║┘è┘è╪▒ ┘ä╪º ┘è╪│╪¿╪¿ Syntax Error
node --check apps/backend/services/whatsapp/WhatsAppManager.js

# 5. ╪º╪«╪¬╪¿╪▒ ╪¡╪º┘ä╪º╪¬ ╪º┘ä┘ü╪┤┘ä ┘è╪»┘ê┘è╪º┘ï
# - ╪º┘é╪╖╪╣ ╪º╪¬╪╡╪º┘ä ╪º┘ä╪Ñ┘å╪¬╪▒┘å╪¬ ╪ú╪½┘å╪º╪í ╪▒╪¿╪╖ ╪¼┘ä╪│╪⌐
# - ╪ú┘ê ╪º╪│╪¬╪«╪»┘à pairing code ╪«╪º╪╖╪ª
# - ╪¬╪ú┘â╪» ╪ú┘å activeSessions ┘ä╪º ┘è╪¬╪▒╪º┘â┘à
```

### 7.2 ╪»┘ä┘è┘ä ╪¬╪╖╪¿┘è┘é BullMQ

```bash
# 0. ╪¬╪ú┘â╪» ┘à┘å ╪ú┘å Redis ╪┤╪║╪º┘ä
redis-cli ping
# ΓåÆ PONG

# 1. ╪ú┘ê┘é┘ü ╪º┘ä┘Ç setInterval ╪º┘ä╪¡╪º┘ä┘è ┘ü┘è server.js
# ╪º╪¿╪¡╪½ ╪╣┘å:
#   setInterval(() => syncQueueService.processBatch(5), 5000);
# ╪╣┘ä┘é┘ç╪º ╪ú┘ê ╪º╪¡╪░┘ü┘ç╪º

# 2. ╪º╪«╪¬╪¿╪▒ ╪º┘ä┘Ç Queue
node -e "
const { Queue } = require('bullmq');
const q = new Queue('sync-orders-test', { connection: { host: 'localhost' } });
q.add('test', { orderId: 'test-1', consumerId: 'test-c1' }).then(() => {
    console.log('Γ£à Queue test passed');
    q.close();
});
"

# 3. ╪▒╪º┘é╪¿ ╪º┘ä┘Ç Worker logs
# ╪¬┘ê┘é╪╣:
# ≡ƒÜÇ [SYNC-QUEUE] Job sync-test-1 completed
```

### 7.3 ╪»┘ä┘è┘ä ╪º┘ä╪¬╪▒╪º╪¼╪╣ ╪╣┘å ╪ú┘è ╪¬╪║┘è┘è╪▒

```bash
# ┘ä┘Ç createSession fix:
git checkout -- apps/backend/services/whatsapp/WhatsAppManager.js

# ┘ä┘Ç BullMQ:
# ╪º╪▒╪¼╪╣ ╪º┘ä╪│╪╖╪▒ setInterval ┘ü┘è server.js
git checkout -- apps/backend/server.js
git checkout -- apps/backend/services/syncQueueService.js

# ┘ä┘Ç PM2 config:
git checkout -- ecosystem.config.js

# ┘ä┘Ç sharedDatabase.js:
git checkout -- apps/backend/services/sharedDatabase.js
```

---

## 8. ╪º╪│╪¬╪▒╪º╪¬┘è╪¼┘è╪⌐ ╪º┘ä╪º╪«╪¬╪¿╪º╪▒ ┘ê╪º┘ä╪╖╪▒╪¡

### 8.1 ╪¬╪▒╪¬┘è╪¿ ╪º┘ä╪╖╪▒╪¡

```
╪º┘ä╪Ñ┘å╪¬╪º╪¼ ΓåÉ Staging ΓåÉ Development
     Γåæ           Γåæ           Γåæ
   ╪ú╪│╪¿┘ê╪╣ 2     ╪ú╪│╪¿┘ê╪╣ 1     ╪º┘ä┘è┘ê┘à 1
```

### 8.2 ┘é╪º╪ª┘à╪⌐ ╪º┘ä╪º╪«╪¬╪¿╪º╪▒╪º╪¬ ╪º┘ä┘à╪╖┘ä┘ê╪¿╪⌐

| # | ╪º┘ä╪º╪«╪¬╪¿╪º╪▒ | ┘è╪╢┘à┘å | ╪º┘ä┘à╪▒╪¡┘ä╪⌐ |
|---|---------|------|---------|
| 1 | ╪▒╪¿╪╖ ╪¼┘ä╪│╪⌐ ┘ê╪º╪¬╪│╪º╪¿ ╪¼╪»┘è╪»╪⌐ + ┘é╪╖╪╣ ╪º┘ä╪º╪¬╪╡╪º┘ä 3 ┘à╪▒╪º╪¬ | ┘ä╪º orphaned sessions | 1 |
| 2 | ╪Ñ╪▒╪│╪º┘ä 100 ╪▒╪│╪º┘ä╪⌐ (┘å╪╡ + ╪╡┘ê╪▒╪⌐ + ┘ü┘è╪»┘è┘ê) | ┘ä╪º ╪¬╪╣┘ä┘è┘é ┘ä┘ä┘Ç send | 1 |
| 3 | ╪Ñ┘å╪┤╪º╪í ╪╖┘ä╪¿ ╪¬┘ê╪½┘è┘é (Order sync) ┘à╪╣ 50 item | ┘ä╪º "Already processing" | 2 |
| 4 | ┘é╪╖╪╣ Redis ╪½┘à ╪Ñ╪╣╪º╪»╪⌐ ╪¬╪┤╪║┘è┘ä┘ç | BullMQ fallback ┘è╪┤╪¬╪║┘ä | 2 |
| 5 | ┘ü╪¬╪¡ 100 ╪¼┘ä╪│╪⌐ ┘ê╪º╪¬╪│╪º╪¿ (┘à╪¡╪º┘â╪º╪⌐) | Worker pool ┘è┘ê╪▓╪╣┘ç╪º | 3 |
| 6 | ╪º╪│╪¬╪╣┘ä╪º┘à ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪┤╪▒┘â╪⌐ ╪ú ╪½┘à ╪º┘ä╪┤╪▒┘â╪⌐ ╪¿ | RLS ┘è┘ü╪╡┘ä ╪¿┘è┘å┘ç┘à | 3 |
| 7 | PM2 restart ┘à╪╣ --max_memory_restart | Graceful shutdown | 0 |

### 8.3 ╪º╪«╪¬╪¿╪º╪▒ ╪º┘ä╪¬╪¡┘à┘è┘ä

```bash
# ╪º╪«╪¬╪¿╪º╪▒ BullMQ ┘à╪╣ 1000 job
node -e "
const { Queue } = require('bullmq');
const q = new Queue('sync-orders', { connection: { host: 'localhost' } });
for (let i = 0; i < 1000; i++) {
    q.add(\`sync-\${i}\`, { orderId: \`test-\${i}\`, consumerId: 'test-c1' });
}
console.log('Γ£à 1000 jobs enqueued');
q.close();
"

# ┘à╪▒╪º┘é╪¿╪⌐ RSS ╪ú╪½┘å╪º╪í ╪º┘ä╪º╪«╪¬╪¿╪º╪▒
watch -n 1 'ps aux | grep node | grep -v grep'
```

---

## 9. ╪º┘ä┘à╪▒╪º┘é╪¿╪⌐ ┘ê╪º┘ä╪¬╪¡┘é┘é

### 9.1 ┘à╪ñ╪┤╪▒╪º╪¬ ╪º┘ä┘å╪¼╪º╪¡ (Key Metrics)

| ╪º┘ä┘à╪ñ╪┤╪▒ | ╪º┘ä╪¡╪º┘ä┘è | ╪º┘ä┘ç╪»┘ü ╪¿╪╣╪» ╪º┘ä┘à╪▒╪¡┘ä╪⌐ 1 | ╪º┘ä┘ç╪»┘ü ╪¿╪╣╪» ╪º┘ä┘à╪▒╪¡┘ä╪⌐ 2 | ╪º┘ä┘ç╪»┘ü ╪º┘ä┘å┘ç╪º╪ª┘è |
|--------|-------|--------------------|--------------------|---------------|
| RSS | 6.2GB | < 5GB | < 4GB | < 2.5GB |
| Heap | 304MB/4144MB | 300-500MB | 300-500MB | 300-500MB |
| ╪╣╪»╪» orphaned sessions | ╪║┘è╪▒ ┘à╪╣╪▒┘ê┘ü | 0 | 0 | 0 |
| Batch time | > 15s | > 15s | < 3s | < 1s |
| "Already processing" log | ┘â┘ä 5-10s | ┘â┘ä 5-10s | 0 | 0 |
| PM2 restarts | 0 | 0 | 0 | 0 |

### 9.2 ╪ú┘ê╪º┘à╪▒ ╪º┘ä┘à╪▒╪º┘é╪¿╪⌐

```bash
# 1. ┘à╪▒╪º┘é╪¿╪⌐ ╪º┘ä╪░╪º┘â╪▒╪⌐ ┘â┘ä 30 ╪½╪º┘å┘è╪⌐
watch -n 30 'node -e "console.log(JSON.stringify(process.memoryUsage()))"'

# 2. ╪╣╪»╪» ╪º┘ä╪¼┘ä╪│╪º╪¬ ╪º┘ä┘å╪┤╪╖╪⌐
grep "≡ƒôè \[WA-METRICS\]" /var/log/maxp/backend.log | tail -5

# 3. ╪▓┘à┘å Batch
grep "\[SYNC-QUEUE\] Batch took" /var/log/maxp/backend.log | tail -5

# 4. PM2 status
pm2 list
pm2 show maxp-backend | grep -E "memory|restarts|status"

# 5. BullMQ queue length
redis-cli LLEN bull:sync-orders:wait
redis-cli LLEN bull:sync-orders:active

# 6. Stuck PROCESSING items
psql -d maxp -c "SELECT COUNT(*) FROM \"OrderSyncQueue\" WHERE status = 'PROCESSING' AND \"updatedAt\" < NOW() - INTERVAL '30 minutes';"
```

### 9.3 ╪Ñ╪╣╪»╪º╪» ╪º┘ä╪¬┘å╪¿┘è┘ç╪º╪¬ (Alerts)

```bash
# ╪¬┘å╪¿┘è┘ç PM2 ΓÇö ┘ä┘ê ╪º┘ä╪«╪»┘à╪⌐ ╪º┘å╪╖┘ü╪ú╪¬
# ╪º╪│╪¬╪«╪»┘à pm2-pm3-webhook ╪ú┘ê ╪ú┘è monitoring service

# ╪¬┘å╪¿┘è┘ç RSS ΓÇö ┘ä┘ê ╪¬╪¼╪º┘ê╪▓ 3GB
node -e "
const mem = process.memoryUsage();
if (mem.rss > 3 * 1024 * 1024 * 1024) {
    console.log('≡ƒÜ¿ RSS exceeded 3GB, restarting...');
    process.exit(1);  // PM2 ╪│┘è╪╣┘è╪» ╪º┘ä╪¬╪┤╪║┘è┘ä
}
"
```

---

## 10. ╪«╪╖╪╖ ╪º┘ä╪¬╪▒╪º╪¼╪╣ (Rollback)

### 10.1 Rollback ╪º┘ä╪«╪╖╪⌐ ╪º┘ä┘â╪º┘à┘ä╪⌐

```bash
# ╪º┘ä╪¬╪▒╪º╪¼╪╣ ╪╣┘å ┘â┘ä ╪º┘ä╪¬╪║┘è┘è╪▒╪º╪¬ ╪»┘ü╪╣╪⌐ ┘ê╪º╪¡╪»╪⌐:
git stash  # ┘è╪¡┘ü╪╕ ╪º┘ä╪¬╪║┘è┘è╪▒╪º╪¬ ╪º┘ä╪¡╪º┘ä┘è╪⌐
git pull origin main  # ┘è╪╣┘ê╪» ┘ä╪ó╪«╪▒ commit ┘à╪│╪¬┘é╪▒
pm2 restart maxp-backend --update-env

# ╪ú┘ê ╪º┘ä╪¬╪▒╪º╪¼╪╣ ╪╣┘å ╪¬╪║┘è┘è╪▒ ┘à╪╣┘è┘å:
git checkout -- apps/backend/services/whatsapp/WhatsAppManager.js
pm2 restart maxp-backend
```

### 10.2 ┘à╪¬┘ë ┘å╪¬╪▒╪º╪¼╪╣╪ƒ

- **┘ü┘ê╪▒╪º┘ï**: ┘ä┘ê 5% ┘à┘å ╪▒╪│╪º╪ª┘ä ┘ê╪º╪¬╪│╪º╪¿ ┘ä┘à ╪¬╪╡┘ä ╪«┘ä╪º┘ä 10 ╪»┘é╪º╪ª┘é
- **┘ü┘ê╪▒╪º┘ï**: ┘ä┘ê ╪ú┘è ╪┤╪▒┘â╪⌐ ╪¬╪▒┘ë ╪¿┘è╪º┘å╪º╪¬ ╪┤╪▒┘â╪⌐ ╪ú╪«╪▒┘ë
- **╪«┘ä╪º┘ä ╪│╪º╪╣╪⌐**: ┘ä┘ê RSS ┘ä┘à ┘è┘å╪«┘ü╪╢ ╪¿╪╣╪» 24 ╪│╪º╪╣╪⌐ ┘à┘å ╪º┘ä┘à╪▒╪¡┘ä╪⌐ 1
- **╪«┘ä╪º┘ä ┘è┘ê┘à**: ┘ä┘ê BullMQ ┘ü╪┤┘ä ┘ê fallback ┘ä┘à ┘è╪┤╪¬╪║┘ä

### 10.3 ┘é╪º╪ª┘à╪⌐ ╪º┘ä╪¬╪¡┘é┘é ┘é╪¿┘ä ╪º┘ä┘Ç Rollback

- [ ] ┘ç┘ä ╪¬┘ê┘é┘ü╪¬ ╪º┘ä╪«╪»┘à╪⌐ ╪¿╪º┘ä┘â╪º┘à┘ä╪ƒ ΓåÆ `pm2 restart`
- [ ] ┘ç┘ä ╪º┘ä┘à╪┤┘â┘ä╪⌐ ┘ü┘è ╪º╪¬╪╡╪º┘ä ┘ê╪º╪¬╪│╪º╪¿ ┘ü┘é╪╖╪ƒ ΓåÆ `git checkout WhatsAppManager.js`
- [ ] ┘ç┘ä ╪º┘ä┘à╪┤┘â┘ä╪⌐ ┘ü┘è ╪º┘ä┘Ç Queue╪ƒ ΓåÆ `git checkout syncQueueService.js + server.js`
- [ ] ┘ç┘ä ╪º┘ä┘à╪┤┘â┘ä╪⌐ ┘ü┘è ┘é╪º╪╣╪»╪⌐ ╪º┘ä╪¿┘è╪º┘å╪º╪¬╪ƒ ΓåÆ `git checkout sharedDatabase.js`

---

## 11. ╪º┘ä┘à╪▒╪º╪¼╪╣

### 11.1 ╪º┘ä┘à┘ä┘ü╪º╪¬ ╪º┘ä┘à╪¬╪ú╪½╪▒╪⌐

| ╪º┘ä┘à┘ä┘ü | ╪º┘ä╪¬╪║┘è┘è╪▒ |
|-------|---------|
| `apps/backend/server.js` | ╪Ñ╪╢╪º┘ü╪⌐ heap snapshot + ╪Ñ╪▓╪º┘ä╪⌐ setInterval + ╪Ñ╪╢╪º┘ü╪⌐ RLS middleware |
| `apps/backend/services/whatsapp/WhatsAppManager.js` | ╪Ñ╪╡┘ä╪º╪¡ catch + ╪Ñ╪╢╪º┘ü╪⌐ flushSessionKeys |
| `apps/backend/services/syncQueueService.js` | ╪Ñ╪╣╪º╪»╪⌐ ┘â╪¬╪º╪¿╪⌐ ┘â╪º┘à┘ä╪⌐ ╪¿┘Ç BullMQ |
| `apps/backend/services/sharedDatabase.js` | ╪¬┘é┘ä┘è┘ä transaction timeout + ╪Ñ╪▓╪º┘ä╪⌐ $extends |
| `apps/backend/services/facebookDebounceService.js` | ╪Ñ╪╢╪º┘ü╪⌐ flushSessionKeys |
| `apps/backend/services/whatsapp/DatabaseAuthState.js` | ┘ä╪º ╪¬╪║┘è┘è╪▒ (╪ú┘ê ╪¬┘é┘ä┘è┘ä AUTH_CACHE_TTL ╪Ñ┘ä┘ë 30 ╪»┘é┘è┘é╪⌐) |
| `apps/backend/services/memoryPressureMonitorService.js` | ┘ä╪º ╪¬╪║┘è┘è╪▒ |
| `ecosystem.config.js` | ╪Ñ╪╢╪º┘ü╪⌐ max_memory_restart |
| `apps/backend/workers/whatsappSessionWorker.js` | **┘à┘ä┘ü ╪¼╪»┘è╪»** |
| `apps/backend/services/whatsapp/BaileysWorkerPool.js` | **┘à┘ä┘ü ╪¼╪»┘è╪»** |

### 11.2 ╪º┘ä┘ê╪½╪º╪ª┘é ╪░╪º╪¬ ╪º┘ä╪╡┘ä╪⌐

- `docs/notifications/whatsapp-order-notifications-fix-plan-2026-08-03.md` ΓÇö **╪╖╪º╪¿┘ê╪▒ ┘à╪«╪¬┘ä┘ü**: ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ┘ê╪º╪¬╪│╪º╪¿ ┘ä┘ä╪╖┘ä╪¿╪º╪¬ (`WhatsAppNotificationQueue`). ┘ä╪º ┘è╪«┘ä╪╖ ┘à╪╣ ┘ç╪░┘ç ╪º┘ä╪«╪╖╪⌐.
- `docs/infrastructure/production-memory-restart-2026-05-09.md` ΓÇö ╪¬╪º╪▒┘è╪«┘è ┘ä┘à╪┤╪º┘â┘ä ╪º┘ä╪░╪º┘â╪▒╪⌐ ╪º┘ä╪│╪º╪¿┘é╪⌐
- `docs/infrastructure/bugs.md` ΓÇö ╪│╪¼┘ä ╪º┘ä╪ú╪«╪╖╪º╪í
- `docs/whatsapp/whatsapp-session-connection-overhaul-2026-06-01.md` ΓÇö ╪Ñ╪╣╪º╪»╪⌐ ┘ç┘è┘â┘ä╪⌐ ╪¼┘ä╪│╪º╪¬ ┘ê╪º╪¬╪│╪º╪¿ ╪º┘ä╪│╪º╪¿┘é╪⌐
- `docs/whatsapp/bugs.md` ΓÇö ╪ú╪«╪╖╪º╪í ┘ê╪º╪¬╪│╪º╪¿

### 11.3 ╪º┘ä╪¡╪▓┘à ╪º┘ä╪«╪º╪▒╪¼┘è╪⌐

| ╪º┘ä╪¡╪▓┘à╪⌐ | ╪º┘ä╪»┘ê╪▒ | ╪º┘ä╪Ñ╪╡╪»╪º╪▒ ╪º┘ä┘à╪│╪¬╪«╪»┘à |
|--------|-------|-----------------|
| `@whiskeysockets/baileys` | ╪º╪¬╪╡╪º┘ä ┘ê╪º╪¬╪│╪º╪¿ WebSocket | ╪ú╪¡╪»╪½ |
| `@prisma/client` | ORM | 6.x |
| `bullmq` | Job queue | v5+ |
| `sharp` | ┘à╪╣╪º┘ä╪¼╪⌐ ╪º┘ä╪╡┘ê╪▒ | ╪ú╪¡╪»╪½ |

### 11.4 ┘à┘ä╪º╪¡╪╕╪º╪¬ ╪Ñ╪╢╪º┘ü┘è╪⌐

1. **╪¬╪▒╪¬┘è╪¿ ╪º┘ä╪¬╪╖╪¿┘è┘é ┘à┘ç┘à**: ┘ä╪º ╪¬┘å╪¬┘é┘ä ┘ä┘ä┘à╪▒╪¡┘ä╪⌐ 3 ┘é╪¿┘ä ╪Ñ┘â┘à╪º┘ä ╪º┘ä┘à╪▒╪¡┘ä╪⌐ 1 ┘ê2 ΓÇö ┘ä╪ú┘å Worker threads ╪¬╪╣┘é╪» ╪º┘ä┘Ç debugging ╪¿╪┤┘â┘ä ┘â╪¿┘è╪▒ ┘ä┘ê ┘ü┘è ┘à╪┤╪º┘â┘ä ╪ú╪│╪º╪│┘è╪⌐
2. **╪¬╪│╪¼┘è┘ä ┘â┘ä ╪¬╪║┘è┘è╪▒**: ┘ä┘â┘ä ╪¬╪║┘è┘è╪▒ ┘ü┘è ╪º┘ä┘Ç code╪î ╪ú╪╢┘ü ╪¬╪╣┘ä┘è┘é `// ≡ƒÜÇ PRODUCTION-FIX:` ╪ú┘ê `// ≡ƒÅù∩╕Å PRODUCTION-ARCH:` ┘ä╪¬╪│┘ç┘è┘ä ╪¬╪¬╪¿╪╣ ╪º┘ä╪¬╪║┘è┘è╪▒╪º╪¬
3. **┘à╪┤╪º╪▒┘â╪⌐ ╪º┘ä┘ü╪▒┘è┘é**: ┘ç╪░╪º ╪º┘ä┘à╪│╪¬┘å╪» ┘à╪▒╪¼╪╣ ┘ä╪¼┘à┘è╪╣ ╪º┘ä┘à╪╖┘ê╪▒┘è┘å ΓÇö ╪ú┘è ╪¬╪║┘è┘è╪▒ ┘à╪¬╪╣┘ä┘é ╪¿╪º┘ä╪░╪º┘â╪▒╪⌐ ╪ú┘ê ╪º┘ä┘Ç Queue ┘è╪¼╪¿ ╪ú┘å ┘è┘Å┘ê╪½┘æ┘é ┘ç┘å╪º

---


## ╪º┘ä┘à┘ä╪¡┘é ╪ú: ┘â┘ê╪» ╪º┘ä╪Ñ╪╡┘ä╪º╪¡ ╪º┘ä┘â╪º┘à┘ä (╪º┘ä╪¬╪║┘è┘è╪▒╪º╪¬ ╪º┘ä┘à╪╖╪¿┘é╪⌐ ┘ü╪╣┘ä┘è╪º┘ï)

### ╪ú.1 ╪Ñ╪╡┘ä╪º╪¡ createSession ΓÇö WhatsAppManager.js

**╪º┘ä┘à┘ä┘ü**: pps/backend/services/whatsapp/WhatsAppManager.js

**╪º┘ä╪¬╪║┘è┘è╪▒ 1** ΓÇö ╪Ñ╪╢╪º┘ü╪⌐ let sock = null ╪«╪º╪▒╪¼ ╪º┘ä┘Ç try block (╪º┘ä╪│╪╖╪▒ 1094):
\\\js
async function createSession(sessionId, companyId, options = {}) {
    let sock = null;
    try {
\\\

**╪º┘ä╪¬╪║┘è┘è╪▒ 2** ΓÇö ╪Ñ╪▓╪º┘ä╪⌐ const ┘à┘å makeWASocket (╪º┘ä╪│╪╖╪▒ 1192):
\\\js
        // ╪Ñ┘å╪┤╪º╪í Socket
        sock = makeWASocket(socketOptions);
\\\

**╪º┘ä╪¬╪║┘è┘è╪▒ 3** ΓÇö ╪Ñ╪╢╪º┘ü╪⌐ cleanup ┘â╪º┘à┘ä ┘ü┘è catch block (╪º┘ä╪│╪╖┘ê╪▒ 1348-1369):
\\\js
    } catch (error) {
        console.error("Γ¥î Error creating session " + sessionId + ":", error);

        // Clean up partial session state to prevent memory leak
        try {
            activeSessions.delete(sessionId);
            if (sock) {
                cleanupSocketListeners(sock);
                await endSocketQuietly(sock, 'Session creation failed');
            }
        } catch (cleanupErr) {
            console.warn("ΓÜá∩╕Å [WA] Cleanup error:", cleanupErr.message);
        }
        cleanupSessionState(sessionId, companyId);
        if (options?.resetAuth) {
            try { await clearDatabaseAuthState(sessionId); } catch {}
        }
        throw error;
    }
}
\\\

### ╪ú.2 ╪Ñ╪╡┘ä╪º╪¡ facebookDebounceService

**╪º┘ä┘à┘ä┘ü**: pps/backend/services/facebookDebounceService.js

╪ú╪╢┘ü ╪»╪º┘ä╪⌐:
\\\js
function flushSessionKeys(sessionId) {
    const prefix = ":" + sessionId + ":";
    for (const [key, timer] of buckets) {
        if (key.includes(prefix)) {
            clearTimeout(timer);
            buckets.delete(key);
        }
    }
}
\\\

╪½┘à ╪ú╪╢┘ü┘ç╪º ┘ü┘è module.exports.

### ╪ú.3 ╪Ñ╪╡┘ä╪º╪¡ sharedDatabase.js ΓÇö ╪¬┘é┘ä┘è┘ä Transaction Timeout

\\\js
const INTERACTIVE_TRANSACTION_TIMEOUT = 5000;   // ┘â╪º┘å 30000
const INTERACTIVE_TRANSACTION_MAX_WAIT = 3000;  // ┘â╪º┘å 10000
\\\

### ╪ú.4 ╪Ñ╪╢╪º┘ü╪⌐ Stuck Processing Recovery ΓÇö syncQueueService.js

┘ü┘è ╪¿╪»╪º┘è╪⌐ processBatch:
\\\js
await this.prisma.orderSyncQueue.updateMany({
    where: {
        status: 'PROCESSING',
        updatedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) }
    },
    data: {
        status: 'PENDING',
        lastError: 'Released from stale PROCESSING state',
        nextRetryAt: new Date()
    }
});
\\\

---

## ╪º┘ä┘à┘ä╪¡┘é ╪¿: ┘é╪º╪ª┘à╪⌐ ╪º┘ä╪¬╪¡┘é┘é ┘é╪¿┘ä ╪º┘ä┘å╪┤╪▒ ┘ä┘ä╪Ñ┘å╪¬╪º╪¼

- [ ] ╪¬┘à ╪º╪«╪¬╪¿╪º╪▒ ╪º┘ä╪¬╪║┘è┘è╪▒╪º╪¬ ╪╣┘ä┘ë Staging
- [ ] PM2 max_memory_restart ┘à╪╢╪¿┘ê╪╖
- [ ] heap snapshot signal ┘à╪╢╪º┘ü
- [ ] BullMQ worker ┘è╪┤╪¬╪║┘ä ┘à╪╣ fallback
- [ ] ┘â┘ä ╪¼┘ä╪│╪º╪¬ ┘ê╪º╪¬╪│╪º╪¿ ╪┤╪║╪º┘ä╪⌐ ╪¿╪╣╪» ╪Ñ╪╣╪º╪»╪⌐ ╪º┘ä╪¬╪┤╪║┘è┘ä
- [ ] Logs ┘ä╪º ╪¬╪╕┘ç╪▒ "Already processing"
- [ ] RSS ╪ú┘é┘ä ┘à┘å 4GB ╪¿╪╣╪» 24 ╪│╪º╪╣╪⌐
- [ ] ┘ä╪º ╪¬┘ê╪¼╪» Stuck PROCESSING items ┘ü┘è ┘é╪º╪╣╪»╪⌐ ╪º┘ä╪¿┘è╪º┘å╪º╪¬

---

*┘ç╪░╪º ╪º┘ä┘à╪│╪¬┘å╪» ┘ç┘ê ╪º┘ä┘à╪▒╪¼╪╣ ╪º┘ä╪▒╪│┘à┘è ┘ä╪Ñ╪╡┘ä╪º╪¡ ┘à╪┤╪º┘â┘ä ╪º┘ä╪ú╪»╪º╪í ┘ê╪º┘ä╪░╪º┘â╪▒╪⌐. ┘è╪¼╪¿ ╪¬╪¡╪»┘è╪½┘ç ┘à╪╣ ┘â┘ä ╪¬╪║┘è┘è╪▒.*
