const { getSharedPrismaClient } = require('../services/sharedDatabase');

const normalizePrice = (value) => {
  if (value === undefined || value === null || value === '') return { value: undefined, error: null };
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return { value: null, error: '╪º┘ä╪│╪╣╪▒ ╪║┘è╪▒ ╪╡╪¡┘è╪¡' };
  return { value: n, error: null };
};

const normalizeSortOrder = (value) => {
  if (value === undefined || value === null || value === '') return { value: undefined, error: null };
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return { value: null, error: '╪¬╪▒╪¬┘è╪¿ ╪║┘è╪▒ ╪╡╪¡┘è╪¡' };
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

const childLabel = (kind) => (kind === 'organism' ? '╪º┘ä┘â╪º╪ª┘å ╪º┘ä╪»┘é┘è┘é' : '╪º┘ä┘à╪╢╪º╪» ╪º┘ä╪¡┘è┘ê┘è');

const validateChildInput = (raw, { requireName, kind }) => {
  const item = raw || {};
  if (requireName && (item.name === undefined || item.name === null || !String(item.name).trim())) {
    return { value: null, error: `╪º╪│┘à ${childLabel(kind)} ┘à╪╖┘ä┘ê╪¿` };
  }
  const sortOrder = normalizeSortOrder(item.sortOrder);
  if (sortOrder.error) return { value: null, error: sortOrder.error };
  return {
    value: {
      name: String(item.name).trim(),
      sortOrder: sortOrder.value ?? 0,
      isActive: normalizeBool(item.isActive, true),
    },
    error: null,
  };
};

const collectChildren = (rawChildren, kind, res) => {
  if (rawChildren === undefined || rawChildren === null) return { value: null, error: null };
  if (!Array.isArray(rawChildren)) return { value: null, error: `${childLabel(kind)} ┘è╪¼╪¿ ╪ú┘å ╪¬┘â┘ê┘å ┘à╪╡┘ü┘ê┘ü╪⌐` };
  const list = [];
  for (const raw of rawChildren) {
    const check = validateChildInput(raw, { requireName: true, kind });
    if (check.error) return { value: null, error: check.error };
    const value = check.value;
    if (raw.sortOrder === undefined || raw.sortOrder === null || raw.sortOrder === '') {
      value.sortOrder = list.length;
    }
    list.push(value);
  }
  return { value: list, error: null };
};

const buildCountInclude = () => ({
  _count: {
    select: {
      organisms: { where: { isActive: true } },
      antibiotics: { where: { isActive: true } },
    },
  },
});

const buildDetailInclude = () => ({
  organisms: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
  antibiotics: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
});

const getAllCultures = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { search, category, page, limit, includeInactive } = req.query;
    const where = { companyId };
    if (includeInactive !== 'true') where.isActive = true;
    if (category) where.category = String(category);
    if (search && String(search).trim()) {
      const term = String(search).trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
        { sampleType: { contains: term, mode: 'insensitive' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const prisma = getSharedPrismaClient();
    const [cultures, total] = await Promise.all([
      prisma.labCulture.findMany({
        where,
        include: buildCountInclude(),
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.labCulture.count({ where }),
    ]);

    const data = cultures.map(c => ({
      ...c,
      organismCount: c._count?.organisms ?? 0,
      antibioticCount: c._count?.antibiotics ?? 0,
      _count: undefined,
    }));
    res.json({ success: true, data, total, page: pageNum, limit: limitNum });
  } catch (error) {
    console.error('Error fetching lab cultures:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä┘à╪▓╪º╪▒╪╣' });
  }
};

const getCultureById = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const culture = await getSharedPrismaClient().labCulture.findFirst({
      where: { id, companyId },
      include: buildDetailInclude(),
    });
    if (!culture) return res.status(404).json({ success: false, error: '╪º┘ä┘à╪▓╪▒╪╣╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });

    res.json({ success: true, data: culture });
  } catch (error) {
    console.error('Error fetching lab culture:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä┘à╪▓╪▒╪╣╪⌐' });
  }
};

const createCulture = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { name, category, sampleType, price, organisms, antibiotics } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: '╪º╪│┘à ╪º┘ä┘à╪▓╪▒╪╣╪⌐ ┘à╪╖┘ä┘ê╪¿' });

    const priceCheck = normalizePrice(price);
    if (priceCheck.error) return res.status(400).json({ success: false, error: priceCheck.error });

    const organismCheck = collectChildren(organisms, 'organism', res);
    if (organismCheck.error) return res.status(400).json({ success: false, error: organismCheck.error });
    const antibioticCheck = collectChildren(antibiotics, 'antibiotic', res);
    if (antibioticCheck.error) return res.status(400).json({ success: false, error: antibioticCheck.error });

    const culture = await getSharedPrismaClient().labCulture.create({
      data: {
        companyId,
        name: String(name).trim(),
        category: normalizeText(category),
        sampleType: normalizeText(sampleType),
        price: priceCheck.value ?? 0,
        ...(organismCheck.value && organismCheck.value.length
          ? { organisms: { create: organismCheck.value.map(o => ({ companyId, ...o })) } }
          : {}),
        ...(antibioticCheck.value && antibioticCheck.value.length
          ? { antibiotics: { create: antibioticCheck.value.map(a => ({ companyId, ...a })) } }
          : {}),
      },
      include: buildDetailInclude(),
    });

    res.json({ success: true, data: culture });
  } catch (error) {
    console.error('Error creating lab culture:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪Ñ┘å╪┤╪º╪í ╪º┘ä┘à╪▓╪▒╪╣╪⌐' });
  }
};

