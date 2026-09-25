/**
 * 📱 WhatsApp Manager Service
 * إدارة جلسات WhatsApp المتعددة باستخدام Baileys
 * 
 * المميزات:
 * - إدارة جلسات متعددة لكل شركة
 * - حفظ واستعادة الجلسات من قاعدة البيانات
 * - إعادة الاتصال التلقائي
 * - إرسال الأحداث عبر Socket.IO
 */

const databaseAuthState = require('./DatabaseAuthState');
const { useDatabaseAuthState } = databaseAuthState;
const clearDatabaseAuthState = databaseAuthState.clearDatabaseAuthState || (async () => {});
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const path = require('path');
const fs = require('fs').promises;
const { getSharedPrismaClient, safeQuery, executeWithRetry } = require('../sharedDatabase');
const WhatsAppSyncService = require('./WhatsAppSyncService');
const { normalizeWhatsAppContactIdentity } = require('./contactIdentity');
// // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues // ❌ Removed to prevent early loading issues
const socketService = require('../socketService');
const {
    emitToAudience,
    getConversationAudience
} = require('../whatsappRealtimeAudienceService');
const telegramAlertService = require('../telegramAlertService');
const MetaCloudProvider = require('./providers/MetaCloudProvider');
const WhatsAppReactionService = require('./WhatsAppReactionService');
const { buildConversationMetadata } = require('../whatsappInboxMetadata');
const getIO = () => socketService.getIO();

// Dynamic import for Baileys
let makeWASocket, DisconnectReason, baileysDefaultVersion, downloadMediaMessage, Browsers, isJidNewsletter, S_WHATSAPP_NET, MessageProtocolType, getAggregateVotesInPollMessage, generateWAMessageFromContent, proto;
const initBaileys = async () => {
    const baileys = await import('@whiskeysockets/baileys');
    makeWASocket = baileys.makeWASocket;
    DisconnectReason = baileys.DisconnectReason;
    // نسخة الواتساب المدمجة مع نسخة المكتبة المثبتة.
    // ملاحظة: fetchLatestBaileysVersion تجلب النسخة من master برانش (v7) — مش متوافقة مع إصدار مثبت ثابت.
    baileysDefaultVersion = baileys.DEFAULT_CONNECTION_CONFIG?.version || [2, 3000, 1043857760];
    downloadMediaMessage = baileys.downloadMediaMessage;
    Browsers = baileys.Browsers;
    isJidNewsletter = baileys.isJidNewsletter;
    S_WHATSAPP_NET = baileys.S_WHATSAPP_NET;
    proto = baileys.proto;
    MessageProtocolType = baileys.proto?.Message?.ProtocolMessage?.Type || {};
    getAggregateVotesInPollMessage = baileys.getAggregateVotesInPollMessage;
    generateWAMessageFromContent = baileys.generateWAMessageFromContent;
};
const crypto = require('crypto');
const { isPermissionError, getPermissionErrorMessage } = require('../../utils/dbPermissionHelper');
const { decryptField } = require('../../utils/fieldEncryption');
const getDatabaseUrl = () => process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
const isMysqlDatabase = () => getDatabaseUrl().toLowerCase().startsWith('mysql://');
const quoteSqlIdentifier = (identifier) =>
    isMysqlDatabase() ? `\`${identifier}\`` : `"${identifier}"`;

// تخزين الجلسات النشطة في الذاكرة
const activeSessions = new Map();
const reconnectTimers = new Map();
const manualLogoutSessions = new Set();
const sessionHealthChecks = new Map(); // sessionId -> last health check result
const companySessionMap = new Map(); // companyId -> Set<sessionId>
const historySyncQueues = new Map(); // sessionId -> Promise
const historyMediaSyncJobs = new Map(); // sessionId -> Promise
const historySyncCompletionRequested = new Set();
const historySyncRequestTimers = new Map(); // sessionId -> NodeJS.Timeout

// Cache لصور البروفايل: كانت `sock.profilePictureUrl()` (نداء شبكة لواتساب) بتتنفذ
// على كل رسالة واردة — صورة البروفايل نادراً ما تتغير، فـ TTL طويل (ساعة) آمن.
const profilePicCache = new Map(); // `${sessionId}:${jid}` -> { url, expiresAt }
const PROFILE_PIC_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour (نجاح)
const PROFILE_PIC_MISS_TTL_MS = 10 * 60 * 1000; // 10 min (مفيش صورة — retry دوري)

// منع تشغيل جلب صور البروفايل مرتين على نفس الجلسة في نفس الوقت
const profilePicFetchRunning = new Set(); // sessionId

// ponytail: global reconnect throttle, per-session cooldowns if cycling persists
const lastReconnectTime = new Map();
const RECONNECT_COOLDOWN_MS = 30000;

// 🚨 PRODUCTION-FIX: سقف لمحاولات إعادة الاتصال المتتالية الفاشلة (25 محاولة بتدرج زمني يغطي >30 دقيقة).
// بعدها الجلسة auth state محطّمة على الأرجح — نوقف التكرار (الذي يستدعي
// rate-limit/block من واتساب)، نمسح auth state ونحوّل لـ QR_PENDING مع تنبيه.
const MAX_RECONNECT_ATTEMPTS = 25;

// عداد تراكمي دائم عبر إعادة إنشاء sessionData — لا يُعاد لأي سبب إلا عند نجاح
// اتصال فعلي (open). لازم دائم لأنه sessionData/state.attempt بيتعملهم reset
// عند كل requestReconnect وكل إعادة إنشاء جلسة.
const consecutiveReconnectFailures = new Map(); // sessionId -> count

function getReconnectFailureCount(sessionId) {
    return consecutiveReconnectFailures.get(sessionId) || 0;
}

function incrementReconnectFailureCount(sessionId) {
    const count = getReconnectFailureCount(sessionId) + 1;
    consecutiveReconnectFailures.set(sessionId, count);
    return count;
}

function resetReconnectFailures(sessionId) {
    consecutiveReconnectFailures.delete(sessionId);
}

// Health check configuration
const HEALTH_CHECK_INTERVAL = 25000; // 25 seconds
const HEALTH_CHECK_WARN_THRESHOLD = 60000; // 60 seconds in 'connecting' state = warn
const HEALTH_CHECK_RECONNECT_THRESHOLD = 120000; // 120 seconds in 'connecting' state = force reconnect
const WHATSAPP_DISCONNECT_ALERT_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes per session/category
let healthCheckTimerId = null;
let isHealthCheckRunning = false;

// 🚨 PRODUCTION-FIX (2026-08-31): حارس الـ HistoryImport العالق.
// Import تاريخي واقف في IN_PROGRESS/REQUESTED من غير تحديث لمدة أسبوع كان
// بيخلي كل reconnect يشغّل syncFullHistory=true (تحميل كل التاريخ + صور
// البروفايل) → CPU ~60% ثابت + RSS بيكبر 100MB/دقيقة → الـ backend بيعمل
// ريستارت دوري → صفحات الـ marketplace/my-apps بتقطع. الحارس ده بيمرّن أي
// import عالق أقدم من ساعة لـ COMPLETED تلقائياً عشان الـ reconnect يبطل
// يفعّل الـ full history sync. بيتشغل من الـ health check + قبل أي reconnect.
const HISTORY_IMPORT_STUCK_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour without progress = stuck
let lastHistoryImportHealRun = 0;
const HISTORY_IMPORT_HEAL_COOLDOWN_MS = 10 * 60 * 1000; // run at most every 10 min

// مسار حفظ بيانات الجلسات
const SESSIONS_DIR = path.join(__dirname, '../../data/whatsapp-sessions');
// مسار حفظ الوسائط
const MEDIA_DIR = path.join(__dirname, '../../uploads/whatsapp');
const whatsappDisconnectAlertTimestamps = new Map();

// 🔐 Professional Logger
const WA_LOG = {
    info: (sessionId, msg, data) => console.log(`🔷 [WA:${sessionId ? sessionId.substring(0,8) : '?'}] ${msg}`, data || ''),
    ok: (sessionId, msg, data) => console.log(`✅ [WA:${sessionId ? sessionId.substring(0,8) : '?'}] ${msg}`, data || ''),
    warn: (sessionId, msg, data) => console.warn(`⚠️ [WA:${sessionId ? sessionId.substring(0,8) : '?'}] ${msg}`, data || ''),
    error: (sessionId, msg, data) => console.error(`❌ [WA:${sessionId ? sessionId.substring(0,8) : '?'}] ${msg}`, data || ''),
    event: (sessionId, event, data) => console.log(`📡 [WA-EVENT:${sessionId ? sessionId.substring(0,8) : '?'}] ${event}`, data || ''),
    reconnect: (sessionId, msg, data) => console.log(`🔄 [WA-RECONNECT:${sessionId ? sessionId.substring(0,8) : '?'}] ${msg}`, data || ''),
    auth: (sessionId, msg, data) => console.log(`🔐 [WA-AUTH:${sessionId ? sessionId.substring(0,8) : '?'}] ${msg}`, data || ''),
    health: (sessionId, msg, data) => console.log(`💓 [WA-HEALTH:${sessionId ? sessionId.substring(0,8) : '?'}] ${msg}`, data || ''),
    socket: (sessionId, msg, data) => console.log(`🔌 [WA-SOCKET:${sessionId ? sessionId.substring(0,8) : '?'}] ${msg}`, data || ''),
    restore: (msg, data) => console.log(`♻️ [WA-RESTORE] ${msg}`, data || ''),
};

// ====== Sprint 3.3: Per-session reconnect coordinator ======
// يقوم بجدولة وتنفيذ reconnect بشكل حصري لكل session
const reconnectCoordinator = new Map(); // sessionId -> { phase, timer, reason, requestedAt, sockGeneration, attempt, syncFullHistory }

function getReconnectState(sessionId) {
    let state = reconnectCoordinator.get(sessionId);
    if (!state) {
        state = { phase: 'idle', timer: null, reason: null, requestedAt: null, sockGeneration: 0, attempt: 0, syncFullHistory: false };
        reconnectCoordinator.set(sessionId, state);
    }
    return state;
}

function clearReconnectTimer(sessionId) {
    const state = reconnectCoordinator.get(sessionId);
    if (state && state.timer) {
        clearTimeout(state.timer);
        state.timer = null;
    }
    if (reconnectTimers.has(sessionId)) {
        clearTimeout(reconnectTimers.get(sessionId));
        reconnectTimers.delete(sessionId);
    }
}

function hasPendingReconnect(sessionId) {
    const state = reconnectCoordinator.get(sessionId);
    return !!(state && (state.phase === 'scheduled' || state.phase === 'reconnecting'));
}

function releaseReconnectLock(sessionId) {
    const state = reconnectCoordinator.get(sessionId);
    if (state) {
        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = null;
        }
        state.phase = 'idle';
        state.attempt = 0;
    }
    if (reconnectTimers.has(sessionId)) {
        clearTimeout(reconnectTimers.get(sessionId));
        reconnectTimers.delete(sessionId);
    }
}

// Reconnect coordinator — المسار الوحيد لجدولة reconnect
// أول من يصل يثبت options والـ timer؛ أي سبب تاني يتم تسجيله كـ coalesced بدون تأثير
async function requestReconnect(sessionId, companyId, source, options = {}, delayMs = 1000) {
    const state = getReconnectState(sessionId);
    
    if (state.phase === 'scheduled' || state.phase === 'reconnecting') {
        WA_LOG.reconnect(sessionId, `reconnect_coalesced sessionId=${sessionId} reason=${source} phase=${state.phase} existingReason=${state.reason}`);
        return; // لا نغير timer أو options الحالية
    }

    state.phase = 'scheduled';
    state.reason = source;
    state.requestedAt = new Date();
    state.attempt = 0;

    // 🚨 PRODUCTION-FIX (2026-08-31): قبل قراءة حالة الـ import، نمرّن أي
    // import عالق (أقدم من ساعة) لـ COMPLETED — وإلا الـ IN_PROGRESS العالق
    // هيخلي كل reconnect يشغّل syncFullHistory=true بلا فايدة (تحميل التاريخ
    // المتكرر = CPU/ذاكرة عالية + ريستارت دوري).
    try {
        await healStuckHistoryImports();
    } catch (healError) {
        // لا نعطّل reconnect بسبب فشل الـ heal
    }

    // استنتاج history sync من durable state
    let syncFullHistory = false;
    try {
        const prisma = getSharedPrismaClient();
        const imp = await prisma.whatsAppSessionHistoryImport.findUnique({
            where: { sessionId },
            select: { status: true }
        });
        syncFullHistory = imp && (imp.status === 'REQUESTED' || imp.status === 'IN_PROGRESS');
    } catch (e) { /* model may not exist yet */ }

    WA_LOG.reconnect(sessionId, `reconnect_scheduled sessionId=${sessionId} reason=${source} historySyncEnabled=${syncFullHistory} delay=${delayMs}ms`);

    _scheduleReconnect(sessionId, companyId, { syncFullHistory }, delayMs, source);
}

function _scheduleReconnect(sessionId, companyId, options, delayMs, source) {
    const state = getReconnectState(sessionId);
    clearReconnectTimer(sessionId);

    const lastTime = lastReconnectTime.get(sessionId);
    const elapsed = lastTime ? Date.now() - lastTime : Infinity;
    const cooldownRemaining = Math.max(0, RECONNECT_COOLDOWN_MS - elapsed);
    const baseDelay = Math.max(delayMs, cooldownRemaining);
    const maxDelay = 300000;
    const jitter = Math.random() * Math.min(baseDelay * 0.3, 3000);
    const actualDelay = Math.min(baseDelay + jitter, maxDelay);

    const timer = setTimeout(async () => {
        state.phase = 'reconnecting';
        state.timer = null;
        state.attempt++;
        lastReconnectTime.set(sessionId, Date.now());

        WA_LOG.reconnect(sessionId, `reconnect_started sessionId=${sessionId} reason=${source} attempt=${state.attempt} historySyncEnabled=${options.syncFullHistory}`);

        try {
            await reconnectSession(sessionId, companyId, state.attempt - 1, options);
            WA_LOG.reconnect(sessionId, `reconnect_completed sessionId=${sessionId} reason=${source} attempt=${state.attempt}`);
            releaseReconnectLock(sessionId);
        } catch (error) {
            WA_LOG.reconnect(sessionId, `reconnect_failed sessionId=${sessionId} reason=${source} attempt=${state.attempt} error=${error.message}`);

            if (state.attempt >= MAX_RECONNECT_ATTEMPTS || getReconnectFailureCount(sessionId) >= MAX_RECONNECT_ATTEMPTS) {
                await giveUpOnReconnect(sessionId, companyId);
                return;
            }

            const nextDelay = Math.min(baseDelay * 1.5, maxDelay);
            _scheduleReconnect(sessionId, companyId, options, nextDelay, source);
        }
    }, actualDelay);

    state.timer = timer;
    reconnectTimers.set(sessionId, timer);
}

// For backward compatibility: existing callers that pass options should use requestReconnect instead
// but we keep this as internal helper (not exported)
function scheduleReconnectSession(sessionId, companyId, options = {}, delayMs = 5000, attempt = 0) {
    const state = getReconnectState(sessionId);
    if (state.phase === 'scheduled' || state.phase === 'reconnecting') return;
    state.phase = 'scheduled';
    state.reason = 'legacy';
    _scheduleReconnect(sessionId, companyId, options, delayMs, 'legacy');
}

async function giveUpOnReconnect(sessionId, companyId, phoneNumber) {
    WA_LOG.error(sessionId, `Reconnect attempts exceeded (${MAX_RECONNECT_ATTEMPTS}). Giving up: clearing auth state + QR_PENDING.`);
    resetReconnectFailures(sessionId);

    // تنظيف الجلسة (لو لسه موجودة) قبل مسح auth state
    const existing = activeSessions.get(sessionId);
    if (existing) {
        activeSessions.delete(sessionId);
        if (existing.sock) {
            cleanupSocketListeners(existing.sock);
            await endSocketQuietly(existing.sock, 'Reconnect exhausted');
            existing.sock = null;
        }
        cleanupSessionState(sessionId, existing.companyId || companyId);
    }
    sessionHealthChecks.delete(sessionId);

    try {
        await clearDatabaseAuthState(sessionId);
    } catch (authErr) {
        WA_LOG.error(sessionId, `Failed to clear auth state after reconnect exhaustion:`, authErr.message);
    }
    try {
        await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            await prisma.whatsAppSession.update({
                where: { id: sessionId },
                data: { status: 'QR_PENDING', updatedAt: new Date() }
            });
        }, 3);
    } catch (dbErr) {
        WA_LOG.error(sessionId, `Failed to update DB status to QR_PENDING after reconnect exhaustion:`, dbErr.message);
    }
    releaseReconnectLock(sessionId);
    queueWhatsAppDisconnectAlert({
        sessionId,
        companyId,
        phoneNumber: phoneNumber || existing?.phoneNumber,
        errorMessage: `Reconnect failed ${MAX_RECONNECT_ATTEMPTS} times in a row — clearing auth state, QR re-link required`,
        shouldReconnect: false,
        nextDbStatus: 'QR_PENDING',
        source: 'reconnect_give_up'
    });
    getIO()?.to(`company_${companyId}`).emit('whatsapp:connection', {
        sessionId,
        status: 'qr_pending',
        reason: 'reconnect_give_up'
    });
}

function getSocketGeneration(sessionId) {
    const state = reconnectCoordinator.get(sessionId);
    return state ? state.sockGeneration : 0;
}

function incrementSocketGeneration(sessionId) {
    const state = getReconnectState(sessionId);
    return ++state.sockGeneration;
}

function cleanupSocketListeners(sock) {
    if (!sock || !sock.ev) return;
    try {
        sock.ev.removeAllListeners('connection.update');
        sock.ev.removeAllListeners('creds.update');
        sock.ev.removeAllListeners('error');
        sock.ev.removeAllListeners('messages.upsert');
        sock.ev.removeAllListeners('messaging-history.set');
        sock.ev.removeAllListeners('messages.update');
        sock.ev.removeAllListeners('message-receipt.update');
        sock.ev.removeAllListeners('groups.update');
        sock.ev.removeAllListeners('contacts.update');
        sock.ev.removeAllListeners('presence.update');
        sock.ev.removeAllListeners('call.update');
    } catch (e) {
        // Ignore cleanup errors
    }
}

function cleanupSessionState(sessionId, companyId) {
    clearReconnectTimer(sessionId);
    lastReconnectTime.delete(sessionId);
    sessionHealthChecks.delete(sessionId);
    untrackCompanySession(companyId, sessionId);
    releaseReconnectLock(sessionId);
    for (const key of whatsappDisconnectAlertTimestamps.keys()) {
        if (key.startsWith(`${sessionId}:`)) {
            whatsappDisconnectAlertTimestamps.delete(key);
        }
    }
}

function trackCompanySession(companyId, sessionId) {
    if (!companySessionMap.has(companyId)) {
        companySessionMap.set(companyId, new Set());
    }
    companySessionMap.get(companyId).add(sessionId);
}

function untrackCompanySession(companyId, sessionId) {
    const sessions = companySessionMap.get(companyId);
    if (sessions) {
        sessions.delete(sessionId);
        if (sessions.size === 0) {
            companySessionMap.delete(companyId);
        }
    }
}

/**
 * Emit current status of all WhatsApp sessions for a specific company via Socket.IO
 */
async function emitSessionStatusesForCompany(companyId) {
    const io = getIO();
    if (!io || !companyId) return;

    const companySessions = [];
    for (const [id, session] of activeSessions) {
        if (session.companyId === companyId) {
            companySessions.push({
                sessionId: id,
                status: session.status,
                phoneNumber: session.phoneNumber,
                qrCode: session.qrCode || null,
                pairingCode: session.pairingCode || null
            });
        }
    }

    for (const s of companySessions) {
        io.to(`company_${companyId}`).emit('whatsapp:connection', {
            sessionId: s.sessionId,
            status: s.status,
            phoneNumber: s.phoneNumber || undefined
        });
    }

    if (companySessions.length > 0) {
        WA_LOG.socket(companySessions[0].sessionId, `Emitted status for ${companySessions.length} session(s) to company ${companyId}`);
    }
}

/**
 * Emit status for ALL companies with active sessions
 */
function emitAllSessionStatuses() {
    const io = getIO();
    if (!io) return;

    const companiesEmitted = new Set();
    for (const [sessionId, session] of activeSessions) {
        const companyId = session.companyId;
        if (!companyId || companiesEmitted.has(companyId)) continue;
        companiesEmitted.add(companyId);

        try {
            const sessionsForCompany = [];
            for (const [id, s] of activeSessions) {
                if (s.companyId === companyId) {
                    sessionsForCompany.push({
                        sessionId: id,
                        status: s.status,
                        phoneNumber: s.phoneNumber,
                        qrCode: s.qrCode || null,
                        pairingCode: s.pairingCode || null
                    });
                }
            }
            for (const s of sessionsForCompany) {
                io.to(`company_${companyId}`).emit('whatsapp:connection', {
                    sessionId: s.sessionId,
                    status: s.status,
                    phoneNumber: s.phoneNumber || undefined
                });
            }
        } catch (err) {
            WA_LOG.error(sessionId, `Error emitting status for company ${companyId}:`, err.message);
        }
    }
    WA_LOG.restore(`Emitted session statuses for ${companiesEmitted.size} company/ies`);
}

/**
 * يسجّل نشاطًا واصلًا من socket (رسائل/إيصالات/حضور) — يغذّي فحص الـ staleness
 * (classifySessionSocketHealth يقرأ sock.lastReceivedMessageTimestamp).
 */
function markSocketActivity(sock) {
    if (!sock) return;
    try {
        sock.lastReceivedMessageTimestamp = Date.now();
    } catch (e) { /* best-effort */ }
}

/**
 * Verify if a session's Baileys socket is actually connected
 * Performs multi-layer health check: WebSocket → Baileys Socket → Connection State
 */
function verifySessionHealth(sessionId) {
    const session = activeSessions.get(sessionId);
    return classifySessionSocketHealth(session);
}

function getSocketReadyState(sock) {
    const candidates = [
        sock?.ws?.readyState,
        sock?.ws?.socket?.readyState,
        sock?.ws?._socket?.readyState,
        sock?.ws?.stream?.readyState,
        sock?.ws?.stream?.socket?.readyState
    ];

    return candidates.find((readyState) => typeof readyState === 'number');
}

function classifySessionSocketHealth(session) {
    if (!session) {
        return { alive: false, reason: 'not_in_memory' };
    }

    if (!session.sock) {
        return { alive: false, reason: 'no_socket' };
    }

    try {
        const readyState = getSocketReadyState(session.sock);
        if (typeof readyState !== 'number') {
            if (session.status === 'connected' || session.status === 'authenticating') {
                return { alive: true, stale: false, reason: 'websocket_state_unavailable' };
            }

            return { alive: false, reason: 'websocket_state_unavailable' };
        }

        if (readyState === 1) {
            // readyState 1 = WebSocket OPEN. Baileys handles keepAlive (ping/pong every 30s).
            // Do not disconnect healthy sockets just because no incoming messages were received.
            return { alive: true, stale: false, reason: null };
        } else if (readyState === 0) {
            return { alive: false, reason: 'websocket_connecting' };
        } else {
            return { alive: false, reason: `websocket_${readyState}` };
        }
    } catch (err) {
        return { alive: false, reason: `check_error:${err.message}` };
    }
}

/**
 * Periodic health check for all active sessions
 * Runs every HEALTH_CHECK_INTERVAL ms and takes corrective action
 */
async function runHealthCheck() {
    if (isHealthCheckRunning) return;
    isHealthCheckRunning = true;

    try {
        // 🚨 PRODUCTION-FIX (2026-08-31): مرّرن الـ history imports العالقة
        // دوريًا من غير ما نستنى reconnect. بيشتغل بكفاءة عبر updateMany
        // (بحد أقصى كل 10 دقايق).
        try {
            await healStuckHistoryImports();
        } catch (healError) {
            // لا نعطّل دورة الـ health check بسبب فشل الـ heal
        }

        // Batch DB status read: 1 query instead of N findUnique per tick
        const sessionIds = Array.from(activeSessions.keys());
        let dbStatusMap = new Map();
        if (sessionIds.length > 0) {
            try {
                const dbRecords = await safeQuery(async () => {
                    const prisma = getSharedPrismaClient();
                    return await prisma.whatsAppSession.findMany({
                        where: { id: { in: sessionIds } },
                        select: { id: true, status: true }
                    });
                }, 3);
                dbStatusMap = new Map((dbRecords || []).map(r => [r.id, r.status]));
            } catch (dbErr) {
                WA_LOG.error(null, `Health check batch status read failed:`, dbErr.message);
            }
        }

        const statusDiffs = [];

        for (const [sessionId, session] of activeSessions) {
            try {
                if (!session || !session.sock) continue;

                const companyId = session.companyId;
                const health = verifySessionHealth(sessionId);

                sessionHealthChecks.set(sessionId, {
                    lastCheck: Date.now(),
                    health
                });

                if (session.status === 'connected' || session.status === 'authenticating') {
                    if (!health.alive || health.stale) {
                        WA_LOG.health(sessionId, `WebSocket not alive (${health.reason}), marking as disconnected`);
                        session.status = 'disconnected';

                        const io = getIO();
                        io?.to(`company_${companyId}`).emit('whatsapp:connection', {
                            sessionId,
                            status: 'disconnected'
                        });

                        if (health.stale) {
                            WA_LOG.health(sessionId, `Stale connection detected, forcing socket end`);
                            await endSocketQuietly(session.sock, 'Health check: stale connection');
                        }

                        queueWhatsAppDisconnectAlert({
                            sessionId,
                            companyId,
                            phoneNumber: session.phoneNumber,
                            healthReason: health.reason,
                            shouldReconnect: true,
                            nextDbStatus: 'DISCONNECTED',
                            source: 'health_check'
                        });

                        requestReconnect(sessionId, companyId, 'health_check');
                    }
                } else if (session.status === 'connecting') {
                    // Check if we've been connecting too long
                    const createdAt = session.createdAt?.getTime() || Date.now();
                    const elapsed = Date.now() - createdAt;
                    const healthCheckElapsed = sessionHealthChecks.get(sessionId)?.lastCheck 
                        ? Date.now() - sessionHealthChecks.get(sessionId).lastCheck 
                        : 0;

                    if (elapsed > HEALTH_CHECK_RECONNECT_THRESHOLD || healthCheckElapsed > HEALTH_CHECK_RECONNECT_THRESHOLD) {
                        WA_LOG.health(sessionId, `Stuck in 'connecting' for ${Math.round(elapsed/1000)}s, force reconnecting`);
                        session.createdAt = new Date(); // Reset timer
                        activeSessions.delete(sessionId);
                        if (session?.sock) {
                            cleanupSocketListeners(session.sock);
                            await endSocketQuietly(session.sock, 'Health check force reconnect');
                            session.sock = null;
                        }
                        cleanupSessionState(sessionId, session.companyId);
                        requestReconnect(sessionId, companyId, 'health_check_stuck', {}, 500);
                    } else if (elapsed > HEALTH_CHECK_WARN_THRESHOLD) {
                        WA_LOG.health(sessionId, `Still connecting after ${Math.round(elapsed/1000)}s`);
                    }
                }

                // Update DB status to match in-memory if they differ (collected & applied in one transaction)
                const currentDbStatus = dbStatusMap.get(sessionId);
                const inMemoryStatus = session.status?.toUpperCase();
                if (currentDbStatus && currentDbStatus !== inMemoryStatus && inMemoryStatus) {
                    WA_LOG.health(sessionId, `Syncing DB status: ${currentDbStatus} -> ${inMemoryStatus}`);
                    statusDiffs.push({ id: sessionId, status: inMemoryStatus });
                }
            } catch (sessionErr) {
                WA_LOG.error(sessionId, `Health check error:`, sessionErr.message);
            }
        }

        // Apply rare status diffs in a single transaction
        if (statusDiffs.length > 0) {
            try {
                await safeQuery(async () => {
                    const prisma = getSharedPrismaClient();
                    await prisma.$transaction(async (tx) => {
                        for (const d of statusDiffs) {
                            await tx.whatsAppSession.update({
                                where: { id: d.id },
                                data: { status: d.status }
                            });
                        }
                    });
                }, 3);
            } catch (diffErr) {
                WA_LOG.error(null, `Health check status sync failed:`, diffErr.message);
            }
        }
    } catch (err) {
        WA_LOG.error(null, `Health check iteration error:`, err.message);
    } finally {
        isHealthCheckRunning = false;
    }
}

/**
 * Start the periodic health check
 */
function startSessionHealthCheck() {
    if (healthCheckTimerId) {
        clearInterval(healthCheckTimerId);
    }
    healthCheckTimerId = setInterval(runHealthCheck, HEALTH_CHECK_INTERVAL);
    if (healthCheckTimerId && typeof healthCheckTimerId.unref === 'function') {
        healthCheckTimerId.unref();
    }
    WA_LOG.restore(`Health check started (every ${HEALTH_CHECK_INTERVAL/1000}s)`);
}

/**
 * Stop the periodic health check
 */
function stopSessionHealthCheck() {
    if (healthCheckTimerId) {
        clearInterval(healthCheckTimerId);
        healthCheckTimerId = null;
    }
}

// Legacy callers that still call scheduleReconnectSession directly
// are redirected through the coordinator internally from _scheduleReconnect

function normalizePhoneNumber(value) {
    const cleaned = String(value || '').replace(/\D/g, '');
    return cleaned.length >= 10 ? cleaned : '';
}

function getWhatsAppDisconnectAlertCooldownMs() {
    const configured = Number(process.env.WHATSAPP_DISCONNECT_ALERT_COOLDOWN_MS);
    return Number.isFinite(configured) && configured >= 0
        ? configured
        : WHATSAPP_DISCONNECT_ALERT_COOLDOWN_MS;
}

function toBooleanOption(value) {
    return value === true || value === 'true' || value === 1 || value === '1' || value === 'on';
}

