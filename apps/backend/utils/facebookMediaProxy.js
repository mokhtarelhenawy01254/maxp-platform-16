const FACEBOOK_PROTECTED_MEDIA_HOST_PATTERNS = [
    /(^|\.)fbcdn\.net$/i,
    /(^|\.)fbsbx\.com$/i,
    /(^|\.)facebook\.com$/i,
    /(^|\.)cdninstagram\.com$/i,
    /(^|\.)instagram\.com$/i
];

const PROXY_IMAGE_ROUTE = '/api/v1/proxy-image';

const isPlainObject = (value) =>
    !!value && typeof value === 'object' && !Array.isArray(value);

const isFacebookProtectedMediaUrl = (value) => {
    if (typeof value !== 'string' || !value.trim()) {
        return false;
    }

    try {
        const parsedUrl = new URL(value);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return false;
        }

        return FACEBOOK_PROTECTED_MEDIA_HOST_PATTERNS.some((pattern) =>
            pattern.test(parsedUrl.hostname)
        );
    } catch {
        return false;
    }
};

const buildProxyImageUrl = ({
    url,
    messageId,
    customerId,
    attachmentIndex,
    attachmentId
}) => {
    const params = new URLSearchParams();

    if (typeof url === 'string' && url.trim()) {
        params.set('url', url);
    }

    if (typeof messageId === 'string' && messageId.trim()) {
        params.set('messageId', messageId);
    }

    if (typeof customerId === 'string' && customerId.trim()) {
        params.set('customerId', customerId);
    }

    if (typeof attachmentIndex === 'number' || (typeof attachmentIndex === 'string' && attachmentIndex !== '')) {
        params.set('attachmentIndex', String(attachmentIndex));
    }

    if (typeof attachmentId === 'string' && attachmentId.trim()) {
        params.set('attachmentId', attachmentId.trim());
    }

    const queryString = params.toString();
    return queryString ? `${PROXY_IMAGE_ROUTE}?${queryString}` : PROXY_IMAGE_ROUTE;
};

const proxyFacebookMediaUrl = (value, options = {}) => {
    if (!isFacebookProtectedMediaUrl(value)) {
        return value;
    }

    return buildProxyImageUrl({
        url: value,
        messageId: options.messageId,
        customerId: options.customerId,
        attachmentIndex: options.attachmentIndex,
        attachmentId: options.attachmentId
    });
};

const proxyFacebookMediaTokens = (value, options = {}) => {
    if (typeof value !== 'string' || !value.includes('|')) {
        return proxyFacebookMediaUrl(value, options);
    }

    return value.replace(
        /\|(IMAGE_URL|FILE_URL|VIDEO_URL|AUDIO_URL)\|(https?:\/\/[^\s|]+)/gi,
        (match, token, rawUrl) => {
            const proxiedUrl = proxyFacebookMediaUrl(rawUrl, options);
            return proxiedUrl === rawUrl ? match : `|${token}|${proxiedUrl}`;
        }
    );
};

const proxyFacebookMediaDeep = (value, options = {}) => {
    if (typeof value === 'string') {
        return proxyFacebookMediaTokens(value, options);
    }

    if (Array.isArray(value)) {
        return value.map((item, index) => {
            const itemAttachmentIndex = (item && typeof item === 'object' && item.attachmentIndex !== undefined)
                ? item.attachmentIndex
                : index;
            const itemAttachmentId = (item && typeof item === 'object')
                ? (item.id || item.attachmentId || options.attachmentId)
                : options.attachmentId;
            return proxyFacebookMediaDeep(item, {
                ...options,
                attachmentIndex: itemAttachmentIndex,
                attachmentId: itemAttachmentId
            });
        });
    }

    if (isPlainObject(value)) {
        return Object.entries(value).reduce((accumulator, [key, entryValue]) => {
            accumulator[key] = proxyFacebookMediaDeep(entryValue, options);
            return accumulator;
        }, {});
    }

    return value;
};

const proxyCustomerAvatarUrl = (customerId, rawUrl) =>
    proxyFacebookMediaUrl(rawUrl, { customerId });

const proxyMessageMediaUrl = (messageId, rawUrl) =>
    proxyFacebookMediaTokens(rawUrl, { messageId });

const proxySocketMessageData = (payload, options = {}) => {
    if (!isPlainObject(payload)) {
        return payload;
    }

    const messageId = options.messageId || payload.id;
    const customerId = options.customerId || payload.customerId;

    const normalizedPayload = {
        ...payload,
        content: proxyMessageMediaUrl(messageId, payload.content),
        fileUrl: proxyMessageMediaUrl(messageId, payload.fileUrl)
    };

    if (Object.prototype.hasOwnProperty.call(payload, 'attachments')) {
        normalizedPayload.attachments = proxyFacebookMediaDeep(payload.attachments, {
            messageId,
            customerId
        });
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'metadata')) {
        normalizedPayload.metadata = proxyFacebookMediaDeep(payload.metadata, {
            messageId,
            customerId
        });
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'lastMessage')) {
        normalizedPayload.lastMessage = proxyMessageMediaUrl(messageId, payload.lastMessage);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'customerAvatar')) {
        normalizedPayload.customerAvatar = proxyCustomerAvatarUrl(
            customerId,
            payload.customerAvatar
        );
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'avatar')) {
        normalizedPayload.avatar = proxyCustomerAvatarUrl(customerId, payload.avatar);
    }

    return normalizedPayload;
};

module.exports = {
    buildProxyImageUrl,
    isFacebookProtectedMediaUrl,
    proxyCustomerAvatarUrl,
    proxyFacebookMediaDeep,
    proxyFacebookMediaUrl,
    proxyMessageMediaUrl,
    proxySocketMessageData
};
