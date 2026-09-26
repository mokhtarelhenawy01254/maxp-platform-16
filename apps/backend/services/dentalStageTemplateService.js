const { getSharedPrismaClient } = require('./sharedDatabase');
const { DEFAULT_STAGE_NAMES } = require('../utils/dentalLabHelpers');

/**
 * Canonical 5 official stages with designated specialized roles and SLAs
 */
const CANONICAL_STAGE_TEMPLATES = [
  { name: 'الاستلام', sortOrder: 0, requiredRole: 'RECEPTION_LOGISTICS', slaHours: 12 },
  { name: 'التصميم', sortOrder: 1, requiredRole: 'CAD_DESIGNER', slaHours: 24 },
  { name: 'التصنيع', sortOrder: 2, requiredRole: 'CERAMIST', slaHours: 48 },
  { name: 'مراجعة الجودة', sortOrder: 3, requiredRole: 'QC_INSPECTOR', slaHours: 12 },
  { name: 'التسليم', sortOrder: 4, requiredRole: 'RECEPTION_LOGISTICS', slaHours: 12 },
];

/**
 * Standard technician roles mapping for canonical, Arabic variant, and legacy stage names
 */
const DEFAULT_STAGE_ROLES = {
  // Official canonical 5 stages
  'الاستلام': 'RECEPTION_LOGISTICS',
  'التصميم': 'CAD_DESIGNER',
  'التصنيع': 'CERAMIST',
  'مراجعة الجودة': 'QC_INSPECTOR',
  'التسليم': 'RECEPTION_LOGISTICS',

  // Arabic variants & compound names
  'استلام': 'RECEPTION_LOGISTICS',
  'استلام وتسجيل': 'RECEPTION_LOGISTICS',
  'تسجيل': 'RECEPTION_LOGISTICS',
  'تصميم': 'CAD_DESIGNER',
  'مسح ضوئي وتصميم': 'CAD_DESIGNER',
  'تصنيع': 'CERAMIST',
  'تفريز / طباعة 3D': 'CERAMIST',
  'طباعة ثلاثية الأبعاد': 'CERAMIST',
  'بناء البورسلين والصبغ': 'CERAMIST',
  'بورسلين': 'CERAMIST',
  'سيراميك': 'CERAMIST',
  'سينتر وتجهيز': 'METAL_CASTING',
  'صب معدني': 'METAL_CASTING',
  'تشطيب وتلميع': 'FINISHING_POLISHING',
  'تشطيب': 'FINISHING_POLISHING',
  'تلميع': 'FINISHING_POLISHING',
  'فحص الجودة': 'QC_INSPECTOR',
  'مراقبة الجودة': 'QC_INSPECTOR',
  'مراجعة': 'QC_INSPECTOR',
  'مراجعه': 'QC_INSPECTOR',
  'جاهز للتسليم': 'RECEPTION_LOGISTICS',
  'تسليم': 'RECEPTION_LOGISTICS',
  'شحن وتوصيل': 'RECEPTION_LOGISTICS',

  // Legacy mixed/English stage names found in legacy settings
  'designer': 'CAD_DESIGNER',
  'design': 'CAD_DESIGNER',
  'cad cam .printer': 'CAD_DESIGNER',
  'cad/cam': 'CAD_DESIGNER',
  'finish': 'FINISHING_POLISHING',
  'qc': 'QC_INSPECTOR',
  'خروج': 'RECEPTION_LOGISTICS',
  'تنفيز': 'GENERAL_TECHNICIAN',
};

/**
 * Robust helper to resolve the specialized technician role for any stage name
 */
