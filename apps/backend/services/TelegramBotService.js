const { Telegraf } = require('telegraf');
const crypto = require('crypto');
const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
const socketService = require('./socketService');
const aiSdkClient = require('./aiSdkClient');
const { getEffectiveAiAutoReplySetting } = require('./aiSettingsResolver');

function buildWebhookSecret(configId, token) {
    return crypto
        .createHash('sha256')
        .update(`${configId}:${token}`)
        .digest('hex')
        .slice(0, 32);
}

function normalizeBaseUrl(value) {
    return String(value || '').trim().replace(/\/+$/, '');
}

class TelegramBotService {
    constructor() {
        this.bots = new Map();
        // this.prisma = getSharedPrismaClient(); // ❌ Removed to prevent stale client usage
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;
        try {
            const configs = await safeQuery(async () => {
                const prisma = getSharedPrismaClient();
                if (!prisma || !prisma.telegramConfig) {
                    throw new Error('Prisma client not initialized');
                }
                return await prisma.telegramConfig.findMany({
                    where: { isActive: true, botToken: { not: null } }
                });
            }, 'TelegramBotService');
            console.log(`🤖 [Telegram] Found ${configs.length} active bot configs`);
            for (const config of configs) {
                await this.startBot(config.id, config.companyId, config.botToken);
            }
            this.isInitialized = true;
            console.log('✅ [Telegram] Bot Manager initialized');
        } catch (error) {
            console.error('❌ Error initializing Telegram Bot Manager:', error);
        }
    }

