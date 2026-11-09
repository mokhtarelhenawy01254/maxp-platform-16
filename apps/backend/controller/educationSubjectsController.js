const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { logEducationEvent } = require('../services/educationAuditService');

const getAll = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const data = await getSharedPrismaClient().educationSubject.findMany({
      where: { companyId },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المواد' });
  }
};

const create = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { name, description, price } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'اسم المادة مطلوب' });

    const subjectName = name.trim();
    const duplicate = await getSharedPrismaClient().educationSubject.findFirst({
      where: { companyId, name: { equals: subjectName, mode: 'insensitive' } },
      select: { id: true }
    });
    if (duplicate) {
      return res.status(409).json({ success: false, error: `مادة بنفس الاسم «${subjectName}» موجودة بالفعل` });
    }

    let parsedPrice = 0;
    if (price !== undefined && price !== null && price !== "") {
      const num = Number(price);
      if (!Number.isFinite(num) || num < 0) {
        return res.status(400).json({ success: false, error: 'سعر المادة يجب أن يكون رقماً موجباً أو صفراً' });
      }
      parsedPrice = num;
    }

    const data = await getSharedPrismaClient().educationSubject.create({
      data: { companyId, name: subjectName, description, price: parsedPrice }
    });

    logEducationEvent({
      companyId,
      action: 'CREATE_SUBJECT',
      entityType: 'SUBJECT',
      entityId: data.id,
      entityName: data.name,
      description: `تم إضافة مادة دراسية جديدة: ${data.name} (السعر: ${parsedPrice} ج.م)`,
      details: { price: parsedPrice, description },
      req,
    }).catch(e => console.error('[SubjectAudit]', e.message));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء المادة' });
  }
};

const update = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { name, description, price, isActive } = req.body;

    const existing = await getSharedPrismaClient().educationSubject.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'المادة غير موجودة' });

    let nextName = name;
    if (typeof name === 'string' && name.trim()) {
      const subjectName = name.trim();
      const duplicate = await getSharedPrismaClient().educationSubject.findFirst({
        where: { companyId, id: { not: id }, name: { equals: subjectName, mode: 'insensitive' } },
        select: { id: true }
      });
      if (duplicate) {
        return res.status(409).json({ success: false, error: `مادة بنفس الاسم «${subjectName}» موجودة بالفعل` });
      }
      nextName = subjectName;
    }

    const updatePayload = { name: nextName, description, isActive };
    if (price !== undefined && price !== null && price !== "") {
      const num = Number(price);
      if (!Number.isFinite(num) || num < 0) {
        return res.status(400).json({ success: false, error: 'سعر المادة يجب أن يكون رقماً موجباً أو صفراً' });
      }
      updatePayload.price = num;
    }

    const data = await getSharedPrismaClient().educationSubject.update({
      where: { id },
      data: updatePayload
    });

    logEducationEvent({
      companyId,
      action: 'UPDATE_SUBJECT',
      entityType: 'SUBJECT',
      entityId: data.id,
      entityName: data.name,
      description: `تم تعديل بيانات المادة: ${data.name}`,
      details: {
        before: { name: existing.name, price: existing.price, isActive: existing.isActive },
        after: { name: data.name, price: data.price, isActive: data.isActive }
      },
      req,
    }).catch(e => console.error('[SubjectAudit]', e.message));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث المادة' });
  }
};

const remove = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().educationSubject.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'المادة غير موجودة' });

    await getSharedPrismaClient().educationSubject.delete({ where: { id } });

    logEducationEvent({
      companyId,
      action: 'DELETE_SUBJECT',
      entityType: 'SUBJECT',
      entityId: id,
      entityName: existing.name,
      description: `تم حذف المادة الدراسية: ${existing.name}`,
      details: { deletedSubject: existing },
      severity: 'MEDIUM',
      req,
    }).catch(e => console.error('[SubjectAudit]', e.message));

    res.json({ success: true, message: 'تم حذف المادة' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف المادة' });
  }
};

module.exports = { getAll, create, update, remove };
