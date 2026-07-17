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
const getIO = () => socketService.getIO();

// Dynamic import for Baileys
let makeWASocket, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage, Browsers, isJidNewsletter;
const initBaileys = async () => {
    const baileys = await import('@whiskeysockets/baileys');
    makeWASocket = baileys.makeWASocket;
    DisconnectReason = baileys.DisconnectReason;
    fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
    downloadMediaMessage = baileys.downloadMediaMessage;
    Browsers = baileys.Browsers;
    isJidNewsletter = baileys.isJidNewsletter;
};
const { isPermissionError, getPermissionErrorMessage } = require('../../utils/dbPermissionHelper');
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

// ponytail: global reconnect throttle, per-session cooldowns if cycling persists
const lastReconnectTime = new Map();
const RECONNECT_COOLDOWN_MS = 30000;

// Health check configuration
const HEALTH_CHECK_INTERVAL = 25000; // 25 seconds
const HEALTH_CHECK_WARN_THRESHOLD = 60000; // 60 seconds in 'connecting' state = warn
const HEALTH_CHECK_RECONNECT_THRESHOLD = 120000; // 120 seconds in 'connecting' state = force reconnect
const WHATSAPP_DISCONNECT_ALERT_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes per session/category
let healthCheckTimerId = null;
let isHealthCheckRunning = false;

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

function clearReconnectTimer(sessionId) {
    if (reconnectTimers.has(sessionId)) {
        clearTimeout(reconnectTimers.get(sessionId));
        reconnectTimers.delete(sessionId);
    }
}

// ponytail: simple lock prevents concurrent reconnect for same session
const reconnectInProgress = new Set();

function isReconnecting(sessionId) {
    return reconnectInProgress.has(sessionId);
}

function markReconnecting(sessionId) {
    reconnectInProgress.add(sessionId);
}

