/**
 * 📱 Database Auth State Adapter for Baileys
 * تخزين بيانات المصادقة في قاعدة البيانات بدلاً من ملفات JSON
 * 
 * هذا يحل مشكلة كثرة الملفات ويحسن الأداء
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
// // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues // ❌ Removed to prevent early loading issues
const { isPermissionError, getPermissionErrorMessage } = require('../../utils/dbPermissionHelper');
const hardening = require('./hardening/whatsappHardening');

// Dynamic import for Baileys
let initAuthCreds, BufferJSON;
const initBaileysAuth = async () => {
  const baileys = await import('@whiskeysockets/baileys');
  initAuthCreds = baileys.initAuthCreds;
  BufferJSON = baileys.BufferJSON;
};

// Cache for auth state with max size and TTL to prevent unbounded growth
const authStateCache = new Map();
const AUTH_CACHE_MAX_SIZE = 50; // Max 50 sessions cached
const AUTH_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL

function getCachedAuthState(sessionId) {
    const entry = authStateCache.get(sessionId);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > AUTH_CACHE_TTL_MS) {
        authStateCache.delete(sessionId);
        return null;
    }
    return entry.data;
}

function setCachedAuthState(sessionId, data) {
    // Evict oldest if over max size
    if (authStateCache.size >= AUTH_CACHE_MAX_SIZE) {
        const firstKey = authStateCache.keys().next().value;
        authStateCache.delete(firstKey);
    }
    authStateCache.set(sessionId, {
        data,
        timestamp: Date.now()
    });
}

// Debounce timer للحفظ لتقليل استعلامات قاعدة البيانات
const saveTimers = new Map();
const SAVE_DEBOUNCE_MS = 1000; // حفظ بعد ثانية واحدة من آخر تحديث
const SAVE_IMMEDIATE_DEBOUNCE_MS = 50; // debounce قصير للحالات الفورية

// 🔐 Auth Logger
const AUTH_LOG = {
    info: (sessionId, msg, data) => console.log(`🔐 [AUTH:${sessionId ? sessionId.substring(0,8) : '?'}] ${msg}`, data || ''),
    ok: (sessionId, msg, data) => console.log(`✅ [AUTH:${sessionId ? sessionId.substring(0,8) : '?'}] ${msg}`, data || ''),
    warn: (sessionId, msg, data) => console.warn(`⚠️ [AUTH:${sessionId ? sessionId.substring(0,8) : '?'}] ${msg}`, data || ''),
    error: (sessionId, msg, data) => console.error(`❌ [AUTH:${sessionId ? sessionId.substring(0,8) : '?'}] ${msg}`, data || ''),
};

function applyKeyUpdates(keysData, data) {
    for (const category in data) {
        if (!keysData[category]) {
            keysData[category] = {};
        }

        for (const keyId in data[category]) {
            const normalizedKeyId = String(keyId);
            const value = data[category][keyId];

            if (value == null) {
                delete keysData[category][normalizedKeyId];
            } else {
                keysData[category][normalizedKeyId] = value;
            }
        }

        if (Object.keys(keysData[category]).length === 0) {
            delete keysData[category];
        }
    }

    return keysData;
}

async function clearDatabaseAuthState(sessionId) {
    if (saveTimers.has(sessionId)) {
        clearTimeout(saveTimers.get(sessionId));
        saveTimers.delete(sessionId);
    }

    authStateCache.delete(sessionId);

    // ponytail: backup before destructive clear
    try {
        const session = await getSharedPrismaClient().whatsAppSession.findUnique({
            where: { id: sessionId },
            select: { authState: true }
        });
        if (session?.authState) {
            const fs = require('fs');
            const path = require('path');
            const backupDir = path.join(process.cwd(), 'data', 'whatsapp-sessions', '_backups');
            fs.mkdirSync(backupDir, { recursive: true });
            fs.writeFileSync(
                path.join(backupDir, `${sessionId}_${Date.now()}.json`),
                session.authState,
                'utf-8'
            );
        }
    } catch (backupErr) {
        // backup failure is non-critical
    }

    AUTH_LOG.warn(sessionId, `Clearing auth state from database`);

    await getSharedPrismaClient().whatsAppSession.update({
        where: { id: sessionId },
        data: {
            authState: null,
            updatedAt: new Date()
        }
    });

    AUTH_LOG.ok(sessionId, `Auth state cleared`);
}

/**
 * Validate that the auth state has valid creds structure
 */
