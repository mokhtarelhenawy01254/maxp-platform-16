/**
 * Loyalty Points Expiry WhatsApp Notification Service
 * ╪«╪»┘à╪⌐ ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘å╪¬┘ç╪º╪í ╪╡┘ä╪º╪¡┘è╪⌐ ┘å┘é╪º╪╖ ╪º┘ä┘ê┘ä╪º╪í ╪╣╪¿╪▒ ┘ê╪º╪¬╪│╪º╪¿
 *
 * ┘à╪│╪ñ┘ê┘ä╪⌐ ╪╣┘å ╪Ñ╪▒╪│╪º┘ä ╪¬╪░┘â┘è╪▒╪º╪¬ ┘ê╪»┘æ┘è╪⌐ (╪╣╪▒╪¿┘è/╪Ñ┘å╪¼┘ä┘è╪▓┘è) ┘ä┘ä╪╣┘à┘ä╪º╪í ┘é╪¿┘ä ╪º┘å╪¬┘ç╪º╪í ╪╡┘ä╪º╪¡┘è╪⌐ ┘å┘é╪º╪╖┘ç┘à
 * (┘é╪¿┘ä 7 ╪ú┘è╪º┘à ┘ê┘é╪¿┘ä 48 ╪│╪º╪╣╪⌐) ╪¿╪º╪│╪¬╪«╪»╪º┘à Meta Cloud WhatsApp API.
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const MetaCloudProvider = require('../whatsapp/providers/MetaCloudProvider');
// ╪«╪»┘à╪⌐ ╪º┘ä┘ê┘ä╪º╪í (┘à╪╡╪»┘æ╪▒╪⌐ ┘â┘Ç instance) ΓÇö ╪¬┘Å╪╢╪º┘ü ╪Ñ┘ä┘è┘ç╪º getExpiringPoints ┘à┘å ┘ê┘â┘è┘ä ╪ó╪«╪▒
const customerLoyaltyService = require('./customerLoyaltyService');

/**
 * ╪Ñ╪▒╪│╪º┘ä ╪▒╪│╪º┘ä╪⌐ ┘å╪╡┘è╪⌐ ╪╣╪¿╪▒ ┘ê╪º╪¬╪│╪º╪¿ ┘ä╪╣┘à┘è┘ä ╪¬╪º╪¿╪╣ ┘ä╪┤╪▒┘â╪⌐ ┘à╪╣┘è┘æ┘å╪⌐.
 * ┘è┘é╪▒╪ú ╪▒┘à╪▓ ╪º┘ä┘ê╪╡┘ê┘ä ┘ê╪▒┘é┘à ╪º┘ä┘ç╪º╪¬┘ü ┘à┘å ╪¼┘ä╪│╪⌐ ┘ê╪º╪¬╪│╪º╪¿ (whatsAppSessions) ╪º┘ä╪«╪º╪╡╪⌐ ╪¿╪º┘ä╪┤╪▒┘â╪⌐.
 * ╪»┘ü╪º╪╣┘è: ╪Ñ┘å ┘ä┘à ╪¬╪¬┘ê┘ü╪▒ ╪¼┘ä╪│╪⌐/╪▒┘à╪▓ ╪╡╪º┘ä╪¡ ┘è╪╖╪¿╪╣ ╪¬╪¡╪░┘è╪▒╪º┘ï ┘ê┘ä╪º ┘è╪▒┘à┘è ╪«╪╖╪ú (no-op).
 *
 * @param {string} companyId  ┘à╪╣╪▒┘æ┘ü ╪º┘ä╪┤╪▒┘â╪⌐
 * @param {string} phone      ╪▒┘é┘à ╪º┘ä╪╣┘à┘è┘ä (╪¿╪╡┘è╪║╪⌐ ╪»┘ê┘ä┘è╪⌐)
 * @param {string} text       ┘å╪╡ ╪º┘ä╪▒╪│╪º┘ä╪⌐ (┘è╪»╪╣┘à ┘à╪╣╪º┘è┘å╪⌐ ╪º┘ä╪▒┘ê╪º╪¿╪╖)
 * @returns {Promise<{sent:Boolean, messageId?:string|null, error?:string}>}
 */
