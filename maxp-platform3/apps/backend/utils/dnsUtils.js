const dns = require('dns').promises;

/**
 * 🔍 Verify if a domain's CNAME record points to the expected target.
 * 
 * @param {string} domain - The custom domain to check (e.g., store.com)
 * @param {string} expectedTarget - The target it should point to (e.g., mokhtarelhenawy.online)
 * @returns {Promise<{success: boolean, message: string, record?: string}>}
 */
const verifyDomainDNS = async (domain, expectedTarget) => {
    try {
        // Remove protocol if present
        const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

        console.log(`🔍 [DNS-Verify] Checking CNAME for ${cleanDomain}, expecting ${expectedTarget}`);

        // Set a short timeout for DNS resolution (optional but good for production)
        // Note: Node.js dns module doesn't have a built-in timeout, but we can wrap it if needed.

        const records = await dns.resolveCname(cleanDomain);

        const isMatch = records.some(record => {
            const normalizedRecord = record.toLowerCase().replace(/\.$/, ''); // Remove trailing dot
            const normalizedTarget = expectedTarget.toLowerCase().replace(/\.$/, '');
            return normalizedRecord === normalizedTarget;
        });

        if (isMatch) {
            return {
                success: true,
                message: 'تم التحقق من الدومين بنجاح. السجل يشير إلى السيرفر الصحيح.',
                record: records[0]
            };
        } else {
            return {
                success: false,
                message: `سجل CNAME غير صحيح. يشير حالياً إلى: ${records[0]}. يجب أن يشير إلى: ${expectedTarget}`,
                record: records[0]
            };
        }
    } catch (error) {
        console.error(`❌ [DNS-Verify] Error resolving ${domain}:`, error.message);

        if (error.code === 'ENODATA') {
            return {
                success: false,
                message: 'لم يتم العثور على سجل CNAME لهذا الدومين.'
            };
        } else if (error.code === 'ENOTFOUND') {
            return {
                success: false,
                message: 'الدومين غير موجود أو غير مسجل.'
            };
        }

        return {
            success: false,
            message: `حدث خطأ أثناء فحص الدومين: ${error.message}`
        };
    }
};

module.exports = {
    verifyDomainDNS
};
