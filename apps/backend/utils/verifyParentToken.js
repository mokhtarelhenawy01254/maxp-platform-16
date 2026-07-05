const jwt = require('jsonwebtoken');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const { getJwtSecret } = require('./jwtSecret');

const authenticateParentToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'رمز المصادقة مطلوب' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const parentId = decoded.parentId || decoded.id;
    if (!parentId) {
      return res.status(401).json({ success: false, message: 'رمز المصادقة غير صحيح' });
    }

    const prisma = await getSharedPrismaClientAsync();
    const parent = await prisma.customer.findUnique({
      where: { id: parentId },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, companyId: true, status: true, avatar: true }
    });

    if (!parent) {
      return res.status(401).json({ success: false, message: 'ولي الأمر غير موجود' });
    }

    if (parent.status === 'BLOCKED' || parent.status === 'INACTIVE') {
      return res.status(403).json({ success: false, message: 'الحساب غير نشط' });
    }

    req.parent = parent;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'رمز المصادقة غير صحيح' });
  }
};

module.exports = { authenticateParentToken };
