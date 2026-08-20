const { getSharedPrismaClient } = require('../services/sharedDatabase');

const getAllPriceLists = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const lists = await getSharedPrismaClient().priceList.findMany({
      where: { companyId },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'asc' }
    });
    const data = lists.map(l => ({
      ...l,
      isBase: !l.baseListId,
      itemCount: l._count.items
    }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching price lists:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب قوائم الأسعار' });
  }
};

const createPriceList = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    let { name, description, baseListId } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'اسم القائمة مطلوب' });

    const prisma = getSharedPrismaClient();
    const existingCount = await prisma.priceList.count({ where: { companyId } });

    let resolvedBaseId = null;
    if (existingCount > 0) {
      if (baseListId) {
        const baseList = await prisma.priceList.findFirst({ where: { id: baseListId, companyId } });
        if (!baseList) return res.status(400).json({ success: false, error: 'القائمة الأساسية غير موجودة' });
        if (baseList.baseListId) return res.status(400).json({ success: false, error: 'لا يمكن اعتماد قائمة متفرعة كقائمة أساسية' });
        resolvedBaseId = baseList.id;
      } else {
        const baseList = await prisma.priceList.findFirst({ where: { companyId, baseListId: null, isActive: true } });
        resolvedBaseId = baseList?.id || null;
      }
    }

    const list = await prisma.priceList.create({
      data: {
        companyId,
        name: name.trim(),
        description: description || undefined,
        baseListId: resolvedBaseId
      }
    });
    res.json({ success: true, data: { ...list, isBase: !list.baseListId, itemCount: 0 } });
  } catch (error) {
    console.error('Error creating price list:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء القائمة' });
  }
};

const updatePriceList = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { name, description, isActive } = req.body;
    if (name !== undefined && !String(name).trim()) return res.status(400).json({ success: false, error: 'اسم القائمة مطلوب' });

    const prisma = getSharedPrismaClient();
    const existing = await prisma.priceList.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'قائمة الأسعار غير موجودة' });

    const list = await prisma.priceList.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(isActive !== undefined ? { isActive } : {})
      }
    });
    res.json({ success: true, data: { ...list, isBase: !list.baseListId } });
  } catch (error) {
    console.error('Error updating price list:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث القائمة' });
  }
};

const deletePriceList = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.priceList.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'قائمة الأسعار غير موجودة' });

    if (!existing.baseListId) return res.status(400).json({ success: false, error: 'لا يمكن حذف قائمة الأسعار الأساسية' });

    const derivedCount = await prisma.priceList.count({ where: { baseListId: id, isActive: true } });
    if (derivedCount > 0) return res.status(400).json({ success: false, error: 'لا يمكن حذف قائمة تفرع منها قوائم أخرى' });

    const list = await prisma.priceList.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'تم حذف القائمة', data: { ...list, isBase: false } });
  } catch (error) {
    console.error('Error deleting price list:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف القائمة' });
  }
};

const getPriceListItems = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const list = await prisma.priceList.findFirst({ where: { id, companyId } });
    if (!list) return res.status(404).json({ success: false, error: 'قائمة الأسعار غير موجودة' });

    const items = await prisma.priceListItem.findMany({
      where: { priceListId: id },
      include: {
        service: { select: { id: true, name: true, basePrice: true, durationMinutes: true } }
      }
    });
    const data = items
      .map(item => ({
        ...item,
        service: item.service || undefined,
        effectivePrice: item.price
      }))
      .sort((a, b) => (a.service?.name || '').localeCompare(b.service?.name || '', 'ar'));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching price list items:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب أسعار القائمة' });
  }
};

const setPriceListItem = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id, serviceId } = req.params;
    const price = Number(req.body?.price);
    if (Number.isNaN(price) || !Number.isFinite(price) || price < 0) return res.status(400).json({ success: false, error: 'السعر غير صحيح' });

    const prisma = getSharedPrismaClient();
    const list = await prisma.priceList.findFirst({ where: { id, companyId } });
    if (!list) return res.status(404).json({ success: false, error: 'قائمة الأسعار غير موجودة' });
    if (!list.baseListId) return res.status(400).json({ success: false, error: 'لا يمكن إضافة أسعار مخصصة للقائمة الأساسية' });

    const service = await prisma.bookingService.findFirst({ where: { id: serviceId, companyId } });
    if (!service) return res.status(404).json({ success: false, error: 'الخدمة غير موجودة' });

    const item = await prisma.priceListItem.upsert({
      where: { priceListId_serviceId: { priceListId: id, serviceId } },
      update: { price },
      create: { priceListId: id, serviceId, price }
    });
    res.json({ success: true, data: { ...item, effectivePrice: price, basePrice: service.basePrice ?? null } });
  } catch (error) {
    console.error('Error setting price list item:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حفظ السعر' });
  }
};

const removePriceListItem = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id, serviceId } = req.params;
    const prisma = getSharedPrismaClient();
    const list = await prisma.priceList.findFirst({ where: { id, companyId } });
    if (!list) return res.status(404).json({ success: false, error: 'قائمة الأسعار غير موجودة' });

    await prisma.priceListItem.deleteMany({ where: { priceListId: id, serviceId } });
    res.json({ success: true, message: 'تم إزالة السعر' });
  } catch (error) {
    console.error('Error removing price list item:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إزالة السعر' });
  }
};

const resolveServicePrice = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { serviceId } = req.params;
    const { priceListId } = req.query;

    const prisma = getSharedPrismaClient();
    const service = await prisma.bookingService.findFirst({ where: { id: serviceId, companyId } });
    if (!service) return res.status(404).json({ success: false, error: 'الخدمة غير موجودة' });

    const basePrice = service.basePrice ?? 0;
    if (!priceListId) {
      return res.json({ success: true, data: { price: basePrice, basePrice, source: 'base' } });
    }

    const list = await prisma.priceList.findFirst({ where: { id: priceListId, companyId } });
    if (!list) return res.status(404).json({ success: false, error: 'قائمة الأسعار غير موجودة' });

    if (!list.baseListId) {
      return res.json({ success: true, data: { price: basePrice, basePrice, source: 'base' } });
    }

    const item = await prisma.priceListItem.findUnique({
      where: { priceListId_serviceId: { priceListId, serviceId } }
    });
    if (item && item.isActive) {
      return res.json({ success: true, data: { price: item.price, basePrice, source: 'item' } });
    }
    return res.json({ success: true, data: { price: basePrice, basePrice, source: 'base' } });
  } catch (error) {
    console.error('Error resolving service price:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديد سعر الخدمة' });
  }
};

module.exports = {
  getAllPriceLists, createPriceList, updatePriceList, deletePriceList,
  getPriceListItems, setPriceListItem, removePriceListItem, resolveServicePrice
};
