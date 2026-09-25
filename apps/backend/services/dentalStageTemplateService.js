const { getSharedPrismaClient } = require('./sharedDatabase');
const { DEFAULT_STAGE_NAMES } = require('../utils/dentalLabHelpers');

/**
 * Standard technician roles mapping
 */
const DEFAULT_STAGE_ROLES = {
  'استلام وتسجيل': 'RECEPTION_LOGISTICS',
  'مسح ضوئي وتصميم': 'CAD_DESIGNER',
  'تفريز / طباعة 3D': 'CERAMIST',
  'سينتر وتجهيز': 'METAL_CASTING',
  'بناء البورسلين والصبغ': 'CERAMIST',
  'تشطيب وتلميع': 'FINISHING_POLISHING',
  'فحص الجودة': 'QC_INSPECTOR',
  'جاهز للتسليم': 'RECEPTION_LOGISTICS',
};

/**
 * Get stage templates for a specific work type, falling back to default chain if none exist
 */
async function getStageTemplatesForWorkType(prisma, companyId, workTypeId) {
  if (!workTypeId) {
    return DEFAULT_STAGE_NAMES.map((name, idx) => ({
      name,
      sortOrder: idx,
      requiredRole: DEFAULT_STAGE_ROLES[name] || 'GENERAL_TECHNICIAN',
      stageWage: 0,
      slaHours: 24,
      isRequired: true,
      isDefault: true,
    }));
  }

  const customTemplates = await prisma.workTypeStageTemplate.findMany({
    where: { workTypeId },
    orderBy: { sortOrder: 'asc' },
  });

  if (customTemplates && customTemplates.length > 0) {
    return customTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      sortOrder: t.sortOrder,
      requiredRole: t.requiredRole || 'GENERAL_TECHNICIAN',
      stageWage: Number(t.stageWage) || 0,
      slaHours: t.slaHours || 24,
      isRequired: t.isRequired !== false,
      isDefault: false,
    }));
  }

  return DEFAULT_STAGE_NAMES.map((name, idx) => ({
    name,
    sortOrder: idx,
    requiredRole: DEFAULT_STAGE_ROLES[name] || 'GENERAL_TECHNICIAN',
    stageWage: 0,
    slaHours: 24,
    isRequired: true,
    isDefault: true,
  }));
}

/**
 * Save / replace stage templates for a work type
 */
async function setStageTemplatesForWorkType(prisma, companyId, workTypeId, templates) {
  if (!workTypeId) throw new Error('workTypeId مطلوب');
  if (!Array.isArray(templates) || templates.length === 0) {
    throw new Error('يجب توفير مصفوفة مراحل صالحة');
  }

  return prisma.$transaction(async (tx) => {
    // Delete existing templates for this work type
    await tx.workTypeStageTemplate.deleteMany({
      where: { workTypeId },
    });

    const created = [];
    for (let i = 0; i < templates.length; i++) {
      const item = templates[i];
      const name = String(item.name || '').trim();
      if (!name) continue;

      const record = await tx.workTypeStageTemplate.create({
        data: {
          companyId,
          workTypeId,
          name,
          sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : i,
          requiredRole: item.requiredRole || 'GENERAL_TECHNICIAN',
          stageWage: Number(item.stageWage) >= 0 ? Number(item.stageWage) : 0,
          slaHours: Number(item.slaHours) > 0 ? parseInt(item.slaHours, 10) : 24,
          isRequired: item.isRequired !== false,
        },
      });
      created.push(record);
    }

    return created;
  });
}

/**
 * Build case stages from work type template
 */
async function buildCaseStagesFromWorkType(prisma, companyId, workTypeId) {
  const templates = await getStageTemplatesForWorkType(prisma, companyId, workTypeId);

  return templates.map((tpl, index) => ({
    companyId,
    name: tpl.name,
    status: index === 0 ? 'PENDING' : 'PENDING',
    sortOrder: tpl.sortOrder !== undefined ? tpl.sortOrder : index,
    requiredRole: tpl.requiredRole || 'GENERAL_TECHNICIAN',
    stageWage: tpl.stageWage || 0,
    slaHours: tpl.slaHours || 24,
    isRequired: tpl.isRequired !== false,
  }));
}

module.exports = {
  DEFAULT_STAGE_ROLES,
  getStageTemplatesForWorkType,
  setStageTemplatesForWorkType,
  buildCaseStagesFromWorkType,
};
