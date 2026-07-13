jest.mock('axios', () => ({
    post: jest.fn()
}));

jest.mock('../../services/sharedDatabase', () => ({
    getSharedPrismaClient: jest.fn()
}));

jest.mock('../../services/TelegramUserbotService', () => ({
    sendMessage: jest.fn()
}));

const axios = require('axios');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const telegramUserbotService = require('../../services/TelegramUserbotService');
const { TelegramAlertService } = require('../../services/telegramAlertService');

describe('telegramAlertService', () => {
    const originalEnv = process.env;
    let warnSpy;
    let errorSpy;
    let logSpy;

    beforeEach(() => {
        process.env = { ...originalEnv };
        delete process.env.TELEGRAM_ALERT_BOT_TOKEN;
        delete process.env.TELEGRAM_BOT_TOKEN;
        delete process.env.TELEGRAM_ADMIN_CHAT_ID;
        delete process.env.TELEGRAM_ALERT_CHAT_ID;
        delete process.env.TELEGRAM_ADMIN_CHAT_IDS;
        delete process.env.TELEGRAM_ALERT_CHAT_IDS;
        delete process.env.TELEGRAM_ALERT_BOT_CONFIG_ID;
        delete process.env.TELEGRAM_ALERT_COMPANY_ID;
        delete process.env.TELEGRAM_ALERT_USERBOT_CONFIG_ID;
        delete process.env.TELEGRAM_ALERT_USERBOT_COMPANY_ID;

        axios.post.mockReset();
        getSharedPrismaClient.mockReset();
        telegramUserbotService.sendMessage.mockReset();
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        process.env = originalEnv;
        warnSpy.mockRestore();
        errorSpy.mockRestore();
        logSpy.mockRestore();
    });

    test('sends through configured Bot API chat ids', async () => {
        process.env.NODE_ENV = 'production';
        process.env.TELEGRAM_ALERT_BOT_TOKEN = 'env-token';
        process.env.TELEGRAM_ADMIN_CHAT_ID = '111';
        process.env.TELEGRAM_ALERT_CHAT_IDS = '222,333';
        axios.post.mockResolvedValue({ data: { ok: true } });

        const service = new TelegramAlertService();
        await expect(service.sendAlert('Alert body')).resolves.toBe(true);

        expect(axios.post).toHaveBeenCalledTimes(3);
        expect(axios.post).toHaveBeenCalledWith(
            'https://api.telegram.org/botenv-token/sendMessage',
            expect.objectContaining({
                chat_id: '111',
                text: expect.stringContaining('Alert body'),
                parse_mode: 'Markdown'
            }),
            expect.objectContaining({ timeout: 5000 })
        );
        expect(getSharedPrismaClient).not.toHaveBeenCalled();
    });

    test('uses an active site bot token from the database when only chat id env is configured', async () => {
        process.env.TELEGRAM_ADMIN_CHAT_ID = '111';
        axios.post.mockResolvedValue({ data: { ok: true } });
        const findFirst = jest.fn().mockResolvedValue({
            id: 'bot-config-1',
            companyId: 'company-1',
            botToken: 'db-token'
        });
        getSharedPrismaClient.mockReturnValue({
            telegramConfig: { findFirst }
        });

        const service = new TelegramAlertService();
        await expect(service.sendAlert('Database bot alert')).resolves.toBe(true);

        expect(axios.post).toHaveBeenCalledWith(
            'https://api.telegram.org/botdb-token/sendMessage',
            expect.objectContaining({ chat_id: '111' }),
            expect.any(Object)
        );
        expect(telegramUserbotService.sendMessage).not.toHaveBeenCalled();
    });

    test('falls back to the active site userbot saved messages when no Bot API chat id exists', async () => {
        const findFirst = jest.fn()
            .mockResolvedValueOnce({
                id: 'bot-config-1',
                companyId: 'company-1',
                botToken: 'db-token'
            })
            .mockResolvedValueOnce({
                id: 'userbot-config-1',
                companyId: 'company-1'
            });
        getSharedPrismaClient.mockReturnValue({
            telegramConfig: { findFirst }
        });
        telegramUserbotService.sendMessage.mockResolvedValue({ success: true });

        const service = new TelegramAlertService();
        await expect(service.sendAlert('Saved messages alert')).resolves.toBe(true);

        expect(telegramUserbotService.sendMessage).toHaveBeenCalledWith(
            'userbot-config-1',
            'company-1',
            'me',
            expect.stringContaining('Saved messages alert')
        );
        expect(axios.post).not.toHaveBeenCalled();
    });

    test('returns false when no Telegram target can be resolved', async () => {
        getSharedPrismaClient.mockReturnValue({
            telegramConfig: {
                findFirst: jest.fn().mockResolvedValue(null)
            }
        });

        const service = new TelegramAlertService();
        await expect(service.sendAlert('No target alert')).resolves.toBe(false);

        expect(axios.post).not.toHaveBeenCalled();
        expect(telegramUserbotService.sendMessage).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No Telegram alert target configured'));
    });
});
