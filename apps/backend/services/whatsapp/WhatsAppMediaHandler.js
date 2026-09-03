/**
 * 🖼️ WhatsApp Media Handler Service
 * معالجة الوسائط (صور، فيديو، صوت، ملفات)
 * 
 * المميزات:
 * - تحميل الوسائط من WhatsApp
 * - رفع الوسائط للإرسال
 * - ضغط الصور والفيديو
 * - التحقق من حجم الملفات
 */

let downloadMediaMessage;
if (process.env.NODE_ENV !== 'test') {
    try {
        ({ downloadMediaMessage } = require('@whiskeysockets/baileys'));
    } catch (error) {
        console.warn('⚠️ Baileys not available - media download disabled');
        downloadMediaMessage = null;
    }
} else {
    downloadMediaMessage = null;
}
const fs = require('fs').promises;
const path = require('path');
const { execFile } = require('child_process');
// Optional sharp for image processing
let sharp;
try {
    sharp = require('sharp');
} catch (error) {
    console.warn('⚠️ Sharp not available - image compression disabled');
    sharp = null;
}
const { getSharedPrismaClient } = require('../sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const WhatsAppManager = require('./WhatsAppManager');
const { normalizeImageForWhatsApp } = require('../../utils/whatsAppImageCompat');

// مسار حفظ الوسائط
const MEDIA_DIR = path.join(__dirname, '../../uploads/whatsapp');

// حدود حجم الملفات (بالبايت)
const SIZE_LIMITS = {
    image: 16 * 1024 * 1024,      // 16MB
    video: 64 * 1024 * 1024,      // 64MB
    audio: 16 * 1024 * 1024,      // 16MB
    document: 100 * 1024 * 1024   // 100MB
};

// أنواع الملفات المدعومة
const SUPPORTED_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'],
    video: [
        'video/mp4', 'video/3gpp', 'video/quicktime', 'video/webm',
        'video/x-matroska', 'video/avi', 'video/x-msvideo', 'video/msvideo',
        'video/x-ms-wmv', 'video/x-flv', 'video/mpeg', 'video/x-m4v', 'video/ogg'
    ],
    audio: ['audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/webm', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/x-pn-wav', 'audio/x-m4a', 'audio/aac', 'audio/x-aac'],
    document: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip',
        'application/x-zip-compressed',
        'application/rar',
        'application/x-rar-compressed',
        'application/octet-stream',
        'text/plain'
    ]
};

/**
 * تهيئة مجلد الوسائط
 */
async function initMediaDirectory() {
    try {
        await fs.mkdir(MEDIA_DIR, { recursive: true });
        await fs.mkdir(path.join(MEDIA_DIR, 'images'), { recursive: true });
        await fs.mkdir(path.join(MEDIA_DIR, 'videos'), { recursive: true });
        await fs.mkdir(path.join(MEDIA_DIR, 'audio'), { recursive: true });
        await fs.mkdir(path.join(MEDIA_DIR, 'documents'), { recursive: true });
        await fs.mkdir(path.join(MEDIA_DIR, 'temp'), { recursive: true });
        console.log('📁 WhatsApp media directory initialized');
    } catch (error) {
        console.error('❌ Error creating media directory:', error);
    }
}

/**
 * تحويل audio/webm إلى audio/ogg (Opus) ليتوافق مع Meta Cloud API
 * @param {Buffer} inputBuffer - buffer webm
 * @returns {Promise<Buffer>} buffer ogg
 */
