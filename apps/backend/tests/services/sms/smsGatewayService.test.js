const {
  normalizePhoneNumber,
  sendSMS
} = require('../../../services/sms/smsGatewayService');
const axios = require('axios');

jest.mock('axios');

describe('smsGatewayService', () => {
  describe('normalizePhoneNumber', () => {
    test('يحول رقم مصري محلي إلى الصيغة الدولية E.164', () => {
      expect(normalizePhoneNumber('01012345678')).toBe('201012345678');
      expect(normalizePhoneNumber('+201123456789')).toBe('201123456789');
      expect(normalizePhoneNumber('00201223456789')).toBe('201223456789');
    });

    test('يحول رقم سعودي محلي إلى الصيغة الدولية E.164', () => {
      expect(normalizePhoneNumber('0501234567')).toBe('966501234567');
      expect(normalizePhoneNumber('+966551234567')).toBe('966551234567');
    });

    test('يتعامل مع أرقام فارغة أو غير صحيحة بأمان', () => {
      expect(normalizePhoneNumber('')).toBe('');
      expect(normalizePhoneNumber(null)).toBe('');
    });
  });

  describe('sendSMS', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('إرسال ناجح عبر Twilio', async () => {
      axios.post.mockResolvedValueOnce({
        data: { sid: 'SM_test_123', status: 'queued' }
      });

      const result = await sendSMS({
        to: '01012345678',
        text: 'مرحبا بك في متجرنا',
        config: {
          provider: 'TWILIO',
          accountSid: 'AC_test',
          authToken: 'auth_test',
          senderId: '+123456789'
        }
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('SM_test_123');
      expect(result.provider).toBe('TWILIO');
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    test('إرسال ناجح عبر SMSMisr', async () => {
      axios.post.mockResolvedValueOnce({
        data: { code: '1901', id: 'smsmisr_999' }
      });

      const result = await sendSMS({
        to: '01012345678',
        text: 'كود التأكيد الخاص بك هو 1234',
        config: {
          provider: 'SMSMISR',
          username: 'user_test',
          password: 'pass_test',
          senderId: 'Brand'
        }
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('smsmisr_999');
      expect(result.provider).toBe('SMSMISR');
    });

    test('يعيد نجاح false مع رسالة الخطأ عند فشل الاتصال', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network Timeout'));

      const result = await sendSMS({
        to: '01012345678',
        text: 'رسالة تجريبية',
        config: {
          provider: 'TWILIO',
          accountSid: 'AC_test',
          authToken: 'auth_test',
          senderId: '+123456789'
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network Timeout');
    });
  });
});
