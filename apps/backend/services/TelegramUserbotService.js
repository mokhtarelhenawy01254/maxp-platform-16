let TelegramClient, Api, StringSession;
try {
    const telegramModule = require("telegram");
    TelegramClient = telegramModule.TelegramClient;
    Api = telegramModule.Api;

    const sessionsModule = require("telegram/sessions");
    StringSession = sessionsModule.StringSession;

    // Validate imports
    if (!TelegramClient || typeof TelegramClient !== 'function') {
        console.error("❌ [TELEGRAM] TelegramClient is not a function:", typeof TelegramClient);
        throw new Error("TelegramClient is not properly imported");
    }
    if (!StringSession || typeof StringSession !== 'function') {
        console.error("❌ [TELEGRAM] StringSession is not a function:", typeof StringSession);
        throw new Error("StringSession is not properly imported");
    }
    console.log("✅ [TELEGRAM] TelegramClient and StringSession imported successfully");
} catch (importError) {
    console.error("❌ [TELEGRAM] Failed to import telegram modules:", importError);
    throw importError;
}

const { getSharedPrismaClient } = require('./sharedDatabase');
const socketService = require('./socketService');
const input = require("input"); // For console input if ever needed
const fs = require('fs');
const path = require('path');
const os = require('os');
const bigInt = require('big-integer');

class TelegramUserbotService {
    get prisma() {
        return getSharedPrismaClient();
    }

    constructor() {
        this.clients = new Map(); // userbotConfigId -> TelegramClient
        this.inboxHandlers = new Map(); // userbotConfigId -> { handlerFn, eventBuilder }
    }

    // --- Private Helpers ---
    _normalizePhone(phoneNumber) {
        if (!phoneNumber) return "";
        const trimmed = String(phoneNumber).trim();
        if (!trimmed) return "";
        return trimmed.replace(/[\s\-()]/g, "");
    }

    _phoneVariants(phoneNumber) {
        const trimmed = String(phoneNumber || "").trim();
        const normalized = this._normalizePhone(phoneNumber);
        const variants = [normalized, trimmed].filter((value, index, arr) => value && arr.indexOf(value) === index);
        return variants;
    }

    _telegramLongToString(value) {
        if (value === undefined || value === null) return null;
        if (typeof value === 'bigint') return value.toString();
        if (typeof value === 'object' && typeof value.toString === 'function') return value.toString();
        return String(value);
    }

    _toTelegramLong(value, fallback = '0') {
        const normalized = this._telegramLongToString(value) || fallback;
        return bigInt(normalized);
    }

    _parseChatReference(chatReference = {}) {
        if (!chatReference || typeof chatReference !== 'object') return {};

        let inputPeer = chatReference.inputPeer;
        if (typeof inputPeer === 'string') {
            try {
                inputPeer = JSON.parse(inputPeer);
            } catch (error) {
                inputPeer = null;
            }
        }

        return {
            ...chatReference,
            inputPeer: inputPeer && typeof inputPeer === 'object' ? inputPeer : null
        };
    }

    _serializeInputPeer(inputPeer) {
        if (!inputPeer || !inputPeer.className) return null;

        const serialized = {
            className: inputPeer.className
        };

        if (inputPeer.userId !== undefined) {
            serialized.userId = this._telegramLongToString(inputPeer.userId);
            serialized.id = serialized.userId;
            serialized.peerType = 'user';
        }
        if (inputPeer.chatId !== undefined) {
            serialized.chatId = this._telegramLongToString(inputPeer.chatId);
            serialized.id = serialized.chatId;
            serialized.peerType = 'chat';
        }
        if (inputPeer.channelId !== undefined) {
            serialized.channelId = this._telegramLongToString(inputPeer.channelId);
            serialized.id = serialized.channelId;
            serialized.peerType = 'channel';
        }
        if (inputPeer.accessHash !== undefined) {
            serialized.accessHash = this._telegramLongToString(inputPeer.accessHash);
        }

        return serialized;
    }

    _buildInputPeerFromReference(chatId, chatReference = {}) {
        const reference = this._parseChatReference(chatReference);
        const inputPeer = reference.inputPeer || {};
        const className = inputPeer.className || reference.className;
        const peerType = inputPeer.peerType || reference.peerType;
        const accessHash = inputPeer.accessHash || reference.accessHash;

        if (className === 'InputPeerUser' || peerType === 'user') {
            const userId = inputPeer.userId || inputPeer.id || reference.userId || chatId;
            if (!userId || !accessHash) return null;
            return new Api.InputPeerUser({
                userId: this._toTelegramLong(userId),
                accessHash: this._toTelegramLong(accessHash)
            });
        }

        if (className === 'InputPeerChannel' || peerType === 'channel') {
            const channelId = inputPeer.channelId || inputPeer.id || reference.channelId || chatId;
            if (!channelId || !accessHash) return null;
            return new Api.InputPeerChannel({
                channelId: this._toTelegramLong(channelId),
                accessHash: this._toTelegramLong(accessHash)
            });
        }

        if (className === 'InputPeerChat' || peerType === 'chat') {
            const peerChatId = inputPeer.chatId || inputPeer.id || reference.chatId || chatId;
            if (!peerChatId) return null;
            return new Api.InputPeerChat({
                chatId: this._toTelegramLong(peerChatId)
            });
        }

        return null;
    }

