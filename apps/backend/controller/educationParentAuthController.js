const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getJwtSecret } = require('../utils/jwtSecret');
const { logEducationEvent } = require('../services/educationAuditService');

const login = async (req, res) => {
  try {
    const rawIdentifier = req.body.email || req.body.phone || req.body.identifier;
    const { password } = req.body;
    if (!rawIdentifier || !password) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني أو رقم الهاتف وكلمة المرور مطلوبان' });
    }
    const identifier = String(rawIdentifier).trim();

    const prisma = getSharedPrismaClient();
    const parent = await prisma.customer.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { phone: identifier },
          { phone2: identifier }
        ]
      },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, password: true, companyId: true, status: true, avatar: true }
    });

    if (!parent || !parent.password) {
      return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة أو لا يوجد حساب مسجل' });
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, parent.password);
    } catch {}
    if (!isPasswordValid) {
      const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
      isPasswordValid = (sha256Hash === parent.password);
    }
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة' });
    }

    const token = jwt.sign(
      { parentId: parent.id, companyId: parent.companyId, role: 'PARENT' },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    const { password: _, ...parentData } = parent;

    const parentFullName = `${parent.firstName || ''} ${parent.lastName || ''}`.trim();
    logEducationEvent({
      companyId: parent.companyId,
      action: 'PARENT_LOGIN',
      entityType: 'PORTAL',
      entityId: parent.id,
      entityName: parentFullName,
      description: `تسجيل دخول ولي الأمر ${parentFullName} إلى بوابة أولياء الأمور`,
      actorType: 'PARENT',
      userName: parentFullName,
      userRole: 'PARENT',
      req,
    }).catch(e => console.error('[ParentLoginAudit]', e.message));

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: { parent: parentData, token, expiresIn: '24h' }
    });
  } catch (error) {
    console.error('[ParentAuth] Login error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في تسجيل الدخول' });
  }
};

const me = async (req, res) => {
  try {
    const parentId = req.parent?.id;
    if (!parentId) return res.status(401).json({ success: false, message: 'غير مصرح' });

    const prisma = getSharedPrismaClient();
    const parent = await prisma.customer.findUnique({
      where: { id: parentId },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, companyId: true, status: true, avatar: true }
    });

    if (!parent) return res.status(404).json({ success: false, message: 'ولي الأمر غير موجود' });
    res.json({ success: true, data: parent });
  } catch (error) {
    console.error('[ParentAuth] Me error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
};

const changePassword = async (req, res) => {
  try {
    const parentId = req.parent?.id;
    if (!parentId) return res.status(401).json({ success: false, message: 'غير مصرح' });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'كلمة المرور الحالية والجديدة مطلوبتان' });
    }

    const prisma = getSharedPrismaClient();
    const parent = await prisma.customer.findUnique({
      where: { id: parentId },
      select: { password: true }
    });

    if (!parent || !parent.password) {
      return res.status(400).json({ success: false, message: 'لا يمكن تغيير كلمة المرور' });
    }

    const isValid = await bcrypt.compare(currentPassword, parent.password);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.customer.update({
      where: { id: parentId },
      data: { password: hashedPassword }
    });

    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (error) {
    console.error('[ParentAuth] Change password error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في تغيير كلمة المرور' });
  }
};


/**
 * 🔗 رابط تفعيل حساب ولي الأمر
 *
 * كان ولي الأمر بيتعمل له حساب تلقائيًا عند تسجيل الطالب، لكن بدون كلمة مرور —
 * فمش بيقدر يدخل البوابة. بدل ما نبعت باسوردات مؤقتة (غير آمنة وصعبة التوصيل)،
 * بنولّد رابط شخصي لمدة محددة، وولي الأمر نفسه بيحدد كلمة المرور.
 *
 * - createActivationLink : (أدمن) يولّد/يجدّد التوكن ويُرجع الرابط
 * - validateActivation   : (عام) يتحقق من التوكن ويُرجع اسم ولي الأمر لإظهاره
 * - activateAccount      : (عام) يحدد كلمة المرور ويستهلك التوكن
 */

const ACTIVATION_TTL_DAYS = 14;

const buildActivationUrl = (token) =>
  `https://maxp.online/parent/activate?token=${encodeURIComponent(token)}`;

const maskPhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 5) return null;
  return `${digits.slice(0, 3)}****${digits.slice(-2)}`;
};

const generateToken = () => crypto.randomBytes(24).toString('hex');

