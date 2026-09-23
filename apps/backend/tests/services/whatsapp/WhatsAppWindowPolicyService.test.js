const {
  resolveDispatchMode,
  DEFAULT_POLICY_CONFIG
} = require('../../../services/whatsapp/WhatsAppWindowPolicyService');

const mockFindUnique = jest.fn();
const mockUpsert = jest.fn();

jest.mock('../../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => ({
    whatsAppSettings: {
      findUnique: mockFindUnique,
      upsert: mockUpsert
    }
  }),
  safeQuery: (fn) => fn()
}));

describe('WhatsAppWindowPolicyService - resolveDispatchMode', () => {
  const companyId = 'comp_test_123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('يرجع FREE_TEXT لجلسات غير Meta Cloud (مثل Baileys)', async () => {
    const result = await resolveDispatchMode({
      companyId,
      contact: null,
      sessionProvider: 'BAILEYS'
    });

    expect(result.mode).toBe('FREE_TEXT');
    expect(result.reason).toBe('NON_META_SESSION');
  });

  test('يرجع FREE_TEXT عندما تكون النافذة مفتوحة (العميل نشط خلال 24 ساعة)', async () => {
    const contact = {
      lastCustomerMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // منذ ساعتين
    };

    const result = await resolveDispatchMode({
      companyId,
      contact,
      sessionProvider: 'META_CLOUD'
    });

    expect(result.mode).toBe('FREE_TEXT');
    expect(result.reason).toBe('CUSTOMER_ACTIVE_IN_WINDOW');
    expect(result.window.isOpen).toBe(true);
  });

  test('يرجع META_TEMPLATE عندما تكون النافذة منتهية ولكن يوجد قالب معتمد', async () => {
    const contact = {
      lastCustomerMessageAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString() // منذ 30 ساعة
    };

    const template = {
      metaTemplateName: 'order_status_update',
      metaTemplateStatus: 'APPROVED'
    };

    const result = await resolveDispatchMode({
      companyId,
      contact,
      sessionProvider: 'META_CLOUD',
      template
    });

    expect(result.mode).toBe('META_TEMPLATE');
    expect(result.reason).toBe('APPROVED_TEMPLATE_AVAILABLE');
    expect(result.window.isOpen).toBe(false);
  });

  test('يرجع SMS عندما تكون النافذة منتهية وبدون قالب معتمد ولكن SMS مفعل', async () => {
    mockFindUnique.mockResolvedValueOnce({
      metadata: JSON.stringify({
        windowPolicyConfig: {
          windowPolicy: 'SMART_FALLBACK',
          smsFallbackEnabled: true,
          smsProvider: 'SMSMISR',
          smsConfig: { apiKey: 'key123', password: 'pass', senderId: 'TestSender' }
        }
      })
    });

    const contact = {
      lastCustomerMessageAt: null // عميل جديد
    };

    const result = await resolveDispatchMode({
      companyId,
      contact,
      sessionProvider: 'META_CLOUD',
      template: null
    });

    expect(result.mode).toBe('SMS');
    expect(result.reason).toBe('OUTSIDE_WINDOW_SMS_FALLBACK');
    expect(result.smsConfig.provider).toBe('SMSMISR');
  });

  test('يرجع BLOCKED عندما تكون النافذة منتهية وبدون قالب وبدون تفعيل SMS', async () => {
    mockFindUnique.mockResolvedValueOnce({
      metadata: JSON.stringify({
        windowPolicyConfig: {
          windowPolicy: 'TEMPLATE_ONLY',
          smsFallbackEnabled: false
        }
      })
    });

    const contact = {
      lastCustomerMessageAt: null
    };

    const result = await resolveDispatchMode({
      companyId,
      contact,
      sessionProvider: 'META_CLOUD',
      template: null
    });

    expect(result.mode).toBe('BLOCKED');
    expect(result.reason).toBe('OUTSIDE_WINDOW_NO_TEMPLATE_OR_SMS');
  });
});
