const { getSharedPrismaClient } = require('../services/sharedDatabase');

const ROOM_INCLUDE = {
  devices: {
    select: { device: { select: { id: true, name: true, room: true, modality: true, isActive: true } } },
  },
  doctors: {
    select: { radiologist: { select: { id: true, name: true, location: true, isActive: true } } },
  },
};

const mapRoom = (r) => ({
  id: r.id,
  companyId: r.companyId,
  name: r.name,
  capacityPerHour: r.capacityPerHour,
  isActive: r.isActive,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  devices: (r.devices || []).map((d) => d.device),
  doctors: (r.doctors || []).map((d) => d.radiologist),
});

const companyOf = (room, companyId) => {
  if (!room || (room.companyId && room.companyId !== companyId)) return null;
  return room;
};

const listRooms = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { includeInactive } = req.query;
    const where = { companyId };
    if (includeInactive !== 'true') where.isActive = true;

    const rooms = await getSharedPrismaClient().radiologyRoom.findMany({
      where,
      include: ROOM_INCLUDE,
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: rooms.map(mapRoom) });
  } catch (error) {
    console.error('Error listing radiology rooms:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä╪║╪▒┘ü' });
  }
};

const getRoom = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const room = await getSharedPrismaClient().radiologyRoom.findFirst({
      where: { id },
      include: ROOM_INCLUDE,
    });
    if (!companyOf(room, companyId)) return res.status(404).json({ success: false, error: '╪º┘ä╪║╪▒┘ü╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });
    res.json({ success: true, data: mapRoom(room) });
  } catch (error) {
    console.error('Error fetching radiology room:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä╪║╪▒┘ü╪⌐' });
  }
};

const validateAssignments = async (prisma, companyId, deviceIds, doctorIds) => {
  if (deviceIds && deviceIds.length) {
    const devices = await prisma.radiologyDevice.findMany({ where: { id: { in: deviceIds }, companyId }, select: { id: true } });
    const found = new Set(devices.map((d) => d.id));
    const missing = deviceIds.filter((id) => !found.has(id));
    if (missing.length) throw new Error('╪¼┘ç╪º╪▓ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪» ╪ú┘ê ╪║┘è╪▒ ╪¬╪º╪¿╪╣ ┘ä┘ä╪┤╪▒┘â╪⌐');
  }
  if (doctorIds && doctorIds.length) {
    const doctors = await prisma.radiologyRadiologist.findMany({ where: { id: { in: doctorIds }, companyId }, select: { id: true } });
    const found = new Set(doctors.map((d) => d.id));
    const missing = doctorIds.filter((id) => !found.has(id));
    if (missing.length) throw new Error('╪»┘â╪¬┘ê╪▒ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪» ╪ú┘ê ╪║┘è╪▒ ╪¬╪º╪¿╪╣ ┘ä┘ä╪┤╪▒┘â╪⌐');
  }
};

const createRoom = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const prisma = getSharedPrismaClient();
    const { name, capacityPerHour = 1, deviceIds = [], doctorIds = [] } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: '╪º╪│┘à ╪º┘ä╪║╪▒┘ü╪⌐ ┘à╪╖┘ä┘ê╪¿' });

    const existing = await prisma.radiologyRoom.findFirst({ where: { companyId, name: String(name).trim() } });
    if (existing) return res.status(400).json({ success: false, error: '┘è┘ê╪¼╪» ╪║╪▒┘ü╪⌐ ╪¿┘å┘ü╪│ ╪º┘ä╪º╪│┘à ╪¿╪º┘ä┘ü╪╣┘ä' });

    try {
      await validateAssignments(prisma, companyId, deviceIds, doctorIds);
    } catch (e) {
      return res.status(400).json({ success: false, error: e.message });
    }

    const room = await prisma.radiologyRoom.create({
      data: {
        companyId,
        name: String(name).trim(),
        capacityPerHour: Math.max(1, Number(capacityPerHour) || 1),
        devices: { create: (deviceIds || []).map((deviceId) => ({ deviceId })) },
        doctors: { create: (doctorIds || []).map((radiologistId) => ({ radiologistId })) },
      },
      include: ROOM_INCLUDE,
    });
    res.json({ success: true, data: mapRoom(room) });
  } catch (error) {
    if (error?.code === 'P2002') return res.status(400).json({ success: false, error: '┘è┘ê╪¼╪» ╪║╪▒┘ü╪⌐ ╪¿┘å┘ü╪│ ╪º┘ä╪º╪│┘à ╪¿╪º┘ä┘ü╪╣┘ä' });
    console.error('Error creating radiology room:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪Ñ┘å╪┤╪º╪í ╪º┘ä╪║╪▒┘ü╪⌐' });
  }
};

