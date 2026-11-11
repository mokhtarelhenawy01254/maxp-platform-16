const sharedDatabase = require('../services/sharedDatabase');
const { logEducationEvent } = require('../services/educationAuditService');

const getSharedPrismaClient = () => sharedDatabase.getSharedPrismaClient();

const resolveCompanyId = (req) => {
  const headerCid = req.headers?.['x-company-id'] || req.headers?.['X-Company-Id'] || req.query?.companyId;
  const userRole = String(req.user?.role || '').toUpperCase();
  if (headerCid) {
    if (userRole === 'SUPER_ADMIN') return String(headerCid).trim();
    if (req.user?.companyId === headerCid) return String(headerCid).trim();
    const hasCompany = Array.isArray(req.user?.userCompanies) && req.user.userCompanies.some(uc => uc.companyId === headerCid || uc.company?.id === headerCid);
    if (hasCompany) return String(headerCid).trim();
  }
  return req.user?.companyId || req.user?.effectiveCompanyId || req.user?.userCompanies?.[0]?.companyId || null;
};

const getAll = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { subjectId } = req.query;
    const where = { companyId };
    if (subjectId) where.subjectId = subjectId;

    const data = await getSharedPrismaClient().educationPackage.findMany({
      where,
      include: { subject: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الباقات' });
  }
};

const create = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    let { subjectId, name, description, hoursCount, sessionDuration, price, levelNumber, ageFrom, ageTo } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'اسم الباقة مطلوب' });
    if (!hoursCount || hoursCount <= 0) return res.status(400).json({ success: false, error: 'عدد الساعات يجب أن يكون أكبر من صفر' });

    const prisma = getSharedPrismaClient();

    // In Courses/Packages mode, subjectId might be omitted. Auto-resolve to default company subject.
    if (!subjectId) {
      let defaultSubject = await prisma.educationSubject.findFirst({
        where: { companyId, isActive: true },
        orderBy: { createdAt: 'asc' }
      });
      if (!defaultSubject) {
        defaultSubject = await prisma.educationSubject.create({
          data: {
            companyId,
            name: 'عام',
            description: 'تصنيف عام للكورسات والباقات',
            isActive: true
          }
        });
      }
      subjectId = defaultSubject.id;
    } else {
      // Validate that the provided subjectId belongs strictly to this company
      const validSubject = await prisma.educationSubject.findFirst({
        where: { id: subjectId, companyId }
      });
      if (!validSubject) {
        return res.status(400).json({ success: false, error: 'المادة المحددة غير صالحة أو غير تابعة لهذه الشركة' });
      }
    }

    const data = await prisma.educationPackage.create({
      data: { companyId, subjectId, name: name.trim(), description, hoursCount, sessionDuration, price,
        levelNumber: levelNumber ? Number(levelNumber) : null,
        ageFrom: ageFrom ? Number(ageFrom) : null,
        ageTo: ageTo ? Number(ageTo) : null },
      include: { subject: { select: { id: true, name: true } } }
    });

    logEducationEvent({
      companyId,
      action: 'CREATE_PACKAGE',
      entityType: 'PACKAGE',
      entityId: data.id,
      entityName: data.name,
      description: `تم إنشاء باقة حصص جديدة: ${data.name} (${hoursCount} ساعة - ${price} ج.م - مادة: ${data.subject?.name || ''})`,
      details: { hoursCount, sessionDuration, price, subjectId },
      req,
    }).catch(e => console.error('[PackageAudit]', e.message));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الباقة' });
  }
};

const update = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { subjectId, name, description, hoursCount, sessionDuration, price, isActive, levelNumber, ageFrom, ageTo } = req.body;

    const existing = await getSharedPrismaClient().educationPackage.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الباقة غير موجودة' });

    if (subjectId) {
      const validSubject = await getSharedPrismaClient().educationSubject.findFirst({
        where: { id: subjectId, companyId }
      });
      if (!validSubject) {
        return res.status(400).json({ success: false, error: 'المادة المحددة غير صالحة أو غير تابعة لهذه الشركة' });
      }
    }

    const data = await getSharedPrismaClient().educationPackage.update({
      where: { id },
      data: {
        ...(subjectId ? { subjectId } : {}),
        name, description, hoursCount, sessionDuration, price, isActive,
        ...(levelNumber !== undefined ? { levelNumber: levelNumber === null ? null : Number(levelNumber) } : {}),
        ...(ageFrom !== undefined ? { ageFrom: ageFrom === null ? null : Number(ageFrom) } : {}),
        ...(ageTo !== undefined ? { ageTo: ageTo === null ? null : Number(ageTo) } : {}),
      },
      include: { subject: { select: { id: true, name: true } } }
    });

    logEducationEvent({
      companyId,
      action: 'UPDATE_PACKAGE',
      entityType: 'PACKAGE',
      entityId: data.id,
      entityName: data.name,
      description: `تم تعديل باقة الحصص: ${data.name}`,
      details: {
        before: { name: existing.name, hoursCount: existing.hoursCount, price: existing.price, isActive: existing.isActive },
        after: { name: data.name, hoursCount: data.hoursCount, price: data.price, isActive: data.isActive }
      },
      req,
    }).catch(e => console.error('[PackageAudit]', e.message));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الباقة' });
  }
};

const remove = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().educationPackage.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الباقة غير موجودة' });

    await getSharedPrismaClient().educationPackage.delete({ where: { id } });

    logEducationEvent({
      companyId,
      action: 'DELETE_PACKAGE',
      entityType: 'PACKAGE',
      entityId: id,
      entityName: existing.name,
      description: `تم حذف باقة الحصص: ${existing.name}`,
      details: { deletedPackage: existing },
      severity: 'MEDIUM',
      req,
    }).catch(e => console.error('[PackageAudit]', e.message));

    res.json({ success: true, message: 'تم حذف الباقة' });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الباقة' });
  }
};

const getById = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const data = await getSharedPrismaClient().educationPackage.findFirst({
      where: { id, companyId },
      include: { subject: { select: { id: true, name: true } } }
    });
    if (!data) return res.status(404).json({ success: false, error: 'الباقة غير موجودة' });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching package:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الباقة' });
  }
};

module.exports = { getAll, getById, create, update, remove };
