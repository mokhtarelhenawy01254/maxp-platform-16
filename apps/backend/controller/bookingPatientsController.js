const { getSharedPrismaClient } = require('../services/sharedDatabase');
const bcrypt = require('bcryptjs');

const normalizeGender = (g) => {
  if (!g) return null;
  const v = String(g).toUpperCase();
  return v === 'MALE' || v === 'FEMALE' ? v : null;
};

const normalizeMedicalHistory = (v) => {
  if (v === undefined || v === null || v === '') return { value: undefined, error: null };
  let parsed = v;
  if (typeof v === 'string') {
    try { parsed = JSON.parse(v); } catch { return { value: null, error: 'صيغة التاريخ الطبي غير صحيحة (يجب أن تكون JSON صالحة)' }; }
  }
  if (Array.isArray(parsed) || parsed === null || typeof parsed !== 'object') {
    return { value: null, error: 'التاريخ الطبي يجب أن يكون كائنًا يحتوي على الحالات والحساسية' };
  }
  return { value: parsed, error: null };
};

const formatPatient = (p) => {
  const { _count, password, ...rest } = p;
  return {
    ...rest,
    gender: p.gender ? String(p.gender).toLowerCase() : undefined,
    visitCount: _count?.appointments ?? undefined,
  };
};

const getAllPatients = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { search, page, limit, includeInactive, insuranceCompanyId } = req.query;
    const where = { companyId };
    if (includeInactive !== 'true') where.isActive = true;
    if (insuranceCompanyId) where.insuranceCompanyId = insuranceCompanyId;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { insuranceNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [patients, total] = await Promise.all([
      getSharedPrismaClient().patient.findMany({
        where,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
          insuranceCompany: { select: { id: true, name: true } },
          memberType: { select: { id: true, name: true, coveragePercent: true } },
          _count: { select: { appointments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      getSharedPrismaClient().patient.count({ where }),
    ]);

    const formatted = patients.map(formatPatient);

    res.json({ success: true, data: formatted, total, page: pageNum, limit: limitNum });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المرضى' });
  }
};

const getPatientById = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const patient = await getSharedPrismaClient().patient.findFirst({
      where: { id, companyId },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        referringPhysician: { select: { id: true, name: true, phone: true, specialty: true } },
        priceList: { select: { id: true, name: true } },
        insuranceCompany: { select: { id: true, name: true } },
        memberType: { select: { id: true, name: true, coveragePercent: true } },
        appointments: {
          orderBy: [{ appointmentDate: 'desc' }, { startTime: 'desc' }],
          include: {
            branch: { select: { id: true, name: true } },
            doctor: { select: { id: true, title: true, name: true } },
            service: { select: { id: true, name: true } },
          },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          include: {
            payments: { select: { id: true, amount: true, method: true, paidAt: true } },
          },
        },
      },
    });
    if (!patient) return res.status(404).json({ success: false, error: 'المريض غير موجود' });

    const data = formatPatient(patient);
    // Compute financial summary
    const activeInvoices = (data.invoices || []).filter(i => i.status !== 'REFUNDED');
    const netOf = (i) => Math.max(0, (Number(i.total) || 0) - (Number(i.discount) || 0) + (Number(i.additionAmount) || 0));
    data.financialSummary = {
      invoiceCount: data.invoices?.length || 0,
      totalBilled: +activeInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0).toFixed(2),
      totalPaid: +activeInvoices.reduce((s, i) => s + (Number(i.amountPaid) || 0), 0).toFixed(2),
      outstanding: +activeInvoices.reduce((s, i) => s + Math.max(0, netOf(i) - (Number(i.amountPaid) || 0)), 0).toFixed(2),
      unpaidInvoices: activeInvoices.filter(i => i.status === 'UNPAID' || i.status === 'PARTIAL').length,
    };

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المريض' });
  }
};

