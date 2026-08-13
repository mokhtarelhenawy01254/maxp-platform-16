const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { MODALITY_BY_CATEGORY } = require('./radiologyController');

const APPOINTMENT_STATUSES = ['SCHEDULED', 'CHECKED_IN', 'DONE', 'CANCELLED'];

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
};

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const listAppointments = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { patientName, status, dateFrom, dateTo, page, limit } = req.query;
    const where = { companyId };
    if (patientName && String(patientName).trim()) {
      where.patientName = { contains: String(patientName).trim(), mode: 'insensitive' };
    }
    if (status) {
      const s = String(status).toUpperCase();
      if (!APPOINTMENT_STATUSES.includes(s)) return res.status(400).json({ success: false, error: 'حالة الحجز غير صحيحة' });
      where.status = s;
    }
    if (dateFrom || dateTo) {
      const f = {};
      if (dateFrom) f.gte = parseDate(dateFrom);
      if (dateTo) f.lte = parseDate(dateTo);
      if (f.gte || f.lte) where.appointmentDate = f;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const prisma = getSharedPrismaClient();
    const [items, total] = await Promise.all([
      prisma.radiologyAppointment.findMany({ where, orderBy: { appointmentDate: 'desc' }, skip, take: limitNum }),
      prisma.radiologyAppointment.count({ where }),
    ]);
    res.json({ success: true, data: { items, total, page: pageNum, limit: limitNum } });
  } catch (error) {
    console.error('Error listing radiology appointments:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الحجوزات' });
  }
};

const createAppointment = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const body = req.body || {};
    const patientName = typeof body.patientName === 'string' ? body.patientName.trim() : '';
    if (!patientName) return res.status(400).json({ success: false, error: 'اسم المريض مطلوب' });

    const prisma = getSharedPrismaClient();
    let examTypeName = null;
    let priceResolved = 0;
    if (body.examTypeId) {
      const examType = await prisma.radiologyExamType.findFirst({ where: { id: body.examTypeId, companyId, isActive: true } });
      if (examType) examTypeName = examType.name;
    }

    let additionAmount = 0;
    let additionIds = null;
    if (Array.isArray(body.additionIds) && body.additionIds.length) {
      const additions = await prisma.radiologyExamType.findMany({
        where: { id: { in: body.additionIds }, companyId, isActive: true, isAddition: true },
      });
      if (additions.length) {
        additionIds = JSON.stringify(additions.map(a => a.id));
        additionAmount = additions.reduce((s, a) => s + a.price, 0);
      }
    }

    let referringPhysicianName = body.referralDoctor ? String(body.referralDoctor) : null;
    if (body.referringPhysicianId) {
      const physician = await prisma.radiologyReferringPhysician.findFirst({
        where: { id: String(body.referringPhysicianId), companyId, isActive: true },
        select: { id: true, name: true },
      });
      if (physician) {
        referringPhysicianName = physician.name;
      }
    }

    const appointment = await prisma.radiologyAppointment.create({
      data: {
        companyId,
        patientId: body.patientId || null,
        patientName,
        patientPhone: body.patientPhone ? String(body.patientPhone) : null,
        patientGender: body.patientGender || null,
        patientAge: body.patientAge ? String(body.patientAge) : null,
        nationalId: body.nationalId ? String(body.nationalId) : null,
        insuranceNumber: body.insuranceNumber ? String(body.insuranceNumber) : null,
        examTypeId: body.examTypeId || null,
        examTypeName: examTypeName || (body.examTypeName ? String(body.examTypeName) : null),
        insuranceCompanyId: body.insuranceCompanyId || null,
        additionIds,
        additionAmount,
        referringPhysicianId: body.referringPhysicianId || null,
        referralDoctor: referringPhysicianName,
        emergency: body.emergency === true || body.emergency === 'true',
        appointmentDate: parseDate(body.appointmentDate),
        appointmentTime: normalizeText(body.appointmentTime),
        branchId: body.branchId || null,
        status: body.status || 'SCHEDULED',
        notes: body.notes ? String(body.notes) : null,
        createdBy: req.user?.id || req.user?.email || null,
      },
    });
    res.json({ success: true, data: appointment });
  } catch (error) {
    console.error('Error creating radiology appointment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الحجز' });
  }
};

