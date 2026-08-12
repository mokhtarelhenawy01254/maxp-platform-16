const crypto = require('crypto');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getStartOfDayInTimezone, getEndOfDayInTimezone } = require('../utils/dateUtils');
const { parseDicomFromBuffer, generateStudyNumber } = require('../utils/dicomUtil');

const RADIOLOGY_STUDY_CHAIN = ['PENDING_IMAGING', 'IMAGED', 'PENDING_REPORT', 'REPORTED', 'DELIVERED'];
const RADIOLOGY_REPORT_CHAIN = ['DRAFT', 'REVIEWED', 'SIGNED', 'DELIVERED'];
const SUBMISSION_STATUSES = ['NOT_SUBMITTED', 'SUBMITTED', 'REPORT_READY'];

const STUDY_STATUSES = new Set(RADIOLOGY_STUDY_CHAIN);
const REPORT_STATUSES = new Set(RADIOLOGY_REPORT_CHAIN);

const MODALITY_BY_CATEGORY = {
  CT: 'CT',
  MRI: 'MR',
  'X-Ray': 'CR',
  US: 'US',
  DEXA: 'DXA',
  NM: 'NM',
  PET: 'PT',
  Fluoroscopy: 'FLUOROSCOPY',
};

const normalizePrice = (value) => {
  if (value === undefined || value === null || value === '') return { value: undefined, error: null };
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return { value: null, error: 'السعر غير صحيح' };
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

const parseDate = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseSliceIndex = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
};

const nextStatus = (chain, from) => {
  const index = chain.indexOf(from);
  if (index === -1 || index === chain.length - 1) return null;
  return chain[index + 1];
};

const validateTransition = (chain, from, to, message) => {
  if (!chain.includes(from) || !chain.includes(to)) {
    return { valid: false, error: 'الحالة المطلوبة غير صحيحة' };
  }
  if (from === to) return { valid: false, error: `لا يمكن الانتقال إلى نفس الحالة "${from}"` };
  if (nextStatus(chain, from) !== to) return { valid: false, error: message(from, to) };
  return { valid: true };
};

const validateRadiologyStudyTransition = (from, to) =>
  validateTransition(RADIOLOGY_STUDY_CHAIN, from, to, (f, t) =>
    `لا يمكن الانتقال في حالة الدراسة من "${f}" إلى "${t}"`);

const validateRadiologyReportTransition = (from, to) =>
  validateTransition(RADIOLOGY_REPORT_CHAIN, from, to, (f, t) =>
    `لا يمكن الانتقال في حالة التقرير من "${f}" إلى "${t}"`);

const resolveModality = (category) => {
  if (!category) return null;
  return MODALITY_BY_CATEGORY[category] || category || null;
};

const signerName = (req) => {
  const name = [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ');
  return name || req.user?.email || null;
};

const formatImage = (image) => {
  if (!image) return image;
  const { data, ...rest } = image;
  return rest;
};

// ==================== EXAM TYPES ====================

const listExamTypes = async (req, res) => {
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
    const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const prisma = getSharedPrismaClient();
    const [examTypes, total] = await Promise.all([
      prisma.radiologyExamType.findMany({ where, orderBy: { name: 'asc' }, skip, take: limitNum }),
      prisma.radiologyExamType.count({ where }),
    ]);

    res.json({ success: true, data: examTypes, total, page: pageNum, limit: limitNum });
  } catch (error) {
    console.error('Error fetching radiology exam types:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب أنواع الفحوصات' });
  }
};

const createExamType = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { name, category, abbreviation, price } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: 'اسم نوع الفحص مطلوب' });

    const priceCheck = normalizePrice(price);
    if (priceCheck.error) return res.status(400).json({ success: false, error: priceCheck.error });

    const examType = await getSharedPrismaClient().radiologyExamType.create({
      data: {
        companyId,
        name: String(name).trim(),
        category: normalizeText(category),
        abbreviation: normalizeText(abbreviation),
        price: priceCheck.value ?? 0,
      },
    });

    res.json({ success: true, data: examType });
  } catch (error) {
    console.error('Error creating radiology exam type:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء نوع الفحص' });
  }
};

