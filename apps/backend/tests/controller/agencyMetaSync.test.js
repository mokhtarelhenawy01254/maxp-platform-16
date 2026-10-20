/**
 * Agency OS — Meta spend sync + CSV import
 * تغطية: نجاح السحب، الـ upsert (بدون تكرار صفوف)، حالات الفشل الصريحة، عزل الشركات.
 * كل الاختبارات على mocks — صفر اتصال بميتا وصفر تعديل على بيانات إنتاج.
 */

const mockGetCampaignInsightsSummary = jest.fn();
const mockFacebookAdsConstructor = jest.fn();

jest.mock('../../services/facebookAdsService', () => {
  const MockService = jest.fn().mockImplementation((accessToken, adAccountId) => {
    mockFacebookAdsConstructor(accessToken, adAccountId);
    return { getCampaignInsightsSummary: mockGetCampaignInsightsSummary };
  });
  return MockService;
});

const mockPrisma = {
  company: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  initializeSharedDatabase: jest.fn(),
  executeWithRetry: async (fn) => fn(),
}));

const agencyController = require('../../controller/agencyController');
const agencyMetaSync = require('../../services/agencyMetaSyncService');

const COMPANY_A = 'company_A';

function agencySettings(clients) {
  return JSON.stringify({ agencyData: { clients, approvals: [], settings: {} } });
}

function baseClient(overrides = {}) {
  return {
    id: 'cli_1',
    name: 'H2M',
    adAccountId: 'act_1234567890',
    pricingModel: 'PERCENT_SPEND',
    currentSpend: 9550,
    monthlySales: 40000,
    monthlyOrders: 200,
    monthlyUnits: 0,
    monthlyLogs: [],
    dailyLogs: [],
    extraServices: [],
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function mockReq({ clientId = 'cli_1', body = {}, query = {}, file = null } = {}) {
  return {
    user: { companyId: COMPANY_A },
    params: { clientId },
    body,
    query,
    file,
  };
}

function savedSettings() {
  const updateCall = mockPrisma.company.update.mock.calls[mockPrisma.company.update.mock.calls.length - 1];
  if (!updateCall) return null;
  return JSON.parse(updateCall[0].data.settings);
}

function savedClient() {
  const settings = savedSettings();
  return settings?.agencyData?.clients?.[0] || null;
}

function metaRow({ date, campaignId, spend, purchases, purchaseValue }) {
  const row = {
    campaign_id: campaignId,
    campaign_name: `campaign ${campaignId}`,
    date_start: date,
    date_stop: date,
    spend: String(spend),
  };
  if (purchases !== undefined) {
    row.actions = [{ action_type: 'purchase', value: String(purchases) }];
  }
  if (purchaseValue !== undefined) {
    row.action_values = [{ action_type: 'purchase', value: String(purchaseValue) }];
  }
  return row;
}

let errorSpy;
let logSpy;

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.company.update.mockResolvedValue({});
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
  logSpy.mockRestore();
});

