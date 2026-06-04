const Redis = require('ioredis');
const redisConfig = require('../config/redis');

class RedisCacheService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.connectionRetries = 0;
        this.MAX_RETRIES = 3;
        this.localCache = new Map(); // Local fallback cache

        this._initializeClient();
    }

    _initializeClient() {
        try {
            // Skip Redis initialization if configuration is not available
            if (!redisConfig) {
                console.log('⚠️ [REDIS] Disabled - Configuration not found. Using local memory cache.');
                this.client = null;
                this.isConnected = false;
                return;
            }

            this.client = new Redis(redisConfig);

            this.client.on('connect', () => {
                console.log('✅ [REDIS] Connected successfully');
                this.isConnected = true;
                this.connectionRetries = 0;
            });

            this.client.on('error', (err) => {
                console.error('❌ [REDIS] Connection Error:', err.message);
                this.isConnected = false;
            });

        } catch (error) {
            console.error('❌ [REDIS] Initialization Failed:', error);
        }
    }

    /**
     * Get value from cache (Checks local cache if Redis is down)
     * @param {string} key 
     * @returns {Promise<any|null>}
     */
    async get(key) {
        // 1. Try Redis first
        if (this.isConnected && this.client) {
            try {
                const value = await this.client.get(key);
                if (value) {
                    try {
                        return JSON.parse(value);
                    } catch (e) {
                        return value;
                    }
                }
            } catch (error) {
                console.error(`❌ [REDIS] Get Error (${key}):`, error.message);
            }
        }

        // 2. Fallback to local cache
        const localValue = this.localCache.get(key);
        if (localValue && localValue.expiry > Date.now()) {
            return localValue.data;
        } else if (localValue) {
            this.localCache.delete(key);
        }

        return null;
    }

    /**
     * Set value in cache (Sets both Redis and local)
     * @param {string} key 
     * @param {any} value 
     * @param {number} ttlSeconds 
     */
    async set(key, value, ttlSeconds = 300) {
        // Update local cache
        this.localCache.set(key, {
            data: value,
            expiry: Date.now() + (ttlSeconds * 1000)
        });

        // Update Redis
        if (this.isConnected && this.client) {
            try {
                const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                if (ttlSeconds) {
                    await this.client.set(key, stringValue, 'EX', ttlSeconds);
                } else {
                    await this.client.set(key, stringValue);
                }
                return true;
            } catch (error) {
                console.error(`❌ [REDIS] Set Error (${key}):`, error.message);
                return false;
            }
        }

        return true;
    }

    /**
     * Delete value from cache
     * @param {string} key 
     */
    async del(key) {
        this.localCache.delete(key);
        if (this.isConnected && this.client) {
            try {
                await this.client.del(key);
                return true;
            } catch (error) {
                console.error(`❌ [REDIS] Del Error (${key}):`, error.message);
                return false;
            }
        }
        return true;
    }

    /**
     * Clear all cache (Use carefully)
     */
    async flush() {
        if (!this.isConnected || !this.client) return false;
        try {
            await this.client.flushdb();
            console.warn('⚠️ [REDIS] Flushed all keys');
            return true;
        } catch (error) {
            console.error('❌ [REDIS] Flush Error:', error.message);
            return false;
        }
    }
}

// Singleton instance
const redisCacheService = new RedisCacheService();
module.exports = redisCacheService;
