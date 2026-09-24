/**
 * 📱 WhatsApp Controller
 * API endpoints لإدارة WhatsApp
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const fs = require('fs');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const socketService = require('../services/socketService');
const getIO = () => socketService.getIO();
const {
    WhatsAppManager,
    WhatsAppMessageHandler,
    WhatsAppMediaHandler
} = require('../services/whatsapp');
const { computeWindowStatus } = require('../services/whatsapp/WhatsAppWindowService');
const WhatsAppWindowPolicyService = require('../services/whatsapp/WhatsAppWindowPolicyService');
const smsGateway = require('../services/sms/smsGatewayService');
const { encryptField, decryptField } = require('../utils/fieldEncryption');

const encryptTokenIfNeeded = (token) => {
    if (token === undefined || token === null) return token;
    if (typeof token === 'string' && token.startsWith('enc:v1:')) return token;
    return encryptField(token);
};

const getDatabaseUrl = () => process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
const isMysqlDatabase = () => getDatabaseUrl().toLowerCase().startsWith('mysql://');
const quoteSqlIdentifier = (identifier) =>
    isMysqlDatabase() ? `\`${identifier}\`` : `"${identifier}"`;
const parseJsonSafely = (value, fallback = {}) => {
    if (!value || typeof value !== 'string') {
        return fallback;
    }

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const normalizePhoneNumber = (value) => {
    const cleaned = String(value || '').replace(/\D/g, '');
    return cleaned.length >= 10 ? cleaned : '';
};

// Cache لنتيجة فحص الـ authState: فك تشفير الـ authState (blob كبير) عملية sync ثقيلة
// بتبلوك الـ event loop لو اتكررت على كل getSessions/getSession. TTL قصير (30s) —
// الأسوأ لو جلسة اتربطت لسه مفيش نتيجة (لكام ثانية) والـ reconnect بيتعامل معاه لاحقاً.
const authStateCheckCache = new Map(); // sessionId -> { hasAuth, expiresAt }
const AUTH_STATE_CHECK_TTL_MS = 30 * 1000;

const pruneAuthStateCheckCache = () => {
    const now = Date.now();
    for (const [key, entry] of authStateCheckCache) {
        if (entry.expiresAt <= now) authStateCheckCache.delete(key);
    }
};

const hasRegisteredAuthState = (session) => {
    if (!session?.id) return false;
    const cached = authStateCheckCache.get(session.id);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.hasAuth;
    }
    // authState غير متجاب (مستبعد من getSessions) → fallback حسب الـ status:
    // جلسة DB CONNECTED/CONNECTING من غير session في الذاكرة = عندها auth صالح (هتظهر reconnecting)
    if (session?.authState === undefined) {
        return session.status === 'CONNECTED' || session.status === 'CONNECTING';
    }
    const authState = parseJsonSafely(decryptField(session?.authState), null);
    const hasAuth = Boolean(authState?.creds?.registered || authState?.creds?.me);
    authStateCheckCache.set(session.id, { hasAuth, expiresAt: Date.now() + AUTH_STATE_CHECK_TTL_MS });
    if (authStateCheckCache.size > 500) {
        pruneAuthStateCheckCache();
    }
    return hasAuth;
};
const clearAuthStateCheckCache = (sessionId) => {
    if (sessionId) authStateCheckCache.delete(sessionId);
};
const toBooleanOption = (value) =>
    value === true || value === 'true' || value === 1 || value === '1' || value === 'on';
const getLiveStatusFromDbStatus = (status, provider) => {
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
};
const resolveSessionProvider = (sessionLike) => {
    if (typeof sessionLike?.provider === 'string' && sessionLike.provider.trim()) {
        return sessionLike.provider;
    }

    const metadata = parseJsonSafely(sessionLike?.metadata, {});
    const metadataProvider = metadata?.provider || metadata?.channelProvider || metadata?.whatsAppProvider;
    return metadataProvider === 'META_CLOUD' ? 'META_CLOUD' : 'BAILEYS';
};
const mapSessionForResponse = (session, includeQrData = false) => {
    const provider = resolveSessionProvider(session);
    const activeSession = WhatsAppManager.getSession(session.id);
    const count = session._count ? {
        ...session._count,
        messages: session._count.messages ?? session._count.whatsAppMessages ?? 0,
        contacts: session._count.contacts ?? session._count.whatsAppContacts ?? 0
    } : session._count;

    // Determine live status with highest accuracy:
    // 1. If in-memory session exists, use its status (real-time)
    // 2. If in-memory says 'connected', verify via health check
    // 3. Fall back to DB status
    let liveStatus;
    if (activeSession) {
        liveStatus = activeSession.status || getLiveStatusFromDbStatus(session.status, provider);
        // If in-memory says 'connected', do a quick health verification
        if (liveStatus === 'connected') {
            const health = WhatsAppManager.verifySessionHealth 
                ? WhatsAppManager.verifySessionHealth(session.id)
                : null;
            if (health && !health.alive) {
                // WebSocket is not actually alive - override status
                liveStatus = 'disconnected';
                console.log(`⚠️ [CONTROLLER] Session ${session.id} says 'connected' but WebSocket is ${health.reason}, overriding to 'disconnected'`);
            }
        }
    } else {
        // META_CLOUD sessions are API-only (no in-memory socket needed).
        // Absence of activeSession is normal — trust DB status directly.
        if (provider === 'META_CLOUD') {
            liveStatus = getLiveStatusFromDbStatus(session.status, provider);
        } else {
            const hasAuth = hasRegisteredAuthState(session);
            if (hasAuth && (session.status === 'CONNECTED' || session.status === 'CONNECTING')) {
                liveStatus = 'reconnecting';
            } else {
                liveStatus = getLiveStatusFromDbStatus(session.status, provider);
            }
        }
    }

    return {
        ...session,
        _count: count,
        provider,
        liveStatus,
        qrCode: includeQrData && provider !== 'META_CLOUD' ? (activeSession?.qrCode || null) : null,
        pairingCode: includeQrData && provider !== 'META_CLOUD' ? (activeSession?.pairingCode || null) : null
    };
};

const waitForSessionLinkState = async (sessionId, maxAttempts = 240, pollIntervalMs = 500) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const activeSession = WhatsAppManager.getSession(sessionId);
        if (activeSession?.qrCode || activeSession?.pairingCode || activeSession?.status === 'connected') {
            console.log(`✅ [CONTROLLER] Session ${sessionId} has link data after ${attempt * pollIntervalMs}ms (qr: ${!!activeSession?.qrCode}, pairing: ${!!activeSession?.pairingCode}, status: ${activeSession?.status})`);
            return activeSession;
        }
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    const finalSession = WhatsAppManager.getSession(sessionId);
    const elapsed = maxAttempts * pollIntervalMs;
    console.warn(`⚠️ [CONTROLLER] waitForSessionLinkState timed out for ${sessionId} after ${elapsed}ms. Status: ${finalSession?.status || 'no_session'}, qr: ${!!finalSession?.qrCode}, pairing: ${!!finalSession?.pairingCode}`);

    // Continue waiting in background if timeout but still have session
    if (finalSession) {
        console.log(`🔄 [CONTROLLER] Starting background wait for session ${sessionId} link state...`);
        (async () => {
            for (let bg = 0; bg < 120; bg++) {
                await new Promise(r => setTimeout(r, 1000));
                const s = WhatsAppManager.getSession(sessionId);
                if (s?.qrCode || s?.pairingCode || s?.status === 'connected') {
                    console.log(`✅ [CONTROLLER] Background wait complete for ${sessionId} after ${(bg + 1)}s`);
                    const io = getIO();
                    if (io) {
                        io.to(`company_${s.companyId}`).emit('whatsapp:qr', {
                            sessionId,
                            qr: s.qrCode,
                            refreshed: false
                        });
                        if (s.pairingCode) {
                            io.to(`company_${s.companyId}`).emit('whatsapp:pairing_code', {
                                sessionId,
                                pairingCode: s.pairingCode,
                                phoneNumber: s.phoneNumber
                            });
                        }
                    }
                    break;
                }
            }
        })();
    }

    return finalSession;
};

const resolveActiveSessionId = async (companyId, sessionId, options = {}) => {
    const { contactId } = options;

    if (sessionId && sessionId !== 'all') {
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });
        if (!session) throw new Error('الجلسة غير موجودة أو لا تنتمي لهذه الشركة');

        const isMetaCloud = session.provider === 'META_CLOUD';
        let memSession = WhatsAppManager.getSession(sessionId);
        let isAvailable = isMetaCloud
            ? session.status === 'CONNECTED' && !!session.metaAccessToken
            : !!(memSession && memSession.status === 'connected');

        // 🛡️ RECONNECT GRACE PERIOD: لو الجلسة بتعمل reconnecting أو socket flap
        // لا نرفض فوراً بـ "الجلسة غير متصلة... الجلسات المتاحة: لا توجد" — ننتظر حتى 5 ثواني
        if (!isAvailable && !isMetaCloud) {
            const isReconnectingOrPending =
                session.status === 'CONNECTED' ||
                session.status === 'CONNECTING' ||
                memSession?.status === 'connecting' ||
                (typeof WhatsAppManager.isSessionReconnecting === 'function' && WhatsAppManager.isSessionReconnecting(sessionId));

            if (isReconnectingOrPending) {
                const deadline = Date.now() + 5000;
                while (Date.now() < deadline) {
                    await new Promise(r => setTimeout(r, 400));
                    memSession = WhatsAppManager.getSession(sessionId);
                    if (memSession && memSession.status === 'connected') {
                        isAvailable = true;
                        break;
                    }
                }
            }
        }

        if (!isAvailable) {
            // Try safe auto-migration: old session is dead, try to find a connected one
            const connectedSessions = await getSharedPrismaClient().whatsAppSession.findMany({
                where: { companyId, status: 'CONNECTED' },
                select: { id: true, provider: true, name: true, metaDisplayPhoneNumber: true, phoneNumber: true, metaAccessToken: true }
            });

            const viableSessions = connectedSessions.filter(s => {
                if (s.provider === 'META_CLOUD') return !!s.metaAccessToken;
                const mem = WhatsAppManager.getSession(s.id);
                return mem?.status === 'connected';
            });

            if (viableSessions.length === 1 && contactId) {
                // Safe: exactly one working session, auto-migrate contact
                await getSharedPrismaClient().whatsAppContact.update({
                    where: { id: contactId },
                    data: { sessionId: viableSessions[0].id, updatedAt: new Date() }
                }).catch(() => {});
                console.log(`↪️ [SESSION-FAILOVER] Auto-migrated contact ${contactId} from session ${sessionId} to ${viableSessions[0].id}`);
                return viableSessions[0].id;
            }

            const availableList = viableSessions.map(s =>
                s.provider === 'META_CLOUD' ? `${s.name || s.metaDisplayPhoneNumber || s.id} (Cloud)` : `${s.name || s.phoneNumber || s.id}`
            ).join('، ') || 'لا توجد';

            const error = new Error(`الجلسة غير متصلة حالياً. الجلسات المتاحة: ${availableList}. يمكنك تغيير الجلسة من قائمة جهات الاتصال.`);
            error.code = 'WA_SESSION_NOT_READY';
            error.availableSessions = viableSessions.map(s => ({ id: s.id, name: s.name, provider: s.provider }));
            throw error;
        }

        return sessionId;
    }

    let activeSession = await getSharedPrismaClient().whatsAppSession.findFirst({
        where: { companyId, status: { in: ['CONNECTED', 'CONNECTING'] } },
        orderBy: { updatedAt: 'desc' }
    });

    if (!activeSession) {
        throw new Error('لا توجد جلسة نشطة متاحة. يرجى التأكد من ربط حساب واحد على الأقل.');
    }

    if (activeSession.provider !== 'META_CLOUD') {
        let inMemory = WhatsAppManager.getSession(activeSession.id);
        if (!inMemory || inMemory.status !== 'connected') {
            const deadline = Date.now() + 5000;
            while (Date.now() < deadline) {
                await new Promise(r => setTimeout(r, 400));
                inMemory = WhatsAppManager.getSession(activeSession.id);
                if (inMemory && inMemory.status === 'connected') break;
            }
            if (!inMemory || inMemory.status !== 'connected') {
                throw new Error('الجلسة غير متصلة حالياً. يرجى إعادة الاتصال.');
            }
        }
    }

    return activeSession.id;
};
const fetchSessionsWithLegacySchemaSupport = async (companyId) => {
    const prisma = getSharedPrismaClient();

    try {
        const sessions = await prisma.whatsAppSession.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            // لا نجيب authState (blob كبير) ولا الـ Meta tokens/secrets (حساسة) —
            // بيقلل الحمولة ويمنع تسريبهم للـ frontend (mapSessionForResponse بيعمل spread)
            select: {
                id: true,
                companyId: true,
                name: true,
                phoneNumber: true,
                provider: true,
                status: true,
                lastConnectedAt: true,
                lastDisconnectedAt: true,
                isDefault: true,
                aiEnabled: true,
                autoReply: true,
                aiMode: true,
                welcomeMessage: true,
                awayMessage: true,
                workingHoursEnabled: true,
                workingHours: true,
                loadBalanceWeight: true,
                metadata: true,
                metaPhoneNumberId: true,
                metaWabaId: true,
                metaBusinessId: true,
                metaTokenExpiresAt: true,
                metaDisplayPhoneNumber: true,
                metaQualityRating: true,
                metaMessagingLimit: true,
                metaApiVersion: true,
                metaWebhookVerifyToken: true,
                createdAt: true,
                updatedAt: true,
                profileName: true,
                profilePictureUrl: true,
                _count: {
                    select: {
                        whatsAppMessages: { where: { isHidden: false } },
                        whatsAppContacts: {
                            where: {
                                totalMessages: { gt: 0 }
                            }
                        }
                    }
                }
            }
        });
        return sessions.filter(s => {
            if (!s.metadata) return true;
            try {
                const meta = JSON.parse(s.metadata);
                if (meta.isDeleted) {
                    // Keep sessions soft-deleted from cleanup that still have active sockets
                    return !!WhatsAppManager.getSession(s.id);
                }
                return true;
            } catch (e) {
                return true;
            }
        });
    } catch (error) {
        if (error?.code !== 'P2022') {
            throw error;
        }

        const sessions = await prisma.$queryRawUnsafe(
          `SELECT ${['id','companyId','name','phoneNumber','status','metadata','createdAt','updatedAt'].map(quoteSqlIdentifier).join(', ')}
           FROM ${quoteSqlIdentifier('whatsapp_sessions')}
           WHERE ${quoteSqlIdentifier('companyId')} = $1
           ORDER BY ${quoteSqlIdentifier('createdAt')} DESC`,
          companyId
        );
        return sessions.filter(s => {
            if (!s.metadata) return true;
            try {
                const meta = typeof s.metadata === 'string' ? JSON.parse(s.metadata) : s.metadata;
                if (meta.isDeleted) {
                    return !!WhatsAppManager.getSession(s.id);
                }
                return true;
            } catch (e) {
                return true;
            }
        });
    }
};

// Validate URL to prevent SSRF
const isValidUrl = (string) => {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 إدارة الجلسات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إنشاء جلسة جديدة
 * POST /api/whatsapp/sessions
 */
async function createSession(req, res) {
    try {
        const { companyId } = req.user;
        const {
            name,
            autoReply = false,
            loadBalanceWeight = 1,
            provider = 'BAILEYS',
            phoneNumber,
            usePairingCode = false,
            importHistory = false,
            syncFullHistory = false,
            keepHistoryOnDelete = true,
            metaPhoneNumberId,
            metaWabaId,
            metaBusinessId,
            metaAccessToken,
            metaApiVersion,
            metaWebhookVerifyToken,
            metaWebhookSecret,
            metaDisplayPhoneNumber
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'اسم الجلسة مطلوب' });
        }

        const isMetaProvider = provider === 'META_CLOUD';
        const cleanPhone = isMetaProvider ? '' : normalizePhoneNumber(phoneNumber);
        const shouldImportHistory = !isMetaProvider && (toBooleanOption(importHistory) || toBooleanOption(syncFullHistory));
        const metadataObj = {};
        if (shouldImportHistory) {
            metadataObj.importHistoryOnLink = true;
        }
        if (!isMetaProvider) {
            metadataObj.keepHistoryOnDelete = toBooleanOption(keepHistoryOnDelete);
        }
        const metadata = Object.keys(metadataObj).length > 0
            ? JSON.stringify(metadataObj)
            : undefined;

        let resolvedMetaToken = metaAccessToken ? String(metaAccessToken).trim() : '';
        const eaaIdx = resolvedMetaToken.indexOf('EAA');
        if (eaaIdx > 0) {
            resolvedMetaToken = resolvedMetaToken.substring(eaaIdx).trim();
        }

        let resolvedDisplayPhone = metaDisplayPhoneNumber || null;
        let resolvedCleanPhone = cleanPhone;

        if (isMetaProvider) {
            if (!resolvedMetaToken || !metaPhoneNumberId) {
                return res.status(400).json({
                    error: 'بيانات Meta غير مكتملة (Access Token و Phone Number ID مطلوبان لكل جلسة)'
                });
            }

            const axios = require('axios');
            const graphVersion = metaApiVersion || process.env.META_GRAPH_API_VERSION || 'v26.0';
            const graphBase = `https://graph.facebook.com/${graphVersion}`;

            // Auto-fetch verified phone and display phone number if missing
            try {
                const phoneRes = await axios.get(`${graphBase}/${metaPhoneNumberId}`, {
                    params: {
                        access_token: resolvedMetaToken,
                        fields: 'display_phone_number,verified_name,status'
                    },
                    timeout: 10000
                });
                if (phoneRes.data?.display_phone_number) {
                    resolvedDisplayPhone = resolvedDisplayPhone || phoneRes.data.display_phone_number;
                    const digits = phoneRes.data.display_phone_number.replace(/\D/g, '');
                    if (digits) {
                        resolvedCleanPhone = digits;
                    }
                }
            } catch (pErr) {
                console.warn('⚠️ [createSession] Could not verify/fetch Meta phone info:', pErr.response?.data?.error?.message || pErr.message);
            }

            // Auto-subscribe WABA to webhooks so incoming messages and statuses arrive
            if (metaWabaId) {
                try {
                    await axios.post(`${graphBase}/${metaWabaId}/subscribed_apps`, null, {
                        params: { access_token: resolvedMetaToken },
                        timeout: 15000
                    });
                    console.log(`✅ [createSession] Subscribed WABA ${metaWabaId} to webhooks`);
                } catch (subErr) {
                    console.warn('⚠️ [createSession] Could not subscribe WABA webhooks:', subErr.response?.data?.error?.message || subErr.message);
                }
            }
        }

        // إنشاء الجلسة في قاعدة البيانات
        let resolvedVerifyToken = metaWebhookVerifyToken && String(metaWebhookVerifyToken).trim()
            ? String(metaWebhookVerifyToken).trim()
            : null;
        if (isMetaProvider && !resolvedVerifyToken) {
            const crypto = require('crypto');
            resolvedVerifyToken = crypto.randomBytes(12).toString('hex');
        }

        const session = await getSharedPrismaClient().whatsAppSession.create({
            data: {
                companyId,
                name,
                aiEnabled: false,
                autoReply,
                aiMode: 'manual',
                loadBalanceWeight,
                provider,
                status: isMetaProvider ? 'CONNECTED' : 'QR_PENDING',
                phoneNumber: resolvedCleanPhone || undefined,
                metadata,
                metaPhoneNumberId,
                metaWabaId,
                metaBusinessId,
                metaAccessToken: resolvedMetaToken ? encryptTokenIfNeeded(resolvedMetaToken) : undefined,
                metaApiVersion,
                metaWebhookVerifyToken: resolvedVerifyToken,
                metaWebhookSecret,
                metaDisplayPhoneNumber: resolvedDisplayPhone,
                updatedAt: new Date()
            }
        });

        // بدء الاتصال (Baileys فقط)
        let sessionData = null;
        if (!isMetaProvider) {
            sessionData = await WhatsAppManager.createSession(session.id, companyId, {
                usePairingCode: Boolean(usePairingCode && cleanPhone),
                phoneNumber: cleanPhone || undefined,
                syncFullHistory: shouldImportHistory
            });
            sessionData = await waitForSessionLinkState(session.id);
        }

        res.status(201).json({
            success: true,
            session: {
                ...session,
                status: isMetaProvider ? session.status : (sessionData?.status || 'QR_PENDING'),
                phoneNumber: cleanPhone || session.phoneNumber,
                qrCode: sessionData?.qrCode || null,
                pairingCode: sessionData?.pairingCode || null
            }
        });
    } catch (error) {
        console.error('❌ Error creating session:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الجلسة' });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ✅ إنشاء جلسة باستخدام Pairing Code (بدون QR)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إنشاء جلسة باستخدام Pairing Code
 * POST /api/whatsapp/sessions/pairing-code
 */