function resolveRoleForStageName(name) {
  if (!name) return 'GENERAL_TECHNICIAN';
  const trimmed = String(name).trim();
  if (DEFAULT_STAGE_ROLES[trimmed]) {
    return DEFAULT_STAGE_ROLES[trimmed];
  }
  const lower = trimmed.toLowerCase();
  for (const [key, role] of Object.entries(DEFAULT_STAGE_ROLES)) {
    if (lower === key.toLowerCase()) return role;
  }
  // Keyword heuristics
  if (lower.includes('استلام') || lower.includes('تسجيل') || lower.includes('تسليم') || lower.includes('خروج') || lower.includes('شحن')) {
    return 'RECEPTION_LOGISTICS';
  }
  if (lower.includes('تصميم') || lower.includes('design') || lower.includes('cad') || lower.includes('cam')) {
    return 'CAD_DESIGNER';
  }
  if (lower.includes('جودة') || lower.includes('مراجع') || lower.includes('qc') || lower.includes('فحص')) {
    return 'QC_INSPECTOR';
  }
  if (lower.includes('تلميع') || lower.includes('تشطيب') || lower.includes('finish') || lower.includes('polish')) {
    return 'FINISHING_POLISHING';
  }
  if (lower.includes('بورسلين') || lower.includes('صبغ') || lower.includes('زيركون') || lower.includes('سيراميك') || lower.includes('طباعة') || lower.includes('تفريز')) {
    return 'CERAMIST';
  }
  if (lower.includes('معدن') || lower.includes('صب') || lower.includes('سينتر')) {
    return 'METAL_CASTING';
  }
  return 'GENERAL_TECHNICIAN';
}

/**
 * Get stage templates for a specific work type, falling back to default chain if none exist
 */
async function getStageTemplatesForWorkType(prisma, companyId, workTypeId, category = null) {
  if (prisma?.workTypeStageTemplate && typeof prisma.workTypeStageTemplate.findMany === 'function' && workTypeId) {
    try {
      const customTemplates = await prisma.workTypeStageTemplate.findMany({
        where: { workTypeId },
        orderBy: { sortOrder: 'asc' },
      });

      if (customTemplates && customTemplates.length > 0) {
        return customTemplates.map((t) => ({
          id: t.id,
          name: t.name,
          sortOrder: t.sortOrder,
          requiredRole: t.requiredRole || resolveRoleForStageName(t.name),
          stageWage: Number(t.stageWage) || 0,
          slaHours: t.slaHours || 24,
          isRequired: t.isRequired !== false,
          isDefault: false,
        }));
      }
    } catch (_) {}
  }

  // Check if category-specific templates are configured in dentalSetting (e.g. { 'جسر': ['أخذ مقاس', 'تركيب'] })
  if (category && prisma?.dentalSetting && typeof prisma.dentalSetting.findMany === 'function') {
    try {
      const settings = await prisma.dentalSetting.findMany({ where: { companyId } });
      const raw = settings?.find?.((s) => s && s.key === 'stageTemplates')?.value;
      const templates = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (templates && typeof templates === 'object' && Array.isArray(templates[category]) && templates[category].length > 0) {
        return templates[category].map((name, idx) => ({
          name,
          sortOrder: idx,
          requiredRole: resolveRoleForStageName(name),
          stageWage: 0,
          slaHours: 24,
          isRequired: true,
          isDefault: true,
        }));
      }
    } catch (_) {}
  }

  // If no custom templates exist, auto-seed canonical default templates for this work type
  if (prisma?.workTypeStageTemplate && typeof prisma.workTypeStageTemplate.create === 'function' && workTypeId) {
    try {
      const seeded = await seedDefaultStageTemplatesForWorkType(prisma, companyId, workTypeId, category);
      if (seeded && seeded.length > 0) {
        return seeded.map((t) => ({
          id: t.id,
          name: t.name,
          sortOrder: t.sortOrder,
          requiredRole: t.requiredRole || resolveRoleForStageName(t.name),
          stageWage: Number(t.stageWage) || 0,
          slaHours: t.slaHours || 24,
          isRequired: t.isRequired !== false,
          isDefault: true,
        }));
      }
    } catch (_) {}
  }

  return CANONICAL_STAGE_TEMPLATES.map((st) => ({
    name: st.name,
    sortOrder: st.sortOrder,
    requiredRole: st.requiredRole,
    stageWage: 0,
    slaHours: st.slaHours,
    isRequired: true,
    isDefault: true,
  }));
}

/**
 * Auto-seed default canonical stage templates for a single work type
 * Note: If custom templates already exist, it leaves them untouched!
 */
async function seedDefaultStageTemplatesForWorkType(prisma, companyId, workTypeId, category = null) {
  if (!workTypeId) return [];

  // Check if templates already exist - never touch existing custom templates
  const existing = await prisma.workTypeStageTemplate.findMany({
    where: { workTypeId },
    orderBy: { sortOrder: 'asc' },
  });
  if (existing.length > 0) return existing;

  const seeded = [];
  for (const st of CANONICAL_STAGE_TEMPLATES) {
    try {
      const row = await prisma.workTypeStageTemplate.create({
        data: {
          companyId,
          workTypeId,
          name: st.name,
          sortOrder: st.sortOrder,
          requiredRole: st.requiredRole,
          stageWage: 0,
          slaHours: st.slaHours,
          isRequired: true,
        },
      });
      if (row) {
        seeded.push(row);
      }
    } catch (_) {}
  }
  return seeded;
}

