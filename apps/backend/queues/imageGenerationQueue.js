const { Queue } = require('bullmq');
const redisConfig = require('../config/redis');

/**
 * طابور توليد الصور
 * 
 * هذا الطابور مسؤول عن استلام طلبات التوليد ومعالجتها
 * بشكل غير متزامن لتخفيف الضغط على السيرفر.
 */

// إنشاء الطابور
const imageGenerationQueue = redisConfig ? new Queue('image-generation', {
    connection: redisConfig
}) : null;

// التعامل مع أخطاء الطابور
if (imageGenerationQueue) {
    imageGenerationQueue.on('error', (err) => {
        console.error('❌ [QUEUE-ERROR] Image Generation Queue Error:', err);
    });
}

module.exports = imageGenerationQueue;