async function createSessionWithPairingCode(req, res) {
    try {
        const { companyId } = req.user;
        const {
            name,
            phoneNumber,
            autoReply = false,
            loadBalanceWeight = 1,
            provider = 'BAILEYS',
            importHistory = false,
            syncFullHistory = false,
            keepHistoryOnDelete = true
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'اسم الجلسة مطلوب' });
        }

        if (provider === 'META_CLOUD') {
            return res.status(400).json({ error: 'Pairing Code غير مدعوم في الجلسات الرسمية (Meta Cloud)' });
        }

        if (!phoneNumber) {
            return res.status(400).json({ error: 'رقم الهاتف مطلوب لاستخدام Pairing Code' });
        }

        // تنظيف رقم الهاتف (إزالة المسافات والرموز)
        const cleanPhone = normalizePhoneNumber(phoneNumber);
        if (!cleanPhone) {
            return res.status(400).json({ error: 'رقم الهاتف غير صالح' });
        }
        const shouldImportHistory = toBooleanOption(importHistory) || toBooleanOption(syncFullHistory);
        const metadataObj = {};
        if (shouldImportHistory) {
            metadataObj.importHistoryOnLink = true;
        }
        metadataObj.keepHistoryOnDelete = toBooleanOption(keepHistoryOnDelete);
        const metadata = JSON.stringify(metadataObj);

        // إنشاء الجلسة في قاعدة البيانات
        const session = await getSharedPrismaClient().whatsAppSession.create({
            data: {
                companyId,
                name,
                aiEnabled: false,
                autoReply,
                aiMode: 'manual',
                loadBalanceWeight,
                status: 'QR_PENDING', // Waiting for pairing code authentication
                phoneNumber: cleanPhone,
                metadata,
                updatedAt: new Date()
            }
        });

        // بدء الاتصال مع Pairing Code
        const sessionData = await WhatsAppManager.createSession(session.id, companyId, {
            usePairingCode: true,
            phoneNumber: cleanPhone,
            syncFullHistory: shouldImportHistory
        });

        // انتظار توليد الكود (مع timeout 10 ثواني)
        let pairingCode = sessionData?.pairingCode;
        let attempts = 0;
        const maxAttempts = 20; // 10 seconds total (500ms * 20)

        while (!pairingCode && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const updatedSession = WhatsAppManager.getSession(session.id);
            pairingCode = updatedSession?.pairingCode;
            attempts++;
            console.log(`[DEBUG] Waiting for pairing code... attempt ${attempts}, code: ${pairingCode}`);
        }

        res.status(201).json({
            success: true,
            session: {
                ...session,
                pairingCode: pairingCode || null,
                status: sessionData?.status || 'QR_PENDING'
            },
            message: pairingCode ? 'تم إنشاء الجلسة وإنشاء كود الربط' : 'تم إنشاء الجلسة لكن لم يتم توليد كود الربط'
        });
    } catch (error) {
        console.error('❌ Error creating session with pairing code:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الجلسة: ' + error.message });
    }
}

/**
 * جلب كل الجلسات
 * GET /api/whatsapp/sessions
 */
async function getSessions(req, res) {
    try {
        const { companyId, id: userId, role } = req.user;
        const { normalizeRole } = require('../middleware/rbacMiddleware');
        const userRole = normalizeRole(role);

        const sessions = await fetchSessionsWithLegacySchemaSupport(companyId);

        let filteredSessions = sessions;
        if (
            userRole !== 'SUPER_ADMIN' &&
            userRole !== 'COMPANY_ADMIN' &&
            userRole !== 'TEAM_LEADER'
        ) {
            const { getUserAccessibleSessionIds } = require('../middleware/numberAccessGuard');
            const accessibleSessions = await getUserAccessibleSessionIds(userId, companyId, getSharedPrismaClient());
            const accessibleIds = new Set(accessibleSessions.map(s => s.id));
            filteredSessions = sessions.filter(s => accessibleIds.has(s.id));
        }

        const sessionsWithStatus = filteredSessions.map(mapSessionForResponse);

        // إضافة حالة استيراد history لكل جلسة
        const sessionIds = filteredSessions.map(s => s.id);
        let historyImports = [];
        try {
            historyImports = await getSharedPrismaClient().whatsAppSessionHistoryImport.findMany({
                where: { sessionId: { in: sessionIds } },
                select: { sessionId: true, status: true, lastProgress: true, importedMessages: true, failedAt: true, lastError: true, completedAt: true }
            });
        } catch (e) {
            // model قد لا يكون موجوداً بعد الـ migration
        }
        const historyImportMap = {};
        for (const hi of historyImports) historyImportMap[hi.sessionId] = hi;

        const result = sessionsWithStatus.map(s => ({
            ...s,
            historyImport: historyImportMap[s.id] || null
        }));

        res.json({ sessions: result });
    } catch (error) {
        console.error('❌ Error getting sessions:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب الجلسات' });
    }
}

/**
 * جلب جلسة محددة
 * GET /api/whatsapp/sessions/:id
 */
async function getSession(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id, companyId },
            select: {
                id: true,
                companyId: true,
                name: true,
                phoneNumber: true,
                provider: true,
                status: true,
                lastConnectedAt: true,
                lastDisconnectedAt: true,
                isDefault: true,
                aiEnabled: true,
                autoReply: true,
                aiMode: true,
                welcomeMessage: true,
                awayMessage: true,
                workingHoursEnabled: true,
                workingHours: true,
                loadBalanceWeight: true,
                metadata: true,
                metaPhoneNumberId: true,
                metaWabaId: true,
                metaBusinessId: true,
                metaTokenExpiresAt: true,
                metaDisplayPhoneNumber: true,
                metaQualityRating: true,
                metaMessagingLimit: true,
                metaApiVersion: true,
                createdAt: true,
                updatedAt: true,
                profileName: true,
                profilePictureUrl: true,
                _count: {
                    select: {
                        whatsAppMessages: { where: { isHidden: false } },
                        whatsAppContacts: {
                            where: {
                                totalMessages: { gt: 0 }
                            }
                        }
                    }
                }
            }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const activeSession = WhatsAppManager.getSession(id);

        // إضافة حالة استيراد history
        let historyImport = null;
        try {
            historyImport = await getSharedPrismaClient().whatsAppSessionHistoryImport.findUnique({
                where: { sessionId: id },
                select: { status: true, lastProgress: true, importedMessages: true, chatsCount: true, unsupportedMessages: true, lastError: true, requestedAt: true, startedAt: true, completedAt: true, failedAt: true }
            });
        } catch (e) { /* model may not exist yet */ }

        res.json({
            session: {
                ...session,
                _count: session._count ? {
                    ...session._count,
                    messages: session._count.messages ?? session._count.whatsAppMessages ?? 0,
                    contacts: session._count.contacts ?? session._count.whatsAppContacts ?? 0
                } : session._count,
                liveStatus: activeSession?.status || getLiveStatusFromDbStatus(session.status, session.provider),
                qrCode: session.provider === 'META_CLOUD' ? null : (activeSession?.qrCode || null),
                pairingCode: session.provider === 'META_CLOUD' ? null : (activeSession?.pairingCode || null),
                historyImport
            }
        });
    } catch (error) {
        console.error('❌ Error getting session:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب الجلسة' });
    }
}

/**
 * تحديث جلسة
 * PUT /api/whatsapp/sessions/:id
 */
async function updateSession(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const {
            name,
            aiEnabled,
            autoReply,
            aiMode,
            welcomeMessage,
            awayMessage,
            workingHoursEnabled,
            workingHours,
            isDefault,
            loadBalanceWeight,
            provider,
            metaPhoneNumberId,
            metaWabaId,
            metaBusinessId,
            metaAccessToken,
            metaApiVersion,
            metaWebhookVerifyToken,
            metaWebhookSecret,
            metaDisplayPhoneNumber
        } = req.body;

        // التحقق من الملكية
        const existingSession = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id, companyId }
        });

        if (!existingSession) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        // إذا تم تعيينها كافتراضية، إلغاء الافتراضية من الجلسات الأخرى
        if (isDefault) {
            await getSharedPrismaClient().whatsAppSession.updateMany({
                where: { companyId, isDefault: true },
                data: { isDefault: false }
            });
        }

        let updatedMetadata = undefined;
        if (req.body.callShieldEnabled !== undefined || req.body.callShieldMessage !== undefined) {
            let existingMeta = {};
            try {
                existingMeta = existingSession.metadata
                    ? (typeof existingSession.metadata === 'string' ? JSON.parse(existingSession.metadata) : existingSession.metadata)
                    : {};
            } catch {}
            if (req.body.callShieldEnabled !== undefined) existingMeta.callShieldEnabled = !!req.body.callShieldEnabled;
            if (req.body.callShieldMessage !== undefined) existingMeta.callShieldMessage = req.body.callShieldMessage;
            updatedMetadata = JSON.stringify(existingMeta);
            const active = WhatsAppManager.getSession(id);
            if (active) active.metadata = existingMeta;
        }

        const session = await getSharedPrismaClient().whatsAppSession.update({
            where: { id },
            data: {
                name,
                aiEnabled: aiEnabled !== undefined ? aiEnabled : false,
                autoReply,
                aiMode: aiMode || 'manual',
                welcomeMessage,
                awayMessage,
                workingHoursEnabled,
                workingHours: workingHours ? JSON.stringify(workingHours) : undefined,
                isDefault,
                loadBalanceWeight: loadBalanceWeight ? parseInt(loadBalanceWeight) : undefined,
                metadata: updatedMetadata,
                provider,
                metaPhoneNumberId,
                metaWabaId,
                metaBusinessId,
                metaAccessToken: encryptTokenIfNeeded(metaAccessToken),
                metaApiVersion,
                metaWebhookVerifyToken,
                metaWebhookSecret,
                metaDisplayPhoneNumber
            }
        });

        res.json({ success: true, session });
    } catch (error) {
        console.error('❌ Error updating session:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث الجلسة' });
    }
}

/**
 * حذف جلسة
 * DELETE /api/whatsapp/sessions/:id
 */
async function deleteSession(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { keepHistory } = req.query;

        // التحقق من الملكية
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        // حذف الجلسة
        let shouldKeepHistory = keepHistory === 'true';
        if (keepHistory === undefined && session.metadata) {
            try {
                const meta = typeof session.metadata === 'string' ? JSON.parse(session.metadata) : session.metadata;
                if (typeof meta.keepHistoryOnDelete === 'boolean') {
                    shouldKeepHistory = meta.keepHistoryOnDelete;
                }
            } catch (e) {}
        }
        await WhatsAppManager.deleteSession(id, shouldKeepHistory);

        res.json({ success: true, message: 'تم حذف الجلسة بنجاح' });
    } catch (error) {
        console.error('❌ Error deleting session:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء حذف الجلسة' });
    }
}

/**
 * بدء الاتصال بجلسة
 * POST /api/whatsapp/sessions/:id/connect
 */
async function connectSession(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const {
            phoneNumber,
            resetAuth = false,
            preferPairingCode = false,
            importHistory = false,
            syncFullHistory = false
        } = req.body || {};

        // التحقق من الملكية
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        if (session.provider === 'META_CLOUD') {
            await getSharedPrismaClient().whatsAppSession.update({
                where: { id },
                data: { status: 'CONNECTED', updatedAt: new Date() }
            });
            return res.json({ success: true, message: 'تم تفعيل الجلسة الرسمية' });
        }

        const cleanPhone = normalizePhoneNumber(phoneNumber || session.phoneNumber);

        if (phoneNumber && cleanPhone && cleanPhone !== session.phoneNumber) {
            await getSharedPrismaClient().whatsAppSession.update({
                where: { id },
                data: { phoneNumber: cleanPhone, updatedAt: new Date() }
            });
        }

        const needsFreshLink =
            Boolean(resetAuth) ||
            session.status === 'LOGGED_OUT' ||
            !hasRegisteredAuthState(session);
        const shouldImportHistory = toBooleanOption(importHistory) || toBooleanOption(syncFullHistory);

        // حفظ إعداد المزامنة في metadata ليبقى ثابتاً عبر إعادة الاتصال
        if (shouldImportHistory && session.provider === 'BAILEYS') {
            const currentMetadata = parseJsonSafely(session.metadata, {});
            if (!currentMetadata.importHistoryOnLink) {
                currentMetadata.importHistoryOnLink = true;
                await getSharedPrismaClient().whatsAppSession.update({
                    where: { id },
                    data: { metadata: JSON.stringify(currentMetadata), updatedAt: new Date() }
                });
            }
        }

        // بدء الاتصال مع إجبار socket جديد حتى لا يرجع نفس الجلسة الميتة من الذاكرة
        let sessionData = await WhatsAppManager.reconnectSession(id, companyId, 0, {
            resetAuth: needsFreshLink,
            usePairingCode: Boolean(preferPairingCode && cleanPhone && needsFreshLink),
            phoneNumber: cleanPhone || undefined,
            syncFullHistory: shouldImportHistory
        });

        sessionData = await waitForSessionLinkState(id);

        const updatedSession = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id, companyId }
        });

        res.json({
            success: true,
            message: sessionData?.pairingCode || sessionData?.qrCode ? 'جاهز لإعادة الربط' : 'جاري الاتصال...',
            session: {
                ...(updatedSession || session),
                liveStatus: sessionData?.status || 'connecting',
                qrCode: sessionData?.qrCode || null,
                pairingCode: sessionData?.pairingCode || null,
                phoneNumber: cleanPhone || updatedSession?.phoneNumber || session.phoneNumber
            }
        });
    } catch (error) {
        console.error('❌ Error connecting session:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء الاتصال' });
    }
}

async function requestHistorySync(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const result = await WhatsAppManager.requestHistorySync(id, companyId);

        res.status(result.alreadyRunning ? 200 : 202).json({
            success: true,
            alreadyRunning: result.alreadyRunning,
            historyImport: { status: result.status },
            message: result.alreadyRunning
                ? 'المزامنة تعمل بالفعل لهذه الجلسة'
                : 'تم طلب مزامنة الرسائل. ستبدأ إعادة الاتصال الآمنة الآن.'
        });
    } catch (error) {
        console.error('❌ Error requesting WhatsApp history sync:', error);
        res.status(error.message === 'Session not found' ? 404 : 400).json({
            error: error.message === 'History sync is only available for Baileys sessions'
                ? 'المزامنة اليدوية للسجل متاحة لجلسات Baileys فقط'
                : 'تعذر بدء مزامنة الرسائل'
        });
    }
}

/**
 * قطع الاتصال بجلسة
 * POST /api/whatsapp/sessions/:id/disconnect
 */
async function disconnectSession(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        // التحقق من الملكية
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        if (session.provider === 'META_CLOUD') {
            await getSharedPrismaClient().whatsAppSession.update({
                where: { id },
                data: { status: 'DISCONNECTED', updatedAt: new Date() }
            });
            return res.json({ success: true, message: 'تم تعطيل الجلسة الرسمية' });
        }

        // قطع الاتصال
        await WhatsAppManager.closeSession(id);

        res.json({ success: true, message: 'تم قطع الاتصال' });
    } catch (error) {
        console.error('❌ Error disconnecting session:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء قطع الاتصال' });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 💬 المحادثات والرسائل
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * جلب المحادثات (جهات الاتصال)
 * GET /api/whatsapp/conversations
 */