function isValidAuthState(authData) {
    if (!authData) return false;
    if (!authData.creds) return false;
    
    // We should NOT require creds.me or creds.registered to be present to consider the auth state valid.
    // During the pairing phase (QR_PENDING), these are not set yet, but the keys are initialized.
    // Discarding them causes connection failures and WhatsApp bans on retry loops.
    // Instead, we verify that the basic noiseKey or signedIdentityKey is generated.
    if (!authData.creds.noiseKey && !authData.creds.signedIdentityKey) {
        return false;
    }
    return true;
}

/**
 * استخدام قاعدة البيانات لتخزين حالة المصادقة
 * @param {string} sessionId - معرف الجلسة
 * @returns {Promise<{state: object, saveCreds: function}>}
 */
async function useDatabaseAuthState(sessionId) {
    // Initialize Baileys if not already done
    if (!initAuthCreds) {
        await initBaileysAuth();
    }

    // تحميل البيانات من قاعدة البيانات
    let authData = await loadAuthState(sessionId);

    // Validate auth state - if corrupted, start fresh
    const hasValidAuth = isValidAuthState(authData);
    if (!hasValidAuth && authData?.creds) {
        AUTH_LOG.warn(sessionId, `Auth state present but invalid/corrupted, starting fresh`, {
            hasCreds: !!authData.creds,
            hasMe: !!authData.creds?.me,
            isRegistered: !!authData.creds?.registered,
            hasKeys: !!authData.keys && Object.keys(authData.keys).length > 0
        });
        authData = { creds: null, keys: {} };
    }

    // تهيئة الحالة
    let state = {
        creds: authData.creds || initAuthCreds(),
        keys: {} // سيتم استبداله بالـ interface لاحقاً
    };

    // تخزين بيانات المفاتيح في متغير منفصل
    // ⚠️ MUST use JSON clone with BufferJSON — structuredClone converts Buffer→Uint8Array which breaks Baileys crypto
    let keysData = authData.keys ? JSON.parse(JSON.stringify(authData.keys, BufferJSON.replacer), BufferJSON.reviver) : {};

    if (hasValidAuth) {
        AUTH_LOG.ok(sessionId, `Auth state loaded with valid credentials`, {
            registered: !!state.creds?.registered,
            hasMe: !!state.creds?.me,
            keyTypes: Object.keys(keysData || {})
        });
    } else {
        AUTH_LOG.info(sessionId, `Starting with fresh auth state (no saved credentials)`);
    }

    // دالة تحميل الحالة من قاعدة البيانات
    async function loadAuthState(sessionId) {
        // التحقق من الـ cache أولاً
        const cached = getCachedAuthState(sessionId);
        if (cached) return cached;

        const session = await getSharedPrismaClient().whatsAppSession.findUnique({
            where: { id: sessionId },
            select: { authState: true }
        });

        let authData = { creds: null, keys: {} };

        if (session?.authState) {
            try {
                // استخدام BufferJSON.reviver لاستعادة Buffers
                if (!BufferJSON) {
                    await initBaileysAuth();
                }
                authData = JSON.parse(session.authState, BufferJSON.reviver);
                AUTH_LOG.info(sessionId, `Auth state loaded from DB`, {
                    size: session.authState.length,
                    hasCreds: !!authData.creds,
                    hasKeys: !!authData.keys
                });
            } catch (error) {
                AUTH_LOG.error(sessionId, `Error parsing auth state: ${error.message}. Starting fresh.`);
                // Return fresh auth state on parse error
                authData = { creds: null, keys: {} };
            }
        } else {
            AUTH_LOG.info(sessionId, `No auth state found in database, starting fresh`);
        }

        // Only cache if we have valid non-empty state
        if (authData.creds || Object.keys(authData.keys || {}).length > 0) {
            setCachedAuthState(sessionId, authData);
        }
        return authData;
    }

    // دالة الحفظ الفعلية
    const doSave = async () => {
        try {
            const currentCreds = JSON.parse(JSON.stringify(state.creds, BufferJSON.replacer), BufferJSON.reviver);
            const currentKeys = JSON.parse(JSON.stringify(keysData, BufferJSON.replacer), BufferJSON.reviver);
            hardening.pruneAuthKeys(currentKeys);

            const dataToSave = { creds: currentCreds, keys: currentKeys };
            const serialized = hardening.serializeAndCap(dataToSave, { replacer: BufferJSON.replacer });

            await getSharedPrismaClient().whatsAppSession.update({
                where: { id: sessionId },
                data: { authState: serialized, updatedAt: new Date() }
            });

            setCachedAuthState(sessionId, dataToSave);
            AUTH_LOG.ok(sessionId, `Auth state saved (${serialized.length} bytes, keys cats: ${Object.keys(currentKeys).length})`);
        } catch (error) {
            if (isPermissionError(error)) {
                if (process.env.NODE_ENV === 'development') {
                    AUTH_LOG.warn(sessionId, `Permission error saving auth state: ${getPermissionErrorMessage(error)}`);
                }
            } else {
                AUTH_LOG.error(sessionId, `Error saving auth state:`, error.message);
            }
        }
    };

    // دالة حفظ الحالة في قاعدة البيانات (مع debouncing محسّن)
    async function saveAuthState(immediate = false) {
        if (saveTimers.has(sessionId)) {
            clearTimeout(saveTimers.get(sessionId));
            saveTimers.delete(sessionId);
        }

        if (immediate) {
            const timer = setTimeout(async () => {
                saveTimers.delete(sessionId);
                await doSave();
            }, SAVE_IMMEDIATE_DEBOUNCE_MS);
            saveTimers.set(sessionId, timer);
        } else {
            const timer = setTimeout(doSave, SAVE_DEBOUNCE_MS);
            saveTimers.set(sessionId, timer);
        }
    }

    // إنشاء key management object متوافق مع Baileys
    const keys = {
        get: async (type, ids) => {
            // يمكننا إعادة التحميل هنا إذا أردنا التأكد من التزامن عبر العمليات
            // ولكن للتبسيط سنعتمد على الذاكرة المحلية + التحديثات

            if (!keysData[type]) {
                return {};
            }

            const result = {};
            for (const id of ids) {
                const keyId = String(id);
                if (keysData[type][keyId]) {
                    result[keyId] = keysData[type][keyId];
                }
            }
            return result;
        },
        set: async (data) => {
            // data format: { 'session': { 'id1': {...}, 'id2': {...} }, 'pre-key': {...} }
            applyKeyUpdates(keysData, data);

            // حفظ في قاعدة البيانات
            await saveAuthState();
        }
    };

    // ربط keys object بالحالة
    state.keys = keys;

    // دالة حفظ بيانات المصادقة (فوري - بدون debounce)
    let pendingSave = false;
    const saveCreds = async () => {
        if (pendingSave) return;
        pendingSave = true;
        try {
            await saveAuthState(true);
        } finally {
            pendingSave = false;
        }
    };

    saveCreds.flush = async () => {
        if (saveTimers.has(sessionId)) {
            clearTimeout(saveTimers.get(sessionId));
            saveTimers.delete(sessionId);
        }
        await doSave();
    };

    return {
        state,
        saveCreds
    };
}

module.exports = {
    useDatabaseAuthState,
    clearDatabaseAuthState,
    __testing: {
        applyKeyUpdates,
        hardening
    }
};









