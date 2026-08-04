const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { v4: uuidv4 } = require('uuid');
const { toCanonicalE164 } = require('../utils/phoneNormalization');
const { findCustomerByPhone } = require('../utils/customerIdentity');

const getAll = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const data = await getSharedPrismaClient().formDefinition.findMany({
      where: { companyId },
      include: { _count: { select: { submissions: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching forms:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب النماذج' });
  }
};

const getById = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const data = await getSharedPrismaClient().formDefinition.findFirst({
      where: { id: req.params.id, companyId },
      include: { _count: { select: { submissions: true } } }
    });
    if (!data) return res.status(404).json({ success: false, error: 'النموذج غير موجود' });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching form:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب النموذج' });
  }
};

const create = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { title, slug, description, fields, pixelId, pixelToken, thankYouTitle, thankYouBody, submitLabel } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ success: false, error: 'عنوان النموذج مطلوب' });
    if (!slug || !slug.trim()) return res.status(400).json({ success: false, error: 'الرابط المختصر مطلوب' });
    if (!fields || !Array.isArray(fields) || fields.length === 0) return res.status(400).json({ success: false, error: 'الحقول مطلوبة' });

    const existing = await getSharedPrismaClient().formDefinition.findUnique({
      where: { companyId_slug: { companyId, slug: slug.trim() } }
    });
    if (existing) return res.status(400).json({ success: false, error: 'الرابط المختصر مستخدم بالفعل' });

    const data = await getSharedPrismaClient().formDefinition.create({
      data: { companyId, title: title.trim(), slug: slug.trim(), description, fields, pixelId, pixelToken, thankYouTitle, thankYouBody, submitLabel }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating form:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء النموذج' });
  }
};

const update = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const existing = await getSharedPrismaClient().formDefinition.findFirst({ where: { id: req.params.id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'النموذج غير موجود' });

    const { title, slug, description, fields, pixelId, pixelToken, thankYouTitle, thankYouBody, submitLabel, isActive } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (slug !== undefined) {
      const slugClean = slug.trim();
      const slugExists = await getSharedPrismaClient().formDefinition.findUnique({
        where: { companyId_slug: { companyId, slug: slugClean } }
      });
      if (slugExists && slugExists.id !== req.params.id) return res.status(400).json({ success: false, error: 'الرابط المختصر مستخدم بالفعل' });
      updateData.slug = slugClean;
    }
    if (description !== undefined) updateData.description = description;
    if (fields !== undefined) updateData.fields = fields;
    if (pixelId !== undefined) updateData.pixelId = pixelId;
    if (pixelToken !== undefined) updateData.pixelToken = pixelToken;
    if (thankYouTitle !== undefined) updateData.thankYouTitle = thankYouTitle;
    if (thankYouBody !== undefined) updateData.thankYouBody = thankYouBody;
    if (submitLabel !== undefined) updateData.submitLabel = submitLabel;
    if (isActive !== undefined) updateData.isActive = isActive;

    const data = await getSharedPrismaClient().formDefinition.update({
      where: { id: req.params.id },
      data: updateData
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating form:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث النموذج' });
  }
};

const remove = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const existing = await getSharedPrismaClient().formDefinition.findFirst({ where: { id: req.params.id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'النموذج غير موجود' });

    await getSharedPrismaClient().formDefinition.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'تم حذف النموذج' });
  } catch (error) {
    console.error('Error deleting form:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف النموذج' });
  }
};