async function getConversations(req, res) {
    try {
        const { companyId, id: userId, role } = req.user;
        const { sessionId, page = 1, limit = 50, search, category, archived, filter } = req.query;
        const { normalizeRole } = require('../middleware/rbacMiddleware');
        const userRole = normalizeRole(role);

        let sessionIds = [];
        if (
            userRole === 'SUPER_ADMIN' ||
            userRole === 'COMPANY_ADMIN' ||
            userRole === 'TEAM_LEADER'
        ) {
            sessionIds = (sessionId && sessionId !== 'all')
                ? [sessionId]
                : (await getSharedPrismaClient().whatsAppSession.findMany({
                    where: { companyId },
                    select: { id: true }
                })).map(s => s.id);
        } else {
            const { getUserAccessibleSessionIds } = require('../middleware/numberAccessGuard');
            const accessibleSessions = await getUserAccessibleSessionIds(userId, companyId, getSharedPrismaClient());
            const accessibleIds = accessibleSessions.map(s => s.id);

            if (sessionId && sessionId !== 'all') {
                if (!accessibleIds.includes(sessionId)) {
                    return res.status(403).json({ error: 'ليس لديك صلاحية للوصول إلى هذا الرقم' });
                }
                sessionIds = [sessionId];
            } else {
                sessionIds = accessibleIds;
            }
        }

        const where = {
            sessionId: { in: sessionIds },
            isArchived: archived === 'true',
            totalMessages: { gt: 0 }
        };

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { pushName: { contains: search } },
                { phoneNumber: { contains: search } }
            ];

            // 🔍 البحث في محتوى الرسائل نفسها (كلمة / أوردر / أي نص) — مش بس رقم أو اسم
            // مهم: بنرجع (sessionId + remoteJid) مع بعض، عشان نفس الرقم موجود في أكثر من جلسة
            // والنتيجة المفروض تبقى للمحادثة اللي جوه رسايلها الكلمة فعلًا مش جلسة تانية.
            const contentMatchedMessages = await getSharedPrismaClient().whatsAppMessage.findMany({
                where: {
                    sessionId: { in: sessionIds },
                    content: { contains: search, mode: 'insensitive' },
                    isHidden: false
                },
                distinct: ['sessionId', 'remoteJid'],
                select: { sessionId: true, remoteJid: true },
                take: 1000
            });

            if (contentMatchedMessages.length > 0) {
                where.OR.push({
                    OR: contentMatchedMessages.map(m => ({
                        sessionId: m.sessionId,
                        jid: m.remoteJid
                    }))
                });
            }
        }

        if (category) {
            where.category = category;
        }

        // فلترة خادم على كل المحادثات (مش بس اللي ظاهرة في الصفحة)
        if (filter === 'unread') {
            where.unreadCount = { gt: 0 };
        } else if (filter === 'groups') {
            where.isGroup = true;
        } else if (filter === 'unreplied') {
            // "بانتظار الرد" = آخر رسالة من العميل (مش من رقم البيزنس)
            where.lastMessageIsFromMe = false;
        }

        // عدّادات دقيقة لكل الفلاتر على مستوى الجلسة (مش بتتأثر بالـ search/filter الحالي)
        const activeCountWhere = {
            sessionId: { in: sessionIds },
            totalMessages: { gt: 0 }
        };

        // تحسين: تشغيل استعلام المحادثات والعدد الكلي والعدادات بشكل متزامن
        const [contacts, total, countAll, countUnread, countGroups, countUnreplied, countArchived] = await Promise.all([
            getSharedPrismaClient().whatsAppContact.findMany({
                where,
                orderBy: [
                    { isPinned: 'desc' },
                    { lastMessageAt: 'desc' }
                ],
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit),
                select: {
                    id: true,
                    sessionId: true,
                    jid: true,
                    phoneNumber: true,
                    name: true,
                    pushName: true,
                    profilePicUrl: true,
                    isGroup: true,
                    category: true,
                    leadCategoryId: true,
                    leadCategory: {
                        select: {
                            id: true,
                            name: true,
                            color: true
                        }
                    },
                    unreadCount: true,
                    lastMessageAt: true,
                    lastCustomerMessageAt: true,
                    isArchived: true,
                    isPinned: true,
                    isMuted: true,
                    labels: true,
                    whatsAppSession: {
                        select: { name: true, phoneNumber: true }
                    },
                    customer: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            status: true,
                            conversations: {
                                where: {
                                    channel: 'WHATSAPP',
                                    status: { in: ['ACTIVE', 'PENDING'] }
                                },
                                select: {
                                    id: true,
                                    aiEnabled: true
                                },
                                take: 1
                            }
                        }
                    }
                }
            }),
            getSharedPrismaClient().whatsAppContact.count({ where }),
            getSharedPrismaClient().whatsAppContact.count({ where: { ...activeCountWhere, isArchived: false } }),
            getSharedPrismaClient().whatsAppContact.count({ where: { ...activeCountWhere, isArchived: false, unreadCount: { gt: 0 } } }),
            getSharedPrismaClient().whatsAppContact.count({ where: { ...activeCountWhere, isArchived: false, isGroup: true } }),
            getSharedPrismaClient().whatsAppContact.count({ where: { ...activeCountWhere, isArchived: false, lastMessageIsFromMe: false } }),
            getSharedPrismaClient().whatsAppContact.count({ where: { ...activeCountWhere, isArchived: true } })
        ]);

        // جلب آخر رسالة لكل محادثة (Optimized Batch Query)
        let lastMessages = [];
        if (contacts.length > 0) {
            const jids = contacts.map(c => c.jid);

            // 1. Get the latest timestamp for each session/JID pair
            // This is much faster than fetching full messages
            const latestMessageStats = await getSharedPrismaClient().whatsAppMessage.groupBy({
                by: ['sessionId', 'remoteJid'],
                where: {
                    sessionId: { in: sessionIds },
                    remoteJid: { in: jids }
                },
                _max: {
                    timestamp: true
                }
            });

            // 2. Build a filter to get the actual messages
            // We match (sessionId + remoteJid + timestamp) to get the specific message
            // Note: In rare cases of exact same timestamp, we might get duplicates, but we handle that below
            const conditions = latestMessageStats.map(stat => ({
                sessionId: stat.sessionId,
                remoteJid: stat.remoteJid,
                timestamp: stat._max.timestamp
            })).filter(c => c.timestamp); // Ensure timestamp exists

            if (conditions.length > 0) {
                lastMessages = await getSharedPrismaClient().whatsAppMessage.findMany({
                    where: {
                        OR: conditions
                    },
                    select: {
                        sessionId: true,
                        remoteJid: true,
                        content: true,
                        messageType: true,
                        fromMe: true,
                        senderId: true,
                        timestamp: true,
                        status: true
                    }
                });
            }
        }

        const lastMessagesMap = new Map(lastMessages.map(m => [`${m.sessionId}:${m.remoteJid}`, m]));

        // حل اسم الموظف المرسل لآخر رسالة (المحادثات اللي آخر رسالة فيها من الموظف)
        const lastSenderIds = [...new Set(
            lastMessages.filter(m => m.fromMe && m.senderId).map(m => m.senderId)
        )];
        let lastSenderMap = {};
        if (lastSenderIds.length > 0) {
            const lastSenders = await getSharedPrismaClient().user.findMany({
                where: { id: { in: lastSenderIds } },
                select: { id: true, firstName: true, lastName: true }
            });
            lastSenderMap = Object.fromEntries(
                lastSenders.map(u => [u.id, [u.firstName, u.lastName].filter(Boolean).join(' ')])
            );
        }
        for (const m of lastMessages) {
            if (m.fromMe && m.senderId) {
                m.senderName = lastSenderMap[m.senderId] || null;
            } else {
                m.senderName = null;
            }
        }

        // 🔍 لما يكون في بحث عن المحتوى: نرجّع آخر رسالة فيها كلمة البحث (matchedMessage)
        // عشان البريفيو يظهر الكلمة المطابقة مش آخر رسالة غلط
        let matchedMessagesMap = new Map();
        if (search) {
            const pageJids = contacts.map(c => c.jid);
            const matchedStats = await getSharedPrismaClient().whatsAppMessage.groupBy({
                by: ['sessionId', 'remoteJid'],
                where: {
                    sessionId: { in: sessionIds },
                    remoteJid: { in: pageJids },
                    content: { contains: search, mode: 'insensitive' },
                    isHidden: false
                },
                _max: { timestamp: true }
            });

            const matchedConditions = matchedStats.map(stat => ({
                sessionId: stat.sessionId,
                remoteJid: stat.remoteJid,
                timestamp: stat._max.timestamp
            })).filter(c => c.timestamp);

            if (matchedConditions.length > 0) {
                const matchedMessages = await getSharedPrismaClient().whatsAppMessage.findMany({
                    where: { OR: matchedConditions },
                    select: {
                        sessionId: true,
                        remoteJid: true,
                        content: true,
                        messageType: true,
                        fromMe: true,
                        timestamp: true
                    }
                });
                matchedMessagesMap = new Map(matchedMessages.map(m => [`${m.sessionId}:${m.remoteJid}`, m]));
            }
        }

        const conversationsWithLastMessage = contacts.map(contact => ({
            ...contact,
            session: contact.whatsAppSession,
            lastMessage: lastMessagesMap.get(`${contact.sessionId}:${contact.jid}`) || null,
            matchedMessage: matchedMessagesMap.get(`${contact.sessionId}:${contact.jid}`) || null,
            window: computeWindowStatus(contact)
        }));

        // 🏷️ Resolve labels: DB (persistent) + in-memory (Baileys) fallback
        const uniqueSessionIds = [...new Set(contacts.map(c => c.sessionId))];
        const chatLabelIds = new Map();
        for (const sid of uniqueSessionIds) {
            const session = WhatsAppManager.getSession(sid);
            if (!session?.labelAssociations) continue;
            for (const [labelId, chatJids] of session.labelAssociations) {
                for (const jid of chatJids) {
                    if (!chatLabelIds.has(jid)) chatLabelIds.set(jid, []);
                    chatLabelIds.get(jid).push(labelId);
                }
            }
        }
        const conversationsWithLabels = conversationsWithLastMessage.map(contact => {
            let labelIds = [];
            // 1. Try DB-stored labels first (persistent)
            if (contact.labels) {
                try { labelIds = JSON.parse(contact.labels); } catch {}
            }
            // 2. Fallback to in-memory Baileys labels
            if (labelIds.length === 0 && chatLabelIds.has(contact.jid)) {
                labelIds = chatLabelIds.get(contact.jid);
            }
            return { ...contact, labels: labelIds };
        });

        res.json({
            conversations: conversationsWithLabels,
            counts: {
                all: countAll,
                unread: countUnread,
                groups: countGroups,
                unreplied: countUnreplied,
                archived: countArchived
            },
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('❌ Error getting conversations:', error);
        // Log full error stack
        console.error(error.stack);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب المحادثات', details: error.message });
    }
}

/**
 * جلب رسائل محادثة
 * GET /api/whatsapp/conversations/:jid/messages
 */
async function getMessages(req, res) {
    try {
        const { companyId, id: userId, role } = req.user;
        const { jid } = req.params;
        const { sessionId, page = 1, limit = 50 } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'معرف الجلسة مطلوب' });
        }

        // Resolve session from DB only (skip in-memory check — getMessages
        // reads from DB and works fine even if the socket is disconnected)
        let targetSessionId = sessionId;
        if (sessionId === 'all') {
            const anySession = await getSharedPrismaClient().whatsAppSession.findFirst({
                where: { companyId },
                orderBy: { lastConnectedAt: 'desc' }
            });
            if (!anySession) {
                return res.status(404).json({ error: 'لا توجد جلسة متاحة' });
            }
            targetSessionId = anySession.id;
        } else {
            const session = await getSharedPrismaClient().whatsAppSession.findFirst({
                where: { id: sessionId, companyId }
            });
            if (!session) {
                return res.status(404).json({ error: 'الجلسة غير موجودة' });
            }
        }

        // Check user session access permission
        const { normalizeRole } = require('../middleware/rbacMiddleware');
        const userRole = normalizeRole(role);
        if (
            userRole !== 'SUPER_ADMIN' &&
            userRole !== 'COMPANY_ADMIN' &&
            userRole !== 'TEAM_LEADER'
        ) {
            const { getUserAccessibleSessionIds } = require('../middleware/numberAccessGuard');
            const accessibleSessions = await getUserAccessibleSessionIds(userId, companyId, getSharedPrismaClient());
            const accessibleIds = accessibleSessions.map(s => s.id);
            if (!accessibleIds.includes(targetSessionId)) {
                return res.status(403).json({ error: 'ليس لديك صلاحية للوصول إلى هذا الرقم' });
            }
        }

        const result = await WhatsAppMessageHandler.getMessages(targetSessionId, jid, {
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.json(result);
    } catch (error) {
        console.error('❌ Error getting messages:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            companyId: req.user?.companyId,
            sessionId: req.query?.sessionId,
            jid: req.params?.jid
        });
        res.status(500).json({ error: 'حدث خطأ أثناء جلب الرسائل' });
    }
}

/**
 * إرسال رسالة
 * POST /api/whatsapp/messages/send
 */
async function sendMessage(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, text, quotedMessageId, contactId } = req.body;

        if (!sessionId || !to || !text) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        // Resolve virtual session ID with optional auto-failover for contacts
        const targetSessionId = await resolveActiveSessionId(companyId, sessionId, { contactId });

        // 🚨 PRODUCTION-FIX (C5): نافذة الـ 24 ساعة على الإرسال اليدوي لـ META_CLOUD فقط.
        // خارج النافذة Meta ترفض الإرسال الحر — نمنعه مبكراً بدل "SENT" الوهمي.
        try {
            const sessionRecord = await getSharedPrismaClient().whatsAppSession.findUnique({
                where: { id: targetSessionId },
                select: { provider: true }
            });
            if (sessionRecord?.provider === 'META_CLOUD') {
                const jid = WhatsAppMessageHandler.formatJid(to);
                const contact = await getSharedPrismaClient().whatsAppContact.findUnique({
                    where: { sessionId_jid: { sessionId: targetSessionId, jid } },
                    select: { lastCustomerMessageAt: true }
                });
                const window = computeWindowStatus(contact);
                if (!window.isOpen) {
                    return res.status(409).json({
                        error: 'نافذة الـ 24 ساعة مع هذا العميل مغلقة. استخدم قالباً معتمداً من Meta لإرسال رسالة.',
                        code: 'WA_24H_WINDOW_CLOSED',
                        window
                    });
                }
            }
        } catch (windowErr) {
            console.error('❌ Error checking 24h window:', windowErr.message);
        }

        const message = await WhatsAppMessageHandler.sendText(targetSessionId, to, text, {
            quotedMessageId,
            senderId: req.body.userId || req.user?.userId,
            typingSimulation: true
        });

        res.json({ success: true, message });
    } catch (error) {
        console.error('❌ Error sending message:', error);
        const statusCode = error.code === 'WA_SESSION_NOT_READY' ? 409 : (error.statusCode || 500);
        res.status(statusCode).json({
            error: error.message || 'حدث خطأ أثناء إرسال الرسالة',
            code: error.code || 'WA_SEND_ERROR',
            availableSessions: error.availableSessions
        });
    }
}

/**
 * إرسال وسائط
 * POST /api/whatsapp/messages/send-media
 */
async function sendMedia(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, mediaType, mediaUrl, caption } = req.body;

        if (!sessionId || !to || !mediaType || !mediaUrl) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        if (!isValidUrl(mediaUrl)) {
            return res.status(400).json({ error: 'رابط الوسائط غير صالح' });
        }

        // Resolve virtual session ID and verify ownership
        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);

        let message;
        const mediaSource = { url: mediaUrl };

        switch (mediaType) {
            case 'image':
                message = await WhatsAppMessageHandler.sendImage(targetSessionId, to, mediaSource, caption);
                break;
            case 'video':
                message = await WhatsAppMessageHandler.sendVideo(targetSessionId, to, mediaSource, caption);
                break;
            case 'audio':
                message = await WhatsAppMessageHandler.sendAudio(targetSessionId, to, mediaSource);
                break;
            case 'document':
                message = await WhatsAppMessageHandler.sendDocument(targetSessionId, to, mediaSource, { caption });
                break;
            default:
                return res.status(400).json({ error: 'نوع الوسائط غير مدعوم' });
        }

        res.json({ success: true, message });
    } catch (error) {
        console.error('❌ Error sending media:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            error: error.message || 'حدث خطأ أثناء إرسال الوسائط',
            code: error.code || 'WA_MEDIA_SEND_ERROR'
        });
    }
}

/**
 * تحديد الرسائل كمقروءة
 * POST /api/whatsapp/messages/read
 */
async function markAsRead(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, remoteJid } = req.body;

        if (!sessionId || !remoteJid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        // Resolve target session from DB only (skip in-memory check — markAsRead
        // works on DB even if the socket is disconnected/reconnecting)
        let targetSessionId = sessionId;
        if (sessionId === 'all') {
            const anySession = await getSharedPrismaClient().whatsAppSession.findFirst({
                where: { companyId },
                orderBy: { lastConnectedAt: 'desc' }
            });
            if (!anySession) {
                return res.status(404).json({ error: 'لا توجد جلسة متاحة' });
            }
            targetSessionId = anySession.id;
        } else {
            const session = await getSharedPrismaClient().whatsAppSession.findFirst({
                where: { id: sessionId, companyId }
            });
            if (!session) {
                return res.status(404).json({ error: 'الجلسة غير موجودة' });
            }
        }

        await WhatsAppMessageHandler.markAsRead(targetSessionId, remoteJid);

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error marking as read:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            companyId: req.user?.companyId,
            sessionId: req.body?.sessionId,
            remoteJid: req.body?.remoteJid
        });
        res.status(500).json({ error: 'حدث خطأ' });
    }
}

/**
 * إرسال رسالة بأزرار تفاعلية
 * POST /api/whatsapp/messages/send-buttons
 */
async function sendButtons(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, text, buttons, footer, header } = req.body;

        if (!sessionId || !to || !text || !buttons || !Array.isArray(buttons)) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        if (buttons.length > 3) {
            return res.status(400).json({ error: 'الحد الأقصى للأزرار هو 3' });
        }

        // Resolve virtual session ID and verify ownership
        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);

        const message = await WhatsAppMessageHandler.sendButtons(
            targetSessionId,
            to,
            text,
            buttons,
            { footer, header }
        );

        res.json({ success: true, message });
    } catch (error) {
        console.error('❌ Error sending buttons:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال الأزرار' });
    }
}

/**
 * إرسال رسالة بقائمة
 * POST /api/whatsapp/messages/send-list
 */
async function sendList(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, text, buttonText, sections, title, footer, description } = req.body;

        if (!sessionId || !to || !text || !buttonText || !sections || !Array.isArray(sections)) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        if (sections.length > 10) {
            return res.status(400).json({ error: 'الحد الأقصى للأقسام هو 10' });
        }

        // Resolve virtual session ID and verify ownership
        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);

        const message = await WhatsAppMessageHandler.sendList(
            targetSessionId,
            to,
            text,
            buttonText,
            sections,
            { title, footer, description }
        );

        res.json({ success: true, message });
    } catch (error) {
        console.error('❌ Error sending list:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال القائمة' });
    }
}

