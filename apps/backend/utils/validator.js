const {
    CONVERSATION_STATUS,
    CONVERSATION_CHANNEL,
    MESSAGE_TYPE,
    WHATSAPP_STATUS_TYPE
} = require('./constants');

/**
 * Normalizes and validates a string against a allowed set of values (Enum).
 * @param {string} value - The value to normalize.
 * @param {Object} enumObj - The constant object to check against.
 * @param {string} defaultValue - The fallback value if invalid.
 * @returns {string} - The normalized value.
 */
function normalizeEnum(value, enumObj, defaultValue) {
    if (!value || typeof value !== 'string') return defaultValue;

    const normalized = value.trim().toUpperCase();
    const allowedValues = Object.values(enumObj);

    if (allowedValues.includes(normalized)) {
        return normalized;
    }

    return defaultValue;
}

/**
 * Specifically for Conversation status mapping from frontend titles
 */
function normalizeConversationStatus(status) {
    const statusMap = {
        'open': CONVERSATION_STATUS.ACTIVE,
        'pending': CONVERSATION_STATUS.PENDING,
        'resolved': CONVERSATION_STATUS.RESOLVED,
        'done': CONVERSATION_STATUS.RESOLVED,
        'archived': CONVERSATION_STATUS.ARCHIVED,
        'snoozed': CONVERSATION_STATUS.SNOOZED
    };

    if (!status) return CONVERSATION_STATUS.ACTIVE;

    const lowerStatus = status.toLowerCase();
    if (statusMap[lowerStatus]) {
        return statusMap[lowerStatus];
    }

    return normalizeEnum(status, CONVERSATION_STATUS, CONVERSATION_STATUS.ACTIVE);
}

module.exports = {
    normalizeEnum,
    normalizeConversationStatus,
    CONVERSATION_STATUS,
    CONVERSATION_CHANNEL,
    MESSAGE_TYPE,
    WHATSAPP_STATUS_TYPE
};