function parseJsonSafely(value, fallback = {}) {
    if (!value || typeof value !== 'string') {
        return fallback;
    }

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function shouldEnableFullHistorySync(options = {}) {
    return toBooleanOption(options.syncFullHistory) ||
        toBooleanOption(options.importHistory) ||
        toBooleanOption(options.syncOldMessages);
}
function getSocketBrowser(syncFullHistory) {
    const platform = process.platform;

    if (!Browsers) {
        const osName = platform === 'win32' ? 'Windows'
            : platform === 'linux' ? 'Linux'
            : 'macOS';
        return [osName, 'Chrome', '130.0.0'];
    }

    if (platform === 'win32' && Browsers.windows) return Browsers.windows('Chrome');
    if (platform === 'linux') {
        if (Browsers.ubuntu) return Browsers.ubuntu('Chrome');
        if (Browsers.linux) return Browsers.linux('Chrome');
    }
    if (Browsers.macOS) return Browsers.macOS('Chrome');

    return Browsers.windows ? Browsers.windows('Chrome') : ['Windows', 'Chrome', '130.0.0'];
}

function getLiveStatusFromDbStatus(status, provider) {
    if (provider === 'META_CLOUD') return 'connected';

    const statusMap = {
        CONNECTED: 'connected',
        CONNECTING: 'connecting',
        QR_PENDING: 'qr_pending',
        LOGGED_OUT: 'logged_out',
        DISCONNECTED: 'disconnected',
        AUTHENTICATING: 'authenticating'
    };

    return statusMap[status] || 'disconnected';
}

function getDisconnectRecoveryDecision(statusCode, errorMessage = '', isManualLogout = false) {
    const isBadMac = String(errorMessage || '').includes('Bad MAC');
    const isLoggedOut = statusCode !== undefined && statusCode !== null && (statusCode === 401 || statusCode === DisconnectReason?.loggedOut);
    const isForbidden = statusCode !== undefined && statusCode !== null && (statusCode === 403 || statusCode === DisconnectReason?.forbidden);
    
    // Only require a fresh link (auth clear) if the user has explicitly logged out from their phone (401).
    // Do NOT wipe the session for 403 (Forbidden) or Bad MAC (decryption errors) because they are often
    // transient or due to rate limits. Wiping them causes QR scan loops which worsens WhatsApp blocks.
    const requiresFreshLink = !isManualLogout && isLoggedOut;

    return {
        isBadMac,
        isLoggedOut,
        isForbidden,
        requiresFreshLink,
        shouldReconnect: !isManualLogout && !requiresFreshLink
    };
}

function getWhatsAppDisconnectAlertCategory({ requiresFreshLink = false, shouldReconnect = false, source = 'connection_update' } = {}) {
    if (requiresFreshLink) return 'RELINK_REQUIRED';
    if (source === 'health_check') return 'HEALTH_CHECK_DISCONNECT';
    if (shouldReconnect) return 'AUTO_RECONNECTING';
    return 'UNEXPECTED_DISCONNECT';
}

function shouldSendWhatsAppDisconnectAlert(sessionId, category, now = Date.now(), cooldownMs = getWhatsAppDisconnectAlertCooldownMs()) {
    if (!sessionId) return false;
    if (cooldownMs <= 0) return true;

    const key = `${sessionId}:${category || 'UNKNOWN'}`;
    const lastSentAt = whatsappDisconnectAlertTimestamps.get(key);
    if (lastSentAt && now - lastSentAt < cooldownMs) {
        return false;
    }

    whatsappDisconnectAlertTimestamps.set(key, now);
    return true;
}

function formatAlertCode(value, fallback = 'N/A') {
    const raw = value === undefined || value === null || value === '' ? fallback : value;
    return `\`${String(raw).replace(/`/g, "'").slice(0, 500)}\``;
}

function getWhatsAppDisconnectReasonLabel({
    isBadMac = false,
    isForbidden = false,
    isLoggedOut = false,
    statusCode,
    errorMessage = '',
    healthReason = ''
} = {}) {
    if (isBadMac) return 'Bad MAC / corrupted auth keys';
    if (isForbidden) return 'Forbidden WhatsApp socket (403)';
    if (isLoggedOut) return 'Logged out from linked device';
    if (healthReason) return `Health check detected dead socket: ${healthReason}`;
    if (errorMessage) return errorMessage;
    if (statusCode) return `Baileys socket closed with status ${statusCode}`;
    return 'WhatsApp socket closed unexpectedly';
}

function getWhatsAppDisconnectActionLabel({ requiresFreshLink = false, shouldReconnect = false, source = 'connection_update' } = {}) {
    if (requiresFreshLink) return 'Manual relink required from MaxP (QR or pairing code)';
    if (shouldReconnect || source === 'health_check') return 'MaxP is attempting automatic reconnect';
    return 'Check the WhatsApp session in MaxP';
}

function buildWhatsAppDisconnectAlertMessage({
    sessionId,
    companyId,
    phoneNumber,
    statusCode,
    errorMessage = '',
    healthReason = '',
    isBadMac = false,
    isForbidden = false,
    isLoggedOut = false,
    requiresFreshLink = false,
    shouldReconnect = false,
    nextDbStatus = 'DISCONNECTED',
    source = 'connection_update'
} = {}) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const displayPhone = normalizedPhone ? `+${normalizedPhone}` : 'Unknown';
    const reason = getWhatsAppDisconnectReasonLabel({
        isBadMac,
        isForbidden,
        isLoggedOut,
        statusCode,
        errorMessage,
        healthReason
    });
    const action = getWhatsAppDisconnectActionLabel({ requiresFreshLink, shouldReconnect, source });

    const lines = [
        '🔴 *WhatsApp Number Disconnected*',
        '',
        `*Company ID:* ${formatAlertCode(companyId)}`,
        `*Session ID:* ${formatAlertCode(sessionId)}`,
        `*Phone Number:* ${formatAlertCode(displayPhone)}`,
        `*Reason:* ${formatAlertCode(reason)}`,
        `*Status Code:* ${formatAlertCode(statusCode)}`,
        `*Next MaxP Status:* ${formatAlertCode(nextDbStatus)}`,
        `*Action:* ${formatAlertCode(action)}`,
        `*Source:* ${formatAlertCode(source)}`
    ];

    return lines.join('\n');
}

function queueWhatsAppDisconnectAlert(alertInput = {}) {
    if (alertInput.isManualLogout) return false;

    const category = getWhatsAppDisconnectAlertCategory(alertInput);
    if (!shouldSendWhatsAppDisconnectAlert(alertInput.sessionId, category)) {
        WA_LOG.warn(alertInput.sessionId, `Telegram disconnect alert suppressed by cooldown`, { category });
        return false;
    }

    const message = buildWhatsAppDisconnectAlertMessage(alertInput);
    telegramAlertService.sendAlert(message).catch(err => {
        console.error('Failed to send telegram alert for WA disconnect:', err.message);
    });
    return true;
}

function timestampToDate(timestamp) {
    if (!timestamp) return null;

    let seconds = null;
    if (typeof timestamp === 'number') {
        seconds = timestamp;
    } else if (typeof timestamp === 'string') {
        const parsed = Number(timestamp);
        seconds = Number.isFinite(parsed) ? parsed : null;
    } else if (typeof timestamp.toNumber === 'function') {
        const parsed = timestamp.toNumber();
        seconds = Number.isFinite(parsed) ? parsed : null;
    } else {
        const parsed = Number(timestamp);
        seconds = Number.isFinite(parsed) ? parsed : null;
    }

    if (!seconds) return null;
    return new Date(seconds * 1000);
}

async function endSocketQuietly(sock, reason) {
    if (!sock) {
        return;
    }

    try {
        cleanupSocketListeners(sock);
        await sock.end(new Error(reason || 'Session restart'));
    } catch (error) {
        console.warn('⚠️ Failed to end WhatsApp socket cleanly:', error.message);
    }
}

function getIncomingMessageTimestampSeconds(msg) {
    const timestamp = msg?.messageTimestamp;
    if (!timestamp) return null;
    if (typeof timestamp === 'number') return timestamp;
    if (typeof timestamp === 'string') {
        const parsed = Number(timestamp);
        return Number.isFinite(parsed) ? parsed : null;
    }
    if (typeof timestamp.toNumber === 'function') {
        const parsed = timestamp.toNumber();
        return Number.isFinite(parsed) ? parsed : null;
    }
    const parsed = Number(timestamp);
    return Number.isFinite(parsed) ? parsed : null;
}

function shouldProcessIncomingMessage(msg, nowSeconds = Date.now() / 1000) {
    const timestampSeconds = getIncomingMessageTimestampSeconds(msg);
    if (!timestampSeconds) return true;

    // Accept replayed notify messages after reconnects. The messageId upsert below
    // is the real duplicate guard; dropping by age loses messages during downtime.
    const maxFutureSkewSeconds = 5 * 60;
    return timestampSeconds <= nowSeconds + maxFutureSkewSeconds;
}

function getContactPhoneNumberForJid(remoteJid) {
    if (!remoteJid) return '';

    const bareJid = String(remoteJid).split('@')[0].split(':')[0];
    const cleaned = bareJid.replace(/\D/g, '');

    if (remoteJid.endsWith('@g.us') || remoteJid.includes('@lid')) {
        return bareJid || remoteJid;
    }

    return cleaned || bareJid || remoteJid;
}

function isLinkedDeviceJid(jid) {
    return String(jid || '').includes('@lid');
}

function isPhoneJid(jid) {
    return String(jid || '').includes('@s.whatsapp.net');
}

function normalizePhoneJid(jid) {
    if (!isPhoneJid(jid)) return null;

    const bareJid = String(jid).split('@')[0].split(':')[0];
    const cleaned = bareJid.replace(/\D/g, '');

    return cleaned ? `${cleaned}@s.whatsapp.net` : null;
}

function getPhoneJidFromMessageKey(msg, options = {}) {
    const { fromMe = false } = options;
    const senderPn = normalizePhoneJid(msg?.key?.senderPn);

    if (senderPn) {
        return senderPn;
    }

    // For our own linked-device messages, participant can be the account owner.
    if (fromMe) {
        return null;
    }

    return normalizePhoneJid(msg?.key?.participant);
}

