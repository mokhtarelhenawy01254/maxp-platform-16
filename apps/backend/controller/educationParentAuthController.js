const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getJwtSecret } = require('../utils/jwtSecret');

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

module.exports = { login, me, changePassword };