const createActivationLink = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.user?.effectiveCompanyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح' });

    const { customerId, expiresInDays } = req.body || {};
    if (!customerId) return res.status(400).json({ success: false, message: 'معرف ولي الأمر مطلوب' });

    const prisma = getSharedPrismaClient();
    const parent = await prisma.customer.findFirst({
      where: { id: customerId, companyId },
      select: { id: true, firstName: true, lastName: true, phone: true, phone2: true, metadata: true }
    });
    if (!parent) return res.status(404).json({ success: false, message: 'ولي الأمر غير موجود' });

    const phone = parent.phone || parent.phone2 || null;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'ولي الأمر بدون رقم هاتف — أضف الرقم أولاً' });
    }

    const days = Number(expiresInDays) > 0 ? Math.min(Number(expiresInDays), 60) : ACTIVATION_TTL_DAYS;
    const token = generateToken();
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await prisma.customer.update({
      where: { id: parent.id },
      data: { parentActivationToken: token, parentActivationExpiresAt: expiresAt }
    });

    res.json({
      success: true,
      data: {
        customerId: parent.id,
        name: `${parent.firstName || ''} ${parent.lastName || ''}`.trim(),
        phone,
        url: buildActivationUrl(token),
        expiresAt
      }
    });
  } catch (error) {
    console.error('[ParentActivation] create error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء إنشاء رابط التفعيل' });
  }
};

const validateActivation = async (req, res) => {
  try {
    const token = String(req.query.token || req.body?.token || '').trim();
    if (!token) return res.status(400).json({ success: false, message: 'الرابط غير صالح' });

    const prisma = getSharedPrismaClient();
    const parent = await prisma.customer.findFirst({
      where: { parentActivationToken: token },
      select: { id: true, firstName: true, lastName: true, phone: true, phone2: true, password: true, parentActivationExpiresAt: true }
    });

    if (!parent) {
      return res.status(404).json({ success: false, message: 'الرابط غير صالح أو تم استخدامه بالفعل' });
    }
    if (parent.parentActivationExpiresAt && new Date(parent.parentActivationExpiresAt).getTime() < Date.now()) {
      return res.status(410).json({ success: false, message: 'انتهت صلاحية الرابط — اطلب رابطاً جديداً من المركز' });
    }

    res.json({
      success: true,
      data: {
        name: `${parent.firstName || ''} ${parent.lastName || ''}`.trim(),
        phoneMasked: maskPhone(parent.phone || parent.phone2),
        hasPassword: Boolean(parent.password)
      }
    });
  } catch (error) {
    console.error('[ParentActivation] validate error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء التحقق من الرابط' });
  }
};

const activateAccount = async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token) return res.status(400).json({ success: false, message: 'الرابط غير صالح' });
    if (!password || String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'كلمة المرور يجب ألا تقل عن 6 أحرف' });
    }

    const prisma = getSharedPrismaClient();
    const parent = await prisma.customer.findFirst({
      where: { parentActivationToken: String(token).trim() },
      select: { id: true, companyId: true, firstName: true, lastName: true, parentActivationExpiresAt: true }
    });

    if (!parent) {
      return res.status(404).json({ success: false, message: 'الرابط غير صالح أو تم استخدامه بالفعل' });
    }
    if (parent.parentActivationExpiresAt && new Date(parent.parentActivationExpiresAt).getTime() < Date.now()) {
      return res.status(410).json({ success: false, message: 'انتهت صلاحية الرابط — اطلب رابطاً جديداً من المركز' });
    }

    const hashed = await bcrypt.hash(String(password), 10);
    await prisma.customer.update({
      where: { id: parent.id },
      data: {
        password: hashed,
        parentActivationToken: null,
        parentActivationExpiresAt: null
      }
    });

    logEducationEvent({
      companyId: parent.companyId,
      action: 'PARENT_ACTIVATE',
      entityType: 'PARENT',
      entityId: parent.id,
      entityName: `${parent.firstName || ''} ${parent.lastName || ''}`.trim(),
      description: 'فعّل ولي الأمر حسابه وحدد كلمة المرور بنفسه',
      actorType: 'PARENT',
      severity: 'MEDIUM',
      req,
    }).catch(() => {});

    res.json({ success: true, message: 'تم تفعيل الحساب بنجاح — يمكنك تسجيل الدخول الآن' });
  } catch (error) {
    console.error('[ParentActivation] activate error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تفعيل الحساب' });
  }
};

module.exports = { login, me, changePassword, createActivationLink, validateActivation, activateAccount };
