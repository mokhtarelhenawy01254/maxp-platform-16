/**
 * 🛡️ WhatsApp Baileys Hardening Helpers
 *
 * Helpers used by DatabaseAuthState and WhatsAppManager to harden
 * the auth state lifecycle against the most common Baileys failure modes:
 *
 * - structuredCloneSafe: deep clone that handles Buffers, TypedArrays,
 *   Maps, Sets, and circular refs via the structuredClone algorithm
 *   where available, with a safe JSON fallback otherwise.
 * - pruneAuthKeys: caps per-category key count and removes entries
 *   missing required Baileys fields so the authState blob does not
 *   grow unbounded over time.
 * - serializeAndCap: throws AuthStateTooLargeError when the serialized
 *   payload exceeds a configured byte ceiling, preventing the DB
 *   from receiving 100MB blobs that block Prisma updates.
 * - getAuthBackupDir: deterministic location for auth-state backups
 *   taken before destructive clears.
 */

const path = require('path');

const DEFAULT_AUTH_KEY_MAX_AGE_DAYS = 30;
const DEFAULT_AUTH_KEY_MAX_PER_CATEGORY = 200;
const DEFAULT_MAX_AUTH_STATE_BYTES = 4 * 1024 * 1024; // 4 MB
const DEFAULT_BACKUP_ROOT = path.join(process.cwd(), 'data', 'whatsapp-sessions', '_backups');

class AuthStateTooLargeError extends Error {
    constructor(bytes, maxBytes) {
        super(`Auth state payload ${bytes} bytes exceeds max ${maxBytes} bytes`);
        this.name = 'AuthStateTooLargeError';
        this.bytes = bytes;
        this.maxBytes = maxBytes;
    }
}

/**
 * Read a positive integer env var with a default fallback.
 * Returns the default when the env var is missing, NaN, or <= 0.
 */
function readPositiveIntEnv(name, defaultValue) {
    const raw = process.env[name];
    if (raw === undefined || raw === null || raw === '') return defaultValue;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

function getAuthKeyMaxAgeMs() {
    return readPositiveIntEnv('AUTH_KEY_MAX_AGE_DAYS', DEFAULT_AUTH_KEY_MAX_AGE_DAYS) * 24 * 60 * 60 * 1000;
}

function getAuthKeyMaxPerCategory() {
    return readPositiveIntEnv('AUTH_KEY_MAX_PER_CATEGORY', DEFAULT_AUTH_KEY_MAX_PER_CATEGORY);
}

function getMaxAuthStateBytes() {
    return readPositiveIntEnv('MAX_AUTH_STATE_BYTES', DEFAULT_MAX_AUTH_STATE_BYTES);
}

function getAuthBackupDir() {
    const fromEnv = process.env.WHATSAPP_AUTH_BACKUP_DIR;
    return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_BACKUP_ROOT;
}

/**
 * Deep clone that prefers the native structuredClone (handles Buffer,
 * Map, Set, circular refs) and falls back to JSON when not available.
 * Returns the input untouched if it is null or undefined.
 */
function structuredCloneSafe(value) {
    if (value === null || value === undefined) return value;
    if (typeof structuredClone === 'function') {
        try {
            return structuredClone(value);
        } catch {
            // fall through to JSON clone
        }
    }
    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return value;
    }
}

/**
 * Extract a per-entry timestamp from a Baileys key entry. The fields
 * we consult follow the shapes Baileys itself uses across versions.
 */
function getKeyEntryTimestamp(entry) {
    if (!entry || typeof entry !== 'object') return 0;
    const candidates = [
        entry.creationTimestamp,
        entry.timestamp,
        entry.createdAt,
        entry.updatedAt
    ];
    for (const c of candidates) {
        if (typeof c === 'number' && Number.isFinite(c) && c > 0) return c;
        if (typeof c === 'string') {
            const parsed = Date.parse(c);
            if (Number.isFinite(parsed) && parsed > 0) return parsed;
        }
        if (c && typeof c === 'object' && typeof c.toNumber === 'function') {
            try {
                const n = c.toNumber();
                if (Number.isFinite(n) && n > 0) return n;
            } catch {
                // ignore
            }
        }
    }
    return 0;
}

/**
 * Cap and prune the keys object in-place. Returns the same reference
 * for chaining. Counts entries by stringified key id.
 *
 * - Removes entries with falsy or non-object values.
 * - Removes entries older than maxAgeMs when a timestamp is available.
 * - Keeps at most maxPerCategory entries per category by recency.
 */
function pruneAuthKeys(keysData, options = {}) {
    if (!keysData || typeof keysData !== 'object') return keysData;
    const maxAgeMs = options.maxAgeMs ?? getAuthKeyMaxAgeMs();
    const maxPerCategory = options.maxPerCategory ?? getAuthKeyMaxPerCategory();
    const cutoff = Date.now() - maxAgeMs;

    for (const category of Object.keys(keysData)) {
        const bucket = keysData[category];
        if (!bucket || typeof bucket !== 'object') {
            delete keysData[category];
            continue;
        }

        const cleaned = {};
        const entries = [];
        for (const id of Object.keys(bucket)) {
            const entry = bucket[id];
            if (!entry || typeof entry !== 'object') continue;
            entries.push({ id, ts: getKeyEntryTimestamp(entry) });
            cleaned[id] = entry;
        }

        if (entries.length === 0) {
            delete keysData[category];
            continue;
        }

        let pruned = cleaned;
        if (maxAgeMs > 0) {
            const aged = {};
            for (const { id, ts } of entries) {
                if (ts > 0 && ts < cutoff) continue;
                aged[id] = cleaned[id];
            }
            pruned = aged;
            if (Object.keys(pruned).length === 0) {
                delete keysData[category];
                continue;
            }
        }

        if (maxPerCategory > 0 && Object.keys(pruned).length > maxPerCategory) {
            const sorted = Object.keys(pruned)
                .map((id) => ({ id, ts: getKeyEntryTimestamp(pruned[id]) }))
                .sort((a, b) => b.ts - a.ts);
            const trimmed = {};
            for (let i = 0; i < maxPerCategory; i++) {
                trimmed[sorted[i].id] = pruned[sorted[i].id];
            }
            pruned = trimmed;
        }

        keysData[category] = pruned;
    }

    return keysData;
}

/**
 * Serialize the auth payload and enforce a byte ceiling. Throws
 * AuthStateTooLargeError if the result exceeds the configured limit.
 */
function serializeAndCap(dataToSave, options = {}) {
    const maxBytes = options.maxBytes ?? getMaxAuthStateBytes();
    const replacer = options.replacer;
    const serialized = JSON.stringify(dataToSave, replacer);
    if (typeof serialized === 'string' && serialized.length > maxBytes) {
        throw new AuthStateTooLargeError(serialized.length, maxBytes);
    }
    return serialized;
}

module.exports = {
    AuthStateTooLargeError,
    structuredCloneSafe,
    pruneAuthKeys,
    serializeAndCap,
    getAuthKeyMaxAgeMs,
    getAuthKeyMaxPerCategory,
    getMaxAuthStateBytes,
    getAuthBackupDir,
    DEFAULT_AUTH_KEY_MAX_AGE_DAYS,
    DEFAULT_AUTH_KEY_MAX_PER_CATEGORY,
    DEFAULT_MAX_AUTH_STATE_BYTES,
    DEFAULT_BACKUP_ROOT
};