const updateExamType = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyExamType.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'نوع الفحص غير موجود' });

    const data = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return res.status(400).json({ success: false, error: 'اسم نوع الفحص مطلوب' });
      data.name = String(body.name).trim();
    }
    if (body.category !== undefined) data.category = normalizeText(body.category);
    if (body.abbreviation !== undefined) data.abbreviation = normalizeText(body.abbreviation);
    if (body.price !== undefined) {
      const priceCheck = normalizePrice(body.price);
      if (priceCheck.error) return res.status(400).json({ success: false, error: priceCheck.error });
      data.price = priceCheck.value;
    }
    if (body.isActive !== undefined) data.isActive = normalizeBool(body.isActive, true);

    const examType = await prisma.radiologyExamType.update({ where: { id }, data });
    res.json({ success: true, data: examType });
  } catch (error) {
    console.error('Error updating radiology exam type:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث نوع الفحص' });
  }
};

const deleteExamType = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyExamType.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'نوع الفحص غير موجود' });

    const examType = await prisma.radiologyExamType.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'تم حذف نوع الفحص', data: examType });
  } catch (error) {
    console.error('Error deleting radiology exam type:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف نوع الفحص' });
  }
};

// ==================== STUDIES ====================

const listStudies = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { patientName, nationalId, insuranceNumber, status, dateFrom, dateTo, page, limit } = req.query;
    const where = { companyId };

    if (patientName && String(patientName).trim()) {
      where.patientName = { contains: String(patientName).trim(), mode: 'insensitive' };
    }
    if (nationalId && String(nationalId).trim()) {
      where.nationalId = { contains: String(nationalId).trim(), mode: 'insensitive' };
    }
    if (insuranceNumber && String(insuranceNumber).trim()) {
      where.insuranceNumber = { contains: String(insuranceNumber).trim(), mode: 'insensitive' };
    }
    if (status) {
      const s = String(status).toUpperCase();
      if (!STUDY_STATUSES.has(s)) return res.status(400).json({ success: false, error: 'حالة الدراسة غير صحيحة' });
      where.status = s;
    }
    if (dateFrom || dateTo) {
      const createdAtFilter = {};
      if (dateFrom) createdAtFilter.gte = getStartOfDayInTimezone(new Date(dateFrom));
      if (dateTo) createdAtFilter.lte = getEndOfDayInTimezone(new Date(dateTo));
      where.createdAt = createdAtFilter;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const prisma = getSharedPrismaClient();
    const [studies, total] = await Promise.all([
      prisma.radiologyStudy.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limitNum, include: { report: true } }),
      prisma.radiologyStudy.count({ where }),
    ]);

    res.json({ success: true, data: { items: studies, total, page: pageNum, limit: limitNum } });
  } catch (error) {
    console.error('Error fetching radiology studies:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب دراسات الأشعة' });
  }
};

const getStudy = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId } });
    if (!study) return res.status(404).json({ success: false, error: 'الدراسة غير موجودة' });

    const [images, report] = await Promise.all([
      prisma.radiologyStudyImage.findMany({ where: { studyId: id }, orderBy: { createdAt: 'asc' } }),
      prisma.radiologyReport.findUnique({ where: { studyId: id } }),
    ]);

    res.json({ success: true, data: { ...study, images: images.map(formatImage), report } });
  } catch (error) {
    console.error('Error fetching radiology study:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب دراسة الأشعة' });
  }
};

