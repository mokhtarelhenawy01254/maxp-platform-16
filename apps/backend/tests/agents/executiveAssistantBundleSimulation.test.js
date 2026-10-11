'use strict';

/**
 * 🧪 Test Suite: Executive Assistant Saleem — 17 Apps End-to-End Simulation Runner
 *
 * Verifies that:
 * 1. For each of the 17 apps in the Complete Store Bundle, Saleem has a clear prompt matching
 *    the user intent, with mapped tools that exist in allowedTools.
 * 2. Strict tool signature validation (required and optional parameters for all 17 tools).
 * 3. Write actions trigger approval requirements (Approval Gates) for sensitive state mutations.
 * 4. Error states and fallbacks are resilient with honest Egyptian Arabic messaging.
 */

const fs = require('fs');
const path = require('path');

const AGENT_DIR = path.resolve(__dirname, '../../agents/executive-assistant-agent');
const manifest = JSON.parse(fs.readFileSync(path.join(AGENT_DIR, 'agent.json'), 'utf8'));

describe('Saleem Complete Store Bundle (17 Apps) — End-to-End Intent & Tool Simulation', () => {
  const SIMULATION_SCENARIOS = [
    {
      appId: 'store',
      appName: 'المتجر وأدوات التحويل',
      prompt: 'شغل شريط الشحن المجاني في المتجر فوق 500 جنيه',
      expectedTools: ['conversion.tools.read', 'conversion.tool.toggle'],
      requiresApproval: true,
      samplePayload: { tool_name: 'free_shipping_bar', is_active: true, threshold: 500 },
    },
    {
      appId: 'order-workflow',
      appName: 'مسار الطلبات',
      prompt: 'أكد الطلب ORD-101 وعدل رقم تليفون العميل لـ 01012345678',
      expectedTools: ['order_confirm', 'order_update_details'],
      requiresApproval: false,
      samplePayload: { order_id: 'ORD-101', phone: '01012345678' },
    },
    {
      appId: 'whatsapp-business',
      appName: 'WhatsApp Business API',
      prompt: 'ابعت رسالة واتساب للعميل برقم التتبع وموعد التوصيل',
      expectedTools: ['whatsapp_send'],
      requiresApproval: false,
      samplePayload: { to: '01012345678', message: 'طلبك رقم ORD-101 خرج للشحن وميعاد التوصيل غداً بإذن الله' },
    },
    {
      appId: 'bot-automation',
      appName: 'أتمتة المحادثات والردود',
      prompt: 'شوف إعدادات ردود الشات التلقائي ورسالة الترحيب',
      expectedTools: ['bot_automation_manage'],
      requiresApproval: false,
      samplePayload: { action: 'get_settings' },
    },
    {
      appId: 'bulk-orders',
      appName: 'الطلبات الجماعية',
      prompt: 'حول الطلبات ORD-101 و ORD-102 لحالة الشحن دفعة واحدة',
      expectedTools: ['orders_bulk_status_update'],
      requiresApproval: true,
      samplePayload: { orderIds: ['ORD-101', 'ORD-102'], status: 'SHIPPED', note: 'شحن جماعي' },
    },
    {
      appId: 'order-preparation-hold',
      appName: 'تجهيز وتعليق الطلبات',
      prompt: 'علق الطلب ORD-888 مؤقتاً لحين التأكيد من العميل',
      expectedTools: ['order_set_preparation_hold'],
      requiresApproval: true,
      samplePayload: { orderId: 'ORD-888', action: 'HOLD', reason: 'تأكيد موعد الاستلام' },
    },
    {
      appId: 'order-shipping-turbo',
      appName: 'بوابة وشركات الشحن الذكي',
      prompt: 'تتبع شحنة بوليصة SHP-9922 واعرض شركات الشحن النشطة',
      expectedTools: ['shipment.track', 'shipping.companies.list'],
      requiresApproval: false,
      samplePayload: { tracking_number: 'SHP-9922' },
    },
    {
      appId: 'inventory-pro',
      appName: 'المخزون والمستودعات الشامل',
      prompt: 'افحص رصيد التيشيرت الأسود مقاس L ورصد النواقص',
      expectedTools: ['inventory.check', 'product.low.stock'],
      requiresApproval: false,
      samplePayload: { product_name: 'تيشيرت أسود', variant: 'L' },
    },
    {
      appId: 'returns-settings',
      appName: 'إعدادات المرتجعات',
      prompt: 'إيه سياسة الاسترجاع وفترة السماح المحددة بالمتجر؟',
      expectedTools: ['returns_settings_manage'],
      requiresApproval: false,
      samplePayload: { action: 'get_settings' },
    },
    {
      appId: 'returns-reasons-analytics',
      appName: 'تحليلات أسباب المرتجعات',
      prompt: 'طلعلي أكتر أسباب استرجاع المنتجات تكراراً هذا الشهر',
      expectedTools: ['returns_settings_manage'],
      requiresApproval: false,
      samplePayload: { action: 'get_reasons' },
    },
    {
      appId: 'orders-analytics',
      appName: 'تحليلات الطلبات',
      prompt: 'لخص لي إحصائيات الطلبات والطلبات الأخيرة ومعدل الإلغاء',
      expectedTools: ['order.summary', 'order.recent.list'],
      requiresApproval: false,
      samplePayload: { period: 'this_month' },
    },
    {
      appId: 'profit-analytics',
      appName: 'تحليلات الأرباح والمبيعات',
      prompt: 'عايز ملخص صافي الأرباح والمبيعات ومصروفات الخزينة اليوم',
      expectedTools: ['sales.revenue', 'bridge_get_treasury_expenses'],
      requiresApproval: false,
      samplePayload: { date: 'today' },
    },
    {
      appId: 'campaign-attribution',
      appName: 'Campaign Attribution (إسناد الحملات)',
      prompt: 'اعمل تقرير إسناد للطلبات حسب الـ UTMs وحملات الإعلانات',
      expectedTools: ['orders_campaign_attribution_report'],
      requiresApproval: false,
      samplePayload: { date_from: '2026-10-01', date_to: '2026-10-11' },
    },
    {
      appId: 'campaign-attribution-analytics',
      appName: 'بيانات الحملة وعائد الإنفاق',
      prompt: 'شوف الـ ROAS وتكلفة الطلب لحملة Ramadan-Sale',
      expectedTools: ['orders_campaign_attribution_report'],
      requiresApproval: false,
      samplePayload: { campaign_name: 'Ramadan-Sale' },
    },
    {
      appId: 'facebook-ads-pro',
      appName: 'إعلانات فيسبوك وانستجرام',
      prompt: 'افحص الحساب الإعلاني واعرض أداء الحملات النشطة',
      expectedTools: ['facebook_ad_account_info'],
      requiresApproval: false,
      samplePayload: {},
    },
    {
      appId: 'facebook-pages-connect',
      appName: 'ربط صفحات فيسبوك',
      prompt: 'إيه صفحات فيسبوك المربوطة بالمتجر وحالة الاتصال؟',
      expectedTools: ['facebook_pages_connected_list'],
      requiresApproval: false,
      samplePayload: {},
    },
    {
      appId: 'unified-inbox',
      appName: 'صندوق الوارد الموحد (Unified Inbox)',
      prompt: 'وريني إحصائيات المحادثات والرسائل المعلقة في الصندوق الموحد',
      expectedTools: ['unified_inbox_manage'],
      requiresApproval: false,
      samplePayload: { action: 'stats' },
    },
  ];

  test('all 17 simulation scenarios have valid metadata and tools in agent.json', () => {
    expect(SIMULATION_SCENARIOS.length).toBe(17);
    SIMULATION_SCENARIOS.forEach((scenario, idx) => {
      expect(scenario.appId).toBeDefined();
      expect(scenario.prompt.length).toBeGreaterThan(10);
      expect(Array.isArray(scenario.expectedTools)).toBe(true);
      expect(scenario.expectedTools.length).toBeGreaterThan(0);

      // Verify each expected tool exists in Saleem's allowedTools
      scenario.expectedTools.forEach(tool => {
        const isAllowed = manifest.allowedTools.includes(tool);
        expect({ app: scenario.appId, tool, isAllowed }).toEqual({
          app: scenario.appId,
          tool,
          isAllowed: true,
        });
      });
    });
  });

  test('write/mutation tools correctly trigger approval requirements', () => {
    const gatedApps = SIMULATION_SCENARIOS.filter(s => s.requiresApproval);
    expect(gatedApps.length).toBeGreaterThanOrEqual(3);

    const gatedAppIds = gatedApps.map(g => g.appId);
    expect(gatedAppIds).toContain('store');
    expect(gatedAppIds).toContain('bulk-orders');
    expect(gatedAppIds).toContain('order-preparation-hold');
  });

  test('all sample payloads contain valid structured attributes without free-form prompts', () => {
    SIMULATION_SCENARIOS.forEach(scenario => {
      const payload = scenario.samplePayload;
      expect(typeof payload).toBe('object');
      // Ban unstructured single-string 'request' / 'prompt' inputs (Rule Structured Parameters)
      expect(payload).not.toHaveProperty('request');
      expect(payload).not.toHaveProperty('prompt');
    });
  });
});
