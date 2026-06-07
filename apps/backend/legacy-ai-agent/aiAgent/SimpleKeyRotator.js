/**
 * 🔄 Simple Key Rotator
 * نظام بسيط لتدوير المفاتيح بدون تتبع الكوتا المعقد
 * 
 * المبدأ: جرب المفتاح، إذا فشل علّمه مؤقتاً وانتقل للتالي
 * 
 * ✅ UPDATED: Uses centralized Redis StateManager for persistence across restarts/scaling.
 */

const stateManager = require('./stateManager');

class SimpleKeyRotator {
    constructor() {
        // No local state needed (except maybe simple caches if Redis is slow, but Redis is fast enough)

        // Default cooldown: 30 seconds
        this.DEFAULT_COOLDOWN = 30 * 1000;

        // Permanent failure cooldown: 24 hours (for leaked/invalid keys)
        this.PERMANENT_COOLDOWN = 24 * 60 * 60 * 1000;

        console.log('🔄 [SIMPLE-ROTATOR] Initialized - Persistent Redis mode');
    }

    async getAvailableKeys(keys) {
        if (!keys || keys.length === 0) {
            return [];
        }

        const availableKeys = [];
        for (const key of keys) {
            const isCooling = await stateManager.isKeyCoolingDown(key.id);
            if (!isCooling) {
                availableKeys.push(key);
            }
        }

        return availableKeys;
    }

    /**
     * Get next available key using round-robin (Async)
     * @param {Array} keys - Array of key objects with { id, apiKey, name, ... }
     * @returns {Promise<Object|null>} - Next available key or null if all exhausted
     */
    async getNextKey(keys) {
        if (!keys || keys.length === 0) {
            console.warn('⚠️ [SIMPLE-ROTATOR] No keys provided');
            return null;
        }

        // 1. Filter available keys (Async check)
        const availableKeys = await this.getAvailableKeys(keys);

        if (availableKeys.length === 0) {
            console.warn('⚠️ [SIMPLE-ROTATOR] All keys are temporarily unavailable');
            // Determining "soonest retry" from Redis is hard without scanning keys.
            // Simplified: return null.
            return null;
        }

        // 2. Round-robin: get next key using Redis counter
        // Scope ID based on list of keys? Or just global "simple_rotator"?
        // Use a generic scope ID for simple rotation
        const scopeId = 'simple_rotator_idx';
        const index = await stateManager.getNextRoundRobinIndex(scopeId, availableKeys.length);

        const selectedKey = availableKeys[index];

        console.log(`✅ [SIMPLE-ROTATOR] Selected key: ${selectedKey.name || selectedKey.id} (Index: ${index}, Available: ${availableKeys.length})`);

        return selectedKey;
    }

    /**
     * Preview next available key without advancing round-robin state.
     * @param {Array} keys - Array of key objects with { id, apiKey, name, ... }
     * @returns {Promise<Object|null>} - Next available key or null if all exhausted
     */
    async peekNextKey(keys) {
        if (!keys || keys.length === 0) {
            console.warn('⚠️ [SIMPLE-ROTATOR] No keys provided for preview');
            return null;
        }

        const availableKeys = await this.getAvailableKeys(keys);

        if (availableKeys.length === 0) {
            console.warn('⚠️ [SIMPLE-ROTATOR] All preview keys are temporarily unavailable');
            return null;
        }

        const scopeId = 'simple_rotator_idx';
        const index = await stateManager.peekNextRoundRobinIndex(scopeId, availableKeys.length);
        const selectedKey = availableKeys[index];

        console.log(`👀 [SIMPLE-ROTATOR] Preview key: ${selectedKey.name || selectedKey.id} (Index: ${index}, Available: ${availableKeys.length})`);

        return selectedKey;
    }

    /**
     * Mark a key as temporarily failed (Async)
     * @param {string} keyId - Key ID
     * @param {string} reason - Reason for failure (e.g., '429', '403', 'LEAKED')
     * @param {number} retryAfterMs - Cooldown time in milliseconds
     */
    async markFailed(keyId, reason = 'UNKNOWN', retryAfterMs = null) {
        // Determine cooldown based on reason
        let cooldown = retryAfterMs || this.DEFAULT_COOLDOWN;
        const msgPrefix = `⚠️ [SIMPLE-ROTATOR] Key ${keyId}`;

        if (reason === 'LEAKED' || reason === '403_INVALID' || reason === 'PERMISSION_DENIED') {
            cooldown = this.PERMANENT_COOLDOWN;
            console.error(`🛑 [SIMPLE-ROTATOR] Key ${keyId} marked as PERMANENTLY failed (${reason}) - 24h cooldown`);
        } else if (reason === '429' || reason === 'QUOTA') {
            cooldown = retryAfterMs || this.DEFAULT_COOLDOWN;
            console.warn(`${msgPrefix} marked as temporarily failed (${reason}) - ${cooldown / 1000}s cooldown`);
        } else {
            console.warn(`${msgPrefix} marked as failed (${reason}) - ${cooldown / 1000}s cooldown`);
        }

        await stateManager.tripCircuitBreaker(keyId, cooldown);
    }

    /**
     * Check if a key is available (Async)
     * @param {string} keyId - Key ID
     * @returns {Promise<boolean>}
     */
    async isAvailable(keyId) {
        const isCooling = await stateManager.isKeyCoolingDown(keyId);
        return !isCooling;
    }

    /**
     * Get the soonest retry time among failed keys
     */
    async getSoonestRetry() {
        return null;
    }

    /**
     * Clear all failures (useful on restart or manual reset)
     * NOTE: Redis TTLs will expire naturally; this is a no-op in Redis mode
     */
    clearAll() {
        console.log('🧹 [SIMPLE-ROTATOR] clearAll() called - Redis keys will expire via TTL');
    }

    /**
     * Get status of all tracked failures
     * NOTE: In Redis mode, we cannot enumerate all failed keys without a scan.
     * Returns a safe empty status to avoid crashes.
     * @returns {Object}
     */
    getStatus() {
        // In Redis-based mode, we don't maintain a local failedKeys Map.
        // Return a safe default so callers that use retryAfter don't crash.
        return {
            totalFailed: 0,
            failures: []
        };
    }
}

// Singleton instance
let instance = null;

function getSimpleKeyRotator() {
    if (!instance) {
        instance = new SimpleKeyRotator();
    }
    return instance;
}

module.exports = {
    SimpleKeyRotator,
    getSimpleKeyRotator
};