const getSubmissions = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const form = await getSharedPrismaClient().formDefinition.findFirst({ where: { id: req.params.id, companyId } });
    if (!form) return res.status(404).json({ success: false, error: 'النموذج غير موجود' });

    const data = await getSharedPrismaClient().formSubmission.findMany({
      where: { formId: req.params.id, companyId },
      include: { customer: { select: { id: true, firstName: true, lastName: true, phone: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الردود' });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const form = await getSharedPrismaClient().formDefinition.findFirst({
      where: { id: req.params.id, companyId }
    });
    if (!form) return res.status(404).json({ success: false, error: 'النموذج غير موجود' });

    const totalSubmissions = await getSharedPrismaClient().formSubmission.count({
      where: { formId: req.params.id, companyId }
    });
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todaySubmissions = await getSharedPrismaClient().formSubmission.count({
      where: { formId: req.params.id, companyId, createdAt: { gte: todayStart } }
    });
    const conversionRate = form.viewCount > 0 ? ((totalSubmissions / form.viewCount) * 100).toFixed(1) : '0';
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);
      const count = await getSharedPrismaClient().formSubmission.count({
        where: { formId: req.params.id, companyId, createdAt: { gte: dayStart, lte: dayEnd } }
      });
      last7Days.push({ date: d.toISOString().split('T')[0], submissions: count });
    }

    res.json({
      success: true,
      data: {
        totalViews: form.viewCount,
        totalSubmissions,
        todaySubmissions,
        conversionRate: parseFloat(conversionRate),
        last7Days
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب التحليلات' });
  }
};

const getPublic = async (req, res) => {
  try {
    const { slug } = req.params;
    const data = await getSharedPrismaClient().formDefinition.findFirst({
      where: { slug, isActive: true },
      select: { id: true, title: true, description: true, fields: true, pixelId: true, submitLabel: true, thankYouTitle: true, thankYouBody: true, companyId: true }
    });
    if (!data) return res.status(404).json({ success: false, error: 'النموذج غير موجود' });

    await getSharedPrismaClient().formDefinition.update({
      where: { id: data.id },
      data: { viewCount: { increment: 1 } }
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching public form:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ' });
  }
};

const submitPublic = async (req, res) => {
  try {
    const { slug } = req.params;
    const { data: fieldValues } = req.body;

    const form = await getSharedPrismaClient().formDefinition.findFirst({
      where: { slug, isActive: true }
    });
    if (!form) return res.status(404).json({ success: false, error: 'النموذج غير موجود' });
    if (!fieldValues || typeof fieldValues !== 'object') return res.status(400).json({ success: false, error: 'بيانات النموذج مطلوبة' });
    if (!Array.isArray(form.fields)) return res.status(500).json({ success: false, error: 'خطأ في تكوين النموذج' });

    for (const field of form.fields) {
      if (field.required && !fieldValues[field.id]) return res.status(400).json({ success: false, error: `الحقل "${field.label || field.id}" مطلوب` });
    }

    const ip = req.headers['x-forwarded-for'] || req.ip || '';
    const userAgent = req.headers['user-agent'] || '';
    const phone = fieldValues.phone || fieldValues.phoneNumber || fieldValues.mobile || '';
    const firstName = fieldValues.firstName || fieldValues.name || fieldValues.fullName || '';
    const lastName = fieldValues.lastName || '';

    let customerId = null;
    if (phone) {
      let customer = await findCustomerByPhone(getSharedPrismaClient(), phone, form.companyId);
      if (!customer) {
        customer = await getSharedPrismaClient().customer.create({
          data: { companyId: form.companyId, firstName: typeof firstName === 'string' ? firstName.substring(0, 50) : '', lastName: typeof lastName === 'string' ? lastName.substring(0, 50) : '', phone: String(phone).substring(0, 20), phoneNormalized: toCanonicalE164(phone), status: 'LEAD' }
        });
      }
      customerId = customer.id;
    }

    const submission = await getSharedPrismaClient().formSubmission.create({
      data: { formId: form.id, companyId: form.companyId, data: fieldValues, customerId, ip: String(ip).substring(0, 45), userAgent: String(userAgent).substring(0, 500) }
    });

    res.json({ success: true, data: { id: submission.id, customerId } });
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حفظ البيانات' });
  }
};

module.exports = { getAll, getById, create, update, remove, getSubmissions, getAnalytics, getPublic, submitPublic };