function getMetadataRemoteJidNeedle(jid) {
    return `"remoteJid":"${String(jid || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

async function findPhoneJidForLinkedDeviceJid(sessionId, lidJid) {
    if (!sessionId || !isLinkedDeviceJid(lidJid)) {
        return null;
    }

    const linkedMessage = await getSharedPrismaClient().whatsAppMessage.findFirst({
        where: {
            sessionId,
            metadata: {
                contains: getMetadataRemoteJidNeedle(lidJid)
            },
            AND: [
                { remoteJid: { contains: '@s.whatsapp.net' } },
                { remoteJid: { not: lidJid } }
            ]
        },
        select: {
            remoteJid: true
        },
        orderBy: {
            timestamp: 'desc'
        }
    });

    return normalizePhoneJid(linkedMessage?.remoteJid);
}

async function resolveLinkedDeviceRemoteJid(sessionId, remoteJid, msg, options = {}) {
    const { normalizedJid } = normalizeWhatsAppContactIdentity(remoteJid);

    if (!isLinkedDeviceJid(normalizedJid)) {
        return normalizedJid;
    }

    const directPhoneJid = getPhoneJidFromMessageKey(msg, options);
    if (directPhoneJid) {
        return directPhoneJid;
    }

    return await findPhoneJidForLinkedDeviceJid(sessionId, normalizedJid) || normalizedJid;
}

/**
 * تحويل JID وجهة الإرسال إلى JID فعلي قابل للإرسال.
 * الـ LID (Linked Device ID) لا يُرسَل إليه مباشرة — نفضّه عبر الـ mapping
 * (ما تبعتش في فراغ). يرجع null لو LID غير محلول.
 */
async function resolveOutgoingRemoteJid(sessionId, to) {
    const { normalizedJid } = normalizeWhatsAppContactIdentity(to);
    if (!sessionId || !isLinkedDeviceJid(normalizedJid)) {
        return normalizedJid;
    }

    const persisted = await getPersistedLidMapping(sessionId, normalizedJid);
    if (persisted) return persisted;

    const heuristic = await findPhoneJidForLinkedDeviceJid(sessionId, normalizedJid);
    if (heuristic) return heuristic;

    try {
        const contact = await getSharedPrismaClient().whatsAppContact.findUnique({
            where: {
                sessionId_jid: {
                    sessionId,
                    jid: normalizedJid
                }
            },
            select: { phoneNumber: true }
        });
        if (contact?.phoneNumber && !contact.phoneNumber.startsWith('lid:') && !contact.phoneNumber.startsWith('group:')) {
            const cleaned = contact.phoneNumber.replace(/\D/g, '');
            if (cleaned.length >= 7) {
                const phoneJid = `${cleaned}@s.whatsapp.net`;
                await persistHistoryLidMappings(sessionId, [{ pnJid: phoneJid, lidJid: normalizedJid }]);
                return phoneJid;
            }
        }
    } catch (e) {}

    return null;
}

async function mergeLinkedDeviceConversation(sessionId, lidJid, phoneJid, options = {}) {
    const normalizedLidJid = normalizeWhatsAppContactIdentity(lidJid).normalizedJid;
    const normalizedPhoneJid = normalizePhoneJid(phoneJid);

    if (!sessionId || !isLinkedDeviceJid(normalizedLidJid) || !normalizedPhoneJid || normalizedLidJid === normalizedPhoneJid) {
        return false;
    }

    try {
        const prisma = getSharedPrismaClient();
        await prisma.$transaction(async (tx) => {
            const [lidContact, phoneContact] = await Promise.all([
                tx.whatsAppContact.findUnique({
                    where: {
                        sessionId_jid: {
                            sessionId,
                            jid: normalizedLidJid
                        }
                    }
                }),
                tx.whatsAppContact.findUnique({
                    where: {
                        sessionId_jid: {
                            sessionId,
                            jid: normalizedPhoneJid
                        }
                    }
                })
            ]);

            await tx.whatsAppMessage.updateMany({
                where: {
                    sessionId,
                    remoteJid: normalizedLidJid
                },
                data: {
                    remoteJid: normalizedPhoneJid,
                    updatedAt: new Date()
                }
            });

            // Sync the CRM Conversation metadata (remoteJid) from the LID jid to the resolved phone jid
            const affectedConversations = await tx.conversation.findMany({
                where: {
                    metadata: { contains: `"remoteJid":"${normalizedLidJid}"` }
                },
                select: { id: true, metadata: true }
            });
            for (const conv of affectedConversations) {
                await tx.conversation.update({
                    where: { id: conv.id },
                    data: { metadata: buildConversationMetadata(conv.metadata, { remoteJid: normalizedPhoneJid }) }
                });
            }

            const [totalMessages, unreadCount, lastMessage] = await Promise.all([
                tx.whatsAppMessage.count({
                    where: {
                        sessionId,
                        remoteJid: normalizedPhoneJid
                    }
                }),
                tx.whatsAppMessage.count({
                    where: {
                        sessionId,
                        remoteJid: normalizedPhoneJid,
                        fromMe: false,
                        status: { not: 'READ' }
                    }
                }),
                tx.whatsAppMessage.findFirst({
                    where: {
                        sessionId,
                        remoteJid: normalizedPhoneJid
                    },
                    select: {
                        timestamp: true
                    },
                    orderBy: {
                        timestamp: 'desc'
                    }
                })
            ]);

            const { phoneNumber } = normalizeWhatsAppContactIdentity(normalizedPhoneJid);
            const mergedPushName = options.pushName || phoneContact?.pushName || lidContact?.pushName || null;
            const contactUpdate = {
                totalMessages,
                unreadCount,
                lastMessageAt: lastMessage?.timestamp || lidContact?.lastMessageAt || phoneContact?.lastMessageAt || new Date(),
                updatedAt: new Date()
            };

            if (!phoneContact?.name && lidContact?.name) {
                contactUpdate.name = lidContact.name;
            }

            if (!phoneContact?.pushName && mergedPushName) {
                contactUpdate.pushName = mergedPushName;
            }

            if (!phoneContact?.profilePicUrl && lidContact?.profilePicUrl) {
                contactUpdate.profilePicUrl = lidContact.profilePicUrl;
            }

            // الربط مع سجل العميل في الـ CRM وتحديث الـ whatsappId
            let targetCustomerId = phoneContact?.customerId || lidContact?.customerId || null;
            const sessionRecord = await tx.whatsAppSession.findUnique({
                where: { id: sessionId },
                select: { companyId: true }
            });
            const companyId = sessionRecord?.companyId;

            if (companyId) {
                const cleanPhone = phoneNumber ? phoneNumber.replace(/\D/g, '') : '';
                if (!targetCustomerId && cleanPhone) {
                    const existingCust = await tx.customer.findFirst({
                        where: {
                            companyId,
                            OR: [
                                { phone: cleanPhone },
                                { phoneNormalized: cleanPhone },
                                { phone: { endsWith: cleanPhone.slice(-9) } },
                                { whatsappId: normalizedLidJid }
                            ]
                        },
                        select: { id: true, firstName: true, lastName: true, whatsappId: true }
                    });
                    if (existingCust) {
                        targetCustomerId = existingCust.id;
                        if (existingCust.whatsappId !== normalizedLidJid) {
                            await tx.customer.update({
                                where: { id: existingCust.id },
                                data: { whatsappId: normalizedLidJid }
                            });
                        }
                        if (!contactUpdate.name) {
                            const fullName = [existingCust.firstName, existingCust.lastName].filter(Boolean).join(' ').trim();
                            if (fullName) contactUpdate.name = fullName;
                        }
                    } else if (cleanPhone.length >= 7) {
                        const newCust = await tx.customer.create({
                            data: {
                                companyId,
                                firstName: lidContact?.name || mergedPushName || 'عميل واتساب',
                                lastName: '',
                                phone: cleanPhone,
                                phoneNormalized: cleanPhone,
                                whatsappId: normalizedLidJid,
                                status: 'LEAD'
                            },
                            select: { id: true }
                        });
                        targetCustomerId = newCust.id;
                    }
                } else if (targetCustomerId) {
                    await tx.customer.update({
                        where: { id: targetCustomerId },
                        data: { whatsappId: normalizedLidJid }
                    }).catch(() => {});
                }
            }

            if (targetCustomerId) {
                contactUpdate.customer = {
                    connect: { id: targetCustomerId }
                };
            }

            await tx.whatsAppContact.upsert({
                where: {
                    sessionId_jid: {
                        sessionId,
                        jid: normalizedPhoneJid
                    }
                },
                update: contactUpdate,
                create: {
                    jid: normalizedPhoneJid,
                    phoneNumber,
                    name: contactUpdate.name || lidContact?.name || phoneContact?.name || null,
                    pushName: mergedPushName,
                    profilePicUrl: lidContact?.profilePicUrl || null,
                    lastMessageAt: contactUpdate.lastMessageAt,
                    unreadCount,
                    totalMessages,
                    isGroup: false,
                    customer: targetCustomerId ? { connect: { id: targetCustomerId } } : undefined,
                    whatsAppSession: {
                        connect: { id: sessionId }
                    },
                    updatedAt: new Date()
                }
            });

            await tx.whatsAppContact.deleteMany({
                where: {
                    sessionId,
                    jid: normalizedLidJid
                }
            });
        });

        return true;
    } catch (error) {
        console.warn('⚠️ Failed to merge linked-device WhatsApp conversation:', {
            sessionId,
            lidJid: normalizedLidJid,
            phoneJid: normalizedPhoneJid,
            error: error.message
        });
        return false;
    }
}

function isHistorySystemMessage(msg) {
    const message = msg?.message || {};
    return Boolean(
        msg?.messageStubType ||
        message.protocolMessage ||
        message.senderKeyDistributionMessage ||
        message.messageContextInfo
    );
}

async function persistHistoryLidMappings(sessionId, mappings = []) {
    const prisma = getSharedPrismaClient();
    if (!prisma.whatsAppLidMapping || !Array.isArray(mappings)) return {};

    const resolved = {};
    for (const mapping of mappings) {
        const lidJid = String(mapping?.lidJid || '').trim();
        const phoneJid = normalizePhoneJid(mapping?.pnJid);
        if (!lidJid || !phoneJid) continue;

        await prisma.whatsAppLidMapping.upsert({
            where: { sessionId_lidJid: { sessionId, lidJid } },
            create: { sessionId, lidJid, phoneJid },
            update: { phoneJid, updatedAt: new Date() }
        });

        resolved[lidJid] = phoneJid;
        await mergeLinkedDeviceConversation(sessionId, lidJid, phoneJid);
    }

    return resolved;
}

async function getPersistedLidMapping(sessionId, lidJid) {
    const prisma = getSharedPrismaClient();
    if (!prisma.whatsAppLidMapping || !sessionId || !lidJid) return null;

    // 1. فحص الجلسة الحالية
    const mapping = await prisma.whatsAppLidMapping.findUnique({
        where: { sessionId_lidJid: { sessionId, lidJid } },
        select: { phoneJid: true }
    });

    if (mapping?.phoneJid) {
        return normalizePhoneJid(mapping.phoneJid);
    }

    // 2. فحص سحابي عبر جلسات الشركة وسجل العملاء في الـ CRM
    try {
        const currentSession = await prisma.whatsAppSession.findUnique({
            where: { id: sessionId },
            select: { companyId: true }
        });
        if (currentSession?.companyId) {
            // أ. البحث في أي جلسة أخرى تابعة لنفس الشركة
            const companyMapping = await prisma.whatsAppLidMapping.findFirst({
                where: {
                    lidJid,
                    whatsAppSession: { companyId: currentSession.companyId }
                },
                select: { phoneJid: true }
            });
            if (companyMapping?.phoneJid) {
                const phoneJid = normalizePhoneJid(companyMapping.phoneJid);
                await prisma.whatsAppLidMapping.upsert({
                    where: { sessionId_lidJid: { sessionId, lidJid } },
                    create: { sessionId, lidJid, phoneJid, source: 'COMPANY_CROSS_SESSION' },
                    update: { phoneJid }
                }).catch(() => {});
                return phoneJid;
            }

            // ب. البحث في جدول العملاء Customer في الـ CRM
            const matchedCustomer = await prisma.customer.findFirst({
                where: {
                    companyId: currentSession.companyId,
                    OR: [
                        { whatsappId: lidJid },
                        { metadata: { contains: lidJid } }
                    ]
                },
                select: { id: true, phone: true, phoneNormalized: true, firstName: true, lastName: true }
            });

            const rawPhone = matchedCustomer?.phoneNormalized || matchedCustomer?.phone;
            if (rawPhone) {
                let clean = rawPhone.replace(/\D/g, '');
                if (clean.startsWith('00')) clean = clean.slice(2);
                else if (clean.startsWith('01') && clean.length === 11) clean = '2' + clean;
                if (clean.length >= 7) {
                    const phoneJid = `${clean}@s.whatsapp.net`;
                    await prisma.whatsAppLidMapping.upsert({
                        where: { sessionId_lidJid: { sessionId, lidJid } },
                        create: { sessionId, lidJid, phoneJid, source: 'CRM_CUSTOMER_MATCH' },
                        update: { phoneJid }
                    }).catch(() => {});
                    return phoneJid;
                }
            }
        }
    } catch (err) {
        console.warn('⚠️ Error in cross-session/CRM getPersistedLidMapping:', err.message);
    }

    return null;
}

async function shouldProcessMessageUpsertType(type, fromMe, messageId, options = {}) {
    if (type === 'notify') return true;

    // Check duplicate BEFORE importHistory shortcut to avoid bypassing dedup
    if (options.importHistory && type === 'append') {
        if (messageId) {
            const existing = await getSharedPrismaClient().whatsAppMessage.findUnique({
                where: { messageId },
                select: { id: true }
            });
            if (existing) return false;
        }
        return true;
    }

    // Own outgoing messages delivered as append (e.g. from another linked device).
    if (type === 'append' && Boolean(fromMe)) return true;

    // For incoming 'append' messages, check if we've already processed this messageId.
    // A genuinely new first message from a fresh contact can arrive as 'append' during
    // Baileys store warm-up or multi-device sync — skip only if already in the DB.
    if (type === 'append' && messageId) {
        try {
            const existing = await getSharedPrismaClient().whatsAppMessage.findUnique({
                where: { messageId },
                select: { id: true }
            });
            if (existing) {
                console.warn(
                    `⚠️ Skipping already-processed WhatsApp message ${messageId} (type=append)`
                );
                return false;
            }
            return true;
        } catch (e) {
            console.error('❌ Error checking duplicate WhatsApp messageId:', e.message);
            return true; // on DB error, process the message to be safe
        }
    }

    return false;
}

const MESSAGE_STATUS_RANK = {
    PENDING: 0,
    SENT: 1,
    DELIVERED: 2,
    READ: 3,
    FAILED: 4
};

function getMessageStatusFromBaileysStatus(baileysStatus) {
    const statusMap = {
        0: 'FAILED', // WAMessageStatus.ERROR — الإيصال صار خطأ فعلًا
        1: 'PENDING',
        2: 'SENT',
        3: 'DELIVERED',
        4: 'READ',
        5: 'READ' // PLAYED → READ
    };
    const parsedStatus = Number(baileysStatus);

    if (Number.isFinite(parsedStatus) && statusMap[parsedStatus] !== undefined) {
        return statusMap[parsedStatus];
    }

    const statusNameMap = {
        ERROR: 'FAILED',
        PENDING: 'PENDING',
        SERVER_ACK: 'SENT',
        DELIVERY_ACK: 'DELIVERED',
        READ: 'READ',
        PLAYED: 'READ'
    };

    const normalizedStatus = String(baileysStatus || '').toUpperCase();
    return statusNameMap[normalizedStatus] || null;
}

function shouldApplyMessageStatus(currentStatus, nextStatus) {
    // FAILED is terminal-ish: never let a later DELIVERED/READ receipt flip it back,
    // and never overwrite an already DELIVERED/READ message with FAILED.
    if (nextStatus === 'FAILED') {
        return currentStatus !== 'DELIVERED' && currentStatus !== 'READ';
    }
    const currentRank = MESSAGE_STATUS_RANK[currentStatus] ?? 0;
    const nextRank = MESSAGE_STATUS_RANK[nextStatus] ?? 0;

    return nextRank >= currentRank;
}

async function updateMessageDeliveryStatus(messageId, status) {
    const prisma = getSharedPrismaClient();
    const existingMessages = await prisma.whatsAppMessage.findMany({
        where: { messageId },
        select: {
            id: true,
            status: true
        }
    });

    const idsToUpdate = existingMessages
        .filter((message) => shouldApplyMessageStatus(message.status, status))
        .map((message) => message.id);

    if (idsToUpdate.length === 0) {
        return 0;
    }

    await prisma.whatsAppMessage.updateMany({
        where: {
            id: { in: idsToUpdate }
        },
        data: {
            status,
            updatedAt: new Date()
        }
    });

    return idsToUpdate.length;
}

async function getPersistedRemoteJidForMessage(messageId) {
    if (!messageId) return null;

    const message = await getSharedPrismaClient().whatsAppMessage.findFirst({
        where: { messageId },
        select: { remoteJid: true }
    });

    return message?.remoteJid || null;
}

/**
 * تهيئة مجلد الجلسات والوسائط
 */
async function initSessionsDirectory() {
    try {
        await fs.mkdir(SESSIONS_DIR, { recursive: true });
        await fs.mkdir(MEDIA_DIR, { recursive: true });

        // Lazy load to avoid circular dependency
        const WhatsAppMediaHandler = require('./WhatsAppMediaHandler');
        await WhatsAppMediaHandler.initMediaDirectory();

        console.log('📁 WhatsApp sessions and media directories initialized');
    } catch (error) {
        console.error('❌ Error creating directories:', error);
    }
}

/**
 * الحصول على مسار جلسة معينة
 */
function getSessionPath(sessionId) {
    return path.join(SESSIONS_DIR, sessionId);
}

/**
 * إنشاء جلسة WhatsApp جديدة
 * @param {string} sessionId - معرف الجلسة
 * @param {string} companyId - معرف الشركة
 * @param {object} options - خيارات إضافية (usePairingCode, phoneNumber)
 */
async function createSession(sessionId, companyId, options = {}) {
    /** 🛡️ PRODUCTION-FIX: declared outside try so catch can clean up on error */
    let sock = null;
    try {
        // Exclude META_CLOUD sessions from Baileys manager
        const dbSession = await getSharedPrismaClient().whatsAppSession.findUnique({
            where: { id: sessionId },
            select: { provider: true }
        });
        if (dbSession && dbSession.provider === 'META_CLOUD') {
            console.log(`ℹ️ [WhatsAppManager] Skipping Baileys socket creation for META_CLOUD session ${sessionId}`);
            return null;
        }

        console.log(`📱 Creating WhatsApp session: ${sessionId} for company: ${companyId}`, options);
        const normalizedPhoneNumber = normalizePhoneNumber(options.phoneNumber);
        const usePairingCode = Boolean(options.usePairingCode && normalizedPhoneNumber);
        const syncFullHistory = shouldEnableFullHistorySync(options);

        // Initialize Baileys if not already done
        if (!makeWASocket) {
            await initBaileys();
        }

        // التحقق من وجود جلسة نشطة
        if (activeSessions.has(sessionId)) {
            if (options.forceRestart) {
                const existingSession = activeSessions.get(sessionId);
                activeSessions.delete(sessionId);
                if (existingSession) {
                    cleanupSocketListeners(existingSession.sock);
                    await endSocketQuietly(existingSession.sock, 'Force restarting WhatsApp session');
                    existingSession.sock = null;
                    cleanupSessionState(sessionId, companyId);
                }
            } else {
                console.log(`⚠️ Session ${sessionId} already exists, returning existing session`);
                return activeSessions.get(sessionId);
            }
        }

        clearReconnectTimer(sessionId);

        if (options.resetAuth) {
            await clearDatabaseAuthState(sessionId);
        }

        // تحميل حالة المصادقة من قاعدة البيانات
        const { state, saveCreds } = await useDatabaseAuthState(sessionId);

        // استخدام نسخة الواتساب المدمجة مع نسخة المكتبة المثبتة (متوافقة دائماً مع الكود الفعلي).
        // fetchLatestBaileysVersion تجلب من master برانش — تتسبب في mismatch مع إصدار مثبت ثابت.
        const version = baileysDefaultVersion || [2, 3000, 1043857760];
        console.log(`📦 Using Baileys version: ${version.join('.')}`);

        // إعدادات Socket
        const staleThreshold = parseInt(process.env.STALE_CONNECTION_THRESHOLD_MS || '120000', 10);
        const socketOptions = {
            version,
            auth: state,
            logger: pino({ level: 'fatal' }),
            browser: getSocketBrowser(syncFullHistory),
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
            emitOwnEvents: true,
            markOnlineOnConnect: process.env.WHATSAPP_MARK_ONLINE !== 'false',
            syncFullHistory,
            shouldSyncHistoryMessage: () => syncFullHistory,
            getMessage: async (key) => {
                try {
                    const prisma = getSharedPrismaClient();
                    const msg = await prisma.whatsAppMessage.findUnique({
                        where: { messageId: key.id },
                        select: { metadata: true, content: true, messageType: true, remoteJid: true, fromMe: true }
                    });
                    if (msg?.metadata) {
                        try {
                            const parsed = JSON.parse(msg.metadata);
                            if (parsed && (parsed.key || parsed.message)) return parsed;
                        } catch { /* malformed metadata — fall through to fallback */ }
                    }
                    // Fallback: بناء رسالة صغرى من الحقول المحفوظة حتى يتمكن بايليز
                    // من إعادة الإرسال/الإصلاح (retry) للرسائل الخارجة التي لا تتوفر
                    // لها الـ WAMessage الكاملة في metadata.
                    if (msg?.content && (!msg.messageType || msg.messageType === 'TEXT')) {
                        return {
                            key: { remoteJid: msg.remoteJid || key.remoteJid, fromMe: true, id: key.id },
                            message: { conversation: msg.content },
                            messageTimestamp: Math.floor(Date.now() / 1000)
                        };
                    }
                } catch { /* return undefined */ }
                return undefined;
            },
            cachedGroupMetadata: async (jid) => {
                try {
                    const prisma = getSharedPrismaClient();
                    const session = await prisma.whatsAppSession.findFirst({
                        where: { id: sessionId },
                        select: { metadata: true }
                    });
                    return session?.metadata?.cachedGroups?.[jid] || undefined;
                } catch { return undefined; }
            }
        };

        // إنشاء Socket
        sock = makeWASocket(socketOptions);

        // حفظ الجلسة في الذاكرة
        const sessionData = {
            sock,
            sessionId,
            companyId,
            status: 'connecting',
            qrCode: null,
            pairingCode: null,
            phoneNumber: normalizedPhoneNumber || options.phoneNumber || null,
            usePairingCode,
            syncFullHistory,
            historySync: null,
            isDefault: options.isDefault || false,
            metadata: options.metadata || null,
            loadBalanceWeight: options.loadBalanceWeight || 1,
            createdAt: new Date(),
            lastQRTimestamp: null,
            creds: state.creds,
            saveCreds,
            labels: new Map(), // cache للتصنيفات: labelId -> { id, name, color, deleted, predefinedId }
            labelAssociations: new Map() // labelId -> Set<chatJid>
        };
        activeSessions.set(sessionId, sessionData);
        trackCompanySession(companyId, sessionId);

        WA_LOG.info(sessionId, `Session created for company ${companyId}`, {
            usePairingCode,
            syncFullHistory,
            hasAuthState: !!state?.creds?.registered
        });

        // تحديث حالة قاعدة البيانات إلى CONNECTING
        await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            return await prisma.whatsAppSession.update({
                where: { id: sessionId },
                data: { status: 'CONNECTING', updatedAt: new Date() }
            });
        }, 3);

        // ✅ معالجة Pairing Code
        if (usePairingCode && !state.creds?.registered) {
            try {
                console.log(`📱 Requesting pairing code for: ${normalizedPhoneNumber}`);
                const code = await sock.requestPairingCode(normalizedPhoneNumber);
                sessionData.pairingCode = code;
                sessionData.status = 'pairing_code_pending';
                console.log(`🔢 Pairing code generated: ${code}`);

                // إرسال الكود عبر Socket.IO
                const io = getIO();
                if (io) {
                    io.to(`company_${companyId}`).emit('whatsapp:pairing_code', {
                        sessionId,
                        pairingCode: code,
                        phoneNumber: normalizedPhoneNumber
                    });
                }

                // تحديث قاعدة البيانات
                await safeQuery(async () => {
                    const prisma = getSharedPrismaClient();
                    return await prisma.whatsAppSession.update({
                        where: { id: sessionId },
                        data: {
                            status: 'QR_PENDING',
                            phoneNumber: normalizedPhoneNumber
                        }
                    });
                }, 5);

            } catch (pairingError) {
                console.error('❌ Error requesting pairing code:', pairingError);
                // متابعة الاتصال العادي (QR Code fallback)
            }
        }

        // معالجة أحداث الاتصال
        sock.ev.on('connection.update', async (update) => {
            try {
                await handleConnectionUpdate(sessionId, companyId, update, sock);
            } catch (err) {
                console.error(`❌ [WhatsApp] Critical error in connection.update for ${sessionId}:`, err.message);
            }
        });

        // حفظ بيانات المصادقة مع تحديث الذاكرة
        sock.ev.on('creds.update', (updatedCreds) => {
            const sd = activeSessions.get(sessionId);
            if (sd) {
                sd.creds = updatedCreds;
            }
            saveCreds(updatedCreds);
        });

        // إضافة معالج أخطاء عام
        sock.ev.on('error', (error) => {
            const errMsg = error?.message || error?.toString() || 'Unknown error';
            if (errMsg.includes('Bad MAC')) {
                WA_LOG.error(sessionId, `Bad MAC error detected - auth state compromised, will require relink on next disconnect`);
                logEvent(sessionId, companyId, 'bad_mac_error', { message: errMsg }, 'warning').catch(() => {});
                return;
            }
            WA_LOG.error(sessionId, `Socket error: ${errMsg}`);
            logEvent(sessionId, companyId, 'socket_error', { message: errMsg }, 'error').catch(() => {});
        });

        // معالجة الرسائل الواردة
        sock.ev.on('messages.upsert', async (m) => {
            markSocketActivity(sock);
            try {
                await handleIncomingMessages(sessionId, companyId, m, sock);
            } catch (err) {
                console.error(`❌ [WhatsApp] Critical error in messages.upsert for ${sessionId}:`, err.message);
            }
        });

        sock.ev.on('messaging-history.set', async (history) => {
            markSocketActivity(sock);
            try {
                await enqueueMessagingHistorySet(sessionId, companyId, history, sock);
            } catch (err) {
                console.error(`❌ [WhatsApp] Critical error in messaging-history.set for ${sessionId}:`, err.message);
            }
        });

        // معالجة تحديث حالة الرسائل
        sock.ev.on('messages.update', async (updates) => {
            markSocketActivity(sock);
            await handleMessageStatusUpdate(sessionId, companyId, updates);
        });

        // معالجة تفاعلات الرسائل (Reactions)
        sock.ev.on('messages.reaction', async (reactionUpdates) => {
            markSocketActivity(sock);
            if (!Array.isArray(reactionUpdates)) return;
            for (const r of reactionUpdates) {
                try {
                    const targetId = r.reaction?.key?.id || r.key?.id;
                    const emoji = r.reaction?.text || '';
                    const fromMe = Boolean(r.key?.fromMe);
                    const participant = r.key?.participant || r.participant || null;
                    const jid = r.key?.remoteJid || null;
                    if (targetId) {
                        await WhatsAppReactionService.applyReactionToMessage({
                            sessionId,
                            companyId,
                            remoteJid: jid,
                            targetMessageId: targetId,
                            reactorKey: fromMe ? 'me' : (participant || jid || 'customer'),
                            emoji,
                            fromMe
                        });
                    }
                } catch (err) {
                    console.warn(`⚠️ [WhatsAppManager] Error in messages.reaction for ${sessionId}:`, err.message);
                }
            }
        });

        sock.ev.on('message-receipt.update', async (updates) => {
            markSocketActivity(sock);
            await handleMessageReceiptUpdate(sessionId, companyId, updates);
        });

        // معالجة أحداث المجموعات
        sock.ev.on('groups.update', async (updates) => {
            markSocketActivity(sock);
            await handleGroupsUpdate(sessionId, companyId, updates);
        });

        // معالجة أحداث جهات الاتصال (إضافة وتحديث من Baileys)
        sock.ev.on('contacts.upsert', async (contacts) => {
            markSocketActivity(sock);
            await handleContactsUpsert(sessionId, companyId, contacts);
        });

        // معالجة تحديثات جهات الاتصال
        sock.ev.on('contacts.update', async (updates) => {
            markSocketActivity(sock);
            await handleContactsUpdate(sessionId, companyId, updates);
        });

        // معالجة أحداث الحضور (typing, online, etc.)
        sock.ev.on('presence.update', async (update) => {
            markSocketActivity(sock);
            await handlePresenceUpdate(sessionId, companyId, update);
        });

        // معالجة أحداث المكالمات (Baileys يطلق الحدث باسم 'call' بمصفوفة WACallEvent[])
        sock.ev.on('call', async (calls) => {
            markSocketActivity(sock);
            const callEvents = Array.isArray(calls) ? calls : [calls];
            for (const call of callEvents) {
                if (call) {
                    await handleCallUpdate(sessionId, companyId, call);
                }
            }
        });

        // معالجة أحداث التصنيفات
        sock.ev.on('labels.edit', (label) => {
            const sd = activeSessions.get(sessionId);
            if (!sd) return;
            if (label.deleted) {
                sd.labels.delete(label.id);
            } else {
                sd.labels.set(label.id, { id: label.id, name: label.name, color: label.color, predefinedId: label.predefinedId });
            }
            // 💾 حفظ تعريف التصنيف في الداتابيز عشان يفضل موجود بعد إعادة التشغيل
            persistLabelDefinition(sessionId, label).catch(() => {});
        });

        sock.ev.on('labels.association', ({ type, association }) => {
            const sd = activeSessions.get(sessionId);
            if (!sd) return;
            if (association.type === 'label_jid') {
                if (!sd.labelAssociations.has(association.labelId)) {
                    sd.labelAssociations.set(association.labelId, new Set());
                }
                if (type === 'add') {
                    sd.labelAssociations.get(association.labelId).add(association.chatId);
                } else {
                    sd.labelAssociations.get(association.labelId).delete(association.chatId);
                }
                // 💾 Persist to DB
                persistLabelAssociation(sessionId, association.chatId, association.labelId, type === 'add').catch(() => {});
            }
        });

        return sessionData;
    } catch (error) {
        console.error(`❌ Error creating session ${sessionId}:`, error);

        // 🛡️ PRODUCTION-FIX: Clean up partial session state to prevent memory leak
        // The previous code threw without cleanup, leaving orphaned sockets,
        // 10+ event listeners, and ~2MB of Baileys crypto keys (native Buffers)
        // in closure chains — causing RSS to balloon to 6.2GB over time.
        try {
            activeSessions.delete(sessionId);
            if (sock) {
                cleanupSocketListeners(sock);
                await endSocketQuietly(sock, 'Session creation failed');
            }
        } catch (cleanupErr) {
            console.warn(`⚠️ [WA] Cleanup error during failed session creation:`, cleanupErr.message);
        }
        cleanupSessionState(sessionId, companyId);
        // ⚠️ IMPORTANT: Must also clean up any auth state that was loaded from DB
        if (options?.resetAuth) {
            try { await clearDatabaseAuthState(sessionId); } catch {}
        }

        throw error;
    }
}

/**
 * معالجة تحديثات الاتصال
 */
async function handleConnectionUpdate(sessionId, companyId, update, sock) {
    const { connection, lastDisconnect, qr } = update;
    const io = getIO();

    // التحقق من أن التحديث يأتي من الجلسة النشطة الحالية
    const currentSession = activeSessions.get(sessionId);
    if (!currentSession) {
        WA_LOG.warn(sessionId, `Ignoring connection update for inactive session`);
        return;
    }

    if (currentSession.sock !== sock) {
        WA_LOG.warn(sessionId, `Ignoring connection update from stale socket`);
        return;
    }

    try {
        // إرسال QR Code
        if (qr) {
            const sessionData = activeSessions.get(sessionId);
            const hadQR = sessionData?.qrCode != null;
            const previousQR = sessionData?.qrCode;

            // Only log as 'refresh' if we already had a different QR
            if (hadQR && qr !== previousQR) {
                WA_LOG.event(sessionId, 'qr_refreshed', { reason: 'QR expired, new one generated' });
            } else {
                WA_LOG.event(sessionId, 'qr_generated', { hasQR: true });
            }

            if (sessionData) {
                sessionData.qrCode = qr;
                sessionData.status = 'qr_pending';
                // Reset QR timestamp so the health check can track QR age
                sessionData.lastQRTimestamp = Date.now();
            }

            // تحديث قاعدة البيانات
            await safeQuery(async () => {
                const prisma = getSharedPrismaClient();
                return await prisma.whatsAppSession.update({
                    where: { id: sessionId },
                    data: { status: 'QR_PENDING' }
                });
            }, 5);

            // إرسال QR عبر Socket.IO - إلى company room فقط لمنع التداخل
            if (io) {
                io.to(`company_${companyId}`).emit('whatsapp:qr', {
                    sessionId,
                    qr,
                    refreshed: hadQR ? true : undefined
                });
                WA_LOG.socket(sessionId, `QR Code ${hadQR ? 'refreshed' : 'sent'} to company ${companyId}`);
            } else {
                WA_LOG.warn(sessionId, `Socket.IO not available for QR emission`);
            }

            // تسجيل الحدث
            await logEvent(sessionId, companyId, hadQR ? 'qr_refreshed' : 'qr_generated', { qr: 'generated' });
        }

        // معالجة حالة الاتصال
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const errorMessage = lastDisconnect?.error?.message || '';
            const isManualLogout = manualLogoutSessions.has(sessionId);
            const {
                isBadMac,
                isLoggedOut,
                isForbidden,
                requiresFreshLink,
                shouldReconnect
            } = getDisconnectRecoveryDecision(statusCode, errorMessage, isManualLogout);

            WA_LOG.event(sessionId, 'connection_close', {
                statusCode,
                isBadMac,
                isLoggedOut,
                isForbidden,
                requiresFreshLink,
                shouldReconnect,
                isManualLogout
            });

            // Clear only auth state; keep the DB session so reconnect can show QR on the same record.
            if (requiresFreshLink) {
                const reason = isBadMac ? 'corrupted crypto keys (Bad MAC)' : (isForbidden ? 'forbidden WhatsApp socket (403)' : 'unexpected WhatsApp logout');
                WA_LOG.error(sessionId, `NEEDS RELINK: ${reason}. Resetting auth state.`);
                await clearDatabaseAuthState(sessionId);
            }

            // تحديث الحالة
            const sessionData = activeSessions.get(sessionId);
            if (sessionData) {
                sessionData.status = shouldReconnect ? 'connecting' : (isManualLogout ? 'logged_out' : 'qr_pending');
            }

            // تحديث قاعدة البيانات
            const nextDbStatus = isManualLogout ? 'LOGGED_OUT' : (shouldReconnect ? 'CONNECTING' : 'QR_PENDING');
            await safeQuery(async () => {
                const prisma = getSharedPrismaClient();
                return await prisma.whatsAppSession.update({
                    where: { id: sessionId },
                    data: {
                        status: nextDbStatus,
                        lastDisconnectedAt: new Date()
                    }
                });
            }, 5);

            WA_LOG.event(sessionId, `DB status updated to ${nextDbStatus}`);

            // إرسال حدث الانقطاع - ALWAYS emit, even if no IO
            if (io) {
                io.to(`company_${companyId}`).emit('whatsapp:connection', {
                    sessionId,
                    status: nextDbStatus,
                    reason: statusCode
                });
                WA_LOG.socket(sessionId, `Emitted connection: ${nextDbStatus} to company ${companyId}`);
            }

            // تسجيل الحدث
            await logEvent(sessionId, companyId, isManualLogout ? 'logged_out' : (requiresFreshLink ? 'relink_required' : 'disconnected'), {
                statusCode,
                shouldReconnect,
                isBadMac,
                isForbidden,
                isUnexpectedLoggedOut: isLoggedOut && !isManualLogout
            }, 'warning');

            queueWhatsAppDisconnectAlert({
                sessionId,
                companyId,
                phoneNumber: sessionData?.phoneNumber,
                statusCode,
                errorMessage,
                isBadMac,
                isForbidden,
                isLoggedOut,
                requiresFreshLink,
                shouldReconnect,
                nextDbStatus,
                isManualLogout,
                source: 'connection_update'
            });

            // إعادة الاتصال إذا لزم الأمر
            if (shouldReconnect) {
                WA_LOG.reconnect(sessionId, `Reconnecting after close (shouldReconnect=true)`);
                // 🚨 PRODUCTION-FIX: عداد فشل تراكمي عبر إعادة الإنشاء —
                // لو بلغ السقف نستسلم (مسح auth + QR_PENDING + تنبيه) بدل
                const failureCount = incrementReconnectFailureCount(sessionId);
                if (failureCount >= MAX_RECONNECT_ATTEMPTS) {
                    await giveUpOnReconnect(sessionId, companyId, sessionData?.phoneNumber);
                    return;
                }
                WA_LOG.reconnect(sessionId, `Reconnect failure count ${failureCount}/${MAX_RECONNECT_ATTEMPTS}`);
                if (sessionData?.sock) {
                    cleanupSocketListeners(sessionData.sock);
                    await endSocketQuietly(sessionData.sock, 'Connection closed - reconnecting');
                    sessionData.sock = null;
                }
                if (sessionData) {
                    sessionData.status = 'connecting';
                    sessionData.isReconnecting = true;
                }
                cleanupSessionState(sessionId, companyId);
                // 440 = connectionReplaced, 515 = stream error, 428 = connection closed —
                // تدرج تصاعدي ذكي (Exponential Backoff): يبدأ بـ 5 ثوانٍ ويتصاعد تدريجياً ليتيح وقتاً كافياً لعودة الإنترنت
                const TRANSIENT_CLOSE_CODES = new Set([440, 515, 428, 500, 502, 503, 504]);
                const failureFactor = Math.min(Math.max(0, failureCount - 1), 8);
                const exponentialBase = 5000 * Math.pow(1.35, failureFactor);
                const transientBackoffBase = TRANSIENT_CLOSE_CODES.has(statusCode) ? exponentialBase : Math.max(3000, exponentialBase * 0.7);
                const jitteredBackoff = transientBackoffBase + Math.round(Math.random() * Math.min(transientBackoffBase * 0.3, 2500));
                const reconnectDelay = Math.round(jitteredBackoff);
                requestReconnect(sessionId, companyId, 'socket_close', {}, reconnectDelay);
            } else if (requiresFreshLink) {
                WA_LOG.reconnect(sessionId, `Reconnecting after close (requiresFreshLink=true) - will show QR`);
                const storedPhoneNumber = normalizePhoneNumber(sessionData?.phoneNumber);
                activeSessions.delete(sessionId);
                if (sessionData?.sock) {
                    cleanupSocketListeners(sessionData.sock);
                    await endSocketQuietly(sessionData.sock, 'Connection closed - reconnecting');
                    sessionData.sock = null;
                }
                cleanupSessionState(sessionId, companyId);
                sessionHealthChecks.delete(sessionId);
                scheduleReconnectSession(sessionId, companyId, {
                    resetAuth: true,
                    usePairingCode: false,
                    phoneNumber: storedPhoneNumber || undefined
                }, 1500);
            } else {
                WA_LOG.warn(sessionId, `Session closed without reconnect (manualLogout=${isManualLogout})`);
                if (isManualLogout) {
                    await clearDatabaseAuthState(sessionId);
                    if (io) {
                        io.to(`company_${companyId}`).emit('whatsapp:logged_out', {
                            sessionId,
                            status: 'LOGGED_OUT',
                            reason: statusCode
                        });
                    }
                }

                // 🚨 إنذار فوري: انقطاع رقم الواتساب وتوقف الأتمتة
                try {
                    const systemIncidentAlertService = require('../systemIncidentAlertService');
                    systemIncidentAlertService.dispatchIncident({
                        companyId,
                        incidentType: systemIncidentAlertService.INCIDENT_TYPES.WHATSAPP_DISCONNECTED,
                        title: '🚨 انقطاع اتصال واتساب',
                        message: `انقطع اتصال رقم واتساب ${storedPhoneNumber ? '(' + storedPhoneNumber + ') ' : ''}وتوقفت رسائل الأتمتة والمحادثات. يرجى مسح الـ QR وإعادة الربط فوراً.`,
                        severity: systemIncidentAlertService.SEVERITIES.CRITICAL,
                        entityId: sessionId,
                        url: '/whatsapp',
                        metadata: { sessionId, statusCode, isManualLogout }
                    }).catch(() => {});
                } catch (_) {}

                activeSessions.delete(sessionId);
                sessionHealthChecks.delete(sessionId);
                untrackCompanySession(companyId, sessionId);
            }
        } else if (connection === 'open') {
            WA_LOG.ok(sessionId, `WhatsApp connection OPEN`);
            clearReconnectTimer(sessionId);
            // 🚨 PRODUCTION-FIX: أي اتصال ناجح فعلي يصفّر عداد الفشل التراكمي
            resetReconnectFailures(sessionId);

            // الحصول على معلومات المستخدم
            const user = sock.user;
            const phoneNumber = user?.id?.split(':')[0] || user?.id?.split('@')[0];
            WA_LOG.info(sessionId, `Connected as ${phoneNumber}`, { pushName: user?.name || user?.notify });

            // تحديث الحالة
            const sessionData = activeSessions.get(sessionId);
            const previousStatus = sessionData?.status;
            if (sessionData) {
                sessionData.status = 'connected';
                sessionData.phoneNumber = phoneNumber;
                sessionData.qrCode = null;
                sessionData.pairingCode = null;
            }

            // تحديث قاعدة البيانات
            await safeQuery(async () => {
                const prisma = getSharedPrismaClient();
                return await prisma.whatsAppSession.update({
                    where: { id: sessionId },
                    data: {
                        status: 'CONNECTED',
                        phoneNumber,
                        lastConnectedAt: new Date()
                    }
                });
            }, 5);

            WA_LOG.ok(sessionId, `DB updated to CONNECTED`);

            // ponytail: skip zombie check on first-time pairing (QR/authenticating flow)
            // Only detect zombies during reconnection where auth was previously valid
            if (previousStatus !== 'qr_pending' && previousStatus !== 'QR_PENDING' && previousStatus !== 'pairing_code_pending' && previousStatus !== 'authenticating') {
                const sd = activeSessions.get(sessionId);
                if (sd?.creds && !sd.creds.registered && !sock.user) {
                    WA_LOG.error(sessionId, `ZOMBIE SESSION: connected but registered=false and no sock.user. Auth state lost during crash. Forcing relink.`);
                    await clearDatabaseAuthState(sessionId);
                    if (io) {
                        io.to(`company_${companyId}`).emit('whatsapp:connection', {
                            sessionId,
                            status: 'relink_required',
                            phoneNumber
                        });
                    }
                    await logEvent(sessionId, companyId, 'relink_required', { reason: 'registered_false', phoneNumber }, 'critical');
                    await endSocketQuietly(sock, 'Unregistered session - forcing relink');
                    return;
                }
            }

            // Ensure auth state is saved immediately (critical for first-time pairing)
            const connectedSessionData = activeSessions.get(sessionId);
            if (connectedSessionData?.saveCreds?.flush) {
                connectedSessionData.saveCreds.flush().catch(err => WA_LOG.warn(sessionId, `Auth flush failed: ${err.message}`));
            }

            // ✅ Sync Profile Automatically
            syncProfile(sessionId).catch(err => WA_LOG.warn(sessionId, `Profile sync failed: ${err.message}`));

            // ✅ Fetch missing contact profile pictures in background
            fetchMissingProfilePics(sessionId).catch(err => WA_LOG.warn(sessionId, `Fetch missing profile pics failed: ${err.message}`));

            // ✅ Migrate old history if an older session for same phone number exists
            if (phoneNumber) {
                migrateOldSessionHistory(companyId, phoneNumber, sessionId).catch(err => WA_LOG.warn(sessionId, `History migration failed: ${err.message}`));
            }

            // إرسال حدث الاتصال - ALWAYS emit
            if (io) {
                io.to(`company_${companyId}`).emit('whatsapp:connection', {
                    sessionId,
                    status: 'connected',
                    phoneNumber
                });
                WA_LOG.socket(sessionId, `Emitted CONNECTED to company ${companyId}`);
            } else {
                WA_LOG.warn(sessionId, `Socket.IO not available for connection event`);
            }

            // تسجيل الحدث
            await logEvent(sessionId, companyId, 'connected', { phoneNumber });

            // Also emit to ALL sockets in company (ensure broadcast)
            if (io) {
                io.to(`company_${companyId}`).emit('whatsapp:sessions:status', {
                    sessionId,
                    status: 'connected',
                    phoneNumber
                });
            }
        } else if (connection === 'connecting') {
            WA_LOG.event(sessionId, 'connecting_state_received');
            const sessionData = activeSessions.get(sessionId);
            if (sessionData) {
                const wasAlreadyConnecting =
                    sessionData.status === 'connecting' ||
                    sessionData.status === 'authenticating';
                // If we had QR and now connecting, the user scanned the QR - show "authenticating"
                if (sessionData.status === 'qr_pending' || sessionData.status === 'QR_PENDING') {
                    sessionData.status = 'authenticating';
                    await safeQuery(async () => {
                        const prisma = getSharedPrismaClient();
                        return await prisma.whatsAppSession.update({
                            where: { id: sessionId },
                            data: { status: 'CONNECTING' }
                        });
                    }, 3);
                } else {
                    sessionData.status = 'connecting';
                }
                // 🚨 PRODUCTION-FIX: ما نعملش reset لـ createdAt إلا عند الدخول
                // الفعلي لحالة connecting من حالة أخرى — تكرار حدث connecting أثناء
                // نفس المحاولة كان يخفي الجلسات العالقة عن الفحص الصحي (elapsed دايماً < 120s).
                if (!wasAlreadyConnecting) {
                    sessionData.createdAt = new Date();
                }
            }
            if (io) {
                io.to(`company_${companyId}`).emit('whatsapp:connection', {
                    sessionId,
                    status: sessionData?.status || 'connecting'
                });
            }
        }
    } catch (error) {
        WA_LOG.error(sessionId, `Error handling connection update:`, error.message);
        await logEvent(sessionId, companyId, 'error', { error: error.message }, 'error');
    }
}

async function upsertHistoryContact(sessionId, jid, options = {}) {
    if (!jid || jid === 'status@broadcast' || isJidNewsletter?.(jid)) return null;

    const { normalizedJid, phoneNumber } = normalizeWhatsAppContactIdentity(jid);
    if (!normalizedJid) return null;

    const isGroup = normalizedJid.endsWith('@g.us');
    const displayName = options.name || options.pushName || options.notify || options.verifiedName || null;
    const lastMessageAt = options.lastMessageAt || null;
    const prisma = getSharedPrismaClient();
    const updateData = {
        updatedAt: new Date()
    };

    if (displayName) {
        updateData.pushName = displayName;
        updateData.name = options.name || displayName;
    }

    if (lastMessageAt) {
        const existing = await getSharedPrismaClient().whatsAppContact.findUnique({
            where: { sessionId_jid: { sessionId, jid: normalizedJid } },
            select: { lastMessageAt: true }
        });
        if (!existing?.lastMessageAt || lastMessageAt >= existing.lastMessageAt) {
            updateData.lastMessageAt = lastMessageAt;
        }
    }

    return await prisma.whatsAppContact.upsert({
        where: {
            sessionId_jid: {
                sessionId,
                jid: normalizedJid
            }
        },
        update: updateData,
        create: {
            jid: normalizedJid,
            phoneNumber,
            name: options.name || displayName,
            pushName: displayName,
            lastMessageAt: lastMessageAt || new Date(),
            unreadCount: 0,
            totalMessages: 0,
            isGroup,
            whatsAppSession: {
                connect: { id: sessionId }
            },
            updatedAt: new Date()
        }
    });
}

const HISTORY_BATCH_SIZE = parseInt(process.env.WHATSAPP_HISTORY_BATCH_SIZE || '100', 10);

// Yield to event loop between history batches so the Node.js event loop can breathe
const historyYield = () => new Promise(resolve => setImmediate(resolve));

function normalizeHistoryProgress(progress) {
    if (progress === null || progress === undefined || progress === '') return null;
    const value = Number(progress);
    if (!Number.isFinite(value)) return null;
    return Math.max(0, Math.min(value > 1 ? value : value * 100, 100));
}

const HISTORY_SYNC_REQUEST_TIMEOUT_MS = 120000; // 2 minutes (allows for 30s reconnect cooldown + handshake + WA upload)

function clearHistorySyncRequestTimeout(sessionId) {
    if (historySyncRequestTimers.has(sessionId)) {
        clearTimeout(historySyncRequestTimers.get(sessionId));
        historySyncRequestTimers.delete(sessionId);
    }
}

function scheduleHistorySyncRequestTimeout(sessionId, companyId) {
    clearHistorySyncRequestTimeout(sessionId);
    const timer = setTimeout(async () => {
        historySyncRequestTimers.delete(sessionId);
        try {
            const prisma = getSharedPrismaClient();
            const imp = await prisma.whatsAppSessionHistoryImport.findUnique({
                where: { sessionId },
                select: { status: true }
            });
            // إذا استمرت الحالة REQUESTED بعد 60 ثانية (واتساب لم يرسل حزم تاريخ)، ننهي الطلب بسلام
            if (imp && imp.status === 'REQUESTED') {
                const sessionData = activeSessions.get(sessionId);
                if (sessionData) sessionData.syncFullHistory = false;

                await prisma.whatsAppSessionHistoryImport.update({
                    where: { sessionId },
                    data: {
                        status: 'COMPLETED',
                        completedAt: new Date(),
                        lastProgress: 100,
                        lastError: 'خوادم واتساب لم ترسل حزم تاريخ إضافية لهذه الجلسة المربوطة مسبقاً.'
                    }
                });

                const io = getIO();
                io?.to(`company_${companyId}`).emit('whatsapp:history_sync', {
                    sessionId,
                    status: 'COMPLETED',
                    progress: 100,
                    isLatest: true
                });
                console.log(`⏱️ [HISTORY] Safety timeout: Session ${sessionId} requested history but WhatsApp servers sent no history. Marked completed.`);
            }
        } catch (e) {
            console.warn(`⚠️ [HISTORY] Safety timeout check failed for ${sessionId}:`, e.message);
        }
    }, HISTORY_SYNC_REQUEST_TIMEOUT_MS);

    historySyncRequestTimers.set(sessionId, timer);
}

function enqueueMessagingHistorySet(sessionId, companyId, history, sock) {
    clearHistorySyncRequestTimeout(sessionId);

    const previous = historySyncQueues.get(sessionId) || Promise.resolve();
    const next = previous
        .catch(() => {})
        .then(() => handleMessagingHistorySet(sessionId, companyId, history, sock));

    historySyncQueues.set(sessionId, next);
    next.finally(() => {
        if (historySyncQueues.get(sessionId) === next) {
            historySyncQueues.delete(sessionId);
            if (historySyncCompletionRequested.delete(sessionId)) {
                // مهلة استقرار قصيرة (2 ثانية) لضمان عدم وصول حزم تالية مثل PUSH_NAME أو RECENT
                setTimeout(() => {
                    if (!historySyncQueues.has(sessionId)) {
                        void finalizeHistoryImport(sessionId, companyId).catch((error) => {
                            console.error(`❌ [HISTORY] Failed to finalize import for ${sessionId}:`, error.message);
                        });
                    }
                }, 2000);
            }
        }
    }).catch(() => {});

    return next;
}

/**
 * 🚨 PRODUCTION-FIX (2026-08-31): حارس الـ HistoryImport العالق.
 * أي import واقف في IN_PROGRESS/REQUESTED من غير تحديث لمدة > ساعة بيفعّل
 * syncFullHistory مع كل reconnect (تحميل كل التاريخ + صور البروفايل بشكل
 * متكرر) → CPU/ذاكرة عالية → ريستارت دوري للـ backend. الحارس بيمرّنهم
 * لـ COMPLETED تلقائياً عشان الـ reconnect يبطل يفعّل الـ full sync.
 */
async function healStuckHistoryImports({ force = false } = {}) {
    const now = Date.now();
    if (!force && now - lastHistoryImportHealRun < HISTORY_IMPORT_HEAL_COOLDOWN_MS) {
        return { healed: 0, skippedCooldown: true };
    }
    lastHistoryImportHealRun = now;

    try {
        const prisma = getSharedPrismaClient();
        const stuckCutoff = new Date(now - HISTORY_IMPORT_STUCK_THRESHOLD_MS);

        const healed = await prisma.whatsAppSessionHistoryImport.updateMany({
            where: {
                status: { in: ['IN_PROGRESS', 'REQUESTED'] },
                updatedAt: { lt: stuckCutoff }
            },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                lastProgress: 100,
                lastError: 'AUTO-HEALED: stuck history import older than 1h was force-completed to stop reconnect full-history-sync loop (2026-08-31 fix).',
                updatedAt: new Date()
            }
        });

        if (healed.count > 0) {
            console.warn(`🩹 [WA-HEAL] Force-completed ${healed.count} stuck history import(s) older than 1h (stopped reconnect full-history-sync loop)`);
        }
        return { healed: healed.count, skippedCooldown: false };
    } catch (error) {
        console.warn(`⚠️ [WA-HEAL] Stuck history import heal failed: ${error.message}`);
        return { healed: 0, error: error.message };
    }
}

async function finalizeHistoryImport(sessionId, companyId) {
    const sessionData = activeSessions.get(sessionId);
    if (sessionData) sessionData.syncFullHistory = false;

    const prisma = getSharedPrismaClient();
    const session = await prisma.whatsAppSession.findUnique({
        where: { id: sessionId },
        select: { metadata: true }
    });
    await prisma.$transaction([
        prisma.whatsAppSessionHistoryImport.update({
            where: { sessionId },
            data: { status: 'COMPLETED', completedAt: new Date(), lastProgress: 100 }
        }),
        prisma.whatsAppSession.update({
            where: { id: sessionId },
            data: {
                metadata: JSON.stringify({
                    ...parseJsonSafely(session?.metadata, {}),
                    importHistoryOnLink: false,
                    historySyncedAt: new Date().toISOString()
                }),
                updatedAt: new Date()
            }
        })
    ]);
    void syncPendingHistoryMedia(sessionId, companyId).catch((mediaError) => {
        console.warn(`⚠️ [HISTORY] Media sync could not start for ${sessionId}:`, mediaError.message);
    });
}

async function handleMessagingHistorySet(sessionId, companyId, history, sock) {
    const sessionData = activeSessions.get(sessionId);
    if (!sessionData?.syncFullHistory) {
        return;
    }

    const messages = Array.isArray(history?.messages) ? history.messages : [];
    const chats = Array.isArray(history?.chats) ? history.chats : [];
    const contacts = Array.isArray(history?.contacts) ? history.contacts : [];
    const io = getIO();
    const summary = {
        syncType: history?.syncType,
        progress: history?.progress,
        isLatest: history?.isLatest,
        messages: messages.length,
        chats: chats.length,
        contacts: contacts.length
    };

    console.log(`📜 [WHATSAPP-HISTORY] Importing history for session ${sessionId}:`, summary);
    sessionData.historySync = { ...summary, updatedAt: new Date() };

    // ====== Sprint 2: Durable Import Lifecycle ======
    const prisma = getSharedPrismaClient();
    try {
        await prisma.$transaction(async (tx) => {
            const imp = await tx.whatsAppSessionHistoryImport.findUnique({
                where: { sessionId }
            });
            if (imp && !['REQUESTED', 'IN_PROGRESS'].includes(imp.status)) {
                console.log(`⏭️ [HISTORY] Session ${sessionId} history import status is ${imp.status}, skipping batch`);
                throw new Error('__SKIP_BATCH__');
            }
            if (!imp || imp.status === 'NOT_REQUESTED') {
                await tx.whatsAppSessionHistoryImport.upsert({
                    where: { sessionId },
                    create: { sessionId, status: 'IN_PROGRESS', startedAt: new Date(), requestedAt: new Date() },
                    update: { status: 'IN_PROGRESS', startedAt: new Date(), lastError: null }
                });
            } else if (imp.status === 'REQUESTED') {
                await tx.whatsAppSessionHistoryImport.update({
                    where: { sessionId },
                    data: { status: 'IN_PROGRESS', startedAt: new Date(), lastError: null }
                });
            }
        });
    } catch (e) {
        if (e.message === '__SKIP_BATCH__') return;
        throw e;
    }
    // ====== End Sprint 2 ======

    // تجميع كل mappings المتاحة من جميع المصادر (protobuf + contacts + chats + messages):
    const allLidMappings = [...(history?.phoneNumberToLidMappings || [])];

    for (const c of contacts) {
        if (!c) continue;
        const phone = isPhoneJid(c.id) ? c.id : (isPhoneJid(c.jid) ? c.jid : (isPhoneJid(c.pn) ? c.pn : null));
        const lid = isLinkedDeviceJid(c.lid) ? c.lid : (isLinkedDeviceJid(c.id) ? c.id : null);
        if (phone && lid) {
            allLidMappings.push({ pnJid: phone, lidJid: lid });
        }
    }

    for (const chat of chats) {
        if (!chat) continue;
        const phone = isPhoneJid(chat.id) ? chat.id : (isPhoneJid(chat.pnJid) ? chat.pnJid : (isPhoneJid(chat.lidJid) ? chat.lidJid : null));
        const lid = isLinkedDeviceJid(chat.lidJid) ? chat.lidJid : (isLinkedDeviceJid(chat.id) ? chat.id : null);
        if (phone && lid) {
            allLidMappings.push({ pnJid: phone, lidJid: lid });
        }
    }

    for (const msg of messages) {
        if (!msg) continue;
        const remote = msg.key?.remoteJid;
        const senderPn = msg.key?.senderPn || msg.participantPn;
        if (remote && isLinkedDeviceJid(remote) && senderPn && isPhoneJid(senderPn)) {
            allLidMappings.push({ pnJid: senderPn, lidJid: remote });
        }
    }

    // بناء mapping من LID → رقم تلفون (من protobuf والمصادر المستخرجة)
    const lidToPhoneMap = await persistHistoryLidMappings(sessionId, allLidMappings);
    if (Object.keys(lidToPhoneMap).length > 0) {
        console.log(`📜 [WHATSAPP-HISTORY] Found ${Object.keys(lidToPhoneMap).length} LID→Phone mappings`);
    }

    // نخزن بس الـ chats اللي عندهم timestamp (محادثات حقيقية) — مش address book
    const contactsByJid = {};
    for (const c of contacts) {
        if (c.id) contactsByJid[c.id] = c;
        if (c.lid) contactsByJid[c.lid] = c;
    }
    let importedChats = 0;
    for (const chat of chats) {
        const chatTimestamp = chat.conversationTimestamp || chat.lastMessageRecvTimestamp;
        if (!chatTimestamp) continue;
        const targetChatJid = lidToPhoneMap[chat.id] || chat.id;
        const contactMeta = contactsByJid[chat.id] || contactsByJid[chat.lidJid] || contactsByJid[targetChatJid] || {};
        try {
            await upsertHistoryContact(sessionId, targetChatJid, {
                name: contactMeta.name || chat.name || contactMeta.notify || contactMeta.verifiedName,
                lastMessageAt: timestampToDate(chatTimestamp)
            });
            importedChats++;
        } catch (error) {
            console.warn(`⚠️ Failed to import WhatsApp history chat for ${sessionId}:`, error.message);
        }
    }

    // تخزين جهات اتصال الـ history المرتبطة بمحادثات فعلية أو رسائل
    // لتفادي إغراق قاعدة البيانات بآلاف جهات الاتصال غير النشطة من دفتر الهاتف
    const activeJids = new Set([
        ...chats.map(c => c.id).filter(Boolean),
        ...messages.map(m => m.key?.remoteJid).filter(Boolean),
        ...messages.map(m => m.key?.participant || m.participant).filter(Boolean)
    ]);

    let importedContacts = 0;
    const contactImportQueue = [];
    for (const c of contacts) {
        const contactJid = c.id || c.lid;
        if (!contactJid || contactJid === 'status@broadcast' || isJidNewsletter?.(contactJid)) continue;
        if (!activeJids.has(contactJid) && !activeJids.has(c.id) && !activeJids.has(c.lid)) continue;

        const targetContactJid = lidToPhoneMap[contactJid] || contactJid;
        contactImportQueue.push(() => upsertHistoryContact(sessionId, targetContactJid, {
            name: c.name || c.notify || c.verifiedName
        }));
    }
    for (let i = 0; i < contactImportQueue.length; i += HISTORY_BATCH_SIZE) {
        const chunk = contactImportQueue.slice(i, i + HISTORY_BATCH_SIZE);
        const results = await Promise.allSettled(chunk.map(run => run()));
        importedContacts += results.filter(r => r.status === 'fulfilled').length;
        await historyYield();
    }
    if (importedContacts > 0) {
        console.log(`📜 [WHATSAPP-HISTORY] Imported ${importedContacts} active contact names for session ${sessionId}`);
    }

    // ====== Sprint 3: Batch processing with bounded chunks ======
    const totalMessages = messages.length;
    let batchStart = 0;
    let batchNumber = 0;
    let totalImported = 0;
    let totalUnsupported = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    let cumulativeDurationMs = 0;

    while (batchStart < totalMessages) {
        const batchEnd = Math.min(batchStart + HISTORY_BATCH_SIZE, totalMessages);
        const batch = messages.slice(batchStart, batchEnd);
        batchNumber++;
        const batchStartTime = Date.now();

        try {
            const batchResult = await handleIncomingMessages(sessionId, companyId, {
                messages: batch,
                type: 'append',
                lidToPhoneMap
            }, sock, {
                importHistory: true,
                skipRealtimeEvents: true,
                skipNotifications: true,
                skipAI: true,
                skipCrmSync: true,
                skipMediaDownload: true
            });

            const batchDuration = Date.now() - batchStartTime;
            cumulativeDurationMs += batchDuration;
            totalImported += batchResult.created;
            totalUnsupported += batchResult.unsupported;
            totalSkipped += batchResult.skipped;
            totalFailed += batchResult.failed;
            const progress = totalMessages > 0 ? Math.min(batchEnd / totalMessages, 1.0) : 1.0;

            // Aggregate telemetry لكل batch بدل per-message logs
            console.log(`📊 [HISTORY-BATCH] session=${sessionId} batch=${batchNumber}/${Math.ceil(totalMessages / HISTORY_BATCH_SIZE)} received=${batch.length} created=${batchResult.created} total=${totalImported} progress=${(progress * 100).toFixed(1)}% duration=${batchDuration}ms`);

            // تحديث counters في DB بعد كل batch
            try {
                await prisma.whatsAppSessionHistoryImport.update({
                    where: { sessionId },
                    data: {
                        importedMessages: { increment: batchResult.created },
                        unsupportedMessages: { increment: batchResult.unsupported },
                        skippedMessages: { increment: batchResult.skipped },
                        failedMessages: { increment: batchResult.failed },
                        lastProgress: normalizeHistoryProgress(history?.progress) ?? (progress * 100)
                    }
                });
            } catch (counterErr) {
                console.warn(`⚠️ [HISTORY] Failed to update batch counters for ${sessionId}:`, counterErr.message);
            }

            // Yield للـ event loop
            await historyYield();
        } catch (batchErr) {
            console.error(`❌ [HISTORY] Batch ${batchNumber} failed for session ${sessionId}:`, batchErr.message);
            await prisma.whatsAppSessionHistoryImport.update({
                where: { sessionId },
                data: { status: 'FAILED', failedAt: new Date(), lastError: `Batch ${batchNumber} failed: ${batchErr.message?.substring(0, 200)}` }
            }).catch(() => {});
            return; // لا نكمل باقي الـ batches
        }

        batchStart = batchEnd;
    }
    // ====== End Sprint 3 ======

    io?.to(`company_${companyId}`).emit('whatsapp:history_sync', {
        sessionId,
        ...summary
    });

    // ====== Sprint 2: تحديث counters + completion (final update) ======
    try {
        await prisma.whatsAppSessionHistoryImport.update({
            where: { sessionId },
            data: {
                chatsCount: { increment: importedChats },
                contactsCount: { increment: importedChats },
                lastProgress: history?.isLatest ? 100 : (normalizeHistoryProgress(history?.progress) ?? 0)
            }
        });

        if (history?.isLatest) {
            console.log(`✅ [HISTORY] Session ${sessionId} final batch received: ${totalMessages} msgs in ${batchNumber} batches, ${cumulativeDurationMs}ms total`);
            historySyncCompletionRequested.add(sessionId);
        }
    } catch (error) {
        console.error(`❌ [HISTORY] Failed to update import state for ${sessionId}:`, error.message);
        try {
            await prisma.whatsAppSessionHistoryImport.update({
                where: { sessionId },
                data: { status: 'FAILED', failedAt: new Date(), lastError: error.message?.substring(0, 500) }
            });
        } catch (e2) {
            console.error(`❌ [HISTORY] Failed to mark import as FAILED for ${sessionId}:`, e2.message);
        }
    }

    await logEvent(sessionId, companyId, 'history_sync_imported', summary);
}

/**
 * معالجة الرسائل الواردة
 */
async function handleIncomingMessages(sessionId, companyId, m, sock, options = {}) {
    const { messages, type, lidToPhoneMap } = m;
    const io = getIO();
    const importHistory = Boolean(options.importHistory);
    const result = { created: 0, unsupported: 0, skipped: 0, failed: 0 };

    if (!Array.isArray(messages) || messages.length === 0) return result;

    for (const msg of messages) {
        try {
            let remoteJid = msg.key.remoteJid;
            const fromMe = Boolean(msg.key.fromMe);
            const messageId = msg.key.id;
            // في إصدارات Baileys الحديثة قد يكون راسل رسالة الجروب في msg.participant (المستوى الأعلى)
            // بدلاً من msg.key.participant — نقرأ من الاتنين لنضمن تخزين الراسل دائماً.
            const messageParticipant = msg?.key?.participant || msg?.participant || null;

            // Move messageId check BEFORE the upsert-type gate so we can feed it to the filter.
            if (!messageId) {
                console.warn(`⚠️ Skipping WhatsApp message without id in session ${sessionId}`);
                result.skipped++;
                continue;
            }

            if (!(await shouldProcessMessageUpsertType(type, fromMe, messageId, { importHistory }))) {
                result.skipped++;
                continue;
            }

            if (!shouldProcessIncomingMessage(msg)) {
                console.warn(`⚠️ Skipping WhatsApp message with future timestamp in session ${sessionId}`);
                result.skipped++;
                continue;
            }

            const messageTimestampSeconds = getIncomingMessageTimestampSeconds(msg) || (Date.now() / 1000);
            const messageTimestamp = new Date(messageTimestampSeconds * 1000);

            // DEBUG: Log incoming message key — opt-in عبر env flag بس.
            // كان بيـ INSERT row في whatsAppEventLog على كل رسالة (حمل على الـ DB في البرودكشن).
            // فعّله فقط عند الحاجة للـ debugging: WHATSAPP_DEBUG_INCOMING_EVENTS=true
            if (!importHistory && toBooleanOption(process.env.WHATSAPP_DEBUG_INCOMING_EVENTS)) {
                await logEvent(sessionId, companyId, 'debug_incoming_msg', {
                    key: msg.key,
                    pushName: msg.pushName
                });
            }

            // Handle @lid (Linked Device ID) by folding it into the phone JID when we know the mapping.
            if (remoteJid && isLinkedDeviceJid(remoteJid)) {
                const lidJid = normalizeWhatsAppContactIdentity(remoteJid).normalizedJid;
                // 1. Use official PhoneNumberToLIDMapping from WhatsApp protobuf (fastest, most reliable)
                const mappedPhone =
                    lidToPhoneMap?.[lidJid] ||
                    lidToPhoneMap?.[remoteJid] ||
                    await getPersistedLidMapping(sessionId, lidJid);
                if (mappedPhone) {
                    await mergeLinkedDeviceConversation(sessionId, lidJid, mappedPhone, {
                        pushName: msg.pushName
                    });
                    remoteJid = mappedPhone;
                } else {
                    // 2. Fall back to heuristic search in message metadata
                    const resolvedJid = await resolveLinkedDeviceRemoteJid(sessionId, remoteJid, msg, { fromMe });
                    if (resolvedJid && resolvedJid !== lidJid) {
                        await mergeLinkedDeviceConversation(sessionId, lidJid, resolvedJid, {
                            pushName: msg.pushName
                        });
                        remoteJid = resolvedJid;
                    } else if (fromMe) {
                        console.log(`⚠️ Outgoing message to unresolved LID ${remoteJid}. Keeping LID until a phone mapping is known.`);
                    } else {
                        // 🌟 Store with LID so incoming customer message is NOT lost, will merge when phone mapping arrives
                        console.log(`ℹ️ Incoming message from LID ${remoteJid}. Storing with LID until phone mapping is resolved.`);
                    }
                }
            }

            // Normalize JID (only for non-group, non-broadcast, and already valid-looking JIDs)
            if (remoteJid && !remoteJid.includes('@g.us') && remoteJid !== 'status@broadcast' && isPhoneJid(remoteJid)) {
                remoteJid = normalizePhoneJid(remoteJid);
            }

            // معالجة رسائل الحالة (Status Updates)
            if (remoteJid === 'status@broadcast') {
                console.log('📸 Received status update');
                await handleStatusUpdate(sessionId, companyId, msg, sock);
                continue;
            }

            // استخراج ربط الأرقام والأسماء من رسائل النظام/الـ Stubs (مثل تغيير الرقم أو اسم المستخدم)
            if (msg.messageStubType) {
                try {
                    const stubType = String(msg.messageStubType);
                    const stubs = Array.isArray(msg.messageStubParameters) ? msg.messageStubParameters : [];
                    if (stubType === 'INDIVIDUAL_CHANGE_NUMBER' || stubType === '28') {
                        const stubLid = stubs[0];
                        const stubPhone = stubs[1];
                        if (stubLid && stubLid.includes('@lid') && stubPhone && stubPhone.includes('@s.whatsapp.net')) {
                            await persistHistoryLidMappings(sessionId, [{ pnJid: stubPhone, lidJid: stubLid }]);
                            await mergeLinkedDeviceConversation(sessionId, stubLid, stubPhone, { pushName: msg.pushName });
                        }
                    } else if (stubType === 'CHANGE_USERNAME' || stubType === '213') {
                        const stubLid = stubs[2] || remoteJid;
                        let rawName = stubs[3] || stubs[1] || '';
                        rawName = String(rawName).replace(/^[~ \s]+/, '').trim();
                        if (stubLid && rawName) {
                            await getSharedPrismaClient().whatsAppContact.updateMany({
                                where: {
                                    sessionId,
                                    jid: stubLid,
                                    OR: [
                                        { name: null },
                                        { name: { startsWith: 'اتصال واتساب' } }
                                    ]
                                },
                                data: { name: rawName, pushName: rawName }
                            });
                        }
                    }
                } catch (stubErr) {
                    console.warn('⚠️ Error parsing message stub in handleIncomingMessages:', stubErr.message);
                }
            }

            // استخراج محتوى الرسالة
            const messageContent = await extractMessageContent(msg, sock, sessionId, {
                skipMediaDownload: Boolean(options.skipMediaDownload)
            });
            if (!messageContent) {
                // Handle REVOKE (delete-for-everyone) و edits — وصلوا كرسائل protocolMessage/مخفية
                const proto = msg?.message?.protocolMessage;
                if (proto) {
                    if (proto.type === MessageProtocolType?.REVOKE) {
                        const revokedId = proto.key?.id || msg.key?.id;
                        if (revokedId) {
                            await handleRevokedMessage(sessionId, companyId, revokedId, remoteJid);
                        }
                        result.skipped++;
                        continue;
                    }
                    if (proto.type === MessageProtocolType?.MESSAGE_EDIT) {
                        const editedId = msg.key?.id || proto.key?.id;
                        if (editedId) {
                            await handleEditedMessage(sessionId, companyId, editedId, remoteJid, proto.message || msg.message);
                        }
                        result.skipped++;
                        continue;
                    }
                }
                // edits ممكن توصل كرسالة فيها messageSecret (من غير protocolMessage)
                if (msg?.message?.messageContextInfo?.messageSecret) {
                    const editedId = msg.key?.id;
                    if (editedId) {
                        await handleEditedMessage(sessionId, companyId, editedId, remoteJid, msg.message);
                    }
                    result.skipped++;
                    continue;
                }

                if (importHistory) {
                    const prisma = getSharedPrismaClient();
                    const isHidden = isHistorySystemMessage(msg);
                    const existingMsg = await prisma.whatsAppMessage.findUnique({
                        where: { messageId },
                        select: { id: true }
                    });
                    const isNew = !existingMsg;
                    await prisma.whatsAppMessage.upsert({
                        where: { messageId },
                        update: {
                            remoteJid,
                            fromMe,
                            messageType: isHidden ? 'HISTORY_SYSTEM' : 'UNSUPPORTED',
                            content: isHidden ? null : 'رسالة غير مدعومة',
                            isHidden,
                            metadata: JSON.stringify(msg),
                            updatedAt: new Date()
                        },
                        create: {
                            sessionId,
                            messageId,
                            remoteJid,
                            fromMe,
                            messageType: isHidden ? 'HISTORY_SYSTEM' : 'UNSUPPORTED',
                            content: isHidden ? null : 'رسالة غير مدعومة',
                            isHidden,
                            metadata: JSON.stringify(msg),
                            timestamp: messageTimestamp,
                            status: fromMe ? 'SENT' : 'DELIVERED',
                            updatedAt: new Date()
                        }
                    });
                    if (!isHidden) {
                        await updateOrCreateContact(sessionId, remoteJid, msg, sock, {
                            isOutgoing: fromMe,
                            suppressUnread: true,
                            incrementCounters: isNew,
                            lastMessageAt: messageTimestamp,
                            lastMessagePreview: 'رسالة غير مدعومة',
                            skipProfilePic: true
                        });
                        result.unsupported += isNew ? 1 : 0;
                    }
                    result.created += isNew ? 1 : 0;
                }
                continue;
            }

            const messageStatusFromPayload = getMessageStatusFromBaileysStatus(msg.status);
            const initialMessageStatus = messageStatusFromPayload || (fromMe ? 'SENT' : 'DELIVERED');

            // console.log(`📩 New message in session ${sessionId}: ${messageContent.type} from ${remoteJid}`);

            // حفظ الرسالة في قاعدة البيانات
            const prisma = getSharedPrismaClient();
            const existingMessage = await prisma.whatsAppMessage.findUnique({
                where: { messageId },
                select: { id: true }
            });
            const isNewMessage = !existingMessage;

            // استخراج اسم العميل تلقائياً من رسائل التأكيد الإدارية (مثل "تم تسجيل حضورك بنجاح Menna!")
            if (fromMe && messageContent?.text && remoteJid) {
                try {
                    const match = messageContent.text.match(/تم تسجيل حضورك بنجاح\s+([^\n!.]+)/);
                    if (match && match[1]) {
                        const extractedName = match[1].trim();
                        if (extractedName && extractedName.length >= 2) {
                            await prisma.whatsAppContact.updateMany({
                                where: {
                                    sessionId,
                                    jid: remoteJid,
                                    OR: [
                                        { name: null },
                                        { name: { startsWith: 'اتصال واتساب' } }
                                    ]
                                },
                                data: { name: extractedName }
                            });
                        }
                    }
                } catch (e) {}
            }

            // إذا كانت رسالة صادرة ومحفوظة مسبقاً عبر WhatsAppMessageHandler، نتخطى التكرار
            // لتفادي مضاعفة عمليات قاعدة البيانات وأحداث السوكيت الناتجة عن emitOwnEvents: true
            if (fromMe && !isNewMessage && !importHistory) {
                result.skipped++;
                continue;
            }

            const savedMessage = await prisma.whatsAppMessage.upsert({
                where: { messageId },
                update: {
                    remoteJid,
                    fromMe,
                    messageType: messageContent.type,
                    content: messageContent.text,
                    interactiveData: messageContent.interactiveData ? (typeof messageContent.interactiveData === 'string' ? messageContent.interactiveData : JSON.stringify(messageContent.interactiveData)) : undefined,
                    mediaUrl: messageContent.mediaUrl,
                    mediaType: messageContent.mediaType,
                    mediaMimeType: messageContent.mimetype,
                    mediaFileName: messageContent.fileName,
                    quotedMessageId: messageContent.quotedId,
                    quotedContent: messageContent.quotedText,
                    metadata: JSON.stringify(msg),
                    participant: messageParticipant, // تحديث المشارك
                    updatedAt: new Date()
                },
                create: {
                    sessionId,
                    remoteJid,
                    messageId,
                    fromMe,
                    participant: messageParticipant, // حفظ المشارك
                    messageType: messageContent.type,
                    content: messageContent.text,
                    interactiveData: messageContent.interactiveData ? (typeof messageContent.interactiveData === 'string' ? messageContent.interactiveData : JSON.stringify(messageContent.interactiveData)) : null,
                    mediaUrl: messageContent.mediaUrl,
                    mediaType: messageContent.mediaType,
                    mediaMimeType: messageContent.mimetype,
                    mediaFileName: messageContent.fileName,
                    quotedMessageId: messageContent.quotedId,
                    quotedContent: messageContent.quotedText,
                    timestamp: messageTimestamp,
                    status: initialMessageStatus,
                    metadata: JSON.stringify(msg),
                    updatedAt: new Date()
                }
            });
            result.created += isNewMessage ? 1 : 0;

            if (messageStatusFromPayload) {
                const updatedCount = await updateMessageDeliveryStatus(messageId, messageStatusFromPayload);
                if (updatedCount > 0) {
                    savedMessage.status = messageStatusFromPayload;
                }
            }

            // إذا كانت الرسالة تفاعلاً (REACTION)، نطبّق التفاعل على الرسالة الأصلية
            if (messageContent.type === 'REACTION' && messageContent.quotedId) {
                try {
                    await WhatsAppReactionService.applyReactionToMessage({
                        sessionId,
                        companyId,
                        remoteJid,
                        targetMessageId: messageContent.quotedId,
                        reactorKey: fromMe ? 'me' : (messageParticipant || remoteJid || 'customer'),
                        emoji: messageContent.text,
                        fromMe
                    });
                } catch (rxErr) {
                    console.warn(`⚠️ [WhatsAppManager] Error applying reaction to target message:`, rxErr.message);
                }
            }

            // ✅ SYNC TO MAIN CRM (Persistent Storage)
            let syncedCustomer = null;
            let syncedConversation = null;
            if (!options.skipCrmSync) {
                try {
                    const syncResult = await WhatsAppSyncService.syncMessage(
                        companyId,
                        sessionId,
                        remoteJid,
                        {
                            messageId,
                            type: messageContent.type,
                            content: messageContent.text,
                            mediaUrl: messageContent.mediaUrl,
                            mediaType: messageContent.mediaType,
                            mediaMimeType: messageContent.mimetype,
                            mediaFileName: messageContent.fileName,
                            timestamp: messageTimestamp,
                            pushName: msg.pushName
                        },
                        !fromMe, // isIncoming
                        isNewMessage
                    );
                    syncedCustomer = syncResult?.customer;
                    syncedConversation = syncResult?.conversation;
                } catch (syncErr) {
                    console.error('Failed to sync incoming message to CRM:', syncErr);
                }
            }

            // تحديث أو إنشاء جهة الاتصال
            const previewText = messageContent.text || (messageContent.type === 'AUDIO' ? '🎵 رسالة صوتية' : messageContent.type === 'IMAGE' ? '🖼️ صورة' : messageContent.type === 'VIDEO' ? '🎬 فيديو' : messageContent.type === 'DOCUMENT' ? '📄 مستند' : messageContent.type);
            const contact = await updateOrCreateContact(sessionId, remoteJid, msg, sock, {
                isOutgoing: fromMe,
                customerId: syncedCustomer?.id,
                suppressUnread: importHistory || !isNewMessage,
                incrementCounters: isNewMessage,
                lastMessageAt: messageTimestamp,
                lastMessagePreview: previewText,
                skipProfilePic: importHistory
            });

            // إذا كانت رسالة مجموعة، نحفظ المرسل كجهة اتصال أيضاً
            // (بدون جلب صورة البروفايل في كل رسالة — الأداء أولاً)
            if (remoteJid.endsWith('@g.us') && messageParticipant && !fromMe) {
                try {
                    await updateOrCreateContact(sessionId, messageParticipant, msg, sock, {
                        isOutgoing: false,
                        isGroupParticipant: true,
                        incrementCounters: false, // ألا يظهر عضو الجروب في قائمة المحادثات
                        skipProfilePic: true, // لا نجلب صور البروفايل لكل عضو في كل رسالة
                        // نحفظ المرسل حتى أثناء استيراد التاريخ ليظهر اسمه في رسائل الجروبات
                    });
                } catch (e) {
                    console.warn(`⚠️ Failed to upsert group participant contact ${messageParticipant}:`, e.message);
                }
            }

            if (!options.skipRealtimeEvents && isNewMessage) {
                // إرسال الرسالة عبر Socket.IO
                // console.log(`🔌 [DEBUG] Emitting whatsapp:message:new to company_${companyId}`, {
                //     sessionId,
                //     messageId: savedMessage.id
                // });
                const audience = await getConversationAudience({
                    companyId,
                    sessionId,
                    conversationId: syncedConversation?.id || null,
                    remoteJid
                });

                emitToAudience(io, {
                    companyId,
                    userIds: audience.userIds,
                    eventName: fromMe ? 'whatsapp:message:sent' : 'whatsapp:message:new',
                    payload: {
                        sessionId,
                        message: savedMessage,
                        contact,
                        conversationId: syncedConversation?.id || null,
                        raw: msg
                    },
                    fallbackToCompany: true
                });
            }

            // 🔔 إنشاء إشعار للرسالة الجديدة (فقط للرسائل الواردة)
            if (!fromMe && !options.skipNotifications && isNewMessage) {
                try {
                    // جلب إعدادات الإشعارات
                    const settings = await executeWithRetry(async () => {
                        const prisma = getSharedPrismaClient();
                        return await prisma.whatsAppSettings.findUnique({
                            where: { companyId }
                        });
                    });

                    // الإشعارات مفعلة افتراضياً إذا لم تكن موجودة
                    const notificationsEnabled = settings?.browserNotifications !== false;
                    const soundEnabled = settings?.notificationSound !== false;

                    const contactName = contact?.name || contact?.pushName || remoteJid.split('@')[0];
                    const notificationContent = messageContent.text
                        ? (messageContent.text.length > 50 ? messageContent.text.substring(0, 50) + '...' : messageContent.text)
                        : (messageContent.type === 'IMAGE' ? '📷 صورة' :
                            messageContent.type === 'VIDEO' ? '🎥 فيديو' :
                                messageContent.type === 'AUDIO' ? '🎵 صوت' :
                                    messageContent.type === 'DOCUMENT' ? '📎 ملف' : 'رسالة جديدة');

                    // إنشاء إشعار في قاعدة البيانات إذا كانت الإشعارات مفعلة
                    if (notificationsEnabled) {
                        try {
                            const notifData = JSON.stringify({
                                sessionId,
                                messageId: savedMessage.id,
                                remoteJid,
                                contactId: contact?.id,
                                messageType: messageContent.type
                            });

                            await getSharedPrismaClient().notification.create({
                                data: {
                                    companyId,
                                    userId: null,
                                    type: 'new_message',
                                    title: `رسالة جديدة من ${contactName}`,
                                    message: notificationContent,
                                    data: notifData
                                }
                            });
                        } catch (e) {
                            console.error('Error creating notification:', e);
                        }
                    }

                    // إرسال إشعار عبر Socket دائماً (Frontend يتحقق من الإعدادات)
                    const audience = await getConversationAudience({
                        companyId,
                        sessionId,
                        conversationId: syncedConversation?.id || null,
                        remoteJid
                    });

                    emitToAudience(io, {
                        companyId,
                        userIds: audience.userIds,
                        eventName: 'whatsapp:notification:new',
                        payload: {
                            sessionId,
                            contactName,
                            message: notificationContent,
                            messageType: messageContent.type,
                            timestamp: savedMessage.timestamp,
                            soundEnabled,
                            notificationsEnabled
                        },
                        fallbackToCompany: true
                    });

                    // 📱 إرسال إشعار المتصفح (Web Push) للرسائل الواردة ليعمل حتى والمتصفح مغلق
                    try {
                        const { sendBrowserPushToCompany } = require('../browserPushService');
                        void sendBrowserPushToCompany({
                            companyId,
                            typeId: 'customer_message',
                            title: `رسالة واتساب من ${contactName || 'عميل'}`,
                            body: notificationContent || 'أرسل العميل رسالة واتساب جديدة',
                            compactBody: 'رسالة واتساب جديدة',
                            url: syncedConversation?.id
                                ? `/whatsapp-inbox?conversationId=${encodeURIComponent(syncedConversation.id)}`
                                : '/whatsapp-inbox',
                            requireInteraction: true,
                            data: {
                                source: 'whatsapp_message',
                                sessionId,
                                conversationId: syncedConversation?.id || null,
                                remoteJid,
                            },
                        }).catch((pushErr) => {
                            console.warn('⚠️ [WEB-PUSH-WHATSAPP] Error:', pushErr?.message || pushErr);
                        });
                    } catch (pushImportErr) {
                        console.warn('⚠️ [WEB-PUSH-WHATSAPP] Failed to bootstrap:', pushImportErr?.message || pushImportErr);
                    }
                } catch (notifError) {
                    console.error('❌ [NOTIFICATION] Error creating WhatsApp message notification:', notifError);
                }
            }

            // ── AI auto-reply with debounce (Baileys sessions) ────────────────────
            const isNewsletter = isJidNewsletter?.(remoteJid);
            if (!fromMe && !importHistory && isNewMessage && messageContent.type === 'TEXT' && syncedCustomer?.companyId && !isNewsletter) {
                setImmediate(async () => {
                    try {
                        const prisma = getSharedPrismaClient();
                        const { getEffectiveAiAutoReplySetting } = require('../aiSettingsResolver');
                        const aiSetting = await getEffectiveAiAutoReplySetting(syncedCustomer.companyId, prisma);
                        if (!aiSetting?.autoReplyEnabled) { return; }
                        if (aiSetting.workingHoursEnabled && aiSetting.workingHours) {
                            try {
                                const hours = JSON.parse(typeof aiSetting.workingHours === 'string' ? aiSetting.workingHours : '{}');
                                const now = new Date();
                                const dayName = now.toLocaleString('en', { weekday: 'long', timeZone: 'Africa/Cairo' }).toLowerCase();
                                const today = hours[dayName];
                                if (today && !today.enabled) return;
                                if (today && today.start && today.end) {
                                    const cur = now.getHours() * 60 + now.getMinutes();
                                    const [sh, sm] = today.start.split(':').map(Number);
                                    const [eh, em] = today.end.split(':').map(Number);
                                    if (cur < sh * 60 + sm || cur > eh * 60 + em) return;
                                }
                            } catch(e) { /* continue */ }
                        }

                        const { accumulate } = require('../facebookDebounceService');
                        const key = `${syncedCustomer.companyId}:baileys:${sessionId}:${remoteJid}`;

                        accumulate(key, {
                            message: messageContent.text,
                            customerId: syncedCustomer.id,
                            customerPhone: syncedCustomer?.phone || remoteJid.split('@')[0],
                            conversationId: syncedConversation?.id,
                            companyId: syncedCustomer.companyId,
                            sessionId,
                            remoteJid,
                        }, async (entries) => {
                            if (entries.length === 0) return;

                            const combinedMessage = entries.map(e => e.message).join('\n---\n');
                            const first = entries[0];

                            console.log(`🟢 [BAILEYS-DEBOUNCE] Processing ${entries.length} debounced message(s)`);

                            // ponytail: admin routing — match sender phone against company admin users
                            let channel = 'WHATSAPP';
                            try {
                                const senderPhone = (first.customerPhone || first.remoteJid.split('@')[0]).replace(/\D/g, '');
                                const prisma = getSharedPrismaClient();
            const adminUsers = await prisma.user.findMany({
              where: { companyId: first.companyId, role: { in: ['OWNER', 'COMPANY_ADMIN', 'MANAGER'] }, phone: { not: null } },
              select: { phone: true },
              take: 20,
            });
                                const adminPhones = adminUsers.map(u => {
                                    const p = u.phone.replace(/\D/g, '');
                                    return p.startsWith('0') ? '20' + p.slice(1) : p;
                                }).filter(Boolean);
                                if (adminPhones.includes(senderPhone)) {
                                    channel = 'WHATSAPP_ADMIN';
                                    console.log(`🔵 [BAILEYS-DEBOUNCE] Sender ${senderPhone} is admin → routing to WHATSAPP_ADMIN`);
                                }
                            } catch (e) {
                                console.warn('⚠️ [BAILEYS-DEBOUNCE] Admin channel resolution failed, defaulting to WHATSAPP:', e.message);
                            }

                            if (first.conversationId) {
                                const conversation = await prisma.conversation.findUnique({
                                    where: { id: first.conversationId },
                                    select: { aiEnabled: true }
                                });
                                if (conversation && conversation.aiEnabled === false) {
                                    console.log(`🟡 [BAILEYS-DEBOUNCE] AI auto-reply disabled for conversation ${first.conversationId}`);
                                    return;
                                }
                            }

                            // AI ignore list (do-not-reply): skip auto-reply for listed numbers
                            try {
                                const _ignorePhone = String(first.customerPhone || (first.remoteJid || '').split('@')[0] || '').replace(/\D/g, '');
                                if (_ignorePhone) {
                                    const _ignoredRows = await prisma.$queryRaw`SELECT 1 FROM ai.whatsapp_ai_ignore_list WHERE company_id = ${first.companyId} AND phone_number = ${_ignorePhone} LIMIT 1`;
                                    if (Array.isArray(_ignoredRows) && _ignoredRows.length > 0) {
                                        console.log(`🚫 [BAILEYS-DEBOUNCE] Sender ${_ignorePhone} is on AI ignore list → skipping auto-reply`);
                                        try {
                                            await prisma.$executeRaw`INSERT INTO ai.whatsapp_ai_ignore_log (id, company_id, phone_number, thread_id, message_mid) VALUES (gen_random_uuid(), ${first.companyId}, ${_ignorePhone}, ${String(first.conversationId || '')}, null)`;
                                        } catch (_logErr) {
                                            console.warn('[BAILEYS-DEBOUNCE] ignore log insert failed:', _logErr.message);
                                        }
                                        return;
                                    }
                                }
                            } catch (_ignoreErr) {
                                console.warn('[BAILEYS-DEBOUNCE] AI ignore list check failed (fail-open):', _ignoreErr.message);
                            }

                            // Session-level routing: check if this WhatsApp session has a dedicated agent or disabled auto-reply
                            let sessionAgentId = null;
                            if (first.sessionId) {
                                try {
                                    const waSession = await prisma.whatsAppSession.findUnique({
                                        where: { id: first.sessionId },
                                        select: { autoReply: true, aiEnabled: true, metadata: true },
                                    });
                                    if (waSession) {
                                        if (waSession.aiEnabled === false || waSession.autoReply === false) {
                                            console.log(`🟡 [BAILEYS-DEBOUNCE] AI or autoReply disabled for session ${first.sessionId}`);
                                            return;
                                        }
                                        const meta = typeof waSession.metadata === 'string' ? JSON.parse(waSession.metadata) : waSession.metadata;
                                        if (meta?.agentId) {
                                            sessionAgentId = meta.agentId;
                                            console.log(`🤖 [BAILEYS-DEBOUNCE] Session ${first.sessionId} routed to dedicated agent: ${sessionAgentId}`);
                                        }
                                    }
                                } catch (err) {
                                    console.warn('[BAILEYS-DEBOUNCE] Error checking session agent:', err.message);
                                }
                            }

                            const aiSdkClient = require('../aiSdkClient');
                            const result = await aiSdkClient.sendChatMessage({
                                companyId: first.companyId,
                                customerId: first.customerId,
                                message: combinedMessage,
                                threadId: first.conversationId,
                                channel,
                                agentId: sessionAgentId,
                                memoryContext: null,
                            });

                            // Silent Escalation
                            if (result && (result.status === 'escalated' || (result.escalation && !result.reply))) {
                                const { flagThreadForHumanTakeover } = require('../silentEscalationService');
                                await flagThreadForHumanTakeover({
                                    companyId: first.companyId,
                                    conversationId: first.conversationId,
                                    customerPhone: first.remoteJid,
                                    customerId: first.customerId,
                                    reason: result.escalation?.reason || 'ai_failure',
                                    customerMessage: combinedMessage,
                                    channel: 'WHATSAPP',
                                });
                                return;
                            }

                            const rawReplyText = result?.reply;
                            const { sanitizeAiReply } = require('../../utils/aiReplySanitizer');
                            const { cleanedText: replyText, attachments } = sanitizeAiReply(
                                rawReplyText,
                                result?.response_attachments || result?.responseAttachments
                            );

                            if (replyText) {
                                const WhatsAppMessageHandler = require('./WhatsAppMessageHandler');
                                await WhatsAppMessageHandler.sendText(first.sessionId, first.remoteJid, replyText, { isAIResponse: true });
                            }
                            console.log(`[BAILEYS-AI-ATTACHMENTS] received ${attachments?.length || 0} attachment(s)`);
                            if (Array.isArray(attachments)) {
                                const WhatsAppMessageHandler = require('./WhatsAppMessageHandler');
                                for (const att of attachments) {
                                    if (att.type === 'image' && att.url && !att.url.startsWith('data:')) {
                                        console.log(`[BAILEYS-AI-ATTACHMENT] sending image: ${att.url.substring(0, 80)}...`);
                                        try {
                                            await WhatsAppMessageHandler.sendImage(first.sessionId, first.remoteJid, { url: att.url }, '', { isAIResponse: true });
                                            console.log('[BAILEYS-AI-ATTACHMENT] image sent successfully');
                                        } catch (e) {
                                            console.error('[BAILEYS-AI-ATTACHMENT] Failed to send image:', e.message);
                                        }
                                    } else {
                                        console.log(`[BAILEYS-AI-ATTACHMENT] skipping attachment type=${att.type} url=${(att.url || '').substring(0, 40)}...`);
                                    }
                                }
                            }
                        });
                    } catch(e) {
                        console.error('❌ [BAILEYS-DEBOUNCE] Error:', e.message);
                    }
                });
            }

            // معالجة التفاعلات (أزرار/قوائم) إذا كان مفعلاً
            if (!fromMe && !importHistory && (messageContent.type === 'BUTTON_RESPONSE' || messageContent.type === 'LIST_RESPONSE')) {
                const WhatsAppInteractionService = require('./WhatsAppInteractionService');
                await WhatsAppInteractionService.handleButtonResponse(sessionId, companyId, remoteJid, messageContent.interactiveData);
                return;
            }

        } catch (error) {
            result.failed++;
            console.error(`❌ Error processing message:`, error);
            await logEvent(sessionId, companyId, 'message_error', { error: error.message }, 'error');
        }
    }

    return result;
}

/**
 * معالجة تحديثات الحالة (Status Updates)
 */
async function handleStatusUpdate(sessionId, companyId, msg, sock) {
    try {
        const io = getIO();
        const messageId = msg.key.id;

        // Get the actual sender (participant in status updates)
        const remoteJid = msg.key.participant || msg.pushName;

        if (!remoteJid) {
            console.log('⚠️ Status update without participant, skipping');
            return;
        }

        // Extract status content
        const messageContent = await extractMessageContent(msg, sock, sessionId);
        if (!messageContent) return;

        // Calculate expiration (24 hours from now)
        const timestamp = new Date(msg.messageTimestamp * 1000);
        const expiresAt = new Date(timestamp.getTime() + 24 * 60 * 60 * 1000);

        // Save to database
        const savedStatus = await getSharedPrismaClient().whatsAppStatus.upsert({
            where: { messageId },
            update: {
                type: messageContent.type,
                content: messageContent.text,
                mediaUrl: messageContent.mediaUrl,
                mediaType: messageContent.mediaType,
                mediaMimeType: messageContent.mimetype,
                timestamp,
                expiresAt,
                metadata: JSON.stringify(msg)
            },
            create: {
                sessionId,
                remoteJid,
                messageId,
                type: messageContent.type,
                content: messageContent.text,
                mediaUrl: messageContent.mediaUrl,
                mediaType: messageContent.mediaType,
                mediaMimeType: messageContent.mimetype,
                timestamp,
                expiresAt,
                metadata: JSON.stringify(msg)
            }
        });

        console.log(`📸 Saved status update: ${savedStatus.id} (expires in 24h)`);

        // Emit socket event
        io?.to(`company_${companyId}`).emit('whatsapp:status:new', {
            sessionId,
            status: savedStatus
        });

    } catch (error) {
        console.error('❌ Error processing status update:', error);
        await logEvent(sessionId, companyId, 'status_error', { error: error.message }, 'error');
    }
}


/**
 * استخراج محتوى الرسالة
 */
/**
 * استخراج محتوى الرسالة
 */
async function extractMessageContent(msg, sock, sessionId, options = {}) {
    let message = msg.message;
    if (!message) return null;

    // Unwrap message wrappers to access the real underlying message content (e.g. viewOnce, ephemeral, etc.)
    while (message) {
        if (message.ephemeralMessage) {
            message = message.ephemeralMessage.message;
        } else if (message.viewOnceMessage) {
            message = message.viewOnceMessage.message;
        } else if (message.viewOnceMessageV2) {
            message = message.viewOnceMessageV2.message;
        } else if (message.viewOnceMessageV2Extension) {
            message = message.viewOnceMessageV2Extension.message;
        } else if (message.documentWithCaptionMessage) {
            message = message.documentWithCaptionMessage.message;
        } else {
            break;
        }
    }

    if (!message) return null;

    // Lazy load to avoid circular dependency
    const WhatsAppMediaHandler = require('./WhatsAppMediaHandler');
    const shouldDownloadMedia = !options.skipMediaDownload;

    let type = 'TEXT';
    let text = null;
    let mediaUrl = null;
    let mediaType = null;
    let mimetype = null;
    let fileName = null;
    let quotedId = null;
    let quotedText = null;
    let interactiveData = null;

    // نص عادي
    if (message.conversation) {
        text = message.conversation;
    }
    // نص موسع
    else if (message.extendedTextMessage) {
        text = message.extendedTextMessage.text;
        if (message.extendedTextMessage.contextInfo?.quotedMessage) {
            quotedId = message.extendedTextMessage.contextInfo.stanzaId;
            quotedText = message.extendedTextMessage.contextInfo.quotedMessage.conversation ||
                message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage?.text;
        }
    }
    // صورة
    else if (message.imageMessage) {
        type = 'IMAGE';
        text = message.imageMessage.caption;
        mimetype = message.imageMessage.mimetype;
        mediaType = 'image';
        if (shouldDownloadMedia) {
            try {
                const media = await WhatsAppMediaHandler.downloadMedia(msg, sessionId);
                if (media) {
                    mediaUrl = media.url;
                    fileName = media.fileName;
                }
            } catch (e) {
                console.error('Failed to download image:', e);
            }
        }
    }
    // فيديو
    else if (message.videoMessage) {
        type = 'VIDEO';
        text = message.videoMessage.caption;
        mimetype = message.videoMessage.mimetype;
        mediaType = 'video';
        if (shouldDownloadMedia) {
            try {
                const media = await WhatsAppMediaHandler.downloadMedia(msg, sessionId);
                if (media) {
                    mediaUrl = media.url;
                    fileName = media.fileName;
                }
            } catch (e) {
                console.error('Failed to download video:', e);
            }
        }
    }
    // صوت
    else if (message.audioMessage) {
        type = 'AUDIO';
        mimetype = message.audioMessage.mimetype;
        mediaType = 'audio';
        if (shouldDownloadMedia) {
            try {
                const media = await WhatsAppMediaHandler.downloadMedia(msg, sessionId);
                if (media) {
                    mediaUrl = media.url;
                    fileName = media.fileName;
                }
            } catch (e) {
                console.error('Failed to download audio:', e);
            }
        }
    }
    // ملف
    else if (message.documentMessage) {
        type = 'DOCUMENT';
        text = message.documentMessage.caption;
        mimetype = message.documentMessage.mimetype;
        fileName = message.documentMessage.fileName;
        mediaType = 'document';
        if (shouldDownloadMedia) {
            try {
                const media = await WhatsAppMediaHandler.downloadMedia(msg, sessionId);
                if (media) {
                    mediaUrl = media.url;
                    // Keep original filename if available
                    if (!fileName) fileName = media.fileName;
                }
            } catch (e) {
                console.error('Failed to download document:', e);
            }
        }
    }
    // ستيكر
    else if (message.stickerMessage) {
        type = 'STICKER';
        mimetype = message.stickerMessage.mimetype;
        mediaType = 'sticker';
        if (shouldDownloadMedia) {
            try {
                const media = await WhatsAppMediaHandler.downloadMedia(msg, sessionId);
                if (media) {
                    mediaUrl = media.url;
                    fileName = media.fileName;
                }
            } catch (e) {
                console.error('Failed to download sticker:', e);
            }
        }
    }
    // موقع
    else if (message.locationMessage) {
        type = 'LOCATION';
        text = JSON.stringify({
            latitude: message.locationMessage.degreesLatitude,
            longitude: message.locationMessage.degreesLongitude,
            address: message.locationMessage.address,
            name: message.locationMessage.name
        });
    }
    // جهة اتصال
    else if (message.contactMessage) {
        type = 'CONTACT';
        text = message.contactMessage.displayName;
    }
    // تفاعل
    else if (message.reactionMessage) {
        type = 'REACTION';
        text = message.reactionMessage.text || '';
        quotedId = message.reactionMessage.key?.id || null;
    }
    // أزرار تفاعلية (رسالة تحتوي على أزرار)
    else if (message.buttonsMessage) {
        type = 'BUTTONS';
        text = message.buttonsMessage.contentText || message.buttonsMessage.text;
    }
    // رد على أزرار (User clicked a button)
    else if (message.buttonsResponseMessage) {
        type = 'BUTTON_RESPONSE';
        text = message.buttonsResponseMessage.selectedDisplayText;
        interactiveData = {
            id: message.buttonsResponseMessage.selectedButtonId,
            text: message.buttonsResponseMessage.selectedDisplayText
        };
    }
    // رد على أزرار قالب (Template button response)
    else if (message.templateButtonReplyMessage) {
        type = 'BUTTON_RESPONSE';
        text = message.templateButtonReplyMessage.selectedDisplayText;
        interactiveData = {
            id: message.templateButtonReplyMessage.selectedId,
            text: message.templateButtonReplyMessage.selectedDisplayText
        };
    }
    // قائمة (رسالة تحتوي على قائمة)
    else if (message.listMessage) {
        type = 'LIST';
        text = message.listMessage.description || message.listMessage.title;
    }
    // رد على قائمة (User picked from list)
    else if (message.listResponseMessage) {
        type = 'LIST_RESPONSE';
        text = message.listResponseMessage.title;
        interactiveData = {
            id: message.listResponseMessage.singleSelectReply?.selectedRowId,
            text: message.listResponseMessage.title,
            description: message.listResponseMessage.description
        };
    }
    // منتج (قد يكون في templateMessage)
    else if (message.templateMessage) {
        type = 'TEMPLATE';
        text = message.templateMessage.hydratedTemplate?.hydratedContentText ||
            message.templateMessage.hydratedTemplate?.templateId;
    }
    // استطلاعات الرأي (Poll Creation Messages)
    else if (message.pollCreationMessage || message.pollCreationMessageV2 || message.pollCreationMessageV3) {
        const poll = message.pollCreationMessage || message.pollCreationMessageV2 || message.pollCreationMessageV3;
        type = 'POLL';
        text = poll.name || 'استطلاع رأي';
        interactiveData = {
            name: poll.name,
            selectableCount: poll.selectableOptionsCount || 1,
            values: (poll.options || []).map(opt => opt.optionName || ''),
            votes: []
        };
    }
    // رسائل تفاعلية حديثة (Interactive & Native Flow Messages)
    else if (message.interactiveMessage || message.viewOnceMessage?.message?.interactiveMessage) {
        const interactive = message.interactiveMessage || message.viewOnceMessage?.message?.interactiveMessage;
        type = 'INTERACTIVE';
        text = interactive.body?.text || interactive.header?.title || 'رسالة تفاعلية';
        const buttons = (interactive.nativeFlowMessage?.buttons || []).map(btn => {
            let params = {};
            try { params = JSON.parse(btn.buttonParamsJson || '{}'); } catch {}
            return {
                name: btn.name,
                params
            };
        });
        interactiveData = {
            title: interactive.header?.title,
            body: interactive.body?.text,
            footer: interactive.footer?.text,
            buttons
        };
    }
    // رد على رسائل تفاعلية حديثة (Interactive Response)
    else if (message.interactiveResponseMessage) {
        type = 'BUTTON_RESPONSE';
        const paramsJson = message.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson;
        let parsedParams = {};
        try { parsedParams = paramsJson ? JSON.parse(paramsJson) : {}; } catch {}
        text = message.interactiveResponseMessage.body?.text || parsedParams.id || parsedParams.display_text || 'رد على زر تفاعلي';
        interactiveData = {
            id: parsedParams.id,
            text,
            params: parsedParams
        };
    }
    // حدث تثبيت رسالة (Pin In Chat)
    else if (message.pinInChatMessage) {
        type = 'PIN_EVENT';
        const pin = message.pinInChatMessage;
        const isPin = pin.type === 1;
        text = isPin ? '📌 تم تثبيت رسالة في المحادثة' : 'تم إلغاء تثبيت الرسالة';
        interactiveData = {
            targetMessageId: pin.key?.id,
            pinType: pin.type,
            senderTimestampMs: pin.senderTimestampMs
        };
    }
    else {
        return null;
    }

    return {
        type,
        text,
        mediaUrl,
        mediaType,
        mimetype,
        fileName,
        quotedId,
        quotedText,
        interactiveData
    };
}

/**
 * تحديث أو إنشاء جهة اتصال
 */
/**
 * تحديث أو إنشاء جهة اتصال
 */
async function updateOrCreateContact(sessionId, remoteJid, msg, sock, options = {}) {
    try {
        const {
            isOutgoing = false,
            isGroupParticipant = false,
            customerId,
            suppressUnread = false,
            incrementCounters = true,
            lastMessageAt,
            lastMessagePreview,
            skipProfilePic = false
        } = options;

        const { normalizedJid, phoneNumber } = normalizeWhatsAppContactIdentity(remoteJid);
        const isGroup = normalizedJid.endsWith('@g.us');

        // Use normalizedJid for database operations
        remoteJid = normalizedJid;

        let pushName = msg.pushName;

        // إذا كانت مجموعة، نحاول الحصول على اسم المجموعة
        if (isGroup) {
            try {
                const groupMetadata = await sock.groupMetadata(remoteJid);
                pushName = groupMetadata.subject;
            } catch (e) {
                // تجاهل الخطأ إذا فشل جلب بيانات المجموعة
                console.log('Failed to fetch group metadata for:', remoteJid);
            }
        } else if (isOutgoing) {
            // FIX: If outgoing message, msg.pushName is MY name.
            // We should NOT use it to update the contact (recipient).
            pushName = undefined;
        }

        // محاولة الحصول على صورة البروفايل — مع cache (كانت بتنفذ لكل رسالة)
        let profilePicUrl = null;
        if (!skipProfilePic) {
            const profileCacheKey = `${sessionId}:${remoteJid}`;
            const cachedPic = profilePicCache.get(profileCacheKey);
            if (cachedPic && cachedPic.expiresAt > Date.now()) {
                profilePicUrl = cachedPic.url;
            } else {
                try {
                    profilePicUrl = await sock.profilePictureUrl(remoteJid, 'image');
                    if (profilePicCache.size > 10000) {
                        const picNow = Date.now();
                        for (const [key, entry] of profilePicCache) {
                            if (entry.expiresAt <= picNow) profilePicCache.delete(key);
                        }
                    }
                    // مفيش صورة (null) → cache قصير (10 دقايق) عشان نعيد المحاولة بشكل دوري
                    // من غير ما ننفذ نداء الشبكة على كل رسالة. صورة ناجحة → ساعة.
                    const ttl = profilePicUrl
                        ? PROFILE_PIC_CACHE_TTL_MS
                        : PROFILE_PIC_MISS_TTL_MS;
                    profilePicCache.set(profileCacheKey, {
                        url: profilePicUrl,
                        expiresAt: Date.now() + ttl
                    });
                } catch (e) {
                    // تجاهل الخطأ إذا لم تكن الصورة متاحة
                }
            }
        }

        const updateData = {};

        if (profilePicUrl) {
            updateData.profilePicUrl = profilePicUrl;
        }

        // Prisma checked inputs expect nested relations here instead of scalar FK writes.
        if (customerId) {
            updateData.customer = {
                connect: { id: customerId }
            };
        }

        // Only update pushName if it's defined (i.e., not outgoing or it's a group)
        if (pushName) {
            updateData.pushName = pushName;
        }

        // Only update chat metadata if it's NOT a background participant update
        if (!isGroupParticipant) {
            // Monotonic update: لا نحدث lastMessageAt/preview لو الرسالة الجديدة أقدم من الموجودة.
            // (بدون transaction لكل رسالة — الـ read والـ upsert كانوا خارج بعض أصلًا، فمفيش atomicity
            // حقيقية نضيعها، والـ BEGIN/COMMIT لكل رسالة كان عبء على الـ DB في الـ bursts)
            if (lastMessageAt) {
                const prisma = getSharedPrismaClient();
                const existing = await prisma.whatsAppContact.findUnique({
                    where: { sessionId_jid: { sessionId, jid: remoteJid } },
                    select: { lastMessageAt: true }
                });
                if (existing?.lastMessageAt && existing.lastMessageAt > lastMessageAt) {
                    updateData.lastMessageAt = existing.lastMessageAt;
                } else {
                    updateData.lastMessageAt = lastMessageAt;
                    updateData.lastMessageIsFromMe = isOutgoing;
                    if (lastMessagePreview !== undefined) {
                        updateData.lastMessagePreview = lastMessagePreview;
                    }
                }
            } else {
                updateData.lastMessageAt = new Date();
                updateData.lastMessageIsFromMe = isOutgoing;
            }
            if (incrementCounters) {
                updateData.totalMessages = { increment: 1 };
            }

            // Only increment unreadCount if it's an incoming message
            if (!isOutgoing && !suppressUnread && incrementCounters) {
                updateData.unreadCount = { increment: 1 };
            }
        }

        const createData = {
            jid: remoteJid,
            phoneNumber,
            pushName: pushName || null,
            profilePicUrl,
            lastMessageAt: lastMessageAt || new Date(),
            lastMessageIsFromMe: isOutgoing,
            unreadCount: (!isOutgoing && !isGroupParticipant && !suppressUnread) ? 1 : 0,
            totalMessages: incrementCounters ? 1 : 0,
            isGroup
        };

        if (customerId) {
            createData.customer = {
                connect: { id: customerId }
            };
        }

        const contact = await getSharedPrismaClient().whatsAppContact.upsert({
            where: {
                sessionId_jid: {
                    sessionId,
                    jid: remoteJid
                }
            },
            update: {
                ...updateData,
                updatedAt: new Date()
            },
            create: {
                ...createData,
                whatsAppSession: {
                    connect: { id: sessionId }
                },
                updatedAt: new Date()
            }
        });

        return contact;
    } catch (error) {
        console.error('❌ Error updating contact:', error);
        return null;
    }
}

/**
 * معالجة تحديث حالة الرسائل
 */
function extractEditedText(message) {
    let m = message;
    while (m) {
        if (m.ephemeralMessage) m = m.ephemeralMessage.message;
        else if (m.viewOnceMessage) m = m.viewOnceMessage.message;
        else if (m.viewOnceMessageV2) m = m.viewOnceMessageV2.message;
        else break;
    }
    if (!m) return null;
    if (m.conversation) return m.conversation;
    if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
    if (m.imageMessage?.caption) return m.imageMessage.caption;
    if (m.videoMessage?.caption) return m.videoMessage.caption;
    return null;
}

// يساعد في تقسيم البحث عن رسائل الـ CRM: يلاقي الـ conversation المرتبط بـ (sessionId, remoteJid)
// — من غير full-table scan على الـ messages ولا scan للمetadata لكل محادثات الشركة.
async function findCrmConversationIdForJid(tx, companyId, sessionId, remoteJid) {
    if (!companyId || !remoteJid) return null;

    // 1) المسار المفهرس: WhatsAppContact (sessionId, jid) → customerId → conversation (companyId, customerId)
    try {
        const contact = await tx.whatsAppContact.findUnique({
            where: { sessionId_jid: { sessionId, jid: remoteJid } },
            select: { customerId: true }
        });
        if (contact?.customerId) {
            const conv = await tx.conversation.findFirst({
                where: { companyId, customerId: contact.customerId, channel: 'WHATSAPP' },
                select: { id: true },
                orderBy: { updatedAt: 'desc' }
            });
            if (conv) return conv.id;
        }
    } catch (e) { /* fall through to metadata scan */ }

    // 2) Fallback: metadata scan (فقط لو الـ contact مش مرتبط بـ customer)
    const conversation = await tx.conversation.findFirst({
        where: {
            companyId,
            channel: 'WHATSAPP',
            metadata: { contains: `"remoteJid":"${remoteJid}"` }
        },
        select: { id: true },
        orderBy: { updatedAt: 'desc' }
    });
    return conversation?.id || null;
}

async function findCrmMessagesForWhatsAppId(tx, companyId, sessionId, remoteJid, messageId) {
    const conversationId = await findCrmConversationIdForJid(tx, companyId, sessionId, remoteJid);
    const where = conversationId
        ? { conversationId, metadata: { contains: `"whatsAppMessageId":"${messageId}"` } }
        : { metadata: { contains: `"whatsAppMessageId":"${messageId}"` } };
    return tx.message.findMany({ where, select: { id: true } });
}

async function handleRevokedMessage(sessionId, companyId, messageId, remoteJid) {
    const prisma = getSharedPrismaClient();
    try {
        await executeWithRetry(async () => {
            await prisma.$transaction(async (tx) => {
                const updated = await tx.whatsAppMessage.updateMany({
                    where: { messageId, isHidden: false },
                    data: {
                        isHidden: true,
                        content: null,
                        messageType: 'DELETED',
                        updatedAt: new Date()
                    }
                });
                if (updated.count === 0) return;

                const crmMessages = await findCrmMessagesForWhatsAppId(tx, companyId, sessionId, remoteJid, messageId);
                if (crmMessages.length > 0) {
                    await tx.message.updateMany({
                        where: { id: { in: crmMessages.map(m => m.id) } },
                        data: {
                            content: '[تم حذف الرسالة]',
                            metadata: JSON.stringify({ deleted: true, whatsAppMessageId: messageId, deletedAt: new Date().toISOString() })
                        }
                    });
                }
            });
        });

        const io = getIO();
        const audience = await getConversationAudience({
            companyId,
            sessionId,
            remoteJid: remoteJid
        });
        emitToAudience(io, {
            companyId,
            userIds: audience.userIds,
            eventName: 'whatsapp:message:deleted',
            payload: { sessionId, messageId, remoteJid }
        });
        console.log(`🗑️ [WA-REVOKE:${sessionId}] Message ${messageId} revoked and hidden`);
    } catch (error) {
        console.error('❌ Error handling revoked message:', error.message);
    }
}

async function handleEditedMessage(sessionId, companyId, messageId, remoteJid, editedMessage) {
    const prisma = getSharedPrismaClient();
    try {
        const text = extractEditedText(editedMessage);
        if (text === null) return;

        await executeWithRetry(async () => {
            await prisma.$transaction(async (tx) => {
                const updated = await tx.whatsAppMessage.updateMany({
                    where: { messageId, isHidden: false },
                    data: { content: text, updatedAt: new Date() }
                });
                if (updated.count === 0) return;

                const crmMessages = await findCrmMessagesForWhatsAppId(tx, companyId, sessionId, remoteJid, messageId);
                if (crmMessages.length > 0) {
                    await tx.message.updateMany({
                        where: { id: { in: crmMessages.map(m => m.id) } },
                        data: { content: text, updatedAt: new Date() }
                    });
                }
            });
        });

        const io = getIO();
        const audience = await getConversationAudience({
            companyId,
            sessionId,
            remoteJid
        });
        emitToAudience(io, {
            companyId,
            userIds: audience.userIds,
            eventName: 'whatsapp:message:edited',
            payload: { sessionId, messageId, remoteJid, content: text }
        });
        console.log(`✏️ [WA-EDIT:${sessionId}] Message ${messageId} edited`);
    } catch (error) {
        console.error('❌ Error handling edited message:', error.message);
    }
}

/**
 * معالجة تحديثات تصويتات استطلاعات الرأي
 */
async function handlePollUpdate(sessionId, companyId, key, pollUpdates) {
    const io = getIO();
    try {
        const messageId = key.id;
        const prisma = getSharedPrismaClient();

        const pollMsg = await prisma.whatsAppMessage.findFirst({
            where: { messageId }
        });

        if (!pollMsg) {
            return;
        }

        let interactive = {};
        try {
            interactive = pollMsg.interactiveData ? JSON.parse(pollMsg.interactiveData) : {};
        } catch {}

        const values = interactive.values || [];
        const options = values.map(val => ({ optionName: typeof val === 'string' ? val : (val.name || String(val)) }));

        const syntheticMessage = {
            pollCreationMessageV3: {
                name: interactive.name || pollMsg.content || '',
                options
            }
        };

        let aggregatedVotes = [];
        if (typeof getAggregateVotesInPollMessage === 'function') {
            try {
                const meId = activeSessions.get(sessionId)?.creds?.me?.id;
                aggregatedVotes = getAggregateVotesInPollMessage({
                    message: syntheticMessage,
                    pollUpdates
                }, meId);
            } catch (aggErr) {
                console.warn('⚠️ [PollUpdate] Baileys getAggregateVotesInPollMessage error:', aggErr.message);
            }
        }

        interactive.votes = aggregatedVotes;
        interactive.lastVoteAt = new Date();

        await prisma.whatsAppMessage.update({
            where: { id: pollMsg.id },
            data: {
                interactiveData: JSON.stringify(interactive),
                updatedAt: new Date()
            }
        });

        const audience = await getConversationAudience({
            companyId,
            sessionId,
            remoteJid: key.remoteJid
        });

        emitToAudience(io, {
            companyId,
            userIds: audience.userIds,
            eventName: 'whatsapp:poll_updated',
            payload: {
                sessionId,
                messageId,
                remoteJid: key.remoteJid,
                interactiveData: interactive
            }
        });
        console.log(`📊 [WA-POLL:${sessionId}] Poll ${messageId} updated with ${aggregatedVotes.length} options`);
    } catch (error) {
        console.error('❌ Error handling poll update:', error.message);
    }
}

async function handleMessageStatusUpdate(sessionId, companyId, updates) {
    const io = getIO();

    for (const update of updates) {
        try {
            const { key, update: statusUpdate } = update;

            // REVOKE (delete for everyone)
            if (statusUpdate?.message?.protocolMessage?.type === MessageProtocolType?.REVOKE) {
                await handleRevokedMessage(sessionId, companyId, key.id, key.remoteJid);
                continue;
            }

            // EDIT — Baileys يبعت التعديل إما كـ protocolMessage(MESSAGE_EDIT) أو كرسالة فيها messageSecret
            const isEdit =
                statusUpdate?.message?.protocolMessage?.type === MessageProtocolType?.MESSAGE_EDIT ||
                statusUpdate?.message?.messageContextInfo?.messageSecret;
            if (isEdit) {
                const editedContent = statusUpdate?.message?.protocolMessage?.message || statusUpdate?.message;
                await handleEditedMessage(sessionId, companyId, key.id, key.remoteJid, editedContent);
                continue;
            }

            // POLL UPDATES (تصويتات استطلاعات الرأي)
            if (statusUpdate?.pollUpdates && Array.isArray(statusUpdate.pollUpdates)) {
                await handlePollUpdate(sessionId, companyId, key, statusUpdate.pollUpdates);
                continue;
            }

            if (statusUpdate.status) {
                // 🚨 PRODUCTION-FIX (M1): الأكواد غير المعروفة كانت تتحول لـ 'SENT' (إخفاء فشل).
                // الآن نتخطى الإيصالات غير المعروفة بدل كتابة حالة زائفة.
                const status = getMessageStatusFromBaileysStatus(statusUpdate.status);
                if (!status) continue;

                const updatedCount = await updateMessageDeliveryStatus(key.id, status);

                if (updatedCount > 0) {
                    const persistedRemoteJid = await getPersistedRemoteJidForMessage(key.id);
                    const audience = await getConversationAudience({
                        companyId,
                        sessionId,
                        remoteJid: persistedRemoteJid || key.remoteJid
                    });

                    emitToAudience(io, {
                        companyId,
                        userIds: audience.userIds,
                        eventName: 'whatsapp:message:status',
                        payload: {
                            sessionId,
                            messageId: key.id,
                            remoteJid: persistedRemoteJid || key.remoteJid,
                            status
                        }
                    });
                }
            }
        } catch (error) {
            console.error('❌ Error updating message status:', error);
        }
    }
}

async function handleMessageReceiptUpdate(sessionId, companyId, updates) {
    const io = getIO();

    for (const update of updates) {
        try {
            const { key, receipt } = update;
            if (!key?.id) continue;

            const status = receipt?.readTimestamp ? 'READ' : (receipt?.receiptTimestamp ? 'DELIVERED' : null);
            if (!status) continue;

            const updatedCount = await updateMessageDeliveryStatus(key.id, status);

            if (updatedCount > 0) {
                const persistedRemoteJid = await getPersistedRemoteJidForMessage(key.id);
                const audience = await getConversationAudience({
                    companyId,
                    sessionId,
                    remoteJid: persistedRemoteJid || key.remoteJid
                });

                emitToAudience(io, {
                    companyId,
                    userIds: audience.userIds,
                    eventName: 'whatsapp:message:status',
                    payload: {
                        sessionId,
                        messageId: key.id,
                        remoteJid: persistedRemoteJid || key.remoteJid,
                        status
                    }
                });
            }
        } catch (error) {
            console.error('❌ Error updating message receipt:', error);
        }
    }
}

/**
 * معالجة تحديث المجموعات
 */
async function handleGroupsUpdate(sessionId, companyId, updates) {
    if (!Array.isArray(updates)) updates = [updates];
    for (const update of updates) {
        try {
            if (!update.id) continue;
            const data = {};
            if (typeof update.subject === 'string') data.pushName = update.subject;
            if (Object.keys(data).length > 0) {
                await getSharedPrismaClient().whatsAppContact.updateMany({
                    where: { sessionId, jid: update.id },
                    data
                });
            }
        } catch (err) {
            console.error(`❌ handleGroupsUpdate: failed for ${update.id}:`, err);
        }
    }
}

/**
 * معالجة تحديث جهات الاتصال
 */
async function handleContactsUpdate(sessionId, companyId, updates) {
    for (const update of updates) {
        try {
            if (update.id) {
                const data = {};
                const displayName = update.notify || update.name;
                if (displayName) {
                    data.name = displayName;
                    data.pushName = displayName;
                }
                if (update.imgUrl) data.profilePicUrl = update.imgUrl;

                if (Object.keys(data).length > 0) {
                    await getSharedPrismaClient().whatsAppContact.updateMany({
                        where: { sessionId, jid: update.id },
                        data
                    });
                }
            }
        } catch (error) {
            console.error('❌ Error updating contact:', error);
        }
    }
}

/**
 * معالجة إضافة وتحديث جهات الاتصال من Baileys (contacts.upsert)
 * يستخرج أرقام الهواتف ويدمج الـ LID مع الأرقام الحقيقية تلقائياً
 */
async function handleContactsUpsert(sessionId, companyId, contacts) {
    if (!Array.isArray(contacts) || contacts.length === 0) return;
    const prisma = getSharedPrismaClient();

    for (const contact of contacts) {
        try {
            if (!contact?.id) continue;
            const displayName = contact.name || contact.notify || contact.verifiedName || null;
            const { normalizedJid, phoneNumber } = normalizeWhatsAppContactIdentity(contact.id);
            if (!normalizedJid || normalizedJid === 'status@broadcast' || isJidNewsletter?.(normalizedJid)) continue;

            const isGroup = normalizedJid.endsWith('@g.us');
            const isLid = isLinkedDeviceJid(normalizedJid);

            // استخراج الربط بين LID ورقم الهاتف إذا توافر الاثنان
            const lid = contact.lid || (isLid ? normalizedJid : null);
            const pn = contact.phoneNumber ? normalizePhoneJid(contact.phoneNumber) : (!isLid ? normalizedJid : null);

            if (lid && pn && lid !== pn) {
                await persistHistoryLidMappings(sessionId, [{ pnJid: pn, lidJid: lid }]);
                await mergeLinkedDeviceConversation(sessionId, lid, pn, { pushName: displayName });
            }

            const updateData = { updatedAt: new Date() };
            if (displayName) {
                updateData.pushName = displayName;
                updateData.name = displayName;
            }
            if (contact.imgUrl) {
                updateData.profilePicUrl = contact.imgUrl;
            }

            await prisma.whatsAppContact.upsert({
                where: {
                    sessionId_jid: {
                        sessionId,
                        jid: normalizedJid
                    }
                },
                update: updateData,
                create: {
                    sessionId,
                    jid: normalizedJid,
                    phoneNumber: phoneNumber || (isLid ? `lid:${normalizedJid.split('@')[0]}` : normalizedJid.split('@')[0]),
                    name: displayName,
                    pushName: displayName,
                    profilePicUrl: contact.imgUrl || null,
                    isGroup,
                    unreadCount: 0,
                    totalMessages: 0,
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            console.error('❌ Error handling contact upsert:', error.message);
        }
    }
}

/**
 * جلب صور البروفايل المفقودة لجهات الاتصال
 * بيمشي على كل الكونطاكت اللي معندهاش صورة (على دفعات) مع rate limit.
 * عنده guard بيشغله مرة واحدة لكل جلسة في نفس الوقت.
 */
async function fetchMissingProfilePics(sessionId) {
    const session = getSession(sessionId);
    if (!session || session.status !== 'connected' || !session.sock) {
        WA_LOG.warn(sessionId, 'Cannot fetch missing profile pics: session not connected');
        return;
    }

    if (profilePicFetchRunning.has(sessionId)) {
        WA_LOG.info(sessionId, 'Profile pic fetch already running — skipping');
        return;
    }
    profilePicFetchRunning.add(sessionId);

    const BATCH_SIZE = 50;
    const RATE_LIMIT_MS = 200;

    try {
        const prisma = getSharedPrismaClient();
        let offset = 0;
        let fetched = 0;
        let checked = 0;

        while (true) {
            const contacts = await prisma.whatsAppContact.findMany({
                where: {
                    sessionId,
                    profilePicUrl: null,
                    jid: { endsWith: '@s.whatsapp.net' }
                },
                select: { id: true, jid: true },
                skip: offset,
                take: BATCH_SIZE
            });

            if (contacts.length === 0) break;
            offset += contacts.length;

            for (const contact of contacts) {
                checked++;
                try {
                    const url = await session.sock.profilePictureUrl(contact.jid, 'image');
                    if (url) {
                        await prisma.whatsAppContact.update({
                            where: { id: contact.id },
                            data: { profilePicUrl: url, updatedAt: new Date() }
                        });
                        fetched++;
                    }
                } catch {
                    // No profile pic or unavailable — skip
                }
                // Rate limit: wait between requests
                await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
            }

            // لو باقي كونطاكت كتير (أكتر من دفعة) نكمل على طول
            if (contacts.length < BATCH_SIZE) break;
        }

        if (fetched > 0) {
            WA_LOG.ok(sessionId, `Fetched ${fetched}/${checked} missing profile pics`);
        } else if (checked > 0) {
            WA_LOG.info(sessionId, `No new profile pics to fetch (${checked} checked)`);
        }
    } catch (error) {
        WA_LOG.error(sessionId, `Error fetching missing profile pics: ${error.message}`);
    } finally {
        profilePicFetchRunning.delete(sessionId);
    }
}

/**
 * معالجة تحديث الحضور
 */
async function handlePresenceUpdate(sessionId, companyId, update) {
    const io = getIO();

    io?.to(`company_${companyId}`).emit('whatsapp:presence', {
        sessionId,
        jid: update.id,
        presence: update.presences
    });
}

/**
 * معالجة تحديثات المكالمات
 */
async function handleCallUpdate(sessionId, companyId, update) {
    const io = getIO();

    try {
        // تسجيل الحدث
        await logEvent(sessionId, companyId, 'call_update', {
            callId: update.id,
            status: update.status,
            from: update.from
        });

        // إرسال عبر Socket.IO
        io?.to(`company_${companyId}`).emit('whatsapp:call:update', {
            sessionId,
            callId: update.id,
            status: update.status,
            from: update.from,
            timestamp: new Date()
        });

        // 🛡️ درع المكالمات (Call Shield): رفض المكالمات الواردة تلقائياً والرد برسالة اعتذار
        if (update.status === 'offer' && update.id && update.from) {
            const sd = activeSessions.get(sessionId);
            let metadata = sd?.metadata;
            if (typeof metadata === 'string') {
                try { metadata = JSON.parse(metadata); } catch {}
            }
            if (!metadata) {
                const dbSession = await getSharedPrismaClient().whatsAppSession.findUnique({
                    where: { id: sessionId },
                    select: { metadata: true }
                });
                if (dbSession?.metadata) {
                    try { metadata = typeof dbSession.metadata === 'string' ? JSON.parse(dbSession.metadata) : dbSession.metadata; } catch {}
                }
            }

            if (metadata?.callShieldEnabled) {
                WA_LOG.info(sessionId, `🛡️ [CallShield] Auto-rejecting incoming call ${update.id} from ${update.from}`);
                if (sd?.sock?.rejectCall) {
                    try {
                        await sd.sock.rejectCall(update.id, update.from);
                    } catch (rejectErr) {
                        console.error('❌ Error rejecting call via Baileys:', rejectErr.message);
                    }
                }

                const callerJid = update.from.includes('@') ? update.from : `${update.from}@s.whatsapp.net`;
                const replyMessage = metadata.callShieldMessage || 'عذراً، هذا الرقم مخصص للمراسلات النصية وخدمة العملاء عبر واتساب فقط ولا يستقبل مكالمات هاتفية. برجاء كتابة استفسارك وسيقوم فريق العمل بالرد عليك في أقرب وقت. 🌷';

                const WhatsAppMessageHandler = require('./WhatsAppMessageHandler');
                let autoReplied = false;
                try {
                    await WhatsAppMessageHandler.sendText(sessionId, callerJid, replyMessage, {
                        isAIResponse: false,
                        metadata: { source: 'call_shield', callId: update.id }
                    });
                    autoReplied = true;
                } catch (replyErr) {
                    console.error('❌ Error sending Call Shield auto-reply:', replyErr.message);
                }

                try {
                    const callLogMsg = await getSharedPrismaClient().whatsAppMessage.upsert({
                        where: { messageId: `call_${update.id}` },
                        update: {
                            status: 'DELIVERED',
                            updatedAt: new Date()
                        },
                        create: {
                            sessionId,
                            remoteJid: callerJid,
                            messageId: `call_${update.id}`,
                            fromMe: false,
                            messageType: 'CALL_LOG',
                            content: '📞 مكالمة واردة تم رفضها تلقائياً (درع المكالمات)',
                            interactiveData: JSON.stringify({
                                callId: update.id,
                                isVideo: !!update.isVideo,
                                isGroup: !!update.isGroup,
                                autoReplied,
                                autoReplyText: replyMessage,
                                timestamp: new Date()
                            }),
                            status: 'DELIVERED',
                            timestamp: new Date()
                        }
                    });

                    io?.to(`company_${companyId}`).emit('whatsapp:message:new', {
                        sessionId,
                        message: callLogMsg,
                        remoteJid: callerJid
                    });
                    io?.to(`company_${companyId}`).emit('whatsapp:call_rejected', {
                        sessionId,
                        callId: update.id,
                        from: update.from,
                        autoReplied
                    });
                } catch (logErr) {
                    console.error('❌ Error creating call log message in DB:', logErr.message);
                }

                return;
            }
        }

        // معالجة حالات محددة
        if (update.status === 'reject') {
            await logEvent(sessionId, companyId, 'call_reject', {
                callId: update.id,
                from: update.from
            }, 'info');
        } else if (update.status === 'timeout') {
            await logEvent(sessionId, companyId, 'call_timeout', {
                callId: update.id,
                from: update.from
            }, 'info');
        }
    } catch (error) {
        console.error('❌ Error handling call update:', error);
    }
}

/**
 * تحديث إعدادات درع المكالمات
 */
async function updateCallShieldSettings(sessionId, { enabled, message }) {
    const prisma = getSharedPrismaClient();
    const dbSession = await prisma.whatsAppSession.findUnique({
        where: { id: sessionId },
        select: { id: true, companyId: true, metadata: true }
    });
    if (!dbSession) throw new Error('الجلسة غير موجودة');

    let meta = {};
    try {
        meta = dbSession.metadata ? (typeof dbSession.metadata === 'string' ? JSON.parse(dbSession.metadata) : dbSession.metadata) : {};
    } catch {}

    meta.callShieldEnabled = !!enabled;
    if (message !== undefined) {
        meta.callShieldMessage = message;
    }

    await prisma.whatsAppSession.update({
        where: { id: sessionId },
        data: {
            metadata: JSON.stringify(meta),
            updatedAt: new Date()
        }
    });

    const active = activeSessions.get(sessionId);
    if (active) {
        active.metadata = meta;
    }

    return {
        callShieldEnabled: meta.callShieldEnabled,
        callShieldMessage: meta.callShieldMessage
    };
}

function getBaileysProto() {
    return proto;
}

function getGenerateWAMessageFromContent() {
    return generateWAMessageFromContent;
}

/**
 * إعادة الاتصال بجلسة
 */
async function reconnectSession(sessionId, companyId, attempt = 0, options = {}) {
    try {
        clearReconnectTimer(sessionId);
        sessionHealthChecks.delete(sessionId);

        const existingSession = activeSessions.get(sessionId);
        if (existingSession) {
            const existingCompanyId = existingSession.companyId || companyId;
            activeSessions.delete(sessionId);
            untrackCompanySession(existingSession.companyId, sessionId);
            await endSocketQuietly(existingSession.sock, 'Reconnecting WhatsApp session');
            existingSession.sock = null;
            cleanupSessionState(sessionId, existingCompanyId);
        }

        if (options.resetAuth) {
            WA_LOG.warn(sessionId, `Auth state will be reset for reconnection`);
            await clearDatabaseAuthState(sessionId);
        }

        // Fetch metadata and isDefault status before recreating
        const sessionRecord = await getSharedPrismaClient().whatsAppSession.findUnique({
            where: { id: sessionId }
        });

        if (!sessionRecord) {
            WA_LOG.error(sessionId, `Session record not found in database, cannot reconnect`);
            return null;
        }

        const isDefault = sessionRecord.isDefault || false;
        const weight = isDefault ? 3 : 1;
        const phoneNumber = normalizePhoneNumber(options.phoneNumber || sessionRecord.phoneNumber);
        const metadata = parseJsonSafely(sessionRecord.metadata, {});
        const syncFullHistory = shouldEnableFullHistorySync(options) || metadata.importHistoryOnLink === true;

        // تحديث حالة DB إلى CONNECTING قبل بدء الاتصال
        await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            return await prisma.whatsAppSession.update({
                where: { id: sessionId },
                data: { status: 'CONNECTING', updatedAt: new Date() }
            });
        }, 3);

        const result = await createSession(sessionId, companyId, {
            isDefault,
            metadata: sessionRecord.metadata,
            loadBalanceWeight: weight,
            forceRestart: true,
            resetAuth: !!options.resetAuth,
            usePairingCode: Boolean(options.usePairingCode && phoneNumber),
            phoneNumber: phoneNumber || undefined,
            syncFullHistory
        });

        WA_LOG.reconnect(sessionId, `Reconnect attempt ${attempt + 1} successful`);
        return result;
    } catch (error) {
        WA_LOG.error(sessionId, `Reconnect attempt ${attempt + 1} failed: ${error.message}`);
        throw error;
    }
}

async function requestHistorySync(sessionId, companyId) {
    const prisma = getSharedPrismaClient();
    const session = await prisma.whatsAppSession.findFirst({
        where: { id: sessionId, companyId },
        select: { id: true, provider: true, metadata: true }
    });

    if (!session) throw new Error('Session not found');
    if (session.provider === 'META_CLOUD') throw new Error('History sync is only available for Baileys sessions');

    const outcome = await prisma.$transaction(async (tx) => {
        const current = await tx.whatsAppSessionHistoryImport.findUnique({
            where: { sessionId },
            select: { status: true }
        });
        if (current && ['REQUESTED', 'IN_PROGRESS'].includes(current.status)) {
            return { alreadyRunning: true, status: current.status };
        }

        const metadata = parseJsonSafely(session.metadata, {});
        metadata.importHistoryOnLink = true;

        await tx.whatsAppSession.update({
            where: { id: sessionId },
            data: { metadata: JSON.stringify(metadata), updatedAt: new Date() }
        });
        await tx.whatsAppSessionHistoryImport.upsert({
            where: { sessionId },
            create: { sessionId, status: 'REQUESTED', requestedAt: new Date() },
            update: {
                status: 'REQUESTED',
                requestedAt: new Date(),
                startedAt: null,
                completedAt: null,
                failedAt: null,
                lastError: null,
                importedMessages: 0,
                unsupportedMessages: 0,
                skippedMessages: 0,
                failedMessages: 0,
                chatsCount: 0,
                contactsCount: 0,
                lastProgress: 0
            }
        });
        return { alreadyRunning: false, status: 'REQUESTED' };
    });

    if (!outcome.alreadyRunning) {
        scheduleHistorySyncRequestTimeout(sessionId, companyId);
        await requestReconnect(sessionId, companyId, 'manual_history_sync', {}, 250);
    }

    return outcome;
}

async function syncPendingHistoryMedia(sessionId, companyId) {
    if (historyMediaSyncJobs.has(sessionId)) {
        return { alreadyRunning: true };
    }

    const job = (async () => {
        const session = activeSessions.get(sessionId);
        if (!session || session.status !== 'connected') {
            throw new Error('Session is not connected');
        }

        const prisma = getSharedPrismaClient();
        const limit = Math.max(1, Math.min(Number(process.env.WHATSAPP_HISTORY_MEDIA_SYNC_LIMIT || 1000), 2000));
        const concurrency = Math.max(1, Math.min(Number(process.env.WHATSAPP_HISTORY_MEDIA_SYNC_CONCURRENCY || 2), 4));
        const pending = await prisma.whatsAppMessage.findMany({
            where: {
                sessionId,
                mediaUrl: null,
                messageType: { in: ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'STICKER'] }
            },
            select: { id: true, metadata: true },
            orderBy: { timestamp: 'asc' },
            take: limit
        });
        const WhatsAppMediaHandler = require('./WhatsAppMediaHandler');
        let downloaded = 0;
        let failed = 0;

        for (let index = 0; index < pending.length; index += concurrency) {
            const group = pending.slice(index, index + concurrency);
            const outcomes = await Promise.all(group.map(async (storedMessage) => {
                const rawMessage = parseJsonSafely(storedMessage.metadata, null);
                if (!rawMessage) return false;

                try {
                    const media = await WhatsAppMediaHandler.downloadMedia(rawMessage, sessionId);
                    if (!media) return false;
                    await prisma.whatsAppMessage.update({
                        where: { id: storedMessage.id },
                        data: {
                            mediaUrl: media.url,
                            mediaType: media.type,
                            mediaMimeType: media.mimetype,
                            mediaFileName: media.fileName,
                            mediaSize: media.size
                        }
                    });
                    return true;
                } catch (error) {
                    return false;
                }
            }));

            downloaded += outcomes.filter(Boolean).length;
            failed += outcomes.filter((outcome) => !outcome).length;
            await historyYield();
        }

        getIO()?.to(`company_${companyId}`).emit('whatsapp:history_media_sync', {
            sessionId,
            total: pending.length,
            downloaded,
            failed
        });
        await logEvent(sessionId, companyId, 'history_media_sync_finished', { total: pending.length, downloaded, failed });
        return { total: pending.length, downloaded, failed };
    })();

    historyMediaSyncJobs.set(sessionId, job);
    try {
        return await job;
    } finally {
        historyMediaSyncJobs.delete(sessionId);
    }
}

/**
 * إرسال رسالة نصية
 */
const SEND_MESSAGE_TIMEOUT_MS = 30000;

function withSendTimeout(sendFn, sessionId, label) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(Object.assign(new Error(`${label} timed out after ${SEND_MESSAGE_TIMEOUT_MS}ms`), {
                code: 'WA_SEND_TIMEOUT',
                retryable: true,
            }));
        }, SEND_MESSAGE_TIMEOUT_MS);
    });
    return Promise.race([sendFn(), timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

function assertSocketReady(session, sessionId) {
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }
    if (getSocketReadyState(session.sock) !== 1) {
        throw new Error('Session socket not ready');
    }
}

async function sendTextMessage(sessionId, to, text, options = {}) {
    const session = activeSessions.get(sessionId);
    assertSocketReady(session, sessionId);

    const { normalizedJid: jid } = normalizeWhatsAppContactIdentity(to);

    let result;
    try {
        result = await withSendTimeout(() => session.sock.sendMessage(jid, {
            text,
            ...options
        }), sessionId, 'sendTextMessage');
    } catch (sendErr) {
        if (sendErr?.code === 'WA_SEND_TIMEOUT') {
            requestReconnect(sessionId, session?.companyId, 'send_timeout');
        }
        throw sendErr;
    }

    // إذا تم تمرير userId، قم بتحديث الرسالة
    if (options.userId && result.key.id) {
        try {
            await getSharedPrismaClient().whatsAppMessage.upsert({
                where: { messageId: result.key.id },
                update: { senderId: options.userId },
                create: {
                    sessionId,
                    remoteJid: jid,
                    messageId: result.key.id,
                    fromMe: true,
                    messageType: 'TEXT',
                    content: text,
                    timestamp: new Date(),
                    senderId: options.userId,
                    status: 'SENT'
                }
            });
        } catch (e) {
            console.error('Failed to save senderId for message:', e);
        }
    }

    return result;
}

/**
 * إرسال رسالة وسائط
 */
async function sendMediaMessage(sessionId, to, media, options = {}) {
    const session = activeSessions.get(sessionId);
    assertSocketReady(session, sessionId);

    const { normalizedJid: jid } = normalizeWhatsAppContactIdentity(to);

    let result;
    try {
        result = await withSendTimeout(() => session.sock.sendMessage(jid, media, options), sessionId, 'sendMediaMessage');
    } catch (sendErr) {
        if (sendErr?.code === 'WA_SEND_TIMEOUT') {
            requestReconnect(sessionId, session?.companyId, 'send_timeout');
        }
        throw sendErr;
    }

    // إذا تم تمرير userId، قم بتحديث الرسالة
    if (options.userId && result.key.id) {
        try {
            await getSharedPrismaClient().whatsAppMessage.upsert({
                where: { messageId: result.key.id },
                update: { senderId: options.userId },
                create: {
                    sessionId,
                    remoteJid: jid,
                    messageId: result.key.id,
                    fromMe: true,
                    messageType: 'IMAGE', // افتراضي، سيتم تحديثه لاحقاً
                    timestamp: new Date(),
                    senderId: options.userId,
                    status: 'SENT'
                }
            });
        } catch (e) {
            console.error('Failed to save senderId for media message:', e);
        }
    }

    return result;
}

/**
 * تحديد الرسائل كمقروءة
 */
async function markAsRead(sessionId, remoteJid, messageKeys) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    try {
        if (typeof session.sock.readMessages === 'function') {
            await session.sock.readMessages(messageKeys);
        } else if (typeof session.sock.chatModify === 'function') {
            // For chatModify we need the last message key usually
            // If messageKeys is passed, we can use the last one
            const lastKey = messageKeys[messageKeys.length - 1];
            if (lastKey) {
                await session.sock.chatModify({
                    markRead: true,
                    lastMessages: [{ key: lastKey }]
                }, remoteJid);
            }
        }
    } catch (e) {
        console.warn('Failed to mark read on socket:', e);
    }

    // تحديث قاعدة البيانات
    await getSharedPrismaClient().whatsAppContact.updateMany({
        where: {
            sessionId,
            jid: remoteJid
        },
        data: {
            unreadCount: 0
        }
    });
}

/**
 * إرسال حالة الكتابة
 */
async function sendTyping(sessionId, to, isTyping = true) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') return;

    const { normalizedJid: jid } = normalizeWhatsAppContactIdentity(to);

    await session.sock.sendPresenceUpdate(isTyping ? 'composing' : 'paused', jid);
}

/**
 * تعديل رسالة
 */
async function editMessage(sessionId, to, key, newText) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    const { normalizedJid: jid } = normalizeWhatsAppContactIdentity(to);

    await session.sock.sendMessage(jid, {
        text: newText,
        edit: key
    });
}

/**
 * حذف رسالة (للجميع)
 */
async function deleteMessage(sessionId, to, key) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    const { normalizedJid: jid } = normalizeWhatsAppContactIdentity(to);

    await session.sock.sendMessage(jid, {
        delete: key
    });
}

/**
 * إعادة توجيه رسالة
 */
async function forwardMessage(sessionId, to, message) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    const { normalizedJid: jid } = normalizeWhatsAppContactIdentity(to);

    await session.sock.sendMessage(jid, {
        forward: message
    });
}

/**
 * أرشفة/ إلغاء أرشفة محادثة
 */
async function archiveChat(sessionId, jid, archive = true) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    await session.sock.chatModify({ archive }, jid);
}

/**
 * تثبيت/إلغاء تثبيت محادثة
 */
async function pinChat(sessionId, jid, pin = true) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    await session.sock.chatModify({ pin }, jid);
}

/**
 * كتم/إلغاء كتم محادثة
 */
async function muteChat(sessionId, jid, mute = true) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    // mute for 8 hours if true, or unmute (null)
    const muteTime = mute ? 8 * 60 * 60 * 1000 : null;
    await session.sock.chatModify({ mute: muteTime }, jid);
}

/**
 * تحديد كغير مقروء
 */
async function markChatUnread(sessionId, jid, unread = true) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    await session.sock.chatModify({ markRead: !unread }, jid);
}

/**
 * مسح محتوى المحادثة
 */
async function clearChat(sessionId, jid) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    // Baileys uses chatModify with delete: true and lastMessages to clear chat
    await session.sock.chatModify({
        delete: true,
        lastMessages: [{
            key: { remoteJid: jid, fromMe: true, id: 'AAA' },
            messageTimestamp: Math.floor(Date.now() / 1000)
        }]
    }, jid);
}

/**
 * إرسال تفاعل (Reaction)
 */
async function sendReaction(sessionId, to, key, emoji) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    const { normalizedJid: jid } = normalizeWhatsAppContactIdentity(to);

    await session.sock.sendMessage(jid, {
        react: {
            text: emoji,
            key: key
        }
    });
}

/**
 * تحديث أو إنشاء جهة اتصال (Public)
 */
async function updateContact(sessionId, remoteJid, msg, sock, options = {}) {
    return await updateOrCreateContact(sessionId, remoteJid, msg, sock, options);
}

/**
 * الحصول على جلسة نشطة
 */
function getSession(sessionId) {
    return activeSessions.get(sessionId);
}

/**
 * الحصول على كل الجلسات النشطة لشركة
 */
function getCompanySessions(companyId) {
    const sessions = [];
    for (const [id, session] of activeSessions) {
        if (session.companyId === companyId) {
            sessions.push({
                sessionId: id,
                status: session.status,
                phoneNumber: session.phoneNumber,
                qrCode: session.qrCode
            });
        }
    }
    return sessions;
}

/**
 * إغلاق جلسة
 */
async function closeSession(sessionId) {
    clearReconnectTimer(sessionId);
    manualLogoutSessions.add(sessionId);
    try {
        const session = activeSessions.get(sessionId);
        if (session) {
            const companyId = session.companyId;
            try {
                cleanupSocketListeners(session.sock);
                await session.sock.logout();
            } catch (e) {
                // Ignore logout errors
            }
            try {
                await session.sock.end(new Error('Session closed'));
            } catch (e) {
                // Ignore end errors
            }
            session.sock = null;
            activeSessions.delete(sessionId);
            cleanupSessionState(sessionId, companyId);
        }

        await clearDatabaseAuthState(sessionId);

        // Update database
        await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            return await prisma.whatsAppSession.update({
                where: { id: sessionId },
                data: {
                    status: 'LOGGED_OUT',
                    lastDisconnectedAt: new Date()
                }
            });
        }, 5);
    } finally {
        manualLogoutSessions.delete(sessionId);
    }
}

/**
 * حذف جلسة نهائياً
 */
async function deleteSession(sessionId, keepHistory = false) {
    await closeSession(sessionId);

    // حذف ملفات الجلسة
    const sessionPath = getSessionPath(sessionId);
    try {
        await fs.rm(sessionPath, { recursive: true, force: true });
    } catch (e) {
        // تجاهل الخطأ
    }

    // حذف من قاعدة البيانات
    await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        if (keepHistory) {
            const session = await prisma.whatsAppSession.findUnique({ where: { id: sessionId } });
            if (session) {
                let metadataObj = {};
                try {
                    if (session.metadata) {
                        metadataObj = JSON.parse(session.metadata);
                    }
                } catch (e) {}
                metadataObj.isDeleted = true;
                
                return await prisma.whatsAppSession.update({
                    where: { id: sessionId },
                    data: {
                        status: 'LOGGED_OUT',
                        metadata: JSON.stringify(metadataObj)
                    }
                });
            }
        } else {
            return await prisma.whatsAppSession.delete({
                where: { id: sessionId }
            });
        }
    }, 5);
}

/**
 * تسجيل حدث
 */
async function logEvent(sessionId, companyId, eventType, eventData, level = 'info') {
    try {
        await safeQuery(async () => {
            const prisma = getSharedPrismaClient();

            // Check if the model exists before trying to use it
            if (!prisma.whatsAppEventLog) {
                // Model missing from schema, log to console instead
                if (process.env.NODE_ENV === 'development') {
                    console.log(`📝 [WhatsApp Event] ${eventType} (session: ${sessionId}):`, eventData);
                }
                return null;
            }

            return await prisma.whatsAppEventLog.create({
                data: {
                    sessionId,
                    companyId,
                    eventType,
                    eventData: JSON.stringify(eventData),
                    level
                }
            });
        }, 3);
    } catch (error) {
        if (isPermissionError(error)) {
            // Silently handle permission errors - they're expected if DB user lacks INSERT permissions
            // Only log in development mode
            if (process.env.NODE_ENV === 'development') {
                console.warn(`⚠️ [DB-PERMISSION] Cannot log WhatsApp event: ${getPermissionErrorMessage(error)}`);
            }
        } else {
            console.error('❌ Error logging event:', error);
        }
    }
}

/**
 * استعادة الجلسات عند بدء السيرفر
 */
async function restoreAllSessions() {
    try {
        WA_LOG.restore(`Starting session restoration...`);

        await initSessionsDirectory();

        // جلب الجلسات النشطة من قاعدة البيانات
        const sessions = await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            if (!prisma || !prisma.whatsAppSession) {
                throw new Error('Prisma client not initialized');
            }
            try {
                return await prisma.whatsAppSession.findMany({
                    where: {
                        status: {
                            in: ['CONNECTED', 'DISCONNECTED', 'CONNECTING', 'QR_PENDING']
                        }
                    },
                    select: {
                        id: true,
                        companyId: true,
                        status: true,
                        metadata: true,
                        isDefault: true,
                        phoneNumber: true,
                        authState: true
                    }
                });
            } catch (error) {
                if (error?.code !== 'P2022') {
                    throw error;
                }

                const sql = `
                    SELECT
                        ${quoteSqlIdentifier('id')},
                        ${quoteSqlIdentifier('companyId')},
                        ${quoteSqlIdentifier('status')},
                        ${quoteSqlIdentifier('metadata')},
                        ${quoteSqlIdentifier('isDefault')},
                        ${quoteSqlIdentifier('phoneNumber')},
                        ${quoteSqlIdentifier('authState')}
                    FROM ${quoteSqlIdentifier('whatsapp_sessions')}
                    WHERE ${quoteSqlIdentifier('status')} IN ('CONNECTED', 'DISCONNECTED', 'CONNECTING', 'QR_PENDING')
                `;
                return await prisma.$queryRawUnsafe(sql);
            }
        }, 'WhatsAppManager', 7);

        if (!sessions || sessions.length === 0) {
            WA_LOG.restore(`No sessions to restore`);
            startSessionHealthCheck();
            return;
        }

        WA_LOG.restore(`Found ${sessions.length} session(s) to restore`);

        // Separate sessions: restore connected/connecting first, skip useless QR_PENDING without auth
        const prioritySessions = sessions.filter(s => s.status === 'CONNECTED' || s.status === 'CONNECTING');
        const qrPendingSessions = sessions.filter(s => s.status === 'QR_PENDING');
        const disconnectedSessions = sessions.filter(s => s.status === 'DISCONNECTED');

        // For QR_PENDING: only restore if they have valid auth state (someone scanned but not yet connected)
        const validQrPending = [];
        for (const s of qrPendingSessions) {
            const authState = parseJsonSafely(decryptField(s.authState), null);
            if (authState?.creds?.registered || authState?.creds?.me) {
                validQrPending.push(s);
                WA_LOG.restore(`Keeping QR_PENDING session ${s.id}: has valid auth state`);
            } else {
                WA_LOG.restore(`Skipping QR_PENDING session ${s.id}: no auth state (stale/fresh QR never scanned)`);
            }
        }

        const toRestore = [...prioritySessions, ...validQrPending, ...disconnectedSessions];
        const skipped = qrPendingSessions.length - validQrPending.length;
        if (skipped > 0) {
            WA_LOG.restore(`Skipped ${skipped} QR_PENDING session(s) without auth state`);
        }
        WA_LOG.restore(`Will restore ${toRestore.length} session(s)`);

        let restored = 0;
        let failed = 0;

        // Stagger restore: longer gap for more sessions to avoid WhatsApp flood rejection
        const staggerDelay = toRestore.length > 15 ? 3000 : toRestore.length > 5 ? 2000 : 1500;

        for (const session of toRestore) {
            try {
                const weight = session.isDefault ? 3 : 1;

                // Sprint 2: نستخدم HistoryImport state بدل metadata.importHistoryOnLink
                let enableHistorySync = false;
                try {
                    const historyImport = await getSharedPrismaClient().whatsAppSessionHistoryImport.findUnique({
                        where: { sessionId: session.id },
                        select: { status: true }
                    });
                    enableHistorySync = historyImport && ['REQUESTED', 'IN_PROGRESS'].includes(historyImport.status);
                } catch (e) {
                    // Fallback للجلسات القديمة (backfill خلصها)
                    const metadata = parseJsonSafely(session.metadata, {});
                    enableHistorySync = metadata.importHistoryOnLink === true && (session.status === 'QR_PENDING' || session.status === 'CONNECTING');
                }

                WA_LOG.restore(`Restoring session ${session.id} (status=${session.status}, phone=${session.phoneNumber || '?'})`);

                await createSession(session.id, session.companyId, {
                    isDefault: session.isDefault,
                    metadata: session.metadata,
                    loadBalanceWeight: weight,
                    syncFullHistory: enableHistorySync
                });

                restored++;

                if (toRestore.length > 1) {
                    await new Promise(resolve => setTimeout(resolve, staggerDelay));
                }
            } catch (error) {
                failed++;
                WA_LOG.error(session.id, `Failed to restore session:`, error.message);
            }
        }

        WA_LOG.restore(`Restored ${restored}/${sessions.length} sessions (${failed} failed)`);

        // Start health check to monitor session status
        startSessionHealthCheck();

        // Emit current session statuses to all companies after a short delay
        // This allows Baileys sockets to establish connections first
        setTimeout(() => {
            emitAllSessionStatuses();
            WA_LOG.restore(`Emitted initial session statuses to all companies`);
        }, 5000);

        WA_LOG.restore(`Session restoration complete`);
    } catch (error) {
        WA_LOG.error(null, `Error restoring sessions:`, error.message);
        startSessionHealthCheck();
    }
}


/**
 * إنشاء مجموعة جديدة
 */
async function createGroup(sessionId, subject, participants) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const group = await session.sock.groupCreate(subject, participants);
        console.log(`👥 Group created: ${group.id}`);
        return group;
    } catch (error) {
        console.error('❌ Error creating group:', error);
        throw error;
    }
}

/**
 * تحديث المشاركين في المجموعة (إضافة، حذف، ترقية، خفض رتبة)
 * action: 'add' | 'remove' | 'promote' | 'demote'
 */
async function updateGroupParticipants(sessionId, jid, participants, action) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const response = await session.sock.groupParticipantsUpdate(jid, participants, action);
        console.log(`👥 Group participants updated (${action}): ${jid}`);
        return response;
    } catch (error) {
        console.error(`❌ Error updating group participants (${action}):`, error);
        throw error;
    }
}

/**
 * جلب بيانات المجموعة
 */
async function getGroupMetadata(sessionId, jid) {
    console.log(`🔍 Getting group metadata for ${jid} using session ${sessionId}`);
    const session = getSession(sessionId);

    if (!session) {
        console.error(`❌ Session not found: ${sessionId}`);
        throw new Error('Session not found');
    }

    if (!session.sock) {
        console.error(`❌ Session socket not initialized for: ${sessionId}`);
        throw new Error('Session socket not initialized');
    }

    try {
        console.log(`📡 Calling groupMetadata for ${jid}...`);
        const metadata = await session.sock.groupMetadata(jid);
        console.log(`✅ Group metadata retrieved for ${jid}`);
        return metadata;
    } catch (error) {
        console.error(`❌ Error getting group metadata for ${jid}:`, error);
        // Log more details if available
        if (error.data) console.error('Error data:', error.data);
        throw error;
    }
}

/**
 * تحديث اسم المجموعة
 */
async function updateGroupSubject(sessionId, jid, subject) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.groupSubjectUpdate(jid, subject);
        console.log(`📝 Group subject updated: ${jid}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating group subject:', error);
        throw error;
    }
}

