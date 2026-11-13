const mockPrisma = {
  conversation: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  company: {
    findUnique: jest.fn(),
  },
  dentalLabCase: {
    findMany: jest.fn(),
  },
  appointment: {
    findMany: jest.fn(),
  },
  serviceOrder: {
    findMany: jest.fn(),
  },
  educationEnrollment: {
    findMany: jest.fn(),
  },
  task: {
    findMany: jest.fn(),
  },
  order: {
    findMany: jest.fn(),
  },
  postResponseSettings: {
    findUnique: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  executeWithRetry: jest.fn(async (operation) => operation()),
}));

const { getConversationVerticalContext } = require('../../controller/conversation/verticalContextController');
const { enrichMemoryContextWithPostProduct } = require('../../utils/postProductMappingHelper');

function createRes() {
  const res = {
    statusCode: 200,
    body: null,
    status: jest.fn(function status(code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function json(payload) {
      this.body = payload;
      return this;
    }),
  };
  return res;
}

describe('verticalContextController.getConversationVerticalContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 403 when companyId is missing', async () => {
    const req = { params: { id: 'conv-1' }, user: { id: 'user-1' } };
    const res = createRes();

    await getConversationVerticalContext(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body.success).toBe(false);
    expect(mockPrisma.conversation.findFirst).not.toHaveBeenCalled();
  });

  test('returns 404 when conversation does not belong to company', async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue(null);
    const req = { params: { id: 'conv-other' }, user: { id: 'user-1', companyId: 'comp-1' } };
    const res = createRes();

    await getConversationVerticalContext(req, res);

    expect(mockPrisma.conversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conv-other', companyId: 'comp-1' },
      })
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body.success).toBe(false);
  });

  test('resolves dental vertical and returns dental cases summary', async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue({
      id: 'conv-dental',
      companyId: 'comp-dental',
      channel: 'WHATSAPP',
      customerId: 'cust-1',
      customer: {
        id: 'cust-1',
        firstName: 'أحمد',
        lastName: 'علي',
        phone: '01012345678',
        phoneNormalized: '01012345678',
        email: null,
      },
    });
    mockPrisma.company.findUnique.mockResolvedValue({
      businessSpecialty: { slug: 'dental-lab', nameAr: 'معمل أسنان', nameEn: 'Dental Lab' },
      installedApps: [{ app: { slug: 'dental-lab-app' } }],
    });
    mockPrisma.dentalLabCase.findMany.mockResolvedValue([
      { id: 'case-1', caseNumber: 'DL-2026-001', patientName: 'أحمد علي', status: 'DESIGN', total: 1500, createdAt: '2026-11-10T10:00:00Z' },
      { id: 'case-2', caseNumber: 'DL-2026-002', patientName: 'أحمد علي', status: 'DELIVERED', total: 800, createdAt: '2026-11-01T10:00:00Z' },
    ]);

    const req = { params: { id: 'conv-dental' }, user: { id: 'u1', companyId: 'comp-dental' } };
    const res = createRes();

    await getConversationVerticalContext(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vertical).toBe('dental');
    expect(res.body.data.activeApps).toEqual(['dental-lab-app']);
    expect(res.body.data.summary.primaryCount).toBe(1);
    expect(res.body.data.summary.secondaryValue).toBe(2300);
    expect(res.body.data.summary.items).toHaveLength(2);
    expect(mockPrisma.dentalLabCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: 'comp-dental', isDeleted: false }),
      })
    );
  });

  test('resolves medical vertical from specialty and returns appointments', async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue({
      id: 'conv-med',
      companyId: 'comp-med',
      channel: 'FACEBOOK',
      customerId: 'cust-med',
      customer: {
        id: 'cust-med',
        firstName: 'سارة',
        lastName: 'محمد',
        phone: '01122334455',
        phoneNormalized: null,
        email: null,
      },
    });
    mockPrisma.company.findUnique.mockResolvedValue({
      name: 'عيادة النور التخصصية',
      slug: 'al-noor-clinic',
      businessSpecialty: { slug: 'clinic-care', nameAr: 'عيادة تخصصية', nameEn: 'Clinic' },
      installedApps: [{ app: { slug: 'booking-app' } }],
    });
    mockPrisma.appointment.findMany.mockResolvedValue([
      { id: 'apt-1', title: 'كشف باطنة', appointmentDate: '2026-11-15T00:00:00Z', startTime: '14:00', status: 'confirmed', createdAt: '2026-11-12T08:00:00Z' },
      { id: 'apt-2', title: 'متابعة', appointmentDate: '2026-10-15T00:00:00Z', startTime: '12:00', status: 'completed', createdAt: '2026-10-10T08:00:00Z' },
    ]);

    const req = { params: { id: 'conv-med' }, user: { id: 'u1', companyId: 'comp-med' } };
    const res = createRes();

    await getConversationVerticalContext(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vertical).toBe('medical');
    expect(res.body.data.summary.primaryCount).toBe(1);
    expect(res.body.data.summary.secondaryValue).toBe(2);
    expect(res.body.data.summary.items).toHaveLength(2);
    expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: 'comp-med' }),
      })
    );
  });

  test('resolves education vertical for academies with education-academy specialty and booking-app', async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue({
      id: 'conv-codetreps',
      companyId: 'comp-codetreps',
      channel: 'FACEBOOK',
      customerId: 'cust-student',
      customer: {
        id: 'cust-student',
        firstName: 'محمد',
        lastName: 'أبو المجد',
        phone: '0114336760',
        phoneNormalized: '0114336760',
        email: null,
      },
    });
    mockPrisma.company.findUnique.mockResolvedValue({
      name: 'CodeTreps',
      slug: 'codetreps',
      businessSpecialty: { slug: 'education-academy', nameAr: 'أكاديميات ومراكز التعليم', nameEn: 'Education & Academy' },
      installedApps: [{ app: { slug: 'booking-app' } }],
    });
    mockPrisma.educationEnrollment.findMany.mockResolvedValue([]);
    mockPrisma.appointment.findMany.mockResolvedValue([
      {
        id: 'apt-demo-1',
        title: 'تفاصيل أكتر عن الديمو داي - كودينج للأطفال',
        appointmentDate: '2026-11-20T16:00:00Z',
        startTime: '16:00',
        status: 'confirmed',
        createdAt: '2026-11-12T10:00:00Z',
      },
    ]);

    const req = { params: { id: 'conv-codetreps' }, user: { id: 'u1', companyId: 'comp-codetreps' } };
    const res = createRes();

    await getConversationVerticalContext(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vertical).toBe('education');
    expect(res.body.data.summary.countLabel).toBe('المواعيد والاشتراكات');
    expect(res.body.data.summary.primaryCount).toBe(1);
    expect(res.body.data.summary.items).toHaveLength(1);
    expect(res.body.data.summary.items[0].type).toBe('appointment');
    expect(res.body.data.summary.items[0].title).toContain('الديمو داي');
  });

  test('Tier 1: Explicit inboxVerticalProfile settings override takes priority over specialty and apps', async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue({
      id: 'conv-override',
      companyId: 'comp-override',
      channel: 'WHATSAPP',
      customerId: 'cust-ov',
      customer: {
        id: 'cust-ov',
        firstName: 'علي',
        lastName: 'حسين',
        phone: '01000000000',
        phoneNormalized: '01000000000',
        email: null,
      },
    });
    mockPrisma.company.findUnique.mockResolvedValue({
      name: 'Multi-Activity Center',
      slug: 'multi-activity',
      settings: JSON.stringify({ inboxVerticalProfile: 'education' }),
      businessSpecialty: { slug: 'ecommerce-retail', nameAr: 'التجارة والمتاجر', nameEn: 'E-commerce' },
      installedApps: [{ app: { slug: 'store' } }],
    });
    mockPrisma.educationEnrollment.findMany.mockResolvedValue([]);
    mockPrisma.appointment.findMany.mockResolvedValue([]);

    const req = { params: { id: 'conv-override' }, user: { id: 'u1', companyId: 'comp-override' } };
    const res = createRes();

    await getConversationVerticalContext(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vertical).toBe('education');
  });

  test('resolves services vertical for generic booking-app without medical keywords', async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue({
      id: 'conv-booking-generic',
      companyId: 'comp-generic',
      channel: 'FACEBOOK',
      customerId: 'cust-gen',
      customer: {
        id: 'cust-gen',
        firstName: 'سامي',
        lastName: 'أحمد',
        phone: '01099887766',
        phoneNormalized: '01099887766',
        email: null,
      },
    });
    mockPrisma.company.findUnique.mockResolvedValue({
      name: 'مكتب الرواد للاستشارات',
      slug: 'al-rowad-consulting',
      businessSpecialty: null,
      installedApps: [{ app: { slug: 'booking-app' } }],
    });
    mockPrisma.serviceOrder.findMany.mockResolvedValue([]);

    const req = { params: { id: 'conv-booking-generic' }, user: { id: 'u1', companyId: 'comp-generic' } };
    const res = createRes();

    await getConversationVerticalContext(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vertical).toBe('services');
  });

  test('resolves services vertical and returns service orders', async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue({
      id: 'conv-srv',
      companyId: 'comp-srv',
      channel: 'FACEBOOK',
      customerId: 'cust-srv',
      customer: {
        id: 'cust-srv',
        firstName: 'كريم',
        lastName: 'حسن',
        phone: '01234567890',
        phoneNormalized: '01234567890',
        email: null,
      },
    });
    mockPrisma.company.findUnique.mockResolvedValue({
      businessSpecialty: { slug: 'creative-services', nameAr: 'خدمات إبداعية', nameEn: 'Creative Services' },
      installedApps: [],
    });
    mockPrisma.serviceOrder.findMany.mockResolvedValue([
      {
        id: 'so-1',
        status: 'IN_PROGRESS',
        description: 'تصميم هوية بصرية',
        createdAt: '2026-11-11T12:00:00Z',
        service: { name: 'Branding Package', price: 4500 },
      },
    ]);

    const req = { params: { id: 'conv-srv' }, user: { id: 'u1', companyId: 'comp-srv' } };
    const res = createRes();

    await getConversationVerticalContext(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vertical).toBe('services');
    expect(res.body.data.summary.primaryCount).toBe(1);
    expect(res.body.data.summary.secondaryValue).toBe(4500);
    expect(res.body.data.summary.items[0].service.name).toBe('Branding Package');
  });

  test('falls back to commerce vertical and returns orders count + LTV', async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue({
      id: 'conv-ecom',
      companyId: 'comp-ecom',
      channel: 'FACEBOOK',
      customerId: 'cust-ecom',
      customer: {
        id: 'cust-ecom',
        firstName: 'منى',
        lastName: 'خالد',
        phone: '01555555555',
        phoneNormalized: '01555555555',
        email: null,
      },
    });
    mockPrisma.company.findUnique.mockResolvedValue({
      businessSpecialty: { slug: 'ecommerce-retail', nameAr: 'التجارة والمتاجر', nameEn: 'E-commerce & Retail' },
      installedApps: [{ app: { slug: 'store' } }],
    });
    mockPrisma.order.findMany.mockResolvedValue([
      { id: 'ord-1', orderNumber: 'ORD-101', status: 'CONFIRMED', paymentStatus: 'PAID', total: 1200, currency: 'EGP', createdAt: '2026-11-12T09:00:00Z' },
      { id: 'ord-2', orderNumber: 'ORD-100', status: 'CANCELLED', paymentStatus: 'PENDING', total: 500, currency: 'EGP', createdAt: '2026-11-01T09:00:00Z' },
    ]);

    const req = { params: { id: 'conv-ecom' }, user: { id: 'u1', companyId: 'comp-ecom' } };
    const res = createRes();

    await getConversationVerticalContext(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vertical).toBe('commerce');
    expect(res.body.data.summary.primaryCount).toBe(2);
    expect(res.body.data.summary.secondaryValue).toBe(1200);
    expect(res.body.data.summary.items).toHaveLength(2);
  });
});