/**
 * إرسال منتج
 * POST /api/whatsapp/messages/send-product
 */
async function sendProduct(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, product, buttons, footer } = req.body;

        if (!sessionId || !to || !product || !product.name) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        if (product.imageUrl && !isValidUrl(product.imageUrl)) {
            return res.status(400).json({ error: 'رابط صورة المنتج غير صالح' });
        }

        // Resolve virtual session ID and verify ownership
        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const message = await WhatsAppMessageHandler.sendProduct(
            targetSessionId,
            to,
            product,
            { buttons, footer }
        );

        res.json({ success: true, message });
    } catch (error) {
        console.error('❌ Error sending product:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال المنتج' });
    }
}

/**
 * إرسال تفاعل (Reaction)
 * POST /api/whatsapp/messages/send-reaction
 */
async function sendReaction(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, messageId, emoji } = req.body;

        if (!sessionId || !to || !messageId || !emoji) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        // Resolve virtual session ID and verify ownership
        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);

        const result = await WhatsAppMessageHandler.sendReaction(
            targetSessionId,
            to,
            messageId,
            emoji
        );

        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error sending reaction:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال التفاعل' });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 جهات الاتصال
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * تحديث جهة اتصال
 * PUT /api/whatsapp/contacts/:id
 */
async function updateContact(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { name, category, leadCategoryId, tags, notes, customerId, isArchived, isPinned, isMuted, phoneNumber } = req.body;

        // التحقق من الملكية
        const contact = await getSharedPrismaClient().whatsAppContact.findFirst({
            where: { id },
            include: {
                whatsAppSession: { select: { companyId: true } }
            }
        });

        if (!contact || contact.whatsAppSession.companyId !== companyId) {
            return res.status(404).json({ error: 'جهة الاتصال غير موجودة' });
        }

        const newLeadCategoryId = leadCategoryId || null;
        let activeContactId = id;
        let mergedPhoneJid = null;

        // إذا تم إرسال رقم هاتف
        if (phoneNumber && typeof phoneNumber === 'string' && phoneNumber.trim()) {
            let cleanDigits = phoneNumber.trim().replace(/\D/g, '');
            if (cleanDigits.startsWith('00')) {
                cleanDigits = cleanDigits.slice(2);
            } else if (cleanDigits.startsWith('01') && cleanDigits.length === 11) {
                cleanDigits = '2' + cleanDigits;
            }

            if (cleanDigits.length >= 7) {
                const targetPhoneJid = `${cleanDigits}@s.whatsapp.net`;

                // إذا كانت جهة الاتصال مسجلة بـ LID (غير مربوطة برقم حقيقي)
                if (contact.jid.includes('@lid')) {
                    const WhatsAppManager = require('../services/whatsapp/WhatsAppManager');
                    const prisma = getSharedPrismaClient();

                    // حفظ الربط في whatsAppLidMapping
                    if (prisma.whatsAppLidMapping) {
                        await prisma.whatsAppLidMapping.upsert({
                            where: {
                                sessionId_lidJid: {
                                    sessionId: contact.sessionId,
                                    lidJid: contact.jid
                                }
                            },
                            create: {
                                sessionId: contact.sessionId,
                                lidJid: contact.jid,
                                phoneJid: targetPhoneJid
                            },
                            update: {
                                phoneJid: targetPhoneJid,
                                updatedAt: new Date()
                            }
                        });
                    }

                    // دمج المحادثة مع رقم الهاتف ونقل الرسائل
                    await WhatsAppManager.mergeLinkedDeviceConversation(
                        contact.sessionId,
                        contact.jid,
                        targetPhoneJid,
                        { pushName: name || contact.pushName || contact.name }
                    );

                    // البحث عن جهة الاتصال بعد الدمج
                    const mergedContact = await prisma.whatsAppContact.findUnique({
                        where: {
                            sessionId_jid: {
                                sessionId: contact.sessionId,
                                jid: targetPhoneJid
                            }
                        }
                    });

                    if (mergedContact) {
                        activeContactId = mergedContact.id;
                        mergedPhoneJid = targetPhoneJid;
                    }
                } else {
                    // إذا لم تكن LID، تحديث رقم الهاتف مباشرة
                    await getSharedPrismaClient().whatsAppContact.update({
                        where: { id: activeContactId },
                        data: { phoneNumber: cleanDigits }
                    });
                }
            }
        }

        // البحث التلقائي عن عميل مطابق إذا لم يتم تحديد عميل
        let resolvedCustomerId = customerId;
        if (!resolvedCustomerId && mergedPhoneJid) {
            const cleanDigits = mergedPhoneJid.split('@')[0];
            const existingCustomer = await getSharedPrismaClient().customer.findFirst({
                where: {
                    companyId,
                    OR: [
                        { phone: cleanDigits },
                        { phone: cleanDigits.replace(/^20/, '0') },
                        { phone: { endsWith: cleanDigits.slice(-9) } }
                    ]
                },
                select: { id: true }
            });
            if (existingCustomer) {
                resolvedCustomerId = existingCustomer.id;
            }
        }

        const updatedContact = await getSharedPrismaClient().whatsAppContact.update({
            where: { id: activeContactId },
            data: {
                name,
                category,
                leadCategoryId: newLeadCategoryId,
                tags: Array.isArray(tags) ? JSON.stringify(tags) : undefined,
                notes,
                customerId: resolvedCustomerId,
                isArchived,
                isPinned,
                isMuted
            }
        });

        // Sync tags to Customer model if linked
        if (Array.isArray(tags) && updatedContact.customerId) {
            const tagsStr = JSON.stringify(tags);
            if (contact.tags !== tagsStr) {
                await getSharedPrismaClient().customer.update({
                    where: { id: updatedContact.customerId },
                    data: { tags: tagsStr }
                }).catch(err => console.error('❌ Failed to sync tags to customer:', err));
            }
        }

        // Cancel old journey + enroll in new category-based journey
        if (newLeadCategoryId && newLeadCategoryId !== contact.leadCategoryId && updatedContact.customerId) {
            try {
                const WhatsAppJourneyService = require('../services/whatsapp/WhatsAppJourneyService');
                await WhatsAppJourneyService.reEnrollFromCategory(
                    companyId,
                    updatedContact.customerId,
                    activeContactId,
                    newLeadCategoryId
                );
            } catch (err) {
                console.error('❌ Journey re-enrollment failed:', err);
            }
        }

        res.json({ success: true, contact: updatedContact, mergedPhoneJid });
    } catch (error) {
        console.error('❌ Error updating contact:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث جهة الاتصال' });
    }
}

/**
 * ربط جهة اتصال بعميل
 * POST /api/whatsapp/contacts/:id/link-customer
 */
async function linkCustomer(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { customerId } = req.body;

        // التحقق من الملكية
        const contact = await getSharedPrismaClient().whatsAppContact.findFirst({
            where: { id },
            include: {
                whatsAppSession: { select: { companyId: true } }
            }
        });

        if (!contact || contact.whatsAppSession.companyId !== companyId) {
            return res.status(404).json({ error: 'جهة الاتصال غير موجودة' });
        }

        // التحقق من العميل
        const customer = await getSharedPrismaClient().customer.findFirst({
            where: { id: customerId, companyId }
        });

        if (!customer) {
            return res.status(404).json({ error: 'العميل غير موجود' });
        }

        const updatedContact = await getSharedPrismaClient().whatsAppContact.update({
            where: { id },
            data: { customerId },
            include: { customer: true }
        });

        // Enroll in journey if contact has a category with trigger flow
        if (contact.leadCategoryId && updatedContact.customerId) {
            try {
                const WhatsAppJourneyService = require('../services/whatsapp/WhatsAppJourneyService');
                await WhatsAppJourneyService.enrollFromCategory(
                    companyId,
                    updatedContact.customerId,
                    id,
                    contact.leadCategoryId
                );
            } catch (err) {
                console.error('❌ Journey enrollment on linkCustomer failed:', err);
            }
        }

        res.json({ success: true, contact: updatedContact });
    } catch (error) {
        console.error('❌ Error linking customer:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء ربط العميل' });
    }
}

/**
 * تغيير الجلسة المرتبطة بجهة اتصال
 * PUT /api/whatsapp/contacts/:id/reassign-session
 */
async function reassignContactSession(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'sessionId مطلوب' });
        }

        // التحقق من ملكية جهة الاتصال
        const contact = await getSharedPrismaClient().whatsAppContact.findFirst({
            where: { id },
            include: {
                whatsAppSession: { select: { companyId: true } }
            }
        });

        if (!contact || contact.whatsAppSession.companyId !== companyId) {
            return res.status(404).json({ error: 'جهة الاتصال غير موجودة' });
        }

        // التحقق من أن الجلسة الجديدة تتبع نفس الشركة
        const newSession = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!newSession) {
            return res.status(400).json({ error: 'الجلسة الجديدة غير موجودة أو لا تنتمي لهذه الشركة' });
        }

        const updatedContact = await getSharedPrismaClient().whatsAppContact.update({
            where: { id },
            data: { sessionId, updatedAt: new Date() },
            select: { id: true, phoneNumber: true, name: true, pushName: true, sessionId: true }
        });

        console.log(`↪️ [REASSIGN] Contact ${id} (${updatedContact.phoneNumber || updatedContact.name || ''}) reassigned from session ${contact.sessionId} to ${sessionId}`);

        res.json({ success: true, contact: updatedContact });
    } catch (error) {
        console.error('❌ Error reassigning contact session:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تغيير الجلسة' });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 الردود السريعة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * جلب الردود السريعة
 * GET /api/whatsapp/quick-replies
 */
async function getQuickReplies(req, res) {
    try {
        const { companyId } = req.user;
        const { category } = req.query;

        const where = { companyId, isActive: true };
        if (category) where.category = category;

        const quickReplies = await getSharedPrismaClient().whatsAppQuickReply.findMany({
            where,
            orderBy: [
                { sortOrder: 'asc' },
                { usageCount: 'desc' }
            ]
        });

        res.json({ quickReplies });
    } catch (error) {
        console.error('❌ Error getting quick replies:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب الردود السريعة' });
    }
}

/**
 * إنشاء رد سريع
 * POST /api/whatsapp/quick-replies
 */
async function createQuickReply(req, res) {
    try {
        const { companyId } = req.user;
        const { title, shortcut, content, category, variables, mediaUrl, mediaType } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: 'العنوان والمحتوى مطلوبان' });
        }

        if (mediaUrl && !isValidUrl(mediaUrl)) {
            return res.status(400).json({ error: 'رابط الوسائط غير صالح' });
        }

        const quickReply = await getSharedPrismaClient().whatsAppQuickReply.create({
            data: {
                companyId,
                title,
                shortcut,
                content,
                category: category || 'general',
                variables: variables ? JSON.stringify(variables) : null,
                mediaUrl,
                mediaType
            }
        });

        res.status(201).json({ success: true, quickReply });
    } catch (error) {
        console.error('❌ Error creating quick reply:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الرد السريع' });
    }
}

/**
 * تحديث رد سريع
 * PUT /api/whatsapp/quick-replies/:id
 */
async function updateQuickReply(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { title, shortcut, content, category, variables, mediaUrl, mediaType, isActive, sortOrder } = req.body;

        if (mediaUrl && !isValidUrl(mediaUrl)) {
            return res.status(400).json({ error: 'رابط الوسائط غير صالح' });
        }

        // التحقق من الملكية
        const existing = await getSharedPrismaClient().whatsAppQuickReply.findFirst({
            where: { id, companyId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'الرد السريع غير موجود' });
        }

        const quickReply = await getSharedPrismaClient().whatsAppQuickReply.update({
            where: { id },
            data: {
                title,
                shortcut,
                content,
                category,
                variables: variables ? JSON.stringify(variables) : undefined,
                mediaUrl,
                mediaType,
                isActive,
                sortOrder
            }
        });

        res.json({ success: true, quickReply });
    } catch (error) {
        console.error('❌ Error updating quick reply:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث الرد السريع' });
    }
}

/**
 * حذف رد سريع
 * DELETE /api/whatsapp/quick-replies/:id
 */
async function deleteQuickReply(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        // التحقق من الملكية
        const existing = await getSharedPrismaClient().whatsAppQuickReply.findFirst({
            where: { id, companyId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'الرد السريع غير موجود' });
        }

        await getSharedPrismaClient().whatsAppQuickReply.delete({ where: { id } });

        res.json({ success: true, message: 'تم حذف الرد السريع' });
    } catch (error) {
        console.error('❌ Error deleting quick reply:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء حذف الرد السريع' });
    }
}

/**
 * إرسال رد سريع
 * POST /api/whatsapp/quick-replies/:id/send
 */
async function sendQuickReply(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { sessionId, to, variables } = req.body;

        // التحقق من الملكية
        const quickReply = await getSharedPrismaClient().whatsAppQuickReply.findFirst({
            where: { id, companyId }
        });

        if (!quickReply) {
            return res.status(404).json({ error: 'الرد السريع غير موجود' });
        }

        // Resolve virtual session ID and verify ownership
        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);

        const message = await WhatsAppMessageHandler.sendQuickReply(targetSessionId, to, id, variables || {});

        res.json({ success: true, message });
    } catch (error) {
        console.error('❌ Error sending quick reply:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال الرد السريع' });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ الإعدادات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * جلب الإعدادات
 * GET /api/whatsapp/settings
 */
async function getSettings(req, res) {
    try {
        const { companyId } = req.user;

        let settings = await getSharedPrismaClient().whatsAppSettings.findUnique({
            where: { companyId }
        });

        // إنشاء إعدادات افتراضية إذا لم تكن موجودة
        if (!settings) {
            settings = await getSharedPrismaClient().whatsAppSettings.create({
                data: { companyId }
            });
        }

        res.json({ settings });
    } catch (error) {
        console.error('❌ Error getting settings:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب الإعدادات' });
    }
}

/**
 * تحديث الإعدادات
 * PUT /api/whatsapp/settings
 */
async function updateSettings(req, res) {
    try {
        const { companyId } = req.user;
        const {
            isEnabled,
            maxSessions,
            notificationSound,
            browserNotifications,
            maxImageSize,
            maxVideoSize,
            maxDocumentSize,
            autoCompressImages,
            autoArchiveDays
        } = req.body;

        const settings = await getSharedPrismaClient().whatsAppSettings.upsert({
            where: { companyId },
            update: {
                isEnabled,
                maxSessions,
                notificationSound,
                browserNotifications,
                maxImageSize,
                maxVideoSize,
                maxDocumentSize,
                autoCompressImages,
                autoArchiveDays
            },
            create: {
                companyId,
                isEnabled,
                maxSessions,
                notificationSound,
                browserNotifications,
                maxImageSize,
                maxVideoSize,
                maxDocumentSize,
                autoCompressImages,
                autoArchiveDays
            }
        });

        res.json({ success: true, settings });
    } catch (error) {
        console.error('❌ Error updating settings:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث الإعدادات' });
    }
}

/**
 * جلب إعدادات سياسة نافذة 24 ساعة والـ SMS
 * GET /api/whatsapp/settings/window-policy
 */
async function getWindowPolicy(req, res) {
    try {
        const { companyId } = req.user;
        const policy = await WhatsAppWindowPolicyService.getWindowPolicySettings(companyId);
        res.json({ success: true, policy });
    } catch (error) {
        console.error('❌ Error getting window policy settings:', error);
        res.status(500).json({ success: false, error: 'حدث خطأ أثناء جلب إعدادات النافذة والـ SMS' });
    }
}

/**
 * تحديث إعدادات سياسة نافذة 24 ساعة والـ SMS
 * PUT /api/whatsapp/settings/window-policy
 */
async function updateWindowPolicy(req, res) {
    try {
        const { companyId } = req.user;
        const policy = await WhatsAppWindowPolicyService.updateWindowPolicySettings(companyId, req.body);
        res.json({ success: true, policy });
    } catch (error) {
        console.error('❌ Error updating window policy settings:', error);
        res.status(500).json({ success: false, error: 'حدث خطأ أثناء تحديث إعدادات النافذة والـ SMS' });
    }
}

/**
 * إرسال رسالة SMS تجريبية للتحقق من بيانات الربط
 * POST /api/whatsapp/settings/test-sms
 */
async function testSendSMS(req, res) {
    try {
        const { companyId } = req.user;
        const { phone, text, config } = req.body;

        if (!phone) {
            return res.status(400).json({ success: false, error: 'رقم الهاتف مطلوب' });
        }

        let effectiveConfig = config;
        if (!effectiveConfig) {
            const policy = await WhatsAppWindowPolicyService.getWindowPolicySettings(companyId);
            effectiveConfig = {
                ...policy.smsConfig,
                provider: policy.smsProvider
            };
        }

        const messageText = text || 'رسالة تجريبية من منصة MaxP للتحقق من ربط بوابة SMS بنجاح.';
        const result = await smsGateway.sendSMS({
            to: phone,
            text: messageText,
            senderId: effectiveConfig?.senderId,
            config: effectiveConfig
        });

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error || 'فشل إرسال رسالة SMS التجريبية',
                provider: result.provider
            });
        }

        res.json({
            success: true,
            message: 'تم إرسال رسالة SMS التجريبية بنجاح',
            result
        });
    } catch (error) {
        console.error('❌ Error testing SMS send:', error);
        res.status(500).json({ success: false, error: error.message || 'حدث خطأ أثناء إرسال رسالة SMS التجريبية' });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 الإحصائيات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * جلب الإحصائيات
 * GET /api/whatsapp/stats
 */
async function getStats(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, period = '7d' } = req.query;

        // حساب التاريخ
        const periodDays = parseInt(period) || 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);

        // جلب معرفات الجلسات
        const sessionIds = (sessionId && sessionId !== 'all')
            ? [sessionId]
            : (await getSharedPrismaClient().whatsAppSession.findMany({
                where: { companyId },
                select: { id: true }
            })).map(s => s.id);

        // إحصائيات الرسائل
        const totalMessages = await getSharedPrismaClient().whatsAppMessage.count({
            where: {
                sessionId: { in: sessionIds },
                timestamp: { gte: startDate }
            }
        });

        const sentMessages = await getSharedPrismaClient().whatsAppMessage.count({
            where: {
                sessionId: { in: sessionIds },
                fromMe: true,
                timestamp: { gte: startDate }
            }
        });

        const receivedMessages = totalMessages - sentMessages;

        // إحصائيات المحادثات
        const totalConversations = await getSharedPrismaClient().whatsAppContact.count({
            where: { sessionId: { in: sessionIds } }
        });

        const activeConversations = await getSharedPrismaClient().whatsAppContact.count({
            where: {
                sessionId: { in: sessionIds },
                lastMessageAt: { gte: startDate }
            }
        });

        // إحصائيات يومية
        let dailyStats = [];

        if (sessionIds.length > 0) {
            dailyStats = await getSharedPrismaClient().$queryRaw`
                SELECT 
                    DATE(timestamp) as date,
                    COUNT(*) as total,
                    SUM(CASE WHEN fromMe = true THEN 1 ELSE 0 END) as sent,
                    SUM(CASE WHEN fromMe = false THEN 1 ELSE 0 END) as received
                FROM whatsapp_messages
                WHERE sessionId IN (${getSharedPrismaClient().join(sessionIds)})
                AND timestamp >= ${startDate}
                GROUP BY DATE(timestamp)
                ORDER BY date
            `.catch((e) => {
                console.error('Error in daily stats query:', e);
                return [];
            });

            // Convert BigInt to Number
            dailyStats = dailyStats.map(stat => ({
                date: stat.date,
                total: Number(stat.total || 0),
                sent: Number(stat.sent || 0),
                received: Number(stat.received || 0)
            }));
        }

        res.json({
            stats: {
                messages: {
                    total: totalMessages,
                    sent: sentMessages,
                    received: receivedMessages
                },
                conversations: {
                    total: totalConversations,
                    active: activeConversations
                },
                daily: dailyStats
            }
        });
    } catch (error) {
        console.error('❌ Error getting stats:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب الإحصائيات' });
    }
}