async function convertWebmToOgg(inputBuffer, sourceMime) {
    if (!inputBuffer || inputBuffer.length < 500) {
        throw new Error('الملف الصوتي فارغ أو تالف (صغير جداً)');
    }

    const tempDir = path.join(MEDIA_DIR, 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    const ts = Date.now();
    const extMap = { 'audio/webm': 'webm', 'video/webm': 'webm', 'audio/wav': 'wav', 'audio/wave': 'wav', 'audio/x-wav': 'wav', 'audio/mp3': 'mp3', 'audio/mpeg': 'mp3', 'audio/x-m4a': 'm4a', 'audio/3gpp': '3gp' };
    const inExt = extMap[sourceMime] || 'webm';
    const inputPath = path.join(tempDir, `convert_in_${ts}.${inExt}`);
    const outputPath = path.join(tempDir, `convert_out_${ts}.ogg`);

    await fs.writeFile(inputPath, inputBuffer);

    try {
        await new Promise((resolve, reject) => {
            execFile('ffmpeg', [
                '-fflags', '+genpts',
                '-i', inputPath,
                '-c:a', 'libopus',
                '-b:a', '16k',
                '-ac', '1',
                '-ar', '16000',
                '-y',
                outputPath
            ], { timeout: 30000 }, async (error) => {
                await fs.unlink(inputPath).catch(() => {});
                if (error) {
                    await fs.unlink(outputPath).catch(() => {});
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        const outputBuffer = await fs.readFile(outputPath);
        await fs.unlink(outputPath).catch(() => {});
        console.log('🎵 Converted audio/webm → audio/ogg for WhatsApp');
        return outputBuffer;
    } catch (error) {
        await fs.unlink(inputPath).catch(() => {});
        await fs.unlink(outputPath).catch(() => {});
        console.error('❌ Failed to convert webm to ogg:', error.message);
        throw error;
    }
}

/**
 * تحويل وضغط أي فيديو ليتوافق مع WhatsApp القياسي و Meta Cloud API
 * - الصيغة: video/mp4
 * - كوديك الفيديو: H.264 (libx264) مع yuv420p
 * - كوديك الصوت: AAC (128k, 44100Hz)
 * - movflags +faststart للبث الفوري دون انتظار تحميل الفيديو بالكامل
 * - ضبط الأبعاد ومعدل البت للالتزام بحدود واتساب (خاصة 16MB لميتا)
 * @param {Buffer} inputBuffer - بافر الفيديو
 * @param {string} sourceMime - نوع الميديا الأصلي
 * @param {string} originalName - اسم الملف الأصلي
 * @returns {Promise<{ buffer: Buffer, mimetype: string }>}
 */
async function normalizeAndCompressVideo(inputBuffer, sourceMime, originalName = '') {
    if (!inputBuffer || inputBuffer.length < 500) {
        throw new Error('ملف الفيديو فارغ أو تالف (صغير جداً)');
    }

    const tempDir = path.join(MEDIA_DIR, 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    const ts = Date.now();
    const extMap = {
        'video/mp4': 'mp4',
        'video/quicktime': 'mov',
        'video/3gpp': '3gp',
        'video/webm': 'webm',
        'video/x-matroska': 'mkv',
        'video/avi': 'avi',
        'video/x-msvideo': 'avi',
        'video/msvideo': 'avi',
        'video/x-ms-wmv': 'wmv',
        'video/x-flv': 'flv',
        'video/mpeg': 'mpeg',
        'video/x-m4v': 'm4v',
        'video/ogg': 'ogv'
    };
    const inExt = extMap[sourceMime] || (originalName && path.extname(originalName).replace('.', '')) || 'mp4';
    const inputPath = path.join(tempDir, `vid_in_${ts}_${Math.random().toString(36).substr(2, 6)}.${inExt}`);
    const outputPath = path.join(tempDir, `vid_out_${ts}_${Math.random().toString(36).substr(2, 6)}.mp4`);

    await fs.writeFile(inputPath, inputBuffer);

    // إذا كان الملف أكبر من 20MB نستخدم CRF أعلى مع تصغير العرض إلى 960px لضمان نزوله تحت 16MB
    const isLarge = inputBuffer.length > 20 * 1024 * 1024;
    const crf = isLarge ? '28' : '26';
    const scaleFilter = isLarge ? "scale='min(960,iw)':-2" : "scale='min(1280,iw)':-2";

    try {
        await new Promise((resolve, reject) => {
            execFile('ffmpeg', [
                '-i', inputPath,
                '-c:v', 'libx264',
                '-preset', 'veryfast',
                '-crf', crf,
                '-vf', scaleFilter,
                '-c:a', 'aac',
                '-b:a', '128k',
                '-ac', '2',
                '-ar', '44100',
                '-pix_fmt', 'yuv420p',
                '-movflags', '+faststart',
                '-y',
                outputPath
            ], { timeout: 180000 }, async (error) => {
                await fs.unlink(inputPath).catch(() => {});
                if (error) {
                    await fs.unlink(outputPath).catch(() => {});
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        const outputBuffer = await fs.readFile(outputPath);
        await fs.unlink(outputPath).catch(() => {});
        console.log(`🎥 Normalized & compressed video: ${formatSize(inputBuffer.length)} (${sourceMime}) → ${formatSize(outputBuffer.length)} (video/mp4)`);
        return {
            buffer: outputBuffer,
            mimetype: 'video/mp4'
        };
    } catch (error) {
        await fs.unlink(inputPath).catch(() => {});
        await fs.unlink(outputPath).catch(() => {});
        console.error('⚠️ Video transcoding failed, checking fallback:', error.message);
        // في حال فشل ffmpeg ولكن الفيديو الأصلي كان mp4 وحجمه تحت 16MB، نمرره كما هو
        if (sourceMime === 'video/mp4' && inputBuffer.length <= 16 * 1024 * 1024) {
            return { buffer: inputBuffer, mimetype: 'video/mp4' };
        }
        throw new Error(`فشل معالجة وضغط الفيديو: ${error.message}`);
    }
}

/**
 * تحميل وسائط من رسالة WhatsApp
 * @param {object} message - رسالة WhatsApp
 * @param {string} sessionId - معرف الجلسة
 */
async function downloadMedia(message, sessionId) {
    try {
        // Lazy load to avoid circular dependency
        const WhatsAppManager = require('./WhatsAppManager');
        const session = WhatsAppManager.getSession(sessionId);
        if (!session) {
            throw new Error('الجلسة غير موجودة');
        }

        // تحديد نوع الوسائط
        const mediaType = getMediaType(message);
        if (!mediaType) {
            throw new Error('نوع الوسائط غير مدعوم');
        }

        if (!downloadMediaMessage) {
            throw new Error('تحميل الوسائط غير متاح حالياً');
        }

        // تحميل الوسائط
        const buffer = await downloadMediaMessage(
            message,
            'buffer',
            {},
            {
                logger: console,
                reuploadRequest: typeof session.sock?.updateMediaMessage === 'function' ? session.sock.updateMediaMessage : undefined
            }
        );

        // إنشاء اسم الملف
        const extension = getExtension(mediaType.mimetype);
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
        const subDir = getSubDirectory(mediaType.type);
        const filePath = path.join(MEDIA_DIR, subDir, fileName);

        // حفظ الملف
        await fs.writeFile(filePath, buffer);

        // الحصول على معلومات الملف
        const stats = await fs.stat(filePath);

        return {
            filePath,
            fileName,
            url: `/uploads/whatsapp/${subDir}/${fileName}`,
            size: stats.size,
            mimetype: mediaType.mimetype,
            type: mediaType.type
        };
    } catch (error) {
        console.error('❌ Error downloading media:', error);
        throw error;
    }
}

/**
 * رفع ملف للإرسال
 * @param {Buffer|string} source - مصدر الملف (buffer أو مسار)
 * @param {string} mimetype - نوع الملف
 * @param {string} originalName - الاسم الأصلي
 */
async function uploadMedia(source, mimetype, originalName = '') {
    try {
        let buffer;

        if (Buffer.isBuffer(source)) {
            buffer = source;
        } else if (typeof source === 'string') {
            // قراءة من مسار
            buffer = await fs.readFile(source);
        } else {
            throw new Error('مصدر الملف غير صالح');
        }

        const cleanMime = mimetype ? mimetype.split(';')[0].trim() : '';
        let outputMime = cleanMime;

        // التحقق من النوع
        const mediaType = getMediaTypeFromMimetype(cleanMime);
        if (!mediaType) {
            throw new Error('نوع الملف غير مدعوم');
        }

        // تحويل الصيغ الصوتية غير المدعومة إلى audio/ogg ليتوافق مع WhatsApp Cloud API
        // (يدعم WhatsApp Cloud API: audio/aac, audio/mp4, audio/mpeg, audio/amr, audio/ogg;codecs=opus)
        const META_AUDIO_MIMES = ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'];
        if (mediaType === 'audio' && !META_AUDIO_MIMES.includes(cleanMime)) {
            buffer = await convertWebmToOgg(buffer, cleanMime);
            outputMime = 'audio/ogg';
        }

        // 🖼️ تحويل صور WEBP/BMP/SVG إلى JPEG ليتوافق مع WhatsApp Cloud API
        // (يدعم Cloud API صور JPEG/PNG/GIF فقط — أي صورة بصيغة تانية (زي WEBP اللي
        // بتيجي من أجهزة أندرويد/كرووم) بتفشل في التوصيل). صورة الـ GIF بتنضغط لكن
        // مش بيتغيّر mimetype عشان يفضل متحرّك.
        if (mediaType === 'image') {
            const normalized = await normalizeImageForWhatsApp(buffer, outputMime);
            buffer = normalized.buffer;
            outputMime = normalized.mimetype;
        }

        // 🎥 تحويل وضغط الفيديو ليتوافق مع WhatsApp القياسي و Meta Cloud API
        if (mediaType === 'video') {
            const normalized = await normalizeAndCompressVideo(buffer, outputMime, originalName);
            buffer = normalized.buffer;
            outputMime = normalized.mimetype;
        }

        // التحقق من الحجم
        const sizeLimit = SIZE_LIMITS[mediaType];
        if (buffer.length > sizeLimit) {
            // محاولة الضغط للصور
            if (mediaType === 'image') {
                buffer = await compressImage(buffer, sizeLimit);
            } else {
                throw new Error(`حجم الملف يتجاوز الحد المسموح (${formatSize(sizeLimit)})`);
            }
        }

        // إنشاء اسم الملف
        const extension = getExtension(outputMime);
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
        const subDir = getSubDirectory(mediaType);
        const filePath = path.join(MEDIA_DIR, subDir, fileName);

        // حفظ الملف
        await fs.writeFile(filePath, buffer);

        return {
            buffer,
            filePath,
            fileName,
            url: `/uploads/whatsapp/${subDir}/${fileName}`,
            size: buffer.length,
            mimetype: outputMime,
            type: mediaType
        };
    } catch (error) {
        console.error('❌ Error uploading media:', error);
        throw error;
    }
}

/**
 * ضغط صورة
 */
async function compressImage(buffer, maxSize) {
    if (!sharp) return buffer;

    try {
        let quality = 80;
        let compressed = buffer;

        while (compressed.length > maxSize && quality > 10) {
            const p = sharp(buffer).jpeg({ quality });
            compressed = await p.toBuffer();
            p.destroy();
            quality -= 10;
        }

        if (compressed.length > maxSize) {
            const m = sharp(buffer).metadata();
            const metadata = await m;
            const scale = Math.sqrt(maxSize / compressed.length);

            const p = sharp(buffer)
                .resize(Math.floor(metadata.width * scale), Math.floor(metadata.height * scale))
                .jpeg({ quality: 70 });
            compressed = await p.toBuffer();
            p.destroy();
        }

        return compressed;
    } catch (error) {
        console.error('❌ Error compressing image:', error);
        return buffer;
    }
}

/**
 * إنشاء صورة مصغرة
 */
async function createThumbnail(buffer, width = 200, height = 200) {
    try {
        const p = sharp(buffer).resize(width, height, { fit: 'cover' }).jpeg({ quality: 60 });
        const result = await p.toBuffer();
        p.destroy();
        return result;
    } catch (error) {
        console.error('❌ Error creating thumbnail:', error);
        return null;
    }
}

/**
 * الحصول على معلومات الصورة
 */
async function getImageInfo(buffer) {
    try {
        const metadata = await sharp(buffer).metadata();
        return {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            size: buffer.length
        };
    } catch (error) {
        console.error('❌ Error getting image info:', error);
        return null;
    }
}

/**
 * حذف ملف وسائط
 */
async function deleteMedia(filePath) {
    try {
        await fs.unlink(filePath);
        return true;
    } catch (error) {
        console.error('❌ Error deleting media:', error);
        return false;
    }
}

/**
 * تنظيف الملفات المؤقتة القديمة
 */
async function cleanupTempFiles(maxAgeHours = 24) {
    try {
        const tempDir = path.join(MEDIA_DIR, 'temp');
        const files = await fs.readdir(tempDir);
        const now = Date.now();
        const maxAge = maxAgeHours * 60 * 60 * 1000;

        for (const file of files) {
            const filePath = path.join(tempDir, file);
            const stats = await fs.stat(filePath);

            if (now - stats.mtimeMs > maxAge) {
                await fs.unlink(filePath);
            }
        }

        console.log('🧹 Cleaned up temp files');
    } catch (error) {
        console.error('❌ Error cleaning up temp files:', error);
    }
}

/**
 * الحصول على نوع الوسائط من الرسالة
 */
function getMediaType(message) {
    const msg = message.message;
    if (!msg) return null;

    if (msg.imageMessage) {
        return { type: 'image', mimetype: msg.imageMessage.mimetype };
    }
    if (msg.videoMessage) {
        return { type: 'video', mimetype: msg.videoMessage.mimetype };
    }
    if (msg.audioMessage) {
        return { type: 'audio', mimetype: msg.audioMessage.mimetype };
    }
    if (msg.documentMessage) {
        return { type: 'document', mimetype: msg.documentMessage.mimetype };
    }
    if (msg.stickerMessage) {
        return { type: 'image', mimetype: msg.stickerMessage.mimetype };
    }

    return null;
}

/**
 * الحصول على نوع الوسائط من mimetype
 */
function getMediaTypeFromMimetype(mimetype) {
    if (!mimetype) return 'document';
    const cleanMimetype = mimetype.split(';')[0].trim();
    for (const [type, mimes] of Object.entries(SUPPORTED_TYPES)) {
        if (mimes.includes(cleanMimetype)) {
            return type;
        }
    }
    // تخمين من البداية
    if (cleanMimetype.startsWith('image/')) return 'image';
    if (cleanMimetype.startsWith('video/')) return 'video';
    if (cleanMimetype.startsWith('audio/')) return 'audio';
    return 'document';
}

/**
 * الحصول على امتداد الملف
 */
function getExtension(mimetype) {
    if (!mimetype) return 'bin';
    const cleanMimetype = mimetype.split(';')[0].trim();
    const extensions = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
        'image/bmp': 'bmp',
        'video/mp4': 'mp4',
        'video/3gpp': '3gp',
        'video/quicktime': 'mov',
        'video/webm': 'webm',
        'video/x-matroska': 'mkv',
        'video/avi': 'avi',
        'video/x-msvideo': 'avi',
        'video/msvideo': 'avi',
        'video/x-ms-wmv': 'wmv',
        'video/x-flv': 'flv',
        'video/mpeg': 'mpeg',
        'video/x-m4v': 'm4v',
        'video/ogg': 'ogv',
        'audio/ogg': 'ogg',
        'audio/mp4': 'm4a',
        'audio/mpeg': 'mp3',
        'audio/amr': 'amr',
        'audio/webm': 'webm',
        'audio/wav': 'wav',
        'audio/x-wav': 'wav',
        'audio/wave': 'wav',
        'audio/x-pn-wav': 'wav',
        'audio/x-m4a': 'm4a',
        'audio/aac': 'aac',
        'audio/x-aac': 'aac',
        'application/pdf': 'pdf',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'application/zip': 'zip',
        'application/x-zip-compressed': 'zip',
        'application/rar': 'rar',
        'application/x-rar-compressed': 'rar',
        'application/octet-stream': 'bin',
        'text/plain': 'txt'
    };

    return extensions[cleanMimetype] || 'bin';
}

/**
 * الحصول على المجلد الفرعي
 */
function getSubDirectory(type) {
    const dirs = {
        image: 'images',
        video: 'videos',
        audio: 'audio',
        document: 'documents'
    };
    return dirs[type] || 'documents';
}

/**
 * تنسيق حجم الملف
 */
function formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * التحقق من صلاحية الملف
 */
function validateFile(buffer, mimetype, type) {
    // التحقق من الحجم
    const sizeLimit = SIZE_LIMITS[type];
    if (buffer.length > sizeLimit) {
        return {
            valid: false,
            error: `حجم الملف (${formatSize(buffer.length)}) يتجاوز الحد المسموح (${formatSize(sizeLimit)})`
        };
    }

    // التحقق من النوع
    const cleanMimetype = mimetype ? mimetype.split(';')[0].trim() : '';
    const supportedTypes = SUPPORTED_TYPES[type];
    if (supportedTypes && !supportedTypes.includes(cleanMimetype)) {
        return {
            valid: false,
            error: `نوع الملف (${mimetype}) غير مدعوم`
        };
    }

    return { valid: true };
}

module.exports = {
    initMediaDirectory,
    downloadMedia,
    uploadMedia,
    convertWebmToOgg,
    normalizeAndCompressVideo,
    compressImage,
    createThumbnail,
    getImageInfo,
    deleteMedia,
    cleanupTempFiles,
    getMediaType,
    getMediaTypeFromMimetype,
    validateFile,
    formatSize,
    SIZE_LIMITS,
    SUPPORTED_TYPES,
    MEDIA_DIR
};