const createPatient = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { firstName, lastName, phone, email, gender, birthDate, bloodType, allergies, chronicDiseases, medications, notes, customerId, password, nationalId, nationalIdImage, address, status, source, maritalStatus, occupation, city, medicalHistory, referringPhysicianId, priceListId, title, insuranceNumber, insuranceCompanyId, memberTypeId, homePhone, workPhone, fax, postalCode } = req.body;
    if (!firstName || !firstName.trim()) return res.status(400).json({ success: false, error: 'اسم المريض مطلوب' });

    let medicalHistoryData;
    if (medicalHistory !== undefined) {
      const mh = normalizeMedicalHistory(medicalHistory);
      if (mh.error) return res.status(400).json({ success: false, error: mh.error });
      medicalHistoryData = mh.value;
    }

    // Auto-link to an existing CRM Customer by phone when no customerId is provided
    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId && phone) {
      const customer = await getSharedPrismaClient().customer.findFirst({
        where: { companyId, OR: [{ phone }, { whatsappId: phone }] },
        select: { id: true },
      });
      if (customer) resolvedCustomerId = customer.id;
    }

    if (resolvedCustomerId) {
      const customer = await getSharedPrismaClient().customer.findFirst({ where: { id: resolvedCustomerId, companyId }, select: { id: true } });
      if (!customer) return res.status(400).json({ success: false, error: 'العميل غير موجود' });
    }
    if (referringPhysicianId) {
      const physician = await getSharedPrismaClient().referringPhysician.findFirst({ where: { id: referringPhysicianId, companyId }, select: { id: true } });
      if (!physician) return res.status(400).json({ success: false, error: 'الطبيب المحوّل غير موجود' });
    }
    if (priceListId) {
      const list = await getSharedPrismaClient().priceList.findFirst({ where: { id: priceListId, companyId }, select: { id: true } });
      if (!list) return res.status(400).json({ success: false, error: 'قائمة الأسعار غير موجودة' });
    }
    if (insuranceCompanyId) {
      const company = await getSharedPrismaClient().insuranceCompany.findFirst({ where: { id: insuranceCompanyId, companyId }, select: { id: true } });
      if (!company) return res.status(400).json({ success: false, error: 'شركة التأمين غير موجودة' });
    }
    if (memberTypeId) {
      const memberType = await getSharedPrismaClient().insuranceMemberType.findFirst({ where: { id: memberTypeId, companyId }, select: { id: true } });
      if (!memberType) return res.status(400).json({ success: false, error: 'نوع العضوية غير موجود' });
    }

    // Sequential per-company patient number (starts at 1) for human-friendly IDs
    let patientNo = null;
    try {
      const res = await getSharedPrismaClient().patient.aggregate({
        _max: { patientNo: true },
        where: { companyId },
      });
      const max = res._max && res._max.patientNo;
      patientNo = (Number.isFinite(max) ? max : 0) + 1;
    } catch (error) {
      console.error('[bookingPatientsController] failed to assign patientNo:', error);
    }

    const patient = await getSharedPrismaClient().patient.create({
      data: {
        companyId,
        patientNo,
        customerId: resolvedCustomerId || null,
        firstName: firstName.trim(),
        lastName: lastName || null,
        phone: phone || null,
        email: email || null,
        password: password ? await bcrypt.hash(password, 10) : null,
        gender: normalizeGender(gender),
        birthDate: birthDate ? new Date(birthDate) : null,
        bloodType: bloodType || null,
        nationalId: nationalId || null,
        nationalIdImage: nationalIdImage || null,
        address: address || null,
        allergies: allergies ?? null,
        chronicDiseases: chronicDiseases ?? null,
        medications: medications ?? null,
        notes: notes || null,
        status: status || undefined,
        source: source || null,
        maritalStatus: maritalStatus || null,
        occupation: occupation || null,
        city: city || null,
        medicalHistory: medicalHistoryData,
        referringPhysicianId: referringPhysicianId || null,
        priceListId: priceListId || null,
        title: title || null,
        insuranceNumber: insuranceNumber || null,
        insuranceCompanyId: insuranceCompanyId || null,
        memberTypeId: memberTypeId || null,
        homePhone: homePhone || null,
        workPhone: workPhone || null,
        fax: fax || null,
        postalCode: postalCode || null,
      },
    });
    res.json({ success: true, data: formatPatient(patient) });
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء المريض' });
  }
};