/**
 * تعديل رسالة
 * POST /api/whatsapp/messages/edit
 */
async function editMessage(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, key, newText } = req.body;

        if (!sessionId || !to || !key || !newText) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        // Resolve virtual session ID and verify ownership
        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.editMessage(targetSessionId, to, key, newText);

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error editing message:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تعديل الرسالة' });
    }
}

/**
 * حذف رسالة
 * POST /api/whatsapp/messages/delete
 */
async function deleteMessage(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, key } = req.body;

        if (!sessionId || !to || !key) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        // Resolve virtual session ID and verify ownership
        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        try {
          await WhatsAppManager.deleteMessage(targetSessionId, to, key);
        } catch (sockError) {
          console.warn('⚠️ WhatsApp protocol delete failed, continuing to local DB removal:', sockError.message);
        }

        // Remove the message from our local store so it disappears from the UI.
        // The WhatsApp protocol delete above only revokes it on WhatsApp's side;
        // the app reads its own whatsAppMessage table, so the row must be deleted too.
        await getSharedPrismaClient().whatsAppMessage.deleteMany({
          where: { messageId: key.id },
        });

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error deleting message:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء حذف الرسالة' });
    }
}

/**
 * إعادة توجيه رسالة
 * POST /api/whatsapp/messages/forward
 */
async function forwardMessage(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, message, messageId } = req.body;

        if (!sessionId || !to || (!message && !messageId)) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        // Resolve virtual session ID and verify ownership
        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        if (message) {
            await WhatsAppManager.forwardMessage(targetSessionId, to, message);
            return res.json({ success: true });
        }

        if (messageId) {
            const dbMsg = await getSharedPrismaClient().whatsAppMessage.findFirst({
                where: { messageId }
            });

            if (!dbMsg) {
                return res.status(404).json({ error: 'الرسالة غير موجودة' });
            }

            const senderId = req.body.userId || req.user?.userId;

            if (dbMsg.mediaUrl) {
                const mediaType = (dbMsg.mediaType || dbMsg.messageType || 'IMAGE').toUpperCase();
                let sentMsg;
                if (mediaType.includes('IMAGE')) {
                    sentMsg = await WhatsAppMessageHandler.sendImage(targetSessionId, to, dbMsg.mediaUrl, dbMsg.content);
                } else if (mediaType.includes('VIDEO')) {
                    sentMsg = await WhatsAppMessageHandler.sendVideo(targetSessionId, to, dbMsg.mediaUrl, dbMsg.content);
                } else if (mediaType.includes('AUDIO')) {
                    sentMsg = await WhatsAppMessageHandler.sendAudio(targetSessionId, to, dbMsg.mediaUrl);
                } else {
                    sentMsg = await WhatsAppMessageHandler.sendDocument(targetSessionId, to, dbMsg.mediaUrl, {
                        caption: dbMsg.content,
                        fileName: dbMsg.mediaFileName
                    });
                }
                return res.json({ success: true, message: sentMsg });
            } else {
                const sentMsg = await WhatsAppMessageHandler.sendText(targetSessionId, to, dbMsg.content || '', {
                    senderId,
                    typingSimulation: false
                });
                return res.json({ success: true, message: sentMsg });
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error forwarding message:', error);
        res.status(500).json({ error: error?.message || 'حدث خطأ أثناء إعادة توجيه الرسالة' });
    }
}

/**
 * أرشفة محادثة
 * POST /api/whatsapp/chats/archive
 */
async function archiveChat(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid, archive } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        // META_CLOUD (official WhatsApp Cloud API) has no chat-modify endpoint —
        // persist the local inbox state only
        if (session.provider !== 'META_CLOUD') {
            await WhatsAppManager.archiveChat(targetSessionId, jid, archive);
        }

        // Update local DB
        await getSharedPrismaClient().whatsAppContact.updateMany({
            where: { sessionId: targetSessionId, jid },
            data: { isArchived: archive }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error archiving chat:', error);
        res.status(500).json({ error: error.message || 'حدث خطأ أثناء أرشفة المحادثة' });
    }
}

/**
 * تثبيت محادثة
 * POST /api/whatsapp/chats/pin
 */
async function pinChat(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid, pin } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        // META_CLOUD (official WhatsApp Cloud API) has no chat-modify endpoint —
        // persist the local inbox state only
        if (session.provider !== 'META_CLOUD') {
            await WhatsAppManager.pinChat(targetSessionId, jid, pin);
        }

        // Update local DB
        await getSharedPrismaClient().whatsAppContact.updateMany({
            where: { sessionId: targetSessionId, jid },
            data: { isPinned: pin }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error pinning chat:', error);
        res.status(500).json({ error: error.message || 'حدث خطأ أثناء تثبيت المحادثة' });
    }
}

/**
 * كتم محادثة
 * POST /api/whatsapp/chats/mute
 */
async function muteChat(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid, mute } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        // META_CLOUD (official WhatsApp Cloud API) has no chat-modify endpoint —
        // persist the local inbox state only
        if (session.provider !== 'META_CLOUD') {
            await WhatsAppManager.muteChat(targetSessionId, jid, mute);
        }

        // Update local DB
        await getSharedPrismaClient().whatsAppContact.updateMany({
            where: { sessionId: targetSessionId, jid },
            data: { isMuted: mute }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error muting chat:', error);
        res.status(500).json({ error: error.message || 'حدث خطأ أثناء كتم المحادثة' });
    }
}

/**
 * تحديد كغير مقروء
 * POST /api/whatsapp/chats/unread
 */
async function markChatUnread(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid, unread } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        // META_CLOUD (official WhatsApp Cloud API) has no chat-modify endpoint —
        // persist the local inbox state only (the unread badge reads unreadCount)
        if (session.provider !== 'META_CLOUD') {
            await WhatsAppManager.markChatUnread(targetSessionId, jid, unread);
        }

        // Update local DB if needed (optional, as unread count comes from messages usually)
        if (unread) {
            await getSharedPrismaClient().whatsAppContact.updateMany({
                where: { sessionId: targetSessionId, jid },
                data: { unreadCount: { increment: 1 } } // Artificial increment
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error marking chat unread:', error);
        res.status(500).json({ error: error.message || 'حدث خطأ' });
    }
}

/**
 * مسح محادثة
 * POST /api/whatsapp/chats/clear
 */
async function clearChat(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        // Clear chat from Baileys
        const activeSession = WhatsAppManager.getSession(targetSessionId);
        if (activeSession?.status === 'connected') {
            await WhatsAppManager.clearChat(targetSessionId, jid);
        }

        // Delete messages from local DB
        await getSharedPrismaClient().whatsAppMessage.deleteMany({
            where: { sessionId: targetSessionId, remoteJid: jid }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error clearing chat:', error);
        res.status(500).json({ error: error.message || 'حدث خطأ أثناء مسح المحادثة' });
    }
}

/**
 * حذف محادثة
 * POST /api/whatsapp/chats/delete
 */
async function deleteChatsBulk(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jids } = req.body;

        if (!sessionId || !jids || !Array.isArray(jids) || jids.length === 0) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        // Look up session in DB only — no active-connection requirement for delete
        const targetSessionId = sessionId && sessionId !== 'all'
            ? sessionId
            : null;

        let session = null;
        if (targetSessionId) {
            session = await getSharedPrismaClient().whatsAppSession.findFirst({
                where: { id: targetSessionId, companyId }
            });
        }

        // Fallback: find any session belonging to this company (even disconnected)
        if (!session) {
            session = await getSharedPrismaClient().whatsAppSession.findFirst({
                where: { companyId },
                orderBy: { lastConnectedAt: 'desc' }
            });
        }

        if (!session) {
            return res.status(404).json({ error: 'لا توجد جلسة واتساب لهذه الشركة' });
        }

        const resolvedSessionId = session.id;

        // Delete from Baileys for each JID (best-effort)
        const activeSession = WhatsAppManager.getSession(resolvedSessionId);
        if (activeSession?.status === 'connected') {
            for (const jid of jids) {
                try {
                    await activeSession.sock.chatModify({
                        delete: true,
                        lastMessages: [{
                            key: { remoteJid: jid, fromMe: true, id: 'AAA' },
                            messageTimestamp: Math.floor(Date.now() / 1000)
                        }]
                    }, jid);
                } catch (baileysError) {
                    console.error(`⚠️ Error deleting chat ${jid} from Baileys (continuing with DB delete):`, baileysError);
                }
            }
        }

        // Delete from DB
        await getSharedPrismaClient().whatsAppMessage.deleteMany({
            where: { sessionId: resolvedSessionId, remoteJid: { in: jids } }
        });

        await getSharedPrismaClient().whatsAppContact.deleteMany({
            where: { sessionId: resolvedSessionId, jid: { in: jids } }
        });

        res.json({ success: true, deletedCount: jids.length });
    } catch (error) {
        console.error('❌ Error deleting chats bulk:', error);
        res.status(500).json({ error: error.message || 'حدث خطأ أثناء حذف المحادثات' });
    }
}

async function deleteChat(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = sessionId && sessionId !== 'all' ? sessionId : null;
        let session = null;
        if (targetSessionId) {
            session = await getSharedPrismaClient().whatsAppSession.findFirst({
                where: { id: targetSessionId, companyId }
            });
        }
        if (!session) {
            session = await getSharedPrismaClient().whatsAppSession.findFirst({
                where: { companyId },
                orderBy: { lastConnectedAt: 'desc' }
            });
        }
        if (!session) {
            return res.status(404).json({ error: 'لا توجد جلسة متاحة' });
        }
        const resolvedSessionId = session.id;

        // Delete from Baileys (Clear chat) — best-effort
        const activeSession = WhatsAppManager.getSession(resolvedSessionId);
        if (activeSession?.status === 'connected') {
            try {
                await activeSession.sock.chatModify({
                    delete: true,
                    lastMessages: [{
                        key: { remoteJid: jid, fromMe: true, id: 'AAA' },
                        messageTimestamp: Math.floor(Date.now() / 1000)
                    }]
                }, jid);
            } catch (baileysError) {
                console.error('⚠️ Error deleting chat from Baileys (continuing with DB delete):', baileysError);
                // Continue with DB deletion even if Baileys fails
            }
        }

        // Delete from DB
        await getSharedPrismaClient().whatsAppMessage.deleteMany({
            where: { sessionId: resolvedSessionId, remoteJid: jid }
        });

        await getSharedPrismaClient().whatsAppContact.deleteMany({
            where: { sessionId: resolvedSessionId, jid }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error deleting chat:', error);
        res.status(500).json({ error: error.message || 'حدث خطأ أثناء حذف المحادثة' });
    }
}

/**
 * نقل بيانات المصادقة من الملفات إلى قاعدة البيانات
 * POST /api/whatsapp/migrate-auth
 */
async function migrateAuthToDatabase(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.body;

        const path = require('path');
        const fs = require('fs').promises;
        const fsSync = require('fs');

        const SESSIONS_DIR = path.join(__dirname, '../data/whatsapp-sessions');

        async function readJsonFile(filePath) {
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                return JSON.parse(content);
            } catch (error) {
                return null;
            }
        }

        async function migrateSession(sessionId) {
            const sessionPath = path.join(SESSIONS_DIR, sessionId);

            if (!fsSync.existsSync(sessionPath)) {
                return { success: false, error: 'Session directory not found' };
            }

            const files = await fs.readdir(sessionPath);
            let authState = { creds: null, keys: {} };

            // creds.json
            const credsPath = path.join(sessionPath, 'creds.json');
            if (fsSync.existsSync(credsPath)) {
                const creds = await readJsonFile(credsPath);
                if (creds) authState.creds = creds;
            }

            // sessions
            const sessionFiles = files.filter(f => f.startsWith('session-') && f.endsWith('.json'));
            if (sessionFiles.length > 0) {
                authState.keys['session'] = {};
                for (const file of sessionFiles) {
                    const data = await readJsonFile(path.join(sessionPath, file));
                    if (data) {
                        const id = file.replace('session-', '').replace('.json', '');
                        authState.keys['session'][id] = data;
                    }
                }
            }

            // pre-keys
            const preKeyFiles = files.filter(f => f.startsWith('pre-key-') && f.endsWith('.json'));
            if (preKeyFiles.length > 0) {
                authState.keys['pre-key'] = {};
                for (const file of preKeyFiles) {
                    const data = await readJsonFile(path.join(sessionPath, file));
                    if (data) {
                        const id = file.replace('pre-key-', '').replace('.json', '');
                        authState.keys['pre-key'][id] = data;
                    }
                }
            }

            // sender-keys
            const senderKeyFiles = files.filter(f => f.startsWith('sender-key-') && f.endsWith('.json'));
            if (senderKeyFiles.length > 0) {
                authState.keys['sender-key'] = {};
                for (const file of senderKeyFiles) {
                    const data = await readJsonFile(path.join(sessionPath, file));
                    if (data) {
                        const id = file.replace('sender-key-', '').replace('.json', '');
                        authState.keys['sender-key'][id] = data;
                    }
                }
            }

            // Save to database
            await getSharedPrismaClient().whatsAppSession.update({
                where: { id: sessionId },
                data: {
                    authState: encryptField(JSON.stringify(authState)),
                    updatedAt: new Date()
                }
            });

            return { success: true };
        }

        if (sessionId) {
            // Migrate single session
            const session = await getSharedPrismaClient().whatsAppSession.findFirst({
                where: { id: sessionId, companyId }
            });

            if (!session) {
                return res.status(404).json({ error: 'الجلسة غير موجودة' });
            }

            const result = await migrateSession(sessionId);
            res.json(result);
        } else {
            // Migrate all sessions
            const sessions = await getSharedPrismaClient().whatsAppSession.findMany({
                where: { companyId },
                select: { id: true, name: true }
            });

            let success = 0;
            let failed = 0;
            const results = [];

            for (const session of sessions) {
                const result = await migrateSession(session.id);
                if (result.success) {
                    success++;
                } else {
                    failed++;
                }
                results.push({ sessionId: session.id, name: session.name, ...result });
            }

            res.json({
                success: true,
                summary: { total: sessions.length, success, failed },
                results
            });
        }
    } catch (error) {
        console.error('❌ Migration error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء نقل البيانات' });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔒 الخصوصية والحظر
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * حظر جهة اتصال
 * POST /api/whatsapp/contacts/block
 */
async function blockContact(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({ where: { id: targetSessionId, companyId } });
        if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });

        await WhatsAppManager.blockContact(targetSessionId, jid);
        
        // Update local DB
        await getSharedPrismaClient().whatsAppContact.updateMany({
            where: { sessionId: targetSessionId, jid },
            data: { isBlocked: true }
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error blocking contact:', error);
        res.status(500).json({ error: error.message || 'حدث خطأ أثناء حظر جهة الاتصال' });
    }
}

/**
 * إلغاء حظر جهة اتصال
 * POST /api/whatsapp/contacts/unblock
 */
async function unblockContact(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({ where: { id: targetSessionId, companyId } });
        if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });

        await WhatsAppManager.unblockContact(targetSessionId, jid);
        
        // Update local DB
        await getSharedPrismaClient().whatsAppContact.updateMany({
            where: { sessionId: targetSessionId, jid },
            data: { isBlocked: false }
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error unblocking contact:', error);
        res.status(500).json({ error: error.message || 'حدث خطأ أثناء إلغاء حظر جهة الاتصال' });
    }
}

/**
 * التحقق من الرقم
 * POST /api/whatsapp/check-number
 */
async function checkNumber(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, number } = req.body;

        if (!sessionId || !number) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        // Resolve virtual session ID and verify ownership
        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);

        const result = await WhatsAppManager.onWhatsApp(targetSessionId, number);
        res.json({ success: true, exists: !!result, jid: result?.jid });
    } catch (error) {
        console.error('❌ Error checking number:', error);
        res.status(500).json({ error: error.message || 'حدث خطأ أثناء التحقق من الرقم' });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 الملف الشخصي
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * الحصول على الملف الشخصي
 * GET /api/whatsapp/profile
 */
async function getProfile(req, res) {
    try {
        const { companyId } = req.user;
        let { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        // Resolve virtual session ID and verify ownership
        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);

        const profile = await WhatsAppManager.getProfile(targetSessionId, companyId);
        res.json({ success: true, profile });
    } catch (error) {
        console.error('❌ Error fetching profile:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب الملف الشخصي' });
    }
}

/**
 * مزامنة الملف الشخصي يدوياً
 * POST /api/whatsapp/profile/sync
 */
async function syncProfile(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({ where: { id: targetSessionId, companyId } });
        if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });

        const profile = await WhatsAppManager.syncProfile(targetSessionId);
        if (!profile) {
            return res.status(400).json({ error: 'تعذر مزامنة الملف الشخصي (قد تكون الجلسة غير متصلة)' });
        }

        res.json({ success: true, profile });
    } catch (error) {
        console.error('❌ Error syncing profile:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء مزامنة الملف الشخصي' });
    }
}

/**
 * تحديث الملف الشخصي
 * POST /api/whatsapp/profile/update
 */
