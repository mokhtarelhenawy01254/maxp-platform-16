jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/radiologyLabelsController');

const createResponse = () => {
  const response = {
    statusCode: 200,
    sent: null,
    status: jest.fn((code) => { response.statusCode = code; return response; }),
    json: jest.fn((payload) => { response.payload = payload; return response; }),
    setHeader: jest.fn(),
    send: jest.fn((data) => { response.sent = data; return response; }),
  };
  return response;
};

const createPrisma = () => ({
  radiologyStudy: { findFirst: jest.fn() },
});

const req = (overrides = {}) => ({
  user: { companyId: 'company-1' },
  params: {},
  ...overrides,
});

describe('radiologyLabelsController', () => {
  test('generates a PDF label for a study', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue({
      id: 'study-1', studyNumber: 'RAD-20260810-2466', patientName: '┘à╪▒┘è╪╢', examTypeName: '╪ú╪┤╪╣╪⌐ CT', createdAt: new Date().toISOString(),
    });
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.getStudyLabel(req({ params: { id: 'study-1' } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.sent).toBeInstanceOf(Buffer);
    expect(res.sent.toString('latin1').includes('%PDF')).toBe(true);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
  });

  test('returns 404 for a missing study', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue(null);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.getStudyLabel(req({ params: { id: 'study-1' } }), res);

    expect(res.statusCode).toBe(404);
  });

  test('returns 403 when companyId is missing', async () => {
    const prisma = createPrisma();
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.getStudyLabel(req({ user: {}, params: { id: 'study-1' } }), res);

    expect(res.statusCode).toBe(403);
  });
});