const updateRoom = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyRoom.findFirst({ where: { id } });
    if (!companyOf(existing, companyId)) return res.status(404).json({ success: false, error: '╪º┘ä╪║╪▒┘ü╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });

    const body = req.body || {};
    const data = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return res.status(400).json({ success: false, error: '╪º╪│┘à ╪º┘ä╪║╪▒┘ü╪⌐ ┘à╪╖┘ä┘ê╪¿' });
      data.name = String(body.name).trim();
    }
    if (body.capacityPerHour !== undefined) data.capacityPerHour = Math.max(1, Number(body.capacityPerHour) || 1);
    if (body.isActive !== undefined) data.isActive = body.isActive === true || body.isActive === 'true';

    const sync = async () => {
      if (Array.isArray(body.deviceIds)) {
        await prisma.radiologyRoomDevice.deleteMany({ where: { roomId: id } });
        if (body.deviceIds.length) await prisma.radiologyRoomDevice.createMany({ data: body.deviceIds.map((deviceId) => ({ roomId: id, deviceId })) });
      }
      if (Array.isArray(body.doctorIds)) {
        await prisma.radiologyRoomDoctor.deleteMany({ where: { roomId: id } });
        if (body.doctorIds.length) await prisma.radiologyRoomDoctor.createMany({ data: body.doctorIds.map((radiologistId) => ({ roomId: id, radiologistId })) });
      }
    };

    if (Array.isArray(body.deviceIds) || Array.isArray(body.doctorIds)) {
      try {
        await validateAssignments(prisma, companyId, body.deviceIds, body.doctorIds);
      } catch (e) {
        return res.status(400).json({ success: false, error: e.message });
      }
    }

    const room = await prisma.radiologyRoom.update({ where: { id }, data });
    await sync();

    const refreshed = await prisma.radiologyRoom.findFirst({ where: { id }, include: ROOM_INCLUDE });
    res.json({ success: true, data: mapRoom(refreshed) });
  } catch (error) {
    if (error?.code === 'P2002') return res.status(400).json({ success: false, error: '┘è┘ê╪¼╪» ╪║╪▒┘ü╪⌐ ╪¿┘å┘ü╪│ ╪º┘ä╪º╪│┘à ╪¿╪º┘ä┘ü╪╣┘ä' });
    console.error('Error updating radiology room:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¬╪¡╪»┘è╪½ ╪º┘ä╪║╪▒┘ü╪⌐' });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyRoom.findFirst({ where: { id } });
    if (!companyOf(existing, companyId)) return res.status(404).json({ success: false, error: '╪º┘ä╪║╪▒┘ü╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });

    await prisma.radiologyRoom.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: '╪¬┘à ╪¬╪╣╪╖┘è┘ä ╪º┘ä╪║╪▒┘ü╪⌐', data: { id } });
  } catch (error) {
    console.error('Error deleting radiology room:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡╪░┘ü ╪º┘ä╪║╪▒┘ü╪⌐' });
  }
};