describe('POST /agency/clients/:clientId/sync-meta', () => {
  it('يسحب إنفاق ميتا الحقيقي ويكتب dailyLogs و monthlyLogs مرة واحدة لكل تاريخ', async () => {
    const client = baseClient();
    mockPrisma.company.findUnique.mockResolvedValue({
      settings: agencySettings([client]),
      facebookAdsAccessToken: 'COMPANY_META_TOKEN',
      facebookUserAccessToken: null,
    });

    mockGetCampaignInsightsSummary.mockResolvedValue({
      success: true,
      data: [
        metaRow({ date: '2026-10-01', campaignId: 'c1', spend: 1000.5, purchases: 10, purchaseValue: 4000 }),
        metaRow({ date: '2026-10-01', campaignId: 'c2', spend: 500.25, purchases: 5, purchaseValue: 2000 }),
        metaRow({ date: '2026-10-02', campaignId: 'c1', spend: 800, purchases: 8, purchaseValue: 3200 }),
      ],
    });

    const req = mockReq({ body: { from: '2026-10-01', to: '2026-10-02' } });
    const res = mockRes();

    await agencyController.syncClientMetaSpend(req, res);

    expect(res.status).not.toHaveBeenCalledWith(500);
    const payload = res.json.mock.calls[0][0];

    expect(payload.success).toBe(true);
    expect(payload.data.summary.synced).toBe(2);
    expect(payload.data.summary.spend).toBeCloseTo(2300.75, 2);
    expect(payload.data.summary.orders).toBe(23);
    expect(payload.data.summary.period).toEqual({ from: '2026-10-01', to: '2026-10-02' });
    expect(typeof payload.data.lastSyncedAt).toBe('string');

    // التوكن والحساب جايين من الشركة/العميل — مفيش توكن جديد
    expect(mockFacebookAdsConstructor).toHaveBeenCalledWith('COMPANY_META_TOKEN', 'act_1234567890');
    expect(mockGetCampaignInsightsSummary).toHaveBeenCalledWith(
      'act_1234567890',
      { since: '2026-10-01', until: '2026-10-02' },
      { timeIncrement: 1 }
    );

    const saved = savedClient();
    expect(saved.dailyLogs).toHaveLength(2);
    const oct1 = saved.dailyLogs.find((d) => d.date === '2026-10-01');
    expect(oct1.adSpend).toBeCloseTo(1500.75, 2);
    expect(oct1.ordersCount).toBe(15);
    expect(oct1.salesRevenue).toBeCloseTo(6000, 2);
    expect(oct1.source).toBe('META');

    const monthly = saved.monthlyLogs.find((m) => m.month === '2026-10');
    expect(monthly.adSpend).toBeCloseTo(2300.75, 2);
    expect(monthly.ordersCount).toBe(23);
    expect(saved.currentSpend).toBeCloseTo(2300.75, 2);
    expect(saved.dataSource).toBe('META');
    expect(saved.lastSyncedAt).toBe(payload.data.lastSyncedAt);
  });

  it('إعادة السحب لنفس الفترة تعمل upsert — ممنوع تكرار الصفوف', async () => {
    const client = baseClient();
    mockPrisma.company.findUnique.mockImplementation(async () => ({
      settings: agencySettings([client]),
      facebookAdsAccessToken: 'COMPANY_META_TOKEN',
      facebookUserAccessToken: null,
    }));

    mockPrisma.company.update.mockImplementation(async ({ data }) => {
      // نرجّع الإعدادات المحفوظة للقراءة التالية (نفس سلوك قاعدة البيانات)
      mockPrisma.company.findUnique.mockResolvedValue({
        settings: data.settings,
        facebookAdsAccessToken: 'COMPANY_META_TOKEN',
        facebookUserAccessToken: null,
      });
      return {};
    });

    mockGetCampaignInsightsSummary.mockResolvedValue({
      success: true,
      data: [
        metaRow({ date: '2026-10-01', campaignId: 'c1', spend: 1000, purchases: 10, purchaseValue: 4000 }),
        metaRow({ date: '2026-10-02', campaignId: 'c1', spend: 500, purchases: 5, purchaseValue: 2000 }),
      ],
    });

    const firstRes = mockRes();
    await agencyController.syncClientMetaSpend(mockReq({ body: { from: '2026-10-01', to: '2026-10-02' } }), firstRes);
    const firstSaved = savedClient();
    expect(firstSaved.dailyLogs).toHaveLength(2);
    const firstIds = firstSaved.dailyLogs.map((d) => d.id);

    // السحب التاني بأرقام محدّثة لنفس التواريخ
    mockGetCampaignInsightsSummary.mockResolvedValue({
      success: true,
      data: [
        metaRow({ date: '2026-10-01', campaignId: 'c1', spend: 1200, purchases: 12, purchaseValue: 4800 }),
        metaRow({ date: '2026-10-02', campaignId: 'c1', spend: 700, purchases: 7, purchaseValue: 2800 }),
      ],
    });

    const secondRes = mockRes();
    await agencyController.syncClientMetaSpend(mockReq({ body: { from: '2026-10-01', to: '2026-10-02' } }), secondRes);

    const secondSaved = savedClient();
    expect(secondSaved.dailyLogs).toHaveLength(2); // مش 4
    expect(secondSaved.dailyLogs.map((d) => d.id).sort()).toEqual(firstIds.sort());
    expect(secondSaved.dailyLogs.find((d) => d.date === '2026-10-01').adSpend).toBeCloseTo(1200, 2);

    const octLogs = secondSaved.monthlyLogs.filter((m) => m.month === '2026-10');
    expect(octLogs).toHaveLength(1);
    expect(octLogs[0].adSpend).toBeCloseTo(1900, 2);
  });

  it('مفيش adAccountId → 400 برسالة عربية وصفر كتابة', async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      settings: agencySettings([baseClient({ adAccountId: '' })]),
      facebookAdsAccessToken: 'COMPANY_META_TOKEN',
      facebookUserAccessToken: null,
    });

    const res = mockRes();
    await agencyController.syncClientMetaSpend(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(false);
    expect(payload.code).toBe('MISSING_AD_ACCOUNT_ID');
    expect(payload.message).toMatch(/حساب إعلاني/);
    expect(mockGetCampaignInsightsSummary).not.toHaveBeenCalled();
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });

  it('مفيش توكن ميتا للشركة → 400 وصفر كتابة', async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      settings: agencySettings([baseClient()]),
      facebookAdsAccessToken: null,
      facebookUserAccessToken: null,
    });

    const res = mockRes();
    await agencyController.syncClientMetaSpend(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = res.json.mock.calls[0][0];
    expect(payload.code).toBe('MISSING_META_TOKEN');
    expect(payload.message).toMatch(/توكن/);
    expect(mockGetCampaignInsightsSummary).not.toHaveBeenCalled();
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });

  it('يستخدم facebookUserAccessToken كبديل لو facebookAdsAccessToken فاضي (نفس مصدر التنبيهات)', async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      settings: agencySettings([baseClient()]),
      facebookAdsAccessToken: null,
      facebookUserAccessToken: 'USER_TOKEN_FALLBACK',
    });
    mockGetCampaignInsightsSummary.mockResolvedValue({ success: true, data: [] });

    const res = mockRes();
    await agencyController.syncClientMetaSpend(mockReq(), res);

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(mockFacebookAdsConstructor).toHaveBeenCalledWith('USER_TOKEN_FALLBACK', 'act_1234567890');
  });

  it('فشل ميتا → 502 بالسبب وصفر كتابة', async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      settings: agencySettings([baseClient()]),
      facebookAdsAccessToken: 'COMPANY_META_TOKEN',
      facebookUserAccessToken: null,
    });
    mockGetCampaignInsightsSummary.mockResolvedValue({
      success: false,
      error: { message: 'Invalid OAuth access token', code: 190 },
    });

    const res = mockRes();
    await agencyController.syncClientMetaSpend(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(502);
    const payload = res.json.mock.calls[0][0];
    expect(payload.code).toBe('META_SYNC_FAILED');
    expect(payload.reason).toMatch(/Invalid OAuth access token/);
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
    // السبب الحقيقي متسجل في اللوج
    expect(errorSpy).toHaveBeenCalled();
    const logged = errorSpy.mock.calls.map((call) => call.join(' ')).join(' ');
    expect(logged).toMatch(/Invalid OAuth access token/);
  });

  it('استثناء أثناء نداء ميتا → 502', async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      settings: agencySettings([baseClient()]),
      facebookAdsAccessToken: 'COMPANY_META_TOKEN',
      facebookUserAccessToken: null,
    });
    mockGetCampaignInsightsSummary.mockRejectedValue(new Error('socket hang up'));

    const res = mockRes();
    await agencyController.syncClientMetaSpend(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json.mock.calls[0][0].reason).toMatch(/socket hang up/);
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });

  it('ميتا رجعت صفر صفوف → 200 بدون كتابة أرقام وهمية', async () => {
    const client = baseClient({ dailyLogs: [] });
    mockPrisma.company.findUnique.mockResolvedValue({
      settings: agencySettings([client]),
      facebookAdsAccessToken: 'COMPANY_META_TOKEN',
      facebookUserAccessToken: null,
    });
    mockGetCampaignInsightsSummary.mockResolvedValue({ success: true, data: [] });

    const res = mockRes();
    await agencyController.syncClientMetaSpend(mockReq(), res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.summary.synced).toBe(0);
    const saved = savedClient();
    expect(saved.dailyLogs).toHaveLength(0);
    expect(saved.monthlyLogs).toHaveLength(0);
  });

  it('ي preservar المبيعات والقطع اليدوية لو ميتا مابلغتش عنها + isPaid', async () => {
    const client = baseClient({
      dailyLogs: [
        {
          id: 'dlog_existing',
          date: '2026-10-05',
          month: '2026-10',
          adSpend: 100,
          salesRevenue: 9000,
          ordersCount: 30,
          unitsSold: 45,
          notes: 'إدخال يدوي من فريق الحساب',
          createdAt: '2026-10-05T10:00:00.000Z',
        },
      ],
      monthlyLogs: [
        { month: '2026-10', adSpend: 100, salesRevenue: 9000, ordersCount: 30, unitsSold: 45, isPaid: true, paidAt: '2026-10-06T00:00:00.000Z' },
      ],
    });

    mockPrisma.company.findUnique.mockResolvedValue({
      settings: agencySettings([client]),
      facebookAdsAccessToken: 'COMPANY_META_TOKEN',
      facebookUserAccessToken: null,
    });
    mockGetCampaignInsightsSummary.mockResolvedValue({
      success: true,
      data: [{ campaign_id: 'c1', campaign_name: 'c1', date_start: '2026-10-05', date_stop: '2026-10-05', spend: '350.5' }],
    });

    const res = mockRes();
    await agencyController.syncClientMetaSpend(
      mockReq({ body: { from: '2026-10-05', to: '2026-10-05' } }),
      res
    );

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.summary.unavailableMetrics).toEqual(['salesRevenue', 'unitsSold']);

    const saved = savedClient();
    expect(saved.dailyLogs).toHaveLength(1);
    const day = saved.dailyLogs[0];
    expect(day.id).toBe('dlog_existing');
    expect(day.adSpend).toBeCloseTo(350.5, 2); // الإنفاق من ميتا
    expect(day.salesRevenue).toBe(9000); // مش صفر مضلل
    expect(day.unitsSold).toBe(45);
    expect(day.ordersCount).toBe(30); // ميتا مابلغتش عن purchases
    expect(day.notes).toBe('إدخال يدوي من فريق الحساب');

    const monthly = saved.monthlyLogs.find((m) => m.month === '2026-10');
    expect(monthly.isPaid).toBe(true);
    expect(monthly.paidAt).toBe('2026-10-06T00:00:00.000Z');
    expect(monthly.adSpend).toBeCloseTo(350.5, 2);
  });

  it('فترة تاريخ غير صحيحة → 400 وصفر نداءات لميتا', async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      settings: agencySettings([baseClient()]),
      facebookAdsAccessToken: 'COMPANY_META_TOKEN',
      facebookUserAccessToken: null,
    });

    const res = mockRes();
    await agencyController.syncClientMetaSpend(mockReq({ body: { from: '2026-13-40', to: '2026-10-01' } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].code).toBe('INVALID_DATE_RANGE');
    expect(mockGetCampaignInsightsSummary).not.toHaveBeenCalled();
  });
});

