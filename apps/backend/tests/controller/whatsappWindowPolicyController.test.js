const whatsappController = require('../../controller/whatsappController');
const whatsappInboxController = require('../../controller/whatsappInboxController');
const whatsappInboxService = require('../../services/whatsappInboxService');
const smsGatewayService = require('../../services/sms/smsGatewayService');
const WhatsAppWindowPolicyService = require('../../services/whatsapp/WhatsAppWindowPolicyService');

jest.mock('../../services/sms/smsGatewayService');
jest.mock('../../services/whatsappInboxService');
jest.mock('../../services/whatsapp/WhatsAppWindowPolicyService');

describe('WhatsApp Window Policy Controllers & Endpoints', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: {
        companyId: 'company_123',
        id: 'user_456',
        role: 'SUPERVISOR'
      },
      body: {},
      params: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('getWindowPolicy', () => {
    test('يجلب إعدادات النافذة بنجاح', async () => {
      const mockSettings = {
        windowPolicy: 'SMART_FALLBACK',
        smsFallbackEnabled: true,
        smsProvider: 'SMSMISR',
        smsConfig: { senderId: 'MAXP' }
      };
      WhatsAppWindowPolicyService.getWindowPolicySettings.mockResolvedValueOnce(mockSettings);

      await whatsappController.getWindowPolicy(req, res);

      expect(WhatsAppWindowPolicyService.getWindowPolicySettings).toHaveBeenCalledWith('company_123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        policy: mockSettings
      });
    });
  });

  describe('updateWindowPolicy', () => {
    test('يحفظ إعدادات النافذة بنجاح', async () => {
      req.body = {
        windowPolicy: 'SMS_DIRECT',
        smsFallbackEnabled: true,
        smsProvider: 'TAQNYAT',
        smsConfig: { bearerToken: 'token123', senderId: 'MAXP' }
      };

      WhatsAppWindowPolicyService.updateWindowPolicySettings.mockResolvedValueOnce(req.body);

      await whatsappController.updateWindowPolicy(req, res);

      expect(WhatsAppWindowPolicyService.updateWindowPolicySettings).toHaveBeenCalledWith(
        'company_123',
        req.body
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        policy: req.body
      });
    });
  });

  describe('testSendSMS', () => {
    test('يفحص إرسال SMS بنجاح بالبيانات المرسلة', async () => {
      req.body = {
        phone: '01012345678',
        text: 'اختبار رسالة SMS',
        config: {
          provider: 'TWILIO',
          accountSid: 'AC123',
          authToken: 'auth',
          fromPhone: '+1234567890',
          senderId: 'MAXP'
        }
      };

      smsGatewayService.sendSMS.mockResolvedValueOnce({
        success: true,
        provider: 'TWILIO',
        messageId: 'SM_test_msg_999'
      });

      await whatsappController.testSendSMS(req, res);

      expect(smsGatewayService.sendSMS).toHaveBeenCalledWith({
        to: '01012345678',
        text: 'اختبار رسالة SMS',
        senderId: 'MAXP',
        config: req.body.config
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'تم إرسال رسالة SMS التجريبية بنجاح',
        result: {
          success: true,
          provider: 'TWILIO',
          messageId: 'SM_test_msg_999'
        }
      });
    });

    test('يرفض الإرسال إذا لم يتم تقديم رقم الهاتف', async () => {
      req.body = {
        phone: ''
      };

      await whatsappController.testSendSMS(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'رقم الهاتف مطلوب'
      });
    });
  });

  describe('sendSmsFallback from Inbox Controller', () => {
    test('يرسل SMS بديل بنجاح من صندوق المحادثات', async () => {
      req.params = { conversationId: 'conv_789' };
      req.body = { content: 'رسالة متابعة للعميل' };

      whatsappInboxService.sendSmsFallback.mockResolvedValueOnce({
        message: {
          id: 'msg_sms_1',
          content: 'رسالة متابعة للعميل',
          type: 'SMS',
          status: 'SENT'
        }
      });

      await whatsappInboxController.sendSmsFallback(req, res);

      expect(whatsappInboxService.sendSmsFallback).toHaveBeenCalledWith(
        'conv_789',
        'company_123',
        'user_456',
        'SUPERVISOR',
        'رسالة متابعة للعميل'
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: expect.objectContaining({ id: 'msg_sms_1' })
      });
    });
  });
});