const createStudy = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const body = req.body || {};
    const patientName = typeof body.patientName === 'string' ? body.patientName.trim() : '';
    if (!patientName) return res.status(400).json({ success: false, error: 'اسم المريض مطلوب' });

    const prisma = getSharedPrismaClient();

    let examType = null;
    if (body.examTypeId) {
      examType = await prisma.radiologyExamType.findFirst({
        where: { id: body.examTypeId, companyId, isActive: true },
      });
      if (!examType) return res.status(400).json({ success: false, error: 'نوع الفحص لا ينتمي لهذه الشركة' });
    }

    let physicianName = null;
    if (body.referringPhysicianId) {
      const physician = await prisma.radiologyReferringPhysician.findFirst({
        where: { id: body.referringPhysicianId, companyId, isActive: true },
      });
      if (physician) physicianName = physician.name;
    }

    let insuranceCompanyName = null;
    if (body.insuranceCompanyId) {
      const entity = await prisma.insuranceCompany.findFirst({
        where: { id: body.insuranceCompanyId, companyId },
        select: { id: true, name: true },
      });
      if (!entity) return res.status(400).json({ success: false, error: 'شركة التأمين غير موجودة' });
      insuranceCompanyName = entity.name;
    }

    let additionAmount = Number.isFinite(Number(body.additionAmount)) ? Math.max(0, Number(body.additionAmount)) : 0;
    let additionIds = null;
    if (Array.isArray(body.additionIds) && body.additionIds.length) {
      const additions = await prisma.radiologyExamAddition.findMany({
        where: { id: { in: body.additionIds }, companyId, isActive: true },
      });
      if (additions.length) {
        additionIds = additions.map(a => a.id);
        additionAmount = additions.reduce((s, a) => s + a.price, 0);
      }
    }

    // Resolve price: entity price > exam price
    let priceSnapshot = examType ? examType.price : 0;
    if (body.insuranceCompanyId && examType && insuranceCompanyName) {
      const entityPrice = await prisma.radiologyEntityPrice.findFirst({
        where: { insuranceCompanyId: body.insuranceCompanyId, examTypeId: examType.id, isActive: true },
        select: { price: true },
      }).catch(() => null);
      if (entityPrice && Number.isFinite(entityPrice.price)) priceSnapshot = entityPrice.price;
    }

    // Guard: never allow creating an unpriced (free) study by accident
    if (examType) {
      const resolvedTotal = (Number.isFinite(priceSnapshot) ? priceSnapshot : 0) + additionAmount;
      if (resolvedTotal <= 0) {
        return res.status(400).json({
          success: false,
          error: `نوع الفحص "${examType.name}" غير مسعّر — حدد سعراً للفحص أولاً أو اختر فحصاً آخر`,
        });
      }
    }

    const clientProvidedNumber =
      typeof body.studyNumber === 'string' && body.studyNumber.trim() ? body.studyNumber.trim() : null;
    let studyNumber = clientProvidedNumber || generateStudyNumber();

    let study;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        study = await prisma.radiologyStudy.create({
          data: {
            companyId,
            studyNumber,
            patientId: body.patientId || null,
            patientName,
            patientPhone: body.patientPhone ? String(body.patientPhone) : null,
            patientGender: body.patientGender || null,
            patientAge: body.patientAge ? String(body.patientAge) : null,
            nationalId: body.nationalId ? String(body.nationalId) : null,
            insuranceNumber: body.insuranceNumber ? String(body.insuranceNumber) : null,
            examTypeId: examType ? examType.id : null,
            examTypeName: examType ? examType.name : null,
            modality: examType ? resolveModality(examType.category) : null,
            priceSnapshot: examType ? examType.price : 0,
            billingType: body.insuranceCompanyId ? 'INSURANCE' : 'PATIENT',
            status: 'PENDING_IMAGING',
            emergency: body.emergency === true || body.emergency === 'true',
            withContrast: body.withContrast === true || body.withContrast === 'true',
            referralDoctor: physicianName || (body.referralDoctor ? String(body.referralDoctor) : null),
            referringPhysicianId: body.referringPhysicianId || null,
            insuranceCompanyId: body.insuranceCompanyId || null,
            insuranceCompanyName,
            additionIds: additionIds ? JSON.stringify(additionIds) : null,
            additionAmount,
            priceSnapshot,
            accessionNumber: body.accessionNumber ? String(body.accessionNumber) : null,
            submissionStatus: 'NOT_SUBMITTED',
            createdBy: req.user?.id || req.user?.email || null,
          },
        });
        break;
      } catch (error) {
        if (error?.code === 'P2002' && !clientProvidedNumber && attempt < 3) {
          studyNumber = generateStudyNumber();
          continue;
        }
        if (error?.code === 'P2002' && clientProvidedNumber) {
          return res.status(409).json({ success: false, error: 'رقم الدراسة مستخدم من قبل' });
        }
        throw error;
      }
    }

    res.json({ success: true, data: study });
  } catch (error) {
    console.error('Error creating radiology study:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء دراسة الأشعة' });
  }
};

