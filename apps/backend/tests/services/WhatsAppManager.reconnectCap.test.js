jest.mock('../../services/sharedDatabase', () => ({
    getSharedPrismaClient: jest.fn(() => ({})),
    safeQuery: jest.fn(async (operation) => operation()),
    executeWithRetry: jest.fn(async (operation) => operation())
}));

jest.mock('../../services/socketService', () => ({
    getIO: jest.fn(() => null)
}));

jest.mock('../../services/whatsapp/DatabaseAuthState', () => ({
    useDatabaseAuthState: jest.fn()
}));

describe('WhatsAppManager reconnect-failure cap', () => {
    const { __testing } = require('../../services/whatsapp/WhatsAppManager');

    test('failure counter starts at zero and persists across increments', () => {
        const sessionId = 'session-cap-test';
        expect(__testing.getReconnectFailureCount(sessionId)).toBe(0);
        expect(__testing.incrementReconnectFailureCount(sessionId)).toBe(1);
        expect(__testing.incrementReconnectFailureCount(sessionId)).toBe(2);
        expect(__testing.getReconnectFailureCount(sessionId)).toBe(2);
    });

    test('counter resets to zero on successful connect (resetReconnectFailures)', () => {
        const sessionId = 'session-cap-reset';
        __testing.incrementReconnectFailureCount(sessionId);
        __testing.incrementReconnectFailureCount(sessionId);
        __testing.resetReconnectFailures(sessionId);
        expect(__testing.getReconnectFailureCount(sessionId)).toBe(0);
    });

    test('cap threshold trips giveUpOnReconnect (clear auth + QR_PENDING)', async () => {
        const sessionId = 'session-cap-giveup';
        const update = jest.fn().mockResolvedValue({});
        const prisma = { whatsAppSession: { update } };
        require('../../services/sharedDatabase').getSharedPrismaClient.mockReturnValue(prisma);

        for (let i = 0; i < 10; i++) {
            __testing.incrementReconnectFailureCount(sessionId);
        }
        expect(__testing.getReconnectFailureCount(sessionId)).toBe(10);

        await __testing.giveUpOnReconnect(sessionId, 'company-1', '201012345678');

        expect(update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ status: 'QR_PENDING' })
        }));
        // بعد الاستسلام، العداد يرجع صفر
        expect(__testing.getReconnectFailureCount(sessionId)).toBe(0);
    });
});