async function sendWhatsAppMessage(companyId, phone, text) {
    if (!companyId || !phone || !text) {
        console.warn('ΓÜá∩╕Å [Loyalty Notify] sendWhatsAppMessage skipped: missing companyId/phone/text');
        return { sent: false, error: 'missing companyId/phone/text' };
    }

    try {
        const prisma = getSharedPrismaClient();

        // ┘å╪¿╪¡╪½ ╪╣┘å ╪¼┘ä╪│╪⌐ ┘ê╪º╪¬╪│╪º╪¿ ┘à┘ê╪╡┘ê┘ä╪⌐ ┘ä┘ä╪┤╪▒┘â╪⌐ (╪¬╪¡╪¬┘ê┘è ╪▒┘à╪▓ Meta ┘ê╪º┘ä┘Ç phone number id)
        const session = await prisma.whatsAppSession.findFirst({
            where: { companyId, status: 'CONNECTED' },
            orderBy: { updatedAt: 'desc' }
        });

        if (!session) {
            console.warn(`ΓÜá∩╕Å [Loyalty Notify] No CONNECTED WhatsApp session for company ${companyId} ΓÇö skipping message`);
            return { sent: false, error: 'no whatsapp session' };
        }

        // ┘å┘ü┘ê┘æ╪╢ ╪º┘ä╪Ñ╪▒╪│╪º┘ä ┘ä┘ä┘Ç helper ╪º┘ä┘à┘ê╪¼┘ê╪» ┘ü┘è MetaCloudProvider (┘è╪▒┘à┘æ┘à ╪º┘ä╪▒┘à╪▓ ╪º┘ä┘à╪┤┘ü┘æ╪▒ ╪»╪º╪«┘ä┘è╪º┘ï)
        const result = await MetaCloudProvider.sendText(session.id, phone, text, { previewUrl: true });

        return { sent: true, messageId: result?.messageId || null };
    } catch (error) {
        console.error(`Γ¥î [Loyalty Notify] Failed to send WhatsApp to ${phone}:`, error?.message || error);
        return { sent: false, error: error?.message || String(error) };
    }
}

/**
 * ╪¿┘å╪º╪í ┘å╪╡ ╪¬╪░┘â┘è╪▒ ╪½┘å╪º╪ª┘è ╪º┘ä┘ä╪║╪⌐ (╪╣╪▒╪¿┘è/╪Ñ┘å╪¼┘ä┘è╪▓┘è) ╪¿╪º┘å╪¬┘ç╪º╪í ╪╡┘ä╪º╪¡┘è╪⌐ ╪º┘ä┘å┘é╪º╪╖.
 */
function buildExpiryReminderText({ customerName, expiringPoints, daysLeft, deepLink }) {
    const name = customerName && customerName.trim() ? customerName.trim() : '';
    const greeting = name ? `┘à╪▒╪¡╪¿╪º┘ï ${name} / Hello ${name}` : '┘à╪▒╪¡╪¿╪º┘ï / Hello';
    const points = Number(expiringPoints) || 0;
    const link = deepLink || '';

    const ar = `┘ä╪»┘è┘â ${points} ┘å┘é╪╖╪⌐ ╪│╪¬┘å╪¬┘ç┘è ╪╡┘ä╪º╪¡┘è╪¬┘ç╪º ╪«┘ä╪º┘ä ${daysLeft} ╪ú┘è╪º┘à. ╪º┘ü╪¬╪¡ ╪º┘ä┘à╪¬╪¼╪▒ ╪╣╪¿╪▒ ╪º┘ä╪▒╪º╪¿╪╖ ┘ä╪¬╪│╪¬╪«╪»┘à ╪«╪╡┘à┘â ┘é╪¿┘ä ╪º┘ä┘ü┘ê╪º╪¬: ${link}`;
    const en = `You have ${points} point(s) expiring in ${daysLeft} day(s). Open the store via the link to use your discount before it expires: ${link}`;

    return `${greeting}\n\n${ar}\n\n${en}`;
}