    async _resolveChatEntity(client, chatId, chatReference = {}) {
        const referencedInputPeer = this._buildInputPeerFromReference(chatId, chatReference);
        if (referencedInputPeer) {
            return referencedInputPeer;
        }

        const candidates = [];
        const addCandidate = (candidate) => {
            if (candidate === undefined || candidate === null || candidate === '') return;
            candidates.push(candidate);
        };

        const chatIdText = this._telegramLongToString(chatId);
        if (chatIdText && /^-?\d+$/.test(chatIdText)) {
            try {
                addCandidate(BigInt(chatIdText));
            } catch (error) {
                addCandidate(Number(chatIdText));
            }
        }
        addCandidate(chatId);
        if (chatIdText && chatIdText !== chatId) addCandidate(chatIdText);

        let lastError = null;
        for (const candidate of candidates) {
            try {
                return await client.getInputEntity(candidate);
            } catch (error) {
                lastError = error;
            }
        }

        try {
            await client.getDialogs({ limit: 100 });
            for (const candidate of candidates) {
                try {
                    return await client.getInputEntity(candidate);
                } catch (error) {
                    lastError = error;
                }
            }
        } catch (error) {
            lastError = error;
        }

        throw lastError || new Error(`Unable to resolve Telegram chat entity for ${chatId}`);
    }

    async _findExistingUserbotByPhone(companyId, phoneNumber, excludeId) {
        const variants = this._phoneVariants(phoneNumber);
        if (!companyId || variants.length === 0) return null;

        const where = {
            companyId,
            type: 'USERBOT',
            NOT: excludeId ? { id: excludeId } : undefined,
            OR: variants.map((phone) => ({ clientPhone: phone }))
        };

        return await this.prisma.telegramConfig.findFirst({
            where,
            select: {
                id: true,
                label: true,
                isActive: true,
                sessionString: true,
                clientPhone: true
            }
        });
    }

    /**
     * Retrieves a stored session string from the database.
     */
    async _getSession(userbotConfigId, companyId) {
        try {
            const config = await this.prisma.telegramConfig.findFirst({
                where: {
                    id: userbotConfigId,
                    type: 'USERBOT',
                    ...(companyId ? { companyId } : {})
                }
            });

            if (!config) {
                console.warn(`⚠️ [_getSession] Config not found for userbotConfigId: ${userbotConfigId}`);
                return "";
            }

            // Use sessionString if available, otherwise fallback to clientSession (for backward compatibility)
            const session = config.sessionString || config.clientSession || "";
            return session;
        } catch (error) {
            console.error(`❌ [_getSession] Error getting session:`, error);
            return "";
        }
    }

    /**
     * Retrieves the userbot configuration.
     */
    async _getUserbotConfig(userbotConfigId, companyId) {
        const config = await this.prisma.telegramConfig.findFirst({
            where: {
                id: userbotConfigId,
                companyId,
                type: 'USERBOT'
            }
        });
        return config;
    }

    /**
     * Centralized method to get or create a Telegram Client.
     * Handles memory caching, validation, and restoring from session.
     */
    async _getClient(userbotConfigId, companyId) {
        // 1. Check Memory
        let clientData = this.clients.get(userbotConfigId);
        let client = null;

        // Extract client from stored data (it might be an object wrap or direct client)
        if (clientData) {
            if (typeof clientData === 'object' && clientData.client) {
                client = clientData.client;
            } else {
                client = clientData;
            }
        }

        // 2. Validate In-Memory Client
        let isClientValid = false;
        try {
            if (client) {
                if (client instanceof TelegramClient) {
                    isClientValid = true;
                } else if (typeof client === 'object' && client.constructor && client.constructor.name === 'TelegramClient') {
                    isClientValid = true;
                }
            }
        } catch (e) {
            console.warn("⚠️ [_getClient] Client validation warning:", e.message);
            isClientValid = false;
        }

        if (isClientValid && client.connected) {
            // Optional: Check connection status if possible, but usually existence implies we tried to connect
            return client;
        }

        // 3. Restore from Session if memory failed
        console.log(`🔄 [_getClient] Restoring client for ${userbotConfigId}...`);

        const config = await this._getUserbotConfig(userbotConfigId, companyId);
        if (!config || !config.apiId || !config.apiHash) {
            console.error(`❌ [_getClient] Missing config or API credentials for ${userbotConfigId}`);
            throw new Error("Userbot configuration not found or missing API credentials");
        }

        const sessionString = await this._getSession(userbotConfigId, companyId);
        if (!sessionString || sessionString.trim() === '') {
            console.error(`❌ [_getClient] No session string found for ${userbotConfigId}`);
            throw new Error("Not logged in (No session found)");
        }

        try {
            console.log(`🔧 [_getClient] Creating new TelegramClient instance...`);
            client = new TelegramClient(new StringSession(sessionString), parseInt(config.apiId), config.apiHash, {
                connectionRetries: 5,
            });
            console.log(`🔌 [_getClient] Connecting...`);
            await client.connect();

            // Save updated session string if detailed (DC/Auth Key) changed to prevent invalidation
            const newSessionString = client.session.save();
            if (newSessionString !== sessionString) {
                console.log(`💾 [_getClient] Session string updated/migrated. Saving to DB for ${userbotConfigId}...`);
                await this.prisma.telegramConfig.update({
                    where: { id: userbotConfigId },
                    data: { sessionString: newSessionString, isActive: true }
                });
            }

            // Update memory
            this.clients.set(userbotConfigId, client);

            // Auto-setup inbox handler if enabled for this config
            if (config.inboxEnabled) {
                try {
                    this._setupInboxHandler(userbotConfigId, companyId, client);
                } catch (handlerError) {
                    console.warn(`⚠️ [_getClient] Failed to setup inbox handler:`, handlerError.message);
                }
            }

            console.log(`✅ [_getClient] Client restored and connected.`);
            return client;
        } catch (error) {
            console.error(`❌ [_getClient] Failed to restore client:`, error);
            throw error;
        }
    }