/**
 * تحديث وصف المجموعة
 */
async function updateGroupDescription(sessionId, jid, description) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.groupUpdateDescription(jid, description);
        console.log(`📝 Group description updated: ${jid}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating group description:', error);
        throw error;
    }
}

/**
 * تحديث إعدادات المجموعة
 * settings: 'announcement' | 'not_announcement' | 'locked' | 'unlocked'
 */
async function updateGroupSettings(sessionId, jid, settings) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.groupSettingUpdate(jid, settings);
        console.log(`⚙️ Group settings updated: ${jid} -> ${settings}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating group settings:', error);
        throw error;
    }
}

/**
 * مغادرة المجموعة
 */
async function leaveGroup(sessionId, jid) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.groupLeave(jid);
        console.log(`👋 Left group: ${jid}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error leaving group:', error);
        throw error;
    }
}

/**
 * الحصول على رابط دعوة المجموعة
 */
async function getGroupInviteCode(sessionId, jid) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const code = await session.sock.groupInviteCode(jid);
        return code;
    } catch (error) {
        console.error('❌ Error getting group invite code:', error);
        throw error;
    }
}

/**
 * إلغاء رابط دعوة المجموعة
 */
async function revokeGroupInviteCode(sessionId, jid) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const code = await session.sock.groupRevokeInvite(jid);
        return code;
    } catch (error) {
        console.error('❌ Error revoking group invite code:', error);
        throw error;
    }
}

/**
 * حظر جهة اتصال
 */
async function blockContact(sessionId, jid) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.updateBlockStatus(jid, 'block');
        console.log(`🚫 Blocked contact: ${jid}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error blocking contact:', error);
        throw error;
    }
}

