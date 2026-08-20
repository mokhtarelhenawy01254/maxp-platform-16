const { getSharedPrismaClient } = require('../services/sharedDatabase');

const DISCOUNT_TYPES = ['PERCENTAGE', 'CUSTOM', 'NONE'];

const normalizeText = (value) => {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s === '' ? null : s;
};

const normalizeBool = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true' || value === 1 || value === '1';
};

const normalizeDiscountType = (value) => {
  if (value === undefined || value === null || value === '') return { value: 'PERCENTAGE', error: null };
  const s = String(value).trim().toUpperCase();
  if (!DISCOUNT_TYPES.includes(s)) return { value: null, error: 'نوع الخصم غير صالح' };
  return { value: s, error: null };
};

const clampDiscountPercent = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
};

const getAllContracts = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { search, includeInactive } = req.query;
    const where = { companyId };
    if (includeInactive !== 'true') where.isActive = true;
    if (search && String(search).trim()) {
      const term = String(search).trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { region: { contains: term, mode: 'insensitive' } },
      ];
    }

    const contracts = await getSharedPrismaClient().labContract.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: contracts });
  } catch (error) {
    console.error('Error fetching lab contracts:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب التعاقدات' });
  }
};

const createContract = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { name, region, governorate, discountType, discountPercent, externalSample } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: 'اسم التعاقد مطلوب' });

    const typeCheck = normalizeDiscountType(discountType);
    if (typeCheck.error) return res.status(400).json({ success: false, error: typeCheck.error });

    const contract = await getSharedPrismaClient().labContract.create({
      data: {
        companyId,
        name: String(name).trim(),
        region: normalizeText(region),
        governorate: normalizeText(governorate),
        discountType: typeCheck.value,
        discountPercent: clampDiscountPercent(discountPercent),
        externalSample: normalizeBool(externalSample, false),
      },
    });

    res.json({ success: true, data: contract });
  } catch (error) {
    console.error('Error creating lab contract:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء التعاقد' });
  }
};

const updateContract = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.labContract.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'التعاقد غير موجود' });

    const data = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return res.status(400).json({ success: false, error: 'اسم التعاقد مطلوب' });
      data.name = String(body.name).trim();
    }
    if (body.region !== undefined) data.region = normalizeText(body.region);
    if (body.governorate !== undefined) data.governorate = normalizeText(body.governorate);
    if (body.discountType !== undefined) {
      const typeCheck = normalizeDiscountType(body.discountType);
      if (typeCheck.error) return res.status(400).json({ success: false, error: typeCheck.error });
      data.discountType = typeCheck.value;
    }
    if (body.discountPercent !== undefined) data.discountPercent = clampDiscountPercent(body.discountPercent);
    if (body.externalSample !== undefined) data.externalSample = normalizeBool(body.externalSample, false);
    if (body.isActive !== undefined) data.isActive = normalizeBool(body.isActive, true);

    const contract = await prisma.labContract.update({ where: { id }, data });
    res.json({ success: true, data: contract });
  } catch (error) {
    console.error('Error updating lab contract:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث التعاقد' });
  }
};

const deleteContract = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.labContract.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'التعاقد غير موجود' });

    const contract = await prisma.labContract.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'تم حذف التعاقد', data: contract });
  } catch (error) {
    console.error('Error deleting lab contract:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف التعاقد' });
  }
};

module.exports = {
  getAllContracts,
  createContract,
  updateContract,
  deleteContract,
};
