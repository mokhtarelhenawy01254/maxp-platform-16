const bigInt = require('big-integer');

const mockApi = { auth: { SignIn: class {} }, account: { GetPassword: class {} }, messages: { GetHistory: class {} }, InputPeerUser: class {}, InputPeerChannel: class {}, InputPeerChat: class {} };
const mockTelegramClient = jest.fn();
const mockStringSession = jest.fn();

jest.mock('telegram', () => ({
    TelegramClient: mockTelegramClient,
    Api: mockApi
}));

jest.mock('telegram/sessions', () => ({
    StringSession: mockStringSession
}));

jest.mock('telegram/Password', () => ({
    computeCheck: jest.fn()
}));

const mockPrisma = {
    telegramConfig: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn()
    }
};
jest.mock('../../services/sharedDatabase', () => ({
    getSharedPrismaClient: jest.fn(() => mockPrisma)
}));

jest.mock('../../services/socketService', () => ({}));

jest.mock('fs', () => ({ writeFileSync: jest.fn(), unlinkSync: jest.fn(), existsSync: jest.fn() }));
jest.mock('os', () => ({ tmpdir: () => '/tmp' }));

const telegramUserbotService = require('../../services/TelegramUserbotService');

function mockTelegramClientInstance(overrides = {}) {
    return {
        connected: true,
        connect: jest.fn(),
        disconnect: jest.fn(),
        session: { save: () => 'new-session' },
        invoke: jest.fn(),
        getMessages: jest.fn(),
        getDialogs: jest.fn(),
        sendMessage: jest.fn(),
        sendCode: jest.fn(),
        downloadMedia: jest.fn(),
        getEntity: jest.fn(),
        constructor: { name: 'TelegramClient' },
        ...overrides
    };
}