const duplicateStudy = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyStudy.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الدراسة غير موجودة' });

    let study;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        study = await prisma.radiologyStudy.create({
          data: {
            companyId,
            studyNumber: generateStudyNumber(),
            patientId: existing.patientId,
            patientName: existing.patientName,
            patientPhone: existing.patientPhone,
            patientGender: existing.patientGender,
            patientAge: existing.patientAge,
            nationalId: existing.nationalId,
            insuranceNumber: existing.insuranceNumber,
            examTypeId: existing.examTypeId,
            examTypeName: existing.examTypeName,
            modality: existing.modality,
            priceSnapshot: existing.priceSnapshot,
            billingType: existing.billingType || 'PATIENT',
            status: 'PENDING_IMAGING',
            emergency: existing.emergency,
            withContrast: existing.withContrast,
            referralDoctor: existing.referralDoctor,
            referringPhysicianId: existing.referringPhysicianId,
            insuranceCompanyId: existing.insuranceCompanyId,
            insuranceCompanyName: existing.insuranceCompanyName,
            additionIds: existing.additionIds,
            additionAmount: existing.additionAmount,
            notes: existing.notes ? `تكرار دراسة ${existing.studyNumber || ''}: ${existing.notes}` : null,
            submissionStatus: 'NOT_SUBMITTED',
            createdBy: req.user?.id || req.user?.email || null,
          },
        });
        break;
      } catch (error) {
        if (error?.code === 'P2002' && attempt < 3) {
          continue;
        }
        throw error;
      }
    }

    res.json({ success: true, data: study });
  } catch (error) {
    console.error('Error duplicating radiology study:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تكرار الدراسة' });
  }
};

const updateStudy = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyStudy.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الدراسة غير موجودة' });

    const data = {};

    if (body.patientName !== undefined) {
      const name = typeof body.patientName === 'string' ? body.patientName.trim() : '';
      if (!name) return res.status(400).json({ success: false, error: 'اسم المريض مطلوب' });
      data.patientName = name;
    }
    if (body.patientPhone !== undefined) data.patientPhone = body.patientPhone ? String(body.patientPhone) : null;
    if (body.patientGender !== undefined) data.patientGender = body.patientGender ? String(body.patientGender) : null;
    if (body.patientAge !== undefined) data.patientAge = body.patientAge ? String(body.patientAge) : null;
    if (body.nationalId !== undefined) data.nationalId = body.nationalId ? String(body.nationalId) : null;
    if (body.insuranceNumber !== undefined) data.insuranceNumber = body.insuranceNumber ? String(body.insuranceNumber) : null;
    if (body.patientId !== undefined) data.patientId = body.patientId || null;
    if (body.emergency !== undefined) data.emergency = normalizeBool(body.emergency, existing.emergency);
    if (body.withContrast !== undefined) data.withContrast = normalizeBool(body.withContrast, existing.withContrast);
    if (body.referralDoctor !== undefined) data.referralDoctor = body.referralDoctor ? String(body.referralDoctor) : null;
    if (body.referringPhysicianId !== undefined) {
      const pid = body.referringPhysicianId || null;
      if (pid) {
        const physician = await prisma.radiologyReferringPhysician.findFirst({ where: { id: pid, companyId } });
        if (!physician) return res.status(400).json({ success: false, error: 'الطبيب المحوّل غير موجود' });
        data.referringPhysicianId = physician.id;
        if (!body.referralDoctor) data.referralDoctor = physician.name;
      } else {
        data.referringPhysicianId = null;
      }
    }
    if (body.additionAmount !== undefined) {
      data.additionAmount = Number.isFinite(Number(body.additionAmount)) ? Math.max(0, Number(body.additionAmount)) : 0;
    }
    if (body.additionIds !== undefined) {
      if (Array.isArray(body.additionIds) && body.additionIds.length) {
        const additions = await prisma.radiologyExamAddition.findMany({
          where: { id: { in: body.additionIds }, companyId, isActive: true },
        });
        data.additionIds = JSON.stringify(additions.map(a => a.id));
        data.additionAmount = additions.reduce((s, a) => s + a.price, 0);
      } else {
        data.additionIds = null;
      }
    }
    if (body.notes !== undefined) data.notes = body.notes ? String(body.notes) : null;
    if (body.accessionNumber !== undefined) data.accessionNumber = body.accessionNumber ? String(body.accessionNumber) : null;

    if (body.examTypeId !== undefined) {
      const examTypeId = body.examTypeId || null;
      if (examTypeId) {
        const examType = await prisma.radiologyExamType.findFirst({ where: { id: examTypeId, companyId } });
        if (!examType) return res.status(400).json({ success: false, error: 'نوع الفحص لا ينتمي لهذه الشركة' });
        data.examTypeId = examType.id;
        data.examTypeName = examType.name;
        data.modality = resolveModality(examType.category);
      } else {
        data.examTypeId = null;
        data.examTypeName = null;
        data.modality = null;
      }
    }

    if (body.status !== undefined) {
      const status = String(body.status).toUpperCase();
      if (!STUDY_STATUSES.has(status)) return res.status(400).json({ success: false, error: 'حالة الدراسة غير صحيحة' });
      if (status !== existing.status) {
        const transition = validateRadiologyStudyTransition(existing.status, status);
        if (!transition.valid) return res.status(400).json({ success: false, error: transition.error });
      }
      data.status = status;
    }

    if (body.submissionStatus !== undefined) {
      const submissionStatus = String(body.submissionStatus).toUpperCase();
      if (!SUBMISSION_STATUSES.includes(submissionStatus)) {
        return res.status(400).json({ success: false, error: 'حالة الإرسال غير صحيحة' });
      }
      data.submissionStatus = submissionStatus;
    }
    if (body.rologyStudyLink !== undefined) data.rologyStudyLink = body.rologyStudyLink ? String(body.rologyStudyLink) : null;
    if (body.rologyReportLink !== undefined) data.rologyReportLink = body.rologyReportLink ? String(body.rologyReportLink) : null;
    if (body.rologyRadiologist !== undefined) data.rologyRadiologist = body.rologyRadiologist ? String(body.rologyRadiologist) : null;
    if (body.reportReceivedAt !== undefined) data.reportReceivedAt = parseDate(body.reportReceivedAt);

    const study = await prisma.radiologyStudy.update({ where: { id }, data });
    res.json({ success: true, data: study });
  } catch (error) {
    console.error('Error updating radiology study:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث دراسة الأشعة' });
  }
};

