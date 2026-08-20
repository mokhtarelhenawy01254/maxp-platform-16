/**
 * ≡ƒû╝∩╕Å WhatsApp Image Format Compatibility
 * ╪¬╪¡┘ê┘è┘ä ╪╡┘ê╪▒ ┘ä╪ú┘è ╪╡┘è╪║╪⌐ ┘ä╪╡┘è╪║╪⌐ ┘è╪»╪╣┘à┘ç╪º WhatsApp Cloud API.
 *
 * WhatsApp Cloud API ┘è╪»╪╣┘à ╪╡┘ê╪▒ JPEG/PNG/GIF ┘ü┘é╪╖ ┘ü┘è ╪▒╪│╪º╪ª┘ä ╪º┘ä╪╡┘ê╪▒ ΓÇö ╪ú┘è ╪╡┘è╪║╪⌐ ╪¬╪º┘å┘è╪⌐
 * (WEBP ╪▓┘è ╪º┘ä┘ä┘è ╪¿┘è┘è╪¼┘è ┘à┘å ╪ú╪¼┘ç╪▓╪⌐ ╪ú┘å╪»╪▒┘ê┘è╪» ┘ê╪º┘ä┘à╪¬╪╡┘ü╪¡╪º╪¬╪î ╪ú┘ê BMP/SVG) ╪¿╪¬╪▒┘ü╪╢ ┘ü╪¬┘ê╪╡┘æ┘ä╪┤
 * ┘ä┘ä╪╣┘à┘è┘ä. ╪¿┘å╪¡┘ê┘ä┘ç╪º ┘ä┘Ç JPEG ┘é╪¿┘ä ╪º┘ä╪Ñ╪▒╪│╪º┘ä. ╪º┘ä┘Ç GIF ┘à╪¬╪¡╪▒┘â ┘ü╪¿┘è╪º╪«╪» ╪º╪│╪¬╪½┘å╪º╪í (┘à╪┤ ╪¿┘è╪¬╪║┘è┘æ╪▒).
 *
 * ╪º┘ä┘à┘ä┘ü ╪»┘ç standalone ΓÇö ┘à┘å ╪║┘è╪▒ ╪ú┘è require ╪╣┘ä┘ë ╪«╪»┘à╪º╪¬ WhatsApp ╪╣╪┤╪º┘å ┘å╪¬┘ü╪º╪»┘ë
 * circular dependencies (MetaCloudProvider Γçä WhatsAppMediaHandler Γçä WhatsAppManager).
 */

let sharp;
try {
    sharp = require('sharp');
} catch (error) {
    console.warn('ΓÜá∩╕Å Sharp not available - WhatsApp image format conversion disabled');
    sharp = null;
}

/**
 * ╪º┘ä╪╡┘è╪║ ╪º┘ä┘ä┘è Cloud API ╪¿┘è┘é╪¿┘ä┘ç╪º ┘â╪▒╪│╪º┘ä╪⌐ ╪╡┘ê╪▒╪⌐ ┘à╪¿╪º╪┤╪▒╪⌐.
 */
const WHATSAPP_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif'];

/**
 * ╪¬╪¡┘ê┘è┘ä ╪╡┘ê╪▒╪⌐ ┘ä╪ú┘è ╪╡┘è╪║╪⌐ ┘ä╪╡┘è╪║╪⌐ ┘è╪»╪╣┘à┘ç╪º WhatsApp.
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
        console.log(`≡ƒû╝∩╕Å [WA-COMPAT] Converted ${cleanMime} ΓåÆ image/jpeg for WhatsApp delivery`);
        return { buffer: converted, mimetype: 'image/jpeg' };
    } catch (error) {
        console.warn(`ΓÜá∩╕Å [WA-COMPAT] Could not convert ${cleanMime} to JPEG, sending as-is:`, error.message);
        return { buffer, mimetype: cleanMime };
    }
}

module.exports = {
    normalizeImageForWhatsApp,
    WHATSAPP_IMAGE_MIMES
};
