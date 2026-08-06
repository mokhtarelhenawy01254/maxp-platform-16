jest.mock('../../services/sharedDatabase', () => ({
    getSharedPrismaClient: jest.fn()
}));

jest.mock('../../services/whatsapp', () => ({
    WhatsAppManager: { getSession: jest.fn() },
    WhatsAppMessageHandler: {},
    WhatsAppMediaHandler: {}
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { getConversations } = require('../../controller/whatsappController');
const { WhatsAppManager } = require('../../services/whatsapp');

describe('whatsappController.getConversations', () => {
    let prisma;
    let req;
    let res;

    beforeEach(() => {
        prisma = {
            whatsAppSession: {
                findMany: jest.fn()
            },
            whatsAppContact: {
                findMany: jest.fn(),
                count: jest.fn()
            },
            whatsAppMessage: {
                groupBy: jest.fn(),
                findMany: jest.fn()
            }
        };

        req = {
            user: { companyId: 'company-1', id: 'user-1', role: 'COMPANY_ADMIN' },
            query: { sessionId: 'all', page: '1', limit: '50' }
        };

        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        getSharedPrismaClient.mockReturnValue(prisma);
        WhatsAppManager.getSession.mockReturnValue(null);
        jest.clearAllMocks();
    });

    test('matches last messages by session and JID when viewing all sessions', async () => {
        const contactA = {
            id: 'contact-a',
            sessionId: 'session-a',
            jid: '201001234567@s.whatsapp.net',
            whatsAppSession: { name: 'A', phoneNumber: '111' }
        };
        const contactB = {
            id: 'contact-b',
            sessionId: 'session-b',
            jid: '201001234567@s.whatsapp.net',
            whatsAppSession: { name: 'B', phoneNumber: '222' }
        };

        prisma.whatsAppSession.findMany.mockResolvedValue([
            { id: 'session-a' },
            { id: 'session-b' }
        ]);
        prisma.whatsAppContact.findMany.mockResolvedValue([contactA, contactB]);
        prisma.whatsAppContact.count.mockResolvedValue(2);
        prisma.whatsAppMessage.groupBy.mockResolvedValue([
            {
                sessionId: 'session-a',
                remoteJid: '201001234567@s.whatsapp.net',
                _max: { timestamp: new Date('2026-05-09T08:00:00.000Z') }
            },
            {
                sessionId: 'session-b',
                remoteJid: '201001234567@s.whatsapp.net',
                _max: { timestamp: new Date('2026-05-09T09:00:00.000Z') }
            }
        ]);
        prisma.whatsAppMessage.findMany.mockResolvedValue([
            {
                sessionId: 'session-a',
                remoteJid: '201001234567@s.whatsapp.net',
                content: 'message from session A'
            },
            {
                sessionId: 'session-b',
                remoteJid: '201001234567@s.whatsapp.net',
                content: 'message from session B'
            }
        ]);

        await getConversations(req, res);

        expect(prisma.whatsAppMessage.groupBy).toHaveBeenCalledWith(
            expect.objectContaining({
                by: ['sessionId', 'remoteJid']
            })
        );
        expect(prisma.whatsAppMessage.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    OR: [
                        {
                            sessionId: 'session-a',
                            remoteJid: '201001234567@s.whatsapp.net',
                            timestamp: new Date('2026-05-09T08:00:00.000Z')
                        },
                        {
                            sessionId: 'session-b',
                            remoteJid: '201001234567@s.whatsapp.net',
                            timestamp: new Date('2026-05-09T09:00:00.000Z')
                        }
                    ]
                },
                select: expect.objectContaining({
                    sessionId: true,
                    remoteJid: true
                })
            })
        );

        const payload = res.json.mock.calls[0][0];
        expect(payload.conversations[0].lastMessage.content).toBe('message from session A');
        expect(payload.conversations[1].lastMessage.content).toBe('message from session B');
    });

    test('applies server-side unreplied filter (lastMessageIsFromMe: false) and returns counts', async () => {
        req.query = { sessionId: 'all', page: '1', limit: '50', filter: 'unreplied' };

        prisma.whatsAppSession.findMany.mockResolvedValue([
            { id: 'session-a' },
            { id: 'session-b' }
        ]);
        prisma.whatsAppContact.findMany.mockResolvedValue([
            { id: 'contact-a', sessionId: 'session-a', jid: '201001234567@s.whatsapp.net', whatsAppSession: { name: 'A', phoneNumber: '111' } }
        ]);
        prisma.whatsAppContact.count.mockResolvedValue(1);
        prisma.whatsAppMessage.groupBy.mockResolvedValue([]);
        prisma.whatsAppMessage.findMany.mockResolvedValue([]);

        await getConversations(req, res);

        // الفلتر server-side على كل المحادثات
        const findManyCall = prisma.whatsAppContact.findMany.mock.calls[0][0];
        expect(findManyCall.where.lastMessageIsFromMe).toBe(false);

        // الـ count الكلي للـ pagination بياخد نفس الفلتر
        const countCall = prisma.whatsAppContact.count.mock.calls[0][0];
        expect(countCall.where.lastMessageIsFromMe).toBe(false);

        // عدّادات دقيقة لكل الفلاتر
        expect(prisma.whatsAppContact.count).toHaveBeenCalledTimes(6);

        const payload = res.json.mock.calls[0][0];
        expect(payload.counts).toEqual({
            all: 1,
            unread: 1,
            groups: 1,
            unreplied: 1,
            archived: 1
        });
    });

    test('passes unread/groups filters to the query', async () => {
        prisma.whatsAppSession.findMany.mockResolvedValue([{ id: 'session-a' }]);
        prisma.whatsAppContact.findMany.mockResolvedValue([]);
        prisma.whatsAppContact.count.mockResolvedValue(0);
        prisma.whatsAppMessage.groupBy.mockResolvedValue([]);
        prisma.whatsAppMessage.findMany.mockResolvedValue([]);

        req.query = { sessionId: 'session-a', page: '1', limit: '50', filter: 'unread' };
        await getConversations(req, res);
        expect(prisma.whatsAppContact.findMany.mock.calls[0][0].where.unreadCount).toEqual({ gt: 0 });

        prisma.whatsAppContact.findMany.mockClear();
        prisma.whatsAppContact.count.mockClear();

        req.query = { sessionId: 'session-a', page: '1', limit: '50', filter: 'groups' };
        await getConversations(req, res);
        expect(prisma.whatsAppContact.findMany.mock.calls[0][0].where.isGroup).toBe(true);
    });
});
