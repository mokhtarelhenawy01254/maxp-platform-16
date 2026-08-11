const { getSharedPrismaClient } = require('../services/sharedDatabase');

const previewQuote = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { examTypeIds, priceListId } = req.body || {};
    const ids = Array.isArray(examTypeIds)
      ? examTypeIds.map(String).filter(Boolean)
      : [];
    if (ids.length === 0) {
      return res.status(400).json({ success: false, error: 'يجب اختيار نوع فحص واحد على الأقل' });
    }

    const prisma = getSharedPrismaClient();
    const examTypes = await prisma.radiologyExamType.findMany({
      where: { id: { in: ids }, companyId, isActive: true },
    });

    if (examTypes.length === 0) {
      return res.status(400).json({ success: false, error: 'أنواع الفحوصات المختارة غير صالحة' });
    }

    const byId = new Map(examTypes.map((t) => [t.id, t]));
    const items = [];

    for (const id of ids) {
      const examType = byId.get(id);
      if (!examType) continue;

      let price = examType.price;
      if (priceListId) {
        try {
          const item = await prisma.priceListItem.findFirst({
            where: { priceListId: String(priceListId), serviceId: id, isActive: true },
          });
          if (item && item.price !== undefined && item.price !== null) price = item.price;
        } catch {
          // gracefully fall back to the exam type price
        }
      }

      items.push({
        examTypeId: examType.id,
        name: examType.name,
        category: examType.category || null,
        price,
      });
    }

    if (items.length === 0) {
      return res.status(400).json({ success: false, error: 'أنواع الفحوصات المختارة غير صالحة' });
    }

    const total = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
    res.json({ success: true, data: { items, total } });
  } catch (error) {
    console.error('Error previewing radiology quote:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حساب عرض السعر' });
  }
};

module.exports = { previewQuote };