    /**
     * Centralized error handler for Telegram API errors.
     * Specifically handles session expiration (AUTH_KEY_UNREGISTERED).
     */
    async _handleAuthError(error, userbotConfigId, companyId) {
        const errorMessage = error.message || '';
        const errorString = error.toString() || '';
        const isAuthError = errorMessage.includes('AUTH_KEY_UNREGISTERED') ||
            errorString.includes('AUTH_KEY_UNREGISTERED') ||
            errorMessage.includes('401') ||
            error.code === 401;

        if (isAuthError) {
            console.warn(`⚠️ [_handleAuthError] Session expired for ${userbotConfigId}. Clearing data.`);
            try {
                // Clear DB
                await this.prisma.telegramConfig.updateMany({
                    where: {
                        id: userbotConfigId,
                        companyId: companyId,
                        type: 'USERBOT'
                    },
                    data: {
                        sessionString: null,
                        clientSession: null,
                        clientPhone: null,
                        isActive: false,
                        tempAuthSession: null,
                        tempPhoneCodeHash: null
                    }
                });

                // Clear Memory
                this.clients.delete(userbotConfigId);
            } catch (clearError) {
                console.error(`❌ [_handleAuthError] Failed to clear session:`, clearError);
            }

            return {
                success: false,
                error: "AUTH_KEY_UNREGISTERED",
                message: "Session expired. Please login again.",
                requiresReauth: true
            };
        }

        // Return original error if not auth-related
        return { success: false, error: error.message || "Unknown error occurred" };
    }

    // --- Public Info Methods ---

    // For backward compatibility if needed, but _getSession is preferred internally
    async getSession(userbotConfigId) {
        return this._getSession(userbotConfigId);
    }

    async getUserbotConfig(userbotConfigId, companyId) {
        return this._getUserbotConfig(userbotConfigId, companyId);
    }

    // --- Auth Step 1: Send Code ---
    async sendCode(userbotConfigId, companyId, phoneNumber) {
        console.log(`🔍 [SEND-CODE] Starting for ${userbotConfigId}, phone: ${phoneNumber}`);
        try {
            const config = await this._getUserbotConfig(userbotConfigId, companyId);
            if (!config || !config.apiId || !config.apiHash) {
                return { success: false, error: "API credentials not configured." };
            }

            const existing = await this._findExistingUserbotByPhone(companyId, phoneNumber, userbotConfigId);
            if (existing && (existing.sessionString || existing.isActive)) {
                const message = `Phone number already linked to "${existing.label || 'Telegram Userbot'}". Please use reconnect or delete the existing userbot.`;
                return {
                    success: false,
                    error: message,
                    errorCode: "PHONE_ALREADY_LINKED",
                    message,
                    existingUserbotId: existing.id
                };
            }

            const normalizedPhone = this._normalizePhone(phoneNumber) || phoneNumber;

            const session = new StringSession("");
            const client = new TelegramClient(session, parseInt(config.apiId), config.apiHash, {
                connectionRetries: 5,
            });

            await client.connect();

            // Store temporarily for verify step
            const tempData = { client, phoneNumber: normalizedPhone, phoneCodeHash: null, companyId };
            this.clients.set(userbotConfigId, tempData);

            const apiCredentials = {
                apiId: parseInt(config.apiId),
                apiHash: config.apiHash
            };

            const result = await client.sendCode(apiCredentials, normalizedPhone);

            // Update stored data with hash
            tempData.phoneCodeHash = result.phoneCodeHash;
            this.clients.set(userbotConfigId, tempData);

            // Persist temp auth data to DB (survives restarts & multi-instance)
            try {
                const sessionString = client.session.save();
                await this.prisma.telegramConfig.update({
                    where: { id: userbotConfigId },
                    data: {
                        clientPhone: normalizedPhone,
                        tempAuthSession: sessionString,
                        tempPhoneCodeHash: result.phoneCodeHash
                    }
                });
            } catch (dbError) {
                console.warn("⚠️ [SEND-CODE] Failed to persist temp auth data:", dbError.message);
            }

            return { success: true, message: "Code sent successfully", phoneCodeHash: result.phoneCodeHash };

        } catch (error) {
            console.error("❌ [SEND-CODE] Error:", error);
            // This is pre-login, so we don't need _handleAuthError usually, but good to be safe
            // However, usually sendCode fails due to config/network, not auth key
            return { success: false, error: error.message || "Failed to send code" };
        }
    }

    // --- Auth Step 1.5: Restore temp session from DB ---
    async _restoreTempSession(userbotConfigId, companyId) {
        try {
            const config = await this.prisma.telegramConfig.findFirst({
                where: { id: userbotConfigId, companyId, type: 'USERBOT' }
            });
            if (!config || !config.tempAuthSession || !config.tempPhoneCodeHash || !config.clientPhone) {
                return null;
            }
            const session = new StringSession(config.tempAuthSession);
            const client = new TelegramClient(session, parseInt(config.apiId), config.apiHash, {
                connectionRetries: 5,
            });
            await client.connect();
            const tempData = { client, phoneNumber: config.clientPhone, phoneCodeHash: config.tempPhoneCodeHash, companyId };
            this.clients.set(userbotConfigId, tempData);
            return tempData;
        } catch (error) {
            console.error("❌ [_restoreTempSession] Failed:", error.message);
            return null;
        }
    }

