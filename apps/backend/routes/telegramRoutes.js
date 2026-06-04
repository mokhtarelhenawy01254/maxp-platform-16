const express = require('express');
const router = express.Router();
const telegramBotService = require('../services/TelegramBotService');
const telegramUserbotService = require('../services/TelegramUserbotService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const verifyToken = require('../utils/verifyToken');
const { globalSecurity } = require('../middleware/globalSecurity');

// Apply security middleware to all routes
router.use(globalSecurity);

// Telegram Bot API webhook endpoint. The secret path segment is derived from
// the bot token and config id, so the endpoint can stay unauthenticated.
router.post('/webhook/:configId/:secret', async (req, res) => {
    try {
        const result = await telegramBotService.handleWebhookUpdate(
            req.params.configId,
            req.params.secret,
            req.body
        );

        if (!result.success) {
            return res.status(result.statusCode || 500).json({
                success: false,
                error: result.error || 'Webhook failed'
            });
        }

        return res.sendStatus(200);
    } catch (error) {
        console.error('❌ Telegram webhook error:', error);
        return res.status(500).json({ success: false, error: 'Webhook processing failed' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// 📱 Userbot Authentication Routes
// ═══════════════════════════════════════════════════════════════════════════════════════

// Step 1: Send verification code
router.post('/userbot/send-code', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { userbotConfigId, phoneNumber } = req.body;

        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Company ID required' });
        }

        if (!userbotConfigId || !phoneNumber) {
            return res.status(400).json({ success: false, error: 'Userbot ID and phone number are required' });
        }

        const result = await telegramUserbotService.sendCode(userbotConfigId, companyId, phoneNumber);

        res.json(result);
    } catch (error) {
        console.error('❌ Error sending code:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Step 2: Verify code and login
router.post('/userbot/login', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { userbotConfigId, code, password } = req.body;

        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Company ID required' });
        }

        if (!userbotConfigId || !code) {
            return res.status(400).json({ success: false, error: 'Userbot ID and code are required' });
        }

        const result = await telegramUserbotService.signIn(userbotConfigId, companyId, code, password);

        if (result.success) {
            res.json({ success: true, message: 'Logged in successfully' });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('❌ Error logging in:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get userbot connection status
router.get('/userbot/status/:userbotConfigId', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { userbotConfigId } = req.params;

        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Company ID required' });
        }

        const config = await getSharedPrismaClient().telegramConfig.findFirst({
            where: {
                id: userbotConfigId,
                companyId,
                type: 'USERBOT'
            }
        });

        if (!config) {
            return res.status(404).json({ success: false, error: 'Userbot not found' });
        }

        res.json({
            success: true,
            data: {
                id: config.id,
                label: config.label,
                clientPhone: config.clientPhone,
                isActive: config.isActive,
                requiresAuth: !config.sessionString
            }
        });
    } catch (error) {
        console.error('❌ Error getting userbot status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get userbot dialogs
router.get('/userbot/dialogs', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { userbotConfigId } = req.query;

        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Company ID required' });
        }

        if (!userbotConfigId) {
            return res.status(400).json({ success: false, error: 'Userbot ID is required' });
        }

        const result = await telegramUserbotService.getDialogs(userbotConfigId, companyId);
        res.json(result);
    } catch (error) {
        console.error('❌ Error getting dialogs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// 🤖 Telegram Bot Management Routes
// ═══════════════════════════════════════════════════════════════════════════════════════

// Get status of all bots for company
router.get('/settings/status/:companyId', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, async (req, res) => {
    try {
        const companyId = req.params.companyId;
        const userCompanyId = req.user?.companyId;

        // Verify company access
        if (companyId !== userCompanyId) {
            return res.status(403).json({ success: false, error: 'Unauthorized access' });
        }

        const bots = await getSharedPrismaClient().telegramConfig.findMany({
            where: {
                companyId,
                type: 'BOT'
            },
            select: {
                id: true,
                label: true,
                botName: true,
                botUsername: true,
                isActive: true,
                createdAt: true
            }
        });

        const formattedBots = bots.map(bot => ({
            id: bot.id,
            label: bot.label,
            username: bot.botUsername,
            running: bot.isActive && telegramBotService.bots.has(bot.id),
            active: bot.isActive
        }));

        res.json({
            success: true,
            bots: formattedBots
        });
    } catch (error) {
        console.error('❌ Error getting telegram status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Connect bot
router.post('/settings/connect', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { botToken, label } = req.body;

        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Company ID required' });
        }

        if (!botToken) {
            return res.status(400).json({ success: false, error: 'Bot token is required' });
        }

        // Create or update config
        const config = await getSharedPrismaClient().telegramConfig.create({
            data: {
                companyId,
                type: 'BOT',
                botToken,
                label: label || 'Telegram Bot',
                isActive: true
            }
        });

        // Start bot
        await telegramBotService.startBot(config.id, companyId, botToken);

        res.json({
            success: true,
            message: 'Bot connected successfully',
            data: {
                id: config.id,
                label: config.label
            }
        });
    } catch (error) {
        console.error('❌ Error connecting bot:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Disconnect bot
router.post('/settings/disconnect', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { id } = req.body;

        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Company ID required' });
        }

        if (!id) {
            return res.status(400).json({ success: false, error: 'Config ID is required' });
        }

        // Verify ownership
        const config = await getSharedPrismaClient().telegramConfig.findFirst({
            where: { id, companyId, type: 'BOT' }
        });

        if (!config) {
            return res.status(404).json({ success: false, error: 'Bot not found' });
        }

        // Stop bot
        await telegramBotService.stopBot(id);

        // Update config
        await getSharedPrismaClient().telegramConfig.update({
            where: { id },
            data: { isActive: false }
        });

        res.json({
            success: true,
            message: 'Bot disconnected successfully'
        });
    } catch (error) {
        console.error('❌ Error disconnecting bot:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Send reply from Dashboard -> Telegram User
router.post('/bot/send', async (req, res) => {
    try {
        const { conversationId, content, attachment } = req.body;

        if (!conversationId || !content) {
            return res.status(400).json({
                success: false,
                message: 'Missing conversationId or content'
            });
        }

        const result = await telegramBotService.sendReply(conversationId, content, attachment);

        if (result.success) {
            res.json({ success: true, message: 'Message sent via Telegram Bot' });
        } else {
            res.status(500).json({ success: false, message: result.error });
        }

    } catch (error) {
        console.error('❌ Error sending Telegram message:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// 📱 Userbot Management Routes
// ═══════════════════════════════════════════════════════════════════════════════════════

// Get all userbots for company
router.get('/userbots', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Company ID required' });
        }

        const userbots = await getSharedPrismaClient().telegramConfig.findMany({
            where: {
                companyId,
                type: 'USERBOT'
            },
            select: {
                id: true,
                label: true,
                apiId: true,
                apiHash: true,
                sessionString: true,
                clientPhone: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Mask sensitive data
        const safeUserbots = userbots.map(ub => ({
            ...ub,
            apiId: ub.apiId ? '***' + ub.apiId.slice(-4) : null,
            apiHash: ub.apiHash ? '***' + ub.apiHash.slice(-8) : null,
            sessionString: ub.sessionString ? '***' + ub.sessionString.slice(-10) : null
        }));

        res.json({
            success: true,
            data: safeUserbots
        });
    } catch (error) {
        console.error('❌ Error getting userbots:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Create new userbot
router.post('/userbots', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { label, apiId, apiHash } = req.body;

        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Company ID required' });
        }

        if (!apiId || !apiHash) {
            return res.status(400).json({ success: false, error: 'API ID and API Hash are required' });
        }

        const userbot = await getSharedPrismaClient().telegramConfig.create({
            data: {
                companyId,
                type: 'USERBOT',
                label: label || 'Telegram Userbot',
                apiId,
                apiHash,
                isActive: false
            }
        });

        res.json({
            success: true,
            data: {
                id: userbot.id,
                label: userbot.label,
                apiId: '***' + apiId.slice(-4),
                apiHash: '***' + apiHash.slice(-8),
                isActive: userbot.isActive
            }
        });
    } catch (error) {
        console.error('❌ Error creating userbot:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Delete userbot
router.delete('/userbots/:id', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { id } = req.params;

        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Company ID required' });
        }

        const userbot = await getSharedPrismaClient().telegramConfig.findFirst({
            where: {
                id,
                companyId,
                type: 'USERBOT'
            }
        });

        if (!userbot) {
            return res.status(404).json({ success: false, error: 'Userbot not found' });
        }

        await getSharedPrismaClient().telegramConfig.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: 'Userbot deleted successfully'
        });
    } catch (error) {
        console.error('❌ Error deleting userbot:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