// ==================== IMAGES ====================

const uploadStudyImages = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const files = req.files;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, error: 'يجب رفع ملف DICOM واحد على الأقل' });
    }

    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId } });
    if (!study) return res.status(404).json({ success: false, error: 'الدراسة غير موجودة' });

    const sliceIndexBase = parseSliceIndex(req.body?.sliceIndex);
    const seriesDescription =
      typeof req.body?.seriesDescription === 'string' && req.body.seriesDescription.trim()
        ? req.body.seriesDescription.trim()
        : null;

    const created = [];
    let merged = {};

    for (const file of files) {
      const buffer = file.buffer || Buffer.alloc(0);
      const meta = parseDicomFromBuffer(buffer);
      if (Object.keys(meta).length && !Object.keys(merged).length) merged = meta;

      const storedName = `${crypto.randomUUID()}.dcm`;
      const row = await prisma.radiologyStudyImage.create({
        data: {
          studyId: id,
          fileName: file.originalname || 'image.dcm',
          storedName,
          fileSize: Number.isFinite(file.size) ? file.size : buffer.length,
          mimeType: file.mimetype || 'application/dicom',
          seriesDescription: meta.seriesDescription || seriesDescription,
          sliceIndex: meta.sliceIndex !== undefined ? meta.sliceIndex : (files.length === 1 ? sliceIndexBase : null),
          metadataJson: Object.keys(meta).length ? JSON.stringify(meta) : null,
          data: buffer,
        },
      });
      created.push(row);
    }

    const studyUpdate = {};
    if (merged.patientName && !study.patientName) studyUpdate.patientName = merged.patientName;
    if (merged.patientGender && !study.patientGender) studyUpdate.patientGender = merged.patientGender;
    if (merged.patientAge && !study.patientAge) studyUpdate.patientAge = merged.patientAge;
    if (merged.modality && !study.modality) studyUpdate.modality = merged.modality;
    if (study.status === 'PENDING_IMAGING') studyUpdate.status = 'IMAGED';

    let updatedStudy = study;
    if (Object.keys(studyUpdate).length) {
      updatedStudy = await prisma.radiologyStudy.update({ where: { id }, data: studyUpdate });
    }

    res.json({ success: true, data: { images: created.map(formatImage), study: updatedStudy } });
  } catch (error) {
    console.error('Error uploading radiology study images:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في رفع صور الدراسة' });
  }
};

