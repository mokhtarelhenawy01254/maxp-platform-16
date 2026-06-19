const getRedisConfig = () => {
    // Check for REDIS_URL first
    if (process.env.REDIS_URL && process.env.REDIS_URL !== '') {
        const url = process.env.REDIS_URL;

        // Base options for BullMQ and general stability
        const options = {
            maxRetriesPerRequest: null,
            retryStrategy: (times) => {
                // Progressive backoff, max 10 seconds
                return Math.min(times * 100, 10000);
            }
        };

        // Handle TLS
        if (url.startsWith('rediss://')) {
            options.tls = {
                rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false,
            };
        }

        // Return connection options compatible with ioredis and BullMQ
        return {
            url,
            ...options
        };
    }

    // Fallback to individual host/port settings
    if (process.env.REDIS_HOST && process.env.REDIS_HOST !== 'production-redis-host') {
        const config = {
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            retryStrategy: (times) => {
                return Math.min(times * 50, 2000);
            },
            maxRetriesPerRequest: null,
        };

        if (process.env.REDIS_TLS === 'true' || process.env.REDIS_PORT === '6380') {
            config.tls = {
                rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false,
            };
        }

        return config;
    }

    // No Redis configured
    return null;
};

const redisConfig = getRedisConfig();

module.exports = redisConfig;
