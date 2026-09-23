/**
 * Tests for staleOrderAlertService selection logic and chatMediaArchiveService
 * helpers (2026-09-23 proactive alerts + media archiving).
 */

jest.mock('../../services/sharedDatabase', () => ({
    getSharedPrismaClient: jest.fn()
}));

const { selectStaleByCompany, STALE_AFTER_HOURS } = require('../../services/staleOrderAlertService');
const { isExternalHttpUrl, extFor } = require('../../services/chatMediaArchiveService');

const NOW = new Date('2026-09-23T12:00:00Z');
const hoursAgo = (h) => new Date(NOW.getTime() - h * 3600 * 1000);

describe('selectStaleByCompany', () => {
    it('groups only orders older than the stale threshold, per company', () => {
        const orders = [
            { id: '1', companyId: 'c1', orderNumber: 'A-1', createdAt: hoursAgo(72) },
            { id: '2', companyId: 'c1', orderNumber: 'A-2', createdAt: hoursAgo(50) },
            { id: '3', companyId: 'c1', orderNumber: 'A-3', createdAt: hoursAgo(10) }, // fresh → skipped
            { id: '4', companyId: 'c2', orderNumber: 'B-1', createdAt: hoursAgo(STALE_AFTER_HOURS) }, // boundary → stale
            { id: '5', companyId: null, orderNumber: 'X-1', createdAt: hoursAgo(90) }, // no company → skipped
        ];

        const byCompany = selectStaleByCompany(orders, NOW);

        expect(byCompany.get('c1').map((o) => o.orderNumber)).toEqual(['A-1', 'A-2']);
        expect(byCompany.get('c2').map((o) => o.orderNumber)).toEqual(['B-1']);
        expect(byCompany.has(null)).toBe(false);
    });

    it('sorts preserved: oldest first stays first for the alert sample', () => {
        const orders = [
            { id: '1', companyId: 'c1', orderNumber: 'NEWEST', createdAt: hoursAgo(49) },
            { id: '2', companyId: 'c1', orderNumber: 'OLDEST', createdAt: hoursAgo(120) },
        ];
        // input arrives orderBy createdAt asc from prisma — emulate
        const byCompany = selectStaleByCompany([orders[1], orders[0]], NOW);
        expect(byCompany.get('c1')[0].orderNumber).toBe('OLDEST');
    });
});

describe('chatMediaArchiveService helpers', () => {
    it('detects external http urls only', () => {
        expect(isExternalHttpUrl('https://scontent.xx.fbcdn.net/v/img.jpg')).toBe(true);
        expect(isExternalHttpUrl('/uploads/chat-media/2026-09-23/x.jpg')).toBe(false);
        expect(isExternalHttpUrl('')).toBe(false);
        expect(isExternalHttpUrl(null)).toBe(false);
    });

    it('maps common mimes and falls back to the url extension', () => {
        expect(extFor('image/jpeg', 'https://x/a')).toBe('.jpg');
        expect(extFor('image/png', 'https://x/b')).toBe('.png');
        expect(extFor('application/octet-stream', 'https://x/file.webp')).toBe('.webp');
        expect(extFor('weird/type', 'https://x/noext')).toBe('.bin');
    });
});