    // --- Auth Step 2: Sign In ---
    async signIn(userbotConfigId, companyId, code, password) {
        let temp = this.clients.get(userbotConfigId);
        if (!temp || (typeof temp !== 'object') || !temp.client) {
            temp = await this._restoreTempSession(userbotConfigId, companyId);
            if (!temp) {
                return { success: false, error: "Session expired or not found. Try sending code again." };
            }
        }

        try {
            const { client, phoneNumber, phoneCodeHash } = temp;

            const existing = await this._findExistingUserbotByPhone(companyId, phoneNumber, userbotConfigId);
            if (existing && (existing.sessionString || existing.isActive)) {
                const message = `Phone number already linked to "${existing.label || 'Telegram Userbot'}". Please use reconnect or delete the existing userbot.`;
                return {
                    success: false,
                    error: message,
                    errorCode: "PHONE_ALREADY_LINKED",
                    message
                };
            }

            let authResult;
            try {
                authResult = await client.invoke(
                    new Api.auth.SignIn({
                        phoneNumber,
                        phoneCodeHash,
                        phoneCode: code,
                    })
                );
            } catch (error) {
                if (error.errorMessage === 'SESSION_PASSWORD_NEEDED' || error.message?.includes('password')) {
                    if (!password) {
                        return {
                            success: false,
                            error: "Two-factor authentication is enabled. Password is required.",
                            requiresPassword: true
                        };
                    }

                    const passwordHash = await client.invoke(new Api.account.GetPassword());
                    const { computeCheck } = require('telegram/Password');
                    const passwordCheck = await computeCheck(passwordHash, password);

                    authResult = await client.invoke(
                        new Api.auth.CheckPassword({ password: passwordCheck })
                    );
                } else {
                    throw error;
                }
            }

            const sessionString = client.session.save();

            // Save to DB
            await this.prisma.telegramConfig.update({
                where: { id: userbotConfigId },
                data: { sessionString, isActive: true, clientPhone: this._normalizePhone(phoneNumber) || phoneNumber, tempAuthSession: null, tempPhoneCodeHash: null }
            });

            // Store actual client instance (clean up temp object)
            this.clients.set(userbotConfigId, client);

            // Auto-setup inbox handler if enabled
            const config = await this._getUserbotConfig(userbotConfigId, companyId);
            if (config?.inboxEnabled) {
                try {
                    this._setupInboxHandler(userbotConfigId, companyId, client);
                } catch (handlerError) {
                    console.warn(`⚠️ [SIGN-IN] Failed to setup inbox handler:`, handlerError.message);
                }
            }

            return { success: true, message: "Logged in successfully" };

        } catch (error) {
            console.error("❌ [SIGN-IN] Error:", error);
            return { success: false, error: error.message };
        }
    }

    // --- Main Features ---