const updatePatient = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().patient.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'المريض غير موجود' });

    const allowedFields = ['firstName', 'lastName', 'phone', 'email', 'gender', 'birthDate', 'bloodType', 'allergies', 'chronicDiseases', 'medications', 'notes', 'isActive', 'customerId', 'password', 'nationalId', 'nationalIdImage', 'address', 'status', 'source', 'maritalStatus', 'occupation', 'city', 'referringPhysicianId', 'priceListId', 'title', 'insuranceNumber', 'insuranceCompanyId', 'memberTypeId', 'homePhone', 'workPhone', 'fax', 'postalCode'];
    const data = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    }
    if (data.gender !== undefined) data.gender = normalizeGender(data.gender);
    if (data.birthDate) data.birthDate = new Date(data.birthDate);
    if (data.password) data.password = await bcrypt.hash(data.password, 10);
    else delete data.password;
    if (req.body.medicalHistory !== undefined) {
      const mh = normalizeMedicalHistory(req.body.medicalHistory);
      if (mh.error) return res.status(400).json({ success: false, error: mh.error });
      data.medicalHistory = mh.value;
    }

    if (data.customerId) {
      const customer = await getSharedPrismaClient().customer.findFirst({ where: { id: data.customerId, companyId }, select: { id: true } });
      if (!customer) return res.status(400).json({ success: false, error: 'العميل غير موجود' });
    }
    if (data.referringPhysicianId) {
      const physician = await getSharedPrismaClient().referringPhysician.findFirst({ where: { id: data.referringPhysicianId, companyId }, select: { id: true } });
      if (!physician) return res.status(400).json({ success: false, error: 'الطبيب المحوّل غير موجود' });
    }
    if (data.priceListId) {
      const list = await getSharedPrismaClient().priceList.findFirst({ where: { id: data.priceListId, companyId }, select: { id: true } });
      if (!list) return res.status(400).json({ success: false, error: 'قائمة الأسعار غير موجودة' });
    }
    if (data.insuranceCompanyId) {
      const company = await getSharedPrismaClient().insuranceCompany.findFirst({ where: { id: data.insuranceCompanyId, companyId }, select: { id: true } });
      if (!company) return res.status(400).json({ success: false, error: 'شركة التأمين غير موجودة' });
    }
    if (data.memberTypeId) {
      const memberType = await getSharedPrismaClient().insuranceMemberType.findFirst({ where: { id: data.memberTypeId, companyId }, select: { id: true } });
      if (!memberType) return res.status(400).json({ success: false, error: 'نوع العضوية غير موجود' });
    }

    const patient = await getSharedPrismaClient().patient.update({ where: { id }, data });
    res.json({ success: true, data: formatPatient(patient) });
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث المريض' });
  }
};