const getStudyImageFile = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id, imageId } = req.params;
    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!study) return res.status(404).json({ success: false, error: 'الدراسة غير موجودة' });

    const image = await prisma.radiologyStudyImage.findFirst({ where: { id: imageId, studyId: id } });
    if (!image || !image.data) return res.status(404).json({ success: false, error: 'الصورة غير موجودة' });

    const raw = image.data;
    const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw.buffer ?? raw, raw.byteOffset ?? 0, raw.byteLength ?? raw.length);

    res.setHeader('Content-Type', 'application/dicom');
    res.setHeader('Content-Length', buf.length);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${(image.fileName || image.storedName || 'image.dcm').replace(/"/g, '')}"`
    );
    res.send(buf);
  } catch (error) {
    console.error('Error fetching radiology study image file:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب صورة الدراسة' });
  }
};

const deleteStudyImage = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id, imageId } = req.params;
    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!study) return res.status(404).json({ success: false, error: 'الدراسة غير موجودة' });

    const image = await prisma.radiologyStudyImage.findFirst({ where: { id: imageId, studyId: id } });
    if (!image) return res.status(404).json({ success: false, error: 'الصورة غير موجودة' });

    await prisma.radiologyStudyImage.delete({ where: { id: imageId } });
    res.json({ success: true, data: { id: imageId } });
  } catch (error) {
    console.error('Error deleting radiology study image:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف صورة الدراسة' });
  }
};

// ==================== REPORT ====================

const getStudyReport = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!study) return res.status(404).json({ success: false, error: 'الدراسة غير موجودة' });

    const report = await prisma.radiologyReport.findUnique({ where: { studyId: id } });
    res.json({ success: true, data: report || null });
  } catch (error) {
    console.error('Error fetching radiology study report:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تقرير الدراسة' });
  }
};

const upsertStudyReport = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();

    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId } });
    if (!study) return res.status(404).json({ success: false, error: 'الدراسة غير موجودة' });

    const requestedStatus = body.reportStatus === undefined || body.reportStatus === null || body.reportStatus === ''
      ? null
      : String(body.reportStatus).toUpperCase();
    if (requestedStatus && !REPORT_STATUSES.has(requestedStatus)) {
      return res.status(400).json({ success: false, error: 'حالة التقرير غير صحيحة' });
    }

    const existing = await prisma.radiologyReport.findUnique({ where: { studyId: id } });

    if (existing) {
      const data = {};
      if (body.reportText !== undefined && body.reportText !== null) {
        data.reportText = String(body.reportText);
      }
      if (requestedStatus && requestedStatus !== existing.reportStatus) {
        const transition = validateRadiologyReportTransition(existing.reportStatus, requestedStatus);
        if (!transition.valid) return res.status(400).json({ success: false, error: transition.error });
        data.reportStatus = requestedStatus;
        if (requestedStatus === 'SIGNED' && !existing.signedBy) {
          data.signedBy = signerName(req);
          data.signedAt = new Date();
        }
      }
      const report = await prisma.radiologyReport.update({ where: { id: existing.id }, data });
      return res.json({ success: true, data: report });
    }

    const reportText = typeof body.reportText === 'string' ? body.reportText.trim() : '';
    if (!reportText) return res.status(400).json({ success: false, error: 'نص التقرير مطلوب' });

    const reportStatus = requestedStatus || 'DRAFT';
    const createData = {
      studyId: id,
      reportText,
      reportStatus,
    };
    if (reportStatus === 'SIGNED') {
      createData.signedBy = signerName(req);
      createData.signedAt = new Date();
    }

    const report = await prisma.radiologyReport.create({ data: createData });

    if (study.status !== 'REPORTED' && study.status !== 'DELIVERED') {
      await prisma.radiologyStudy.update({ where: { id }, data: { status: 'REPORTED' } });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error upserting radiology study report:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حفظ تقرير الدراسة' });
  }
};

const REPORT_KIND_STATUS = {
  review: 'REVIEWED',
  sign: 'SIGNED',
};

const advanceReportStatus = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id, kind } = req.params;
    const target = REPORT_KIND_STATUS[String(kind || '').toLowerCase()];
    if (!target) return res.status(400).json({ success: false, error: 'إجراء غير صحيح' });

    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!study) return res.status(404).json({ success: false, error: 'الدراسة غير موجودة' });

    const report = await prisma.radiologyReport.findUnique({ where: { studyId: id } });
    if (!report) return res.status(400).json({ success: false, error: 'التقرير غير موجود' });

    if (report.reportStatus !== target) {
      const transition = validateRadiologyReportTransition(report.reportStatus, target);
      if (!transition.valid) return res.status(400).json({ success: false, error: transition.error });
    }

    const data = { reportStatus: target };
    if (target === 'SIGNED' && !report.signedBy) {
      data.signedBy = signerName(req);
      data.signedAt = new Date();
    }

    const updated = await prisma.radiologyReport.update({ where: { id: report.id }, data });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error advancing radiology report status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث التقرير' });
  }
};

const advanceReport = async (req, res) => {
  const kind = String(req.params.kind || '').toLowerCase();
  if (kind === 'deliver') return markDelivered(req, res);
  return advanceReportStatus(req, res);
};

const markDelivered = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId } });
    if (!study) return res.status(404).json({ success: false, error: 'الدراسة غير موجودة' });

    const report = await prisma.radiologyReport.findUnique({ where: { studyId: id } });
    if (!report) return res.status(400).json({ success: false, error: 'التقرير غير موجود' });

    if (report.reportStatus === 'DELIVERED' && study.status === 'DELIVERED') {
      return res.json({ success: true, data: { study, report } });
    }
    if (report.reportStatus !== 'SIGNED') {
      return res.status(400).json({ success: false, error: 'يجب توقيع التقرير قبل التسليم' });
    }

    const [deliveredReport, deliveredStudy] = await Promise.all([
      prisma.radiologyReport.update({ where: { id: report.id }, data: { reportStatus: 'DELIVERED' } }),
      prisma.radiologyStudy.update({ where: { id }, data: { status: 'DELIVERED' } }),
    ]);

    res.json({ success: true, data: { study: deliveredStudy, report: deliveredReport } });
  } catch (error) {
    console.error('Error delivering radiology study:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تسليم دراسة الأشعة' });
  }
};

// ==================== REPORT PDF ====================

const getStudyReportPdf = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId }, include: { report: true } });
    if (!study) return res.status(404).json({ success: false, error: 'الدراسة غير موجودة' });

    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
    const { generateStudyReportPdf } = require('../services/radiologyPdfService');
    const pdfBuffer = await generateStudyReportPdf(study, company);

    const filename = `report-${(study.studyNumber || study.id).replace(/[^a-zA-Z0-9-]/g, '')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating radiology report PDF:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء PDF التقرير' });
  }
};

// ==================== CONTRACTS ====================
const CONTRACT_DISCOUNT_TYPES = ['PERCENTAGE', 'CUSTOM', 'NONE'];

const clampPercent = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
};

