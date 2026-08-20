const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { resolveModality } = require('../utils/radiologyModality');
const { findOrCreatePatient } = require('../services/bookingPatientService');
const { deriveRadiologyOrderStatus, recordRadiologyStatusHistory, syncStudyOrderStatus } = require('../utils/radiologyStatusHistory');
const { getRadiologyGuards } = require('../utils/radiologyGuards');
const { nextCompanyNumber } = require('../utils/radiologyNumbering');
const { resolveReferralContext, resolveMarketingRepForStudy } = require('../utils/radiologyReferral');

const APPOINTMENT_STATUSES = ['SCHEDULED', 'CHECKED_IN', 'DONE', 'CANCELLED'];

const APPOINTMENT_STATUS_TRANSITIONS = {
  SCHEDULED: ['CHECKED_IN', 'CANCELLED'],
  CHECKED_IN: ['DONE', 'CANCELLED'],
  DONE: ['CANCELLED'],
  CANCELLED: [],
};

const userDisplayName = (req) => ([req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ') || req.user?.email || null);

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
};

const PAYER_TYPES = ['CUSTOMER', 'INSURANCE', 'REFERRAL', 'PARTNER'];
const PAYMENT_DESTINATIONS = ['ME', 'PARTNER'];

const normalizePayerType = (value, fallback = 'CUSTOMER') => {
  const v = String(value || '').toUpperCase();
  return PAYER_TYPES.includes(v) ? v : fallback;
};

const normalizePaymentDestination = (value, fallback = 'ME') => {
  const v = String(value || '').toUpperCase();
  return PAYMENT_DESTINATIONS.includes(v) ? v : fallback;
};

const normalizePatientFlags = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  let arr = value;
  if (typeof value === 'string') {
    try { arr = JSON.parse(value); } catch { return undefined; }
  }
  if (!Array.isArray(arr)) return undefined;
  const flags = arr
    .map(f => (typeof f === 'string' ? f.trim() : ''))
    .filter(Boolean);
  return flags.length ? JSON.stringify([...new Set(flags)]) : null;
};

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Sum the exam prices for a booking: entity price per exam when insured, else base exam price.
const resolveAppointmentPrice = async (prisma, examTypes, insuranceCompanyId) => {
  if (!examTypes || !examTypes.length) return 0;
  if (!insuranceCompanyId) {
    return examTypes.reduce((s, e) => s + (Number(e.price) || 0), 0);
  }
  const ids = examTypes.map(e => e.id);
  const entityPrices = await prisma.radiologyEntityPrice.findMany({
    where: { insuranceCompanyId: String(insuranceCompanyId), examTypeId: { in: ids }, isActive: true },
    select: { examTypeId: true, price: true },
  }).catch(() => []);
  const priceById = new Map(entityPrices.map(ep => [ep.examTypeId, ep.price]));
  return examTypes.reduce((s, e) => s + (Number(priceById.get(e.id)) || Number(e.price) || 0), 0);
};