describe('POST /agency/clients/:clientId/import-csv', () => {
  const CSV_OK = [
    'Date,Campaign Name,Amount Spent,Purchases',
    '2026-10-01,Campaign A,"1,000.50",10',
    '2026-10-01,Campaign B,500,5',
    '2026-10-02,Campaign A,750,7',
  ].join('\n');

  beforeEach(() => {
    mockPrisma.company.findUnique.mockResolvedValue({
      settings: agencySettings([baseClient()]),
    });
  });

  it('يستورد CSV ويعمل upsert بالتاريخ ويجمع صفوف الحملات', async () => {
    const res = mockRes();
    await agencyController.importClientCsv(mockReq({ body: { csv: CSV_OK } }), res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.summary.synced).toBe(2);
    expect(payload.data.summary.spend).toBeCloseTo(2250.5, 2);
    expect(payload.data.summary.orders).toBe(22);
    expect(payload.data.rejectedRows).toBe(0);

    const saved = savedClient();
    expect(saved.dailyLogs).toHaveLength(2);
    const oct1 = saved.dailyLogs.find((d) => d.date === '2026-10-01');
    expect(oct1.adSpend).toBeCloseTo(1500.5, 2);
    expect(oct1.ordersCount).toBe(15);
    expect(oct1.source).toBe('CSV');
    expect(saved.dataSource).toBe('CSV');
  });

  it('صف بتاريخ غلط يترفض ويتحسب في الملخص', async () => {
    const csv = [
      'Date,Campaign Name,Amount Spent,Purchases',
      '2026-10-01,Campaign A,1000,10',
      '2026-15-45,Campaign B,500,5',
      'not-a-date,Campaign C,300,3',
      '2026-10-02,Campaign A,700,7',
    ].join('\n');

    const res = mockRes();
    await agencyController.importClientCsv(mockReq({ body: { csv } }), res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.summary.synced).toBe(2);
    expect(payload.data.rejectedRows).toBe(2);
    expect(payload.data.rejectedSamples).toHaveLength(2);
    expect(payload.data.rejectedSamples[0].reason).toMatch(/تاريخ/);
    expect(payload.message).toMatch(/رفض/);

    const saved = savedClient();
    expect(saved.dailyLogs.map((d) => d.date).sort()).toEqual(['2026-10-01', '2026-10-02']);
  });

  it('CSV كله صفوف مرفوضة → 400 وصفر كتابة', async () => {
    const csv = ['Date,Campaign Name,Amount Spent,Purchases', 'bad-date,A,100,1'].join('\n');

    const res = mockRes();
    await agencyController.importClientCsv(mockReq({ body: { csv } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = res.json.mock.calls[0][0];
    expect(payload.code).toBe('NO_VALID_ROWS');
    expect(payload.data.rejectedRows).toBe(1);
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });

  it('رأس ملف غلط → 400 مع الأعمدة الناقصة', async () => {
    const csv = ['Name,Value', 'A,100'].join('\n');

    const res = mockRes();
    await agencyController.importClientCsv(mockReq({ body: { csv } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = res.json.mock.calls[0][0];
    expect(payload.code).toBe('INVALID_CSV_HEADER');
    expect(payload.missingHeaders).toEqual(expect.arrayContaining(['date', 'spend']));
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });

  it('بيقرأ CSV من ملف مرفوع (multer memory)', async () => {
    const res = mockRes();
    await agencyController.importClientCsv(
      mockReq({ file: { buffer: Buffer.from(CSV_OK, 'utf8'), originalname: 'meta.csv' } }),
      res
    );

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.summary.synced).toBe(2);
  });

  it('import CSV لنفس التواريخ مرتين مبيعملش تكرار', async () => {
    mockPrisma.company.update.mockImplementation(async ({ data }) => {
      mockPrisma.company.findUnique.mockResolvedValue({ settings: data.settings });
      return {};
    });

    await agencyController.importClientCsv(mockReq({ body: { csv: CSV_OK } }), mockRes());
    await agencyController.importClientCsv(mockReq({ body: { csv: CSV_OK } }), mockRes());

    const saved = savedClient();
    expect(saved.dailyLogs).toHaveLength(2);
    expect(saved.monthlyLogs.filter((m) => m.month === '2026-10')).toHaveLength(1);
  });

  it('تواريخ DD/MM/YYYY بتتحول صح', async () => {
    const csv = ['Date, Campaign Name, Amount Spent, Purchases', '15/10/2026, Campaign A, 400, 4'].join('\n');

    const res = mockRes();
    await agencyController.importClientCsv(mockReq({ body: { csv } }), res);

    expect(res.json.mock.calls[0][0].success).toBe(true);
    expect(savedClient().dailyLogs[0].date).toBe('2026-10-15');
  });
});

describe('عزل الشركات (Tenant Isolation)', () => {
  it('sync-meta لعميل شركة تانية → 404 وصفر كتابة', async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      settings: agencySettings([baseClient({ id: 'cli_other_company' })]),
      facebookAdsAccessToken: 'COMPANY_META_TOKEN',
      facebookUserAccessToken: null,
    });

    const res = mockRes();
    await agencyController.syncClientMetaSpend(mockReq({ clientId: 'cli_1' }), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockGetCampaignInsightsSummary).not.toHaveBeenCalled();
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });

  it('import-csv لعميل شركة تانية → 404 وصفر كتابة', async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      settings: agencySettings([baseClient({ id: 'cli_other_company' })]),
    });

    const res = mockRes();
    await agencyController.importClientCsv(
      mockReq({ clientId: 'cli_1', body: { csv: 'Date,Campaign Name,Amount Spent,Purchases\n2026-10-01,A,100,1' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });

  it('يقرا إعدادات الشركة الحالية بس (req.user.companyId) — مفيش تمرير companyId من العميل', async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      settings: agencySettings([baseClient()]),
      facebookAdsAccessToken: 'COMPANY_META_TOKEN',
      facebookUserAccessToken: null,
    });
    mockGetCampaignInsightsSummary.mockResolvedValue({ success: true, data: [] });

    await agencyController.syncClientMetaSpend(mockReq({ body: { companyId: 'company_EVIL' } }), mockRes());

    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: COMPANY_A } })
    );
    expect(mockPrisma.company.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: COMPANY_A } })
    );
  });
});