    async getDialogs(userbotConfigId, companyId) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);
            const dialogs = await client.getDialogs({ limit: 50 });

            const formatted = dialogs.map(d => {
                try {
                    const chatId = d.id?.toString() || d.entity?.id?.toString() || 'unknown';
                    const inputPeer = this._serializeInputPeer(d.inputEntity);
                    const title = d.title || d.name || d.entity?.title || d.entity?.firstName || 'Unknown';

                    return {
                        id: chatId,
                        legacyId: d.entity?.id?.toString() || chatId,
                        inputPeer,
                        peerType: inputPeer?.peerType || (d.isUser ? 'user' : d.isChannel ? 'channel' : d.isGroup ? 'chat' : undefined),
                        accessHash: inputPeer?.accessHash || null,
                        name: title,
                        unreadCount: d.unreadCount || 0,
                        lastMessage: d.message?.message || d.message?.text || "",
                        date: d.date || new Date(),
                        isGroup: d.isGroup || false,
                        isUser: d.isUser || false,
                        isChannel: d.isChannel || false
                    };
                } catch (e) {
                    return { id: 'error', name: 'Error', unreadCount: 0, lastMessage: '', date: new Date() };
                }
            });

            return { success: true, data: formatted };
        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    async sendMessage(userbotConfigId, companyId, chatId, message, chatReference = {}) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);
            const entity = await this._resolveChatEntity(client, chatId, chatReference);
            
            await client.sendMessage(entity, { message });

            return { success: true };
        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    async getMessages(userbotConfigId, companyId, chatId, limit = 50, chatReference = {}) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);
            const entity = await this._resolveChatEntity(client, chatId, chatReference);

            // Fetch messages (fallback to GetHistory if getMessages helper fails)
            let messages;
            try {
                messages = await client.getMessages(entity, { limit: parseInt(limit) || 50 });
            } catch (e) {
                const result = await client.invoke(
                    new Api.messages.GetHistory({
                        peer: entity,
                        limit: parseInt(limit) || 50,
                        offsetId: 0,
                        offsetDate: 0,
                        addOffset: 0,
                        maxId: 0,
                        minId: 0,
                        hash: BigInt(0)
                    })
                );
                messages = result.messages || [];
            }

            const formattedMessages = await Promise.all(messages.map(async (msg) => {
                try {
                    let senderName = 'System';
                    let senderId = 'system';

                    if (msg.out) {
                        senderName = 'You';
                        senderId = 'me';
                    } else if (msg.fromId) {
                        try {
                            const senderEntity = await client.getEntity(msg.fromId);
                            senderName = senderEntity.firstName || senderEntity.title || senderEntity.username || 'Unknown';
                            if (senderEntity.lastName) senderName += ' ' + senderEntity.lastName;
                            senderId = msg.fromId?.value?.toString() || msg.fromId?.toString() || 'unknown';
                        } catch (e) {
                            senderName = 'Unknown';
                            senderId = msg.fromId?.toString();
                        }
                    }

                    return {
                        id: msg.id?.toString() || String(msg.id),
                        text: msg.message || msg.text || '',
                        date: msg.date ? (msg.date instanceof Date ? Math.floor(msg.date.getTime() / 1000) : msg.date) : 0,
                        fromId: senderId,
                        senderName,
                        isOut: msg.out || false,
                        media: msg.media ? { type: msg.media.className || 'unknown' } : null
                    };
                } catch (e) {
                    return { id: 'error', text: 'Error formatting' };
                }
            }));

            // Sort by date ascending
            formattedMessages.sort((a, b) => a.date - b.date);

            return { success: true, data: formattedMessages };

        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    async sendFile(userbotConfigId, companyId, chatId, fileBuffer, fileName, caption, chatReference = {}) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);

            const tempPath = path.join(os.tmpdir(), fileName || `upload_${Date.now()}.dat`);
            try {
                fs.writeFileSync(tempPath, fileBuffer);

                const entity = await this._resolveChatEntity(client, chatId, chatReference);
                await client.sendMessage(entity, {
                    message: caption || "",
                    file: tempPath
                });

                fs.unlinkSync(tempPath);
                return { success: true };
            } catch (fileError) {
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                throw fileError;
            }
        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    async downloadMedia(userbotConfigId, companyId, chatId, messageId, chatReference = {}) {
        console.log(`[Media] Downloading media for ${chatId}, Msg ${messageId}`);
        try {
            const client = await this._getClient(userbotConfigId, companyId);
            const entity = await this._resolveChatEntity(client, chatId, chatReference);

            // Get the message
            // Note: messageId from frontend might be string, ensure int
            const ids = [parseInt(messageId)];
            const messages = await client.getMessages(entity, { ids: ids });

            if (!messages || messages.length === 0 || !messages[0]) {
                console.warn(`[Media] Message ${messageId} not found in chat ${chatId}`);
                return { success: false, error: "Message not found" };
            }

            const message = messages[0];
            if (!message.media) {
                console.warn(`[Media] Message ${messageId} has no media`);
                return { success: false, error: "Message has no media" };
            }

            // Download media (returns Buffer)
            console.log(`[Media] Found message, downloading...`);
            const buffer = await client.downloadMedia(message);

            if (!buffer) {
                console.error(`[Media] Download failed (empty buffer)`);
                return { success: false, error: "Download returned empty" };
            }

            // Try to determine mime type
            let mimeType = 'application/octet-stream';
            if (message.media) {
                if (message.media.document) {
                    mimeType = message.media.document.mimeType;
                } else if (message.media.photo) {
                    mimeType = 'image/jpeg';
                }
            }

            console.log(`[Media] Download success, size: ${buffer.length}, type: ${mimeType}`);
            return { success: true, buffer, mimeType };

        } catch (error) {
            console.error('[Media] Error in downloadMedia:', error);
            // Check for specific auth error or generic
            if (error.message && error.message.includes('AUTH_KEY')) {
                return this._handleAuthError(error, userbotConfigId, companyId);
            }
            return { success: false, error: error.message };
        }
    }

    async logout(userbotConfigId, companyId) {
        const clientData = this.clients.get(userbotConfigId);
        let client = null;

        if (clientData) {
            if (typeof clientData === 'object' && clientData.client) {
                client = clientData.client;
            } else {
                client = clientData;
            }
        }

        if (client && client.connected) {
            try { await client.disconnect(); } catch (e) { }
        }

        this.clients.delete(userbotConfigId);

        await this.prisma.telegramConfig.update({
            where: { id: userbotConfigId },
            data: { sessionString: null, isActive: false, clientPhone: null }
        });

        return { success: true };
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🚀 ADVANCED FEATURES
    // ═══════════════════════════════════════════════════════════════════════════════

    // --- 1️⃣ Auto-Reply System ---

    async setupAutoReply(userbotConfigId, companyId) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);
            const rules = await this.prisma.telegramAutoReplyRule.findMany({
                where: { userbotConfigId, isActive: true },
                orderBy: { priority: 'desc' }
            });

            client.addEventHandler(async (event) => {
                if (event.message && !event.message.out) {
                    const message = event.message.message || '';
                    const userId = event.message.fromId?.toString();

                    for (const rule of rules) {
                        if (await this._matchAutoReplyRule(message, rule, userId)) {
                            await client.sendMessage(event.message.peerId, {
                                message: rule.response,
                                replyTo: event.message.id
                            });

                            await this.prisma.telegramAutoReplyUsage.create({
                                data: {
                                    id: require('crypto').randomUUID(),
                                    ruleId: rule.id,
                                    userId: userId || 'unknown'
                                }
                            });
                            break;
                        }
                    }
                }
            }, new Api.UpdateNewMessage({}));

            return { success: true, rulesCount: rules.length };
        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    async _matchAutoReplyRule(message, rule, userId) {
        const now = new Date();

        if (rule.workingHoursOnly && rule.startTime && rule.endTime) {
            const currentTime = now.toTimeString().slice(0, 5);
            if (currentTime < rule.startTime || currentTime > rule.endTime) {
                return false;
            }
        }

        if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
            const currentDay = now.getDay();
            if (!rule.daysOfWeek.includes(currentDay)) {
                return false;
            }
        }

        if (rule.maxUsesPerUser && userId) {
            const usageCount = await this.prisma.telegramAutoReplyUsage.count({
                where: {
                    ruleId: rule.id,
                    userId,
                    usedAt: { gte: new Date(Date.now() - rule.cooldownMinutes * 60000) }
                }
            });
            if (usageCount >= rule.maxUsesPerUser) {
                return false;
            }
        }

        const lowerMessage = message.toLowerCase();
        switch (rule.triggerType) {
            case 'KEYWORD':
                return lowerMessage.includes(rule.triggerValue.toLowerCase());
            case 'REGEX':
                return new RegExp(rule.triggerValue, 'i').test(message);
            case 'ALL':
                return true;
            default:
                return false;
        }
    }

    // --- 2️⃣ Bulk Messaging ---

    async sendBulkMessages(userbotConfigId, companyId, bulkMessageId) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);
            const bulkMessage = await this.prisma.telegramBulkMessage.findUnique({
                where: { id: bulkMessageId }
            });

            if (!bulkMessage || bulkMessage.status !== 'PENDING') {
                return { success: false, error: 'Bulk message not found or already processed' };
            }

            await this.prisma.telegramBulkMessage.update({
                where: { id: bulkMessageId },
                data: { status: 'IN_PROGRESS', startedAt: new Date() }
            });

            const recipients = bulkMessage.recipients;
            let sentCount = 0;
            let failedCount = 0;

            for (const recipient of recipients) {
                try {
                    const entity = await client.getEntity(recipient);
                    await client.sendMessage(entity, { message: bulkMessage.message });

                    await this.prisma.telegramBulkMessageLog.create({
                        data: {
                            id: require('crypto').randomUUID(),
                            bulkMessageId,
                            recipient,
                            status: 'SENT',
                            sentAt: new Date()
                        }
                    });

                    sentCount++;
                    await new Promise(resolve => setTimeout(resolve, bulkMessage.delayBetweenMessages));
                } catch (error) {
                    await this.prisma.telegramBulkMessageLog.create({
                        data: {
                            id: require('crypto').randomUUID(),
                            bulkMessageId,
                            recipient,
                            status: 'FAILED',
                            error: error.message
                        }
                    });
                    failedCount++;
                }

                await this.prisma.telegramBulkMessage.update({
                    where: { id: bulkMessageId },
                    data: { sentCount, failedCount }
                });
            }

            await this.prisma.telegramBulkMessage.update({
                where: { id: bulkMessageId },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    sentCount,
                    failedCount
                }
            });

            return { success: true, sentCount, failedCount };
        } catch (error) {
            await this.prisma.telegramBulkMessage.update({
                where: { id: bulkMessageId },
                data: { status: 'FAILED' }
            });
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    // --- 3️⃣ Message Scheduler ---

    async processScheduledMessages() {
        try {
            const now = new Date();
            const pending = await this.prisma.telegramScheduledMessage.findMany({
                where: {
                    status: 'PENDING',
                    scheduledTime: { lte: now }
                }
            });

            for (const msg of pending) {
                try {
                    const sendResult = await this.sendMessage(msg.userbotConfigId, msg.companyId, msg.chatId, msg.message);
                    
                    if (!sendResult || !sendResult.success) {
                        throw new Error(sendResult?.error || 'Unknown error during send');
                    }

                    await this.prisma.telegramScheduledMessage.update({
                        where: { id: msg.id },
                        data: { status: 'SENT', sentAt: new Date() }
                    });

                    if (msg.recurring && msg.recurringPattern) {
                        const nextTime = this._calculateNextRecurringTime(msg.scheduledTime, msg.recurringPattern);
                        await this.prisma.telegramScheduledMessage.create({
                            data: {
                                id: require('crypto').randomUUID(),
                                userbotConfigId: msg.userbotConfigId,
                                companyId: msg.companyId,
                                chatId: msg.chatId,
                                message: msg.message,
                                mediaUrl: msg.mediaUrl,
                                mediaType: msg.mediaType,
                                scheduledTime: nextTime,
                                recurring: true,
                                recurringPattern: msg.recurringPattern,
                                createdBy: msg.createdBy
                            }
                        });
                    }
                } catch (error) {
                    await this.prisma.telegramScheduledMessage.update({
                        where: { id: msg.id },
                        data: { status: 'FAILED', error: error.message }
                    });
                }
            }

            return { success: true, processed: pending.length };
        } catch (error) {
            console.error('Error processing scheduled messages:', error);
            return { success: false, error: error.message };
        }
    }

    _calculateNextRecurringTime(currentTime, pattern) {
        const next = new Date(currentTime);
        switch (pattern) {
            case 'DAILY':
                next.setDate(next.getDate() + 1);
                break;
            case 'WEEKLY':
                next.setDate(next.getDate() + 7);
                break;
            case 'MONTHLY':
                next.setMonth(next.getMonth() + 1);
                break;
        }
        return next;
    }

    // --- 4️⃣ Group Management ---

    async createChannel(userbotConfigId, companyId, title, about, isPublic = false) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);

            const result = await client.invoke(
                new Api.channels.CreateChannel({
                    title,
                    about,
                    broadcast: true,
                    megagroup: false
                })
            );

            const channelId = result.chats[0].id.toString();

            await this.prisma.telegramGroup.create({
                data: {
                    id: require('crypto').randomUUID(),
                    userbotConfigId,
                    companyId,
                    telegramId: channelId,
                    title,
                    type: 'CHANNEL',
                    description: about,
                    isPublic,
                    managedByUs: true
                }
            });

            return { success: true, channelId };
        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    async createGroup(userbotConfigId, companyId, title, users = []) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);

            const userEntities = [];
            for (const userId of users) {
                try {
                    const entity = await client.getEntity(userId);
                    userEntities.push(entity);
                } catch (e) {
                    console.warn(`Failed to get entity for ${userId}`);
                }
            }

            const result = await client.invoke(
                new Api.messages.CreateChat({
                    users: userEntities,
                    title
                })
            );

            const groupId = result.chats[0].id.toString();

            await this.prisma.telegramGroup.create({
                data: {
                    id: require('crypto').randomUUID(),
                    userbotConfigId,
                    companyId,
                    telegramId: groupId,
                    title,
                    type: 'GROUP',
                    managedByUs: true
                }
            });

            return { success: true, groupId };
        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    async addMembersToGroup(userbotConfigId, companyId, groupId, userIds) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);
            const group = await client.getEntity(groupId);

            const results = [];
            for (const userId of userIds) {
                try {
                    const user = await client.getEntity(userId);
                    await client.invoke(
                        new Api.channels.InviteToChannel({
                            channel: group,
                            users: [user]
                        })
                    );
                    results.push({ userId, success: true });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    results.push({ userId, success: false, error: error.message });
                }
            }

            return { success: true, results };
        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    async getGroupMembers(userbotConfigId, companyId, groupId, saveToDb = true) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);
            const group = await client.getEntity(groupId);

            const participants = await client.getParticipants(group, { limit: 10000 });

            const members = participants.map(p => ({
                id: p.id.toString(),
                firstName: p.firstName || '',
                lastName: p.lastName || '',
                username: p.username || null,
                phone: p.phone || null,
                isBot: p.bot || false,
                isPremium: p.premium || false
            }));

            if (saveToDb) {
                for (const member of members) {
                    await this.prisma.telegramContact.upsert({
                        where: {
                            telegramId_companyId: {
                                telegramId: member.id,
                                companyId
                            }
                        },
                        update: {
                            firstName: member.firstName,
                            lastName: member.lastName,
                            username: member.username,
                            phone: member.phone,
                            isBot: member.isBot,
                            isPremium: member.isPremium
                        },
                        create: {
                            id: require('crypto').randomUUID(),
                            userbotConfigId,
                            companyId,
                            telegramId: member.id,
                            firstName: member.firstName,
                            lastName: member.lastName,
                            username: member.username,
                            phone: member.phone,
                            isBot: member.isBot,
                            isPremium: member.isPremium,
                            source: 'GROUP_SCRAPE',
                            sourceGroupId: groupId
                        }
                    });
                }
            }

            return { success: true, count: members.length, members };
        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    // --- 5️⃣ Message Forwarding ---

    async forwardMessages(userbotConfigId, companyId, fromChatId, toChatId, messageIds) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);

            const fromChat = await client.getEntity(fromChatId);
            const toChat = await client.getEntity(toChatId);

            await client.forwardMessages(toChat, {
                messages: messageIds,
                fromPeer: fromChat
            });

            return { success: true };
        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    async setupAutoForward(userbotConfigId, companyId, ruleId) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);
            const rule = await this.prisma.telegramForwardRule.findUnique({
                where: { id: ruleId }
            });

            if (!rule || !rule.isActive) {
                return { success: false, error: 'Rule not found or inactive' };
            }

            client.addEventHandler(async (event) => {
                const message = event.message;
                const chatId = message.peerId.toString();

                if (rule.sourceChats.includes(chatId)) {
                    const passesFilter = this._passesForwardFilters(message, rule);
                    if (passesFilter) {
                        await this.forwardMessages(
                            userbotConfigId,
                            companyId,
                            chatId,
                            rule.targetChat,
                            [message.id]
                        );

                        await this.prisma.telegramForwardRule.update({
                            where: { id: ruleId },
                            data: { forwardCount: { increment: 1 } }
                        });
                    }
                }
            }, new Api.UpdateNewMessage({}));

            return { success: true };
        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    _passesForwardFilters(message, rule) {
        if (rule.filterKeywords && rule.filterKeywords.length > 0) {
            const text = (message.message || '').toLowerCase();
            const hasKeyword = rule.filterKeywords.some(kw => text.includes(kw.toLowerCase()));
            if (!hasKeyword) return false;
        }

        if (rule.filterMediaTypes && rule.filterMediaTypes.length > 0) {
            if (!message.media) return false;
            const mediaType = message.media.className;
            if (!rule.filterMediaTypes.includes(mediaType)) return false;
        }

        return true;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📥 UNIFIED INBOX INTEGRATION
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Enable or disable inbox integration for a userbot config.
     */
    async enableInbox(userbotConfigId, companyId, enabled = true) {
        try {
            await this.prisma.telegramConfig.update({
                where: { id: userbotConfigId },
                data: { inboxEnabled: enabled }
            });

            if (enabled) {
                // Setup the handler if we have a connected client
                try {
                    const client = await this._getClient(userbotConfigId, companyId);
                    this._setupInboxHandler(userbotConfigId, companyId, client);
                } catch (e) {
                    // Client might not be connected (no session yet) – that's ok,
                    // _getClient will auto-setup the handler when it connects
                    console.log(`📥 [INBOX] Userbot ${userbotConfigId} inbox enabled (client setup deferred)`);
                }
            } else {
                this._removeInboxHandler(userbotConfigId);
            }

            return { success: true, inboxEnabled: enabled };
        } catch (error) {
            console.error(`❌ [INBOX] Failed to toggle inbox:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Register an event handler that pipes incoming private messages into
     * the unified inbox (Conversation + Message records + socket events).
     */
    _setupInboxHandler(userbotConfigId, companyId, client) {
        // Remove existing handler first to avoid duplicates
        this._removeInboxHandler(userbotConfigId);

        const handlerFn = async (event) => {
            try {
                // Only private chats from other users (not self, not groups/channels)
                if (!event.message || event.message.out) return;
                if (!event.isPrivate) return;

                const message = event.message;
                const peerId = message.peerId;
                const senderId = peerId?.userId?.toString() || peerId?.toString();
                if (!senderId) return;

                const text = message.message || '';
                const fromUser = await message.getSender();

                const firstName = fromUser?.firstName || '';
                const lastName = fromUser?.lastName || '';
                const username = fromUser?.username || '';

                await this._processInboxMessage({
                    userbotConfigId,
                    companyId,
                    client,
                    senderId,
                    firstName,
                    lastName,
                    username,
                    text,
                    messageType: 'TEXT',
                    messageObj: message
                });
            } catch (err) {
                console.error(`❌ [INBOX-HANDLER] Error:`, err.message);
            }
        };

        const eventBuilder = new Api.UpdateNewMessage({});
        client.addEventHandler(handlerFn, eventBuilder);
        this.inboxHandlers.set(userbotConfigId, { handlerFn, eventBuilder });

        console.log(`📥 [INBOX] Inbox handler registered for userbot ${userbotConfigId}`);
    }

    _removeInboxHandler(userbotConfigId) {
        const existing = this.inboxHandlers.get(userbotConfigId);
        if (existing) {
            try {
                // We can't easily remove individual handlers from TelegramClient,
                // but storing the reference allows us to replace it
                this.inboxHandlers.delete(userbotConfigId);
                console.log(`📥 [INBOX] Inbox handler removed for userbot ${userbotConfigId}`);
            } catch (e) {
                console.warn(`⚠️ [INBOX] Error removing handler:`, e.message);
            }
        }
    }

    async _processInboxMessage({ userbotConfigId, companyId, client, senderId, firstName, lastName, username, text, messageType = 'TEXT', messageObj }) {
        const prisma = this.prisma;

        // Find or create customer
        let customer = await prisma.customer.findFirst({
            where: { telegramId: senderId, companyId }
        });
        if (!customer) {
            customer = await prisma.customer.create({
                data: {
                    telegramId: senderId,
                    firstName,
                    lastName,
                    companyId,
                    metadata: JSON.stringify({ username, source: 'telegram_userbot', userbotConfigId }),
                    status: 'LEAD'
                }
            });
        } else {
            // Update customer info
            await prisma.customer.update({
                where: { id: customer.id },
                data: { firstName: firstName || customer.firstName, lastName: lastName || customer.lastName }
            });
        }

        // Find or create conversation
        let conversation = await prisma.conversation.findFirst({
            where: {
                customerId: customer.id,
                companyId,
                channel: 'TELEGRAM',
                status: { in: ['ACTIVE', 'PENDING'] }
            }
        });
        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    customerId: customer.id,
                    companyId,
                    channel: 'TELEGRAM',
                    status: 'ACTIVE',
                    subject: 'Telegram Chat',
                    metadata: JSON.stringify({ userbotConfigId, isUserbot: true })
                }
            });
            socketService.emitNewConversation(companyId, conversation);
        }

        // Create message
        const msg = await prisma.message.create({
            data: {
                conversationId: conversation.id,
                content: text,
                type: messageType,
                isFromCustomer: true,
                metadata: JSON.stringify({ userbotConfigId })
            }
        });

        // Update conversation
        await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
                lastMessageAt: new Date(),
                lastMessagePreview: text.substring(0, 50),
                isRead: false,
                lastMessageIsFromCustomer: true
            }
        });

        // Emit socket event
        socketService.sendToConversationSecure(conversation.id, companyId, 'new_message', {
            ...msg,
            senderName: `${firstName} ${lastName}`.trim() || username || 'Unknown',
            platform: 'telegram',
            channel: 'TELEGRAM',
            companyId
        });
    }

    /**
     * Send a reply from the unified inbox using the userbot.
     * Looks up the userbot config from the conversation metadata.
     */
    async sendUserbotReply(conversationId, content, options = {}) {
        try {
            const prisma = this.prisma;
            const conversation = await prisma.conversation.findUnique({
                where: { id: conversationId },
                include: { customer: true }
            });

            if (!conversation || !conversation.customer || !conversation.customer.telegramId) {
                return { success: false, error: 'Customer or telegramId not found' };
            }

            const meta = conversation.metadata ? JSON.parse(conversation.metadata) : {};
            const userbotConfigId = meta.userbotConfigId;

            if (!userbotConfigId) {
                return { success: false, error: 'No userbot config linked to this conversation' };
            }

            const companyId = conversation.companyId;
            const client = await this._getClient(userbotConfigId, companyId);
            const chatId = conversation.customer.telegramId;

            const entity = await client.getEntity(chatId);
            await client.sendMessage(entity, { message: content });

            return { success: true };
        } catch (error) {
            console.error(`❌ [INBOX] sendUserbotReply error:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // --- 6️⃣ Search & Export ---

    async searchMessages(userbotConfigId, companyId, chatId, query, limit = 100) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);
            const entity = await client.getEntity(chatId);

            const result = await client.invoke(
                new Api.messages.Search({
                    peer: entity,
                    q: query,
                    filter: new Api.InputMessagesFilterEmpty(),
                    limit
                })
            );

            return {
                success: true,
                messages: result.messages.map(m => ({
                    id: m.id,
                    text: m.message,
                    date: m.date,
                    fromId: m.fromId?.toString()
                }))
            };
        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }
}

module.exports = new TelegramUserbotService();
