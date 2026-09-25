const mockWhatsAppManager = {
    createSession: jest.fn(),
    reconnectSession: jest.fn(),
    deleteSession: jest.fn(),
    getSession: jest.fn()
};

jest.mock('../../services/sharedDatabase', () => ({
    getSharedPrismaClient: jest.fn()
}));

jest.mock('../../services/whatsapp', () => ({
    WhatsAppManager: mockWhatsAppManager,
    WhatsAppMessageHandler: {},
    WhatsAppMediaHandler: {}
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const {
    createSession,
    deleteSession,
    connectSession,
    getSessions
} = require('../../controller/whatsappController');

describe('whatsappController session lifecycle retention and relink behavior', () => {
    let prisma;
    let res;

    beforeEach(() => {
        prisma = {
            whatsAppSettings: {
                findUnique: jest.fn().mockResolvedValue({ maxSessions: 3 })
            },
            whatsAppSession: {
                count: jest.fn().mockResolvedValue(0),
                create: jest.fn(),
                findFirst: jest.fn(),
                update: jest.fn()
            }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        getSharedPrismaClient.mockReturnValue(prisma);
        Object.values(mockWhatsAppManager).forEach((fn) => fn.mockReset());
    });

    test('stores import-history and delete-retention choices when linking a Baileys session', async () => {
        prisma.whatsAppSession.create.mockImplementation(async ({ data }) => ({
            id: 'session-1',
            ...data
        }));
        mockWhatsAppManager.createSession.mockResolvedValue({
            status: 'qr_pending',
            qrCode: 'qr-code-value',
            pairingCode: null
        });
        mockWhatsAppManager.getSession.mockReturnValue({
            status: 'qr_pending',
            qrCode: 'qr-code-value',
            pairingCode: null
        });

        await createSession({
            user: { companyId: 'company-1' },
            body: {
                name: 'Sales WhatsApp',
                phoneNumber: '+20 123 456 7890',
                importHistory: 'true',
                keepHistoryOnDelete: false
            }
        }, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(prisma.whatsAppSession.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                companyId: 'company-1',
                name: 'Sales WhatsApp',
                phoneNumber: '201234567890',
                status: 'QR_PENDING'
            })
        }));

        const savedMetadata = JSON.parse(prisma.whatsAppSession.create.mock.calls[0][0].data.metadata);
        expect(savedMetadata).toEqual({
            importHistoryOnLink: true,
            keepHistoryOnDelete: false
        });
        expect(mockWhatsAppManager.createSession).toHaveBeenCalledWith('session-1', 'company-1', expect.objectContaining({
            phoneNumber: '201234567890',
            syncFullHistory: true
        }));
        expect(res.json.mock.calls[0][0].session.qrCode).toBe('qr-code-value');
    });

    test('uses the saved delete-retention preference when the delete request has no explicit query override', async () => {
        prisma.whatsAppSession.findFirst.mockResolvedValue({
            id: 'session-1',
            companyId: 'company-1',
            metadata: JSON.stringify({ keepHistoryOnDelete: true })
        });

        await deleteSession({
            user: { companyId: 'company-1' },
            params: { id: 'session-1' },
            query: {}
        }, res);

        expect(mockWhatsAppManager.deleteSession).toHaveBeenCalledWith('session-1', true);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('lets an explicit delete query override the saved retention preference', async () => {
        prisma.whatsAppSession.findFirst.mockResolvedValue({
            id: 'session-1',
            companyId: 'company-1',
            metadata: JSON.stringify({ keepHistoryOnDelete: true })
        });

        await deleteSession({
            user: { companyId: 'company-1' },
            params: { id: 'session-1' },
            query: { keepHistory: 'false' }
        }, res);

        expect(mockWhatsAppManager.deleteSession).toHaveBeenCalledWith('session-1', false);
    });

    test('reconnects a logged-out session by resetting auth and returning a pairing code on the same session', async () => {
        const storedSession = {
            id: 'session-1',
            companyId: 'company-1',
            provider: 'BAILEYS',
            status: 'LOGGED_OUT',
            phoneNumber: '201234567890',
            authState: JSON.stringify({ creds: {} })
        };

        prisma.whatsAppSession.findFirst
            .mockResolvedValueOnce(storedSession)
            .mockResolvedValueOnce({
                ...storedSession,
                status: 'QR_PENDING'
            });
        mockWhatsAppManager.reconnectSession.mockResolvedValue({
            status: 'pairing_code_pending',
            qrCode: null,
            pairingCode: '12345678'
        });
        mockWhatsAppManager.getSession.mockReturnValue({
            status: 'pairing_code_pending',
            qrCode: null,
            pairingCode: '12345678'
        });

        await connectSession({
            user: { companyId: 'company-1' },
            params: { id: 'session-1' },
            body: {
                preferPairingCode: true
            }
        }, res);

        expect(mockWhatsAppManager.reconnectSession).toHaveBeenCalledWith('session-1', 'company-1', 0, expect.objectContaining({
            resetAuth: true,
            usePairingCode: true,
            phoneNumber: '201234567890'
        }));
        expect(res.json.mock.calls[0][0]).toMatchObject({
            success: true,
            message: 'جاهز لإعادة الربط',
            session: {
                id: 'session-1',
                pairingCode: '12345678',
                qrCode: null,
                phoneNumber: '201234567890'
            }
        });
    });

    test('getSessions maps sessions correctly including agentId from metadata without ReferenceError', async () => {
        prisma.whatsAppSession.findMany = jest.fn().mockResolvedValue([
            {
                id: 'session-test-1',
                companyId: 'company-1',
                name: 'Main WhatsApp',
                phoneNumber: '201000000000',
                provider: 'BAILEYS',
                status: 'CONNECTED',
                metadata: JSON.stringify({ agentId: 'agent-sales-1' }),
                _count: { whatsAppMessages: 5, whatsAppContacts: 2 }
            }
        ]);
        prisma.whatsAppSessionHistoryImport = {
            findMany: jest.fn().mockResolvedValue([])
        };

        mockWhatsAppManager.getSession.mockReturnValue(null);

        await getSessions({
            user: { companyId: 'company-1', id: 'user-1', role: 'COMPANY_ADMIN' }
        }, res);

        expect(res.status).not.toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalled();
        const responseData = res.json.mock.calls[0][0];
        expect(responseData.sessions).toHaveLength(1);
        expect(responseData.sessions[0]).toMatchObject({
            id: 'session-test-1',
            agentId: 'agent-sales-1',
            liveStatus: 'reconnecting'
        });
    });
});
