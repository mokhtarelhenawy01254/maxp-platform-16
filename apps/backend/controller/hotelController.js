const { getSharedPrismaClient } = require('../services/sharedDatabase');

// ── Properties ──────────────────────────────────────────
const getProperties = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const data = await getSharedPrismaClient().hotelProperty.findMany({
      where: { companyId },
      include: { roomTypes: true, rooms: true },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching hotel properties:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الفنادق' });
  }
};

const createProperty = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { name, address, city, phone, email, description, amenities, images, checkInTime, checkOutTime } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'اسم الفندق مطلوب' });
    const data = await getSharedPrismaClient().hotelProperty.create({
      data: { companyId, name: name.trim(), address, city, phone, email, description, amenities, images, checkInTime, checkOutTime }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating hotel property:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الفندق' });
  }
};

const updateProperty = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id } = req.params;
    const existing = await getSharedPrismaClient().hotelProperty.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الفندق غير موجود' });
    const data = await getSharedPrismaClient().hotelProperty.update({ where: { id }, data: req.body });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating hotel property:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الفندق' });
  }
};

const deleteProperty = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id } = req.params;
    const existing = await getSharedPrismaClient().hotelProperty.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الفندق غير موجود' });
    await getSharedPrismaClient().hotelProperty.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting hotel property:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الفندق' });
  }
};

// ── Room Types ──────────────────────────────────────────
const getRoomTypes = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { propertyId } = req.query;
    const where = { companyId };
    if (propertyId) where.propertyId = propertyId;
    const data = await getSharedPrismaClient().hotelRoomType.findMany({
      where,
      include: { _count: { select: { rooms: true } } },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching room types:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب أنواع الغرف' });
  }
};

const createRoomType = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { propertyId, name, nameAr, description, capacity, basePrice, amenities, images, totalRooms } = req.body;
    if (!propertyId || !name || !name.trim()) return res.status(400).json({ success: false, error: 'اسم النوع والفندق مطلوب' });
    const data = await getSharedPrismaClient().hotelRoomType.create({
      data: { companyId, propertyId, name: name.trim(), nameAr, description, capacity: capacity || 2, basePrice, amenities, images, totalRooms: totalRooms || 1 }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating room type:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء النوع' });
  }
};

const updateRoomType = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id } = req.params;
    const existing = await getSharedPrismaClient().hotelRoomType.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'النوع غير موجود' });
    const data = await getSharedPrismaClient().hotelRoomType.update({ where: { id }, data: req.body });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating room type:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث النوع' });
  }
};

const deleteRoomType = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id } = req.params;
    const existing = await getSharedPrismaClient().hotelRoomType.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'النوع غير موجود' });
    await getSharedPrismaClient().hotelRoomType.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting room type:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف النوع' });
  }
};

// ── Rooms ───────────────────────────────────────────────
const getRooms = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { propertyId, roomTypeId, status } = req.query;
    const where = { companyId };
    if (propertyId) where.propertyId = propertyId;
    if (roomTypeId) where.roomTypeId = roomTypeId;
    if (status) where.status = status;
    const data = await getSharedPrismaClient().hotelRoom.findMany({
      where,
      include: { roomType: true, property: true },
      orderBy: { roomNumber: 'asc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الغرف' });
  }
};

const createRoom = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { propertyId, roomTypeId, roomNumber, floor, notes } = req.body;
    if (!propertyId || !roomTypeId || !roomNumber) return res.status(400).json({ success: false, error: 'بيانات الغرفة ناقصة' });
    const data = await getSharedPrismaClient().hotelRoom.create({
      data: { companyId, propertyId, roomTypeId, roomNumber: roomNumber.trim(), floor: floor || null, notes }
    });
    res.json({ success: true, data });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ success: false, error: 'رقم الغرفة موجود مسبقاً في هذا الفندق' });
    console.error('Error creating room:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الغرفة' });
  }
};