const updateCulture = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.labCulture.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: '╪º┘ä┘à╪▓╪▒╪╣╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });

    const data = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return res.status(400).json({ success: false, error: '╪º╪│┘à ╪º┘ä┘à╪▓╪▒╪╣╪⌐ ┘à╪╖┘ä┘ê╪¿' });
      data.name = String(body.name).trim();
    }
    if (body.category !== undefined) data.category = normalizeText(body.category);
    if (body.sampleType !== undefined) data.sampleType = normalizeText(body.sampleType);
    if (body.price !== undefined) {
      const priceCheck = normalizePrice(body.price);
      if (priceCheck.error) return res.status(400).json({ success: false, error: priceCheck.error });
      data.price = priceCheck.value;
    }
    if (body.isActive !== undefined) data.isActive = normalizeBool(body.isActive, true);

    let replacementOrganisms = null;
    if (body.organisms !== undefined && body.organisms !== null) {
      const check = collectChildren(body.organisms, 'organism', res);
      if (check.error) return res.status(400).json({ success: false, error: check.error });
      replacementOrganisms = check.value;
    }
    let replacementAntibiotics = null;
    if (body.antibiotics !== undefined && body.antibiotics !== null) {
      const check = collectChildren(body.antibiotics, 'antibiotic', res);
      if (check.error) return res.status(400).json({ success: false, error: check.error });
      replacementAntibiotics = check.value;
    }

    if (replacementOrganisms) {
      await prisma.$transaction([
        prisma.labCultureOrganism.deleteMany({ where: { cultureId: id } }),
        ...(replacementOrganisms.length
          ? [prisma.labCultureOrganism.createMany({ data: replacementOrganisms.map(o => ({ companyId, cultureId: id, ...o })) })]
          : []),
      ]);
    }
    if (replacementAntibiotics) {
      await prisma.$transaction([
        prisma.labCultureAntibiotic.deleteMany({ where: { cultureId: id } }),
        ...(replacementAntibiotics.length
          ? [prisma.labCultureAntibiotic.createMany({ data: replacementAntibiotics.map(a => ({ companyId, cultureId: id, ...a })) })]
          : []),
      ]);
    }
    if (Object.keys(data).length) {
      await prisma.labCulture.update({ where: { id }, data });
    }

    const culture = await prisma.labCulture.findFirst({
      where: { id, companyId },
      include: buildDetailInclude(),
    });
    res.json({ success: true, data: culture });
  } catch (error) {
    console.error('Error updating lab culture:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¬╪¡╪»┘è╪½ ╪º┘ä┘à╪▓╪▒╪╣╪⌐' });
  }
};

const deleteCulture = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.labCulture.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: '╪º┘ä┘à╪▓╪▒╪╣╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });

    const culture = await prisma.labCulture.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: '╪¬┘à ╪¡╪░┘ü ╪º┘ä┘à╪▓╪▒╪╣╪⌐', data: culture });
  } catch (error) {
    console.error('Error deleting lab culture:', error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡╪░┘ü ╪º┘ä┘à╪▓╪▒╪╣╪⌐' });
  }
};

const addChild = async (req, res, kind) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const culture = await prisma.labCulture.findFirst({ where: { id, companyId } });
    if (!culture) return res.status(404).json({ success: false, error: '╪º┘ä┘à╪▓╪▒╪╣╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });

    const check = validateChildInput(req.body || {}, { requireName: true, kind });
    if (check.error) return res.status(400).json({ success: false, error: check.error });

    let sortOrder = check.value.sortOrder;
    if (req.body?.sortOrder === undefined || req.body?.sortOrder === null || req.body?.sortOrder === '') {
      const model = kind === 'organism' ? prisma.labCultureOrganism : prisma.labCultureAntibiotic;
      const last = await model.findFirst({
        where: { cultureId: id, companyId, isActive: true },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const model = kind === 'organism' ? prisma.labCultureOrganism : prisma.labCultureAntibiotic;
    const item = await model.create({
      data: { companyId, cultureId: id, ...check.value, sortOrder },
    });
    res.json({ success: true, data: item });
  } catch (error) {
    console.error(`Error adding lab culture ${kind}:`, error);
    res.status(500).json({ success: false, error: `╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪Ñ╪╢╪º┘ü╪⌐ ${childLabel(kind)}` });
  }
};

const removeChild = async (req, res, kind) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const culture = await prisma.labCulture.findFirst({ where: { id, companyId } });
    if (!culture) return res.status(404).json({ success: false, error: '╪º┘ä┘à╪▓╪▒╪╣╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });

    const childId = kind === 'organism' ? req.params.organismId : req.params.antibioticId;
    const model = kind === 'organism' ? prisma.labCultureOrganism : prisma.labCultureAntibiotic;
    const existing = await model.findFirst({
      where: { id: childId, cultureId: id, companyId },
    });
    if (!existing) return res.status(404).json({ success: false, error: `${childLabel(kind)} ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»` });

    await model.delete({ where: { id: childId } });
    res.json({ success: true, message: `╪¬┘à ╪¡╪░┘ü ${childLabel(kind)}`, data: existing });
  } catch (error) {
    console.error(`Error removing lab culture ${kind}:`, error);
    res.status(500).json({ success: false, error: `╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡╪░┘ü ${childLabel(kind)}` });
  }
};

module.exports = {
  getAllCultures,
  getCultureById,
  createCulture,
  updateCulture,
  deleteCulture,
  addOrganism: (req, res) => addChild(req, res, 'organism'),
  removeOrganism: (req, res) => removeChild(req, res, 'organism'),
  addAntibiotic: (req, res) => addChild(req, res, 'antibiotic'),
  removeAntibiotic: (req, res) => removeChild(req, res, 'antibiotic'),
};
