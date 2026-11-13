import { applyClientSideFilters } from '../inboxClientFilters';
import type { InboxConversation } from '@/types/inbox.types';
import type { FilterState } from '@/components/facebook-inbox/FilterPanel/FilterPanel';

describe('applyClientSideFilters', () => {
  const createConversation = (overrides: Partial<InboxConversation> = {}): InboxConversation => ({
    id: 'conv-1',
    customerId: 'cust-1',
    customerName: 'Menna Mansour',
    lastMessage: 'أهلاً بك',
    lastMessageTime: new Date('2026-10-20T12:00:00Z'),
    unreadCount: 0,
    platform: 'facebook',
    tab: 'all',
    status: 'open',
    assignedTo: null,
    tags: [],
    priority: false,
    snoozedUntil: null,
    archived: false,
    muted: false,
    lastStatusChange: new Date('2026-10-20T12:00:00Z'),
    firstResponseTime: null,
    avgResponseTime: null,
    ...overrides,
  });

  const defaultFilters: FilterState = {
    unreadOnly: false,
    assignedTo: 'all',
    startDate: null,
    endDate: null,
  };

  it('still returns conversation whose customerName and lastMessage do not contain the typed word (proves client no longer re-filters text)', () => {
    // A conversation whose customerName and lastMessage do not contain 'Ahmed' or any search term
    const conv = createConversation({
      customerName: 'Menna Mansour',
      lastMessage: 'تفاصيل الطلب',
    });

    const result = applyClientSideFilters([conv], {
      filters: defaultFilters,
      activeTab: 'all',
      userId: 'user-1',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('conv-1');
  });

  describe('unreadOnly filter', () => {
    it('excludes conversations with 0 unread messages when unreadOnly is true', () => {
      const readConv = createConversation({ id: 'read-1', unreadCount: 0 });
      const unreadConv = createConversation({ id: 'unread-1', unreadCount: 3 });

      const result = applyClientSideFilters([readConv, unreadConv], {
        filters: { ...defaultFilters, unreadOnly: true },
        activeTab: 'all',
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('unread-1');
    });
  });

  describe('assignedTo filter', () => {
    it('filters by assignedTo === "me"', () => {
      const myConv = createConversation({ id: 'my-1', assignedTo: 'user-123' });
      const otherConv = createConversation({ id: 'other-1', assignedTo: 'user-456' });
      const unassignedConv = createConversation({ id: 'unassigned-1', assignedTo: null });

      const result = applyClientSideFilters([myConv, otherConv, unassignedConv], {
        filters: { ...defaultFilters, assignedTo: 'me' },
        activeTab: 'all',
        userId: 'user-123',
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('my-1');
    });

    it('filters by assignedTo === "unassigned"', () => {
      const myConv = createConversation({ id: 'my-1', assignedTo: 'user-123' });
      const unassignedConv = createConversation({ id: 'unassigned-1', assignedTo: null });

      const result = applyClientSideFilters([myConv, unassignedConv], {
        filters: { ...defaultFilters, assignedTo: 'unassigned' },
        activeTab: 'all',
        userId: 'user-123',
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('unassigned-1');
    });
  });

  describe('date range filters', () => {
    it('excludes conversations before startDate or after endDate', () => {
      const convBefore = createConversation({
        id: 'before',
        lastMessageTime: new Date('2026-10-10T10:00:00Z'),
      });
      const convInside = createConversation({
        id: 'inside',
        lastMessageTime: new Date('2026-10-15T12:00:00Z'),
      });
      const convAfter = createConversation({
        id: 'after',
        lastMessageTime: new Date('2026-10-25T15:00:00Z'),
      });

      const result = applyClientSideFilters([convBefore, convInside, convAfter], {
        filters: {
          ...defaultFilters,
          startDate: new Date('2026-10-12T00:00:00Z'),
          endDate: new Date('2026-10-20T00:00:00Z'),
        },
        activeTab: 'all',
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('inside');
    });
  });

  describe('priority filter', () => {
    it('excludes non-priority conversations when priorityOnly is true or activeTab is priority', () => {
      const normalConv = createConversation({ id: 'normal', priority: false });
      const priorityConv = createConversation({ id: 'starred', priority: true });

      const resultPriorityOnly = applyClientSideFilters([normalConv, priorityConv], {
        filters: { ...defaultFilters, priorityOnly: true },
        activeTab: 'all',
      });
      expect(resultPriorityOnly).toHaveLength(1);
      expect(resultPriorityOnly[0].id).toBe('starred');

      const resultPriorityTab = applyClientSideFilters([normalConv, priorityConv], {
        filters: defaultFilters,
        activeTab: 'priority',
      });
      expect(resultPriorityTab).toHaveLength(1);
      expect(resultPriorityTab[0].id).toBe('starred');
    });
  });

  describe('failedDeliveryOnly filter', () => {
    it('filters conversations that have failed delivery to Meta', () => {
      const normalConv = createConversation({ id: 'normal-1' });
      const failedConv = createConversation({ id: 'failed-1', hasFailedDelivery: true });
      const statusFailedConv = createConversation({ id: 'failed-2', lastMessageDeliveryStatus: 'FAILED' });

      const result = applyClientSideFilters([normalConv, failedConv, statusFailedConv], {
        filters: { ...defaultFilters, failedDeliveryOnly: true },
        activeTab: 'all',
      });

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toEqual(['failed-1', 'failed-2']);
    });
  });

  describe('windowStatus filter', () => {
    it('filters conversations with open 24h window (replyable)', () => {
      const openConv = createConversation({
        id: 'open-1',
        isWindowExpired: false,
        windowExpiresAt: new Date(Date.now() + 10 * 60 * 60 * 1000),
      });
      const expiredConv = createConversation({
        id: 'expired-1',
        isWindowExpired: true,
        windowExpiresAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      });

      const result = applyClientSideFilters([openConv, expiredConv], {
        filters: { ...defaultFilters, windowStatus: 'open' },
        activeTab: 'all',
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('open-1');
    });

    it('filters conversations with expired 24h window', () => {
      const openConv = createConversation({
        id: 'open-1',
        isWindowExpired: false,
        windowExpiresAt: new Date(Date.now() + 10 * 60 * 60 * 1000),
      });
      const expiredConv = createConversation({
        id: 'expired-1',
        isWindowExpired: true,
        windowExpiresAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      });

      const result = applyClientSideFilters([openConv, expiredConv], {
        filters: { ...defaultFilters, windowStatus: 'expired' },
        activeTab: 'all',
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('expired-1');
    });
  });
});