const mergePatients = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { targetPatientId } = req.body;
    if (!targetPatientId) return res.status(400).json({ success: false, error: 'المريض الهدف مطلوب' });
    if (id === targetPatientId) return res.status(400).json({ success: false, error: 'لا يمكن دمج المريض مع نفسه' });

    const prisma = getSharedPrismaClient();
    const source = await prisma.patient.findFirst({ where: { id, companyId } });
    if (!source) return res.status(404).json({ success: false, error: 'المريض غير موجود' });
    if (source.mergedIntoId) return res.status(400).json({ success: false, error: 'لا يمكن دمج مريض مدمج بالفعل' });
    const target = await prisma.patient.findFirst({ where: { id: targetPatientId, companyId } });
    if (!target) return res.status(404).json({ success: false, error: 'المريض الهدف غير موجود' });
    if (target.isActive === false || target.status === 'INACTIVE') {
      return res.status(400).json({ success: false, error: 'لا يمكن الدمج إلى مريض غير نشط' });
    }

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.patient.updateMany({
        where: { id, mergedIntoId: null },
        data: { mergedIntoId: targetPatientId, status: 'INACTIVE', isActive: false },
      });
      if (claimed.count !== 1) throw new Error('PATIENT_ALREADY_MERGED');
      await tx.medicalInvoice.updateMany({ where: { patientId: id }, data: { patientId: targetPatientId } });
      await tx.appointment.updateMany({ where: { patientId: id }, data: { patientId: targetPatientId } });
    });

    try {
      await prisma.transactionLog.create({
        data: {
          companyId,
          entityType: 'PATIENT',
          entityId: id,
          action: 'MERGE',
          description: `تم دمج المريض في ${target.firstName} ${target.lastName || ''}`,
          userId: req.user?.id || null,
          userName: req.user?.name || null,
        },
      });
    } catch (logError) {
      console.error('Error logging patient merge:', logError);
    }

    const updatedTarget = await prisma.patient.findFirst({
      where: { id: targetPatientId, companyId },
      include: { _count: { select: { appointments: true } } },
    });

    res.json({ success: true, data: formatPatient(updatedTarget) });
  } catch (error) {
    if (error && error.message === 'PATIENT_ALREADY_MERGED') {
      return res.status(400).json({ success: false, error: 'لا يمكن دمج مريض مدمج بالفعل' });
    }
    console.error('Error merging patients:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في دمج المرضى' });
  }
};

const getPatientFull = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const patient = await prisma.patient.findFirst({
      where: { id, companyId },
      include: {
        referringPhysician: { select: { id: true, name: true, phone: true, specialty: true } },
        priceList: { select: { id: true, name: true } },
        insuranceCompany: { select: { id: true, name: true } },
        memberType: { select: { id: true, name: true, coveragePercent: true } },
        appointments: {
          orderBy: [{ appointmentDate: 'desc' }, { startTime: 'desc' }],
          take: 10,
          include: {
            branch: { select: { id: true, name: true } },
            doctor: { select: { id: true, title: true, name: true } },
            service: { select: { id: true, name: true } },
          },
        },
        _count: { select: { appointments: true } },
      },
    });
    if (!patient) return res.status(404).json({ success: false, error: 'المريض غير موجود' });

    const invoices = await prisma.medicalInvoice.findMany({
      where: { patientId: id, companyId },
      select: { status: true, total: true, discount: true, additionAmount: true, amountPaid: true },
    });

    let transactionLogCount = 0;
    try {
      transactionLogCount = await prisma.transactionLog.count({ where: { companyId, entityType: 'PATIENT', entityId: id } });
    } catch (countError) {
      console.error('Error counting transaction logs:', countError);
    }

    const data = formatPatient(patient);
    data.latestAppointments = data.appointments;
    delete data.appointments;
    const activeInvoices = invoices.filter(i => i.status !== 'REFUNDED');
    const netOfInvoice = (i) => Math.max(0, (Number(i.total) || 0) - (Number(i.discount) || 0) + (Number(i.additionAmount) || 0));
    data.invoicesSummary = {
      count: invoices.length,
      totalBilled: +activeInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0).toFixed(2),
      totalPaid: +activeInvoices.reduce((s, i) => s + (Number(i.amountPaid) || 0), 0).toFixed(2),
      outstanding: +activeInvoices.reduce((s, i) => s + Math.max(0, netOfInvoice(i) - (Number(i.amountPaid) || 0)), 0).toFixed(2),
    };
    data.transactionLogCount = transactionLogCount;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching patient full record:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب بيانات المريض' });
  }
};

const deletePatient = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().patient.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'المريض غير موجود' });

    // Soft delete to preserve medical history linkage
    await getSharedPrismaClient().patient.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'تم تعطيل المريض' });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف المريض' });
  }
};

module.exports = { getAllPatients, getPatientById, createPatient, updatePatient, deletePatient, mergePatients, getPatientFull };
