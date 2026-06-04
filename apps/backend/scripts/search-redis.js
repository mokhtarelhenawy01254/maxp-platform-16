const Redis = require('ioredis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function searchRedis() {
    const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
    try {
        console.log('🔍 Searching Redis for patterns containing "h2m" or "maxpi"...');
        const keys = await redis.keys('*');
        console.log(`Found ${keys.length} keys in Redis`);

        for (const key of keys) {
            if (key.toLowerCase().includes('h2m') || key.toLowerCase().includes('maxpi')) {
                console.log('✅ Found matching key:', key);
                const type = await redis.type(key);
                console.log('   Type:', type);
                if (type === 'string') {
                    const val = await redis.get(key);
                    console.log('   Value:', val);
                }
            }
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        redis.disconnect();
    }
}

searchRedis();