const updateRoom = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id } = req.params;
    const existing = await getSharedPrismaClient().hotelRoom.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الغرفة غير موجودة' });
    const data = await getSharedPrismaClient().hotelRoom.update({ where: { id }, data: req.body });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الغرفة' });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id } = req.params;
    const existing = await getSharedPrismaClient().hotelRoom.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الغرفة غير موجودة' });
    await getSharedPrismaClient().hotelRoom.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الغرفة' });
  }
};

const updateRoomStatus = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id } = req.params;
    const { status, notes } = req.body;
    const existing = await getSharedPrismaClient().hotelRoom.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الغرفة غير موجودة' });
    const data = await getSharedPrismaClient().hotelRoom.update({ where: { id }, data: { status, notes } });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating room status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث حالة الغرفة' });
  }
};

// ── Reservations ────────────────────────────────────────
const getReservations = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { propertyId, status, dateFrom, dateTo } = req.query;
    const where = { companyId };
    if (propertyId) where.propertyId = propertyId;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.checkIn = {};
      if (dateFrom) where.checkIn.gte = new Date(dateFrom);
      if (dateTo) where.checkOut = { lte: new Date(dateTo) };
    }
    const data = await getSharedPrismaClient().hotelReservation.findMany({
      where,
      include: { rooms: { include: { room: true, roomType: true } }, folio: true, property: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الحجوزات' });
  }
};

const getReservation = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id } = req.params;
    const data = await getSharedPrismaClient().hotelReservation.findFirst({
      where: { id, companyId },
      include: { rooms: { include: { room: true, roomType: true } }, folio: { orderBy: { chargedAt: 'asc' } }, property: true, customer: true }
    });
    if (!data) return res.status(404).json({ success: false, error: 'الحجز غير موجود' });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching reservation:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الحجز' });
  }
};

const createReservation = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { propertyId, customerId, customerName, customerPhone, customerEmail, customerNotes, checkIn, checkOut, adults, children, rooms: roomData, source } = req.body;
    if (!propertyId || !customerName || !checkIn || !checkOut || !roomData?.length) {
      return res.status(400).json({ success: false, error: 'بيانات الحجز ناقصة' });
    }
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (checkOutDate <= checkInDate) return res.status(400).json({ success: false, error: 'تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول' });
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    if (nights < 1) return res.status(400).json({ success: false, error: 'يجب أن تكون الإقامة ليلة واحدة على الأقل' });

    const result = await getSharedPrismaClient().$transaction(async (tx) => {
      let totalAmount = 0;
      const reservationRooms = [];

      for (const r of roomData) {
        const roomType = await tx.hotelRoomType.findFirst({ where: { id: r.roomTypeId, companyId } });
        if (!roomType) throw new Error(`نوع الغرفة ${r.roomTypeId} غير موجود`);
        const rate = r.nightlyRate || roomType.basePrice;
        totalAmount += rate * nights;

        let roomId = r.roomId;
        if (!roomId) {
          const occupiedIds = (
            await tx.hotelReservationRoom.findMany({
              where: {
                roomTypeId: r.roomTypeId,
                reservation: {
                  companyId,
                  status: { notIn: ['CANCELLED', 'CHECKED_OUT'] },
                  checkIn: { lt: checkOutDate },
                  checkOut: { gt: checkInDate }
                }
              },
              select: { roomId: true }
            })
          ).map(x => x.roomId);
          const availableRoom = await tx.hotelRoom.findFirst({
            where: { roomTypeId: r.roomTypeId, propertyId, companyId, id: { notIn: occupiedIds }, status: { notIn: ['OCCUPIED', 'MAINTENANCE'] }, isActive: true }
          });
          if (!availableRoom) throw new Error(`لا توجد غرف متاحة من نوع ${roomType.name}`);
          roomId = availableRoom.id;
        }

        const room = await tx.hotelRoom.findFirst({ where: { id: roomId, companyId } });
        if (!room) throw new Error(`الغرفة غير موجودة`);
        if (room.status === 'OCCUPIED' || room.status === 'MAINTENANCE') throw new Error(`الغرفة ${room.roomNumber} غير متاحة`);

        reservationRooms.push({ roomId, roomTypeId: r.roomTypeId, nightlyRate: rate });
      }

      if (customerId) {
        const customerExists = await tx.customer.findFirst({ where: { id: customerId, companyId } });
        if (!customerExists) throw new Error('العميل غير موجود');
      }

      const reservation = await tx.hotelReservation.create({
        data: {
          companyId, propertyId, customerId: customerId || null, customerName: customerName.trim(),
          customerPhone, customerEmail, customerNotes, checkIn: checkInDate, checkOut: checkOutDate,
          adults: adults || 1, children: children || 0, totalAmount, paidAmount: 0, source: source || 'dashboard',
          createdById: req.user?.id, createdByType: 'user',
          rooms: { create: reservationRooms }
        },
        include: { rooms: { include: { room: true, roomType: true } } }
      });

      return reservation;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ success: false, error: error.message || 'حدث خطأ في إنشاء الحجز' });
  }
};