async function updateProfile(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, name, status, picture } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({ where: { id: targetSessionId, companyId } });
        if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });

        if (name) await WhatsAppManager.updateProfileName(targetSessionId, name);
        if (status) await WhatsAppManager.updateProfileStatus(targetSessionId, status);

        if (req.file || picture) {
            const sessionObj = WhatsAppManager.getSession(targetSessionId);
            if (!sessionObj?.sock?.user) {
                return res.status(400).json({ error: 'الجلسة غير متصلة' });
            }
            // Get JID from session user
            const jid = (sessionObj.sock.user.id || sessionObj.sock.user.jid).split(':')[0] + '@s.whatsapp.net';

            if (req.file) {
                const imageBuffer = fs.readFileSync(req.file.path);
                await WhatsAppManager.updateProfilePicture(targetSessionId, jid, imageBuffer);
                // Clean up temp file
                try { fs.unlinkSync(req.file.path); } catch (e) { }
            } else if (picture) {
                await WhatsAppManager.updateProfilePicture(targetSessionId, jid, { url: picture });
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث الملف الشخصي' });
    }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 👥 إدارة المجموعات
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const validateGroupJid = (jid) => typeof jid === 'string' && jid.endsWith('@g.us');

/**
 * إنشاء مجموعة
 * POST /api/whatsapp/groups
 */
async function createGroup(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, subject, participants } = req.body;

        if (!sessionId || !subject || !participants || !Array.isArray(participants)) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const group = await WhatsAppManager.createGroup(targetSessionId, subject, participants);
        res.json({ success: true, group });
    } catch (error) {
        console.error('❌ Error creating group:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إنشاء المجموعة' });
    }
}

/**
 * جلب بيانات مجموعة
 * GET /api/whatsapp/groups/:jid
 */
async function getGroupMetadata(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId } = req.query;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }
        if (!validateGroupJid(jid)) {
            return res.status(400).json({ error: 'معرف المجموعة غير صالح' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const metadata = await WhatsAppManager.getGroupMetadata(targetSessionId, jid);
        res.json({ success: true, metadata });
    } catch (error) {
        console.error('❌ Error fetching group metadata:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب بيانات المجموعة' });
    }
}

/**
 * تحديث اسم المجموعة
 * PUT /api/whatsapp/groups/:jid/subject
 */
async function updateGroupSubject(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId, subject } = req.body;

        if (!sessionId || !jid || !subject) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }
        if (!validateGroupJid(jid)) {
            return res.status(400).json({ error: 'معرف المجموعة غير صالح' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.updateGroupSubject(targetSessionId, jid, subject);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error updating group subject:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث اسم المجموعة' });
    }
}

/**
 * تحديث وصف المجموعة
 * PUT /api/whatsapp/groups/:jid/description
 */
async function updateGroupDescription(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId, description } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }
        if (!validateGroupJid(jid)) {
            return res.status(400).json({ error: 'معرف المجموعة غير صالح' });
        }
        if (typeof description !== 'string') {
            return res.status(400).json({ error: 'الوصف مطلوب' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.updateGroupDescription(targetSessionId, jid, description);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error updating group description:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث وصف المجموعة' });
    }
}

/**
 * تحديث إعدادات المجموعة
 * PUT /api/whatsapp/groups/:jid/settings
 */
async function updateGroupSettings(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId, setting, value } = req.body;

        if (!sessionId || !jid || !setting) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }
        if (!validateGroupJid(jid)) {
            return res.status(400).json({ error: 'معرف المجموعة غير صالح' });
        }

        const baileysSetting =
            setting === 'announce'
                ? (value ? 'announcement' : 'not_announcement')
                : setting === 'restrict'
                    ? (value ? 'locked' : 'unlocked')
                    : setting;

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.updateGroupSettings(targetSessionId, jid, baileysSetting);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error updating group settings:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث إعدادات المجموعة' });
    }
}

/**
 * تحديث مشاركي المجموعة
 * PUT /api/whatsapp/groups/:jid/participants
 */
async function updateGroupParticipants(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId, action, participants } = req.body;

        if (!sessionId || !jid || !action || !participants) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }
        if (!validateGroupJid(jid)) {
            return res.status(400).json({ error: 'معرف المجموعة غير صالح' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.updateGroupParticipants(targetSessionId, jid, participants, action);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error updating group participants:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث مشاركي المجموعة' });
    }
}

/**
 * الخروج من المجموعة
 * POST /api/whatsapp/groups/:jid/leave
 */
async function leaveGroup(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }
        if (!validateGroupJid(jid)) {
            return res.status(400).json({ error: 'معرف المجموعة غير صالح' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.leaveGroup(targetSessionId, jid);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error leaving group:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء الخروج من المجموعة' });
    }
}

/**
 * جلب رابط الدعوة
 * GET /api/whatsapp/groups/:jid/invite-code
 */
async function getGroupInviteCode(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId } = req.query;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }
        if (!validateGroupJid(jid)) {
            return res.status(400).json({ error: 'معرف المجموعة غير صالح' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const code = await WhatsAppManager.getGroupInviteCode(targetSessionId, jid);
        res.json({ success: true, code });
    } catch (error) {
        console.error('❌ Error fetching invite code:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب رابط الدعوة' });
    }
}

/**
 * إلغاء رابط الدعوة
 * POST /api/whatsapp/groups/:jid/revoke-invite
 */
async function revokeGroupInviteCode(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }
        if (!validateGroupJid(jid)) {
            return res.status(400).json({ error: 'معرف المجموعة غير صالح' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const code = await WhatsAppManager.revokeGroupInviteCode(targetSessionId, jid);
        res.json({ success: true, code });
    } catch (error) {
        console.error('❌ Error revoking invite code:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إلغاء رابط الدعوة' });
    }
}

// ==================== Business Profile Controllers ====================

async function getBusinessProfile(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const profile = await WhatsAppManager.getBusinessProfile(targetSessionId);
        res.json({ success: true, profile });
    } catch (error) {
        console.error('❌ Error getting business profile:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب ملف الأعمال' });
    }
}

async function setBusinessProfile(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, profileData } = req.body;

        if (!sessionId || !profileData) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.setBusinessProfile(targetSessionId, profileData);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error setting business profile:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تعيين ملف الأعمال' });
    }
}

async function updateBusinessProfile(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, profileData } = req.body;

        if (!sessionId || !profileData) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.updateBusinessProfile(targetSessionId, profileData);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error updating business profile:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث ملف الأعمال' });
    }
}

async function getBusinessHours(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const hours = await WhatsAppManager.getBusinessHours(targetSessionId);
        res.json({ success: true, hours });
    } catch (error) {
        console.error('❌ Error getting business hours:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب ساعات العمل' });
    }
}

async function setBusinessHours(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, hours } = req.body;

        if (!sessionId || !hours) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.setBusinessHours(targetSessionId, hours);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error setting business hours:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تعيين ساعات العمل' });
    }
}

// ==================== Broadcast Controllers ====================

async function sendBroadcast(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jids, message } = req.body;

        if (!sessionId || !jids || !Array.isArray(jids) || !message) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const results = await WhatsAppManager.sendBroadcast(targetSessionId, jids, message);
        res.json({ success: true, results });
    } catch (error) {
        console.error('❌ Error sending broadcast:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال البث' });
    }
}

async function createBroadcastList(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, name, jids } = req.body;

        if (!sessionId || !name || !jids || !Array.isArray(jids)) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const list = await WhatsAppManager.createBroadcastList(targetSessionId, name, jids);
        res.json({ success: true, list });
    } catch (error) {
        console.error('❌ Error creating broadcast list:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إنشاء قائمة البث' });
    }
}

async function getBroadcastLists(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const lists = await WhatsAppManager.getBroadcastLists(targetSessionId);
        res.json({ success: true, lists });
    } catch (error) {
        console.error('❌ Error getting broadcast lists:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب قوائم البث' });
    }
}

// ==================== Labels Controllers ====================

async function labelChat(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid, labelId } = req.body;

        if (!sessionId || !jid || !labelId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.labelChat(targetSessionId, jid, labelId);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error labeling chat:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إضافة علامة للمحادثة' });
    }
}

async function syncLabels(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'معرف الجلسة مطلوب' });
        }

        // نتحقق من وجود الجلسة مباشرة
        const targetSessionId = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId },
            select: { id: true }
        });
        if (!targetSessionId) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const labels = await WhatsAppManager.syncLabels(targetSessionId.id);
        res.json({ success: true, labels, message: 'تمت المزامنة بنجاح' });
    } catch (error) {
        console.error('❌ Error syncing labels:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء مزامنة التصنيفات', detail: error?.message });
    }
}

async function getLabels(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        // نتحقق من وجود الجلسة مباشرة (من غير ما نطلب أن تكون متصلة)
        // لأن الـ labels متخزنة في الداتابيز وتظهر حتى لو الجلسة فصلت
        const targetSessionId = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId },
            select: { id: true }
        });
        if (!targetSessionId) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const labels = await WhatsAppManager.getLabels(targetSessionId.id);
        res.json({ success: true, labels });
    } catch (error) {
        console.error('❌ Error getting labels:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب العلامات', detail: error?.message });
    }
}

async function createLabel(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, name, color } = req.body;

        if (!sessionId || !name) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const label = await WhatsAppManager.createLabel(targetSessionId, name, color);
        res.json({ success: true, label });
    } catch (error) {
        console.error('❌ Error creating label:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إنشاء علامة' });
    }
}

async function restoreDefaultLabels(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'معرف الجلسة مطلوب' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.restoreDefaultLabels(targetSessionId);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('❌ Error restoring default labels:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء استعادة التصنيفات' });
    }
}

async function deleteLabel(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.body;
        const labelId = req.params.id || req.params.labelId || req.body.labelId;

        if (!sessionId || !labelId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.deleteLabel(targetSessionId, labelId);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error deleting label:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء حذف علامة' });
    }
}

async function addLabelToChat(req, res) {
    try {
        const { companyId } = req.user;
        const { labelId, jid } = req.params;
        const { sessionId } = req.body;

        if (!sessionId || !jid || !labelId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.labelChat(targetSessionId, jid, labelId);
        // 💾 Persist to DB
        try {
            const contact = await getSharedPrismaClient().whatsAppContact.findFirst({
                where: { sessionId: targetSessionId, jid }
            });
            if (contact) {
                const current = (() => { try { return JSON.parse(contact.labels || '[]'); } catch { return []; } })();
                if (!current.includes(labelId)) current.push(labelId);
                await getSharedPrismaClient().whatsAppContact.update({
                    where: { id: contact.id },
                    data: { labels: JSON.stringify(current) }
                });
            }
        } catch (dbErr) { console.error('❌ Error persisting label to DB:', dbErr.message); }
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error adding label to chat:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إضافة علامة للمحادثة' });
    }
}

async function removeLabelFromChat(req, res) {
    try {
        const { companyId } = req.user;
        const { labelId, jid } = req.params;
        const { sessionId } = req.body;

        if (!sessionId || !jid || !labelId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.removeChatLabel(targetSessionId, jid, labelId);
        // 💾 Persist to DB
        try {
            const contact = await getSharedPrismaClient().whatsAppContact.findFirst({
                where: { sessionId: targetSessionId, jid }
            });
            if (contact) {
                const current = (() => { try { return JSON.parse(contact.labels || '[]'); } catch { return []; } })();
                const updated = current.filter(id => id !== labelId);
                await getSharedPrismaClient().whatsAppContact.update({
                    where: { id: contact.id },
                    data: { labels: JSON.stringify(updated) }
                });
            }
        } catch (dbErr) { console.error('❌ Error removing label from DB:', dbErr.message); }
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error removing label from chat:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إزالة العلامة من المحادثة' });
    }
}

async function getLabelContacts(req, res) {
    try {
        const { companyId } = req.user;
        const { labelId } = req.params;
        const { sessionId } = req.query;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 50), 500);
        const search = (req.query.search || '').trim();

        if (!sessionId || !labelId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        // نتحقق من وجود الجلسة مباشرة (الـ labels موجودة حتى لو الجلسة مش متصلة)
        const targetSessionId = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId },
            select: { id: true }
        });
        if (!targetSessionId) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.getLabelContacts(targetSessionId.id, labelId, { page, limit, search });
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('❌ Error getting label contacts:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب عملاء التصنيف' });
    }
}

// ==================== Starred Messages Controllers ====================

async function starMessage(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, key } = req.body;

        if (!sessionId || !key) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.starMessage(targetSessionId, key);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error starring message:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تمييز الرسالة' });
    }
}

async function unstarMessage(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, key } = req.body;

        if (!sessionId || !key) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.unstarMessage(targetSessionId, key);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error unstarring message:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إلغاء تمييز الرسالة' });
    }
}

async function getStarredMessages(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid } = req.query;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const messages = await WhatsAppManager.getStarredMessages(targetSessionId, jid);
        res.json({ success: true, messages });
    } catch (error) {
        console.error('❌ Error getting starred messages:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب الرسائل المميزة' });
    }
}

// ==================== Privacy Controllers ====================

async function fetchBlocklist(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const blocklist = await WhatsAppManager.fetchBlocklist(targetSessionId);
        res.json({ success: true, blocklist });
    } catch (error) {
        console.error('❌ Error fetching blocklist:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة المحظورين' });
    }
}

async function fetchPrivacySettings(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const settings = await WhatsAppManager.fetchPrivacySettings(targetSessionId);
        res.json({ success: true, settings });
    } catch (error) {
        console.error('❌ Error fetching privacy settings:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب إعدادات الخصوصية' });
    }
}

async function setPrivacy(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, settings } = req.body;

        if (!sessionId || !settings) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.setPrivacy(targetSessionId, settings);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error setting privacy:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تعيين إعدادات الخصوصية' });
    }
}

// ==================== Advanced Group Features Controllers ====================

async function groupFetchAllParticipating(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const groups = await WhatsAppManager.groupFetchAllParticipating(targetSessionId);
        res.json({ success: true, groups });
    } catch (error) {
        console.error('❌ Error fetching all groups:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب جميع المجموعات' });
    }
}

async function groupToggleEphemeral(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId, ephemeral, duration } = req.body;

        const ephemeralValue = ephemeral !== undefined ? ephemeral : duration;
        if (!sessionId || !jid || typeof ephemeralValue !== 'number') {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }
        if (!validateGroupJid(jid)) {
            return res.status(400).json({ error: 'معرف المجموعة غير صالح' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.groupToggleEphemeral(targetSessionId, jid, ephemeralValue);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error toggling group ephemeral:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تفعيل/تعطيل الرسائل المؤقتة' });
    }
}

async function groupUpdatePicture(req, res) {
    const filePath = req.file?.path;
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }
        if (!validateGroupJid(jid)) {
            return res.status(400).json({ error: 'معرف المجموعة غير صالح' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'صورة المجموعة مطلوبة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const pictureBuffer = fs.readFileSync(filePath);
        const result = await WhatsAppManager.groupUpdatePicture(targetSessionId, jid, pictureBuffer);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error updating group picture:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث صورة المجموعة' });
    } finally {
        if (filePath) {
            try { fs.unlinkSync(filePath); } catch (e) { /* ignore temp cleanup */ }
        }
    }
}

async function groupInviteAccept(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, inviteCode } = req.body;

        if (!sessionId || !inviteCode) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.groupInviteAccept(targetSessionId, inviteCode);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error accepting group invite:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء قبول دعوة المجموعة' });
    }
}

async function groupInviteReject(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, inviteCode } = req.body;

        if (!sessionId || !inviteCode) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.groupInviteReject(targetSessionId, inviteCode);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error rejecting group invite:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء رفض دعوة المجموعة' });
    }
}

async function groupInviteInfo(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, inviteCode } = req.query;

        if (!sessionId || !inviteCode) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const info = await WhatsAppManager.groupInviteInfo(targetSessionId, inviteCode);
        res.json({ success: true, info });
    } catch (error) {
        console.error('❌ Error getting group invite info:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب معلومات الدعوة' });
    }
}

// ==================== Status Controllers ====================

async function getStatus(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid } = req.query;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const status = await WhatsAppManager.getStatus(targetSessionId, jid);
        res.json({ success: true, status });
    } catch (error) {
        console.error('❌ Error getting status:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب الحالة' });
    }
}

async function setStatus(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, status } = req.body;

        if (!sessionId || !status) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.setStatus(targetSessionId, status);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error setting status:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تعيين الحالة' });
    }
}

// ==================== URL Info Controller ====================

async function getUrlInfo(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, url } = req.query;

        if (!sessionId || !url) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const info = await WhatsAppManager.getUrlInfo(targetSessionId, url);
        res.json({ success: true, info });
    } catch (error) {
        console.error('❌ Error getting URL info:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب معلومات الرابط' });
    }
}

// ==================== Poll & Order Controllers ====================

async function sendPoll(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, pollData } = req.body;

        if (!sessionId || !to || !pollData) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        // Resolve virtual session ID and verify ownership
        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);

        const message = await WhatsAppMessageHandler.sendPoll(targetSessionId, to, pollData);
        res.json({ success: true, message });
    } catch (error) {
        console.error('❌ Error sending poll:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال الاستطلاع' });
    }
}

async function sendOrder(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, orderData } = req.body;

        if (!sessionId || !to || !orderData) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        // Resolve virtual session ID and verify ownership
        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);

        const message = await WhatsAppMessageHandler.sendOrder(targetSessionId, to, orderData);
        res.json({ success: true, message });
    } catch (error) {
        console.error('❌ Error sending order:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال الطلب' });
    }
}

async function sendCatalog(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, catalogData } = req.body;

        if (!sessionId || !to || !catalogData) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        // Resolve virtual session ID and verify ownership
        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);

        const message = await WhatsAppMessageHandler.sendCatalog(targetSessionId, to, catalogData);
        res.json({ success: true, message });
    } catch (error) {
        console.error('❌ Error sending catalog:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال الكتالوج' });
    }
}

async function getCatalog(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        // Resolve virtual session ID and verify ownership
        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);

        const catalog = await WhatsAppMessageHandler.getCatalog(targetSessionId);
        res.json({ success: true, catalog });
    } catch (error) {
        console.error('❌ Error getting catalog:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب الكتالوج' });
    }
}

async function getProducts(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, catalogId } = req.query;

        if (!sessionId || !catalogId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const products = await WhatsAppMessageHandler.getProducts(targetSessionId, catalogId);
        res.json({ success: true, products });
    } catch (error) {
        console.error('❌ Error getting products:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب المنتجات' });
    }
}

