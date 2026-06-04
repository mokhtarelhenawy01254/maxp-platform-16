const axios = require('axios');

function splitChatIds(value) {
    if (!value) return [];
    return String(value)
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function unique(values) {
    return [...new Set(values.filter(Boolean))];
}

class TelegramAlertService {
    constructor() {
        this.botToken = process.env.TELEGRAM_ALERT_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
        this.chatIds = this.getConfiguredChatIds();
        this.chatId = this.chatIds[0];
        this.isEnabled = Boolean(this.botToken && this.chatIds.length);
        this.targetPromise = null;
        this.missingTargetWarningLogged = false;
    }

    getConfiguredChatIds() {
        return unique([
            ...splitChatIds(process.env.TELEGRAM_ADMIN_CHAT_ID),
            ...splitChatIds(process.env.TELEGRAM_ALERT_CHAT_ID),
            ...splitChatIds(process.env.TELEGRAM_ADMIN_CHAT_IDS),
            ...splitChatIds(process.env.TELEGRAM_ALERT_CHAT_IDS)
        ]);
    }

    buildAlertText(message) {
        const envLabel = process.env.NODE_ENV === 'production' ? '🔴 PRODUCTION' : '🟡 DEV';
        return `🚨 *SERVER ALERT*\nEnvironment: ${envLabel}\n\n${message}`;
    }

    async findDatabaseAlertTarget() {
        try {
            const { getSharedPrismaClient } = require('./sharedDatabase');
            const prisma = getSharedPrismaClient();
            const chatIds = this.getConfiguredChatIds();
            const alertBotConfigId = process.env.TELEGRAM_ALERT_BOT_CONFIG_ID;
            const alertCompanyId = process.env.TELEGRAM_ALERT_COMPANY_ID;

            let botConfig = null;
            if (!this.botToken || !alertCompanyId) {
                botConfig = await prisma.telegramConfig.findFirst({
                    where: {
                        type: 'BOT',
                        isActive: true,
                        botToken: { not: null },
                        ...(alertBotConfigId ? { id: alertBotConfigId } : {}),
                        ...(alertCompanyId ? { companyId: alertCompanyId } : {})
                    },
                    select: {
                        id: true,
                        companyId: true,
                        botToken: true
                    },
                    orderBy: { updatedAt: 'desc' }
                });
            }

            const dbBotToken = botConfig?.botToken;
            const botToken = this.botToken || dbBotToken;
            if (botToken && chatIds.length) {
                return {
                    type: 'bot',
                    botToken,
                    chatIds,
                    source: this.botToken ? 'environment' : 'telegram_config'
                };
            }

            const userbotConfigId = process.env.TELEGRAM_ALERT_USERBOT_CONFIG_ID;
            const userbotCompanyId = process.env.TELEGRAM_ALERT_USERBOT_COMPANY_ID
                || alertCompanyId
                || botConfig?.companyId;

            if (!userbotCompanyId && !userbotConfigId) {
                return null;
            }

            const userbotConfig = await prisma.telegramConfig.findFirst({
                where: {
                    type: 'USERBOT',
                    isActive: true,
                    sessionString: { not: null },
                    apiId: { not: null },
                    apiHash: { not: null },
                    ...(userbotConfigId ? { id: userbotConfigId } : {}),
                    ...(userbotCompanyId ? { companyId: userbotCompanyId } : {})
                },
                select: {
                    id: true,
                    companyId: true
                },
                orderBy: { updatedAt: 'desc' }
            });

            if (!userbotConfig) return null;

            return {
                type: 'userbot_saved_messages',
                userbotConfigId: userbotConfig.id,
                companyId: userbotConfig.companyId,
                source: userbotConfigId ? 'environment_userbot_config' : 'telegram_config_userbot'
            };
        } catch (error) {
            console.error('❌ [TELEGRAM-ALERT] Failed to resolve database alert target:', error.message);
            return null;
        }
    }

    async resolveAlertTarget() {
        const chatIds = this.getConfiguredChatIds();
        const botToken = process.env.TELEGRAM_ALERT_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
        if (botToken && chatIds.length) {
            return {
                type: 'bot',
                botToken,
                chatIds,
                source: 'environment'
            };
        }

        if (!this.targetPromise) {
            this.targetPromise = this.findDatabaseAlertTarget();
        }

        return await this.targetPromise;
    }

    async sendBotAlert(target, text) {
        const url = `https://api.telegram.org/bot${target.botToken}/sendMessage`;

        await Promise.all(target.chatIds.map((chatId) => axios.post(url, {
            chat_id: chatId,
            text,
            parse_mode: 'Markdown'
        }, {
            timeout: 5000
        })));
    }

    async sendUserbotSavedMessageAlert(target, text) {
        const telegramUserbotService = require('./TelegramUserbotService');
        const result = await telegramUserbotService.sendMessage(
            target.userbotConfigId,
            target.companyId,
            'me',
            text
        );

        if (!result || !result.success) {
            throw new Error(result?.error || 'Telegram userbot saved-message alert failed');
        }
    }

    async sendAlert(message) {
        const target = await this.resolveAlertTarget();
        if (!target) {
            if (!this.missingTargetWarningLogged) {
                console.warn('⚠️ [TELEGRAM-ALERT] No Telegram alert target configured. Set TELEGRAM_ADMIN_CHAT_ID or connect a Telegram userbot for the active site bot company.');
                this.missingTargetWarningLogged = true;
            }
            return false;
        }

        try {
            const text = this.buildAlertText(message);

            if (target.type === 'bot') {
                await this.sendBotAlert(target, text);
            } else if (target.type === 'userbot_saved_messages') {
                await this.sendUserbotSavedMessageAlert(target, text);
            } else {
                throw new Error(`Unsupported Telegram alert target type: ${target.type}`);
            }

            console.log(`✅ [TELEGRAM-ALERT] Alert dispatched successfully via ${target.source}.`);
            return true;
        } catch (error) {
            console.error('❌ [TELEGRAM-ALERT] Failed to send alert:', error.message);
            return false;
        }
    }

    async sendFatalError(errorName, errorMessage, stack = '') {
        const msg = `🔥 *FATAL CRASH (${errorName})*\n\n*Error:*\n\`${errorMessage}\`\n\n*Stack Trace:*\n\`${stack.substring(0, 1000)}...\``;
        await this.sendAlert(msg);
    }

    async sendApiError(req, err) {
        // We only want to alert for 500 Internal Server Errors, not 4xx client errors
        const status = err.status || 500;
        if (status !== 500) return;

        const method = req.method;
        const url = req.originalUrl;
        const errorMessage = err.message || 'Unknown Error';
        const stack = err.stack ? err.stack.substring(0, 500) : '';

        const msg = `⚠️ *API ERROR (500)*\n\n*Route:*\n\`${method} ${url}\`\n\n*Error:*\n\`${errorMessage}\`\n\n*Stack:*\n\`${stack}...\``;

        // Use non-blocking so we don't delay the API response
        this.sendAlert(msg).catch(e => console.error('Failed to send telegram API alert:', e.message));
    }
}

module.exports = new TelegramAlertService();
module.exports.TelegramAlertService = TelegramAlertService;
