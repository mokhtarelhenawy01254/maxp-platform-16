jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/radiologyRoomsController');

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

const roomRow = (overrides = {}) => ({
  id: 'r1',
  companyId: 'company-1',
  name: 'الغرفة 1',
  capacityPerHour: 4,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  devices: [{ device: { id: 'd1', name: 'جهاز CT', room: 'الغرفة 1', modality: 'CT', isActive: true } }],
  doctors: [{ radiologist: { id: 'doc1', name: 'د. سارة', location: 'ON_SITE', isActive: true } }],
  ...overrides,
});

const createPrisma = () => ({
  radiologyRoom: {
    findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(),
  },
  radiologyDevice: { findMany: jest.fn(), findFirst: jest.fn() },
  radiologyRadiologist: { findMany: jest.fn(), findFirst: jest.fn() },
  radiologyRoomDevice: { deleteMany: jest.fn(), createMany: jest.fn(), upsert: jest.fn() },
  radiologyRoomDoctor: { deleteMany: jest.fn(), createMany: jest.fn(), upsert: jest.fn() },
});

describe('radiologyRoomsController', () => {
  test('lists company-scoped rooms with devices and doctors mapped', async () => {
    const prisma = createPrisma();
    prisma.radiologyRoom.findMany.mockResolvedValue([roomRow()]);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.listRooms(req({}), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyRoom.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: 'company-1', isActive: true } }));
    expect(res.payload.data[0]).toMatchObject({
      name: 'الغرفة 1',
      capacityPerHour: 4,
      devices: [{ id: 'd1', name: 'جهاز CT' }],
      doctors: [{ id: 'doc1', name: 'د. سارة' }],
    });
  });

  test('creates a room requiring a name and positive capacity', async () => {
    const prisma = createPrisma();
    prisma.radiologyRoom.findFirst.mockResolvedValue(null);
    prisma.radiologyDevice.findMany.mockResolvedValue([{ id: 'd1' }]);
    prisma.radiologyRadiologist.findMany.mockResolvedValue([{ id: 'doc1' }]);
    prisma.radiologyRoom.create.mockImplementation(({ data }) => Promise.resolve(roomRow()));
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.createRoom(req({ body: { name: 'الغرفة 1', capacityPerHour: 0, deviceIds: ['d1'], doctorIds: ['doc1'] } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyRoom.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'الغرفة 1',
        capacityPerHour: 1,
        companyId: 'company-1',
        devices: { create: [{ deviceId: 'd1' }] },
        doctors: { create: [{ radiologistId: 'doc1' }] },
      }),
      include: expect.anything(),
    });
  });

  test('rejects a missing room name', async () => {
    const prisma = createPrisma();
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.createRoom(req({ body: {} }), res);

    expect(res.statusCode).toBe(400);
    expect(prisma.radiologyRoom.create).not.toHaveBeenCalled();
  });

  test('rejects duplicate room name', async () => {
    const prisma = createPrisma();
    prisma.radiologyRoom.findFirst.mockResolvedValue(roomRow());
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.createRoom(req({ body: { name: 'الغرفة 1' } }), res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toMatch(/بنفس الاسم/);
  });

  test('rejects assigning a device that does not belong to the company', async () => {
    const prisma = createPrisma();
    prisma.radiologyRoom.findFirst.mockResolvedValue(null);
    prisma.radiologyDevice.findMany.mockResolvedValue([]);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.createRoom(req({ body: { name: 'غرفة CT', deviceIds: ['other-dev'] } }), res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toMatch(/جهاز غير موجود/);
  });

  test('updates name/capacity and syncs device/doctor lists', async () => {
    const prisma = createPrisma();
    prisma.radiologyRoom.findFirst
      .mockResolvedValueOnce(roomRow())          // existing check
      .mockResolvedValueOnce(roomRow());         // refreshed after update
    prisma.radiologyRoom.update.mockImplementation(({ data }) => Promise.resolve(roomRow({ ...data })));
    prisma.radiologyDevice.findMany.mockResolvedValue([{ id: 'd1' }]);
    prisma.radiologyRadiologist.findMany.mockResolvedValue([{ id: 'doc1' }]);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.updateRoom(req({
      params: { id: 'r1' },
      body: { name: 'غرفة 2', capacityPerHour: 6, deviceIds: ['d1'], doctorIds: ['doc1'] },
    }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyRoom.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: expect.objectContaining({ name: 'غرفة 2', capacityPerHour: 6 }) });
    expect(prisma.radiologyRoomDevice.deleteMany).toHaveBeenCalledWith({ where: { roomId: 'r1' } });
    expect(prisma.radiologyRoomDevice.createMany).toHaveBeenCalledWith({ data: [{ roomId: 'r1', deviceId: 'd1' }] });
    expect(prisma.radiologyRoomDoctor.deleteMany).toHaveBeenCalledWith({ where: { roomId: 'r1' } });
    expect(prisma.radiologyRoomDoctor.createMany).toHaveBeenCalledWith({ data: [{ roomId: 'r1', radiologistId: 'doc1' }] });
  });

  test('soft-deletes a room', async () => {
    const prisma = createPrisma();
    prisma.radiologyRoom.findFirst.mockResolvedValue(roomRow());
    prisma.radiologyRoom.update.mockImplementation(({ data }) => Promise.resolve(roomRow({ ...data })));
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.deleteRoom(req({ params: { id: 'r1' } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyRoom.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: expect.objectContaining({ isActive: false }) });
  });

  test('returns 404 for a room owned by another company', async () => {
    const prisma = createPrisma();
    prisma.radiologyRoom.findFirst.mockResolvedValue({ ...roomRow(), companyId: 'company-other' });
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.updateRoom(req({ params: { id: 'r1' }, body: { name: 'X' } }), res);

    expect(res.statusCode).toBe(404);
  });

  test('adds a device to a room via upsert', async () => {
    const prisma = createPrisma();
    prisma.radiologyRoom.findFirst.mockResolvedValueOnce(roomRow()).mockResolvedValueOnce(roomRow());
    prisma.radiologyDevice.findFirst.mockResolvedValue({ id: 'd2', companyId: 'company-1' });
    prisma.radiologyRoomDevice.upsert.mockResolvedValue({});
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.addDevice(req({ params: { id: 'r1', deviceId: 'd2' } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyRoomDevice.upsert).toHaveBeenCalledWith({
      where: { roomId_deviceId: { roomId: 'r1', deviceId: 'd2' } },
      create: { roomId: 'r1', deviceId: 'd2' },
      update: {},
    });
  });

  test('adds a doctor to a room via upsert', async () => {
    const prisma = createPrisma();
    prisma.radiologyRoom.findFirst.mockResolvedValueOnce(roomRow()).mockResolvedValueOnce(roomRow());
    prisma.radiologyRadiologist.findFirst.mockResolvedValue({ id: 'doc2', companyId: 'company-1' });
    prisma.radiologyRoomDoctor.upsert.mockResolvedValue({});
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.addDoctor(req({ params: { id: 'r1', doctorId: 'doc2' } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyRoomDoctor.upsert).toHaveBeenCalledWith({
      where: { roomId_radiologistId: { roomId: 'r1', radiologistId: 'doc2' } },
      create: { roomId: 'r1', radiologistId: 'doc2' },
      update: {},
    });
  });

  test('removes a doctor from a room', async () => {
    const prisma = createPrisma();
    prisma.radiologyRoom.findFirst.mockResolvedValueOnce(roomRow()).mockResolvedValueOnce(roomRow());
    prisma.radiologyRoomDoctor.deleteMany.mockResolvedValue({ count: 1 });
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.removeDoctor(req({ params: { id: 'r1', doctorId: 'doc1' } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyRoomDoctor.deleteMany).toHaveBeenCalledWith({ where: { roomId: 'r1', radiologistId: 'doc1' } });
  });
});