async function getCart(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, cartId } = req.query;

        if (!sessionId || !cartId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const cart = await WhatsAppMessageHandler.getCart(targetSessionId, cartId);
        res.json({ success: true, cart });
    } catch (error) {
        console.error('❌ Error getting cart:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب السلة' });
    }
}

// ==================== Template Messages Controllers ====================

async function sendTemplateMessage(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, templateId, parameters } = req.body;

        if (!sessionId || !to || !templateId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const message = await WhatsAppMessageHandler.sendTemplateMessage(targetSessionId, to, templateId, parameters || {}, {
            templateBody: req.body.templateBody,
            senderId: req.user.id
        });
        res.json({ success: true, message });
    } catch (error) {
        console.error('❌ Error sending template message:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال رسالة القالب' });
    }
}

async function getMessageTemplate(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const templates = await WhatsAppMessageHandler.getMessageTemplate(targetSessionId);
        res.json({ success: true, templates });
    } catch (error) {
        console.error('❌ Error getting message templates:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب قوالب الرسائل' });
    }
}

/**
 * الحصول على جلسات WhatsApp للتصحيح (Debug)
 */
async function getDebugSessions(req, res) {
    try {
        console.log('🔍 Debugging WhatsApp sessions...');

        // 1. Get all sessions from DB (ignore companyId for debug to see everything)
        const dbSessions = await getSharedPrismaClient().whatsAppSession.findMany({
            select: {
                id: true,
                name: true,
                status: true,
                companyId: true
            }
        });

        // 2. Get in-memory sessions
        const memorySessions = WhatsAppManager.getAllSessions();

        // 3. Compare
        const sessions = dbSessions.map(session => {
            const memorySession = memorySessions[session.id];
            const inMemory = !!memorySession;

            return {
                id: session.id,
                name: session.name,
                companyId: session.companyId,
                dbStatus: session.status,
                memoryStatus: inMemory ? memorySession.status : 'NOT_IN_MEMORY',
                socketReady: inMemory ? (memorySession.hasSocket ? 'YES' : 'NO') : 'N/A',
                isConsistent: inMemory ? (session.status === memorySession.status) : (session.status === 'DISCONNECTED' || session.status === 'LOGGED_OUT')
            };
        });

        res.json({
            success: true,
            totalDb: dbSessions.length,
            totalMemory: Object.keys(memorySessions).length,
            sessions
        });
    } catch (error) {
        console.error('❌ Error in debug sessions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * تصحيح رد الوكيل الآلي من صفحة الواتساب المباشرة
 * POST /api/whatsapp/messages/:whatsappMessageId/correct
 * يحل مشكلة عدم وجود conversationId في صفحة /whatsapp/chat
 * عن طريق الربط بين whatsAppMessage → unified Message → correctMessage service
 */
async function correctAIMessage(req, res) {
    try {
        const { whatsappMessageId } = req.params;
        const { sessionId, correction } = req.body;
        const { companyId, id: userId, role } = req.user;

        if (!correction || !sessionId) {
            return res.status(400).json({ error: 'correction and sessionId are required' });
        }

        const prisma = getSharedPrismaClient();

        // 1. Find the WhatsApp message by its unique messageId
        const waMessage = await prisma.whatsAppMessage.findUnique({
            where: { messageId: whatsappMessageId }
        });

        if (!waMessage) {
            return res.status(404).json({ error: 'WhatsApp message not found' });
        }

        if (!waMessage.isAIResponse) {
            return res.status(400).json({ error: 'Can only correct AI-generated messages' });
        }

        // 2. Resolve the customer phone from remoteJid
        const phoneNumber = waMessage.remoteJid.split('@')[0].replace(/\D/g, '');
        const customer = await prisma.customer.findFirst({
            where: {
                companyId,
                phone: { contains: phoneNumber.slice(-10) }
            }
        });

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found for this conversation' });
        }

        // 3. Find the unified Conversation for this customer
        const conversation = await prisma.conversation.findFirst({
            where: {
                companyId,
                customerId: customer.id,
                channel: 'whatsapp'
            },
            orderBy: { updatedAt: 'desc' }
        });

        if (!conversation) {
            return res.status(404).json({ error: 'Unified conversation not found' });
        }

        // 4. Find the corresponding unified Message by content + timestamp proximity
        const tsWindow = 30000; // 30 seconds tolerance
        const waTimestamp = new Date(waMessage.timestamp);
        const unifiedMessage = await prisma.message.findFirst({
            where: {
                conversationId: conversation.id,
                isFromCustomer: false,
                content: waMessage.content || '',
                createdAt: {
                    gte: new Date(waTimestamp.getTime() - tsWindow),
                    lte: new Date(waTimestamp.getTime() + tsWindow)
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!unifiedMessage) {
            return res.status(404).json({ error: 'Unified message record not found' });
        }

        // 5. Delegate to the existing correctMessage service
        const whatsappInboxService = require('../services/whatsappInboxService');
        const result = await whatsappInboxService.correctMessage(
            conversation.id,
            unifiedMessage.id,
            companyId,
            userId,
            role,
            correction
        );

        res.status(200).json({ success: true, ...result });
    } catch (error) {
        console.error('[WhatsAppController] correctAIMessage error:', error.message);
        const statusCode = error.message?.includes('locked') ? 403 : 500;
        res.status(statusCode).json({ error: error.message || 'Failed to correct message' });
    }
}

/**
 * حذف كل المحادثات
 * POST /api/whatsapp/chats/delete-all
 */
async function deleteAllChats(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.body;

        // Get all sessions for this company (or a specific one if provided)
        let sessions;
        if (sessionId && sessionId !== 'all') {
            const session = await getSharedPrismaClient().whatsAppSession.findFirst({
                where: { id: sessionId, companyId }
            });
            if (!session) {
                return res.status(404).json({ error: 'الجلسة غير موجودة' });
            }
            sessions = [session];
        } else {
            sessions = await getSharedPrismaClient().whatsAppSession.findMany({
                where: { companyId }
            });
        }

        if (!sessions || sessions.length === 0) {
            return res.status(404).json({ error: 'لا توجد جلسات واتساب لهذه الشركة' });
        }

        let totalContacts = 0;
        let totalMessages = 0;

        for (const session of sessions) {
            // Get all contacts for Baileys cleanup (best-effort)
            const contacts = await getSharedPrismaClient().whatsAppContact.findMany({
                where: { sessionId: session.id },
                select: { jid: true }
            });

            const jids = contacts.map(c => c.jid);

            // Delete from Baileys for each JID (best-effort)
            const activeSession = WhatsAppManager.getSession(session.id);
            if (activeSession?.status === 'connected' && jids.length > 0) {
                const batchSize = 50;
                for (let i = 0; i < jids.length; i += batchSize) {
                    const batch = jids.slice(i, i + batchSize);
                    await Promise.allSettled(batch.map(async (jid) => {
                        try {
                            await activeSession.sock.chatModify({
                                delete: true,
                                lastMessages: [{
                                    key: { remoteJid: jid, fromMe: true, id: 'AAA' },
                                    messageTimestamp: Math.floor(Date.now() / 1000)
                                }]
                            }, jid);
                        } catch (e) {
                            // best-effort
                        }
                    }));
                }
            }

            // Delete messages from DB
            const msgResult = await getSharedPrismaClient().whatsAppMessage.deleteMany({
                where: { sessionId: session.id }
            });

            // Delete contacts from DB
            const contactResult = await getSharedPrismaClient().whatsAppContact.deleteMany({
                where: { sessionId: session.id }
            });

            totalMessages += msgResult.count;
            totalContacts += contactResult.count;
        }

        res.json({
            success: true,
            deletedContacts: totalContacts,
            deletedMessages: totalMessages,
            sessionsCount: sessions.length
        });
    } catch (error) {
        console.error('❌ Error deleting all chats:', error);
        res.status(500).json({ error: error.message || 'حدث خطأ أثناء حذف كل المحادثات' });
    }
}

/**
 * تشغيل جلب صور البروفايل المفقودة لجهات الاتصال في الخلفية.
 * POST /api/whatsapp/profile-pics/refresh
 * اختياري: ?sessionId=... لتحديد جلسة واحدة، غير كده كل جلسات الشركة.
 */
async function refreshProfilePics(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.query;

        const sessionFilter = {
            companyId,
            ...(sessionId ? { id: sessionId } : {})
        };
        const sessions = await getSharedPrismaClient().whatsAppSession.findMany({
            where: sessionFilter,
            select: { id: true }
        });

        if (sessions.length === 0) {
            return res.json({ success: true, started: 0, message: 'لا توجد جلسات' });
        }

        // fire-and-forget في الخلفية — الفرونت بيـ refetch المحادثات كل 30 ثانية
        for (const s of sessions) {
            WhatsAppManager.fetchMissingProfilePics(s.id)
                .catch(err => console.error(`❌ Background profile pics refresh failed for ${s.id}:`, err?.message || err));
        }

        res.json({
            success: true,
            started: sessions.length,
            message: 'جاري تحديث صور البروفايل في الخلفية'
        });
    } catch (error) {
        console.error('❌ Error refreshing profile pics:', error);
        res.status(500).json({ error: error.message || 'حدث خطأ أثناء تحديث صور البروفايل' });
    }
}

module.exports = {
    // Sessions
    createSession,
    createSessionWithPairingCode,
    getSessions,
    getSession,
    updateSession,
    deleteSession,
    connectSession,
    requestHistorySync,
    disconnectSession,

    // Conversations & Messages
    getConversations,
    getMessages,
    refreshProfilePics,
    sendMessage,
    sendMedia,
    markAsRead,
    sendButtons,
    sendList,
    sendProduct,
    sendReaction,

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

    // Contacts
    updateContact,
    linkCustomer,
    reassignContactSession,

    // Quick Replies
    getQuickReplies,
    createQuickReply,
    updateQuickReply,
    deleteQuickReply,
    sendQuickReply,

    // Settings
    getSettings,
    updateSettings,
    getWindowPolicy,
    updateWindowPolicy,
    testSendSMS,

    // Stats
    getStats,

    // Message Management
    editMessage,
    deleteMessage,
    forwardMessage,
    correctAIMessage,

    // Chat Management
    archiveChat,
    pinChat,
    muteChat,
    markChatUnread,
    clearChat,
    deleteChat,
    deleteChatsBulk,
    deleteAllChats,

    // Migration
    migrateAuthToDatabase,

    // Privacy & Profile
    blockContact,
    unblockContact,
    checkNumber,
    updateProfile,
    getProfile,
    syncProfile,

    // Business Profile
    getBusinessProfile,
    setBusinessProfile,
    updateBusinessProfile,
    getBusinessHours,
    setBusinessHours,

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
    addLabelToChat,
    removeLabelFromChat,
    getLabelContacts,
    restoreDefaultLabels,

    // Starred Messages
    starMessage,
    unstarMessage,
    getStarredMessages,

    // Privacy Advanced
    fetchBlocklist,
    fetchPrivacySettings,
    setPrivacy,

    // Advanced Group Features
    groupFetchAllParticipating,
    groupToggleEphemeral,
    groupUpdatePicture,
    groupInviteAccept,
    groupInviteReject,
    groupInviteInfo,

    // Status
    getStatus,
    setStatus,

    // URL Info
    getUrlInfo,

    // Poll & Order
    sendPoll,
    sendOrder,
    sendCatalog,
    getCatalog,
    getProducts,
    getCart,

    // Template Messages
    sendTemplateMessage,
    getMessageTemplate,
    getDebugSessions,

    // Status Updates
    getStatuses,
    postStatus,
    markStatusViewed,

    // Facebook Embedded Sign-Up
    getFacebookConfig,
    facebookConnect,
    facebookEmbeddedConnect,

    // Advanced Baileys Features (Call Shield, Polls, Pin, Interactive)
    updateCallShield,
    getCallShield,
    pinMessage,
    unpinMessage,
    getPinnedMessage,
    sendInteractive
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📸 Status Updates (الحالات)
// ═══════════════════════════════════════════════════════════════════════════════

async function getStatuses(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.params;

        // Resolve virtual session ID and verify ownership
        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const statuses = await getSharedPrismaClient().whatsAppStatus.findMany({
            where: {
                sessionId: targetSessionId,
                expiresAt: { gte: new Date() }
            },
            orderBy: { timestamp: 'desc' },
            include: { whatsAppSession: { select: { name: true } } }
        });

        res.json({ success: true, statuses });
    } catch (error) {
        console.error('❌ Error getting statuses:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
}

async function postStatus(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.params;
        const { content } = req.body;
        const mediaFile = req.file;

        // Resolve virtual session ID and verify ownership
        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const sessionManager = WhatsAppManager.getSession(targetSessionId);
        if (!sessionManager || sessionManager.status !== 'connected') {
            return res.status(400).json({ error: 'الجلسة غير متصلة' });
        }

        let statusData = { type: 'TEXT', content: content || '' };

        if (mediaFile) {
            const media = await WhatsAppMediaHandler.uploadMedia(
                mediaFile.path,
                mediaFile.mimetype,
                mediaFile.originalname
            );
            statusData = {
                type: media.type.toUpperCase(),
                content: content || '',
                mediaUrl: media.url,
                mediaMimeType: media.mimetype
            };
        }

        const jid = 'status@broadcast';
        let result = await sessionManager.sock.sendMessage(jid,
            statusData.type === 'TEXT' ? { text: statusData.content } :
                statusData.type === 'IMAGE' ? { image: { url: statusData.mediaUrl }, caption: statusData.content } :
                    { video: { url: statusData.mediaUrl }, caption: statusData.content }
        );

        const timestamp = new Date();
        const expiresAt = new Date(timestamp.getTime() + 24 * 60 * 60 * 1000);

        const savedStatus = await getSharedPrismaClient().whatsAppStatus.create({
            data: {
                sessionId: targetSessionId,
                remoteJid: session.phoneNumber || 'me',
                messageId: result.key.id,
                type: statusData.type,
                content: statusData.content,
                mediaUrl: statusData.mediaUrl,
                mediaMimeType: statusData.mediaMimeType,
                timestamp,
                expiresAt
            }
        });

        res.json({ success: true, status: savedStatus });
    } catch (error) {
        console.error('❌ Error posting status:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
}

async function markStatusViewed(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, statusId } = req.params;

        // Resolve virtual session ID and verify ownership
        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: targetSessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const status = await getSharedPrismaClient().whatsAppStatus.update({
            where: { id: statusId },
            data: {
                isViewed: true,
                viewedAt: new Date()
            }
        });

        res.json({ success: true, status });
    } catch (error) {
        console.error('❌ Error marking status:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 Facebook Embedded Sign-Up (WhatsApp Cloud Connect)
// ═══════════════════════════════════════════════════════════════════════════════

const facebookAppConfig = require('../config/facebookAppConfig');
const META_GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || 'v26.0';
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

async function getFacebookConfig(req, res) {
    try {
        const config = facebookAppConfig.getFacebookOAuthConfig();
        const origin = req.get('Origin') || req.get('Referer') || '';
        const frontendUrl = origin
            ? new URL(origin).origin
            : require('../config/environment').frontendUrl;
        const redirectUri = new URL('/whatsapp/cloud-connect', `${frontendUrl}/`).toString();

        const appId = config.whatsappAppId || config.appId;
        const configId = config.whatsappConfigId || config.configId;

        const webhookUrl = `${require('../config/environment').backendUrl || 'https://maxp.online'}/api/v1/whatsapp-meta`;
        const defaultWebhookVerifyToken = config.whatsappWebhookVerifyToken || null;

        if (!appId || facebookAppConfig.isPlaceholderFacebookCredential(appId)) {
            return res.status(200).json({
                appId,
                redirectUri,
                configId,
                configured: false,
                webhookUrl,
                defaultWebhookVerifyToken
            });
        }

        res.json({
            appId,
            redirectUri,
            configId,
            configured: true,
            webhookUrl,
            defaultWebhookVerifyToken
        });
    } catch (error) {
        console.error('❌ Error getting Facebook config:', error.message);
        res.status(500).json({ error: 'فشل تحميل إعدادات Facebook' });
    }
}

async function facebookConnect(req, res) {
    try {
        const { code, state, sessionName, redirectUri: clientRedirectUri } = req.body;
        const { companyId } = req.user;

        if (!code) {
            return res.status(400).json({ error: 'Authorization code مطلوب' });
        }

        const config = facebookAppConfig.getFacebookOAuthConfig();
        const appId = config.whatsappAppId || config.appId;
        const appSecret = config.whatsappAppSecret || config.appSecret;

        const redirectUri = clientRedirectUri || (() => {
            const origin = req.get('Origin') || req.get('Referer') || '';
            const frontendUrl = origin
                ? new URL(origin).origin
                : require('../config/environment').frontendUrl;
            return new URL('/whatsapp/cloud-connect', `${frontendUrl}/`).toString();
        })();

        if (!appSecret) {
            return res.status(400).json({ error: 'Facebook App Secret غير مضبوط' });
        }

        // Step 1: Exchange auth code for access token (try without redirect_uri first, fallback if needed)
        const axios = require('axios');
        let tokenResponse;
        try {
            console.log('🔑 [facebookConnect] Attempting token exchange without redirect_uri...');
            tokenResponse = await axios.post(`${META_GRAPH_BASE}/oauth/access_token`, null, {
                params: {
                    client_id: appId,
                    client_secret: appSecret,
                    code
                },
                timeout: 15000
            });
            console.log('✅ [facebookConnect] Token exchange succeeded without redirect_uri');
        } catch (exchangeErr) {
            console.warn('⚠️ [facebookConnect] Exchange without redirect_uri failed:', exchangeErr.response?.data || exchangeErr.message);
            console.log('🔄 [facebookConnect] Retrying token exchange with redirect_uri:', redirectUri);
            
            tokenResponse = await axios.post(`${META_GRAPH_BASE}/oauth/access_token`, null, {
                params: {
                    client_id: appId,
                    redirect_uri: redirectUri,
                    client_secret: appSecret,
                    code
                },
                timeout: 15000
            });
            console.log('✅ [facebookConnect] Token exchange succeeded with redirect_uri');
        }

        const shortLivedToken = tokenResponse.data?.access_token;
        if (!shortLivedToken) {
            return res.status(400).json({ error: 'فشل الحصول على رمز الوصول من Facebook' });
        }

        const longTokenResponse = await axios.get(`${META_GRAPH_BASE}/oauth/access_token`, {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: appId,
                client_secret: appSecret,
                fb_exchange_token: shortLivedToken
            },
            timeout: 15000
        });

        const longLivedToken = longTokenResponse.data?.access_token || shortLivedToken;
        const tokenExpiresAt = longTokenResponse.data?.expires_in
            ? new Date(Date.now() + longTokenResponse.data.expires_in * 1000)
            : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // default 60 days

        // Step 3: Get user's businesses
        const meResponse = await axios.get(`${META_GRAPH_BASE}/me/businesses`, {
            params: { access_token: longLivedToken },
            timeout: 15000
        });

        const businesses = meResponse.data?.data || [];
        let businessId = null;

        if (businesses.length === 0) {
            return res.status(400).json({
                error: 'لا يوجد Business Manager مرتبط بحسابك. الرجاء إنشاء واحد من business.facebook.com أولاً.'
            });
        }

        businessId = businesses[0].id;

        // Step 4: Get or create WABA
        let wabaId = null;
        let phoneNumberId = null;
        let displayPhoneNumber = null;

        try {
            const wabaResponse = await axios.get(`${META_GRAPH_BASE}/${businessId}/client_whatsapp_business_accounts`, {
                params: { access_token: longLivedToken },
                timeout: 15000
            });

            const existingWABAs = wabaResponse.data?.data || [];
            if (existingWABAs.length > 0) {
                wabaId = existingWABAs[0].id;
            }
        } catch (wabaErr) {
            console.warn('⚠️ No existing WABA found, attempting to create one...');
        }

        // Step 5: Get phone numbers from WABA if available
        let metaPhoneNumberId = null;
        let metaDisplayPhone = null;

        if (wabaId) {
            try {
                const phoneResponse = await axios.get(`${META_GRAPH_BASE}/${wabaId}/phone_numbers`, {
                    params: { access_token: longLivedToken },
                    timeout: 15000
                });

                const phoneNumbers = phoneResponse.data?.data || [];
                if (phoneNumbers.length > 0) {
                    const activePhone = phoneNumbers.find(p => p.code_verification_status === 'VERIFIED')
                        || phoneNumbers[0];
                    metaPhoneNumberId = activePhone.id;
                    metaDisplayPhone = activePhone.display_phone_number;
                }
            } catch (phoneErr) {
                console.warn('⚠️ Could not fetch phone numbers:', phoneErr.message);
            }
        }

        // Step 5.5: Subscribe to WABA webhooks
        if (wabaId) {
            try {
                await axios.post(`${META_GRAPH_BASE}/${wabaId}/subscribed_apps`, null, {
                    params: { access_token: longLivedToken },
                    timeout: 15000
                });
            } catch (webhookErr) {
                console.warn('⚠️ Could not subscribe to WABA webhooks:', webhookErr.message);
            }
        }

        // Step 5.75: Disconnect any existing CONNECTED session with the same phone number ID (SaaS safeguard)
        if (metaPhoneNumberId) {
            try {
                await getSharedPrismaClient().whatsAppSession.updateMany({
                    where: { metaPhoneNumberId: metaPhoneNumberId, status: 'CONNECTED' },
                    data: { status: 'DISCONNECTED', updatedAt: new Date() }
                });
            } catch (discErr) {
                console.warn('⚠️ Could not disconnect old session with same phoneNumberId:', discErr.message);
            }
        }

        // Step 6: Create WhatsAppSession in DB
        const session = await getSharedPrismaClient().whatsAppSession.create({
            data: {
                companyId,
                name: sessionName || `WhatsApp Cloud (${metaDisplayPhone || 'Connecting...'})`,
                provider: 'META_CLOUD',
                status: 'CONNECTED',
                metaAccessToken: encryptField(longLivedToken),
                metaTokenExpiresAt: tokenExpiresAt,
                metaWabaId: wabaId,
                metaPhoneNumberId: metaPhoneNumberId,
                metaBusinessId: businessId,
                metaDisplayPhoneNumber: metaDisplayPhone,
                metaApiVersion: META_GRAPH_VERSION,
                metaWebhookVerifyToken: require('crypto').randomBytes(12).toString('hex'),
                aiEnabled: true,
                autoReply: false,
                aiMode: 'suggest',
                loadBalanceWeight: 1,
                updatedAt: new Date()
            }
        });

        res.status(201).json({
            success: true,
            session: {
                id: session.id,
                name: session.name,
                provider: session.provider,
                status: session.status,
                phoneNumber: metaDisplayPhone,
                metaDisplayPhoneNumber: metaDisplayPhone,
                metaPhoneNumberId: metaPhoneNumberId,
                metaWabaId: wabaId,
                createdAt: session.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Facebook Connect Error:', error.response?.data || error.message);
        const errorMsg = error.response?.data?.error?.message
            || error.response?.data?.error?.error_user_msg
            || 'فشل الاتصال بحساب Facebook. الرجاء التحقق من الإعدادات والمحاولة مرة أخرى.';
        res.status(500).json({ error: errorMsg });
    }
}

async function facebookEmbeddedConnect(req, res) {
    try {
        let { wabaId, phoneNumberId, businessId, code, sessionName, redirectUri: clientRedirectUri } = req.body;
        const { companyId } = req.user;

        console.log('📲 [facebookEmbeddedConnect] Request received:', {
            hasCode: !!code,
            hasWabaId: !!wabaId,
            hasPhoneNumberId: !!phoneNumberId,
            hasBusinessId: !!businessId,
            sessionName: sessionName || '(not provided)',
            companyId,
            clientRedirectUri
        });

        if (!code) {
            console.warn('⚠️ [facebookEmbeddedConnect] Missing authorization code');
            return res.status(400).json({
                error: 'Authorization code مطلوب'
            });
        }

        const config = facebookAppConfig.getFacebookOAuthConfig();
        const appId = config.whatsappAppId || config.appId;
        const appSecret = config.whatsappAppSecret || config.appSecret;
        const configId = config.whatsappConfigId || config.configId;

        console.log('🔧 [facebookEmbeddedConnect] Facebook config:', {
            appId: appId ? `${appId.substring(0, 6)}...` : '(empty)',
            hasAppSecret: !!appSecret,
            appSecretLength: appSecret?.length || 0,
            configId: configId || '(none)'
        });

        if (!appSecret) {
            console.error('❌ [facebookEmbeddedConnect] Facebook App Secret is not configured! Please set it via /super-admin/facebook-oauth or FACEBOOK_APP_SECRET env var.');
            return res.status(400).json({ error: 'Facebook App Secret غير مضبوط. الرجاء ضبطه من لوحة تحكم السوبر أدمن.' });
        }

        let redirectUri = clientRedirectUri || (() => {
            const referer = req.get('Referer') || '';
            const origin = req.get('Origin') || '';
            try {
                if (referer) {
                    const parsed = new URL(referer);
                    return parsed.origin + parsed.pathname;
                }
                return origin ? new URL(origin).origin + '/' : '';
            } catch (err) {
                return '';
            }
        })();

        console.log('🔗 [facebookEmbeddedConnect] Using redirect_uri for token exchange:', redirectUri);

        const axios = require('axios');
        let tokenResponse;

        try {
            console.log('🔑 [facebookEmbeddedConnect] Attempting token exchange without redirect_uri...');
            tokenResponse = await axios.post(`${META_GRAPH_BASE}/oauth/access_token`, null, {
                params: {
                    client_id: appId,
                    client_secret: appSecret,
                    code
                },
                timeout: 15000
            });
            console.log('✅ [facebookEmbeddedConnect] Token exchange succeeded without redirect_uri');
        } catch (exchangeErr) {
            console.warn('⚠️ [facebookEmbeddedConnect] Exchange without redirect_uri failed:', exchangeErr.response?.data || exchangeErr.message);
            console.log('🔄 [facebookEmbeddedConnect] Retrying token exchange with redirect_uri:', redirectUri);
            
            tokenResponse = await axios.post(`${META_GRAPH_BASE}/oauth/access_token`, null, {
                params: {
                    client_id: appId,
                    redirect_uri: redirectUri,
                    client_secret: appSecret,
                    code
                },
                timeout: 15000
            });
            console.log('✅ [facebookEmbeddedConnect] Token exchange succeeded with redirect_uri');
        }

        const shortLivedToken = tokenResponse.data?.access_token;
        if (!shortLivedToken) {
            return res.status(400).json({ error: 'فشل الحصول على رمز الوصول من Facebook' });
        }

        const longTokenResponse = await axios.get(`${META_GRAPH_BASE}/oauth/access_token`, {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: appId,
                client_secret: appSecret,
                fb_exchange_token: shortLivedToken
            },
            timeout: 15000
        });

        const longLivedToken = longTokenResponse.data?.access_token || shortLivedToken;
        const tokenExpiresAt = longTokenResponse.data?.expires_in
            ? new Date(Date.now() + longTokenResponse.data.expires_in * 1000)
            : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

        // Step 2.5: Auto-discover missing asset IDs if not passed by frontend
        if (!businessId || !wabaId || !phoneNumberId) {
            console.log('ℹ️ [facebookEmbeddedConnect] Missing asset IDs. Starting auto-discovery...');
            if (!businessId) {
                try {
                    const meResponse = await axios.get(`${META_GRAPH_BASE}/me/businesses`, {
                        params: { access_token: longLivedToken },
                        timeout: 15000
                    });
                    const businesses = meResponse.data?.data || [];
                    if (businesses.length > 0) {
                        businessId = businesses[0].id;
                    }
                } catch (bizErr) {
                    console.warn('⚠️ Could not fetch businesses:', bizErr.message);
                }
            }

            if (businessId && !wabaId) {
                try {
                    const wabaResponse = await axios.get(`${META_GRAPH_BASE}/${businessId}/client_whatsapp_business_accounts`, {
                        params: { access_token: longLivedToken },
                        timeout: 15000
                    });
                    const existingWABAs = wabaResponse.data?.data || [];
                    if (existingWABAs.length > 0) {
                        wabaId = existingWABAs[0].id;
                    }
                } catch (wabaErr) {
                    console.warn('⚠️ Could not fetch WABAs:', wabaErr.message);
                }
            }

            if (wabaId && !phoneNumberId) {
                try {
                    const phoneResponse = await axios.get(`${META_GRAPH_BASE}/${wabaId}/phone_numbers`, {
                        params: { access_token: longLivedToken },
                        timeout: 15000
                    });
                    const phoneNumbers = phoneResponse.data?.data || [];
                    if (phoneNumbers.length > 0) {
                        const activePhone = phoneNumbers.find(p => p.code_verification_status === 'VERIFIED')
                            || phoneNumbers[0];
                        phoneNumberId = activePhone.id;
                    }
                } catch (phoneErr) {
                    console.warn('⚠️ Could not fetch phone numbers:', phoneErr.message);
                }
            }
        }

        if (!wabaId || !phoneNumberId || !businessId) {
            return res.status(400).json({
                error: 'تعذر تحديد حساب الأعمال أو حساب الواتساب السحابي تلقائياً. الرجاء التحقق من الصلاحيات الممنوحة للتطبيق.'
            });
        }

        try {
            await axios.post(`${META_GRAPH_BASE}/${wabaId}/subscribed_apps`, null, {
                params: { access_token: longLivedToken },
                timeout: 15000
            });
        } catch (webhookErr) {
            console.warn('⚠️ Could not subscribe to WABA webhooks:', webhookErr.message);
        }

        const registrationPin = Math.floor(100000 + Math.random() * 900000).toString();

        try {
            await axios.post(`${META_GRAPH_BASE}/${phoneNumberId}/register`, {
                messaging_product: 'whatsapp',
                pin: registrationPin
            }, {
                params: { access_token: longLivedToken },
                timeout: 15000
            });
        } catch (regErr) {
            console.warn('⚠️ Could not register phone number (may already be registered):', regErr.message);
        }

        let displayPhoneNumber = null;
        try {
            const phoneInfo = await axios.get(`${META_GRAPH_BASE}/${phoneNumberId}`, {
                params: {
                    access_token: longLivedToken,
                    fields: 'display_phone_number,verified_name'
                },
                timeout: 15000
            });
            displayPhoneNumber = phoneInfo.data?.display_phone_number || null;
        } catch (phoneErr) {
            console.warn('⚠️ Could not fetch phone number details:', phoneErr.message);
        }

        // Disconnect any existing CONNECTED session with the same phone number ID (SaaS safeguard)
        try {
            await getSharedPrismaClient().whatsAppSession.updateMany({
                where: {
                    metaPhoneNumberId: phoneNumberId,
                    status: 'CONNECTED',
                    id: { not: undefined } // will match all
                },
                data: { status: 'DISCONNECTED', updatedAt: new Date() }
            });
        } catch (discErr) {
            console.warn('⚠️ Could not disconnect old session with same phoneNumberId:', discErr.message);
        }

        const session = await getSharedPrismaClient().whatsAppSession.create({
            data: {
                companyId,
                name: sessionName || `WhatsApp Cloud (${displayPhoneNumber || phoneNumberId})`,
                provider: 'META_CLOUD',
                status: 'CONNECTED',
                metaAccessToken: encryptField(longLivedToken),
                metaTokenExpiresAt: tokenExpiresAt,
                metaWabaId: wabaId,
                metaPhoneNumberId: phoneNumberId,
                metaBusinessId: businessId,
                metaDisplayPhoneNumber: displayPhoneNumber,
                metaApiVersion: META_GRAPH_VERSION,
                metaWebhookVerifyToken: require('crypto').randomBytes(12).toString('hex'),
                metadata: JSON.stringify({ registrationPin }),
                aiEnabled: true,
                autoReply: false,
                aiMode: 'suggest',
                loadBalanceWeight: 1,
                updatedAt: new Date()
            }
        });

        res.status(201).json({
            success: true,
            session: {
                id: session.id,
                name: session.name,
                provider: session.provider,
                status: session.status,
                phoneNumber: displayPhoneNumber,
                metaDisplayPhoneNumber: displayPhoneNumber,
                metaPhoneNumberId: phoneNumberId,
                metaWabaId: wabaId,
                createdAt: session.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Facebook Embedded Connect Error:', error.response?.data || error.message);
        const errorMsg = error.response?.data?.error?.message
            || error.response?.data?.error?.error_user_msg
            || 'فشل ربط واتساب السحابي. الرجاء التحقق من الإعدادات والمحاولة مرة أخرى.';
        res.status(500).json({ error: errorMsg });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🛡️ Advanced Baileys Features: Call Shield, Polls, Pin, Interactive Flow
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * تحديث إعدادات درع المكالمات لجلسة
 * PUT /api/whatsapp/sessions/:id/call-shield
 */
async function updateCallShield(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { enabled, message } = req.body;

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.updateCallShieldSettings(id, { enabled, message });
        res.json({ success: true, callShield: result });
    } catch (error) {
        console.error('❌ Error updating call shield:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث درع المكالمات' });
    }
}

/**
 * جلب إعدادات درع المكالمات لجلسة
 * GET /api/whatsapp/sessions/:id/call-shield
 */
async function getCallShield(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id, companyId },
            select: { id: true, metadata: true }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        let meta = {};
        try {
            meta = session.metadata ? (typeof session.metadata === 'string' ? JSON.parse(session.metadata) : session.metadata) : {};
        } catch {}

        res.json({
            success: true,
            callShield: {
                callShieldEnabled: !!meta.callShieldEnabled,
                callShieldMessage: meta.callShieldMessage || 'عذراً، هذا الرقم مخصص للمراسلات النصية وخدمة العملاء عبر واتساب فقط ولا يستقبل مكالمات هاتفية. برجاء كتابة استفسارك وسيقوم فريق العمل بالرد عليك في أقرب وقت. 🌷'
            }
        });
    } catch (error) {
        console.error('❌ Error getting call shield:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب إعدادات درع المكالمات' });
    }
}

/**
 * تثبيت رسالة
 * POST /api/whatsapp/messages/:messageId/pin
 */
async function pinMessage(req, res) {
    try {
        const { companyId } = req.user;
        const { messageId } = req.params;
        const { sessionId, jid, duration = 86400 } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'sessionId و jid مطلوبين' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const result = await WhatsAppMessageHandler.pinMessage(targetSessionId, jid, messageId, Number(duration));

        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error pinning message:', error);
        res.status(500).json({ error: error.message || 'حدث خطأ أثناء تثبيت الرسالة' });
    }
}

/**
 * إلغاء تثبيت رسالة
 * DELETE /api/whatsapp/messages/:messageId/pin
 */
async function unpinMessage(req, res) {
    try {
        const { companyId } = req.user;
        const { messageId } = req.params;
        const { sessionId, jid } = req.body.sessionId ? req.body : req.query;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'sessionId و jid مطلوبين' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const result = await WhatsAppMessageHandler.unpinMessage(targetSessionId, jid, messageId);

        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error unpinning message:', error);
        res.status(500).json({ error: error.message || 'حدث خطأ أثناء إلغاء تثبيت الرسالة' });
    }
}

/**
 * جلب الرسالة المثبتة الحالية لمحادثة
 * GET /api/whatsapp/conversations/:jid/pinned
 */
async function getPinnedMessage(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId } = req.query;

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const formattedJid = WhatsAppMessageHandler.formatJid(jid);

        const messages = await getSharedPrismaClient().whatsAppMessage.findMany({
            where: {
                sessionId: targetSessionId,
                remoteJid: formattedJid,
                metadata: { contains: '"isPinned":true' }
            },
            orderBy: { updatedAt: 'desc' },
            take: 1
        });

        const pinned = messages.length > 0 ? messages[0] : null;
        if (pinned && pinned.metadata) {
            try {
                const meta = JSON.parse(pinned.metadata);
                if (meta.pinExpiresAt && new Date(meta.pinExpiresAt) < new Date()) {
                    return res.json({ success: true, pinnedMessage: null });
                }
            } catch {}
        }

        res.json({ success: true, pinnedMessage: pinned });
    } catch (error) {
        console.error('❌ Error getting pinned message:', error);
        res.json({ success: true, pinnedMessage: null });
    }
}

/**
 * إرسال رسالة بأزرار تفاعلية حديثة
 * POST /api/whatsapp/messages/send-interactive
 */
async function sendInteractive(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, text, title, footer, buttons = [] } = req.body;

        if (!sessionId || !to || !text) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
        const message = await WhatsAppMessageHandler.sendInteractiveButtons(targetSessionId, to, {
            text,
            title,
            footer,
            buttons
        });

        res.json({ success: true, message });
    } catch (error) {
        console.error('❌ Error sending interactive message:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            error: error.message || 'حدث خطأ أثناء إرسال الرسالة التفاعلية',
            code: error.code || 'WA_INTERACTIVE_SEND_ERROR'
        });
    }
}
