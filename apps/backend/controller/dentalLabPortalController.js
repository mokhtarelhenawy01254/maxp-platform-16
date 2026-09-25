const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getJwtSecret } = require('../utils/jwtSecret');
const {
  round2,
  toNonNegativeNumber,
  parseDate,
  derivePaymentStatus,
  generateCaseNumber,
  getStageTemplates,
  buildStagesData,
  parseSettingValue,
} = require('../utils/dentalLabHelpers');
const { recordDentalLabStatusHistory } = require('../utils/dentalLabStatusHistory');
const { dentalLabDir } = require('../utils/dentalLabUpload');
const { suggestDueDate } = require('../services/dentalDeliveryEstimate');
const { getBillingPolicy, assertCreditLimit } = require('../services/dentalBillingPolicy');
const { resolveDoctorWorkTypePrice } = require('../services/dentalPricing');

const ATTACHMENT_KINDS = new Set(['SCAN', 'PHOTO', 'XRAY', 'PRESCRIPTION', 'WORK_ORDER', 'DESIGN_REVIEW', 'OTHER']);

const getDentist = (req, res) => {
  const dentist = req.dentist;
  if (!dentist || !dentist.id || !dentist.companyId) {
    res.status(401).json({ success: false, error: 'غير مصرح' });
    return null;
  }
  return dentist;
};

const portalLogin = async (req, res) => {
  try {
    const body = req.body || {};
    const phone = body.phone ? String(body.phone).trim() : '';
    const pin = body.pin !== undefined && body.pin !== null ? String(body.pin).trim() : '';
    if (!phone || !pin) {
      return res.status(400).json({ success: false, error: 'رقم الهاتف والرقم السري مطلوبان' });
    }

    const prisma = getSharedPrismaClient();
    const requestedCompanyId = body.companyId || req.headers['x-company-id'] || req.headers['X-Company-Id'] || null;
    const where = { phone, isActive: true };
    if (requestedCompanyId) where.companyId = requestedCompanyId;

    const dentist = await prisma.dentalLabDoctor.findFirst({
      where,
      select: {
        id: true,
        companyId: true,
        name: true,
        phone: true,
        clinicName: true,
        governorate: true,
        portalPin: true,
        creditLimit: true,
        isActive: true,
      },
    });
    if (!dentist) {
      return res.status(401).json({ success: false, error: 'رقم الهاتف أو الرقم السري غير صحيح' });
    }
    const bcrypt = require('bcryptjs');
    let pinValid = false;
    if (dentist.portalPin) {
      if (dentist.portalPin.startsWith('$2a$') || dentist.portalPin.startsWith('$2b$')) {
        try { pinValid = bcrypt.compareSync(pin, dentist.portalPin); } catch (_) { pinValid = false; }
      } else {
        pinValid = dentist.portalPin === pin;
      }
    }
    if (!pinValid) {
      return res.status(401).json({ success: false, error: 'رقم الهاتف أو الرقم السري غير صحيح' });
    }

    const token = jwt.sign(
      { dentistId: dentist.id, companyId: dentist.companyId, role: 'DENTAL_DOCTOR' },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        dentist: {
          id: dentist.id,
          name: dentist.name,
          clinicName: dentist.clinicName || null,
          phone: dentist.phone || null,
          governorate: dentist.governorate || null,
          creditLimit: dentist.creditLimit || 0,
        },
        token,
        expiresIn: '24h',
      },
    });
  } catch (error) {
    console.error('Error logging into dental portal:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تسجيل الدخول' });
  }
};