const updateReservationStatus = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'الحالة مطلوبة' });
    const existing = await getSharedPrismaClient().hotelReservation.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الحجز غير موجود' });

    const data = await getSharedPrismaClient().$transaction(async (tx) => {
      const reservation = await tx.hotelReservation.update({
        where: { id },
        data: { status },
        include: { rooms: true }
      });
      if (status === 'CHECKED_IN') {
        await tx.hotelRoom.updateMany({
          where: { id: { in: reservation.rooms.map(r => r.roomId) } },
          data: { status: 'OCCUPIED' }
        });
      }
      if (status === 'CHECKED_OUT' || status === 'CANCELLED') {
        await tx.hotelRoom.updateMany({
          where: { id: { in: reservation.rooms.map(r => r.roomId) } },
          data: { status: 'AVAILABLE' }
        });
      }
      return tx.hotelReservation.findUnique({
        where: { id },
        include: { rooms: { include: { room: true, roomType: true } }, folio: true, property: true }
      });
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating reservation status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الحجز' });
  }
};

const deleteReservation = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id } = req.params;
    const existing = await getSharedPrismaClient().hotelReservation.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الحجز غير موجود' });
    await getSharedPrismaClient().$transaction(async (tx) => {
      await tx.hotelFolioItem.deleteMany({ where: { reservationId: id } });
      await tx.hotelReservationRoom.deleteMany({ where: { reservationId: id } });
      await tx.hotelReservation.delete({ where: { id } });
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting reservation:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الحجز' });
  }
};

// ── Availability ────────────────────────────────────────
const checkAvailability = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { propertyId, checkIn, checkOut } = req.query;
    if (!propertyId || !checkIn || !checkOut) return res.status(400).json({ success: false, error: 'تاريخ الوصول والمغادرة مطلوب' });

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    const overlapping = await getSharedPrismaClient().hotelReservationRoom.findMany({
      where: {
        reservation: {
          companyId,
          propertyId,
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
          checkIn: { lt: checkOutDate },
          checkOut: { gt: checkInDate }
        }
      },
      select: { roomId: true }
    });

    const occupiedRoomIds = [...new Set(overlapping.map(r => r.roomId))];
    const roomTypes = await getSharedPrismaClient().hotelRoomType.findMany({
      where: { propertyId, companyId, isActive: true },
      include: {
        rooms: {
          where: { isActive: true },
          orderBy: { roomNumber: 'asc' }
        },
        rates: {
          where: {
            dateFrom: { lte: checkOutDate },
            dateTo: { gte: checkInDate }
          }
        }
      }
    });

    const result = roomTypes.map(rt => {
      const availableRooms = rt.rooms.filter(r => !occupiedRoomIds.includes(r.id));
      const seasonalRate = rt.rates?.[0];
      return {
        roomType: { id: rt.id, name: rt.name, nameAr: rt.nameAr, capacity: rt.capacity, basePrice: rt.basePrice, amenities: rt.amenities, images: rt.images },
        totalRooms: rt.rooms.length,
        availableRooms: availableRooms.length,
        rooms: availableRooms.map(r => ({ id: r.id, roomNumber: r.roomNumber, floor: r.floor, status: r.status })),
        effectivePrice: seasonalRate?.price || rt.basePrice
      };
    }).filter(rt => rt.availableRooms > 0);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في التحقق من التوفر' });
  }
};