function clearReconnecting(sessionId) {
    reconnectInProgress.delete(sessionId);
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
            const lastMsgRecv = session.sock.lastReceivedMessageTimestamp || 0;
            const now = Date.now();
            const staleThreshold = parseInt(process.env.STALE_CONNECTION_THRESHOLD_MS || '120000', 10);
            if (lastMsgRecv > 0 && (now - lastMsgRecv) > staleThreshold) {
                return { alive: true, stale: true, reason: 'no_recent_messages' };
            }
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

                        scheduleReconnectSession(sessionId, companyId, {
                            syncFullHistory: session.syncFullHistory || false
                        }, 1000);
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
                        scheduleReconnectSession(sessionId, companyId, {}, 500);
                    } else if (elapsed > HEALTH_CHECK_WARN_THRESHOLD) {
                        WA_LOG.health(sessionId, `Still connecting after ${Math.round(elapsed/1000)}s`);
                    }
                }

                // Update DB status to match in-memory if they differ
                const currentDbStatus = await safeQuery(async () => {
                    const prisma = getSharedPrismaClient();
                    const record = await prisma.whatsAppSession.findUnique({
                        where: { id: sessionId },
                        select: { status: true }
                    });
                    return record?.status;
                }, 3);

                const inMemoryStatus = session.status?.toUpperCase();
                if (currentDbStatus && currentDbStatus !== inMemoryStatus && inMemoryStatus) {
                    WA_LOG.health(sessionId, `Syncing DB status: ${currentDbStatus} -> ${inMemoryStatus}`);
                    await safeQuery(async () => {
                        const prisma = getSharedPrismaClient();
                        return await prisma.whatsAppSession.update({
                            where: { id: sessionId },
                            data: { status: inMemoryStatus }
                        });
                    }, 3);
                }
            } catch (sessionErr) {
                WA_LOG.error(sessionId, `Health check error:`, sessionErr.message);
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

function scheduleReconnectSession(sessionId, companyId, options = {}, delayMs = 5000, attempt = 0) {
    if (isReconnecting(sessionId)) {
        return;
    }
    clearReconnectTimer(sessionId);

    // Enforce minimum cooldown between reconnects
    const lastTime = lastReconnectTime.get(sessionId);
    const elapsed = lastTime ? Date.now() - lastTime : Infinity;
    const cooldownRemaining = Math.max(0, RECONNECT_COOLDOWN_MS - elapsed);

    // Exponential backoff with jitter for stability
    const baseDelay = Math.max(delayMs, cooldownRemaining);
    const maxDelay = 300000; // Cap at 5 minutes to keep attempting indefinitely without overloading
    const jitter = Math.random() * Math.min(baseDelay * 0.3, 3000);
    const actualDelay = Math.min(baseDelay + jitter, maxDelay);

    WA_LOG.reconnect(sessionId, `Scheduling reconnect attempt ${attempt + 1} in ${Math.round(actualDelay)}ms (base: ${baseDelay}ms)`, { 
        resetAuth: !!options.resetAuth,
        usePairingCode: !!options.usePairingCode
    });

    const timer = setTimeout(() => {
        reconnectTimers.delete(sessionId);
        lastReconnectTime.set(sessionId, Date.now());
        markReconnecting(sessionId);
        reconnectSession(sessionId, companyId, attempt, options).catch((error) => {
            WA_LOG.error(sessionId, `Scheduled reconnect failed: ${error.message}`);
            clearReconnecting(sessionId);
            // Indefinite reconnect for production SaaS stability, capped at maxDelay (5m)
            const nextDelay = Math.min(baseDelay * 1.5, maxDelay);
            scheduleReconnectSession(sessionId, companyId, options, nextDelay, attempt + 1);
        }).finally(() => {
            clearReconnecting(sessionId);
        });
    }, actualDelay);

    reconnectTimers.set(sessionId, timer);
}

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

            if (!phoneContact?.customerId && lidContact?.customerId) {
                contactUpdate.customer = {
                    connect: { id: lidContact.customerId }
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
                    pushName: mergedPushName,
                    profilePicUrl: lidContact?.profilePicUrl || null,
                    lastMessageAt: contactUpdate.lastMessageAt,
                    unreadCount,
                    totalMessages,
                    isGroup: false,
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

async function shouldProcessMessageUpsertType(type, fromMe, messageId, options = {}) {
    if (type === 'notify') return true;

    if (options.importHistory && type === 'append') return true;

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
    READ: 3
};

function getMessageStatusFromBaileysStatus(baileysStatus) {
    const statusMap = {
        1: 'PENDING',
        2: 'SENT',
        3: 'DELIVERED',
        4: 'READ'
    };
    const parsedStatus = Number(baileysStatus);

    if (statusMap[parsedStatus]) {
        return statusMap[parsedStatus];
    }

    const statusNameMap = {
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

        // الحصول على أحدث إصدار من Baileys مع fallback للنسخة المخزنة
        let version;
        try {
            const fetched = await fetchLatestBaileysVersion();
            version = fetched.version;
        } catch {
            version = [6, 7, 23];
            WA_LOG.warn(sessionId, `Failed to fetch latest Baileys version, using fallback ${version.join('.')}`);
        }
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
                        select: { metadata: true }
                    });
                    if (msg?.metadata) return JSON.parse(msg.metadata);
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
        const sock = makeWASocket(socketOptions);

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
            creds: state.creds
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
            try {
                await handleIncomingMessages(sessionId, companyId, m, sock);
            } catch (err) {
                console.error(`❌ [WhatsApp] Critical error in messages.upsert for ${sessionId}:`, err.message);
            }
        });

        sock.ev.on('messaging-history.set', async (history) => {
            try {
                await handleMessagingHistorySet(sessionId, companyId, history, sock);
            } catch (err) {
                console.error(`❌ [WhatsApp] Critical error in messaging-history.set for ${sessionId}:`, err.message);
            }
        });

        // معالجة تحديث حالة الرسائل
        sock.ev.on('messages.update', async (updates) => {
            await handleMessageStatusUpdate(sessionId, companyId, updates);
        });

        sock.ev.on('message-receipt.update', async (updates) => {
            await handleMessageReceiptUpdate(sessionId, companyId, updates);
        });

        // معالجة أحداث المجموعات
        sock.ev.on('groups.update', async (updates) => {
            await handleGroupsUpdate(sessionId, companyId, updates);
        });

        // معالجة أحداث جهات الاتصال
        sock.ev.on('contacts.update', async (updates) => {
            await handleContactsUpdate(sessionId, companyId, updates);
        });

        // معالجة أحداث الحضور (typing, online, etc.)
        sock.ev.on('presence.update', async (update) => {
            await handlePresenceUpdate(sessionId, companyId, update);
        });

        // معالجة أحداث المكالمات
        sock.ev.on('call.update', async (update) => {
            await handleCallUpdate(sessionId, companyId, update);
        });

        return sessionData;
    } catch (error) {
        console.error(`❌ Error creating session ${sessionId}:`, error);
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
                const currentData = sessionData ? { syncFullHistory: sessionData.syncFullHistory } : { syncFullHistory: false };
                activeSessions.delete(sessionId);
                if (sessionData?.sock) {
                    cleanupSocketListeners(sessionData.sock);
                    await endSocketQuietly(sessionData.sock, 'Connection closed - reconnecting');
                    sessionData.sock = null;
                }
                cleanupSessionState(sessionId, companyId);
                sessionHealthChecks.delete(sessionId);
                // 440 = connectionReplaced — back off harder to break the death spiral
                const reconnectDelay = statusCode === 440 ? 30000 : 3000;
                scheduleReconnectSession(sessionId, companyId, {
                    syncFullHistory: currentData.syncFullHistory
                }, reconnectDelay);
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
                activeSessions.delete(sessionId);
                sessionHealthChecks.delete(sessionId);
                untrackCompanySession(companyId, sessionId);
            }
        } else if (connection === 'open') {
            WA_LOG.ok(sessionId, `WhatsApp connection OPEN`);
            clearReconnectTimer(sessionId);

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
                sessionData.createdAt = new Date();
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
    }

    if (lastMessageAt) {
        updateData.lastMessageAt = lastMessageAt;
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
    sessionData.historySync = {
        ...summary,
        updatedAt: new Date()
    };

    for (const contact of contacts) {
        try {
            await upsertHistoryContact(sessionId, contact.jid || contact.id || contact.lid, {
                name: contact.name || contact.notify || contact.verifiedName
            });
        } catch (error) {
            console.warn(`⚠️ Failed to import WhatsApp history contact for ${sessionId}:`, error.message);
        }
    }

    for (const chat of chats) {
        try {
            await upsertHistoryContact(sessionId, chat.id, {
                name: chat.name,
                lastMessageAt: timestampToDate(chat.conversationTimestamp || chat.lastMessageRecvTimestamp)
            });
        } catch (error) {
            console.warn(`⚠️ Failed to import WhatsApp history chat for ${sessionId}:`, error.message);
        }
    }

    if (messages.length > 0) {
        await handleIncomingMessages(sessionId, companyId, {
            messages,
            type: 'append'
        }, sock, {
            importHistory: true,
            skipRealtimeEvents: true,
            skipNotifications: true,
            skipAI: true,
            skipCrmSync: true,
            skipMediaDownload: true
        });
    }

    io?.to(`company_${companyId}`).emit('whatsapp:history_sync', {
        sessionId,
        ...summary
    });

    await logEvent(sessionId, companyId, 'history_sync_imported', summary);
}

