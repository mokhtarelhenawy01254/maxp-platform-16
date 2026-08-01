const { getSharedPrismaClient } = require('../services/sharedDatabase');
const bcrypt = require('bcryptjs');

const normalizeGender = (g) => {
  if (!g) return null;
  const v = String(g).toUpperCase();
  return v === 'MALE' || v === 'FEMALE' ? v : null;
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

    const { search, page, limit, includeInactive } = req.query;
    const where = { companyId };
    if (includeInactive !== 'true') where.isActive = true;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
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
        appointments: {
          orderBy: [{ appointmentDate: 'desc' }, { startTime: 'desc' }],
          include: {
            branch: { select: { id: true, name: true } },
            doctor: { select: { id: true, title: true, name: true } },
            service: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!patient) return res.status(404).json({ success: false, error: 'المريض غير موجود' });

    res.json({ success: true, data: formatPatient(patient) });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المريض' });
  }
};

const createPatient = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { firstName, lastName, phone, email, gender, birthDate, bloodType, allergies, chronicDiseases, medications, notes, customerId, password } = req.body;
    if (!firstName || !firstName.trim()) return res.status(400).json({ success: false, error: 'اسم المريض مطلوب' });

    // Auto-link to an existing CRM Customer by phone when no customerId is provided
    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId && phone) {
      const customer = await getSharedPrismaClient().customer.findFirst({
        where: { companyId, OR: [{ phone }, { whatsappId: phone }] },
        select: { id: true },
      });
      if (customer) resolvedCustomerId = customer.id;
    }

    const patient = await getSharedPrismaClient().patient.create({
      data: {
        companyId,
        customerId: resolvedCustomerId || null,
        firstName: firstName.trim(),
        lastName: lastName || null,
        phone: phone || null,
        email: email || null,
        password: password ? await bcrypt.hash(password, 10) : null,
        gender: normalizeGender(gender),
        birthDate: birthDate ? new Date(birthDate) : null,
        bloodType: bloodType || null,
        allergies: allergies ?? null,
        chronicDiseases: chronicDiseases ?? null,
        medications: medications ?? null,
        notes: notes || null,
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

    const allowedFields = ['firstName', 'lastName', 'phone', 'email', 'gender', 'birthDate', 'bloodType', 'allergies', 'chronicDiseases', 'medications', 'notes', 'isActive', 'customerId'];
    const data = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    }
    if (data.gender !== undefined) data.gender = normalizeGender(data.gender);
    if (data.birthDate) data.birthDate = new Date(data.birthDate);

    const patient = await getSharedPrismaClient().patient.update({ where: { id }, data });
    res.json({ success: true, data: patient });
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث المريض' });
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

module.exports = { getAllPatients, getPatientById, createPatient, updatePatient, deletePatient };