describe('postProductMappingHelper.enrichMemoryContextWithPostProduct', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('enriches companyVertical even when threadId is null', async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      businessSpecialty: { slug: 'dental-lab', nameAr: 'معمل أسنان', nameEn: 'Dental Lab' },
      installedApps: [{ app: { slug: 'dental-lab-app' } }],
    });

    const result = await enrichMemoryContextWithPostProduct('comp-1', null, { existing: true });

    expect(result).toEqual({
      existing: true,
      companyVertical: {
        specialtySlug: 'dental-lab',
        specialtyNameAr: 'معمل أسنان',
        specialtyNameEn: 'Dental Lab',
        activeApps: ['dental-lab-app'],
      },
    });
    expect(mockPrisma.conversation.findUnique).not.toHaveBeenCalled();
  });

  test('preserves referredProduct enrichment alongside companyVertical when postId exists', async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      businessSpecialty: { slug: 'ecommerce-retail', nameAr: 'متجر', nameEn: 'E-commerce' },
      installedApps: [{ app: { slug: 'store' } }],
    });
    mockPrisma.conversation.findUnique.mockResolvedValue({
      metadata: JSON.stringify({ postId: 'post-99' }),
    });
    mockPrisma.postResponseSettings.findUnique.mockResolvedValue({
      product: { id: 'prod-1', name: 'تيشيرت قطن', price: 350, description: 'قطن مصري' },
    });

    const result = await enrichMemoryContextWithPostProduct('comp-1', 'thread-1', {});

    expect(result.companyVertical).toEqual({
      specialtySlug: 'ecommerce-retail',
      specialtyNameAr: 'متجر',
      specialtyNameEn: 'E-commerce',
      activeApps: ['store'],
    });
    expect(result.referredProduct).toEqual({
      id: 'prod-1',
      name: 'تيشيرت قطن',
      price: 350,
      description: 'قطن مصري',
    });
  });
});
