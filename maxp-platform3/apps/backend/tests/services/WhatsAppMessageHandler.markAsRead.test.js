jest.mock('../../services/sharedDatabase', () => ({
    getSharedPrismaClient: jest.fn()
}));

jest.mock('../../services/whatsapp/WhatsAppManager', () => ({
    getSession: jest.fn()
}));

jest.mock('../../services/whatsapp/WhatsAppSyncService', () => ({}));
jest.mock('../../services/whatsapp/providers/MetaCloudProvider', () => ({}));
jest.mock('../../services/socketService', () => ({ getIO: jest.fn() }));
jest.mock('../../utils/dbPermissionHelper', () => ({
    isPermissionError: jest.fn(() => false),
    getPermissionErrorMessage: jest.fn(() => 'permission error')
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const WhatsAppManager = require('../../services/whatsapp/WhatsAppManager');
const { markAsRead } = require('../../services/whatsapp/WhatsAppMessageHandler');

describe('WhatsAppMessageHandler.markAsRead', () => {
    let prisma;

    beforeEach(() => {
        prisma = {
            whatsAppMessage: {
                findFirst: jest.fn(),
                updateMany: jest.fn()
            },
            whatsAppContact: {
                updateMany: jest.fn()
            }
        };
        getSharedPrismaClient.mockReturnValue(prisma);
        WhatsAppManager.getSession.mockReturnValue(null);
        jest.clearAllMocks();
    });

    test('skips message update when the conversation has no unread message', async () => {
        prisma.whatsAppMessage.findFirst.mockResolvedValue(null);
        prisma.whatsAppContact.updateMany.mockResolvedValue({ count: 1 });

        await markAsRead('session-1', '201270388115@s.whatsapp.net');

        expect(prisma.whatsAppMessage.updateMany).not.toHaveBeenCalled();
        expect(prisma.whatsAppContact.updateMany).toHaveBeenCalledWith({
            where: {
                sessionId: 'session-1',
                jid: '201270388115@s.whatsapp.net'
            },
            data: { unreadCount: 0 }
        });
    });

    test('updates only unread incoming messages when unread messages exist', async () => {
        prisma.whatsAppMessage.findFirst.mockResolvedValue({
            messageId: 'message-1'
        });
        prisma.whatsAppMessage.updateMany.mockResolvedValue({ count: 3 });
        prisma.whatsAppContact.updateMany.mockResolvedValue({ count: 1 });

        await markAsRead('session-1', '201270388115@s.whatsapp.net');

        expect(prisma.whatsAppMessage.updateMany).toHaveBeenCalledWith({
            where: {
                sessionId: 'session-1',
                remoteJid: '201270388115@s.whatsapp.net',
                fromMe: false,
                status: { not: 'READ' }
            },
            data: { status: 'READ' }
        });
    });
});