/**
 * Seed all work types that currently have 0 stage templates
 */
async function seedAllMissingWorkTypeStageTemplates(prisma, companyId = null) {
  const where = companyId ? { companyId, isActive: true } : { isActive: true };
  const workTypes = await prisma.dentalWorkType.findMany({ where });
  let seededCount = 0;

  for (const wt of workTypes) {
    const count = await prisma.workTypeStageTemplate.count({
      where: { workTypeId: wt.id },
    });
    if (count === 0) {
      await seedDefaultStageTemplatesForWorkType(prisma, wt.companyId, wt.id, wt.category);
      seededCount++;
    }
  }
  return seededCount;
}

/**
 * Migration/Repair: Fix improperly auto-seeded stage templates (e.g. all GENERAL_TECHNICIAN or legacy mixed names).
 * If a work type's templates are all GENERAL_TECHNICIAN and stageWage is 0,
 * or contain legacy mixed names ('designer', 'cad cam .printer', 'finish', 'مراجعه', 'خروج'),
 * it replaces them with the official canonical 5 stages with proper specialized roles.
 * Any customized templates (custom roles or non-zero wages) are left completely untouched!
 */
async function repairDefaultWorkTypeStageTemplates(prisma, companyId = null) {
  const where = companyId ? { companyId, isActive: true } : { isActive: true };
  const workTypes = await prisma.dentalWorkType.findMany({ where });
  let repairedCount = 0;

  const legacyNames = new Set(['designer', 'cad cam .printer', 'finish', 'مراجعه', 'خروج']);

  for (const wt of workTypes) {
    const templates = await prisma.workTypeStageTemplate.findMany({
      where: { workTypeId: wt.id },
      orderBy: { sortOrder: 'asc' },
    });

    if (templates.length === 0) continue;

    // Detect if this is an auto-seeded or legacy default template set:
    const hasLegacyName = templates.some((t) => legacyNames.has(t.name.trim().toLowerCase()));
    const allGeneralRoles = templates.every((t) => !t.requiredRole || t.requiredRole === 'GENERAL_TECHNICIAN');
    const zeroWages = templates.every((t) => Number(t.stageWage || 0) === 0);

    // If all stages are GENERAL_TECHNICIAN with 0 wages or has legacy mixed names, it is safe to upgrade
    if ((allGeneralRoles && zeroWages) || hasLegacyName) {
      await prisma.workTypeStageTemplate.deleteMany({
        where: { workTypeId: wt.id },
      });

      for (const st of CANONICAL_STAGE_TEMPLATES) {
        await prisma.workTypeStageTemplate.create({
          data: {
            companyId: wt.companyId,
            workTypeId: wt.id,
            name: st.name,
            sortOrder: st.sortOrder,
            requiredRole: st.requiredRole,
            stageWage: 0,
            slaHours: st.slaHours,
            isRequired: true,
          },
        });
      }
      repairedCount++;
    }
  }

  return repairedCount;
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
          requiredRole: item.requiredRole || resolveRoleForStageName(name),
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
async function buildCaseStagesFromWorkType(prisma, companyId, workTypeId, category = null) {
  const templates = await getStageTemplatesForWorkType(prisma, companyId, workTypeId, category);

  return templates.map((tpl, index) => ({
    companyId,
    name: tpl.name,
    status: 'PENDING',
    sortOrder: tpl.sortOrder !== undefined ? tpl.sortOrder : index,
    requiredRole: tpl.requiredRole || resolveRoleForStageName(tpl.name),
    stageWage: tpl.stageWage || 0,
    slaHours: tpl.slaHours || 24,
    isRequired: tpl.isRequired !== false,
  }));
}

module.exports = {
  CANONICAL_STAGE_TEMPLATES,
  DEFAULT_STAGE_ROLES,
  resolveRoleForStageName,
  getStageTemplatesForWorkType,
  setStageTemplatesForWorkType,
  buildCaseStagesFromWorkType,
  seedDefaultStageTemplatesForWorkType,
  seedAllMissingWorkTypeStageTemplates,
  repairDefaultWorkTypeStageTemplates,
};
