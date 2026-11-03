/**
 * Shipping Client Admin Controller (SHIP-W2C.1)
 * Manages Shipping Client (Merchant) Accounts, portal users, passwords, and statuses.
 * Strictly restricted to OWNER / COMPANY_ADMIN.
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Generate human-friendly, cryptographically secure temporary password
 */
function generateTempPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let rand = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    rand += chars[bytes[i] % chars.length];
  }
  return `Ship!${rand}`;
}

/**
 * Activity log helper
 */
async function logActivity(prisma, { userId, companyId, action, description, targetType, targetId, targetName, metadata }) {
  try {
    if (!prisma.activityLog) return;
    await prisma.activityLog.create({
      data: {
        userId: userId || null,
        companyId: companyId || null,
        category: 'SHIPPING_CLIENT_ADMIN',
        action,
        description,
        targetType: targetType || 'MERCHANT',
        targetId: targetId ? String(targetId) : null,
        targetName: targetName ? String(targetName) : null,
        metadata: metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null,
      },
    });
  } catch (err) {
    console.warn('[ActivityLog] failed to log activity:', err.message);
  }
}

/**
 * GET /api/v1/shipping-clients-admin/clients
 * Lists company merchants with portal account status, shipment counts & pending COD
 */
async function listClients(req, res) {
  try {
    const { companyId } = req.user;
    const { search } = req.query;
    const prisma = getSharedPrismaClient();

    const where = { companyId };
    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const merchants = await prisma.merchant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        companyId: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        isActive: true,
        commissionRate: true,
        defaultWarehouseId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const merchantIds = merchants.map((m) => m.id);

    // Fetch portal users linked to these merchants
    const portalUsers = await prisma.user.findMany({
      where: {
        companyId,
        merchantId: { in: merchantIds },
        role: 'SHIPPING_CLIENT',
      },
      select: {
        id: true,
        merchantId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    const usersByMerchantId = new Map();
    for (const u of portalUsers) {
      if (u.merchantId && !usersByMerchantId.has(u.merchantId)) {
        usersByMerchantId.set(u.merchantId, u);
      }
    }

    // Fetch shipment stats for each merchant
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const shipments = await prisma.shipment.findMany({
      where: {
        companyId,
        merchantId: { in: merchantIds },
      },
      select: {
        id: true,
        merchantId: true,
        status: true,
        codAmount: true,
        createdAt: true,
      },
    });

    const metricsByMerchantId = new Map();
    for (const mId of merchantIds) {
      metricsByMerchantId.set(mId, {
        totalShipments: 0,
        monthShipments: 0,
        deliveredCount: 0,
        returnedCount: 0,
        pendingCount: 0,
        pendingCodAmount: 0,
      });
    }

    for (const s of shipments) {
      if (!s.merchantId || !metricsByMerchantId.has(s.merchantId)) continue;
      const m = metricsByMerchantId.get(s.merchantId);
      m.totalShipments += 1;

      if (new Date(s.createdAt) >= startOfMonth) {
        m.monthShipments += 1;
      }

      const st = String(s.status || '').toUpperCase();
      if (st === 'DELIVERED') {
        m.deliveredCount += 1;
      } else if (['RETURNED', 'RETURN_REQUESTED', 'FAILED_ATTEMPT'].includes(st)) {
        m.returnedCount += 1;
      } else if (['PENDING', 'ACCEPTED', 'OUT_FOR_DELIVERY', 'IN_TRANSIT'].includes(st)) {
        m.pendingCount += 1;
      }

      if (['DELIVERED', 'OUT_FOR_DELIVERY', 'PENDING', 'ACCEPTED'].includes(st) && s.codAmount) {
        m.pendingCodAmount += Number(s.codAmount) || 0;
      }
    }

    const clients = merchants.map((merchant) => {
      const user = usersByMerchantId.get(merchant.id) || null;
      const metrics = metricsByMerchantId.get(merchant.id) || {
        totalShipments: 0,
        monthShipments: 0,
        deliveredCount: 0,
        returnedCount: 0,
        pendingCount: 0,
        pendingCodAmount: 0,
      };

      return {
        ...merchant,
        hasAccount: Boolean(user),
        account: user
          ? {
              userId: user.id,
              email: user.email,
              role: user.role,
              isActive: user.isActive,
              lastLoginAt: user.lastLoginAt,
              createdAt: user.createdAt,
            }
          : null,
        metrics: {
          ...metrics,
          pendingCodAmount: Number(metrics.pendingCodAmount.toFixed(2)),
        },
      };
    });

    return res.json({
      success: true,
      data: clients,
      total: clients.length,
    });
  } catch (error) {
    console.error('[ShippingClientAdmin] Error in listClients:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ أثناء جلب قائمة عملاء الشحن' });
  }
}

/**
 * POST /api/v1/shipping-clients-admin/clients
 * Creates Merchant + User(role='SHIPPING_CLIENT', merchantId) with a one-time temporary password
 */
async function createClient(req, res) {
  try {
    const { companyId } = req.user;
    const { name, email, phone, commissionRate, address } = req.body || {};
    const prisma = getSharedPrismaClient();

    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال اسم عميل صالح (حرفين على الأقل)' });
    }

    if (!email || !String(email).includes('@')) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال بريد إلكتروني صالح' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Check uniqueness
    const existingMerchant = await prisma.merchant.findFirst({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existingMerchant) {
      return res.status(400).json({ success: false, error: 'البريد الإلكتروني مسجل بالفعل لعميل شحن آخر' });
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'البريد الإلكتروني مسجل بالفعل لمستخدم في المنصة' });
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const nameParts = String(name).trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || 'Client';
    const lastName = nameParts.slice(1).join(' ') || 'Portal';

    // Create Merchant
    const merchant = await prisma.merchant.create({
      data: {
        companyId,
        name: String(name).trim(),
        email: normalizedEmail,
        phone: phone ? String(phone).trim() : null,
        address: address ? String(address).trim() : null,
        commissionRate: commissionRate !== undefined && !isNaN(Number(commissionRate)) ? Number(commissionRate) : 10,
        isActive: true,
      },
    });

    // Create User linked to merchant
    const user = await prisma.user.create({
      data: {
        companyId,
        merchantId: merchant.id,
        email: normalizedEmail,
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone ? String(phone).trim() : null,
        role: 'SHIPPING_CLIENT',
        isActive: true,
        settings: JSON.stringify({ mustChangePassword: true }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logActivity(prisma, {
      userId: req.user.id,
      companyId,
      action: 'CREATE_SHIPPING_CLIENT',
      description: `تم إنشاء عميل الشحن (${merchant.name}) مع حساب بوابة جديد`,
      targetType: 'MERCHANT',
      targetId: merchant.id,
      targetName: merchant.name,
      metadata: { email: merchant.email, userId: user.id },
    });

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء عميل الشحن وحساب البوابة بنجاح',
      data: {
        merchant: {
          id: merchant.id,
          companyId: merchant.companyId,
          name: merchant.name,
          email: merchant.email,
          phone: merchant.phone,
          address: merchant.address,
          isActive: merchant.isActive,
          commissionRate: merchant.commissionRate,
        },
        account: {
          userId: user.id,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
        credentials: {
          email: user.email,
          temporaryPassword: tempPassword,
        },
      },
    });
  } catch (error) {
    console.error('[ShippingClientAdmin] Error in createClient:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ أثناء إنشاء حساب العميل' });
  }
}

/**
 * POST /api/v1/shipping-clients-admin/clients/:id/account
 * Creates or resets portal account for an existing client (returns new temp password once)
 */
async function createOrResetAccount(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const merchant = await prisma.merchant.findFirst({
      where: { id, companyId },
    });

    if (!merchant) {
      return res.status(404).json({ success: false, error: 'سجل عميل الشحن غير موجود في هذه الشركة' });
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    let user = await prisma.user.findFirst({
      where: { merchantId: merchant.id, companyId },
    });

    if (user) {
      let settingsObj = {};
      try {
        settingsObj = JSON.parse(user.settings || '{}');
      } catch (_e) {
        settingsObj = {};
      }
      settingsObj.mustChangePassword = true;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordChangedAt: new Date(),
          isActive: true,
          settings: JSON.stringify(settingsObj),
        },
      });

      if (!merchant.isActive) {
        await prisma.merchant.update({
          where: { id: merchant.id },
          data: { isActive: true },
        });
      }

      await logActivity(prisma, {
        userId: req.user.id,
        companyId,
        action: 'RESET_CLIENT_PASSWORD',
        description: `تمت إعادة تعيين كلمة مرور بوابة عميل الشحن (${merchant.name})`,
        targetType: 'MERCHANT',
        targetId: merchant.id,
        targetName: merchant.name,
      });

      return res.json({
        success: true,
        message: 'تمت إعادة تعيين كلمة المرور بنجاح',
        data: {
          merchantId: merchant.id,
          userId: user.id,
          credentials: {
            email: user.email,
            temporaryPassword: tempPassword,
          },
        },
      });
    }

    // Check if email taken by another user
    const existingUser = await prisma.user.findFirst({
      where: { email: merchant.email },
      select: { id: true },
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'البريد الإلكتروني للعميل مستخدم بالفعل لحساب آخر، يرجى تحديث بريد العميل أولاً',
      });
    }

    const nameParts = merchant.name.trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || 'Client';
    const lastName = nameParts.slice(1).join(' ') || 'Portal';

    const newUser = await prisma.user.create({
      data: {
        companyId,
        merchantId: merchant.id,
        email: merchant.email,
        password: hashedPassword,
        firstName,
        lastName,
        phone: merchant.phone || null,
        role: 'SHIPPING_CLIENT',
        isActive: true,
        settings: JSON.stringify({ mustChangePassword: true }),
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    await logActivity(prisma, {
      userId: req.user.id,
      companyId,
      action: 'CREATE_CLIENT_PORTAL_ACCOUNT',
      description: `تم إنشاء حساب بوابة جديد لعميل الشحن (${merchant.name})`,
      targetType: 'MERCHANT',
      targetId: merchant.id,
      targetName: merchant.name,
    });

    return res.json({
      success: true,
      message: 'تم إنشاء حساب البوابة بنجاح',
      data: {
        merchantId: merchant.id,
        userId: newUser.id,
        credentials: {
          email: newUser.email,
          temporaryPassword: tempPassword,
        },
      },
    });
  } catch (error) {
    console.error('[ShippingClientAdmin] Error in createOrResetAccount:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ أثناء معالجة حساب العميل' });
  }
}

/**
 * PATCH /api/v1/shipping-clients-admin/clients/:id/account
 * Activates or deactivates portal account (User.isActive + Merchant.isActive)
 */
async function toggleAccountStatus(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { isActive } = req.body || {};
    const prisma = getSharedPrismaClient();

    if (isActive === undefined) {
      return res.status(400).json({ success: false, error: 'يرجى تحديد حالة التفعيل (isActive)' });
    }

    const merchant = await prisma.merchant.findFirst({
      where: { id, companyId },
    });

    if (!merchant) {
      return res.status(404).json({ success: false, error: 'سجل عميل الشحن غير موجود في هذه الشركة' });
    }

    const user = await prisma.user.findFirst({
      where: { merchantId: merchant.id, companyId },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'حساب البوابة غير موجود لهذا العميل' });
    }

    const targetActive = Boolean(isActive);

    await Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data: { isActive: targetActive },
      }),
      prisma.merchant.update({
        where: { id: merchant.id },
        data: { isActive: targetActive },
      }),
    ]);

    await logActivity(prisma, {
      userId: req.user.id,
      companyId,
      action: targetActive ? 'ACTIVATE_CLIENT_ACCOUNT' : 'DEACTIVATE_CLIENT_ACCOUNT',
      description: targetActive
        ? `تم تفعيل حساب عميل الشحن (${merchant.name})`
        : `تم تعطيل حساب عميل الشحن (${merchant.name}) ومنعه من الدخول`,
      targetType: 'MERCHANT',
      targetId: merchant.id,
      targetName: merchant.name,
    });

    return res.json({
      success: true,
      message: targetActive ? 'تم تفعيل حساب العميل بنجاح' : 'تم تعطيل حساب العميل بنجاح',
      data: {
        merchantId: merchant.id,
        userId: user.id,
        isActive: targetActive,
      },
    });
  } catch (error) {
    console.error('[ShippingClientAdmin] Error in toggleAccountStatus:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ أثناء تحديث حالة الحساب' });
  }
}

