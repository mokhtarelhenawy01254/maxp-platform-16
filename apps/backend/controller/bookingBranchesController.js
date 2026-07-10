const { getSharedPrismaClient } = require('../services/sharedDatabase');

const VALID_DAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;
const PHONE_RE = /^01\d{9}$/;

const tryParse = (v) => {
  if (!v || typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return v; }
};

const sanitizeString = (v) => (typeof v === 'string' ? v.trim() : v);

const validatePhones = (phones) => {
  if (!Array.isArray(phones) || phones.length === 0) return null;
  for (const p of phones) {
    if (p && !PHONE_RE.test(p.trim())) return 'رقم الهاتف غير صالح (يجب أن يبدأ بـ 01 ويتكون من 11 رقمًا)';
  }
  return null;
};

const validateWorkingDays = (wd) => {
  if (!wd || typeof wd !== 'object') return 'أيام العمل مطلوبة';
  const keys = Object.keys(wd).filter(k => wd[k]);
  if (keys.length === 0) return 'اختر يوم عمل على الأقل';
  for (const k of keys) {
    if (!VALID_DAYS.includes(k)) return `يوم غير صالح: ${k}`;
    if (!TIME_RE.test(wd[k])) return `توقيت غير صالح لـ ${k} (يجب أن يكون HH:mm-HH:mm)`;
  }
  return null;
};

const validateGenderDays = (gd) => {
  if (!gd || typeof gd !== 'object') return null;
  const all = [...(gd.male || []), ...(gd.female || [])];
  for (const d of all) {
    if (!VALID_DAYS.includes(d)) return `يوم غير صالح في أيام الجنس: ${d}`;
  }
  return null;
};

const sanitizeBranchData = (raw) => {
  const data = {};
  if (raw.name) data.name = sanitizeString(raw.name);
  if (raw.address !== undefined) data.address = sanitizeString(raw.address);
  if (raw.phone !== undefined) data.phone = sanitizeString(raw.phone);
  if (raw.phones !== undefined) data.phones = raw.phones;
  if (raw.location !== undefined) data.location = sanitizeString(raw.location);
  if (raw.isActive !== undefined) data.isActive = raw.isActive;
  if (raw.maxBookingsPerSlot !== undefined) data.maxBookingsPerSlot = Math.max(1, parseInt(raw.maxBookingsPerSlot, 10) || 1);
  if (raw.landmarkImage !== undefined) data.landmarkImage = sanitizeString(raw.landmarkImage);
  if (raw.workingDays) data.workingDays = raw.workingDays;
  if (raw.genderDays) data.genderDays = raw.genderDays;
  return data;
};

const getAllBranches = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    let branches = await getSharedPrismaClient().bookingBranch.findMany({
      where: { companyId },
      orderBy: { name: 'asc' }
    });
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    branches = branches.map(b => ({
      ...b,
      workingDays: tryParse(b.workingDays),
      genderDays: tryParse(b.genderDays),
      phones: tryParse(b.phones),
      landmarkImage: b.landmarkImage?.startsWith('/uploads/') ? `${baseUrl}${b.landmarkImage}` : b.landmarkImage,
    }));
    res.json({ success: true, data: branches });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الفروع' });
  }
};

const createBranch = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const rawBody = tryParseMultipartFields(req);
    let { name, address, phone, phones, workingDays, genderDays, maxBookingsPerSlot, location, landmarkImage } = rawBody;

    if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'اسم الفرع مطلوب' });
    if (!address || !address.trim()) return res.status(400).json({ success: false, error: 'العنوان مطلوب' });

    if (typeof workingDays === 'string') workingDays = tryParse(workingDays);
    if (typeof genderDays === 'string') genderDays = tryParse(genderDays);
    if (typeof phones === 'string') phones = tryParse(phones);

    const phoneErr = validatePhones(phones);
    if (phoneErr) return res.status(400).json({ success: false, error: phoneErr });

    const wdErr = validateWorkingDays(workingDays);
    if (wdErr) return res.status(400).json({ success: false, error: wdErr });

    const gdErr = validateGenderDays(genderDays);
    if (gdErr) return res.status(400).json({ success: false, error: gdErr });

    if (req.file) landmarkImage = `/uploads/booking-branches/${req.file.filename}`;

    const data = sanitizeBranchData({ name, address, phone, phones, workingDays, genderDays, maxBookingsPerSlot, location, landmarkImage });
    data.companyId = companyId;

    const branch = await getSharedPrismaClient().bookingBranch.create({ data });
    res.json({ success: true, data: branch });
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الفرع' });
  }
};

const updateBranch = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().bookingBranch.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الفرع غير موجود' });

    const rawBody = tryParseMultipartFields(req);
    let { name, address, phone, phones, workingDays, genderDays, isActive, maxBookingsPerSlot, location, landmarkImage } = rawBody;

    if (name !== undefined && !name.trim()) return res.status(400).json({ success: false, error: 'اسم الفرع مطلوب' });

    if (typeof workingDays === 'string') workingDays = tryParse(workingDays);
    if (typeof genderDays === 'string') genderDays = tryParse(genderDays);
    if (typeof phones === 'string') phones = tryParse(phones);

    if (phones !== undefined) {
      const phoneErr = validatePhones(phones);
      if (phoneErr) return res.status(400).json({ success: false, error: phoneErr });
    }

    if (workingDays !== undefined) {
      const wdErr = validateWorkingDays(workingDays);
      if (wdErr) return res.status(400).json({ success: false, error: wdErr });
    }

    if (genderDays !== undefined) {
      const gdErr = validateGenderDays(genderDays);
      if (gdErr) return res.status(400).json({ success: false, error: gdErr });
    }

    if (req.file) landmarkImage = `/uploads/booking-branches/${req.file.filename}`;

    const data = sanitizeBranchData({ name, address, phone, phones, workingDays, genderDays, isActive, maxBookingsPerSlot, location, landmarkImage });

    const branch = await getSharedPrismaClient().bookingBranch.update({ where: { id }, data });
    res.json({ success: true, data: branch });
  } catch (error) {
    console.error('Error updating branch:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الفرع' });
  }
};

const deleteBranch = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().bookingBranch.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الفرع غير موجود' });

    await getSharedPrismaClient().bookingBranch.delete({ where: { id } });
    res.json({ success: true, message: 'تم حذف الفرع' });
  } catch (error) {
    console.error('Error deleting branch:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الفرع' });
  }
};

const tryParseMultipartFields = (req) => {
  if (req.file || req.headers['content-type']?.includes('multipart')) {
    const parsed = { ...req.body };
    for (const key of Object.keys(parsed)) {
      if (typeof parsed[key] === 'string') {
        if (parsed[key] === 'true') parsed[key] = true;
        else if (parsed[key] === 'false') parsed[key] = false;
        else if (/^-?\d+(\.\d+)?$/.test(parsed[key])) parsed[key] = Number(parsed[key]);
        else if (parsed[key].startsWith('[') || parsed[key].startsWith('{')) {
          const p = tryParse(parsed[key]);
          if (p !== parsed[key]) parsed[key] = p;
        }
      }
    }
    return parsed;
  }
  return req.body;
};

module.exports = { getAllBranches, createBranch, updateBranch, deleteBranch };