const listAppointments = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { patientName, search, status, dateFrom, dateTo, page, limit } = req.query;
    const where = { companyId };
    if (patientName && String(patientName).trim()) {
      where.patientName = { contains: String(patientName).trim(), mode: 'insensitive' };
    }
    if (search && String(search).trim()) {
      const term = String(search).trim();
      const or = [
        { patientName: { contains: term, mode: 'insensitive' } },
        { patientPhone: { contains: term, mode: 'insensitive' } },
        { nationalId: { contains: term, mode: 'insensitive' } },
      ];
      const bookingNo = parseInt(term, 10);
      if (Number.isInteger(bookingNo)) or.push({ bookingNo });
      where.OR = or;
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

    // Resolve the patient record: use the provided patientId (validated), or find-or-create
    // a patient from the booking fields so every appointment links to a Patient row.
    let patientId = body.patientId ? String(body.patientId) : null;
    if (patientId) {
      const linked = await prisma.patient.findFirst({
        where: { id: patientId, companyId },
        select: { id: true },
      }).catch(() => null);
      if (!linked) return res.status(400).json({ success: false, error: 'المريض لا ينتمي لهذه الشركة' });
    } else {
      const resolved = await findOrCreatePatient({
        companyId,
        customerName: patientName,
        customerPhone: body.patientPhone ? String(body.patientPhone) : undefined,
        customerGender: body.patientGender || undefined,
        customerEmail: body.patientEmail || undefined,
        nationalId: body.nationalId ? String(body.nationalId) : undefined,
      });
      patientId = resolved.id;
    }

    let examTypeName = null;
    let priceResolved = 0;
    const examTypeIds = Array.isArray(body.examTypeIds) && body.examTypeIds.length
      ? body.examTypeIds.map(String)
      : (body.examTypeId ? [String(body.examTypeId)] : []);
    let examTypeNames = [];
    if (examTypeIds.length) {
      const examTypes = await prisma.radiologyExamType.findMany({
        where: { id: { in: examTypeIds }, companyId, isActive: true },
        select: { id: true, name: true, price: true },
      });
      examTypeNames = examTypes.map(e => e.name);
      if (examTypes.length) examTypeName = examTypes[0].name;
      priceResolved = await resolveAppointmentPrice(prisma, examTypes, body.insuranceCompanyId);
    }

    let deviceName = null;
    if (body.deviceId) {
      const device = await prisma.radiologyDevice.findFirst({
        where: { id: String(body.deviceId), companyId, isActive: true },
        select: { id: true, name: true },
      });
      if (device) deviceName = device.name;
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

    // جهة الإحالة: تحقق اختياري (company-scoped) — واسمها snapshot
    let referralSourceName = body.referralSourceName ? String(body.referralSourceName) : null;
    if (body.referralSourceId) {
      const source = await prisma.radiologyReferralSource.findFirst({
        where: { id: String(body.referralSourceId), companyId },
        select: { id: true, name: true },
      }).catch(() => null);
      if (source) referralSourceName = source.name;
    }

    // الشريك الخارجي: تحقق اختياري (company-scoped)
    let externalPartnerName = body.externalPartnerName ? String(body.externalPartnerName) : null;
    if (body.externalPartnerId) {
      const partner = await prisma.radiologyExternalPartner.findFirst({
        where: { id: String(body.externalPartnerId), companyId, isActive: true },
        select: { id: true, name: true },
      }).catch(() => null);
      if (partner) externalPartnerName = partner.name;
    }

    // مندوب التسويق: اقتراح تلقائي قابلة للتجاوز (مندوب الطبيب ← مندوب الجهة)
    const resolvedRep = await resolveMarketingRepForStudy(prisma, {
      companyId,
      referringPhysicianId: body.referringPhysicianId || null,
      referralSourceId: body.referralSourceId || null,
      marketingRepId: body.marketingRepId || null,
    });

    // Sequential per-company booking number (starts at 1) for human-friendly IDs
    const bookingNo = await nextCompanyNumber(prisma, 'radiologyAppointment', 'bookingNo', companyId);

    const appointment = await prisma.radiologyAppointment.create({
      data: {
        companyId,
        bookingNo,
        patientId,
        patientName,
        patientPhone: body.patientPhone ? String(body.patientPhone) : null,
        patientGender: body.patientGender || null,
        patientAge: body.patientAge ? String(body.patientAge) : null,
        nationalId: body.nationalId ? String(body.nationalId) : null,
        insuranceNumber: body.insuranceNumber ? String(body.insuranceNumber) : null,
        patientFlags: normalizePatientFlags(body.patientFlags),
        examTypeId: body.examTypeId || examTypeIds[0] || null,
        examTypeName: examTypeName || (body.examTypeName ? String(body.examTypeName) : null),
        examTypeIds: examTypeIds.length ? JSON.stringify(examTypeIds) : null,
        deviceId: body.deviceId || null,
        deviceName,
        insuranceCompanyId: body.insuranceCompanyId || null,
        additionIds,
        additionAmount,
        priceSnapshot: priceResolved,
        referringPhysicianId: body.referringPhysicianId || null,
        referralDoctor: referringPhysicianName,
        referralSourceId: body.referralSourceId || null,
        referralSourceName: referralSourceName || (body.referralSourceName ? String(body.referralSourceName) : null),
        marketingRepId: resolvedRep.marketingRepId,
        marketingRepName: resolvedRep.marketingRepName,
        isExternalReferral: body.isExternalReferral === true || body.isExternalReferral === 'true',
        externalPartnerId: body.externalPartnerId || null,
        externalPartnerName,
        payerType: normalizePayerType(body.payerType, body.insuranceCompanyId ? 'INSURANCE' : 'CUSTOMER'),
        paymentDestination: normalizePaymentDestination(body.paymentDestination),
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
    if (body.patientId !== undefined) {
      if (body.patientId) {
        const linked = await prisma.patient.findFirst({
          where: { id: String(body.patientId), companyId },
          select: { id: true },
        }).catch(() => null);
        if (!linked) return res.status(400).json({ success: false, error: 'المريض لا ينتمي لهذه الشركة' });
        data.patientId = String(body.patientId);
      } else {
        const resolved = await findOrCreatePatient({
          companyId,
          customerName: existing.patientName,
          customerPhone: body.patientPhone ? String(body.patientPhone) : existing.patientPhone,
          customerGender: body.patientGender || existing.patientGender,
          customerEmail: undefined,
          nationalId: body.nationalId ? String(body.nationalId) : existing.nationalId,
        });
        data.patientId = resolved.id;
      }
    } else if (!existing.patientId) {
      // Backfill link for appointments that predate the patient linkage rule
      const resolved = await findOrCreatePatient({
        companyId,
        customerName: existing.patientName,
        customerPhone: existing.patientPhone || (body.patientPhone ? String(body.patientPhone) : undefined),
        customerGender: body.patientGender || existing.patientGender,
        customerEmail: undefined,
        nationalId: existing.nationalId || (body.nationalId ? String(body.nationalId) : undefined),
      });
      data.patientId = resolved.id;
    }
    if (body.patientName !== undefined) {
      if (!String(body.patientName).trim()) return res.status(400).json({ success: false, error: 'اسم المريض مطلوب' });
      data.patientName = String(body.patientName).trim();
    }
    if (body.patientPhone !== undefined) data.patientPhone = normalizeText(body.patientPhone);
    if (body.patientGender !== undefined) data.patientGender = normalizeText(body.patientGender);
    if (body.patientAge !== undefined) data.patientAge = normalizeText(body.patientAge);
    if (body.nationalId !== undefined) data.nationalId = normalizeText(body.nationalId);
    if (body.insuranceNumber !== undefined) data.insuranceNumber = normalizeText(body.insuranceNumber);
    if (body.patientFlags !== undefined) {
      const flags = normalizePatientFlags(body.patientFlags);
      if (flags !== undefined) data.patientFlags = flags;
    }
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
    if (body.examTypeIds !== undefined) {
      const ids = Array.isArray(body.examTypeIds) ? body.examTypeIds.map(String).filter(Boolean) : [];
      if (ids.length) {
        const examTypes = await prisma.radiologyExamType.findMany({
          where: { id: { in: ids }, companyId, isActive: true },
          select: { id: true, name: true, price: true },
        });
        data.examTypeIds = JSON.stringify(examTypes.map(e => e.id));
        data.examTypeId = examTypes.length ? examTypes[0].id : null;
        data.examTypeName = examTypes.length ? examTypes[0].name : null;
        const effectiveInsurance = body.insuranceCompanyId !== undefined ? body.insuranceCompanyId : existing.insuranceCompanyId;
        data.priceSnapshot = await resolveAppointmentPrice(prisma, examTypes, effectiveInsurance);
      } else {
        data.examTypeIds = null;
        data.examTypeId = null;
        data.examTypeName = null;
        data.priceSnapshot = 0;
      }
    } else if (body.insuranceCompanyId !== undefined) {
      // Payer/entity changed without touching exams → recompute against existing exams
      const ids = (() => {
        try {
          const parsed = existing.examTypeIds ? JSON.parse(existing.examTypeIds) : [];
          return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch { return []; }
      })();
      if (ids.length) {
        const examTypes = await prisma.radiologyExamType.findMany({
          where: { id: { in: ids }, companyId, isActive: true },
          select: { id: true, name: true, price: true },
        });
        data.priceSnapshot = await resolveAppointmentPrice(prisma, examTypes, body.insuranceCompanyId || null);
      }
    }
    if (body.deviceId !== undefined) {
      data.deviceId = body.deviceId ? String(body.deviceId) : null;
      if (body.deviceId) {
        const device = await prisma.radiologyDevice.findFirst({
          where: { id: String(body.deviceId), companyId, isActive: true },
          select: { id: true, name: true },
        });
        data.deviceName = device ? device.name : null;
      } else {
        data.deviceName = null;
      }
    }
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
    if (body.referralSourceId !== undefined) {
      data.referralSourceId = body.referralSourceId || null;
      if (body.referralSourceId) {
        const source = await prisma.radiologyReferralSource.findFirst({
          where: { id: String(body.referralSourceId), companyId },
          select: { id: true, name: true },
        }).catch(() => null);
        data.referralSourceName = source ? source.name : (data.referralSourceName || null);
      } else {
        data.referralSourceName = null;
      }
    }
    if (body.referralSourceName !== undefined) data.referralSourceName = normalizeText(body.referralSourceName);
    if (body.externalPartnerId !== undefined) {
      data.externalPartnerId = body.externalPartnerId || null;
      if (body.externalPartnerId) {
        const partner = await prisma.radiologyExternalPartner.findFirst({
          where: { id: String(body.externalPartnerId), companyId, isActive: true },
          select: { id: true, name: true },
        }).catch(() => null);
        data.externalPartnerName = partner ? partner.name : (data.externalPartnerName || null);
      } else {
        data.externalPartnerName = null;
      }
    }
    if (body.externalPartnerName !== undefined) data.externalPartnerName = normalizeText(body.externalPartnerName);
    if (body.isExternalReferral !== undefined) data.isExternalReferral = body.isExternalReferral === true || body.isExternalReferral === 'true';
    if (body.payerType !== undefined) data.payerType = normalizePayerType(body.payerType);
    if (body.paymentDestination !== undefined) data.paymentDestination = normalizePaymentDestination(body.paymentDestination);
    if (body.payerType !== undefined && !['INSURANCE'].includes(data.payerType)) data.insuranceCompanyId = null;
    if (body.payerType !== undefined && !['REFERRAL'].includes(data.payerType)) {
      data.referralSourceId = null;
      data.referralSourceName = null;
    }
    if (body.payerType !== undefined && !['PARTNER'].includes(data.payerType)) {
      data.isExternalReferral = false;
      data.externalPartnerId = null;
      data.externalPartnerName = null;
    }
    if (body.marketingRepId !== undefined) {
      // اقتراح تلقائي إذا أُرسل "auto"، أو null لمسح، أو id صريح
      if (body.marketingRepId === 'auto') {
        const resolved = await resolveMarketingRepForStudy(prisma, {
          companyId,
          referringPhysicianId: data.referringPhysicianId ?? existing.referringPhysicianId,
          referralSourceId: data.referralSourceId ?? existing.referralSourceId,
          marketingRepId: null,
        });
        data.marketingRepId = resolved.marketingRepId;
        data.marketingRepName = resolved.marketingRepName;
      } else if (body.marketingRepId) {
        const rep = await prisma.radiologyMarketingRep.findFirst({
          where: { id: String(body.marketingRepId), companyId, isActive: true },
          select: { id: true, name: true },
        }).catch(() => null);
        if (rep) {
          data.marketingRepId = rep.id;
          data.marketingRepName = rep.name;
        }
      } else {
        data.marketingRepId = null;
        data.marketingRepName = null;
      }
    } else if (body.referringPhysicianId !== undefined || body.referralSourceId !== undefined) {
      // غيّر الطبيب/الجهة بدون مندوب صريح → إعادة اقتراح تلقائي
      const resolved = await resolveMarketingRepForStudy(prisma, {
        companyId,
        referringPhysicianId: data.referringPhysicianId ?? existing.referringPhysicianId,
        referralSourceId: data.referralSourceId ?? existing.referralSourceId,
        marketingRepId: null,
      });
      data.marketingRepId = resolved.marketingRepId;
      data.marketingRepName = resolved.marketingRepName;
    }
    if (body.emergency !== undefined) data.emergency = body.emergency === true || body.emergency === 'true';
    if (body.appointmentDate !== undefined) data.appointmentDate = parseDate(body.appointmentDate);
    if (body.appointmentTime !== undefined) data.appointmentTime = normalizeText(body.appointmentTime);
    if (body.branchId !== undefined) data.branchId = normalizeText(body.branchId);
    if (body.notes !== undefined) data.notes = normalizeText(body.notes);
    if (body.status !== undefined) {
      const s = String(body.status).toUpperCase();
      if (!APPOINTMENT_STATUSES.includes(s)) return res.status(400).json({ success: false, error: 'حالة الحجز غير صحيحة' });
      const currentStatus = String(existing.status || '').toUpperCase();
      if (s !== currentStatus) {
        const allowed = APPOINTMENT_STATUS_TRANSITIONS[currentStatus] || [];
        if (!allowed.includes(s)) {
          return res.status(400).json({ success: false, error: 'انتقال حالة غير مسموح به' });
        }
      }
      if (s === 'CANCELLED' && existing.studyId) {
        const linkedStudy = await prisma.radiologyStudy.findUnique({ where: { id: existing.studyId } }).catch(() => null);
        if (linkedStudy && linkedStudy.status === 'DELIVERED') {
          const guards = await getRadiologyGuards(prisma, companyId);
          if (guards.blockCancelAfterDelivery) {
            return res.status(400).json({ success: false, error: 'لا يمكن إلغاء الحجز بعد تسليم الحالة' });
          }
        }
      }
      data.status = s;
    }

    const appointment = await prisma.radiologyAppointment.update({ where: { id }, data });
    if (existing.studyId) {
      const linkedStudy = await prisma.radiologyStudy.findUnique({ where: { id: existing.studyId } }).catch(() => null);
      if (linkedStudy) {
        await syncStudyOrderStatus(prisma, { ...linkedStudy, status: linkedStudy.status }, {
          changedBy: req.user?.id || req.user?.email || null,
          userName: userDisplayName(req),
          appointment: { status: data.status || existing.status },
        });
      }
    }
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
    if (existing.studyId) return res.status(400).json({ success: false, error: 'لا يمكن حذف حجز مرتبط بدراسة' });

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

    const { generateStudyNumber, deriveAccession } = require('../utils/orderNumbering');
    // Multi-exam: resolve the exam list from examTypeIds (fallback to the legacy single examTypeId)
    const examIds = (() => {
      try {
        const parsed = appointment.examTypeIds ? JSON.parse(appointment.examTypeIds) : [];
        return Array.isArray(parsed) && parsed.length ? parsed.map(String) : [];
      } catch { return []; }
    })();
    if (!examIds.length && appointment.examTypeId) examIds.push(String(appointment.examTypeId));
    if (!examIds.length) return res.status(400).json({ success: false, error: 'الحجز بلا فحوصات' });

    const examTypes = await prisma.radiologyExamType.findMany({
      where: { id: { in: examIds }, companyId, isActive: true },
      include: { examCategory: true },
    });
    if (!examTypes.length) return res.status(400).json({ success: false, error: 'لا توجد فحوصات صالحة في الحجز' });
    const examById = new Map(examTypes.map(e => [e.id, e]));

    let insuranceCompanyName = null;
    if (appointment.insuranceCompanyId) {
      const entity = await prisma.insuranceCompany.findFirst({ where: { id: appointment.insuranceCompanyId, companyId }, select: { name: true } }).catch(() => null);
      insuranceCompanyName = entity ? entity.name : null;
    }
    // Backfill the patient link for appointments created before linkage was enforced
    let patientId = appointment.patientId || null;
    if (!patientId) {
      const resolved = await findOrCreatePatient({
        companyId,
        customerName: appointment.patientName,
        customerPhone: appointment.patientPhone || undefined,
        customerGender: appointment.patientGender || undefined,
        customerEmail: undefined,
        nationalId: appointment.nationalId || undefined,
      });
      patientId = resolved.id;
    }

    // Backfill the marketing rep for older appointments (auto-suggest from physician/source)
    let marketingRepId = appointment.marketingRepId || null;
    let marketingRepName = appointment.marketingRepName || null;
    if (!marketingRepId && (appointment.referringPhysicianId || appointment.referralSourceId)) {
      const resolved = await resolveMarketingRepForStudy(prisma, {
        companyId,
        referringPhysicianId: appointment.referringPhysicianId || null,
        referralSourceId: appointment.referralSourceId || null,
        marketingRepId: null,
      });
      marketingRepId = resolved.marketingRepId;
      marketingRepName = resolved.marketingRepName;
      if (marketingRepId) {
        await prisma.radiologyAppointment.update({
          where: { id },
          data: { marketingRepId, marketingRepName },
        }).catch(() => null);
      }
    }

    const baseStudyData = {
      companyId,
      patientId,
      patientName: appointment.patientName,
      patientPhone: appointment.patientPhone,
      patientGender: appointment.patientGender,
      patientAge: appointment.patientAge,
      nationalId: appointment.nationalId || null,
      insuranceNumber: appointment.insuranceNumber || null,
      patientFlags: appointment.patientFlags || null,
      billingType: appointment.insuranceCompanyId ? 'INSURANCE' : 'PATIENT',
      insuranceCompanyId: appointment.insuranceCompanyId || null,
      insuranceCompanyName,
      deviceId: appointment.deviceId || null,
      deviceName: appointment.deviceName || null,
      additionIds: appointment.additionIds || null,
      additionAmount: appointment.additionAmount || 0,
      referringPhysicianId: appointment.referringPhysicianId || null,
      referralDoctor: appointment.referralDoctor || null,
      referralSourceId: appointment.referralSourceId || null,
      referralSourceName: appointment.referralSourceName || null,
      marketingRepId: marketingRepId,
      marketingRepName: marketingRepName,
      isExternalReferral: appointment.isExternalReferral === true,
      externalPartnerId: appointment.externalPartnerId || null,
      externalPartnerName: appointment.externalPartnerName || null,
      payerType: appointment.payerType || (appointment.insuranceCompanyId ? 'INSURANCE' : 'CUSTOMER'),
      paymentDestination: appointment.paymentDestination || 'ME',
      emergency: appointment.emergency === true,
      status: 'PENDING_IMAGING',
      submissionStatus: 'NOT_SUBMITTED',
      createdBy: req.user?.id || req.user?.email || null,
    };

    const studies = [];
    for (const [index, id] of examIds.entries()) {
      const examType = examById.get(id);
      if (!examType) continue;
      // Resolve price: entity price > exam base
      let priceSnapshot = Number(examType.price) || 0;
      if (appointment.insuranceCompanyId) {
        const entityPrice = await prisma.radiologyEntityPrice.findFirst({
          where: { insuranceCompanyId: appointment.insuranceCompanyId, examTypeId: id, isActive: true },
          select: { price: true },
        }).catch(() => null);
        if (entityPrice && Number.isFinite(entityPrice.price)) priceSnapshot = entityPrice.price;
      }
      if (priceSnapshot <= 0) {
        return res.status(400).json({
          success: false,
          error: `نوع الفحص "${examType.name}" غير مسعّر — حدد سعراً للفحص أولاً أو اختر فحصاً آخر`,
        });
      }
      const studyNumber = generateStudyNumber({
        bookingNo: appointment.bookingNo,
        examIndex: index,
        date: appointment.appointmentDate,
      });
      const study = await prisma.radiologyStudy.create({
        data: {
          ...baseStudyData,
          studyNumber,
          accessionNumber: deriveAccession(studyNumber),
          examTypeId: examType.id,
          examTypeName: examType.name,
          modality: resolveModality(examType.examCategory || examType.category),
          priceSnapshot,
          appointmentId: appointment.id,
          orderStatus: 'IN_PROGRESS',
        },
      });
      studies.push(study);
      await recordRadiologyStatusHistory(prisma, {
        companyId,
        studyId: study.id,
        dimension: 'PREP',
        status: 'PENDING_IMAGING',
        oldStatus: null,
        changedBy: req.user?.id || req.user?.email || null,
        userName: userDisplayName(req),
      });
      await recordRadiologyStatusHistory(prisma, {
        companyId,
        studyId: study.id,
        dimension: 'ORDER',
        oldStatus: 'PENDING',
        status: 'IN_PROGRESS',
        changedBy: req.user?.id || req.user?.email || null,
        userName: userDisplayName(req),
      });
    }

    if (!studies.length) return res.status(400).json({ success: false, error: 'لم تُنشأ أي حالة' });

    if (appointment.status !== 'DONE') {
      const patch = { status: 'DONE' };
      if (!appointment.studyId && studies[0]?.id) patch.studyId = studies[0].id;
      await prisma.radiologyAppointment.update({ where: { id }, data: patch });
    } else if (!appointment.studyId && studies[0]?.id) {
      await prisma.radiologyAppointment.update({ where: { id }, data: { studyId: studies[0].id } });
    }

    res.json({ success: true, data: { studies, study: studies[0], appointment } });
  } catch (error) {
    console.error('Error converting radiology appointment to study:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحويل الحجز لحالة' });
  }
};

const getAppointmentDetails = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const appointment = await prisma.radiologyAppointment.findFirst({ where: { id, companyId } });
    if (!appointment) return res.status(404).json({ success: false, error: 'الحجز غير موجود' });

    const studies = await prisma.radiologyStudy.findMany({ where: { appointmentId: id }, orderBy: { createdAt: 'asc' } });
    const orderStatus = deriveRadiologyOrderStatus({ appointment, study: studies[0] || null });

    res.json({ success: true, data: { appointment, studies, orderStatus } });
  } catch (error) {
    console.error('Error fetching radiology appointment details:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تفاصيل الحجز' });
  }
};

module.exports = { listAppointments, createAppointment, updateAppointment, deleteAppointment, convertToStudy, getAppointmentDetails };