describe('agencyMetaSyncService — pure helpers', () => {
  it('normalizeAdAccountId يضيف act_ مرة واحدة بس', () => {
    expect(agencyMetaSync.normalizeAdAccountId('12345')).toBe('act_12345');
    expect(agencyMetaSync.normalizeAdAccountId('act_12345')).toBe('act_12345');
    expect(agencyMetaSync.normalizeAdAccountId(' act_  ')).toBe('act_');
    expect(agencyMetaSync.normalizeAdAccountId('')).toBe('');
  });

  it('defaultDateRange = آخر 30 يوم شامل اليوم', () => {
    expect(agencyMetaSync.defaultDateRange('2026-10-20')).toEqual({ from: '2026-09-21', to: '2026-10-20' });
  });

  it('extractPurchaseMetric مبيجمعش أنواع الشراء المختلفة مرتين', () => {
    const result = agencyMetaSync.extractPurchaseMetric(
      [
        { action_type: 'purchase', value: '3' },
        { action_type: 'omni_purchase', value: '3' },
        { action_type: 'link_click', value: '50' },
      ],
      [
        { action_type: 'purchase', value: '900' },
        { action_type: 'omni_purchase', value: '900' },
      ]
    );
    expect(result.ordersCount).toBe(3);
    expect(result.salesRevenue).toBe(900);
  });

  it('extractPurchaseMetric متقولش صفر لما actions مش موجودة', () => {
    const result = agencyMetaSync.extractPurchaseMetric(undefined, undefined);
    expect(result.ordersReported).toBe(false);
    expect(result.salesReported).toBe(false);
  });
});
