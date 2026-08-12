/**
 * 🖼️ WhatsApp Image Format Compatibility
 * تحويل صور لأي صيغة لصيغة يدعمها WhatsApp Cloud API.
 *
 * WhatsApp Cloud API يدعم صور JPEG/PNG/GIF فقط في رسائل الصور — أي صيغة تانية
 * (WEBP زي اللي بييجي من أجهزة أندرويد والمتصفحات، أو BMP/SVG) بترفض فتوصّلش
 * للعميل. بنحولها لـ JPEG قبل الإرسال. الـ GIF متحرك فبياخد استثناء (مش بيتغيّر).
 *
 * الملف ده standalone — من غير أي require على خدمات WhatsApp عشان نتفادى
 * circular dependencies (MetaCloudProvider ⇄ WhatsAppMediaHandler ⇄ WhatsAppManager).
 */

let sharp;
try {
    sharp = require('sharp');
} catch (error) {
    console.warn('⚠️ Sharp not available - WhatsApp image format conversion disabled');
    sharp = null;
}

/**
 * الصيغ اللي Cloud API بيقبلها كرسالة صورة مباشرة.
 */
const WHATSAPP_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif'];

/**
 * تحويل صورة لأي صيغة لصيغة يدعمها WhatsApp.
 *
 * @param {Buffer} buffer
 * @param {string} mimetype
 * @returns {Promise<{buffer: Buffer, mimetype: string}>}
 */
async function normalizeImageForWhatsApp(buffer, mimetype) {
    const cleanMime = mimetype ? String(mimetype).split(';')[0].trim() : '';
    if (!sharp || !cleanMime || cleanMime === 'image/gif') {
        return { buffer, mimetype: cleanMime || mimetype };
    }
    if (WHATSAPP_IMAGE_MIMES.includes(cleanMime)) {
        return { buffer, mimetype: cleanMime };
    }
    try {
        const p = sharp(buffer).jpeg({ quality: 90 });
        const converted = await p.toBuffer();
        p.destroy();
        console.log(`🖼️ [WA-COMPAT] Converted ${cleanMime} → image/jpeg for WhatsApp delivery`);
        return { buffer: converted, mimetype: 'image/jpeg' };
    } catch (error) {
        console.warn(`⚠️ [WA-COMPAT] Could not convert ${cleanMime} to JPEG, sending as-is:`, error.message);
        return { buffer, mimetype: cleanMime };
    }
}

module.exports = {
    normalizeImageForWhatsApp,
    WHATSAPP_IMAGE_MIMES
};