/**
 * GET /api/v1/shipping-clients-admin/clients/:id/summary
 * Summarizes client's shipments, delivery rates, and COD
 */
async function getClientSummary(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const merchant = await prisma.merchant.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        companyId: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        isActive: true,
        commissionRate: true,
        createdAt: true,
      },
    });

    if (!merchant) {
      return res.status(404).json({ success: false, error: 'سجل عميل الشحن غير موجود في هذه الشركة' });
    }

    const [user, totalShipments, deliveredCount, returnedCount, pendingCount, pendingCodSum, recentShipments] =
      await Promise.all([
        prisma.user.findFirst({
          where: { merchantId: merchant.id, companyId },
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        }),
        prisma.shipment.count({
          where: { companyId, merchantId: merchant.id },
        }),
        prisma.shipment.count({
          where: { companyId, merchantId: merchant.id, status: 'DELIVERED' },
        }),
        prisma.shipment.count({
          where: {
            companyId,
            merchantId: merchant.id,
            status: { in: ['RETURNED', 'RETURN_REQUESTED', 'FAILED_ATTEMPT'] },
          },
        }),
        prisma.shipment.count({
          where: {
            companyId,
            merchantId: merchant.id,
            status: { in: ['PENDING', 'ACCEPTED', 'OUT_FOR_DELIVERY', 'IN_TRANSIT'] },
          },
        }),
        prisma.shipment.aggregate({
          where: {
            companyId,
            merchantId: merchant.id,
            status: { in: ['DELIVERED', 'OUT_FOR_DELIVERY', 'PENDING', 'ACCEPTED'] },
            codAmount: { not: null },
          },
          _sum: {
            codAmount: true,
          },
        }),
        prisma.shipment.findMany({
          where: { companyId, merchantId: merchant.id },
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            trackingNumber: true,
            recipientName: true,
            recipientPhone: true,
            destinationGovernorate: true,
            status: true,
            codAmount: true,
            cost: true,
            currency: true,
            createdAt: true,
          },
        }),
      ]);

    const totalFinished = deliveredCount + returnedCount;
    const deliveryRate = totalFinished > 0 ? Math.round((deliveredCount / totalFinished) * 100) : 0;
    const estimatedPendingCod = Number(pendingCodSum?._sum?.codAmount || 0);

    return res.json({
      success: true,
      data: {
        merchant,
        account: user,
        summary: {
          totalShipments,
          deliveredCount,
          returnedCount,
          pendingCount,
          deliveryRate,
          estimatedPendingCod,
          recentShipments,
        },
      },
    });
  } catch (error) {
    console.error('[ShippingClientAdmin] Error in getClientSummary:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ أثناء جلب ملخص العميل' });
  }
}

module.exports = {
  listClients,
  createClient,
  createOrResetAccount,
  toggleAccountStatus,
  getClientSummary,
  generateTempPassword,
};