const updateAppointment = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyAppointment.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الحجز غير موجود' });

    const data = {};
    if (body.patientId !== undefined) data.patientId = body.patientId || null;
    if (body.patientName !== undefined) {
      if (!String(body.patientName).trim()) return res.status(400).json({ success: false, error: 'اسم المريض مطلوب' });
      data.patientName = String(body.patientName).trim();
    }
    if (body.patientPhone !== undefined) data.patientPhone = normalizeText(body.patientPhone);
    if (body.patientGender !== undefined) data.patientGender = normalizeText(body.patientGender);
    if (body.patientAge !== undefined) data.patientAge = normalizeText(body.patientAge);
    if (body.nationalId !== undefined) data.nationalId = normalizeText(body.nationalId);
    if (body.insuranceNumber !== undefined) data.insuranceNumber = normalizeText(body.insuranceNumber);
    if (body.examTypeId !== undefined) {
      data.examTypeId = body.examTypeId || null;
      if (body.examTypeId) {
        const examType = await prisma.radiologyExamType.findFirst({ where: { id: String(body.examTypeId), companyId } });
        data.examTypeName = examType ? examType.name : (data.examTypeName || null);
      } else {
        data.examTypeName = null;
      }
    }
    if (body.examTypeName !== undefined) data.examTypeName = normalizeText(body.examTypeName);
    if (body.insuranceCompanyId !== undefined) data.insuranceCompanyId = body.insuranceCompanyId || null;
    if (body.additionIds !== undefined) {
      if (Array.isArray(body.additionIds) && body.additionIds.length) {
        const additions = await prisma.radiologyExamType.findMany({ where: { id: { in: body.additionIds }, companyId, isActive: true, isAddition: true } });
        data.additionIds = JSON.stringify(additions.map(a => a.id));
        data.additionAmount = additions.reduce((s, a) => s + a.price, 0);
      } else {
        data.additionIds = null;
        data.additionAmount = 0;
      }
    }
    if (body.referringPhysicianId !== undefined) data.referringPhysicianId = body.referringPhysicianId || null;
    if (body.referralDoctor !== undefined) data.referralDoctor = normalizeText(body.referralDoctor);
    if (body.emergency !== undefined) data.emergency = body.emergency === true || body.emergency === 'true';
    if (body.appointmentDate !== undefined) data.appointmentDate = parseDate(body.appointmentDate);
    if (body.appointmentTime !== undefined) data.appointmentTime = normalizeText(body.appointmentTime);
    if (body.branchId !== undefined) data.branchId = normalizeText(body.branchId);
    if (body.notes !== undefined) data.notes = normalizeText(body.notes);
    if (body.status !== undefined) {
      const s = String(body.status).toUpperCase();
      if (!APPOINTMENT_STATUSES.includes(s)) return res.status(400).json({ success: false, error: 'حالة الحجز غير صحيحة' });
      data.status = s;
    }

    const appointment = await prisma.radiologyAppointment.update({ where: { id }, data });
    res.json({ success: true, data: appointment });
  } catch (error) {
    console.error('Error updating radiology appointment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الحجز' });
  }
};

const deleteAppointment = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyAppointment.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الحجز غير موجود' });

    await prisma.radiologyAppointment.delete({ where: { id } });
    res.json({ success: true, message: 'تم حذف الحجز', data: { id } });
  } catch (error) {
    console.error('Error deleting radiology appointment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الحجز' });
  }
};

const convertToStudy = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const appointment = await prisma.radiologyAppointment.findFirst({ where: { id, companyId } });
    if (!appointment) return res.status(404).json({ success: false, error: 'الحجز غير موجود' });
    if (appointment.status === 'CANCELLED') return res.status(400).json({ success: false, error: 'لا يمكن تحويل حجز ملغي' });

    const { generateStudyNumber } = require('../utils/dicomUtil');
    let examType = null;
    if (appointment.examTypeId) {
      examType = await prisma.radiologyExamType.findFirst({ where: { id: appointment.examTypeId, companyId, isActive: true } });
    }
    // Resolve price: entity price > exam base
    let priceSnapshot = examType ? examType.price : 0;
    if (appointment.insuranceCompanyId && examType) {
      const entityPrice = await prisma.radiologyEntityPrice.findFirst({
        where: { insuranceCompanyId: appointment.insuranceCompanyId, examTypeId: examType.id, isActive: true },
        select: { price: true },
      }).catch(() => null);
      if (entityPrice && Number.isFinite(entityPrice.price)) priceSnapshot = entityPrice.price;
    }
    if (examType && priceSnapshot <= 0) {
      return res.status(400).json({
        success: false,
        error: `نوع الفحص "${examType.name}" غير مسعّر — حدد سعراً للفحص أولاً أو اختر فحصاً آخر`,
      });
    }
    let insuranceCompanyName = null;
    if (appointment.insuranceCompanyId) {
      const entity = await prisma.insuranceCompany.findFirst({ where: { id: appointment.insuranceCompanyId, companyId }, select: { name: true } }).catch(() => null);
      insuranceCompanyName = entity ? entity.name : null;
    }
    const study = await prisma.radiologyStudy.create({
      data: {
        companyId,
        studyNumber: generateStudyNumber(),
        patientId: appointment.patientId || null,
        patientName: appointment.patientName,
        patientPhone: appointment.patientPhone,
        patientGender: appointment.patientGender,
        patientAge: appointment.patientAge,
        nationalId: appointment.nationalId || null,
        insuranceNumber: appointment.insuranceNumber || null,
        examTypeId: appointment.examTypeId,
        examTypeName: appointment.examTypeName,
        modality: examType ? (MODALITY_BY_CATEGORY[examType.category] || examType.category || null) : null,
        priceSnapshot,
        billingType: appointment.insuranceCompanyId ? 'INSURANCE' : 'PATIENT',
        insuranceCompanyId: appointment.insuranceCompanyId || null,
        insuranceCompanyName,
        additionIds: appointment.additionIds || null,
        additionAmount: appointment.additionAmount || 0,
        referringPhysicianId: appointment.referringPhysicianId || null,
        referralDoctor: appointment.referralDoctor || null,
        emergency: appointment.emergency === true,
        status: 'PENDING_IMAGING',
        submissionStatus: 'NOT_SUBMITTED',
        createdBy: req.user?.id || req.user?.email || null,
      },
    });

    if (appointment.status !== 'DONE') {
      await prisma.radiologyAppointment.update({ where: { id }, data: { status: 'DONE' } });
    }

    res.json({ success: true, data: { study, appointment } });
  } catch (error) {
    console.error('Error converting radiology appointment to study:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحويل الحجز لدراسة' });
  }
};

module.exports = { listAppointments, createAppointment, updateAppointment, deleteAppointment, convertToStudy };