const addDevice = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id, deviceId } = req.params;
    const prisma = getSharedPrismaClient();
    const room = await prisma.radiologyRoom.findFirst({ where: { id } });
    if (!companyOf(room, companyId)) return res.status(404).json({ success: false, error: '╪º┘ä╪║╪▒┘ü╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });

    const device = await prisma.radiologyDevice.findFirst({ where: { id: deviceId, companyId } });
    if (!device) return res.status(404).json({ success: false, error: '╪º┘ä╪¼┘ç╪º╪▓ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });

    await prisma.radiologyRoomDevice.upsert({
      where: { roomId_deviceId: { roomId: id, deviceId } },
      create: { roomId: id, deviceId },
      update: {},
    });
    const refreshed = await prisma.radiologyRoom.findFirst({ where: { id }, include: ROOM_INCLUDE });
    res.json({ success: true, data: mapRoom(refreshed) });
  } catch (error) {
    console.error('Error adding device to room:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪Ñ╪╢╪º┘ü╪⌐ ╪º┘ä╪¼┘ç╪º╪▓ ┘ä┘ä╪║╪▒┘ü╪⌐' });
  }
};

const removeDevice = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id, deviceId } = req.params;
    const prisma = getSharedPrismaClient();
    const room = await prisma.radiologyRoom.findFirst({ where: { id } });
    if (!companyOf(room, companyId)) return res.status(404).json({ success: false, error: '╪º┘ä╪║╪▒┘ü╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });

    await prisma.radiologyRoomDevice.deleteMany({ where: { roomId: id, deviceId } });
    const refreshed = await prisma.radiologyRoom.findFirst({ where: { id }, include: ROOM_INCLUDE });
    res.json({ success: true, data: mapRoom(refreshed) });
  } catch (error) {
    console.error('Error removing device from room:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪Ñ╪▓╪º┘ä╪⌐ ╪º┘ä╪¼┘ç╪º╪▓ ┘à┘å ╪º┘ä╪║╪▒┘ü╪⌐' });
  }
};

const addDoctor = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id, doctorId } = req.params;
    const prisma = getSharedPrismaClient();
    const room = await prisma.radiologyRoom.findFirst({ where: { id } });
    if (!companyOf(room, companyId)) return res.status(404).json({ success: false, error: '╪º┘ä╪║╪▒┘ü╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });

    const doctor = await prisma.radiologyRadiologist.findFirst({ where: { id: doctorId, companyId } });
    if (!doctor) return res.status(404).json({ success: false, error: '╪º┘ä╪»┘â╪¬┘ê╪▒ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });

    await prisma.radiologyRoomDoctor.upsert({
      where: { roomId_radiologistId: { roomId: id, radiologistId: doctorId } },
      create: { roomId: id, radiologistId: doctorId },
      update: {},
    });
    const refreshed = await prisma.radiologyRoom.findFirst({ where: { id }, include: ROOM_INCLUDE });
    res.json({ success: true, data: mapRoom(refreshed) });
  } catch (error) {
    console.error('Error adding doctor to room:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪Ñ╪╢╪º┘ü╪⌐ ╪º┘ä╪»┘â╪¬┘ê╪▒ ┘ä┘ä╪║╪▒┘ü╪⌐' });
  }
};

const removeDoctor = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id, doctorId } = req.params;
    const prisma = getSharedPrismaClient();
    const room = await prisma.radiologyRoom.findFirst({ where: { id } });
    if (!companyOf(room, companyId)) return res.status(404).json({ success: false, error: '╪º┘ä╪║╪▒┘ü╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });

    await prisma.radiologyRoomDoctor.deleteMany({ where: { roomId: id, radiologistId: doctorId } });
    const refreshed = await prisma.radiologyRoom.findFirst({ where: { id }, include: ROOM_INCLUDE });
    res.json({ success: true, data: mapRoom(refreshed) });
  } catch (error) {
    console.error('Error removing doctor from room:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪Ñ╪▓╪º┘ä╪⌐ ╪º┘ä╪»┘â╪¬┘ê╪▒ ┘à┘å ╪º┘ä╪║╪▒┘ü╪⌐' });
  }
};

module.exports = { listRooms, getRoom, createRoom, updateRoom, deleteRoom, addDevice, removeDevice, addDoctor, removeDoctor };
