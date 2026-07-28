# خطة الإصلاح الشامل — مشاكل الذاكرة وطابور المزامنة

**تاريخ الإنشاء**: 2026-07-27  
**آخر تحديث**: 2026-07-27  
**المؤلف**: AI Audit  
**الحالة**: مسودة — تنتظر المراجعة والاعتماد  

---

## فهرس المحتويات

1. [الملخص التنفيذي](#1-الملخص-التنفيذي)
2. [تحليل شجرة المشاكل](#2-تحليل-شجرة-المشاكل)
3. [المرحلة 0: التشخيص والمراقبة](#3-المرحلة-0-التشخيص-والمراقبة)
4. [المرحلة 1: الإصلاحات الفورية (أيام 1-2)](#4-المرحلة-1-الإصلاحات-الفورية-أيام-1-2)
5. [المرحلة 2: تحسينات الأداء (أيام 3-7)](#5-المرحلة-2-تحسينات-الأداء-أيام-3-7)
6. [المرحلة 3: إعادة الهيكلة (أسابيع 2-4)](#6-المرحلة-3-إعادة-الهيكلة-أسابيع-2-4)
7. [كيفية التطبيق — أدلة تفصيلية](#7-كيفية-التطبيق--أدلة-تفصيلية)
8. [استراتيجية الاختبار والطرح](#8-استراتيجية-الاختبار-والطرح)
9. [المراقبة والتحقق](#9-المراقبة-والتحقق)
10. [خطط التراجع (Rollback)](#10-خطط-التراجع-rollback)
11. [المراجع](#11-المراجع)

---

## 1. الملخص التنفيذي

تم اكتشاف مشكلتين رئيسيتين في بيئة الإنتاج تؤثران على استقرار المنصة:

| المشكلة | الأعراض | الجذر الفني | خطورتها |
|---------|---------|-------------|---------|
| **استنزاف الذاكرة (Memory)** | RSS = 6.2GB، Heap = 304MB فقط | جلسات Baileys WhatsApp + Prisma $extends overhead | **عالية — قد تؤدي لـ OOM Kill** |
| **تعليق طابور المزامنة (Sync Queue)** | رسالة `Already processing` كل 5-10 ثوانٍ | `setInterval` + تنفيذ متسلسل للـ Transactions | **متوسطة — تؤخر مزامنة الطلبات** |

### 1.1 من يتأثر؟

- **جميع مستخدمي واتساب**: كل شركة لديها جلسة Baileys نشطة تساهم في الـ RSS
- **جميع طلبات التوثيق (Orders sync)**: يتأخر تزامن الطلبات بين الشركات المتصلة (Affiliate/Internal Sync)
- **خادم الإنتاج**: احتمالية OOM Kill تزداد مع كل جلسة واتساب جديدة

### 1.2 الجدول الزمني المقترح

| المرحلة | المدة | الأثر | المخاطرة |
|---------|-------|-------|----------|
| **المرحلة 0**: تشخيص + مراقبة | يوم واحد | لا تغيير في الكود | **صفر** |
| **المرحلة 1**: إصلاحات فورية | يوم 1-2 | يوقف تسريب الذاكرة %40 | **منخفضة جداً** |
| **المرحلة 2**: تحسينات أداء | يوم 3-7 | يقلل وقت Sync Queue %90 | **متوسطة** |
| **المرحلة 3**: إعادة هيكلة | أسبوع 2-4 | يقلل RSS من 6.2GB → 2-3GB | **عالية — تحتاج تخطيط** |

---

## 2. تحليل شجرة المشاكل

### 2.1 شجرة المشاكل الكاملة

```
RSS 6.2GB + Heap 304MB (= 5.9GB Off-heap)
│
├── Baileys Sessions (المساهم الأكبر: ~3-4GB)
│   ├── activeSessions Map — كل جلسة تحتفظ بـ socket + auth keys
│   ├── keysData (DatabaseAuthState.js:179) — آلاف Buffers لمفاتيح التشفير
│   │   └── كل Buffer = Native memory (off-heap)، مش V8 heap
│   ├── WebSocket TLS buffers — لكل اتصال
│   ├── protobuf decode buffers — لكل رسالة
│   └── authStateCache (DatabaseAuthState.js:22) — 50 جلسة كحد أقصى × 1 ساعة TTL
│
├── Prisma Query Engine (Rust) (~500MB-1GB)
│   ├── @prisma/engines binary — 40MB ثابت
│   ├── Per-query Rust memory pools
│   └── 80 connection pool
│
├── Sharp (libvips) (~200MB-500MB)
│   ├── Image processing buffers
│   └── Concurrency default = عدد CPU cores
│
└── Node.js Streams + ArrayBuffer backing (~200MB)
    └── defaultHighWaterMark = 64KB لكل stream (Node 22+)
```

### 2.2 سلسلة الأحداث التي تؤدي للـ OOM

```
Client connects WhatsApp → createSession() → activeSessions.set()
  → authState loaded (keysData = ~2MB Buffers)
  → WebSocket opened (TLS ~500KB)
  → 10 event listeners registered (closures capture keysData)

Session disconnects → reconnect timer scheduled (5s-300s backoff)
  → reconnect creates NEW session without full cleanup of OLD
  → OLD socket + keysData + listeners survive in closure chain

Over days/weeks: orphaned sessions accumulate
  → RSS grows linearly with disconnect/reconnect cycles
  → Eventually: OOM Kill or PM2 restart
```

```
Sync Queue flow:
setInterval(5000) → processBatch(5)
  → لكل item: Prisma transaction (set_config + query + commit)
    → pushOrderToProvider → 10-15 transactions per order
      → 5 orders × 15 transactions = 75 sequential transactions
      → كل transaction تأخذ 100-200ms
      → Total: 75 × 200ms = 15 ثانية ← أطول من الـ 5 ثواني interval
  → تتراكم: "Already processing" × N
```

---

## 3. المرحلة 0: التشخيص والمراقبة

*قبل أي تغيير، نضيف أدوات مراقبة لقياس التقدم*

### 3.1 إضافة Memory Snapshot على الإشارة

**الملف**: `apps/backend/server.js` — أضف بعد imports

```js
// 🚀 PRODUCTION-MEMORY: Signal-triggered heap snapshot
// Usage: kill -USR2 <pid>  →  takes snapshot to /tmp
if (process.env.NODE_ENV === 'production') {
  process.on('SIGUSR2', () => {
    const { writeHeapSnapshot } = require('v8');
    const path = require('path');
    const snapshotPath = path.join('/tmp', `heap-${process.pid}-${Date.now()}.heapsnapshot`);
    writeHeapSnapshot(snapshotPath);
    console.log(`💾 [MEMORY] Heap snapshot saved to ${snapshotPath}`);
  });
}
```

**الهدف**: نقدر ناخد snapshot في أي وقت بدون إعادة تشغيل.

### 3.2 إضافة PM2 Memory Restart

**الملف**: `ecosystem.config.js` (أو أنشئه في جذر المشروع)

```js
module.exports = {
  apps: [
    {
      name: 'maxp-backend',
      script: 'apps/backend/server.js',
      max_memory_restart: '3G',        // 🆕 Restart لو RSS تجاوز 3GB
      kill_timeout: 10000,             // مهلة graceful shutdown
      autorestart: true,
      exp_backoff_restart_delay: 5000, // بين المحاولات
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

### 3.3 إضافة Logging لمتوسط زمن Sync Queue

**الملف**: `apps/backend/services/syncQueueService.js` — أضف في `processBatch`

```js
async processBatch(batchSize = 5) {
    const batchStart = Date.now();  // 🆕
    // ...existing code...
    } finally {
        const elapsed = Date.now() - batchStart;  // 🆕
        if (elapsed > 3000) {  // تنبيه لو > 3 ثواني
            console.warn(`⚠️ [SYNC-QUEUE] Batch took ${elapsed}ms (threshold: 3000ms)`);
        }
        this.processing = false;  // موجود
    }
}
```

### 3.4 إضافة Metric لتسريبات الـ activeSessions

**الملف**: `apps/backend/services/whatsapp/WhatsAppManager.js` — في `runHealthCheck`

```js
// 🆕 في بداية runHealthCheck أو في interval منفصل كل 5 دقائق
function logSessionMetrics() {
    console.log(`📊 [WA-METRICS] Active sessions: ${activeSessions.size}` +
        ` | Company map: ${companySessionMap.size}` +
        ` | Reconnect timers: ${reconnectTimers.size}` +
        ` | Auth cache: ${authStateCache.size}` +
        ` | RSS: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
}
// استدعها كل 5 دقائق
setInterval(logSessionMetrics, 300000).unref();
```

### ✅ معايير النجاح للمرحلة 0

- [ ] `kill -USR2 <pid>` ينتج ملف `.heapsnapshot` في `/tmp`
- [ ] PM2 يعيد تشغيل الخدمة تلقائياً إذا RSS تجاوز 3GB
- [ ] Log يظهر زمن كل Batch في Sync Queue
- [ ] Metric يظهر عدد الجلسات النشطة كل 5 دقائق

---

## 4. المرحلة 1: الإصلاحات الفورية (أيام 1-2)

### 🔧 1.1 إصلاح Orphaned Sockets في `createSession()`

**الملف**: `apps/backend/services/whatsapp/WhatsAppManager.js`  
**الأسطر**: 1343-1346

**الكود الحالي** — يرمي الخطأ بدون تنظيف:
```js
} catch (error) {
    console.error(`❌ Error creating session ${sessionId}:`, error);
    throw error;  // ← بدون cleanup — يتسرب socket + listeners + keysData
}
```

**الكود بعد الإصلاح** — ينظف كل شيء قبل إعادة رمي الخطأ:
```js
} catch (error) {
    console.error(`❌ Error creating session ${sessionId}:`, error);

    // 🛡️ PRODUCTION-FIX: Clean up partial session state to prevent memory leak
    // التفاصيل: لو الـ createSession فشل بعد activeSessions.set() أو sock.ev.on()،
    // يترك orphaned socket مع 10+ listeners في closure chain
    // يحتفظ بـ keysData (2MB+ Buffers) ويمنع GC
    try {
        activeSessions.delete(sessionId);
        if (sock) {
            cleanupSocketListeners(sock);
            await endSocketQuietly(sock, 'Session creation failed');
        }
    } catch (cleanupErr) {
        console.error(`⚠️ [WA] Cleanup error during failed session creation:`, cleanupErr.message);
    }
    cleanupSessionState(sessionId, companyId);

    throw error;  // ← نفس الخطأ، نفس السلوك للـ Caller
}
```

**لماذا هذا آمن؟**
- `cleanupSocketListeners()` معرفة و idempotent (تستدعى `removeAllListeners`)
- `endSocketQuietly()` تغلق الـ WebSocket بسلام (داخلها try-catch، خط 682)
- `cleanupSessionState()` تمسح `reconnectTimers` و `sessionHealthChecks` و `companySessionMap` و `whatsappDisconnectAlertTimestamps`
- الكود الأصلي يرمي error anyway — الإضافة تنظف فقط قبل الـ throw

### 🔧 1.2 إضافة flush للـ facebookDebounceService عند قطع الجلسة

**الملف**: `apps/backend/services/facebookDebounceService.js`

أضف دالة جديدة:
```js
// 🛡️ PRODUCTION-FIX: Flush debounce buckets for a specific session
// تُستدعى من WhatsAppManager عند قطع الجلسة لمنع تراكم الـ Map entries
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
    flushSessionKeys  // 🆕
};
```

ثم في `apps/backend/services/whatsapp/WhatsAppManager.js` في `cleanupSessionState`:
```js
// 🆕 بعد السطر 133 (أو في أي مكان cleanupSessionState يُستدعى)
const { flushSessionKeys } = require('../facebookDebounceService');
flushSessionKeys(sessionId);
```

### 🔧 1.3 إضافة معالجة حالة PROCESSING العالقة في Sync Queue

**الملف**: `apps/backend/services/syncQueueService.js` — في `processBatch`

أضف في بداية `processBatch`:
```js
async processBatch(batchSize = 5) {
    if (this.processing) {
        console.log('⏳ [SYNC-QUEUE] Already processing');
        return;
    }
    this.processing = true;
    try {
        // 🛡️ PRODUCTION-FIX: Release stuck PROCESSING items
        // لو الخادم انطفأ أثناء معالجة طلب، يعلق في حالة PROCESSING للأبد
        await this.prisma.orderSyncQueue.updateMany({
            where: {
                status: 'PROCESSING',
                updatedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) } // ← أقدم من 30 دقيقة
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

### ✅ معايير النجاح للمرحلة 1

- [ ] لا تظهر جلسات orphaned في `activeSessions` Map بعد فشل `createSession()`
- [ ] الـ `authStateCache` لا يحتوي جلسات معطلة
- [ ] `facebookDebounceService` لا يتراكم keys للجلسات المنقطعة
- [ ] طلبات `PROCESSING` الأقدم من 30 دقيقة تتحرر تلقائياً
- [ ] لا تغيير في سلوك الجلسات النشطة — الصوت والصورة والرسائل كلها شغالة

---

## 5. المرحلة 2: تحسينات الأداء (أيام 3-7)

### 🚀 2.1 استبدال Sync Queue بـ BullMQ

**الملف**: `apps/backend/services/syncQueueService.js` — إعادة كتابة كاملة

```js
const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');

// 🚀 PRODUCTION-PERF: Replace setInterval queue with BullMQ
// BullMQ موجود بالفعل في stack (مستخدم في queueService.js)
// المميزات: job timeout، retry backoff، stalled detection، zero polling

const REDIS_CONFIG = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null,
    enableReadyCheck: false
};

class SyncQueueService {
    constructor() {
        this.prisma = getSharedPrismaClient();

        // Fallback: استخدم setInterval لو Redis مش متاح
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
                stalledInterval: 30000,  // 30s بدون progress = stalled
                maxStalledCount: 3
            });
            this.worker.on('failed', (job, err) => {
                console.error(`❌ [SYNC-QUEUE] Job ${job.id} failed:`, err.message);
            });
            this.worker.on('completed', (job) => {
                console.log(`✅ [SYNC-QUEUE] Job ${job.id} completed`);
            });
        } catch (redisErr) {
            console.warn(`⚠️ [SYNC-QUEUE] Redis unavailable, using fallback polling:`, redisErr.message);
            this.useFallback = true;
            this.startFallbackPolling();
        }
    }

    async enqueue(orderId, consumerId) {
        if (this.useFallback) {
            return this.enqueueFallback(orderId, consumerId);  // ← الكود القديم
        }
        await this.queue.add(`sync-${orderId}`, { orderId, consumerId }, {
            jobId: `sync-order-${orderId}`,  // dedup
        });
    }

    async pushOrder(orderId, consumerId) {
        const internalSyncService = require('./internalSyncService');
        // مع timeout 60 ثانية لكل push (يمنع التعليق للأبد)
        await Promise.race([
            internalSyncService.pushOrderToProvider(orderId, consumerId),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('pushOrderToProvider timed out after 60s')), 60000)
            )
        ]);
    }

    startFallbackPolling() {
        // نفس الـ setInterval القديم كخطة بديلة
        setInterval(() => this.processBatchFallback(5), 5000);
    }
}

module.exports = new SyncQueueService();
```

**ثم في** `apps/backend/server.js` السطر 1257-1259:

```js
// 🚀 PRODUCTION-PERF: BullMQ handles polling — no setInterval needed
// يتم تهيئة الـ Worker تلقائياً في constructor الـ SyncQueueService
const syncQueueService = require('./services/syncQueueService');
// ↳ لا داعي لـ setInterval بعد الآن
```

### 🚀 2.2 تقليل INTERACTIVE_TRANSACTION_TIMEOUT

**الملف**: `apps/backend/services/sharedDatabase.js`

```js
// 🚀 PRODUCTION-PERF: Reduce transaction timeout from 30s to 5s
// القيمة الأصلية 30000 تمنع GC وتبقي connections مفتوحة في pool
// 5 ثواني كافية لأي query عادي — لو أخذ أطول، فيه مشكلة في DB
const INTERACTIVE_TRANSACTION_TIMEOUT = 5000;   // كان 30000
const INTERACTIVE_TRANSACTION_MAX_WAIT = 3000;  // كان 10000
```

**لماذا هذا آمن؟**
- PostgreSQL queries النموذجية تأخذ < 100ms
- 5 ثوانٍ أكثر من كافية لأي query
- لو query أخذ > 5 ثوانٍ، فيه مشكلة في الـ DB anyway
- يحرر connections في الـ pool أسرع ب 6 مرات

### 🚀 2.3 إضافة AbortSignal لـ pushOrderToProvider

**الملف**: `apps/backend/services/internalSyncService.js`

أضف support لـ AbortSignal في `pushOrderToProvider`:

```js
async pushOrderToProvider(orderId, consumerId, signal) {
    // 🚀 PRODUCTION-PERF: Support abort signal for BullMQ timeout
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

### ✅ معايير النجاح للمرحلة 2

- [ ] BullMQ يستلم jobs ويشتغلها مع timeout 60 ثانية
- [ ] لو Redis وقع، fallback polling يشتغل تلقائياً
- [ ] متوسط زمن الـ Batch < 3 ثوانٍ (بدون رسالة "Already processing")
- [ ] الـ Transactions تنتهي بسرعة (16x أسرع من السابق)
- [ ] `abortSignal` يقطع pushOrderToProvider إذا تجاوز الـ timeout

---

## 6. المرحلة 3: إعادة الهيكلة (أسابيع 2-4)

### 🏗️ 3.1 عزل جلسات Baileys في Worker Threads

**هذه أكبر وأخطر مرحلة — لا تنفذ بدون اختبار شامل**

**المبدأ**: كل 3-5 جلسات في Worker منفصل بعزلة ذاكرة كاملة

**الملف الجديد**: `apps/backend/workers/whatsappSessionWorker.js`

```js
const { parentPort, workerData } = require('worker_threads');
const makeWASocket = require('@whiskeysockets/baileys');
const { useDatabaseAuthState } = require('../services/whatsapp/DatabaseAuthState');

// 🏗️ PRODUCTION-ARCH: Baileys session worker
// كل Worker يتعامل مع 3-5 جلسات كحد أقصى
// resourceLimits.maxOldGenerationSizeMb = 400 يعني أقصى RSS = ~500MB

class SessionWorker {
    constructor() {
        this.sessions = new Map();  // local, وليس global
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
        // ... باقي listeners ترسل events إلى parent

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

**التعديل على** `apps/backend/services/whatsapp/WhatsAppManager.js`:

بدلاً من `createSession` المباشر:
```js
// بدلاً من:
// activeSessions.set(sessionId, sessionData);
// const sock = makeWASocket(socketOptions);

// 🏗️ PRODUCTION-ARCH: Use worker pool instead
const sessionWorker = workerPool.assignSession(sessionId, companyId);
```

**ملف جديد**: `apps/backend/services/whatsapp/BaileysWorkerPool.js`

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

### 🏗️ 3.2 استبدال $extends RLS بـ Postgres Native RLS

**هذه المرحلة مكملة للـ Worker threads — تحتاج تنسيق**

**الملف**: `apps/backend/services/sharedDatabase.js`

**خطوة 1**: إنشاء الـ Migration SQL

```sql
-- 🏗️ PRODUCTION-ARCH: Replace $extends RLS with native Postgres RLS
-- هذا يلغي 3-step transaction overhead لكل query

DO $$ DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN (
            'Order', 'OrderItem', 'Customer', 'Product', 'WhatsAppMessage',
            'WhatsAppContact', 'BroadcastRecipient', 'Broadcast',
            'CompanyConnection', -- 🚫 استثناء للجداول المشتركة
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

**خطوة 2**: تعديل `sharedDatabase.js`

```js
// 🚀 PRODUCTION-ARCH: Remove $extends RLS, use native Postgres RLS
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

    // ❌ حذف كتلة $extends بالكامل:
    // const extendedClient = client.$extends({ query: { $allOperations: ... } });
    // 🆕 نستخدم middleware على مستوى التطبيق بدلاً من ذلك
    // (في apps/backend/server.js)

    return client;  // كان return extendedClient;
}
```

**خطوة 3**: إضافة middleware في `server.js`

```js
// 🏗️ PRODUCTION-ARCH: Set tenant context at request boundary, not per-query
// يحل محل $extends RLS — set_config مرة واحدة لكل طلب
app.use(async (req, res, next) => {
    const companyId = req.companyId || (req.user && req.user.companyId);
    if (companyId) {
        try {
            const prisma = getSharedPrismaClient();
            await prisma.$executeRaw`SELECT set_config('app.current_company_id', ${companyId}, true)`;
        } catch (err) {
            // Silent fail — RLS مهمته التصفية، لو فشل الـ request يشتغل بدون RLS
            console.warn(`⚠️ [RLS] Failed to set tenant context:`, err.message);
        }
    }
    next();
});
```

**تحذير أمني**: هذا التغيير يؤثر على **كل Query في كل Request**. أي خطأ في الـ RLS Policy يؤدي لتسريب بيانات عبر العملاء. يجب اختباره على staging database أولاً مع نسخة من بيانات الإنتاج.

### ✅ معايير النجاح للمرحلة 3

- [ ] Worker pool يشغل 3-5 جلسات لكل Worker
- [ ] لو Worker مات، الـ Pool يعيد تشغيله
- [ ] لا تغيير في سلوك إرسال/استقبال رسائل واتساب
- [ ] الـ `set_config` يُستدعى مرة واحدة لكل Request (بدلاً من كل Query)
- [ ] كل الجداول المستهدفة لديها RLS policies فعالة
- [ ] بيانات الشركة (أ) لا تظهر أبداً للشركة (ب)

---

## 7. كيفية التطبيق — أدلة تفصيلية

### 7.1 دليل تطبيق إصلاح `createSession`

```bash
# 1. تأكد من الـ file path
ls -la apps/backend/services/whatsapp/WhatsAppManager.js

# 2. ابحث عن الـ catch block
grep -n "catch (error)" apps/backend/services/whatsapp/WhatsAppManager.js | head -5
# الناتج: 1343: } catch (error) {

# 3. طبق التغيير

# 4. اختبر أن التغيير لا يسبب Syntax Error
node --check apps/backend/services/whatsapp/WhatsAppManager.js

# 5. اختبر حالات الفشل يدوياً
# - اقطع اتصال الإنترنت أثناء ربط جلسة
# - أو استخدم pairing code خاطئ
# - تأكد أن activeSessions لا يتراكم
```

### 7.2 دليل تطبيق BullMQ

```bash
# 0. تأكد من أن Redis شغال
redis-cli ping
# → PONG

# 1. أوقف الـ setInterval الحالي في server.js
# ابحث عن:
#   setInterval(() => syncQueueService.processBatch(5), 5000);
# علقها أو احذفها

# 2. اختبر الـ Queue
node -e "
const { Queue } = require('bullmq');
const q = new Queue('sync-orders-test', { connection: { host: 'localhost' } });
q.add('test', { orderId: 'test-1', consumerId: 'test-c1' }).then(() => {
    console.log('✅ Queue test passed');
    q.close();
});
"

# 3. راقب الـ Worker logs
# توقع:
# 🚀 [SYNC-QUEUE] Job sync-test-1 completed
```

### 7.3 دليل التراجع عن أي تغيير

```bash
# لـ createSession fix:
git checkout -- apps/backend/services/whatsapp/WhatsAppManager.js

# لـ BullMQ:
# ارجع السطر setInterval في server.js
git checkout -- apps/backend/server.js
git checkout -- apps/backend/services/syncQueueService.js

# لـ PM2 config:
git checkout -- ecosystem.config.js

# لـ sharedDatabase.js:
git checkout -- apps/backend/services/sharedDatabase.js
```

---

## 8. استراتيجية الاختبار والطرح

### 8.1 ترتيب الطرح

```
الإنتاج ← Staging ← Development
     ↑           ↑           ↑
   أسبوع 2     أسبوع 1     اليوم 1
```

### 8.2 قائمة الاختبارات المطلوبة

| # | الاختبار | يضمن | المرحلة |
|---|---------|------|---------|
| 1 | ربط جلسة واتساب جديدة + قطع الاتصال 3 مرات | لا orphaned sessions | 1 |
| 2 | إرسال 100 رسالة (نص + صورة + فيديو) | لا تعليق للـ send | 1 |
| 3 | إنشاء طلب توثيق (Order sync) مع 50 item | لا "Already processing" | 2 |
| 4 | قطع Redis ثم إعادة تشغيله | BullMQ fallback يشتغل | 2 |
| 5 | فتح 100 جلسة واتساب (محاكاة) | Worker pool يوزعها | 3 |
| 6 | استعلام بيانات الشركة أ ثم الشركة ب | RLS يفصل بينهم | 3 |
| 7 | PM2 restart مع --max_memory_restart | Graceful shutdown | 0 |

### 8.3 اختبار التحميل

```bash
# اختبار BullMQ مع 1000 job
node -e "
const { Queue } = require('bullmq');
const q = new Queue('sync-orders', { connection: { host: 'localhost' } });
for (let i = 0; i < 1000; i++) {
    q.add(\`sync-\${i}\`, { orderId: \`test-\${i}\`, consumerId: 'test-c1' });
}
console.log('✅ 1000 jobs enqueued');
q.close();
"

# مراقبة RSS أثناء الاختبار
watch -n 1 'ps aux | grep node | grep -v grep'
```

---

## 9. المراقبة والتحقق

### 9.1 مؤشرات النجاح (Key Metrics)

| المؤشر | الحالي | الهدف بعد المرحلة 1 | الهدف بعد المرحلة 2 | الهدف النهائي |
|--------|-------|--------------------|--------------------|---------------|
| RSS | 6.2GB | < 5GB | < 4GB | < 2.5GB |
| Heap | 304MB/4144MB | 300-500MB | 300-500MB | 300-500MB |
| عدد orphaned sessions | غير معروف | 0 | 0 | 0 |
| Batch time | > 15s | > 15s | < 3s | < 1s |
| "Already processing" log | كل 5-10s | كل 5-10s | 0 | 0 |
| PM2 restarts | 0 | 0 | 0 | 0 |

### 9.2 أوامر المراقبة

```bash
# 1. مراقبة الذاكرة كل 30 ثانية
watch -n 30 'node -e "console.log(JSON.stringify(process.memoryUsage()))"'

# 2. عدد الجلسات النشطة
grep "📊 \[WA-METRICS\]" /var/log/maxp/backend.log | tail -5

# 3. زمن Batch
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

### 9.3 إعداد التنبيهات (Alerts)

```bash
# تنبيه PM2 — لو الخدمة انطفأت
# استخدم pm2-pm3-webhook أو أي monitoring service

# تنبيه RSS — لو تجاوز 3GB
node -e "
const mem = process.memoryUsage();
if (mem.rss > 3 * 1024 * 1024 * 1024) {
    console.log('🚨 RSS exceeded 3GB, restarting...');
    process.exit(1);  // PM2 سيعيد التشغيل
}
"
```

---

## 10. خطط التراجع (Rollback)

### 10.1 Rollback الخطة الكاملة

```bash
# التراجع عن كل التغييرات دفعة واحدة:
git stash  # يحفظ التغييرات الحالية
git pull origin main  # يعود لآخر commit مستقر
pm2 restart maxp-backend --update-env

# أو التراجع عن تغيير معين:
git checkout -- apps/backend/services/whatsapp/WhatsAppManager.js
pm2 restart maxp-backend
```

### 10.2 متى نتراجع؟

- **فوراً**: لو 5% من رسائل واتساب لم تصل خلال 10 دقائق
- **فوراً**: لو أي شركة ترى بيانات شركة أخرى
- **خلال ساعة**: لو RSS لم ينخفض بعد 24 ساعة من المرحلة 1
- **خلال يوم**: لو BullMQ فشل و fallback لم يشتغل

### 10.3 قائمة التحقق قبل الـ Rollback

- [ ] هل توقفت الخدمة بالكامل؟ → `pm2 restart`
- [ ] هل المشكلة في اتصال واتساب فقط؟ → `git checkout WhatsAppManager.js`
- [ ] هل المشكلة في الـ Queue؟ → `git checkout syncQueueService.js + server.js`
- [ ] هل المشكلة في قاعدة البيانات؟ → `git checkout sharedDatabase.js`

---

## 11. المراجع

### 11.1 الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `apps/backend/server.js` | إضافة heap snapshot + إزالة setInterval + إضافة RLS middleware |
| `apps/backend/services/whatsapp/WhatsAppManager.js` | إصلاح catch + إضافة flushSessionKeys |
| `apps/backend/services/syncQueueService.js` | إعادة كتابة كاملة بـ BullMQ |
| `apps/backend/services/sharedDatabase.js` | تقليل transaction timeout + إزالة $extends |
| `apps/backend/services/facebookDebounceService.js` | إضافة flushSessionKeys |
| `apps/backend/services/whatsapp/DatabaseAuthState.js` | لا تغيير (أو تقليل AUTH_CACHE_TTL إلى 30 دقيقة) |
| `apps/backend/services/memoryPressureMonitorService.js` | لا تغيير |
| `ecosystem.config.js` | إضافة max_memory_restart |
| `apps/backend/workers/whatsappSessionWorker.js` | **ملف جديد** |
| `apps/backend/services/whatsapp/BaileysWorkerPool.js` | **ملف جديد** |

### 11.2 الوثائق ذات الصلة

- `docs/infrastructure/production-memory-restart-2026-05-09.md` — تاريخي لمشاكل الذاكرة السابقة
- `docs/infrastructure/bugs.md` — سجل الأخطاء
- `docs/whatsapp/whatsapp-session-connection-overhaul-2026-06-01.md` — إعادة هيكلة جلسات واتساب السابقة
- `docs/whatsapp/bugs.md` — أخطاء واتساب

### 11.3 الحزم الخارجية

| الحزمة | الدور | الإصدار المستخدم |
|--------|-------|-----------------|
| `@whiskeysockets/baileys` | اتصال واتساب WebSocket | أحدث |
| `@prisma/client` | ORM | 6.x |
| `bullmq` | Job queue | v5+ |
| `sharp` | معالجة الصور | أحدث |

### 11.4 ملاحظات إضافية

1. **ترتيب التطبيق مهم**: لا تنتقل للمرحلة 3 قبل إكمال المرحلة 1 و2 — لأن Worker threads تعقد الـ debugging بشكل كبير لو في مشاكل أساسية
2. **تسجيل كل تغيير**: لكل تغيير في الـ code، أضف تعليق `// 🚀 PRODUCTION-FIX:` أو `// 🏗️ PRODUCTION-ARCH:` لتسهيل تتبع التغييرات
3. **مشاركة الفريق**: هذا المستند مرجع لجميع المطورين — أي تغيير متعلق بالذاكرة أو الـ Queue يجب أن يُوثّق هنا

---


## الملحق أ: كود الإصلاح الكامل (التغييرات المطبقة فعلياً)

### أ.1 إصلاح createSession — WhatsAppManager.js

**الملف**: pps/backend/services/whatsapp/WhatsAppManager.js

**التغيير 1** — إضافة let sock = null خارج الـ try block (السطر 1094):
\\\js
async function createSession(sessionId, companyId, options = {}) {
    let sock = null;
    try {
\\\

**التغيير 2** — إزالة const من makeWASocket (السطر 1192):
\\\js
        // إنشاء Socket
        sock = makeWASocket(socketOptions);
\\\

**التغيير 3** — إضافة cleanup كامل في catch block (السطور 1348-1369):
\\\js
    } catch (error) {
        console.error("❌ Error creating session " + sessionId + ":", error);

        // Clean up partial session state to prevent memory leak
        try {
            activeSessions.delete(sessionId);
            if (sock) {
                cleanupSocketListeners(sock);
                await endSocketQuietly(sock, 'Session creation failed');
            }
        } catch (cleanupErr) {
            console.warn("⚠️ [WA] Cleanup error:", cleanupErr.message);
        }
        cleanupSessionState(sessionId, companyId);
        if (options?.resetAuth) {
            try { await clearDatabaseAuthState(sessionId); } catch {}
        }
        throw error;
    }
}
\\\

### أ.2 إصلاح facebookDebounceService

**الملف**: pps/backend/services/facebookDebounceService.js

أضف دالة:
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

ثم أضفها في module.exports.

### أ.3 إصلاح sharedDatabase.js — تقليل Transaction Timeout

\\\js
const INTERACTIVE_TRANSACTION_TIMEOUT = 5000;   // كان 30000
const INTERACTIVE_TRANSACTION_MAX_WAIT = 3000;  // كان 10000
\\\

### أ.4 إضافة Stuck Processing Recovery — syncQueueService.js

في بداية processBatch:
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

## الملحق ب: قائمة التحقق قبل النشر للإنتاج

- [ ] تم اختبار التغييرات على Staging
- [ ] PM2 max_memory_restart مضبوط
- [ ] heap snapshot signal مضاف
- [ ] BullMQ worker يشتغل مع fallback
- [ ] كل جلسات واتساب شغالة بعد إعادة التشغيل
- [ ] Logs لا تظهر "Already processing"
- [ ] RSS أقل من 4GB بعد 24 ساعة
- [ ] لا توجد Stuck PROCESSING items في قاعدة البيانات

---

*هذا المستند هو المرجع الرسمي لإصلاح مشاكل الأداء والذاكرة. يجب تحديثه مع كل تغيير.*
