const { getSharedPrismaClient } = require('../services/sharedDatabase');

const previewQuote = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { examTypeIds, priceListId, insuranceCompanyId } = req.body || {};
    const ids = Array.isArray(examTypeIds)
      ? examTypeIds.map(String).filter(Boolean)
      : [];
    if (ids.length === 0) {
      return res.status(400).json({ success: false, error: '┘è╪¼╪¿ ╪º╪«╪¬┘è╪º╪▒ ┘å┘ê╪╣ ┘ü╪¡╪╡ ┘ê╪º╪¡╪» ╪╣┘ä┘ë ╪º┘ä╪ú┘é┘ä' });
    }

    const prisma = getSharedPrismaClient();
    const examTypes = await prisma.radiologyExamType.findMany({
      where: { id: { in: ids }, companyId, isActive: true },
    });

    if (examTypes.length === 0) {
      return res.status(400).json({ success: false, error: '╪ú┘å┘ê╪º╪╣ ╪º┘ä┘ü╪¡┘ê╪╡╪º╪¬ ╪º┘ä┘à╪«╪¬╪º╪▒╪⌐ ╪║┘è╪▒ ╪╡╪º┘ä╪¡╪⌐' });
    }

    // Per-entity prices for the selected insurance company (if any)
    let entityPriceMap = new Map();
    if (insuranceCompanyId) {
      try {
        const entityPrices = await prisma.radiologyEntityPrice.findMany({
          where: { insuranceCompanyId: String(insuranceCompanyId), examTypeId: { in: ids }, isActive: true },
        });
        entityPriceMap = new Map(entityPrices.map(p => [p.examTypeId, p.price]));
      } catch { /* graceful fallback */ }
    }

    const byId = new Map(examTypes.map((t) => [t.id, t]));
    const items = [];

    for (const id of ids) {
      const examType = byId.get(id);
      if (!examType) continue;

      let price = examType.price;
      if (entityPriceMap.has(id)) {
        price = entityPriceMap.get(id);
      } else if (priceListId) {
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
      return res.status(400).json({ success: false, error: '╪ú┘å┘ê╪º╪╣ ╪º┘ä┘ü╪¡┘ê╪╡╪º╪¬ ╪º┘ä┘à╪«╪¬╪º╪▒╪⌐ ╪║┘è╪▒ ╪╡╪º┘ä╪¡╪⌐' });
    }

    const total = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
    res.json({ success: true, data: { items, total } });
  } catch (error) {
    console.error('Error previewing radiology quote:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡╪│╪º╪¿ ╪╣╪▒╪╢ ╪º┘ä╪│╪╣╪▒' });
  }
};

module.exports = { previewQuote };
