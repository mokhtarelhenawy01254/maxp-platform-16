jest.mock('../../services/sharedDatabase', () => ({
    getSharedPrismaClient: jest.fn()
}));

jest.mock('../../services/whatsapp/WhatsAppManager', () => ({
    getSession: jest.fn(),
    reconnectSession: jest.fn(),
    sendTyping: jest.fn(),
    updateContact: jest.fn()
}));

jest.mock('../../services/whatsapp/WhatsAppSyncService', () => ({
    syncMessage: jest.fn(async () => ({ conversation: { id: 'conversation-1' } }))
}));

jest.mock('../../services/whatsapp/providers/MetaCloudProvider', () => ({}));
jest.mock('../../services/socketService', () => ({ getIO: jest.fn(() => null) }));
jest.mock('../../services/whatsappRealtimeAudienceService', () => ({
    emitToAudience: jest.fn(),
    getConversationAudience: jest.fn(async () => ({ userIds: [] }))
}));
jest.mock('../../utils/dbPermissionHelper', () => ({
    isPermissionError: jest.fn(() => false),
    getPermissionErrorMessage: jest.fn(() => 'permission error')
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const WhatsAppManager = require('../../services/whatsapp/WhatsAppManager');
const { sendText } = require('../../services/whatsapp/WhatsAppMessageHandler');

describe('WhatsAppMessageHandler.sendText Baileys session readiness', () => {
    let prisma;
    let currentSession;
    let consoleLogSpy;
    let consoleWarnSpy;

    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        prisma = {
            whatsAppSession: {
                findUnique: jest.fn(async (args) => {
                    if (args?.select?.companyId) {
                        return { companyId: 'company-1' };
                    }

                    return {
                        id: 'session-1',
                        companyId: 'company-1',
                        provider: 'BAILEYS'
                    };
                })
            },
            whatsAppMessage: {
                upsert: jest.fn(async (args) => ({ id: 'outgoing-1', ...args.create }))
            },
            whatsAppContact: {
                updateMany: jest.fn(async () => ({ count: 1 }))
            }
        };

        currentSession = {
            sessionId: 'session-1',
            companyId: 'company-1',
            status: 'connected',
            syncFullHistory: true,
            sock: null
        };

        getSharedPrismaClient.mockReturnValue(prisma);
        WhatsAppManager.getSession.mockImplementation(() => currentSession);
        WhatsAppManager.sendTyping.mockResolvedValue(undefined);
        WhatsAppManager.updateContact.mockResolvedValue(undefined);
        WhatsAppManager.reconnectSession.mockImplementation(async () => {
            currentSession = {
                ...currentSession,
                sock: {
                    sendMessage: jest.fn(async () => ({ key: { id: 'baileys-outgoing-1' } }))
                }
            };
            return currentSession;
        });
        jest.clearAllMocks();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });

    test('reconnects and retries when a connected Baileys session has no usable socket', async () => {
        await sendText('session-1', '201001112223@s.whatsapp.net', 'تمام');

        expect(WhatsAppManager.reconnectSession).toHaveBeenCalledWith(
            'session-1',
            'company-1',
            0,
            expect.objectContaining({ syncFullHistory: true })
        );
        expect(currentSession.sock.sendMessage).toHaveBeenCalledWith(
            '201001112223@s.whatsapp.net',
            { text: 'تمام' }
        );
        expect(prisma.whatsAppMessage.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { messageId: 'baileys-outgoing-1' }
            })
        );
    });
});