const listContracts = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { search, includeInactive } = req.query;
    const where = { companyId };
    if (includeInactive !== 'true') where.isActive = true;
    if (search && String(search).trim()) {
      const term = String(search).trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { region: { contains: term, mode: 'insensitive' } },
      ];
    }

    const contracts = await getSharedPrismaClient().radiologyContract.findMany({ where, orderBy: { name: 'asc' } });
    res.json({ success: true, data: contracts });
  } catch (error) {
    console.error('Error fetching radiology contracts:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب التعاقدات' });
  }
};

const createContract = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { name, region, governorate, discountType, discountPercent, externalSample } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: 'اسم التعاقد مطلوب' });

    const type = String(discountType || 'PERCENTAGE').trim().toUpperCase();
    if (!CONTRACT_DISCOUNT_TYPES.includes(type)) return res.status(400).json({ success: false, error: 'نوع الخصم غير صالح' });

    const contract = await getSharedPrismaClient().radiologyContract.create({
      data: {
        companyId,
        name: String(name).trim(),
        region: normalizeText(region),
        governorate: normalizeText(governorate),
        discountType: type,
        discountPercent: clampPercent(discountPercent),
        externalSample: normalizeBool(externalSample, false),
      },
    });

    res.json({ success: true, data: contract });
  } catch (error) {
    console.error('Error creating radiology contract:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء التعاقد' });
  }
};

