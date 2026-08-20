jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/radiologyDevicesController');

const createResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    status: jest.fn((code) => { response.statusCode = code; return response; }),
    json: jest.fn((payload) => { response.payload = payload; return response; }),
  };
  return response;
};

const req = (overrides = {}) => ({
  user: { companyId: 'company-1', id: 'user-1' },
  query: {},
  params: {},
  body: {},
  ...overrides,
});

const createPrisma = () => ({
  radiologyDevice: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
});

describe('radiologyDevicesController', () => {
  test('lists company-scoped devices (active only by default)', async () => {
    const prisma = createPrisma();
    prisma.radiologyDevice.findMany.mockResolvedValue([{ id: 'd1', name: 'جهاز CT' }]);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.listDevices(req({}), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyDevice.findMany).toHaveBeenCalledWith({ where: { companyId: 'company-1', isActive: true }, orderBy: { name: 'asc' } });
    expect(res.payload.data).toHaveLength(1);
  });

  test('creates a device requiring a name', async () => {
    const prisma = createPrisma();
    prisma.radiologyDevice.create.mockImplementation(({ data }) => Promise.resolve({ id: 'd1', ...data }));
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.createDevice(req({ body: { name: 'جهاز MRI', room: 'الغرفة 2', modality: 'MRI' } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyDevice.create).toHaveBeenCalledWith({ data: expect.objectContaining({ name: 'جهاز MRI', room: 'الغرفة 2', modality: 'MRI', companyId: 'company-1' }) });
  });

  test('rejects a missing device name', async () => {
    const prisma = createPrisma();
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.createDevice(req({ body: {} }), res);

    expect(res.statusCode).toBe(400);
    expect(prisma.radiologyDevice.create).not.toHaveBeenCalled();
  });

  test('updates and soft-deletes a device', async () => {
    const prisma = createPrisma();
    prisma.radiologyDevice.findFirst.mockResolvedValue({ id: 'd1', companyId: 'company-1', name: 'جهاز' });
    prisma.radiologyDevice.update.mockImplementation(({ data }) => Promise.resolve({ id: 'd1', ...data }));
    getSharedPrismaClient.mockReturnValue(prisma);

    const res1 = createResponse();
    await controller.updateDevice(req({ params: { id: 'd1' }, body: { isActive: false } }), res1);
    expect(res1.statusCode).toBe(200);
    expect(prisma.radiologyDevice.update).toHaveBeenCalledWith({ where: { id: 'd1' }, data: expect.objectContaining({ isActive: false }) });

    const res2 = createResponse();
    await controller.deleteDevice(req({ params: { id: 'd1' } }), res2);
    expect(res2.statusCode).toBe(200);
  });
});