/**
 * إلغاء حظر جهة اتصال
 */
async function unblockContact(sessionId, jid) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.updateBlockStatus(jid, 'unblock');
        console.log(`✅ Unblocked contact: ${jid}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error unblocking contact:', error);
        throw error;
    }
}

/**
 * تحديث حالة الملف الشخصي (About)
 */
async function updateProfileStatus(sessionId, status) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.updateProfileStatus(status);
        console.log(`📝 Profile status updated`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating profile status:', error);
        throw error;
    }
}

/**
 * تحديث اسم الملف الشخصي (Push Name)
 */
async function updateProfileName(sessionId, name) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.updateProfileName(name);
        console.log(`📝 Profile name updated: ${name}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating profile name:', error);
        throw error;
    }
}

/**
 * تحديث صورة الملف الشخصي
 */
async function updateProfilePicture(sessionId, jid, content) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.updateProfilePicture(jid, content);
        console.log(`🖼️ Profile picture updated for: ${jid}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating profile picture:', error);
        throw error;
    }
}

/**
 * التحقق من وجود الرقم على واتساب
 */
async function onWhatsApp(sessionId, number) {
    const dbSession = await getSharedPrismaClient().whatsAppSession.findUnique({
        where: { id: sessionId },
        select: { provider: true }
    });

    if (dbSession?.provider === 'META_CLOUD') {
        const jid = number.replace(/[^\d]/g, '');
        return { jid, exists: true };
    }

    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const { phoneNumber } = normalizeWhatsAppContactIdentity(number);

    if (session.status !== 'connected' || !session.sock) {
        throw new Error('الجلسة غير متصلة. يرجى التأكد من ربط الحساب أولاً.');
    }

    try {
        console.log(`🔍 Checking if number exists on WhatsApp: ${phoneNumber} (Original: ${number})`);
        const results = await session.sock.onWhatsApp(phoneNumber);
        
        if (!results || results.length === 0) {
            return null;
        }
        
        return results[0];
    } catch (error) {
        console.error('❌ Error checking number on WhatsApp:', error);
        
        if (error.message?.includes('not-authorized') || error.message?.includes('closed')) {
            throw new Error('انتهت صلاحية الجلسة أو تم فصلها. يرجى إعادة الاتصال.');
        }
        
        throw new Error('حدث خطأ أثناء الاتصال بخوادم واتساب. يرجى المحاولة لاحقاً.');
    }
}

// ==================== Business Profile Features ====================

/**
 * الحصول على ملف الأعمال
 */
async function getBusinessProfile(sessionId) {
    const session = getSession(sessionId);
    if (!session) {
        const dbSession = await getSharedPrismaClient().whatsAppSession.findUnique({ where: { id: sessionId } });
        if (dbSession?.provider === 'META_CLOUD') return null;
        throw new Error('Session not found');
    }

    try {
        const profile = await session.sock.getBusinessProfile(session.sock.user.id);
        return profile;
    } catch (error) {
        console.error('❌ Error getting business profile:', error);
        throw error;
    }
}

/**
 * تعيين ملف الأعمال
 */
async function setBusinessProfile(sessionId, profileData) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.setBusinessProfile(profileData);
        console.log('✅ Business profile set');
        return { success: true };
    } catch (error) {
        console.error('❌ Error setting business profile:', error);
        throw error;
    }
}

/**
 * تحديث ملف الأعمال
 */
async function updateBusinessProfile(sessionId, profileData) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.updateBusinessProfile(profileData);
        console.log('✅ Business profile updated');
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating business profile:', error);
        throw error;
    }
}

/**
 * الحصول على ساعات العمل
 */
async function getBusinessHours(sessionId) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const hours = await session.sock.getBusinessHours(session.sock.user.id);
        return hours;
    } catch (error) {
        console.error('❌ Error getting business hours:', error);
        throw error;
    }
}

/**
 * تعيين ساعات العمل
 */
async function setBusinessHours(sessionId, hours) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.setBusinessHours(hours);
        console.log('✅ Business hours set');
        return { success: true };
    } catch (error) {
        console.error('❌ Error setting business hours:', error);
        throw error;
    }
}

// ==================== Broadcast Features ====================

/**
 * إرسال رسالة بث جماعي
 */
async function sendBroadcast(sessionId, jids, message) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const results = await session.sock.sendBroadcast(jids, message);
        console.log(`📢 Broadcast sent to ${jids.length} recipients`);
        return results;
    } catch (error) {
        console.error('❌ Error sending broadcast:', error);
        throw error;
    }
}

/**
 * إنشاء قائمة بث
 */
async function createBroadcastList(sessionId, name, jids) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const list = await session.sock.createBroadcastList(name, jids);
        console.log(`📢 Broadcast list created: ${name}`);
        return list;
    } catch (error) {
        console.error('❌ Error creating broadcast list:', error);
        throw error;
    }
}

/**
 * جلب قوائم البث
 */
async function getBroadcastLists(sessionId) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const lists = await session.sock.getBroadcastLists();
        return lists;
    } catch (error) {
        console.error('❌ Error getting broadcast lists:', error);
        throw error;
    }
}

// ==================== Labels Features ====================

// خريطة تحويل ألوان الهيكس إلى أرقام LabelColor المدعومة من واتساب (0-19)
const LABEL_COLORS = [
    '#FF5722', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
    '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
    '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800',
];
const HEX_TO_LABEL_COLOR_INDEX = Object.fromEntries(
    LABEL_COLORS.map((hex, i) => [hex.toUpperCase(), i])
);
const resolveLabelColor = (color) => {
    if (typeof color === 'number' && color >= 0 && color <= 19) return color;
    if (typeof color === 'string') {
        const idx = HEX_TO_LABEL_COLOR_INDEX[color.toUpperCase()];
        if (idx !== undefined) return idx;
    }
    return 0;
};
const formatLabelColor = (colorIndex) => LABEL_COLORS[colorIndex] || LABEL_COLORS[0];

/**
 * إضافة علامة للمحادثة
 */
async function labelChat(sessionId, jid, labelId) {
    const session = getSession(sessionId);
    if (!session) {
        const dbSession = await getSharedPrismaClient().whatsAppSession.findUnique({ where: { id: sessionId } });
        if (dbSession?.provider === 'META_CLOUD') return { success: true };
        throw new Error('Session not found');
    }

    try {
        const result = await session.sock.addChatLabel(jid, labelId);
        console.log(`🏷️ Chat labeled: ${jid} label=${labelId}`, result ? JSON.stringify(result) : '');
        return { success: true };
    } catch (error) {
        console.error(`❌ Error labeling chat: ${jid} label=${labelId}`);
        console.error(`   [BAILEYS-ERR] ${error?.message} | code=${error?.output?.statusCode} | stack=${error?.stack?.split('\n').slice(0, 3).join(' | ')}`);
        throw error;
    }
}

/**
 * جلب العلامات (من cache session + الداتابيز كـ fallback)
 */
async function getLabels(sessionId) {
    const session = getSession(sessionId);

    try {
        let labels = [];
        if (session) {
            labels = Array.from(session.labels.values());
        }

        // لو الـ cache فاضي (مثلاً بعد إعادة تشغيل السيرفر) — نجيب من الداتابيز
        if (labels.length === 0) {
            try {
                const prisma = getSharedPrismaClient();
                if (prisma.whatsAppLabel) {
                    const dbLabels = await prisma.whatsAppLabel.findMany({
                        where: { sessionId, deleted: false }
                    });
                    labels = dbLabels.map(l => ({
                        id: l.id,
                        name: l.name,
                        color: l.color,
                        predefinedId: l.predefinedId
                    }));
                    // نرجع نملّي الـ cache لو الجلسة موجودة
                    if (session) {
                        for (const l of labels) {
                            session.labels.set(l.id, l);
                        }
                    }
                }
            } catch (dbErr) {
                console.error('❌ Error loading labels from DB:', dbErr.message);
            }
        }

        return labels.map(label => ({
            id: label.id,
            name: label.name,
            color: formatLabelColor(label.color),
            predefinedId: label.predefinedId,
            chatCount: session?.labelAssociations.get(label.id)?.size || 0
        }));
    } catch (error) {
        console.error('❌ Error getting labels:', error);
        throw error;
    }
}

/**
 * حفظ/إزالة تصنيف لمحادثة في الداتابيز
 */
async function persistLabelAssociation(sessionId, chatJid, labelId, isAdd) {
    try {
        const prisma = getSharedPrismaClient();
        const contact = await prisma.whatsAppContact.findFirst({
            where: { sessionId, jid: chatJid }
        });
        if (!contact) return;
        const current = (() => { try { return JSON.parse(contact.labels || '[]'); } catch { return []; } })();
        const updated = isAdd
            ? (current.includes(labelId) ? current : [...current, labelId])
            : current.filter(id => id !== labelId);
        await prisma.whatsAppContact.update({
            where: { id: contact.id },
            data: { labels: JSON.stringify(updated) }
        });
    } catch (err) {
        console.error('❌ Error persisting label association:', err.message);
    }
}

/**
 * حفظ تعريف تصنيف في الداتابيز
 */
async function persistLabelDefinition(sessionId, label) {
    try {
        const prisma = getSharedPrismaClient();
        if (!prisma.whatsAppLabel) return;
        if (label.deleted) {
            await prisma.whatsAppLabel.deleteMany({
                where: { sessionId, id: label.id }
            });
        } else {
            await prisma.whatsAppLabel.upsert({
                where: { sessionId_id: { sessionId, id: label.id } },
                create: {
                    id: label.id,
                    sessionId,
                    name: label.name || '',
                    color: parseInt(label.color) || 0,
                    predefinedId: label.predefinedId ? String(label.predefinedId) : null,
                    deleted: false
                },
                update: {
                    name: label.name || '',
                    color: parseInt(label.color) || 0,
                    predefinedId: label.predefinedId ? String(label.predefinedId) : null,
                    deleted: false
                }
            });
        }
    } catch (err) {
        console.error('❌ Error persisting label definition:', err.message);
    }
}

/**
 * مزامنة يدوية للتصنيفات — يطلب من واتساب إعادة مزامنة الـ app state
 * Baileys v6 لا يدعم IQ query للتصنيفات مباشرة.
 * الحل: نستخدم resyncAppState('regular') لإعادة جلب الـ sync actions
 * بما فيها label_edit و label_jid، وأحداث labels.edit / labels.association
 * هتملأ session.labels و session.labelAssociations تلقائياً.
 */
async function syncLabels(sessionId) {
    const session = getSession(sessionId);
    if (!session) {
        return [];
    }

    try {
        // نجرب نزامن من واتساب، لكن مع timeout حماية عشان ميحبسش الطلب
        if (session.sock?.resyncAppState) {
            try {
                const myKeyId = session.sock.authState?.creds?.myAppStateKeyId;
                console.log(`🔍 [SYNC-LABELS] myAppStateKeyId present=${!!myKeyId} value=${myKeyId || 'NONE'}`);
                // جملة reset للـ app-state-sync-version عشان نجبر واتساب يبعت snapshot كامل
                // (الـ resync من غير reset بيجيب patches زيادة بس — ومفيش patches جديدة فبيرجع فاضي)
                const keys = session.sock.authState?.keys;
                if (keys?.get && keys?.set) {
                    try {
                        // الـ makeCacheableSignalKeyStore عنده cache داخلي (TTL) — بنضربه عشان الـ get يقرا من الـ DB
                        if (typeof keys.clear === 'function') {
                            try { await keys.clear(); } catch { /* clear may not be supported */ }
                        }
                        const before = await keys.get('app-state-sync-version', ['regular', 'regular_high', 'regular_low', 'critical_block', 'critical_unblock_low']);
                        console.log(`🔍 [SYNC-LABELS] Current app-state versions:`, JSON.stringify(Object.keys(before).map(k => ({ c: k, v: before[k]?.version }))));
                        await keys.set({
                            'app-state-sync-version': {
                                regular: null,
                                regular_high: null,
                                regular_low: null,
                                critical_block: null,
                                critical_unblock_low: null
                            }
                        });
                        console.log('🔍 [SYNC-LABELS] Reset app-state-sync-version to force full snapshot');
                    } catch (keyErr) {
                        console.log('⚠️ Failed to reset app-state-sync-version:', keyErr.message);
                    }
                } else {
                    console.log('🔍 [SYNC-LABELS] keys unavailable:', !!keys, keys && Object.keys(keys));
                }
                await Promise.race([
                    session.sock.resyncAppState(['regular', 'regular_high', 'regular_low', 'critical_block', 'critical_unblock_low'], true),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('resyncAppState timeout')), 30000))
                ]);
                console.log(`🔍 [SYNC-LABELS] After resyncAppState: ${session.labels.size} labels, ${session.labelAssociations.size} associations`);
            } catch (resyncErr) {
                console.log('⚠️ resyncAppState failed, using existing cache:', resyncErr.message);
            }
        }
        // حفظ associations في الداتابيز
        try {
            const prisma = getSharedPrismaClient();
            const allContacts = await prisma.whatsAppContact.findMany({
                where: { sessionId },
                select: { id: true, jid: true, labels: true }
            });
            for (const contact of allContacts) {
                const assignedLabels = [];
                for (const [labelId, jids] of session.labelAssociations) {
                    if (jids.has(contact.jid)) {
                        assignedLabels.push(labelId);
                    }
                }
                const dbLabels = (() => { try { return JSON.parse(contact.labels || '[]'); } catch { return []; } })();
                const merged = Array.from(new Set([...assignedLabels, ...dbLabels]));
                if (JSON.stringify(merged) !== contact.labels) {
                    await prisma.whatsAppContact.update({
                        where: { id: contact.id },
                        data: { labels: JSON.stringify(merged) }
                    });
                }
            }
            console.log(`💾 Labels persisted to DB for session: ${sessionId}`);
        } catch (dbErr) {
            console.error('❌ Error persisting labels to DB:', dbErr.message);
        }

        let labels = Array.from(session.labels.values());

        // من غير reconnect — بندفع الـ app state sync ونستنى الـ events من غير ما نقطع الاتصال
        let activeSession = session;
        try {
            if (session.sock?.resyncAppState) {
                await Promise.race([
                    session.sock.resyncAppState(['regular', 'regular_high', 'regular_low', 'critical_block', 'critical_unblock_low'], false),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('resyncAppState timeout')), 15000))
                ]);
            }
            // نستنى شوية عشان الـ labels.edit events تيجي من غير ما نقطع الاتصال
            for (let i = 0; i < 6; i++) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                const refreshed = getSession(sessionId);
                if (refreshed && refreshed.labels.size > labels.length) {
                    activeSession = refreshed;
                    labels = Array.from(refreshed.labels.values());
                    console.log(`🔍 [SYNC-LABELS] Got ${labels.length} labels after app-state sync (attempt ${i + 1})`);
                    break;
                }
            }
        } catch (resyncErr) {
            console.log('⚠️ app-state sync failed during label sync:', resyncErr.message);
        }

        // لو لسه فاضي — نجيب من الداتابيز
        if (labels.length === 0) {
            try {
                const prisma = getSharedPrismaClient();
                if (prisma.whatsAppLabel) {
                    const dbLabels = await prisma.whatsAppLabel.findMany({
                        where: { sessionId, deleted: false }
                    });
                    labels = dbLabels.map(l => ({ id: l.id, name: l.name, color: l.color, predefinedId: l.predefinedId }));
                    for (const l of labels) {
                        activeSession.labels.set(l.id, l);
                    }
                }
            } catch (dbErr) {
                console.error('❌ Error loading labels from DB on sync:', dbErr.message);
            }
        }

        console.log(`🔄 Labels sync completed for session: ${sessionId} (${labels.length} labels)`);

        return labels.map(label => ({
            id: label.id,
            name: label.name,
            color: formatLabelColor(label.color),
            predefinedId: label.predefinedId,
            chatCount: activeSession.labelAssociations.get(label.id)?.size || 0
        }));
    } catch (error) {
        console.error('❌ Error syncing labels:', error);
        return getLabels(sessionId);
    }
}

/**
 * إنشاء علامة جديدة
 */
async function createLabel(sessionId, name, color) {
    const session = getSession(sessionId);
    if (!session) {
        const dbSession = await getSharedPrismaClient().whatsAppSession.findUnique({ where: { id: sessionId } });
        if (dbSession?.provider === 'META_CLOUD') return { success: true, id: `meta_${Date.now()}`, name, color };
        throw new Error('Session not found');
    }

    try {
        const labelId = crypto.randomUUID();
        const colorIndex = resolveLabelColor(color);

        // 💾 Store in-memory cache first (so it's available immediately)
        const colorHex = formatLabelColor(colorIndex);
        session.labels.set(labelId, {
            id: labelId,
            name,
            color: colorIndex,
        });

        // 📡 Try Baileys sync (non-blocking - don't fail if disconnected)
        try {
            const addResult = await session.sock.addLabel(labelId, { id: labelId, name, color: colorIndex });
            console.log(`🏷️ Label created via Baileys: ${name} (${labelId})`, addResult ? JSON.stringify(addResult) : '');
        } catch (baileysErr) {
            console.log(`⚠️ Label saved locally (Baileys unavailable): ${name} (${labelId})`);
            console.log(`   [BAILEYS-ERR] ${baileysErr?.message} | code=${baileysErr?.output?.statusCode} | stack=${baileysErr?.stack?.split('\n').slice(0, 3).join(' | ')}`);
        }

        return { id: labelId, name, color: colorHex };
    } catch (error) {
        console.error('❌ Error creating label:', error);
        throw error;
    }
}

/**
 * استعادة التصنيفات الافتراضية القديمة (اللي كانت موجودة على حساب واتساب سابق)
 * بيعمل create لكل تصنيف مش موجود حالياً في الجلسة
 */
const DEFAULT_LABELS = [
    { name: 'زبون جديد', color: '#2196F3' },
    { name: 'مهم', color: '#FF5722' },
    { name: 'متدربة جديده', color: '#4CAF50' },
    { name: 'اوردرات واتساب', color: '#9C27B0' },
    { name: 'تواريخ ميلاد', color: '#FF9800' },
    { name: 'غير مقروءة', color: '#607D8B' },
    { name: 'المفضلة', color: '#E91E63' },
    { name: 'المجموعات', color: '#00BCD4' },
    { name: '000', color: '#795548' },
];

async function restoreDefaultLabels(sessionId) {
    const session = getSession(sessionId);
    if (!session) {
        throw new Error('Session not found');
    }

    const existingNames = new Set(
        Array.from(session.labels.values()).map(l => String(l.name || '').trim())
    );

    const created = [];
    for (const def of DEFAULT_LABELS) {
        if (existingNames.has(def.name)) continue;
        try {
            const result = await createLabel(sessionId, def.name, def.color);
            created.push({ name: def.name, id: result.id });
        } catch (err) {
            console.error(`❌ Error restoring label ${def.name}:`, err.message);
        }
    }

    console.log(`🏷️ Restore labels: created ${created.length} labels for session ${sessionId}`);
    return { created, total: DEFAULT_LABELS.length };
}

/**
 * حذف علامة
 */
async function deleteLabel(sessionId, labelId) {
    const session = getSession(sessionId);
    if (!session) {
        const dbSession = await getSharedPrismaClient().whatsAppSession.findUnique({ where: { id: sessionId } });
        if (dbSession?.provider === 'META_CLOUD') return { success: true };
        throw new Error('Session not found');
    }

    try {
        // 💾 Remove from in-memory cache first
        session.labels.delete(labelId);
        session.labelAssociations.delete(labelId);

        // 📡 Try Baileys sync (non-blocking)
        try {
            await session.sock.addLabel(labelId, { id: labelId, deleted: true });
            console.log(`🏷️ Label deleted via Baileys: ${labelId}`);
        } catch (baileysErr) {
            console.log(`⚠️ Label removed locally (Baileys unavailable): ${labelId}`);
        }

        return { success: true };
    } catch (error) {
        console.error('❌ Error deleting label:', error);
        throw error;
    }
}

/**
 * إزالة تصنيف من محادثة
 */
async function removeChatLabel(sessionId, jid, labelId) {
    const session = getSession(sessionId);
    if (!session) {
        const dbSession = await getSharedPrismaClient().whatsAppSession.findUnique({ where: { id: sessionId } });
        if (dbSession?.provider === 'META_CLOUD') return { success: true };
        throw new Error('Session not found');
    }

    try {
        await session.sock.removeChatLabel(jid, labelId);
        console.log(`🏷️ Label removed from chat: ${jid}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error removing label from chat:', error);
        throw error;
    }
}

