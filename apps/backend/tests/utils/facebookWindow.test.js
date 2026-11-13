/**
 * Unit tests — نافذة الـ24 ساعة لفيسبوك (Task f508775c-54fc-4c6e-b7cc-e9e95cf46ba6).
 * المرافق: apps/backend/utils/facebookWindow.js
 */

const { computeFacebookWindow, resolveFacebookLastInboundAt, WINDOW_MS } = require('../../utils/facebookWindow');

const HOUR = 60 * 60 * 1000;

describe('facebook 24h window (task f508775c)', () => {
  it('expires exactly 24h after the last inbound message', () => {
    const lastInboundAt = '2026-10-30T10:00:00.000Z';
    const state = computeFacebookWindow({ lastInboundAt, now: '2026-10-31T09:00:00.000Z' });

    expect(state.isWindowExpired).toBe(false);
    expect(state.windowExpiresAt).toBeInstanceOf(Date);
    expect(state.windowExpiresAt.toISOString()).toBe('2026-10-31T10:00:00.000Z');
    expect(state.msRemaining).toBe(HOUR);
    expect(state.hoursSinceExpiration).toBe(0);
  });

  it('reports the window closed after 24h and how many hours ago', () => {
    const lastInboundAt = '2026-10-30T10:00:00.000Z';
    const state = computeFacebookWindow({ lastInboundAt, now: '2026-10-31T15:30:00.000Z' });

    expect(state.isWindowExpired).toBe(true);
    expect(state.hoursSinceExpiration).toBe(5);
    expect(state.msRemaining).toBe(0);
  });

  it('treats a missing inbound message as an expired window', () => {
    const state = computeFacebookWindow({ lastInboundAt: null, now: '2026-10-31T15:30:00.000Z' });

    expect(state.isWindowExpired).toBe(true);
    expect(state.windowExpiresAt).toBeNull();
    expect(state.hoursSinceExpiration).toBe(24);
  });

  it('treats an invalid inbound date as expired (never allows send)', () => {
    const state = computeFacebookWindow({ lastInboundAt: 'not-a-date', now: '2026-10-31T15:30:00.000Z' });

    expect(state.isWindowExpired).toBe(true);
    expect(state.windowExpiresAt).toBeNull();
  });

  it('keeps the window open one millisecond before expiry', () => {
    const lastInboundAt = '2026-10-30T10:00:00.000Z';
    const state = computeFacebookWindow({
      lastInboundAt,
      now: new Date(new Date(lastInboundAt).getTime() + WINDOW_MS - 1),
    });

    expect(state.isWindowExpired).toBe(false);
    expect(state.msRemaining).toBe(1);
  });

  it('closes the window at exactly 24h + 1ms', () => {
    const lastInboundAt = '2026-10-30T10:00:00.000Z';
    const state = computeFacebookWindow({
      lastInboundAt,
      now: new Date(new Date(lastInboundAt).getTime() + WINDOW_MS + 1),
    });

    expect(state.isWindowExpired).toBe(true);
  });

  it('accepts Date objects and millisecond timestamps', () => {
    const inbound = new Date('2026-10-31T00:00:00.000Z');
    expect(computeFacebookWindow({ lastInboundAt: inbound, now: inbound.getTime() + HOUR }).isWindowExpired).toBe(false);
    expect(computeFacebookWindow({ lastInboundAt: inbound.getTime(), now: inbound.getTime() + 25 * HOUR }).isWindowExpired).toBe(true);
  });

  describe('resolveFacebookLastInboundAt', () => {
    it('uses lastInboundMsg.createdAt when available', () => {
      const msgDate = new Date('2026-11-01T10:00:00.000Z');
      const conv = { lastMessageIsFromCustomer: false };
      const resolved = resolveFacebookLastInboundAt(conv, { createdAt: msgDate });
      expect(resolved).toEqual(msgDate);
    });

    it('falls back to conversation.lastMessageAt when lastMessageIsFromCustomer is true', () => {
      const convDate = new Date('2026-11-01T12:00:00.000Z');
      const conv = {
        lastMessageIsFromCustomer: true,
        lastMessageAt: convDate
      };
      const resolved = resolveFacebookLastInboundAt(conv, null);
      expect(resolved).toEqual(convDate);
    });

    it('falls back to conversation.createdAt when conversation is newly created (<24h)', () => {
      const recentConv = {
        lastMessageIsFromCustomer: false,
        createdAt: new Date(Date.now() - 2 * HOUR)
      };
      const resolved = resolveFacebookLastInboundAt(recentConv, null);
      expect(resolved).toBeInstanceOf(Date);
      expect(resolved).toEqual(recentConv.createdAt);
    });

    it('returns null when conversation is old (>24h) and has no inbound messages', () => {
      const oldConv = {
        lastMessageIsFromCustomer: false,
        createdAt: new Date(Date.now() - 48 * HOUR)
      };
      const resolved = resolveFacebookLastInboundAt(oldConv, null);
      expect(resolved).toBeNull();
    });
  });
});