const updateContract = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyContract.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'التعاقد غير موجود' });

    const data = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return res.status(400).json({ success: false, error: 'اسم التعاقد مطلوب' });
      data.name = String(body.name).trim();
    }
    if (body.region !== undefined) data.region = normalizeText(body.region);
    if (body.governorate !== undefined) data.governorate = normalizeText(body.governorate);
    if (body.discountType !== undefined) {
      const type = String(body.discountType).trim().toUpperCase();
      if (!CONTRACT_DISCOUNT_TYPES.includes(type)) return res.status(400).json({ success: false, error: 'نوع الخصم غير صالح' });
      data.discountType = type;
    }
    if (body.discountPercent !== undefined) data.discountPercent = clampPercent(body.discountPercent);
    if (body.externalSample !== undefined) data.externalSample = normalizeBool(body.externalSample, false);
    if (body.isActive !== undefined) data.isActive = normalizeBool(body.isActive, true);

    const contract = await prisma.radiologyContract.update({ where: { id }, data });
    res.json({ success: true, data: contract });
  } catch (error) {
    console.error('Error updating radiology contract:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث التعاقد' });
  }
};

const deleteContract = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyContract.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'التعاقد غير موجود' });

    const contract = await prisma.radiologyContract.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'تم حذف التعاقد', data: contract });
  } catch (error) {
    console.error('Error deleting radiology contract:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف التعاقد' });
  }
};

// ==================== REPORT TEMPLATES ====================

const listReportTemplates = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { includeInactive } = req.query;
    const where = { companyId };
    if (includeInactive !== 'true') where.isActive = true;

    const templates = await getSharedPrismaClient().radiologyReportTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching radiology report templates:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب قوالب التقارير' });
  }
};

const createReportTemplate = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { name, body } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: 'اسم القالب مطلوب' });
    if (!body || !String(body).trim()) return res.status(400).json({ success: false, error: 'نص القالب مطلوب' });

    const template = await getSharedPrismaClient().radiologyReportTemplate.create({
      data: { companyId, name: String(name).trim(), body: String(body).trim() },
    });
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Error creating radiology report template:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء قالب التقرير' });
  }
};

const updateReportTemplate = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyReportTemplate.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'القالب غير موجود' });

    const data = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return res.status(400).json({ success: false, error: 'اسم القالب مطلوب' });
      data.name = String(body.name).trim();
    }
    if (body.body !== undefined) {
      if (!String(body.body).trim()) return res.status(400).json({ success: false, error: 'نص القالب مطلوب' });
      data.body = String(body.body).trim();
    }
    if (body.isActive !== undefined) data.isActive = normalizeBool(body.isActive, true);

    const template = await prisma.radiologyReportTemplate.update({ where: { id }, data });
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Error updating radiology report template:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث القالب' });
  }
};

const deleteReportTemplate = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyReportTemplate.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'القالب غير موجود' });

    const template = await prisma.radiologyReportTemplate.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'تم حذف القالب', data: template });
  } catch (error) {
    console.error('Error deleting radiology report template:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف القالب' });
  }
};

module.exports = {
  RADIOLOGY_STUDY_CHAIN,
  RADIOLOGY_REPORT_CHAIN,
  SUBMISSION_STATUSES,
  MODALITY_BY_CATEGORY,
  validateRadiologyStudyTransition,
  validateRadiologyReportTransition,
  listExamTypes,
  createExamType,
  updateExamType,
  deleteExamType,
  listStudies,
  getStudy,
  createStudy,
  duplicateStudy,
  updateStudy,
  uploadStudyImages,
  getStudyImageFile,
  deleteStudyImage,
  getStudyReport,
  upsertStudyReport,
  advanceReport,
  markDelivered,
  getStudyReportPdf,
  listContracts,
  createContract,
  updateContract,
  deleteContract,
  listReportTemplates,
  createReportTemplate,
  updateReportTemplate,
  deleteReportTemplate,
};