/**
 * جلب عملاء تصنيف معين (من الداتابيز + الذاكرة للمزامنة اللحظية)
 */
async function getLabelContacts(sessionId, labelId, options = {}) {
    const { page = 1, limit = 50, search = '' } = options;
    const prisma = getSharedPrismaClient();

    const where = {
        sessionId,
        labels: { contains: `"${labelId}"` }
    };
    if (search) {
        where.OR = [
            { name: { contains: search } },
            { pushName: { contains: search } },
            { phoneNumber: { contains: search } }
        ];
    }

    const select = {
        id: true,
        sessionId: true,
        jid: true,
        phoneNumber: true,
        name: true,
        pushName: true,
        profilePicUrl: true,
        isGroup: true,
        customerId: true,
        lastMessageAt: true,
        lastMessagePreview: true,
        totalMessages: true
    };

    const session = getSession(sessionId);
    const inMemoryJids = session?.labelAssociations?.get(labelId);

    // المصدر الأساسي: الارتباطات اللحظية من الذاكرة (الموجودة من أحداث واتساب)
    // الـ DB لوحده مش كفاية لأن الـ associations بتتخزن فيه بعد ما الـ contacts نفسها تتخزن.
    const sourceJids = inMemoryJids && inMemoryJids.size > 0
        ? [...inMemoryJids]
        : [];

    // لو في بحث، نرشح الـ jids على الـ contact details من الداتابيز
    let contacts = [];
    let total = 0;
    if (sourceJids.length > 0) {
        let dbContacts = await prisma.whatsAppContact.findMany({
            where: { sessionId, jid: { in: sourceJids } },
            select
        });
        const knownJids = new Set(dbContacts.map(c => c.jid));

        // الـ jids اللي لسه متتخزنش في الداتابيز — نضيفهم بأبسط بيانات (jid فقط)
        const missingJids = sourceJids.filter(jid => !knownJids.has(jid));
        if (missingJids.length > 0) {
            dbContacts = [
                ...dbContacts,
                ...missingJids.map(jid => ({ id: null, sessionId, jid, phoneNumber: String(jid).split('@')[0], name: null, pushName: null, profilePicUrl: null, isGroup: String(jid).includes('@g.us'), customerId: null, lastMessageAt: null, lastMessagePreview: null, totalMessages: 0 }))
            ];
        }

        if (search) {
            const q = search.toLowerCase();
            dbContacts = dbContacts.filter(c =>
                (c.name?.toLowerCase() || '').includes(q) ||
                (c.pushName?.toLowerCase() || '').includes(q) ||
                (c.phoneNumber || '').includes(q)
            );
        }

        dbContacts.sort((a, b) => (b.lastMessageAt?.getTime?.() || 0) - (a.lastMessageAt?.getTime?.() || 0));
        total = dbContacts.length;
        contacts = dbContacts.slice((page - 1) * limit, (page - 1) * limit + limit);
    } else {
        // Fallback: لو مفيش associations في الذاكرة، نستخدم الداتابيز
        const [dbContacts, dbTotal] = await Promise.all([
            prisma.whatsAppContact.findMany({
                where,
                orderBy: [{ lastMessageAt: 'desc' }],
                skip: (page - 1) * limit,
                take: limit,
                select
            }),
            prisma.whatsAppContact.count({ where })
        ]);
        contacts = dbContacts;
        total = dbTotal;
    }

    return {
        contacts,
        total,
        page,
        limit,
        sessionConnected: Boolean(session)
    };
}