describe('TelegramUserbotService', () => {
    const userbotConfigId = 'cfg_1';
    const companyId = 'company_1';
    const phoneNumber = '+201234567890';

    beforeEach(() => {
        jest.clearAllMocks();
        require('../../services/sharedDatabase').getSharedPrismaClient.mockReturnValue(mockPrisma);
        telegramUserbotService.clients.clear();
    });

    describe('helpers', () => {
        describe('_normalizePhone', () => {
            test('strips whitespace, dashes, and parentheses', () => {
                expect(telegramUserbotService._normalizePhone('+20 123-456 (789)')).toBe('+20123456789');
            });
            test('returns empty string for null/empty', () => {
                expect(telegramUserbotService._normalizePhone(null)).toBe('');
                expect(telegramUserbotService._normalizePhone('')).toBe('');
            });
        });

        describe('_telegramLongToString', () => {
            test('converts BigInt to string', () => {
                expect(telegramUserbotService._telegramLongToString(BigInt('123456789'))).toBe('123456789');
            });
            test('returns null for undefined/null', () => {
                expect(telegramUserbotService._telegramLongToString(undefined)).toBeNull();
                expect(telegramUserbotService._telegramLongToString(null)).toBeNull();
            });
        });

        describe('_serializeInputPeer', () => {
            test('serializes InputPeerUser', () => {
                const result = telegramUserbotService._serializeInputPeer({
                    className: 'InputPeerUser', userId: BigInt('123'), accessHash: BigInt('456')
                });
                expect(result).toMatchObject({ className: 'InputPeerUser', userId: '123', id: '123', accessHash: '456', peerType: 'user' });
            });
            test('returns null for missing className', () => {
                expect(telegramUserbotService._serializeInputPeer({})).toBeNull();
            });
        });

        describe('_parseChatReference', () => {
            test('parses inputPeer from JSON string', () => {
                const ref = telegramUserbotService._parseChatReference({
                    inputPeer: '{"className":"InputPeerUser","userId":"123"}'
                });
                expect(ref.inputPeer).toEqual({ className: 'InputPeerUser', userId: '123' });
            });
            test('handles null input', () => {
                expect(telegramUserbotService._parseChatReference(null)).toEqual({});
            });
        });

        describe('_buildInputPeerFromReference', () => {
            test('builds InputPeerUser with valid accessHash', () => {
                const peer = telegramUserbotService._buildInputPeerFromReference('123456', {
                    inputPeer: { className: 'InputPeerUser', userId: '123456', accessHash: '123456' }
                });
                expect(peer).toBeDefined();
            });
            test('returns null when accessHash missing', () => {
                const peer = telegramUserbotService._buildInputPeerFromReference('user123', {
                    inputPeer: { className: 'InputPeerUser', userId: 'user123' }
                });
                expect(peer).toBeNull();
            });
        });
    });

    describe('_getSession (security: companyId)', () => {
        test('filters by companyId when provided', async () => {
            mockPrisma.telegramConfig.findFirst.mockResolvedValue({
                id: userbotConfigId, sessionString: 'session-data'
            });
            const session = await telegramUserbotService._getSession(userbotConfigId, companyId);
            expect(mockPrisma.telegramConfig.findFirst).toHaveBeenCalledWith({
                where: { id: userbotConfigId, type: 'USERBOT', companyId: companyId }
            });
            expect(session).toBe('session-data');
        });

        test('returns empty string when config not found', async () => {
            mockPrisma.telegramConfig.findFirst.mockResolvedValue(null);
            const session = await telegramUserbotService._getSession(userbotConfigId, companyId);
            expect(session).toBe('');
        });
    });

    describe('_getClient', () => {
        test('returns existing valid in-memory client', async () => {
            const client = mockTelegramClientInstance();
            telegramUserbotService.clients.set(userbotConfigId, client);
            const result = await telegramUserbotService._getClient(userbotConfigId, companyId);
            expect(result).toBe(client);
        });

        test('throws when config not found', async () => {
            mockPrisma.telegramConfig.findFirst.mockResolvedValue(null);
            await expect(telegramUserbotService._getClient(userbotConfigId, companyId))
                .rejects.toThrow('Userbot configuration not found or missing API credentials');
        });

        test('throws when no session string', async () => {
            mockPrisma.telegramConfig.findFirst
                .mockResolvedValueOnce({ id: userbotConfigId, apiId: '12345', apiHash: 'hash' })
                .mockResolvedValueOnce(null);
            await expect(telegramUserbotService._getClient(userbotConfigId, companyId))
                .rejects.toThrow('Not logged in (No session found)');
        });

        test('creates client from session and saves updated session', async () => {
            const client = mockTelegramClientInstance();
            mockTelegramClient.mockImplementation(() => client);
            mockStringSession.mockImplementation(() => ({}));
            mockPrisma.telegramConfig.findFirst
                .mockResolvedValueOnce({ id: userbotConfigId, apiId: '12345', apiHash: 'hash' })
                .mockResolvedValueOnce({ id: userbotConfigId, sessionString: 'old-session' });
            mockPrisma.telegramConfig.update.mockResolvedValue({});

            const result = await telegramUserbotService._getClient(userbotConfigId, companyId);
            expect(result).toBe(client);
            expect(client.connect).toHaveBeenCalled();
            expect(mockPrisma.telegramConfig.update).toHaveBeenCalledWith({
                where: { id: userbotConfigId },
                data: expect.objectContaining({ sessionString: 'new-session', isActive: true })
            });
        });
    });

    describe('_handleAuthError', () => {
        test('clears session on AUTH_KEY_UNREGISTERED', async () => {
            mockPrisma.telegramConfig.updateMany.mockResolvedValue({ count: 1 });
            const result = await telegramUserbotService._handleAuthError(new Error('AUTH_KEY_UNREGISTERED'), userbotConfigId, companyId);
            expect(result.requiresReauth).toBe(true);
            expect(mockPrisma.telegramConfig.updateMany).toHaveBeenCalledWith({
                where: { id: userbotConfigId, companyId, type: 'USERBOT' },
                data: expect.objectContaining({ sessionString: null, isActive: false })
            });
        });

        test('handles 401 code', async () => {
            mockPrisma.telegramConfig.updateMany.mockResolvedValue({ count: 1 });
            const result = await telegramUserbotService._handleAuthError({ code: 401 }, userbotConfigId, companyId);
            expect(result.requiresReauth).toBe(true);
        });

        test('passes through non-auth errors', async () => {
            const result = await telegramUserbotService._handleAuthError(new Error('FLOOD_WAIT'), userbotConfigId, companyId);
            expect(result.error).toBe('FLOOD_WAIT');
            expect(mockPrisma.telegramConfig.updateMany).not.toHaveBeenCalled();
        });
    });

    describe('sendCode', () => {
        const mockClient = mockTelegramClientInstance({ sendCode: jest.fn() });

        beforeEach(() => {
            mockTelegramClient.mockImplementation(() => mockClient);
            mockStringSession.mockImplementation(() => ({}));
            mockClient.sendCode.mockResolvedValue({ phoneCodeHash: 'hash123' });
            mockPrisma.telegramConfig.findFirst.mockResolvedValue({ id: userbotConfigId, apiId: '12345', apiHash: 'hash' });
            mockPrisma.telegramConfig.update.mockResolvedValue({});
        });

        test('sends code successfully', async () => {
            const result = await telegramUserbotService.sendCode(userbotConfigId, companyId, phoneNumber);
            expect(result.success).toBe(true);
            expect(result.phoneCodeHash).toBe('hash123');
        });

        test('returns error when API credentials missing', async () => {
            mockPrisma.telegramConfig.findFirst.mockResolvedValue({ id: userbotConfigId, apiId: null, apiHash: null });
            const result = await telegramUserbotService.sendCode(userbotConfigId, companyId, phoneNumber);
            expect(result.success).toBe(false);
            expect(result.error).toBe('API credentials not configured.');
        });

        test('returns PHONE_ALREADY_LINKED for duplicate phone', async () => {
            mockPrisma.telegramConfig.findFirst
                .mockResolvedValueOnce({ id: userbotConfigId, apiId: '12345', apiHash: 'hash' })
                .mockResolvedValueOnce({ id: 'cfg_2', label: 'Existing', isActive: true, sessionString: 'sess', clientPhone: '+201234567890' });
            const result = await telegramUserbotService.sendCode(userbotConfigId, companyId, phoneNumber);
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('PHONE_ALREADY_LINKED');
        });

        test('persists temp auth data', async () => {
            await telegramUserbotService.sendCode(userbotConfigId, companyId, phoneNumber);
            expect(mockPrisma.telegramConfig.update).toHaveBeenCalledWith({
                where: { id: userbotConfigId },
                data: expect.objectContaining({
                    clientPhone: '+201234567890', tempAuthSession: 'new-session', tempPhoneCodeHash: 'hash123'
                })
            });
        });
    });

    describe('signIn', () => {
        const mockClient = mockTelegramClientInstance();

        beforeEach(() => {
            mockClient.invoke.mockResolvedValue({});
            mockPrisma.telegramConfig.update.mockResolvedValue({});
            mockPrisma.telegramConfig.findFirst.mockResolvedValue({ id: userbotConfigId, inboxEnabled: false });
        });

        test('signs in from memory', async () => {
            telegramUserbotService.clients.set(userbotConfigId, { client: mockClient, phoneNumber, phoneCodeHash: 'hash123' });
            mockPrisma.telegramConfig.findFirst
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({ id: userbotConfigId, inboxEnabled: false });
            const result = await telegramUserbotService.signIn(userbotConfigId, companyId, '12345');
            expect(result.success).toBe(true);
            expect(mockPrisma.telegramConfig.update).toHaveBeenCalledWith({
                where: { id: userbotConfigId },
                data: expect.objectContaining({ sessionString: 'new-session', isActive: true })
            });
        });

        test('requests password when SESSION_PASSWORD_NEEDED', async () => {
            telegramUserbotService.clients.set(userbotConfigId, { client: mockClient, phoneNumber, phoneCodeHash: 'hash123' });
            mockApi.auth.CheckPassword = jest.fn();
            mockClient.invoke
                .mockRejectedValueOnce({ errorMessage: 'SESSION_PASSWORD_NEEDED' })
                .mockResolvedValueOnce({ some: 'hash' })
                .mockResolvedValueOnce({});
            mockPrisma.telegramConfig.findFirst
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({ id: userbotConfigId, inboxEnabled: false });

            const result = await telegramUserbotService.signIn(userbotConfigId, companyId, '12345', 'mypassword');
            expect(result.success).toBe(true);
        });

        test('returns requiresPassword when 2FA enabled but no password given', async () => {
            telegramUserbotService.clients.set(userbotConfigId, { client: mockClient, phoneNumber, phoneCodeHash: 'hash123' });
            mockClient.invoke.mockRejectedValueOnce({ errorMessage: 'SESSION_PASSWORD_NEEDED' });
            mockPrisma.telegramConfig.findFirst.mockResolvedValueOnce(null);
            const result = await telegramUserbotService.signIn(userbotConfigId, companyId, '12345');
            expect(result.requiresPassword).toBe(true);
        });

        test('returns error when session expired', async () => {
            const result = await telegramUserbotService.signIn(userbotConfigId, companyId, '12345');
            expect(result.success).toBe(false);
        });
    });

    describe('sendMessage', () => {
        const mockClient = mockTelegramClientInstance();

        beforeEach(() => {
            telegramUserbotService.clients.set(userbotConfigId, mockClient);
            jest.spyOn(telegramUserbotService, '_resolveChatEntity').mockResolvedValue({ className: 'InputPeerUser' });
        });

        test('sends message successfully', async () => {
            const result = await telegramUserbotService.sendMessage(userbotConfigId, companyId, 'user123', 'Hello!', { peerType: 'user' });
            expect(result.success).toBe(true);
            expect(mockClient.sendMessage).toHaveBeenCalledWith({ className: 'InputPeerUser' }, { message: 'Hello!' });
        });

        test('handles auth error', async () => {
            jest.spyOn(telegramUserbotService, '_getClient').mockRejectedValue(new Error('AUTH_KEY_UNREGISTERED'));
            jest.spyOn(telegramUserbotService, '_handleAuthError').mockResolvedValue({
                success: false, error: 'AUTH_KEY_UNREGISTERED', requiresReauth: true
            });
            const result = await telegramUserbotService.sendMessage(userbotConfigId, companyId, 'user123', 'Hello!');
            expect(result.requiresReauth).toBe(true);
        });
    });

    describe('getMessages', () => {
        const mockClient = mockTelegramClientInstance();

        beforeEach(() => {
            telegramUserbotService.clients.set(userbotConfigId, mockClient);
            jest.spyOn(telegramUserbotService, '_resolveChatEntity').mockResolvedValue({ className: 'InputPeerUser' });
        });

        test('fetches and formats messages', async () => {
            mockClient.getMessages.mockResolvedValue([
                { id: 1, message: 'Hello', date: 1710000000, out: true, fromId: null, media: null },
                { id: 2, message: 'World', date: 1710000010, out: false, fromId: null, media: null }
            ]);
            const result = await telegramUserbotService.getMessages(userbotConfigId, companyId, 'user123', 50);
            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.data[0].isOut).toBe(true);
            expect(result.data[1].isOut).toBe(false);
        });

        test('falls back to GetHistory', async () => {
            mockClient.getMessages.mockRejectedValue(new Error('failed'));
            mockClient.invoke.mockResolvedValue({
                messages: [{ id: 3, message: 'Fallback', date: 1710000020, out: true, fromId: null, media: null }]
            });
            const result = await telegramUserbotService.getMessages(userbotConfigId, companyId, 'user123');
            expect(result.success).toBe(true);
            expect(result.data[0].text).toBe('Fallback');
        });
    });

    describe('sendFile', () => {
        const mockClient = mockTelegramClientInstance();
        const fs = require('fs');

        beforeEach(() => {
            telegramUserbotService.clients.set(userbotConfigId, mockClient);
            jest.spyOn(telegramUserbotService, '_resolveChatEntity').mockResolvedValue({ className: 'InputPeerUser' });
        });

        test('sends file successfully', async () => {
            fs.existsSync.mockReturnValue(false);
            const result = await telegramUserbotService.sendFile(userbotConfigId, companyId, 'user123', Buffer.from('data'), 'test.txt', 'caption');
            expect(result.success).toBe(true);
            expect(fs.unlinkSync).toHaveBeenCalled();
        });

        test('cleans up temp file on error', async () => {
            fs.existsSync.mockReturnValue(true);
            mockClient.sendMessage.mockRejectedValue(new Error('Send failed'));
            const result = await telegramUserbotService.sendFile(userbotConfigId, companyId, 'user123', Buffer.from('data'), 'test.txt');
            expect(result.success).toBe(false);
            expect(fs.unlinkSync).toHaveBeenCalled();
        });
    });

    describe('downloadMedia', () => {
        const mockClient = mockTelegramClientInstance();

        beforeEach(() => {
            telegramUserbotService.clients.set(userbotConfigId, mockClient);
            jest.spyOn(telegramUserbotService, '_resolveChatEntity').mockResolvedValue({ className: 'InputPeerUser' });
        });

        test('downloads and returns media buffer', async () => {
            mockClient.getMessages.mockResolvedValue([{ id: 1, media: { photo: {} } }]);
            mockClient.downloadMedia.mockResolvedValue(Buffer.from('data'));
            const result = await telegramUserbotService.downloadMedia(userbotConfigId, companyId, 'user123', '1');
            expect(result.success).toBe(true);
            expect(result.buffer).toBeDefined();
        });

        test('returns error when message not found', async () => {
            mockClient.getMessages.mockResolvedValue([]);
            const result = await telegramUserbotService.downloadMedia(userbotConfigId, companyId, 'user123', '1');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Message not found');
        });
    });

    describe('logout', () => {
        test('clears session from memory and DB', async () => {
            const mockClient = mockTelegramClientInstance();
            telegramUserbotService.clients.set(userbotConfigId, mockClient);
            mockPrisma.telegramConfig.update.mockResolvedValue({});

            const result = await telegramUserbotService.logout(userbotConfigId, companyId);
            expect(result.success).toBe(true);
            expect(mockPrisma.telegramConfig.update).toHaveBeenCalledWith({
                where: { id: userbotConfigId },
                data: expect.objectContaining({ sessionString: null, isActive: false })
            });
            expect(telegramUserbotService.clients.has(userbotConfigId)).toBe(false);
        });

        test('handles errors gracefully', async () => {
            const mockClient = mockTelegramClientInstance();
            mockClient.disconnect.mockRejectedValue(new Error('Disconnect failed'));
            telegramUserbotService.clients.set(userbotConfigId, mockClient);
            mockPrisma.telegramConfig.update.mockResolvedValue({});

            const result = await telegramUserbotService.logout(userbotConfigId, companyId);
            expect(result.success).toBe(true);
        });
    });

    describe('getDialogs', () => {
        const mockClient = mockTelegramClientInstance();
        const dialog = {
            id: BigInt('8707909368'),
            entity: { id: BigInt('8707909368'), firstName: 'swan2' },
            inputEntity: { className: 'InputPeerUser', userId: BigInt('8707909368'), accessHash: BigInt('123456789012345') },
            unreadCount: 0, message: { message: 'latest' }, date: 1710000000,
            isUser: true, isGroup: false, isChannel: false
        };

        beforeEach(() => {
            telegramUserbotService.clients.set(userbotConfigId, mockClient);
        });

        test('returns formatted dialogs', async () => {
            mockClient.getDialogs.mockResolvedValue([dialog]);
            const result = await telegramUserbotService.getDialogs(userbotConfigId, companyId);
            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
            expect(result.data[0]).toMatchObject({ id: '8707909368', peerType: 'user', accessHash: '123456789012345' });
        });

        test('handles empty dialog list', async () => {
            mockClient.getDialogs.mockResolvedValue([]);
            const result = await telegramUserbotService.getDialogs(userbotConfigId, companyId);
            expect(result.success).toBe(true);
            expect(result.data).toEqual([]);
        });
    });
});
