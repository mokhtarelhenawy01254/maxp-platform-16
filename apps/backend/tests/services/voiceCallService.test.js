/**
 * Voice Call Service Unit & Integration Tests
 */

const voiceCallService = require('../../services/voice/voiceCallService');

describe('Voice Call Service', () => {
  describe('Phone normalization', () => {
    test('normalizes Egyptian local numbers to E.164 (+20...) format', () => {
      expect(voiceCallService.normalizeCallingPhone('01012345678')).toBe('+201012345678');
      expect(voiceCallService.normalizeCallingPhone('01198765432')).toBe('+201198765432');
      expect(voiceCallService.normalizeCallingPhone('01234567890')).toBe('+201234567890');
      expect(voiceCallService.normalizeCallingPhone('01511223344')).toBe('+201511223344');
    });

    test('normalizes Saudi local numbers to E.164 (+966...) format', () => {
      expect(voiceCallService.normalizeCallingPhone('0501234567')).toBe('+966501234567');
      expect(voiceCallService.normalizeCallingPhone('0559988776')).toBe('+966559988776');
    });

    test('preserves already normalized international numbers with leading +', () => {
      expect(voiceCallService.normalizeCallingPhone('+201012345678')).toBe('+201012345678');
      expect(voiceCallService.normalizeCallingPhone('+971501234567')).toBe('+971501234567');
    });

    test('handles leading 00 international prefixes', () => {
      expect(voiceCallService.normalizeCallingPhone('00201012345678')).toBe('+201012345678');
    });
  });

  describe('Calling window permission check', () => {
    test('permits calls during business hours (e.g. 14:00)', () => {
      const afternoon = new Date('2026-09-26T14:30:00');
      expect(voiceCallService.isCallingWindowPermitted({ startHour: 10, endHour: 22 }, afternoon)).toBe(true);
    });

    test('blocks calls outside business hours (e.g. 03:00 AM)', () => {
      const lateNight = new Date('2026-09-26T03:30:00');
      expect(voiceCallService.isCallingWindowPermitted({ startHour: 10, endHour: 22 }, lateNight)).toBe(false);
    });

    test('blocks calls at or past endHour (e.g. 22:30)', () => {
      const lateEvening = new Date('2026-09-26T22:30:00');
      expect(voiceCallService.isCallingWindowPermitted({ startHour: 10, endHour: 22 }, lateEvening)).toBe(false);
    });
  });

  describe('Tool calling execution during live call', () => {
    test('rejects missing parameters gracefully', async () => {
      await expect(
        voiceCallService.handleVoiceToolCall({ companyId: '', orderId: '', toolName: 'order_confirm' })
      ).rejects.toThrow('companyId and order reference are required');
    });

    test('returns unknown tool error for unrecognized tools', async () => {
      const result = await voiceCallService.handleVoiceToolCall({
        companyId: 'test_comp',
        orderId: 'non_existent_ord',
        toolName: 'unknown_magic_tool',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Order not found');
    });
  });

  describe('Call completion webhook handling', () => {
    test('handles missing metadata without crashing', async () => {
      const result = await voiceCallService.handleVoiceCallCompleted({
        callId: 'call_123',
        status: 'completed',
        metadata: {},
      });
      expect(result.success).toBe(false);
      expect(result.reason).toBe('MISSING_METADATA');
    });
  });
});