// ==================== Starred Messages Features ====================

/**
 * تمييز رسالة
 */
async function starMessage(sessionId, key) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.starMessage(key);
        console.log('⭐ Message starred');
        return { success: true };
    } catch (error) {
        console.error('❌ Error starring message:', error);
        throw error;
    }
}

/**
 * إلغاء تمييز رسالة
 */
async function unstarMessage(sessionId, key) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.unstarMessage(key);
        console.log('⭐ Message unstarred');
        return { success: true };
    } catch (error) {
        console.error('❌ Error unstarring message:', error);
        throw error;
    }
}

/**
 * جلب الرسائل المميزة
 */
async function getStarredMessages(sessionId, jid) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const messages = await session.sock.getStarredMessages(jid);
        return messages;
    } catch (error) {
        console.error('❌ Error getting starred messages:', error);
        throw error;
    }
}

// ==================== Privacy Features ====================

/**
 * جلب قائمة المحظورين
 */
async function fetchBlocklist(sessionId) {
    const session = getSession(sessionId);
    if (!session) {
        const dbSession = await getSharedPrismaClient().whatsAppSession.findUnique({ where: { id: sessionId } });
        if (dbSession?.provider === 'META_CLOUD') return [];
        throw new Error('Session not found');
    }

    try {
        const blocklist = await session.sock.fetchBlocklist();
        return blocklist;
    } catch (error) {
        console.error('❌ Error fetching blocklist:', error);
        throw error;
    }
}

