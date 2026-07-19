jest.mock('../../services/sharedDatabase', () => ({
    getSharedPrismaClient: jest.fn()
}));

jest.mock('../../services/whatsapp/WhatsAppManager', () => ({}));
jest.mock('../../services/whatsapp/WhatsAppSyncService', () => ({}));
jest.mock('../../services/whatsapp/providers/MetaCloudProvider', () => ({}));
jest.mock('../../services/socketService', () => ({ getIO: jest.fn() }));
jest.mock('../../utils/dbPermissionHelper', () => ({
    isPermissionError: jest.fn(() => false),
    getPermissionErrorMessage: jest.fn(() => 'permission error')
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { getMessages } = require('../../services/whatsapp/WhatsAppMessageHandler');

describe('WhatsAppMessageHandler.getMessages', () => {
    let prisma;

    beforeEach(() => {
        prisma = {
            whatsAppMessage: {
                findMany: jest.fn(),
                count: jest.fn()
            }
        };
        getSharedPrismaClient.mockReturnValue(prisma);
        jest.clearAllMocks();
    });

    test('looks up messages by both raw and normalized phone JIDs', async () => {
        const message = {
            id: 'message-1',
            remoteJid: '201001234567@s.whatsapp.net',
            timestamp: new Date('2026-05-09T08:00:00.000Z')
        };

        prisma.whatsAppMessage.findMany.mockResolvedValue([message]);
        prisma.whatsAppMessage.count.mockResolvedValue(1);

        const result = await getMessages('session-1', '201001234567:12@s.whatsapp.net', {
            page: 1,
            limit: 50
        });

        const expectedWhere = {
            sessionId: 'session-1',
            remoteJid: {
                in: [
                    '201001234567:12@s.whatsapp.net',
                    '201001234567@s.whatsapp.net'
                ]
            }
        };

        expect(prisma.whatsAppMessage.findMany).toHaveBeenCalledWith({
            where: expectedWhere,
            orderBy: { timestamp: 'desc' },
            skip: 0,
            take: 50
        });
        expect(prisma.whatsAppMessage.count).toHaveBeenCalledWith({ where: expectedWhere });
        expect(result.messages).toEqual([message]);
        expect(result.pagination.total).toBe(1);
    });

    test('keeps linked-device JIDs exact', async () => {
        prisma.whatsAppMessage.findMany.mockResolvedValue([]);
        prisma.whatsAppMessage.count.mockResolvedValue(0);

        await getMessages('session-1', '14805138174180@lid');

        expect(prisma.whatsAppMessage.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    sessionId: 'session-1',
                    remoteJid: '14805138174180@lid'
                }
            })
        );
    });
});
