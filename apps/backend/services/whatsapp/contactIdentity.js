function getBareJid(jid) {
    return String(jid || '').split('@')[0].split(':')[0];
}

function buildFallbackPhoneNumber(prefix, jid) {
    const bareJid = getBareJid(jid).replace(/\s+/g, '');
    return `${prefix}:${bareJid || 'unknown'}`;
}

function normalizeWhatsAppContactIdentity(remoteJid) {
    const jid = String(remoteJid || '').trim();

    if (!jid) {
        return {
            normalizedJid: jid,
            phoneNumber: buildFallbackPhoneNumber('jid', jid)
        };
    }

    if (jid.endsWith('@g.us')) {
        return {
            normalizedJid: jid,
            phoneNumber: buildFallbackPhoneNumber('group', jid)
        };
    }

    if (jid.includes('@lid')) {
        return {
            normalizedJid: jid,
            phoneNumber: buildFallbackPhoneNumber('lid', jid)
        };
    }

    if (jid.endsWith('@newsletter')) {
        return {
            normalizedJid: jid,
            phoneNumber: buildFallbackPhoneNumber('newsletter', jid)
        };
    }

    const bareJid = getBareJid(jid);
    let cleaned = bareJid.replace(/\D/g, '');

    if (!cleaned) {
        return {
            normalizedJid: jid,
            phoneNumber: buildFallbackPhoneNumber('jid', jid)
        };
    }

    // --- Start of Number Correction Logic ---
    // 1. Handle Egyptian numbers with extra zero (e.g., 2001550599337 -> 201550599337)
    if (cleaned.startsWith('2001') && cleaned.length === 13) {
        cleaned = '20' + cleaned.substring(3);
    }
    // 2. Handle Egyptian numbers without country code (e.g., 01550599337 -> 201550599337)
    else if (cleaned.startsWith('01') && cleaned.length === 11) {
        cleaned = '20' + cleaned.substring(1);
    }
    // 3. Handle Egyptian numbers with 0020 prefix (e.g., 00201550599337 -> 201550599337)
    else if (cleaned.startsWith('00201') && cleaned.length === 14) {
        cleaned = cleaned.substring(2);
    }
    // 4. Handle 10-digit mobile numbers starting with 1 (e.g., 1550599337 -> 201550599337)
    else if (cleaned.startsWith('1') && cleaned.length === 10) {
        cleaned = '20' + cleaned;
    }
    // 5. Handle "02" typo instead of "20" for Egyptian mobiles (e.g., 021270388115 -> 201270388115)
    else if (cleaned.startsWith('021') && cleaned.length === 12) {
        cleaned = '20' + cleaned.substring(2);
    }
    // --- End of Number Correction Logic ---

    return {
        normalizedJid: `${cleaned}@s.whatsapp.net`,
        phoneNumber: cleaned
    };
}

module.exports = {
    normalizeWhatsAppContactIdentity
};