/**
 * جلب إعدادات الخصوصية
 */
async function fetchPrivacySettings(sessionId) {
    const session = getSession(sessionId);
    if (!session) {
        const dbSession = await getSharedPrismaClient().whatsAppSession.findUnique({ where: { id: sessionId } });
        if (dbSession?.provider === 'META_CLOUD') return null;
        throw new Error('Session not found');
    }

    try {
        const settings = await session.sock.fetchPrivacySettings();
        return settings;
    } catch (error) {
        console.error('❌ Error fetching privacy settings:', error);
        throw error;
    }
}

/**
 * تعيين إعدادات الخصوصية
 */
async function setPrivacy(sessionId, settings) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.setPrivacy(settings);
        console.log('🔒 Privacy settings updated');
        return { success: true };
    } catch (error) {
        console.error('❌ Error setting privacy:', error);
        throw error;
    }
}

// ==================== Advanced Group Features ====================

/**
 * جلب جميع المجموعات التي يشارك فيها المستخدم
 */
async function groupFetchAllParticipating(sessionId) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const groups = await session.sock.groupFetchAllParticipating();
        return groups;
    } catch (error) {
        console.error('❌ Error fetching all groups:', error);
        throw error;
    }
}

/**
 * تفعيل/تعطيل الرسائل المؤقتة في المجموعة
 */
async function groupToggleEphemeral(sessionId, jid, ephemeral) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.groupToggleEphemeral(jid, ephemeral);
        console.log(`⏱️ Group ephemeral ${ephemeral ? 'enabled' : 'disabled'}: ${jid}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error toggling group ephemeral:', error);
        throw error;
    }
}

/**
 * تحديث صورة المجموعة
 */
async function groupUpdatePicture(sessionId, jid, picture) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.groupUpdatePicture(jid, picture);
        console.log(`🖼️ Group picture updated: ${jid}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating group picture:', error);
        throw error;
    }
}

/**
 * قبول دعوة للمجموعة
 */
async function groupInviteAccept(sessionId, inviteCode) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const result = await session.sock.groupInviteAccept(inviteCode);
        console.log('✅ Group invite accepted');
        return result;
    } catch (error) {
        console.error('❌ Error accepting group invite:', error);
        throw error;
    }
}

/**
 * رفض دعوة للمجموعة
 */
async function groupInviteReject(sessionId, inviteCode) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.groupInviteReject(inviteCode);
        console.log('❌ Group invite rejected');
        return { success: true };
    } catch (error) {
        console.error('❌ Error rejecting group invite:', error);
        throw error;
    }
}

/**
 * معلومات عن رابط الدعوة
 */
async function groupInviteInfo(sessionId, inviteCode) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const info = await session.sock.groupInviteInfo(inviteCode);
        return info;
    } catch (error) {
        console.error('❌ Error getting group invite info:', error);
        throw error;
    }
}

// ==================== Status Features ====================

/**
 * الحصول على حالة مستخدم معين
 */
async function getStatus(sessionId, jid) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const status = await session.sock.getStatus(jid);
        return status;
    } catch (error) {
        console.error('❌ Error getting status:', error);
        throw error;
    }
}

/**
 * تعيين حالة المستخدم
 * NOTE: setStatus is not supported by Baileys library
 */
async function setStatus(sessionId, status) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    // Baileys doesn't support setting status directly
    console.warn('⚠️ Setting WhatsApp status (About) is not supported by Baileys library');
    return {
        success: false,
        error: 'Setting status is not supported. Please update your status directly in WhatsApp app.'
    };
}

// ==================== URL Info ====================

/**
 * الحصول على معلومات رابط
 */
async function getUrlInfo(sessionId, url) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const info = await session.sock.getUrlInfo(url);
        return info;
    } catch (error) {
        console.error('❌ Error getting URL info:', error);
        throw error;
    }
}




/**
 * مزامنة الملف الشخصي (جلب من واتساب وحفظ في قاعدة البيانات)
 */
function getProfileSessionSnapshot(session) {
    const sock = session?.sock;
    const user = sock?.user;
    const jid = user?.id;

    if (!sock || !jid) {
        return null;
    }

    return {
        sock,
        user,
        jid,
        cleanJid: jid.split(':')[0] + '@s.whatsapp.net'
    };
}

async function syncProfile(sessionId) {
    const snapshot = getProfileSessionSnapshot(getSession(sessionId));
    if (!snapshot) {
        console.warn(`⚠️ Cannot sync profile for session ${sessionId}: Session not ready`);
        return null;
    }

    const { sock, user, cleanJid } = snapshot;

    try {
        console.log(`🔄 Syncing profile for session ${sessionId}...`);

        // 1. Get Status
        let status = '';
        try {
            const statusData = await sock.fetchStatus(cleanJid);
            status = statusData?.status || '';
        } catch (err) {
            console.warn(`⚠️ Failed to fetch status for ${sessionId}:`, err.message);
        }

        // 2. Get Profile Picture
        let profilePicUrl = null;
        try {
            profilePicUrl = await sock.profilePictureUrl(cleanJid, 'image');
        } catch (err) {
            // It's common to not have a profile pic or fail to fetch it
        }

        // 3. Get Name
        const name = user.name || user.notify || '';

        // 4. Update Database
        await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            return await prisma.whatsAppSession.update({
                where: { id: sessionId },
                data: {
                    profileName: name,
                    profileStatus: status,
                    profilePictureUrl: profilePicUrl
                }
            });

        });

        console.log(`✅ Profile synced for session ${sessionId}`);

        return {
            name,
            status,
            profilePicUrl
        };
    } catch (error) {
        console.error('❌ Error syncing profile:', error);
        throw error;
    }
}

/**
 * الحصول على الملف الشخصي (من قاعدة البيانات)
 */
async function getProfile(sessionId) {
    // Try to get from database first
    const sessionData = await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        return await prisma.whatsAppSession.findUnique({
            where: { id: sessionId },
            select: {
                profileName: true,
                profileStatus: true,
                profilePictureUrl: true
            }
        });
    });

    if (sessionData && (sessionData.profileName || sessionData.profileStatus || sessionData.profilePictureUrl)) {
        return {
            name: sessionData.profileName || '',
            status: sessionData.profileStatus || '',
            profilePicUrl: sessionData.profilePictureUrl || null
        };
    }

    // If not in DB, try to sync from the active Baileys session.
    return await syncProfile(sessionId);
}

/**
 * الحصول على كل الجلسات النشطة (للتصحيح)
 */
function getAllSessions() {
    const sessions = {};
    for (const [id, session] of activeSessions) {
        sessions[id] = {
            status: session.status,
            hasSocket: !!session.sock,
            isDeleted: false
        };
    }
    return sessions;
}

/**
 * جلب جميع الجلسات النشطة في الذاكرة مع بياناتها
 */
function getAllActiveSessions() {
    const sessions = {};
    for (const [id, session] of activeSessions) {
        sessions[id] = {
            sessionId: id,
            status: session.status,
            phoneNumber: session.phoneNumber,
            companyId: session.companyId,
            isConnected: session.status === 'connected',
            isDefault: session.isDefault,
            loadBalanceWeight: session.loadBalanceWeight,
            createdAt: session.createdAt,
            metadata: session.metadata,
            // Intentionally NOT including: sock, qrCode, pairingCode
        };
    }
    return sessions;
}

/**
 * قطع اتصال كل الجلسات (عند إيقاف السيرفر)
 */
async function disconnectAllSessions() {
    stopSessionHealthCheck();
    for (const sessionId of reconnectTimers.keys()) {
        clearReconnectTimer(sessionId);
    }
    for (const [sessionId, session] of activeSessions) {
        try {
            if (session?.sock) {
                cleanupSocketListeners(session.sock);
                await session.sock.end(new Error('Server shutting down'));
                session.sock = null;
            }
            cleanupSessionState(sessionId, session.companyId);
        } catch (error) {}
    }
    activeSessions.clear();
    manualLogoutSessions.clear();
    whatsappDisconnectAlertTimestamps.clear();
}

async function flushAllAuthStates() {
    let flushed = 0;
    try {
        if (typeof databaseAuthState.flushAllDatabaseAuthStates === 'function') {
            flushed += await databaseAuthState.flushAllDatabaseAuthStates();
        }
    } catch (e) {
        WA_LOG.error(null, `databaseAuthState.flushAllDatabaseAuthStates error: ${e.message}`);
    }
    for (const [sessionId, session] of activeSessions) {
        try {
            if (session?.saveCreds?.flush) {
                await session.saveCreds.flush();
                flushed++;
            }
        } catch (error) {
            WA_LOG.warn(sessionId, `Auth flush on shutdown failed: ${error.message}`);
        }
    }
    WA_LOG.restore(`Flushed auth state for ${flushed} session(s)`);
    return flushed;
}

async function migrateOldSessionHistory(companyId, phoneNumber, newSessionId) {
    if (!companyId || !phoneNumber || !newSessionId) return;

    await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        
        const oldSessions = await prisma.whatsAppSession.findMany({
            where: {
                companyId,
                phoneNumber,
                id: { not: newSessionId },
                status: { in: ['LOGGED_OUT', 'DISCONNECTED'] }
            },
            orderBy: { createdAt: 'asc' }
        });

        if (oldSessions.length === 0) return;

        WA_LOG.info(newSessionId, `Found ${oldSessions.length} older disconnected sessions for ${phoneNumber}. Migrating history...`);

        for (const oldSession of oldSessions) {
            try {
                await prisma.whatsAppMessage.updateMany({
                    where: { sessionId: oldSession.id },
                    data: { sessionId: newSessionId }
                });
            } catch (err) {
                WA_LOG.warn(newSessionId, `Error migrating messages from ${oldSession.id}: ${err.message}`);
            }

            const oldContacts = await prisma.whatsAppContact.findMany({
                where: { sessionId: oldSession.id }
            });

            for (const contact of oldContacts) {
                try {
                    const existingNew = await prisma.whatsAppContact.findUnique({
                        where: {
                            sessionId_jid: { sessionId: newSessionId, jid: contact.jid }
                        }
                    });

                    if (existingNew) {
                        await prisma.whatsAppContact.update({
                            where: { id: existingNew.id },
                            data: {
                                unreadCount: Math.max(existingNew.unreadCount || 0, contact.unreadCount || 0),
                                totalMessages: Math.max(existingNew.totalMessages || 0, contact.totalMessages || 0),
                                lastMessageAt: (existingNew.lastMessageAt && contact.lastMessageAt) 
                                    ? (existingNew.lastMessageAt > contact.lastMessageAt ? existingNew.lastMessageAt : contact.lastMessageAt) 
                                    : (existingNew.lastMessageAt || contact.lastMessageAt),
                                name: existingNew.name || contact.name,
                                pushName: existingNew.pushName || contact.pushName,
                                profilePicUrl: existingNew.profilePicUrl || contact.profilePicUrl,
                                customerId: existingNew.customerId || contact.customerId,
                                category: existingNew.category === 'LEAD' ? (contact.category || 'LEAD') : existingNew.category
                            }
                        });
                        await prisma.whatsAppContact.delete({ where: { id: contact.id } });
                    } else {
                        await prisma.whatsAppContact.update({
                            where: { id: contact.id },
                            data: { sessionId: newSessionId }
                        });
                    }
                } catch (err) {
                    WA_LOG.warn(newSessionId, `Error migrating contact ${contact.jid}: ${err.message}`);
                }
            }
            
            try {
                await prisma.whatsAppStatus.updateMany({
                    where: { sessionId: oldSession.id },
                    data: { sessionId: newSessionId }
                });
            } catch (err) {}

            try {
                await prisma.whatsAppEventLog.updateMany({
                    where: { sessionId: oldSession.id },
                    data: { sessionId: newSessionId }
                });
            } catch (err) {}

            try {
                await prisma.whatsAppSession.delete({
                    where: { id: oldSession.id }
                });
                WA_LOG.info(newSessionId, `Deleted old merged session ${oldSession.id}`);
            } catch (err) {
                WA_LOG.warn(newSessionId, `Failed to delete old session ${oldSession.id}: ${err.message}`);
            }
        }
    }, 3);
}

module.exports = {
    // Core
    createSession,
    getSession,
    deleteSession,
    closeSession,
    getAllSessions,
    getAllActiveSessions,
    disconnectAllSessions,
    flushAllAuthStates,

    // Connection
    restoreAllSessions,
    reconnectSession,
    requestHistorySync,
    syncPendingHistoryMedia,
    emitSessionStatusesForCompany,
    emitAllSessionStatuses,
    verifySessionHealth,
    getSocketReadyState,
    startSessionHealthCheck,
    stopSessionHealthCheck,

    // Messages
    sendMessage: sendTextMessage,
    sendMedia: sendMediaMessage,
    markAsRead,
    sendReaction,
    editMessage,
    deleteMessage,
    forwardMessage,
    sendTyping,
    getSession,
    getCompanySessions,

    // Chats
    archiveChat,
    pinChat,
    muteChat,
    markChatUnread,
    clearChat,

    // Profile Pics
    fetchMissingProfilePics,

    // Contacts
    updateContact,
    blockContact,
    unblockContact,
    resolveOutgoingRemoteJid,

    // Groups
    createGroup,
    getGroupMetadata,
    updateGroupSubject,
    updateGroupDescription,
    updateGroupSettings,
    updateGroupParticipants,
    leaveGroup,
    getGroupInviteCode,
    revokeGroupInviteCode,
    groupFetchAllParticipating,
    groupToggleEphemeral,
    groupUpdatePicture,
    groupInviteAccept,
    groupInviteReject,
    groupInviteInfo,

    // Business
    getBusinessProfile,
    setBusinessProfile,
    updateBusinessProfile,
    getBusinessHours,
    setBusinessHours,
    getProfile,
    syncProfile,

    // Broadcast
    sendBroadcast,
    createBroadcastList,
    getBroadcastLists,

    // Labels
    labelChat,
    getLabels,
    syncLabels,
    createLabel,
    deleteLabel,
    removeChatLabel,
    getLabelContacts,
    restoreDefaultLabels,

    // Starred Messages
    starMessage,
    unstarMessage,
    getStarredMessages,

    // Privacy
    fetchBlocklist,
    fetchPrivacySettings,
    setPrivacy,
    checkNumber: onWhatsApp, // Export as checkNumber to match controller usage or just onWhatsApp
    onWhatsApp,

    // Status
    getStatus,
    setStatus,

    // URL Info
    getUrlInfo,

    // Call Shield & Advanced Baileys
    updateCallShieldSettings,
    getBaileysProto,
    getGenerateWAMessageFromContent,

    // LID Resolution & Conversation Merge
    mergeLinkedDeviceConversation,
    resolveOutgoingRemoteJid,
    persistHistoryLidMappings,
    getPersistedLidMapping,
    handleContactsUpsert,

    // System
    logEvent,
    __testing: {
        toBooleanOption,
        shouldEnableFullHistorySync,
        getLiveStatusFromDbStatus,
        getDisconnectRecoveryDecision,
        getWhatsAppDisconnectAlertCategory,
        shouldSendWhatsAppDisconnectAlert,
        buildWhatsAppDisconnectAlertMessage,
        resetWhatsAppDisconnectAlertState: () => whatsappDisconnectAlertTimestamps.clear(),
        getIncomingMessageTimestampSeconds,
        shouldProcessIncomingMessage,
        getContactPhoneNumberForJid,
        getPhoneJidFromMessageKey,
        resolveLinkedDeviceRemoteJid,
        shouldProcessMessageUpsertType,
        getMessageStatusFromBaileysStatus,
        shouldApplyMessageStatus,
        classifySessionSocketHealth,
        getSocketReadyState,
        getProfileSessionSnapshot,
        isHistorySystemMessage,
        // Sprint 2: History import lifecycle helpers
        HISTORY_BATCH_SIZE,
        historyYield,
        normalizeHistoryProgress,
        requestReconnect,
        getReconnectState,
        hasPendingReconnect,
        releaseReconnectLock,
        getReconnectFailureCount,
        incrementReconnectFailureCount,
        resetReconnectFailures,
        giveUpOnReconnect,
        getSocketGeneration,
        getSessionHistoryImportState: async (prisma, sessionId) => {
            try {
                const imp = await prisma.whatsAppSessionHistoryImport.findUnique({
                    where: { sessionId },
                    select: { status: true, lastError: true }
                });
                return imp ? { status: imp.status, lastError: imp.lastError } : null;
            } catch (e) { return null; }
        },
        shouldEnableSyncOnRestore: (historyImportStatus) => {
            return historyImportStatus === 'REQUESTED' || historyImportStatus === 'IN_PROGRESS';
        },
        getFallbackEnableHistorySync: (sessionStatus, metadata) => {
            const meta = typeof metadata === 'string' ? (() => { try { return JSON.parse(metadata); } catch (e) { return {}; } })() : (metadata || {});
            return meta.importHistoryOnLink === true && (sessionStatus === 'QR_PENDING' || sessionStatus === 'CONNECTING');
        }
    }
};
