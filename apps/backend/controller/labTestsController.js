const { getSharedPrismaClient } = require('../services/sharedDatabase');

const normalizePrice = (value) => {
  if (value === undefined || value === null || value === '') return { value: undefined, error: null };
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return { value: null, error: 'السعر غير صحيح' };
  return { value: n, error: null };
};

const normalizeResultOptions = (value) => {
  if (value === undefined || value === null || value === '') return { value: undefined, error: null };
  let options = value;
  if (typeof value === 'string') {
    try {
      options = JSON.parse(value);
    } catch {
      options = value.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  if (!Array.isArray(options)) return { value: null, error: 'خيارات النتائج يجب أن تكون مصفوفة' };
  const strings = options.map(o => String(o).trim()).filter(o => o !== '');
  return { value: strings.length ? strings : null, error: null };
};

const normalizeSortOrder = (value) => {
  if (value === undefined || value === null || value === '') return { value: undefined, error: null };
  const n = Number(value);
  if (!Number.isInteger(n)) return { value: null, error: 'ترتيب الباراميتر غير صحيح' };
  return { value: n, error: null };
};

const normalizeBool = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true' || value === 1 || value === '1';
};

const normalizeText = (value) => {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s === '' ? null : s;
};

const validateParameterInput = (raw, { requireName }) => {
  const param = raw || {};
  if (requireName && (param.name === undefined || param.name === null || !String(param.name).trim())) {
    return { value: null, error: 'اسم الباراميتر مطلوب' };
  }
  const options = normalizeResultOptions(param.resultOptions);
  if (options.error) return { value: null, error: options.error };
  const sortOrder = normalizeSortOrder(param.sortOrder);
  if (sortOrder.error) return { value: null, error: sortOrder.error };
  return {
    value: {
      name: String(param.name).trim(),
      unit: normalizeText(param.unit),
      referenceRange: normalizeText(param.referenceRange),
      resultOptions: options.value,
      showFlag: normalizeBool(param.showFlag, true),
      sortOrder: sortOrder.value ?? 0,
      isActive: normalizeBool(param.isActive, true),
    },
    error: null,
  };
};

const buildParameterInclude = () => ({
  parameters: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
});

const getAllTests = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { search, category, page, limit, includeInactive } = req.query;
    const where = { companyId };
    if (includeInactive !== 'true') where.isActive = true;
    if (category) where.category = String(category);
    if (search && String(search).trim()) {
      const term = String(search).trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
        { abbreviation: { contains: term, mode: 'insensitive' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const prisma = getSharedPrismaClient();
    const [tests, total] = await Promise.all([
      prisma.labTest.findMany({
        where,
        include: { _count: { select: { parameters: { where: { isActive: true } } } } },
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.labTest.count({ where }),
    ]);

    const data = tests.map(t => ({
      ...t,
      parameterCount: t._count?.parameters ?? 0,
      _count: undefined,
    }));
    res.json({ success: true, data, total, page: pageNum, limit: limitNum });
  } catch (error) {
    console.error('Error fetching lab tests:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الاختبارات' });
  }
};

const getTestById = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const test = await getSharedPrismaClient().labTest.findFirst({
      where: { id, companyId },
      include: buildParameterInclude(),
    });
    if (!test) return res.status(404).json({ success: false, error: 'الاختبار غير موجود' });

    res.json({ success: true, data: test });
  } catch (error) {
    console.error('Error fetching lab test:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الاختبار' });
  }
};

const createTest = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { name, category, abbreviation, sampleType, price, parameters } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: 'اسم الاختبار مطلوب' });

    const priceCheck = normalizePrice(price);
    if (priceCheck.error) return res.status(400).json({ success: false, error: priceCheck.error });

    let paramData = null;
    if (parameters !== undefined && parameters !== null) {
      if (!Array.isArray(parameters)) return res.status(400).json({ success: false, error: 'الباراميترات يجب أن تكون مصفوفة' });
      paramData = [];
      for (const raw of parameters) {
        const check = validateParameterInput(raw, { requireName: true });
        if (check.error) return res.status(400).json({ success: false, error: check.error });
        paramData.push(check.value);
      }
    }

    const test = await getSharedPrismaClient().labTest.create({
      data: {
        companyId,
        name: String(name).trim(),
        category: normalizeText(category),
        abbreviation: normalizeText(abbreviation),
        sampleType: normalizeText(sampleType),
        price: priceCheck.value ?? 0,
        ...(paramData && paramData.length ? { parameters: { create: paramData.map(p => ({ companyId, ...p })) } } : {}),
      },
      include: buildParameterInclude(),
    });

    res.json({ success: true, data: test });
  } catch (error) {
    console.error('Error creating lab test:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الاختبار' });
  }
};