const portalDashboard = async (req, res) => {
  try {
    const dentist = getDentist(req, res);
    if (!dentist) return;
    const prisma = getSharedPrismaClient();
    const where = { companyId: dentist.companyId, doctorId: dentist.id };

    const [total, statusRows, readyCount, overdueCount, activeCount, outstandingAgg] = await Promise.all([
      prisma.dentalLabCase.count({ where }),
      prisma.dentalLabCase.groupBy({ by: ['status'], where, _count: { _all: true } }),
      prisma.dentalLabCase.count({ where: { ...where, status: 'READY' } }),
      prisma.dentalLabCase.count({
        where: { ...where, dueDate: { lt: new Date() }, status: { notIn: ['DELIVERED', 'CLOSED'] } },
      }),
      prisma.dentalLabCase.count({ where: { ...where, status: { notIn: ['DELIVERED', 'CLOSED'] } } }),
      prisma.dentalInvoice.aggregate({ where: { companyId: dentist.companyId, doctorId: dentist.id }, _sum: { remaining: true } }),
    ]);

    const statusCounts = {};
    for (const row of statusRows || []) {
      statusCounts[row.status] = row._count._all || 0;
    }

    res.json({
      success: true,
      data: {
        totalCases: total,
        statusCounts,
        activeCount,
        readyForDelivery: readyCount,
        readyCount,
        overdueCount,
        outstanding: round2(outstandingAgg._sum.remaining || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching dental portal dashboard:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الإحصائيات' });
  }
};

const portalCatalog = async (req, res) => {
  try {
    const dentist = getDentist(req, res);
    if (!dentist) return;
    const prisma = getSharedPrismaClient();
    const items = await prisma.dentalWorkType.findMany({
      where: { companyId: dentist.companyId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const priced = await Promise.all(
      items.map(async (wt) => ({
        ...wt,
        price: await resolveDoctorWorkTypePrice(prisma, dentist.companyId, dentist.id, wt),
      }))
    );
    res.json({ success: true, data: priced });
  } catch (error) {
    console.error('Error fetching dental portal catalog:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الكتالوج' });
  }
};

const placeOrder = async (req, res) => {
  try {
    const dentist = getDentist(req, res);
    if (!dentist) return;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const itemsRaw = body.items;

    if (Array.isArray(itemsRaw) && itemsRaw.length > 0) {
      const sharedPatientName = body.patientName ? String(body.patientName).trim() : null;
      const sharedPatientPhone = body.patientPhone ? String(body.patientPhone) : null;
      const sharedNotes = body.notes ? String(body.notes) : null;

      const prepared = [];
      for (const it of itemsRaw) {
        if (!it || !it.workTypeId) {
          return res.status(400).json({ success: false, error: 'نوع الشغل مطلوب لكل عنصر' });
        }
        const workType = await prisma.dentalWorkType.findFirst({
          where: { id: it.workTypeId, companyId: dentist.companyId, isActive: true },
        });
        if (!workType) {
          return res.status(400).json({ success: false, error: `نوع الشغل غير متاح: ${it.workTypeId}` });
        }
        const priceSnapshot = round2(Number(workType.price) || 0);
        const resolvedPrice = await resolveDoctorWorkTypePrice(prisma, dentist.companyId, dentist.id, workType);
        const stageNames = await getStageTemplates(prisma, dentist.companyId, workType.category || null);
        const stagesData = buildStagesData(dentist.companyId, stageNames);
        const dueDate = body.dueDate ? parseDate(body.dueDate) : await suggestDueDate(prisma, dentist.companyId, workType.id);
        prepared.push({
          workType,
          priceSnapshot: resolvedPrice,
          total: resolvedPrice,
          stagesData,
          dueDate,
          teeth: it.teeth ? String(it.teeth) : null,
          shade: it.shade ? String(it.shade) : null,
          material: it.material ? String(it.material) : null,
        });
      }

      // حماية حد الائتمان للطبيب (العميل) عند تفعيل السياسة المالية
      const billingPolicy = await getBillingPolicy(prisma, dentist.companyId);
      if (billingPolicy.enforceCreditLimit) {
        const expectedTotal = round2(prepared.reduce((s, p) => s + (Number(p.total) || 0), 0));
        const creditCheck = await assertCreditLimit(prisma, dentist.companyId, dentist.id, expectedTotal);
        if (creditCheck) {
          return res.status(400).json({
            success: false,
            error: `تجاوز حد الائتمان (الحد ${creditCheck.creditLimit}، المستحق بعده ${creditCheck.after}) — سدّد المستحقات أولاً أو تواصل مع المعمل`,
          });
        }
      }

      const created = await prisma.$transaction(async (tx) => {
        const results = [];
        for (const p of prepared) {
          const { workType, priceSnapshot, total, stagesData, dueDate, teeth, shade, material } = p;
          const paid = 0;
          const remaining = total;
          const paymentStatus = derivePaymentStatus(total, paid);

          const unitsCount = Number(p.unitsCount) > 0 ? Number(p.unitsCount) : 1;
          const unitPrice = round2(total / unitsCount);
          const receivedDate = new Date();
          receivedDate.setHours(0, 0, 0, 0);

          let dentalCase = null;
          for (let attempt = 0; attempt < 4; attempt++) {
            try {
              dentalCase = await tx.dentalLabCase.create({
                data: {
                  companyId: dentist.companyId,
                  caseNumber: await generateCaseNumber(tx, dentist.companyId),
                  doctorId: dentist.id,
                  doctorName: dentist.name,
                  patientName: sharedPatientName,
                  patientPhone: sharedPatientPhone,
                  workTypeId: workType.id,
                  workTypeName: workType.name,
                  teeth,
                  shade,
                  material,
                  status: 'RECEIVED',
                  orderStatus: 'PENDING',
                  priority: 'NORMAL',
                  receivedDate,
                  dueDate,
                  source: 'PORTAL',
                  priceSnapshot: priceSnapshot || unitPrice,
                  unitsCount,
                  unitPrice,
                  discount: 0,
                  total,
                  paid,
                  remaining,
                  paymentStatus,
                  notes: sharedNotes,
                  stages: { create: stagesData },
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

          await recordDentalLabStatusHistory(tx, {
            companyId: dentist.companyId,
            caseId: dentalCase.id,
            dimension: 'STAGE',
            status: 'RECEIVED',
            oldStatus: null,
            changedBy: `doctor:${dentist.id}`,
            userName: dentist.name,
          });

          results.push({
            id: dentalCase.id,
            caseNumber: dentalCase.caseNumber,
            workTypeName: dentalCase.workTypeName,
            total: round2(Number(dentalCase.total) || total),
          });
        }
        return results;
      });

      const totalAll = round2(created.reduce((sum, c) => sum + (Number(c.total) || 0), 0));
      for (const c of created) {
        require('../services/dentalLabNotificationService').notifyCaseReceived(c.id).catch(() => {});
      }
      return res.json({ success: true, data: { created, totalAll } });
    }

    if (!body.workTypeId) return res.status(400).json({ success: false, error: 'نوع الشغل مطلوب' });

    const workType = await prisma.dentalWorkType.findFirst({
      where: { id: body.workTypeId, companyId: dentist.companyId, isActive: true },
    });
    if (!workType) return res.status(400).json({ success: false, error: 'نوع الشغل غير متاح' });

    const priceSnapshot = round2(Number(workType.price) || 0);
    const total = priceSnapshot;
    const paid = 0;
    const remaining = total;
    const paymentStatus = derivePaymentStatus(total, paid);

    const billingPolicySingle = await getBillingPolicy(prisma, dentist.companyId);
    if (billingPolicySingle.enforceCreditLimit) {
      const checkSingle = await assertCreditLimit(prisma, dentist.companyId, dentist.id, total);
      if (checkSingle && checkSingle.blocked) {
        return res.status(400).json({ success: false, error: `تجاوز حد الائتمان للطبيب (الحد ${checkSingle.creditLimit}، المستحق بعده ${checkSingle.after})` });
      }
    }

    const stageNames = await getStageTemplates(prisma, dentist.companyId, workType.category || null);
    const stagesData = buildStagesData(dentist.companyId, stageNames);
    const dueDate = body.dueDate ? parseDate(body.dueDate) : await suggestDueDate(prisma, dentist.companyId, workType.id);

    let dentalCase = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        dentalCase = await prisma.dentalLabCase.create({
          data: {
            companyId: dentist.companyId,
            caseNumber: await generateCaseNumber(prisma, dentist.companyId),
            doctorId: dentist.id,
            doctorName: dentist.name,
            patientName: body.patientName ? String(body.patientName).trim() : null,
            patientPhone: body.patientPhone ? String(body.patientPhone) : null,
            workTypeId: workType.id,
            workTypeName: workType.name,
            teeth: body.teeth ? String(body.teeth) : null,
            shade: body.shade ? String(body.shade) : null,
            material: body.material ? String(body.material) : null,
            status: 'RECEIVED',
            orderStatus: 'PENDING',
            priority: 'NORMAL',
            dueDate,
            source: 'PORTAL',
            priceSnapshot,
            discount: 0,
            total,
            paid,
            remaining,
            paymentStatus,
            notes: body.notes ? String(body.notes) : null,
            stages: { create: stagesData },
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

    await recordDentalLabStatusHistory(prisma, {
      companyId: dentist.companyId,
      caseId: dentalCase.id,
      dimension: 'STAGE',
      status: 'RECEIVED',
      oldStatus: null,
      changedBy: `doctor:${dentist.id}`,
      userName: dentist.name,
    });

    const summary = {
      id: dentalCase.id,
      caseNumber: dentalCase.caseNumber,
      workTypeName: dentalCase.workTypeName,
      total: round2(Number(dentalCase.total) || total),
    };

    res.json({ success: true, data: { ...dentalCase, created: [summary], totalAll: summary.total } });
    require('../services/dentalLabNotificationService').notifyCaseReceived(dentalCase.id).catch(() => {});
  } catch (error) {
    console.error('Error placing dental portal order:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إرسال الطلب' });
  }
};

const myCases = async (req, res) => {
  try {
    const dentist = getDentist(req, res);
    if (!dentist) return;
    const { status, limit } = req.query;
    const where = { companyId: dentist.companyId, doctorId: dentist.id };
    if (status) where.status = String(status).toUpperCase();

    const prisma = getSharedPrismaClient();
    const items = await prisma.dentalLabCase.findMany({
      where,
      include: {
        doctor: { select: { id: true, name: true, clinicName: true } },
        workType: { select: { id: true, name: true, category: true } },
        stages: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, parseInt(limit, 10) || 100),
    });

    const result = items.map((dentalCase) => {
      const activeStage = (dentalCase.stages || []).find((stage) => stage.status !== 'DONE') || null;
      return { ...dentalCase, currentStage: activeStage ? activeStage.name : null };
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error listing dental portal cases:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الحالات' });
  }
};

const myCaseDetail = async (req, res) => {
  try {
    const dentist = getDentist(req, res);
    if (!dentist) return;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const dentalCase = await prisma.dentalLabCase.findFirst({
      where: { id, companyId: dentist.companyId, doctorId: dentist.id },
      include: {
        doctor: { select: { id: true, name: true, clinicName: true } },
        workType: { select: { id: true, name: true, category: true } },
        stages: { orderBy: { sortOrder: 'asc' } },
        assignments: { include: { technician: { select: { id: true, name: true, role: true } } } },
        attachments: { orderBy: { createdAt: 'desc' } },
        invoices: { include: { payments: { orderBy: { createdAt: 'desc' } } }, orderBy: { createdAt: 'desc' } },
        history: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!dentalCase) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });
    const attachments = Array.isArray(dentalCase.attachments)
      ? dentalCase.attachments.map((a) => ({ ...a, storedName: a.storedPath || null }))
      : dentalCase.attachments;
    const designReview = (attachments || []).find((a) => a.kind === 'DESIGN_REVIEW')?.storedName || null;
    res.json({ success: true, data: { ...dentalCase, attachments, designReview } });
  } catch (error) {
    console.error('Error fetching dental portal case:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الحالة' });
  }
};

const designApproval = async (req, res) => {
  try {
    const dentist = getDentist(req, res);
    if (!dentist) return;
    const { id } = req.params;
    const body = req.body || {};
    const approved = body.approved === true;
    const note = body.note ? String(body.note).slice(0, 500) : null;
    const prisma = getSharedPrismaClient();
    const dentalCase = await prisma.dentalLabCase.findFirst({
      where: { id, companyId: dentist.companyId, doctorId: dentist.id },
      select: { id: true, caseNumber: true },
    });
    if (!dentalCase) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });

    if (approved) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.dentalCaseStage.updateMany({
            where: { caseId: id, name: { in: ['التصميم', 'Design', 'DESIGN'] } },
            data: { status: 'DONE', completedAt: new Date() },
          });
          const currentCase = await tx.dentalLabCase.findUnique({ where: { id }, select: { status: true } });
          if (currentCase && (currentCase.status === 'DESIGN' || currentCase.status === 'RECEIVED')) {
            await tx.dentalLabCase.update({
              where: { id },
              data: { status: 'MANUFACTURING', orderStatus: 'IN_PROGRESS' },
            });
            await tx.dentalCaseStage.updateMany({
              where: { caseId: id, name: { in: ['التصنيع', 'Manufacturing', 'MANUFACTURING'] } },
              data: { status: 'IN_PROGRESS', startedAt: new Date() },
            });
          }
        });
      } catch (txErr) {
        console.warn('Could not auto-advance stage on design approval:', txErr.message);
      }
    }

    await recordDentalLabStatusHistory(prisma, {
      companyId: dentist.companyId,
      caseId: id,
      dimension: 'DESIGN_REVIEW',
      status: approved ? 'APPROVED' : 'CHANGES_REQUESTED',
      oldStatus: null,
      changedBy: `doctor:${dentist.id}`,
      userName: dentist.name,
      reason: note || (approved ? 'اعتماد التصميم والانتقال إلى التصنيع' : 'طلب تعديل على التصميم'),
    });
    res.json({ success: true, data: { approved, note, caseNumber: dentalCase.caseNumber } });
  } catch (error) {
    console.error('Error recording dental design approval:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تسجيل الاعتماد' });
  }
};

const getWorkOrderPdf = async (req, res) => {
  try {
    const dentist = getDentist(req, res);
    if (!dentist) return;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const caseRow = await prisma.dentalLabCase.findFirst({
      where: { id, companyId: dentist.companyId, doctorId: dentist.id },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!caseRow) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });

    const settingRows = await prisma.dentalSetting.findMany({ where: { companyId: dentist.companyId } });
    const workOrderHeader = { labName: dentist.clinicName || 'معمل الأسنان' };
    const stored = (settingRows || []).find((row) => row && row.key === 'workOrderHeader');
    if (stored) {
      const parsed = parseSettingValue(stored);
      if (parsed && typeof parsed === 'object') Object.assign(workOrderHeader, parsed);
    }

    const { generateWorkOrderPdf } = require('../services/dentalWorkOrderService');
    const { buffer, caseNumber } = await generateWorkOrderPdf({
      company: { name: dentist.clinicName || 'معمل الأسنان' },
      caseRow,
      workOrderHeader,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="work-order-${caseNumber}.pdf"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error generating dental portal work order PDF:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء أمر الشغل' });
  }
};

const uploadCaseAttachment = async (req, res) => {
  try {
    const dentist = getDentist(req, res);
    if (!dentist) return;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.dentalLabCase.findFirst({
      where: { id, companyId: dentist.companyId, doctorId: dentist.id },
      select: { id: true },
    });
    if (!existing) {
      const leftovers = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
      for (const f of leftovers) { if (f && f.path) fs.unlink(f.path, () => {}); }
      return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });
    }

    // يقبل رفع ملف واحد (req.file) أو متعدد (req.files)
    const files = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
    if (files.length === 0) return res.status(400).json({ success: false, error: 'لم يتم رفع أي ملف' });

    // نوع كل مرفق: req.body.kind (لكل الملفات) أو req.body.kinds (مستقل لكل ملف)
    const normalizeKinds = (raw) => {
      if (raw == null) return [];
      if (Array.isArray(raw)) return raw.map((k) => String(k).toUpperCase());
      if (typeof raw === 'object') {
        return Object.keys(raw).sort((a, b) => Number(a) - Number(b)).map((k) => String(raw[k]).toUpperCase());
      }
      return [String(raw).toUpperCase()];
    };
    let perFileKinds = normalizeKinds(req.body?.kinds);
    if (perFileKinds.length === 0 && req.body?.kind) {
      perFileKinds = normalizeKinds(req.body.kind);
    }
    if (perFileKinds.length < files.length) {
      const last = perFileKinds[perFileKinds.length - 1] || 'SCAN';
      while (perFileKinds.length < files.length) perFileKinds.push(last);
    } else if (perFileKinds.length > files.length) {
      perFileKinds = perFileKinds.slice(0, files.length);
    }
    for (const k of perFileKinds) {
      if (!ATTACHMENT_KINDS.has(k)) {
        for (const f of files) { if (f && f.path) fs.unlink(f.path, () => {}); }
        return res.status(400).json({ success: false, error: 'نوع المرفق غير صحيح' });
      }
    }
    // مراجعة التصميم (exocad HTML) لا يرفعها إلا المعمل — حماية من أي مرفق HTML ضار
    if (perFileKinds.includes('DESIGN_REVIEW')) {
      for (const f of files) { if (f && f.path) fs.unlink(f.path, () => {}); }
      return res.status(403).json({ success: false, error: 'غير مصرح برفع مراجعة التصميم من بوابة الطبيب' });
    }
    const isHtmlFile = (f) => {
      const ext = path.extname(f.originalname || f.filename || '').toLowerCase();
      const mime = String(f.mimetype || '').toLowerCase();
      return ext === '.html' || mime === 'text/html';
    };
    for (const f of files) {
      if (isHtmlFile(f)) {
        for (const ff of files) { if (ff && ff.path) fs.unlink(ff.path, () => {}); }
        return res.status(400).json({ success: false, error: 'ملفات HTML غير مسموحة من بوابة الطبيب' });
      }
    }

    const created = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const att = await prisma.dentalCaseAttachment.create({
        data: {
          companyId: dentist.companyId,
          caseId: id,
          uploadedBy: `doctor:${dentist.id}`,
          kind: perFileKinds[i],
          fileName: f.originalname || f.filename,
          storedPath: f.filename,
          mimeType: f.mimetype || null,
          size: f.size || 0,
        },
      });
      created.push(att);
    }
    res.json({ success: true, data: created.length === 1 ? created[0] : created, meta: { count: created.length, kinds: perFileKinds } });
  } catch (error) {
    console.error('Error uploading dental attachment:', error);
    const leftovers = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
    for (const f of leftovers) { if (f && f.path) fs.unlink(f.path, () => {}); }
    res.status(500).json({ success: false, error: 'حدث خطأ في رفع المرفق' });
  }
};

const myInvoices = async (req, res) => {
  try {
    const dentist = getDentist(req, res);
    if (!dentist) return;
    const prisma = getSharedPrismaClient();
    const items = await prisma.dentalInvoice.findMany({
      where: { companyId: dentist.companyId, doctorId: dentist.id },
      include: {
        case: { select: { id: true, caseNumber: true, patientName: true } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error listing dental portal invoices:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الفواتير' });
  }
};

module.exports = {
  portalLogin,
  portalDashboard,
  portalCatalog,
  placeOrder,
  myCases,
  myCaseDetail,
  designApproval,
  getWorkOrderPdf,
  uploadCaseAttachment,
  myInvoices,
};