/**
 * ╪Ñ╪▒╪│╪º┘ä ╪¬╪░┘â┘è╪▒ ╪º┘å╪¬┘ç╪º╪í ╪╡┘ä╪º╪¡┘è╪⌐ ╪º┘ä┘å┘é╪º╪╖ ┘ä╪╣┘à┘è┘ä ┘ê╪º╪¡╪».
 *
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} params.phone
 * @param {string} [params.customerName]
 * @param {number} params.expiringPoints
 * @param {number} params.daysLeft     (7 ╪ú┘ê 2)
 * @param {string} [params.deepLink]   ╪▒╪º╪¿╪╖ ╪º┘ä┘à╪¬╪¼╪▒ ╪º┘ä┘à╪¡┘à┘æ┘ä ╪¿╪º┘ä╪«╪╡┘à
 * @returns {Promise<{sent:Boolean, error?:string}>}
 */
async function sendPointsExpiryReminder({ companyId, phone, customerName, expiringPoints, daysLeft, deepLink }) {
    const text = buildExpiryReminderText({ customerName, expiringPoints, daysLeft, deepLink });
    const result = await sendWhatsAppMessage(companyId, phone, text);
    return result;
}

/**
 * ╪¼┘ä╪¿ ╪º┘ä╪╣┘à┘ä╪º╪í ╪º┘ä╪░┘è┘å ╪│╪¬┘å╪¬┘ç┘è ┘å┘é╪º╪╖┘ç┘à ╪«┘ä╪º┘ä `days` ┘è┘ê┘à╪º┘ï ┘ê╪Ñ╪▒╪│╪º┘ä ╪¬╪░┘â┘è╪▒ ┘ê╪º╪¬╪│╪º╪¿ ┘ä┘â┘ä ┘à┘å┘ç┘à.
 * ╪¬╪│╪¬╪»╪╣┘è ╪º┘ä╪»╪º┘ä╪⌐ ╪º┘ä┘à┘Å╪╢╪º┘ü╪⌐ ┘ü┘è customerLoyaltyService.getExpiringPoints (┘è╪╢┘è┘ü┘ç╪º ┘ê┘â┘è┘ä ╪ó╪«╪▒).
 *
 * @param {string|null} companyId  ┘à╪╣╪▒┘æ┘ü ╪º┘ä╪┤╪▒┘â╪⌐ ╪ú┘ê null ┘ä┘â┘ä ╪º┘ä╪┤╪▒┘â╪º╪¬
 * @param {number} days             ╪╣╪»╪» ╪º┘ä╪ú┘è╪º┘à ╪º┘ä┘à╪¬╪¿┘é┘è╪⌐ (7 ╪ú┘ê 2)
 * @returns {Promise<number>}       ╪╣╪»╪» ╪º┘ä╪▒╪│╪º╪ª┘ä ╪º┘ä╪¬┘è ╪¬┘à ╪Ñ╪▒╪│╪º┘ä┘ç╪º ╪¿┘å╪¼╪º╪¡
 */
async function notifyExpiringCustomers(companyId, days) {
    let customers = [];
    try {
        customers = await customerLoyaltyService.getExpiringPoints({ companyId, days });
    } catch (error) {
        console.error(`Γ¥î [Loyalty Notify] getExpiringPoints failed (company=${companyId}, days=${days}):`, error?.message || error);
        return 0;
    }

    // ╪»┘ü╪º╪╣┘è: ┘å╪¬╪╣╪º┘à┘ä ┘à╪╣ undefined/┘é┘ê╪º╪ª┘à ┘ü╪º╪▒╪║╪⌐ ╪¿╪ú┘à╪º┘å
    if (!Array.isArray(customers) || customers.length === 0) {
        return 0;
    }

    let sentCount = 0;
    for (const c of customers) {
        if (!c || !c.phone) continue;
        const res = await sendPointsExpiryReminder({
            companyId: c.companyId || companyId,
            phone: c.phone,
            customerName: c.customerName,
            expiringPoints: c.expiringPoints,
            daysLeft: days,
            deepLink: c.deepLink
        });
        if (res && res.sent) sentCount += 1;
    }

    return sentCount;
}

module.exports = {
    sendWhatsAppMessage,
    sendPointsExpiryReminder,
    notifyExpiringCustomers
};
