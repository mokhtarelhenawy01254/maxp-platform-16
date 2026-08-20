const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { normalizeModality } = require('../utils/radiologyModality');

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
};

const normalizeBool = (value, fallback) => {
  if (value === undefined || value === null) return fallback;
  return value === true || value === 'true' || value === 1 || value === '1';
};

const CATEGORY_INCLUDE = {
  _count: { select: { examTypes: true, children: true } },
};

const listCategories = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { search, parentId, includeInactive, mode } = req.query;
    const prisma = getSharedPrismaClient();

    const categories = await prisma.radiologyExamCategory.findMany({
      where: { companyId, ...(includeInactive !== 'true' ? { isActive: true } : {}) },
      include: CATEGORY_INCLUDE,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const nameById = new Map(categories.map(c => [c.id, c.name]));
    let rows = categories.map(c => ({
      ...c,
      parentName: c.parentId ? nameById.get(c.parentId) || null : null,
    }));

    if (search && String(search).trim()) {
      const term = String(search).trim().toLowerCase();
      rows = rows.filter(c =>
        c.name.toLowerCase().includes(term)
        || (c.nameEn || '').toLowerCase().includes(term)
        || (c.abbreviation || '').toLowerCase().includes(term)
      );
    }
    if (parentId === 'root') {
      rows = rows.filter(c => !c.parentId);
    } else if (parentId && parentId !== '' && parentId !== 'null') {
      rows = rows.filter(c => c.parentId === parentId);
    }

    if (mode === 'tree') {
      const byId = new Map(rows.map(c => [c.id, { ...c, children: [] }]));
      const roots = [];
      for (const node of byId.values()) {
        if (node.parentId && byId.has(node.parentId)) byId.get(node.parentId).children.push(node);
        else roots.push(node);
      }
      return res.json({ success: true, data: roots, total: roots.length });
    }

    res.json({ success: true, data: rows, total: rows.length });
  } catch (error) {
    console.error('Error listing radiology exam categories:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب فئات الفحوصات' });
  }
};

const createCategory = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const body = req.body || {};
    const name = normalizeText(body.name);
    if (!name) return res.status(400).json({ success: false, error: 'اسم الفئة مطلوب' });

    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyExamCategory.findFirst({ where: { companyId, name } });
    if (existing) return res.status(400).json({ success: false, error: `توجد فئة بنفس الاسم "${name}"` });

    const parentId = normalizeText(body.parentId);
    if (parentId) {
      const parent = await prisma.radiologyExamCategory.findFirst({ where: { id: parentId, companyId } });
      if (!parent) return res.status(400).json({ success: false, error: 'الفئة الأب غير موجودة' });
    }

    const category = await prisma.radiologyExamCategory.create({
      data: {
        companyId,
        name,
        nameEn: normalizeText(body.nameEn),
        abbreviation: normalizeText(body.abbreviation),
        modality: normalizeModality(body.modality) || normalizeModality(name),
        parentId: parentId || null,
        isActive: normalizeBool(body.isActive, true),
        sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
      },
    });

    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Error creating radiology exam category:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء فئة الفحص' });
  }
};

const assertNoCycle = (categories, id, parentId) => {
  if (!parentId) return true;
  if (parentId === id) return false;
  let current = categories.find(c => c.id === parentId);
  while (current) {
    if (current.parentId === id) return false;
    current = current.parentId ? categories.find(c => c.id === current.parentId) : null;
  }
  return true;
};

const updateCategory = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyExamCategory.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الفئة غير موجودة' });

    const data = {};
    if (body.name !== undefined) {
      const name = normalizeText(body.name);
      if (!name) return res.status(400).json({ success: false, error: 'اسم الفئة مطلوب' });
      const dup = await prisma.radiologyExamCategory.findFirst({ where: { companyId, name, NOT: { id } } });
      if (dup) return res.status(400).json({ success: false, error: `توجد فئة بنفس الاسم "${name}"` });
      data.name = name;
    }
    if (body.nameEn !== undefined) data.nameEn = normalizeText(body.nameEn);
    if (body.abbreviation !== undefined) data.abbreviation = normalizeText(body.abbreviation);
    if (body.modality !== undefined) data.modality = normalizeModality(body.modality);
    if (body.sortOrder !== undefined) data.sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;
    if (body.isActive !== undefined) data.isActive = normalizeBool(body.isActive, existing.isActive);
    if (body.parentId !== undefined) {
      const parentId = normalizeText(body.parentId);
      if (parentId) {
        const parent = await prisma.radiologyExamCategory.findFirst({ where: { id: parentId, companyId } });
        if (!parent) return res.status(400).json({ success: false, error: 'الفئة الأب غير موجودة' });
      }
      const all = await prisma.radiologyExamCategory.findMany({ where: { companyId }, select: { id: true, parentId: true } });
      if (!assertNoCycle(all, id, parentId)) {
        return res.status(400).json({ success: false, error: 'لا يمكن جعل الفئة فرعية من نفسها أو من فرع منها' });
      }
      data.parentId = parentId || null;
    }

    const category = await prisma.radiologyExamCategory.update({ where: { id }, data });
    if (data.name && data.name !== existing.name) {
      await prisma.radiologyExamType.updateMany({ where: { companyId, categoryId: id }, data: { category: data.name } });
    }

    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Error updating radiology exam category:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث فئة الفحص' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyExamCategory.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الفئة غير موجودة' });

    const category = await prisma.radiologyExamCategory.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'تم حذف الفئة', data: category });
  } catch (error) {
    console.error('Error deleting radiology exam category:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف فئة الفحص' });
  }
};

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
