const express = require('express');
const request = require('supertest');

const mockTelegramUserbotService = {
    sendCode: jest.fn(),
    signIn: jest.fn(),
    getDialogs: jest.fn(),
    sendMessage: jest.fn(),
    getMessages: jest.fn(),
    downloadMedia: jest.fn(),
    sendFile: jest.fn(),
    logout: jest.fn()
};

jest.mock('../../services/TelegramUserbotService', () => mockTelegramUserbotService);

jest.mock('../../utils/verifyToken', () => ({
    authenticateToken: (req, _res, next) => {
        req.user = { id: 'user_1', companyId: 'company_1' };
        next();
    },
    requireCompanyAccess: (_req, _res, next) => next()
}));

const userbotRoutes = require('../../routes/userbotRoutes');

function createApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/v1/userbot', userbotRoutes);
    return app;
}

describe('userbotRoutes', () => {
    let app;

    beforeEach(() => {
        app = createApp();
        jest.clearAllMocks();
    });

    describe('POST /api/v1/userbot/login', () => {
        test('sends code successfully', async () => {
            mockTelegramUserbotService.sendCode.mockResolvedValue({ success: true, phoneCodeHash: 'hash123' });
            const res = await request(app)
                .post('/api/v1/userbot/login')
                .send({ userbotConfigId: 'cfg_1', phoneNumber: '+201234567890' });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        test('returns 400 when userbotConfigId missing', async () => {
            const res = await request(app)
                .post('/api/v1/userbot/login')
                .send({ phoneNumber: '+201234567890' });
            expect(res.status).toBe(400);
        });

        test('returns 400 when phoneNumber missing', async () => {
            const res = await request(app)
                .post('/api/v1/userbot/login')
                .send({ userbotConfigId: 'cfg_1' });
            expect(res.status).toBe(400);
        });

        test('service error returns 500', async () => {
            mockTelegramUserbotService.sendCode.mockResolvedValue({ success: false, error: 'API error' });
            const res = await request(app)
                .post('/api/v1/userbot/login')
                .send({ userbotConfigId: 'cfg_1', phoneNumber: '+201234567890' });
            expect(res.status).toBe(500);
        });
    });

    describe('POST /api/v1/userbot/verify', () => {
        test('verifies code successfully', async () => {
            mockTelegramUserbotService.signIn.mockResolvedValue({ success: true });
            const res = await request(app)
                .post('/api/v1/userbot/verify')
                .send({ userbotConfigId: 'cfg_1', code: '12345' });
            expect(res.status).toBe(200);
        });

        test('returns 401 on failed verification', async () => {
            mockTelegramUserbotService.signIn.mockResolvedValue({ success: false, error: 'Invalid code' });
            const res = await request(app)
                .post('/api/v1/userbot/verify')
                .send({ userbotConfigId: 'cfg_1', code: 'wrong' });
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/v1/userbot/dialogs', () => {
        test('returns dialogs list', async () => {
            mockTelegramUserbotService.getDialogs.mockResolvedValue({ success: true, data: [{ id: 'chat_1', name: 'Test' }] });
            const res = await request(app)
                .get('/api/v1/userbot/dialogs')
                .query({ userbotConfigId: 'cfg_1' });
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
        });

        test('returns 400 when userbotConfigId missing', async () => {
            const res = await request(app)
                .get('/api/v1/userbot/dialogs');
            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/v1/userbot/message', () => {
        test('sends message successfully', async () => {
            mockTelegramUserbotService.sendMessage.mockResolvedValue({ success: true });
            const res = await request(app)
                .post('/api/v1/userbot/message')
                .send({ userbotConfigId: 'cfg_1', chatId: 'chat_1', message: 'Hello' });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        test('returns 400 when chatId or message missing', async () => {
            const res = await request(app)
                .post('/api/v1/userbot/message')
                .send({ userbotConfigId: 'cfg_1' });
            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/v1/userbot/messages', () => {
        test('returns messages list', async () => {
            mockTelegramUserbotService.getMessages.mockResolvedValue({ success: true, data: [{ id: '1', text: 'Hi' }] });
            const res = await request(app)
                .get('/api/v1/userbot/messages')
                .query({ userbotConfigId: 'cfg_1', chatId: 'chat_1' });
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
        });
    });

    describe('POST /api/v1/userbot/logout', () => {
        test('logs out successfully', async () => {
            mockTelegramUserbotService.logout.mockResolvedValue({ success: true });
            const res = await request(app)
                .post('/api/v1/userbot/logout')
                .send({ userbotConfigId: 'cfg_1' });
            expect(res.status).toBe(200);
        });
    });

    describe('GET /api/v1/userbot/message/media', () => {
        test('returns media binary', async () => {
            mockTelegramUserbotService.downloadMedia.mockResolvedValue({
                success: true,
                buffer: Buffer.from('image-data'),
                mimeType: 'image/jpeg'
            });
            const res = await request(app)
                .get('/api/v1/userbot/message/media')
                .query({ userbotConfigId: 'cfg_1', chatId: 'chat_1', messageId: '1' });
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toBe('image/jpeg');
        });

        test('returns 404 when media not found', async () => {
            mockTelegramUserbotService.downloadMedia.mockResolvedValue({ success: false, error: 'Not found' });
            const res = await request(app)
                .get('/api/v1/userbot/message/media')
                .query({ userbotConfigId: 'cfg_1', chatId: 'chat_1', messageId: '1' });
            expect(res.status).toBe(404);
        });
    });
});
