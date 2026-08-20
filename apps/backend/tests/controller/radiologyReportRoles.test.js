jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/radiologyReportRolesController');

const createResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    status: jest.fn((code) => { response.statusCode = code; return response; }),
    json: jest.fn((payload) => { response.payload = payload; return response; }),
  };
  return response;
};

const createPrisma = () => ({
  radiologyStudy: { findFirst: jest.fn() },
  radiologyReport: { findUnique: jest.fn(), update: jest.fn() },
});

const req = (overrides = {}) => ({
  user: { companyId: 'company-1', id: 'user-1', firstName: '╪ú╪¡┘à╪»', lastName: '┘à╪¡┘à┘ê╪»' },
  params: {},
  body: {},
  ...overrides,
});

describe('radiologyReportRolesController', () => {
  test('recordRole sets typed fields', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1' });
    prisma.radiologyReport.findUnique.mockResolvedValue({ id: 'rep-1', studyId: 'study-1' });
    prisma.radiologyReport.update.mockImplementation(({ data }) => Promise.resolve({ id: 'rep-1', ...data }));
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.recordRole(req({ params: { id: 'study-1' }, body: { role: 'typed', by: '╪│┘â╪▒╪¬┘è╪▒ ╪º┘ä╪¬┘é╪▒┘è╪▒' } }), res);

    expect(res.statusCode).toBe(200);
    const call = prisma.radiologyReport.update.mock.calls[0][0];
    expect(call.data.typedBy).toBe('╪│┘â╪▒╪¬┘è╪▒ ╪º┘ä╪¬┘é╪▒┘è╪▒');
    expect(call.data.typedAt).toBeInstanceOf(Date);
  });

  test('recordRole sets reviewed fields', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1' });
    prisma.radiologyReport.findUnique.mockResolvedValue({ id: 'rep-1', studyId: 'study-1' });
    prisma.radiologyReport.update.mockImplementation(({ data }) => Promise.resolve({ id: 'rep-1', ...data }));
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.recordRole(req({ params: { id: 'study-1' }, body: { role: 'reviewed', by: '╪». ┘à╪▒╪º╪¼╪╣╪⌐' } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyReport.update.mock.calls[0][0].data.reviewedBy).toBe('╪». ┘à╪▒╪º╪¼╪╣╪⌐');
  });

  test('rejects an unknown role', async () => {
    const prisma = createPrisma();
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.recordRole(req({ params: { id: 'study-1' }, body: { role: 'x', by: '╪ú' } }), res);

    expect(res.statusCode).toBe(400);
    expect(prisma.radiologyReport.update).not.toHaveBeenCalled();
  });

  test('returns 400 when report is missing', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1' });
    prisma.radiologyReport.findUnique.mockResolvedValue(null);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.recordRole(req({ params: { id: 'study-1' }, body: { role: 'typed', by: '╪ú' } }), res);

    expect(res.statusCode).toBe(400);
  });

  test('returns 403 when companyId is missing', async () => {
    const prisma = createPrisma();
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.recordRole(req({ user: {}, params: { id: 'study-1' }, body: { role: 'typed', by: '╪ú' } }), res);

    expect(res.statusCode).toBe(403);
  });

  test('clearRole nulls the fields', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1' });
    prisma.radiologyReport.findUnique.mockResolvedValue({ id: 'rep-1', studyId: 'study-1' });
    prisma.radiologyReport.update.mockImplementation(({ data }) => Promise.resolve({ id: 'rep-1', ...data }));
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.clearRole(req({ params: { id: 'study-1', role: 'typed' } }), res);

    expect(res.statusCode).toBe(200);
    const call = prisma.radiologyReport.update.mock.calls[0][0];
    expect(call.data.typedBy).toBeNull();
    expect(call.data.typedAt).toBeNull();
  });
});