const updateTest = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.labTest.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الاختبار غير موجود' });

    const data = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return res.status(400).json({ success: false, error: 'اسم الاختبار مطلوب' });
      data.name = String(body.name).trim();
    }
    if (body.category !== undefined) data.category = normalizeText(body.category);
    if (body.abbreviation !== undefined) data.abbreviation = normalizeText(body.abbreviation);
    if (body.sampleType !== undefined) data.sampleType = normalizeText(body.sampleType);
    if (body.price !== undefined) {
      const priceCheck = normalizePrice(body.price);
      if (priceCheck.error) return res.status(400).json({ success: false, error: priceCheck.error });
      data.price = priceCheck.value;
    }
    if (body.isActive !== undefined) data.isActive = normalizeBool(body.isActive, true);

    let replacementParams = null;
    if (body.parameters !== undefined && body.parameters !== null) {
      if (!Array.isArray(body.parameters)) return res.status(400).json({ success: false, error: 'الباراميترات يجب أن تكون مصفوفة' });
      replacementParams = [];
      for (const raw of body.parameters) {
        const check = validateParameterInput(raw, { requireName: true });
        if (check.error) return res.status(400).json({ success: false, error: check.error });
        replacementParams.push(check.value);
      }
    }

    if (replacementParams) {
      await prisma.$transaction([
        prisma.labTestParameter.deleteMany({ where: { testId: id } }),
        ...(replacementParams.length
          ? [prisma.labTestParameter.createMany({ data: replacementParams.map(p => ({ companyId, testId: id, ...p })) })]
          : []),
      ]);
    }
    if (Object.keys(data).length) {
      await prisma.labTest.update({ where: { id }, data });
    }

    const test = await prisma.labTest.findFirst({
      where: { id, companyId },
      include: buildParameterInclude(),
    });
    res.json({ success: true, data: test });
  } catch (error) {
    console.error('Error updating lab test:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الاختبار' });
  }
};

const deleteTest = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.labTest.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الاختبار غير موجود' });

    const test = await prisma.labTest.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'تم حذف الاختبار', data: test });
  } catch (error) {
    console.error('Error deleting lab test:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الاختبار' });
  }
};

const addParameter = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const test = await prisma.labTest.findFirst({ where: { id, companyId } });
    if (!test) return res.status(404).json({ success: false, error: 'الاختبار غير موجود' });

    const check = validateParameterInput(req.body || {}, { requireName: true });
    if (check.error) return res.status(400).json({ success: false, error: check.error });

    let sortOrder = check.value.sortOrder;
    if (req.body?.sortOrder === undefined || req.body?.sortOrder === null || req.body?.sortOrder === '') {
      const last = await prisma.labTestParameter.findFirst({
        where: { testId: id, companyId, isActive: true },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const parameter = await prisma.labTestParameter.create({
      data: { companyId, testId: id, ...check.value, sortOrder },
    });
    res.json({ success: true, data: parameter });
  } catch (error) {
    console.error('Error adding lab test parameter:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إضافة الباراميتر' });
  }
};

const updateParameter = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id, parameterId } = req.params;
    const prisma = getSharedPrismaClient();
    const test = await prisma.labTest.findFirst({ where: { id, companyId } });
    if (!test) return res.status(404).json({ success: false, error: 'الاختبار غير موجود' });

    const parameter = await prisma.labTestParameter.findFirst({
      where: { id: parameterId, testId: id, companyId },
    });
    if (!parameter) return res.status(404).json({ success: false, error: 'الباراميتر غير موجود' });

    const body = req.body || {};
    const data = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return res.status(400).json({ success: false, error: 'اسم الباراميتر مطلوب' });
      data.name = String(body.name).trim();
    }
    if (body.unit !== undefined) data.unit = normalizeText(body.unit);
    if (body.referenceRange !== undefined) data.referenceRange = normalizeText(body.referenceRange);
    if (body.resultOptions !== undefined) {
      const options = normalizeResultOptions(body.resultOptions);
      if (options.error) return res.status(400).json({ success: false, error: options.error });
      data.resultOptions = options.value;
    }
    if (body.showFlag !== undefined) data.showFlag = normalizeBool(body.showFlag, true);
    if (body.sortOrder !== undefined) {
      const sortOrder = normalizeSortOrder(body.sortOrder);
      if (sortOrder.error) return res.status(400).json({ success: false, error: sortOrder.error });
      data.sortOrder = sortOrder.value;
    }
    if (body.isActive !== undefined) data.isActive = normalizeBool(body.isActive, true);

    const updated = await prisma.labTestParameter.update({ where: { id: parameterId }, data });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating lab test parameter:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الباراميتر' });
  }
};

const removeParameter = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id, parameterId } = req.params;
    const prisma = getSharedPrismaClient();
    const test = await prisma.labTest.findFirst({ where: { id, companyId } });
    if (!test) return res.status(404).json({ success: false, error: 'الاختبار غير موجود' });

    const parameter = await prisma.labTestParameter.findFirst({
      where: { id: parameterId, testId: id, companyId },
    });
    if (!parameter) return res.status(404).json({ success: false, error: 'الباراميتر غير موجود' });

    const updated = await prisma.labTestParameter.update({ where: { id: parameterId }, data: { isActive: false } });
    res.json({ success: true, message: 'تم حذف الباراميتر', data: updated });
  } catch (error) {
    console.error('Error removing lab test parameter:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الباراميتر' });
  }
};

module.exports = {
  getAllTests,
  getTestById,
  createTest,
  updateTest,
  deleteTest,
  addParameter,
  updateParameter,
  removeParameter,
};