// ── Folio ──────────────────────────────────────────────
const getFolioItems = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { reservationId } = req.params;
    const exists = await getSharedPrismaClient().hotelReservation.findFirst({ where: { id: reservationId, companyId } });
    if (!exists) return res.status(404).json({ success: false, error: 'الحجز غير موجود' });
    const data = await getSharedPrismaClient().hotelFolioItem.findMany({
      where: { companyId, reservationId },
      orderBy: { chargedAt: 'asc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching folio items:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الفاتورة' });
  }
};

const addFolioItem = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { reservationId } = req.params;
    const { description, amount, itemType, quantity } = req.body;
    if (!description || !amount) return res.status(400).json({ success: false, error: 'الوصف والمبلغ مطلوب' });
    const exists = await getSharedPrismaClient().hotelReservation.findFirst({ where: { id: reservationId, companyId } });
    if (!exists) return res.status(404).json({ success: false, error: 'الحجز غير موجود' });

    const data = await getSharedPrismaClient().hotelFolioItem.create({
      data: { companyId, reservationId, description, amount, itemType: itemType || 'SERVICE', quantity: quantity || 1 }
    });
    await getSharedPrismaClient().hotelReservation.update({
      where: { id: reservationId },
      data: { totalAmount: { increment: amount * (quantity || 1) } }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error adding folio item:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إضافة الخدمة' });
  }
};

const removeFolioItem = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id, reservationId } = req.params;
    const item = await getSharedPrismaClient().hotelFolioItem.findFirst({ where: { id, companyId, reservationId } });
    if (!item) return res.status(404).json({ success: false, error: 'الخدمة غير موجودة' });
    await getSharedPrismaClient().$transaction(async (tx) => {
      await tx.hotelFolioItem.delete({ where: { id } });
      await tx.hotelReservation.update({
        where: { id: reservationId },
        data: { totalAmount: { decrement: item.amount * item.quantity } }
      });
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing folio item:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الخدمة' });
  }
};

// ── Seasonal Rates ──────────────────────────────────────
const getRoomRates = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { roomTypeId } = req.query;
    const where = { companyId };
    if (roomTypeId) where.roomTypeId = roomTypeId;
    const data = await getSharedPrismaClient().hotelRoomRate.findMany({
      where,
      include: { roomType: true },
      orderBy: { dateFrom: 'asc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching room rates:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الأسعار' });
  }
};

const createRoomRate = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { roomTypeId, dateFrom, dateTo, price, label } = req.body;
    if (!roomTypeId || !dateFrom || !dateTo || !price) return res.status(400).json({ success: false, error: 'بيانات السعر ناقصة' });
    const data = await getSharedPrismaClient().hotelRoomRate.create({
      data: { companyId, roomTypeId, dateFrom: new Date(dateFrom), dateTo: new Date(dateTo), price, label }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating room rate:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء السعر' });
  }
};

const deleteRoomRate = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id } = req.params;
    const existing = await getSharedPrismaClient().hotelRoomRate.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'السعر غير موجود' });
    await getSharedPrismaClient().hotelRoomRate.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting room rate:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف السعر' });
  }
};

module.exports = {
  getProperties, createProperty, updateProperty, deleteProperty,
  getRoomTypes, createRoomType, updateRoomType, deleteRoomType,
  getRooms, createRoom, updateRoom, deleteRoom, updateRoomStatus,
  getReservations, getReservation, createReservation, updateReservationStatus, deleteReservation,
  checkAvailability,
  getFolioItems, addFolioItem, removeFolioItem,
  getRoomRates, createRoomRate, deleteRoomRate
};