    async _setWebhookWithRetry(bot, webhookUrl, maxRetries = 5) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                await bot.telegram.setWebhook(webhookUrl, {
                    allowed_updates: ['message', 'callback_query']
                });
                return;
            } catch (err) {
                if (err?.response?.error_code === 429 && attempt < maxRetries - 1) {
                    const retryAfter = (err.response?.parameters?.retry_after || 2) + 1;
                    const delay = Math.min(retryAfter * 1000, 30000);
                    console.warn(`⚠️ [Telegram] 429 rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
                    await new Promise(r => setTimeout(r, delay));
                } else {
                    throw err;
                }
            }
        }
    }

    async startBot(configId, companyId, token) {
        if (this.bots.has(configId)) {
            console.log(`⚠️ [Telegram] Bot ${configId} already running. Restarting...`);
            await this.stopBot(configId);
        }
        try {
            const bot = new Telegraf(token);
            bot.use(async (ctx, next) => {
                ctx.companyId = companyId;
                ctx.telegramConfigId = configId;
                await next();
            });
            bot.start((ctx) => this.handleStart(ctx, companyId));
            bot.on('text', (ctx) => this.handleTextMessage(ctx, companyId));
            bot.on('photo', (ctx) => this.handlePhotoMessage(ctx, companyId));
            bot.on('video', (ctx) => this.handleVideoMessage(ctx, companyId));
            bot.on('audio', (ctx) => this.handleAudioMessage(ctx, companyId));
            bot.on('voice', (ctx) => this.handleVoiceMessage(ctx, companyId));
            bot.on('document', (ctx) => this.handleDocumentMessage(ctx, companyId));
            bot.on('location', (ctx) => this.handleLocationMessage(ctx, companyId));
            bot.on('contact', (ctx) => this.handleContactMessage(ctx, companyId));
            bot.on('video_note', (ctx) => this.handleVideoNoteMessage(ctx, companyId));
            this.bots.set(configId, bot);

            const webhookBaseUrl = normalizeBaseUrl(process.env.TELEGRAM_WEBHOOK_BASE_URL || process.env.PUBLIC_API_BASE_URL);
            if (webhookBaseUrl) {
                const secret = buildWebhookSecret(configId, token);
                const webhookUrl = `${webhookBaseUrl}/api/v1/telegram/webhook/${configId}/${secret}`;
                await this._setWebhookWithRetry(bot, webhookUrl);
                console.log(`✅ [Telegram] Bot ${configId} webhook configured`);
            } else if (process.env.TELEGRAM_ENABLE_LONG_POLLING === 'true') {
                bot.launch().then(() => {
                    console.log(`✅ [Telegram] Bot ${configId} launched with long polling`);
                }).catch(err => {
                    console.error(`❌ [Telegram] Failed to launch bot ${configId}:`, err.message);
                });
            } else {
                console.log(`⚠️ [Telegram] Bot ${configId} setup complete (set TELEGRAM_WEBHOOK_BASE_URL to receive updates)`);
            }

            console.log(`✅ [Telegram] Bot ${configId} started`);
        } catch (error) {
            console.error(`❌ [Telegram] Error starting bot ${configId}:`, error);
        }
    }

    getWebhookSecret(configId, token) {
        return buildWebhookSecret(configId, token);
    }

    async handleWebhookUpdate(configId, providedSecret, update) {
        const config = await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            return await prisma.telegramConfig.findFirst({
                where: {
                    id: configId,
                    type: 'BOT',
                    isActive: true
                }
            });
        }, 'TelegramBotService.webhook');

        if (!config?.botToken) {
            return { success: false, statusCode: 404, error: 'Bot config not found' };
        }

        const expectedSecret = buildWebhookSecret(config.id, config.botToken);
        if (providedSecret !== expectedSecret) {
            return { success: false, statusCode: 401, error: 'Invalid webhook secret' };
        }

        if (!this.bots.has(config.id)) {
            await this.startBot(config.id, config.companyId, config.botToken);
        }

        const bot = this.bots.get(config.id);
        if (!bot) {
            return { success: false, statusCode: 503, error: 'Bot is not available' };
        }

        await bot.handleUpdate(update);
        return { success: true };
    }

    async stopBot(configId) {
        const bot = this.bots.get(configId);
        if (bot) {
            try {
                bot.stop();
                this.bots.delete(configId);
                console.log(`✅ [Telegram] Bot ${configId} stopped`);
            } catch (error) {
                console.error(`❌ [Telegram] Error stopping bot ${configId}:`, error);
            }
        }
    }

    async handleStart(ctx, companyId) {
        await ctx.reply('مرحباً بك! 👋\nنحن هنا لمساعدتك.');
    }

    async handleTextMessage(ctx, companyId) {
        try {
            const { id, first_name, last_name, username } = ctx.from;
            const text = ctx.message.text;
            await this.processMessage(companyId, id.toString(), {
                firstName: first_name || 'User',
                lastName: last_name || '',
                username: username
            }, text, 'TEXT', {
                telegramConfigId: ctx.telegramConfigId,
                telegramChatId: ctx.chat?.id ? String(ctx.chat.id) : undefined,
                telegramMessageId: ctx.message?.message_id
            });
        } catch (error) {
            console.error(`❌ [Telegram] Error handling message:`, error);
        }
    }

    async handlePhotoMessage(ctx, companyId) {
        try {
            const photo = ctx.message.photo[ctx.message.photo.length - 1];
            const fileLink = await ctx.telegram.getFileLink(photo.file_id);
            const text = ctx.message.caption ? `[Photo] ${ctx.message.caption}` : '[Photo]';
            await this.processMessage(companyId, ctx.from.id.toString(), {
                firstName: ctx.from.first_name || 'User',
                lastName: ctx.from.last_name || '',
                username: ctx.from.username
            }, text, 'IMAGE', { fileUrl: fileLink.href, telegramConfigId: ctx.telegramConfigId });
        } catch (error) {
            console.error(`❌ [Telegram] Error handling photo:`, error);
        }
    }

    async handleVideoMessage(ctx, companyId) {
        try {
            const video = ctx.message.video;
            const fileLink = await ctx.telegram.getFileLink(video.file_id);
            const text = ctx.message.caption ? `[Video] ${ctx.message.caption}` : '[Video]';
            await this.processMessage(companyId, ctx.from.id.toString(), {
                firstName: ctx.from.first_name || 'User',
                lastName: ctx.from.last_name || '',
                username: ctx.from.username
            }, text, 'VIDEO', {
                fileUrl: fileLink.href,
                fileName: video.file_name,
                fileSize: video.file_size,
                duration: video.duration,
                telegramConfigId: ctx.telegramConfigId
            });
        } catch (error) {
            console.error(`❌ [Telegram] Error handling video:`, error);
        }
    }

    async handleAudioMessage(ctx, companyId) {
        try {
            const audio = ctx.message.audio;
            const fileLink = await ctx.telegram.getFileLink(audio.file_id);
            const text = ctx.message.caption ? `[Audio] ${ctx.message.caption}` : '[Audio]';
            await this.processMessage(companyId, ctx.from.id.toString(), {
                firstName: ctx.from.first_name || 'User',
                lastName: ctx.from.last_name || '',
                username: ctx.from.username
            }, text, 'AUDIO', {
                fileUrl: fileLink.href,
                fileName: audio.file_name || audio.title,
                fileSize: audio.file_size,
                duration: audio.duration,
                telegramConfigId: ctx.telegramConfigId
            });
        } catch (error) {
            console.error(`❌ [Telegram] Error handling audio:`, error);
        }
    }

    async handleVoiceMessage(ctx, companyId) {
        try {
            const voice = ctx.message.voice;
            const fileLink = await ctx.telegram.getFileLink(voice.file_id);
            await this.processMessage(companyId, ctx.from.id.toString(), {
                firstName: ctx.from.first_name || 'User',
                lastName: ctx.from.last_name || '',
                username: ctx.from.username
            }, '[Voice Message]', 'VOICE', {
                fileUrl: fileLink.href,
                fileSize: voice.file_size,
                duration: voice.duration,
                telegramConfigId: ctx.telegramConfigId
            });
        } catch (error) {
            console.error(`❌ [Telegram] Error handling voice:`, error);
        }
    }

    async handleDocumentMessage(ctx, companyId) {
        try {
            const document = ctx.message.document;
            const fileLink = await ctx.telegram.getFileLink(document.file_id);
            const text = ctx.message.caption ? `[Document] ${ctx.message.caption}` : '[Document]';
            await this.processMessage(companyId, ctx.from.id.toString(), {
                firstName: ctx.from.first_name || 'User',
                lastName: ctx.from.last_name || '',
                username: ctx.from.username
            }, text, 'DOCUMENT', {
                fileUrl: fileLink.href,
                fileName: document.file_name,
                fileSize: document.file_size,
                mimeType: document.mime_type,
                telegramConfigId: ctx.telegramConfigId
            });
        } catch (error) {
            console.error(`❌ [Telegram] Error handling document:`, error);
        }
    }

    async handleLocationMessage(ctx, companyId) {
        try {
            const location = ctx.message.location;
            await this.processMessage(companyId, ctx.from.id.toString(), {
                firstName: ctx.from.first_name || 'User',
                lastName: ctx.from.last_name || '',
                username: ctx.from.username
            }, `[Location] ${location.latitude}, ${location.longitude}`, 'LOCATION', {
                latitude: location.latitude,
                longitude: location.longitude,
                telegramConfigId: ctx.telegramConfigId
            });
        } catch (error) {
            console.error(`❌ [Telegram] Error handling location:`, error);
        }
    }

    async handleContactMessage(ctx, companyId) {
        try {
            const contact = ctx.message.contact;
            await this.processMessage(companyId, ctx.from.id.toString(), {
                firstName: ctx.from.first_name || 'User',
                lastName: ctx.from.last_name || '',
                username: ctx.from.username
            }, `[Contact] ${contact.first_name} ${contact.last_name || ''} - ${contact.phone_number}`, 'CONTACT', {
                firstName: contact.first_name,
                lastName: contact.last_name,
                phoneNumber: contact.phone_number,
                userId: contact.user_id,
                telegramConfigId: ctx.telegramConfigId
            });
        } catch (error) {
            console.error(`❌ [Telegram] Error handling contact:`, error);
        }
    }

    async handleVideoNoteMessage(ctx, companyId) {
        try {
            const videoNote = ctx.message.video_note;
            const fileLink = await ctx.telegram.getFileLink(videoNote.file_id);
            await this.processMessage(companyId, ctx.from.id.toString(), {
                firstName: ctx.from.first_name || 'User',
                lastName: ctx.from.last_name || '',
                username: ctx.from.username
            }, '[Video Note]', 'VIDEO_NOTE', {
                fileUrl: fileLink.href,
                fileSize: videoNote.file_size,
                duration: videoNote.duration,
                length: videoNote.length,
                telegramConfigId: ctx.telegramConfigId
            });
        } catch (error) {
            console.error(`❌ [Telegram] Error handling video note:`, error);
        }
    }

    async processMessage(companyId, telegramId, userData, content, type = 'TEXT', metadata = {}) {
        await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            let customer = await prisma.customer.findFirst({
                where: { telegramId, companyId }
            });
            if (!customer) {
                customer = await prisma.customer.create({
                    data: {
                        telegramId,
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        companyId,
                        metadata: JSON.stringify({ username: userData.username }),
                        status: 'LEAD'
                    }
                });
            }
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
                        metadata: JSON.stringify({ lastTelegramConfigId: metadata.telegramConfigId })
                    }
                });
                socketService.emitNewConversation(companyId, conversation);
            }
            // Map Telegram message types to our message types
            const messageTypeMap = {
                'TEXT': 'TEXT',
                'IMAGE': 'IMAGE',
                'VIDEO': 'VIDEO',
                'AUDIO': 'AUDIO',
                'VOICE': 'AUDIO',
                'DOCUMENT': 'TEXT', // Documents are stored as TEXT with fileUrl in metadata
                'LOCATION': 'TEXT',
                'CONTACT': 'TEXT',
                'VIDEO_NOTE': 'VIDEO'
            };

            const messageType = messageTypeMap[type] || 'TEXT';

            const message = await prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    content: content,
                    type: messageType,
                    isFromCustomer: true,
                    metadata: JSON.stringify(metadata)
                }
            });
            await prisma.conversation.update({
                where: { id: conversation.id },
                data: {
                    lastMessageAt: new Date(),
                    lastMessagePreview: content.substring(0, 50),
                    isRead: false
                }
            });
            socketService.sendToConversationSecure(conversation.id, companyId, 'new_message', {
                ...message,
                senderName: `${customer.firstName} ${customer.lastName}`,
                platform: 'telegram',
                channel: 'TELEGRAM',
                companyId: companyId
            });

            // ── AI auto-reply (fire-and-forget, never blocks the webhook) ──────────────
            if (content && type === 'TEXT') {
                const configId = metadata.telegramConfigId;
                setImmediate(async () => {
                    try {
                        const aiSetting = await getEffectiveAiAutoReplySetting(companyId, prisma);
                        if (!aiSetting?.autoReplyEnabled) { console.log('🤖 [TG-AI-AUTOREPLY] AI auto-reply disabled for company'); return; }
                        if (aiSetting.workingHoursEnabled && aiSetting.workingHours) {
                            try {
                                const hours = JSON.parse(typeof aiSetting.workingHours === 'string' ? aiSetting.workingHours : '{}');
                                const now = new Date();
                                const dayName = now.toLocaleString('en', { weekday: 'long', timeZone: 'Africa/Cairo' }).toLowerCase();
                                const today = hours[dayName];
                                if (today && !today.enabled) { console.log('🤖 [TG-AI-AUTOREPLY] Outside working hours (day disabled)'); return; }
                                if (today && today.start && today.end) {
                                    const currentMinutes = now.getHours() * 60 + now.getMinutes();
                                    const [startH, startM] = today.start.split(':').map(Number);
                                    const [endH, endM] = today.end.split(':').map(Number);
                                    const startMin = startH * 60 + startM;
                                    const endMin = endH * 60 + endM;
                                    if (currentMinutes < startMin || currentMinutes > endMin) { console.log('🤖 [TG-AI-AUTOREPLY] Outside working hours (time)'); return; }
                                }
                            } catch(e) { /* continue if parsing fails */ }
                        }

                        if (conversation && conversation.aiEnabled === false) {
                            console.log('🤖 [TG-AI-AUTOREPLY] AI auto-reply disabled for conversation');
                            return;
                        }

                        const result = await aiSdkClient.sendChatMessage({
                            companyId,
                            customerId: customer.id,
                            message: content,
                            threadId: conversation.id,
                            channel: 'TELEGRAM',
                        });

                        // Silent Escalation: AI failed → flag for human takeover, send nothing to customer
                        if (result && (result.status === 'escalated' || (result.escalation && !result.reply))) {
                            const { flagThreadForHumanTakeover } = require('./silentEscalationService');
                            await flagThreadForHumanTakeover({
                                companyId,
                                conversationId: conversation.id,
                                customerId: customer.id,
                                reason: result.escalation?.reason || 'ai_failure',
                                customerMessage: content,
                                channel: 'TELEGRAM',
                            });
                            return;
                        }

                        const replyText = result.reply;
                        if (replyText && configId && telegramId) {
                            const bot = this.bots.get(configId);
                            if (bot) {
                                await bot.telegram.sendMessage(telegramId, replyText);
                                // Save AI reply to public.messages for conversation continuity
                                try {
                                    const { getSharedPrismaClient } = require('./sharedDatabase');
                                    await getSharedPrismaClient().message.create({
                                        data: {
                                            conversationId: conversation.id,
                                            content: replyText,
                                            type: 'TEXT',
                                            isFromCustomer: false,
                                            metadata: JSON.stringify({ platform: 'telegram', source: 'ai_reply' }),
                                        },
                                    });
                                } catch (e) {
                                    console.error('❌ [TG-AI-AUTOREPLY] Failed to save AI reply to DB:', e.message);
                                }
                                console.log(`✅ [TG-AI-AUTOREPLY] AI reply sent to Telegram user ${telegramId}`);
                            }
                        }
                    } catch (e) {
                        console.error('❌ [TG-AI-AUTOREPLY] Error generating or sending AI reply:', e.message);
                    }
                });
            }
        });
    }

    async sendDirectMessage({ configId, companyId, chatId, content }) {
        let bot = configId ? this.bots.get(configId) : null;

        if (!bot) {
            const config = await safeQuery(async () => {
                const prisma = getSharedPrismaClient();
                return await prisma.telegramConfig.findFirst({
                    where: {
                        ...(configId ? { id: configId } : { companyId }),
                        companyId,
                        isActive: true,
                        type: 'BOT'
                    }
                });
            }, 'TelegramBotService.directMessage');

            if (config) {
                if (!this.bots.has(config.id)) {
                    await this.startBot(config.id, config.companyId, config.botToken);
                }
                bot = this.bots.get(config.id);
            }
        }

        if (!bot) {
            return { success: false, error: 'No active bot found' };
        }

        await bot.telegram.sendMessage(chatId, content);
        return { success: true };
    }

    async sendReply(conversationId, content, options = {}) {
        const conversation = await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            return await prisma.conversation.findUnique({
                where: { id: conversationId },
                include: { customer: true }
            });
        });

        if (!conversation || !conversation.customer || !conversation.customer.telegramId) {
            return { success: false, error: 'Customer not found' };
        }
        const meta = conversation.metadata ? JSON.parse(conversation.metadata) : {};
        const configId = meta.lastTelegramConfigId;

        // If no specific config ID, try to find one for the company
        let bot;
        if (configId) {
            bot = this.bots.get(configId);
        }

        if (!bot) {
            // Fallback: try to find any active bot for this company
            const config = await safeQuery(async () => {
                const prisma = getSharedPrismaClient();
                return await prisma.telegramConfig.findFirst({
                    where: { companyId: conversation.companyId, isActive: true }
                });
            });

            if (config) {
                if (!this.bots.has(config.id)) {
                    await this.startBot(config.id, config.companyId, config.botToken);
                }
                bot = this.bots.get(config.id);
            }
        }

        if (!bot) {
            return { success: false, error: 'No active bot found' };
        }

        try {
            const telegramId = conversation.customer.telegramId;
            const messageOptions = {
                reply_to_message_id: options.replyToMessageId || undefined,
                parse_mode: 'HTML'
            };

            // Handle different message types
            if (options.type === 'video' && options.fileUrl) {
                await bot.telegram.sendVideo(telegramId, options.fileUrl, {
                    caption: content || undefined,
                    ...messageOptions
                });
            } else if (options.type === 'audio' && options.fileUrl) {
                await bot.telegram.sendAudio(telegramId, options.fileUrl, {
                    caption: content || undefined,
                    ...messageOptions
                });
            } else if (options.type === 'voice' && options.fileUrl) {
                await bot.telegram.sendVoice(telegramId, options.fileUrl, messageOptions);
            } else if (options.type === 'document' && options.fileUrl) {
                await bot.telegram.sendDocument(telegramId, options.fileUrl, {
                    caption: content || undefined,
                    ...messageOptions
                });
            } else if (options.type === 'location' && options.latitude && options.longitude) {
                await bot.telegram.sendLocation(telegramId, options.latitude, options.longitude, messageOptions);
            } else if (options.type === 'contact' && options.phoneNumber) {
                await bot.telegram.sendContact(telegramId, options.phoneNumber, options.firstName || '', {
                    last_name: options.lastName,
                    ...messageOptions
                });
            } else {
                // Default: Send text message or images
                if (content && content.trim()) {
                    await bot.telegram.sendMessage(telegramId, content, messageOptions);
                }

                // Send images if they exist (backward compatibility)
                const imageUrls = options.imageUrls || options.attachment || [];
                if (imageUrls && imageUrls.length > 0) {
                    for (const url of imageUrls) {
                        await bot.telegram.sendPhoto(telegramId, url, {
                            caption: content || undefined,
                            ...messageOptions
                        });
                    }
                }
            }

            return { success: true };
        } catch (error) {
            console.error(`❌ [Telegram] Failed to send reply:`, error);
            return { success: false, error: error.message };
        }
    }

    async editMessage(conversationId, messageId, newContent) {
        // Note: Telegram requires message_id from Telegram, not our internal ID
        // This would need to be stored in message metadata
        const conversation = await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            return await prisma.conversation.findUnique({
                where: { id: conversationId },
                include: { customer: true }
            });
        });

        if (!conversation || !conversation.customer || !conversation.customer.telegramId) {
            return { success: false, error: 'Customer not found' };
        }

        const message = await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            return await prisma.message.findUnique({
                where: { id: messageId }
            });
        });

        if (!message || message.conversationId !== conversationId) {
            return { success: false, error: 'Message not found' };
        }

        const metadata = message.metadata ? JSON.parse(message.metadata) : {};
        const telegramMessageId = metadata.telegramMessageId;

        if (!telegramMessageId) {
            return { success: false, error: 'Telegram message ID not found' };
        }

        const meta = conversation.metadata ? JSON.parse(conversation.metadata) : {};
        const configId = meta.lastTelegramConfigId;
        let bot = configId ? this.bots.get(configId) : null;

        if (!bot) {
            const config = await safeQuery(async () => {
                const prisma = getSharedPrismaClient();
                return await prisma.telegramConfig.findFirst({
                    where: { companyId: conversation.companyId, isActive: true }
                });
            });

            if (config) {
                if (!this.bots.has(config.id)) {
                    await this.startBot(config.id, config.companyId, config.botToken);
                }
                bot = this.bots.get(config.id);
            }
        }

        if (!bot) {
            return { success: false, error: 'No active bot found' };
        }

        try {
            await bot.telegram.editMessageText(
                conversation.customer.telegramId,
                telegramMessageId,
                undefined,
                newContent
            );

            // Update message in database
            await safeQuery(async () => {
                const prisma = getSharedPrismaClient();
                await prisma.message.update({
                    where: { id: messageId },
                    data: { content: newContent }
                });
            });

            return { success: true };
        } catch (error) {
            console.error(`❌ [Telegram] Failed to edit message:`, error);
            return { success: false, error: error.message };
        }
    }

    async deleteMessage(conversationId, messageId) {
        const conversation = await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            return await prisma.conversation.findUnique({
                where: { id: conversationId },
                include: { customer: true }
            });
        });

        if (!conversation || !conversation.customer || !conversation.customer.telegramId) {
            return { success: false, error: 'Customer not found' };
        }

        const message = await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            return await prisma.message.findUnique({
                where: { id: messageId }
            });
        });

        if (!message || message.conversationId !== conversationId) {
            return { success: false, error: 'Message not found' };
        }

        const metadata = message.metadata ? JSON.parse(message.metadata) : {};
        const telegramMessageId = metadata.telegramMessageId;

        if (!telegramMessageId) {
            return { success: false, error: 'Telegram message ID not found' };
        }

        const meta = conversation.metadata ? JSON.parse(conversation.metadata) : {};
        const configId = meta.lastTelegramConfigId;
        let bot = configId ? this.bots.get(configId) : null;

        if (!bot) {
            const config = await safeQuery(async () => {
                const prisma = getSharedPrismaClient();
                return await prisma.telegramConfig.findFirst({
                    where: { companyId: conversation.companyId, isActive: true }
                });
            });

            if (config) {
                if (!this.bots.has(config.id)) {
                    await this.startBot(config.id, config.companyId, config.botToken);
                }
                bot = this.bots.get(config.id);
            }
        }

        if (!bot) {
            return { success: false, error: 'No active bot found' };
        }

        try {
            await bot.telegram.deleteMessage(conversation.customer.telegramId, telegramMessageId);
            return { success: true };
        } catch (error) {
            console.error(`❌ [Telegram] Failed to delete message:`, error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new TelegramBotService();