/**
 * معالجة الرسائل الواردة
 */
async function handleIncomingMessages(sessionId, companyId, m, sock, options = {}) {
    const { messages, type } = m;
    const io = getIO();
    const importHistory = Boolean(options.importHistory);

    if (!Array.isArray(messages) || messages.length === 0) return;

    for (const msg of messages) {
        try {
            let remoteJid = msg.key.remoteJid;
            const fromMe = Boolean(msg.key.fromMe);
            const messageId = msg.key.id;

            // Move messageId check BEFORE the upsert-type gate so we can feed it to the filter.
            if (!messageId) {
                console.warn(`⚠️ Skipping WhatsApp message without id in session ${sessionId}`);
                continue;
            }

            if (!(await shouldProcessMessageUpsertType(type, fromMe, messageId, { importHistory }))) {
                continue;
            }

            if (!shouldProcessIncomingMessage(msg)) {
                console.warn(`⚠️ Skipping WhatsApp message with future timestamp in session ${sessionId}`);
                continue;
            }

            const messageTimestampSeconds = getIncomingMessageTimestampSeconds(msg) || (Date.now() / 1000);
            const messageTimestamp = new Date(messageTimestampSeconds * 1000);

            // DEBUG: Log incoming message key
            await logEvent(sessionId, companyId, 'debug_incoming_msg', {
                key: msg.key,
                pushName: msg.pushName
            });

            // Handle @lid (Linked Device ID) by folding it into the phone JID when we know the mapping.
            if (remoteJid && isLinkedDeviceJid(remoteJid)) {
                const lidJid = normalizeWhatsAppContactIdentity(remoteJid).normalizedJid;
                const resolvedJid = await resolveLinkedDeviceRemoteJid(sessionId, remoteJid, msg, { fromMe });

                if (resolvedJid && resolvedJid !== lidJid) {
                    await mergeLinkedDeviceConversation(sessionId, lidJid, resolvedJid, {
                        pushName: msg.pushName
                    });
                    remoteJid = resolvedJid;
                } else if (fromMe) {
                    // A first outgoing linked-device message can arrive before any phone mapping exists.
                    // Keep it temporarily; the next inbound with senderPn will merge it back.
                    console.log(`⚠️ Outgoing message to unresolved LID ${remoteJid}. Keeping LID until a phone mapping is known.`);
                } else {
                    console.log(`⚠️ Skipping message from LID without participant/senderPn: ${remoteJid}`);
                    continue;
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

            // استخراج محتوى الرسالة
            const messageContent = await extractMessageContent(msg, sock, sessionId, {
                skipMediaDownload: Boolean(options.skipMediaDownload)
            });
            if (!messageContent) continue;

            const messageStatusFromPayload = getMessageStatusFromBaileysStatus(msg.status);
            const initialMessageStatus = messageStatusFromPayload || (fromMe ? 'SENT' : 'DELIVERED');

            // console.log(`📩 New message in session ${sessionId}: ${messageContent.type} from ${remoteJid}`);

            // حفظ الرسالة في قاعدة البيانات
            // حفظ الرسالة في قاعدة البيانات
            const prisma = getSharedPrismaClient();
            const existingMessage = await prisma.whatsAppMessage.findUnique({
                where: { messageId },
                select: { id: true }
            });
            const isNewMessage = !existingMessage;
            const savedMessage = await prisma.whatsAppMessage.upsert({
                where: { messageId },
                update: {
                    remoteJid,
                    fromMe,
                    messageType: messageContent.type,
                    content: messageContent.text,
                    mediaUrl: messageContent.mediaUrl,
                    mediaType: messageContent.mediaType,
                    mediaMimeType: messageContent.mimetype,
                    mediaFileName: messageContent.fileName,
                    quotedMessageId: messageContent.quotedId,
                    quotedContent: messageContent.quotedText,
                    metadata: JSON.stringify(msg),
                    participant: msg.key.participant, // تحديث المشارك
                    updatedAt: new Date()
                },
                create: {
                    sessionId,
                    remoteJid,
                    messageId,
                    fromMe,
                    participant: msg.key.participant, // حفظ المشارك
                    messageType: messageContent.type,
                    content: messageContent.text,
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

            if (messageStatusFromPayload) {
                const updatedCount = await updateMessageDeliveryStatus(messageId, messageStatusFromPayload);
                if (updatedCount > 0) {
                    savedMessage.status = messageStatusFromPayload;
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
                            type: messageContent.type,
                            content: messageContent.text,
                            mediaUrl: messageContent.mediaUrl,
                            mediaType: messageContent.mediaType,
                            mediaMimeType: messageContent.mimetype,
                            mediaFileName: messageContent.fileName,
                            timestamp: messageTimestamp,
                            pushName: msg.pushName
                        },
                        !fromMe // isIncoming
                    );
                    syncedCustomer = syncResult?.customer;
                    syncedConversation = syncResult?.conversation;
                } catch (syncErr) {
                    console.error('Failed to sync incoming message to CRM:', syncErr);
                }
            }

            // تحديث أو إنشاء جهة الاتصال
            const contact = await updateOrCreateContact(sessionId, remoteJid, msg, sock, {
                isOutgoing: fromMe,
                customerId: syncedCustomer?.id,
                suppressUnread: importHistory || !isNewMessage,
                incrementCounters: isNewMessage,
                lastMessageAt: messageTimestamp,
                skipProfilePic: importHistory
            });

            // إذا كانت رسالة مجموعة، نحفظ المرسل كجهة اتصال أيضاً
            if (!importHistory && remoteJid.endsWith('@g.us') && msg.key.participant) {
                await updateOrCreateContact(sessionId, msg.key.participant, msg, sock, {
                    isOutgoing: false,
                    isGroupParticipant: true,
                    // Group participants might need their own customer entry? 
                    // For now, we skip syncing group participants to CRM customers implicitly 
                    // unless they send a direct message.
                });
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
                        raw: msg
                    }
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
                        }
                    });

                    // console.log(`🔔 [NOTIFICATION] Sent WhatsApp message notification for company ${companyId}`, {
                    //     contactName,
                    //     messageType: messageContent.type,
                    //     notificationsEnabled,
                    //     soundEnabled
                    // });
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

                            const aiSdkClient = require('../aiSdkClient');
                            const result = await aiSdkClient.sendChatMessage({
                                companyId: first.companyId,
                                customerId: first.customerId,
                                message: combinedMessage,
                                threadId: first.conversationId,
                                channel,
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

                            const replyText = result?.reply;
                            if (replyText) {
                                const WhatsAppMessageHandler = require('./WhatsAppMessageHandler');
                                await WhatsAppMessageHandler.sendText(first.sessionId, first.remoteJid, replyText, { isAIResponse: true });
                            }
                            const attachments = result?.response_attachments || result?.responseAttachments;
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
            console.error(`❌ Error processing message:`, error);
            await logEvent(sessionId, companyId, 'message_error', { error: error.message }, 'error');
        }
    }
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
        text = message.reactionMessage.text;
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

        // محاولة الحصول على صورة البروفايل
        let profilePicUrl = null;
        if (!skipProfilePic) {
            try {
                profilePicUrl = await sock.profilePictureUrl(remoteJid, 'image');
            } catch (e) {
                // تجاهل الخطأ إذا لم تكن الصورة متاحة
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
            updateData.lastMessageAt = lastMessageAt || new Date();
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
async function handleMessageStatusUpdate(sessionId, companyId, updates) {
    const io = getIO();

    for (const update of updates) {
        try {
            const { key, update: statusUpdate } = update;

            if (statusUpdate.status) {
                const status = getMessageStatusFromBaileysStatus(statusUpdate.status) || 'SENT';

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
                await getSharedPrismaClient().whatsAppContact.updateMany({
                    where: {
                        sessionId,
                        jid: update.id
                    },
                    data: {
                        name: update.notify || update.name,
                        profilePicUrl: update.imgUrl
                    }
                });
            }
        } catch (error) {
            console.error('❌ Error updating contact:', error);
        }
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

/**
 * إرسال رسالة نصية
 */
async function sendTextMessage(sessionId, to, text, options = {}) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    const { normalizedJid: jid } = normalizeWhatsAppContactIdentity(to);

    const result = await session.sock.sendMessage(jid, {
        text,
        ...options
    });

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
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    const { normalizedJid: jid } = normalizeWhatsAppContactIdentity(to);

    const result = await session.sock.sendMessage(jid, media, options);

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
            const authState = parseJsonSafely(s.authState, null);
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
                const metadata = parseJsonSafely(session.metadata, {});

                const enableHistorySync = session.status === 'QR_PENDING' && metadata.importHistoryOnLink === true;

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
        await session.sock.labelChat(jid, labelId);
        console.log(`🏷️ Chat labeled: ${jid}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error labeling chat:', error);
        throw error;
    }
}

/**
 * جلب العلامات
 */
async function getLabels(sessionId) {
    const session = getSession(sessionId);
    if (!session) {
        const dbSession = await getSharedPrismaClient().whatsAppSession.findUnique({ where: { id: sessionId } });
        if (dbSession?.provider === 'META_CLOUD') return [];
        throw new Error('Session not found');
    }

    try {
        const labels = await session.sock.getLabels();
        return labels;
    } catch (error) {
        console.error('❌ Error getting labels:', error);
        throw error;
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
        const label = await session.sock.createLabel(name, color);
        console.log(`🏷️ Label created: ${name}`);
        return label;
    } catch (error) {
        console.error('❌ Error creating label:', error);
        throw error;
    }
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
        await session.sock.deleteLabel(labelId);
        console.log(`🏷️ Label deleted: ${labelId}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error deleting label:', error);
        throw error;
    }
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

    // Connection
    restoreAllSessions,
    reconnectSession,
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

    // Contacts
    updateContact,
    blockContact,
    unblockContact,

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
    createLabel,
    deleteLabel,

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
        getProfileSessionSnapshot
    }
};
